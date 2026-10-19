/* USA Vendor storefront script
   Loads products, renders the catalog/cart, and starts checkout through
   the Netlify function /.netlify/functions/create-payment.
*/
"use strict";

const CART_STORAGE_KEY = "usa_vendor_cart";
let products = [];
let cart = [];
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const money = (amount) => "$" + Number(amount || 0).toLocaleString("en-US", {
  minimumFractionDigits: 2, maximumFractionDigits: 2
});

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

function readCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch { return []; }
}
function saveCart() { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)); }

const categoryImages = {
  Footwear: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
  Clothing: "https://images.unsplash.com/photo- hoodie?auto=format&fit=crop&w=900&q=80",
  Colognes: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=80",
  AirPods: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=900&q=80",
  Accessories: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80"
};

function productImage(product) {
  const src = product.image || product.img || categoryImages[product.category] || "";
  if (!src) return "";
  if (src.startsWith("https://images.unsplash.com/")) {
    return "/.netlify/images?url=" + encodeURIComponent(src);
  }
  return src;
}
function productName(product) { return product.name || product.title || "Product"; }
function productPrice(product) { return Number(product.price || 0); }

function renderProducts() {
  const grid = $("#grid");
  if (!grid) return;
  const query = ($("#search")?.value || "").trim().toLowerCase();
  const activeCategory = document.querySelector("[data-cat].active")?.dataset.cat || "All";
  const sort = $("#sort")?.value || "";
  let list = products.filter((p) => {
    const categoryMatch = activeCategory === "All" || p.category === activeCategory ||
      String(p.category || "").toLowerCase() === activeCategory.toLowerCase();
    const searchText = [productName(p), p.category, p.description, p.brand].join(" ").toLowerCase();
    return categoryMatch && searchText.includes(query);
  });
  if (sort === "low") list.sort((a, b) => productPrice(a) - productPrice(b));
  if (sort === "high") list.sort((a, b) => productPrice(b) - productPrice(a));
  if (sort === "az") list.sort((a, b) => productName(a).localeCompare(productName(b)));

  grid.innerHTML = list.length ? list.map((p) => {
    const index = products.indexOf(p);
    const image = productImage(p);
    return `<article class="product">
      <div class="visual ${image ? "has-photo" : ""}">${image ? `<img src="${safe(image)}" alt="${safe(productName(p))}" loading="lazy" onerror="this.style.display='none'">` : ""}</div>
      <div class="product-info">
        <p class="product-category">${safe(p.category || "USA Vendor")}</p>
        <h3>${safe(productName(p))}</h3>
        ${p.description ? `<p>${safe(p.description)}</p>` : ""}
        <div class="product-bottom"><strong>${money(productPrice(p))}</strong><button type="button" onclick="add(${index})">Add to cart</button></div>
      </div></article>`;
  }).join("") : `<p class="empty-state">No products found. Try another search or category.</p>`;
}

function updateCart() {
  const count = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const total = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
  if ($("#count")) $("#count").textContent = count;
  if ($("#total")) $("#total").textContent = money(total);
  const list = $("#cartList");
  if (list) list.innerHTML = cart.length ? cart.map((item, i) => `
    <div class="cart-item"><div class="cart-item-info"><strong>${safe(item.name)}</strong><span>${money(item.price)} each</span></div>
    <div class="cart-item-actions"><button type="button" aria-label="Decrease quantity" onclick="changeQty(${i},-1)">−</button>
    <span>${Number(item.qty || 1)}</span><button type="button" aria-label="Increase quantity" onclick="changeQty(${i},1)">+</button>
    <button type="button" aria-label="Remove item" onclick="removeItem(${i})">×</button></div></div>`).join("") : `<p class="empty-state">Your cart is empty.</p>`;
  saveCart();
}

function add(index) {
  const p = products[index];
  if (!p) return;
  const id = p.id ?? index;
  const existing = cart.find((item) => String(item.id) === String(id));
  if (existing) existing.qty = Number(existing.qty || 1) + 1;
  else cart.push({ id, name: productName(p), price: productPrice(p), image: p.image || "", category: p.category || "", qty: 1 });
  updateCart();
  toast("Added to cart");
}
function changeQty(index, difference) {
  if (!cart[index]) return;
  cart[index].qty = Number(cart[index].qty || 1) + difference;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  updateCart();
}
function removeItem(index) { cart.splice(index, 1); updateCart(); }
function openCart() {
  $("#cart")?.classList.add("open");
  $("#overlay")?.classList.add("open");
  document.body.classList.add("cart-open");
}
function closeCart() {
  $("#cart")?.classList.remove("open");
  $("#overlay")?.classList.remove("open");
  document.body.classList.remove("cart-open");
}
function toast(message) {
  const element = $("#toast");
  if (!element) { console.log(message); return; }
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 2600);
}

async function checkout() {
  if (!cart.length) { toast("Your cart is empty"); return; }
  const total = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
  const button = document.querySelector('[onclick="checkout()"]');
  if (button) { button.disabled = true; button.dataset.originalText = button.textContent; button.textContent = "Preparing secure checkout…"; }
  try {
    const response = await fetch("/.netlify/functions/create-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((item) => ({ id: item.id, name: item.name, price: Number(item.price), quantity: Number(item.qty) })),
        total,
        currency: "USD"
      })
    });
    let result;
    try { result = await response.json(); }
    catch { throw new Error("The payment service returned an unreadable response."); }
    const checkoutUrl = result.checkoutUrl || result.checkout_url || result.link || result.data?.link || result.data?.checkoutUrl;
    if (!response.ok || !checkoutUrl) throw new Error(result.error || result.message || "Could not start payment.");
    window.location.assign(checkoutUrl);
  } catch (error) {
    console.error("USA Vendor checkout error:", error);
    toast(error.message || "Payment could not start. Please try again.");
    if (button) { button.disabled = false; button.textContent = button.dataset.originalText || "Checkout"; }
  }
}

async function loadProducts() {
  const grid = $("#grid");
  try {
    const response = await fetch("/products.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load products.json");
    const data = await response.json();
    products = Array.isArray(data) ? data : (Array.isArray(data.products) ? data.products : []);
    renderProducts();
  } catch (error) {
    console.error("USA Vendor product loading error:", error);
    if (grid) grid.innerHTML = `<p class="empty-state">Products couldn't load. Please refresh the page.</p>`;
  }
}

function setupPage() {
  cart = readCart();
  $("#cartButton")?.addEventListener("click", openCart);
  $("#openCart")?.addEventListener("click", openCart);
  $("#closeCart")?.addEventListener("click", closeCart);
  $("#overlay")?.addEventListener("click", closeCart);
  $("#search")?.addEventListener("input", renderProducts);
  $("#sort")?.addEventListener("change", renderProducts);
  $$('[data-cat]').forEach((button) => button.addEventListener("click", () => {
    $$('[data-cat]').forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderProducts();
  }));
  $$('[data-filters-button]').forEach((button) => button.addEventListener("click", () => $("#filters")?.classList.toggle("open")));
  updateCart();
  loadProducts();
}

window.add = add;
window.changeQty = changeQty;
window.removeItem = removeItem;
window.openCart = openCart;
window.closeCart = closeCart;
window.checkout = checkout;
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setupPage);
else setupPage();
