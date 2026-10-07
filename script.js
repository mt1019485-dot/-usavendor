let products=[],cart=JSON.parse(localStorage.getItem("usa_vendor_cart")||"[]");
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const money=n=>"$"+Number(n).toLocaleString("en-US",{maximumFractionDigits:0});
const pageCategory=new URLSearchParams(location.search).get("category");
fetch(location.pathname.includes("/footwear/")||location.pathname.includes("/clothing/")||location.pathname.includes("/colognes/")||location.pathname.includes("/airpods/")||location.pathname.includes("/accessories/")?"../products.json":"products.json").then(r=>r.json()).then(x=>{products=x;
 if(pageCategory){const target=document.querySelector(`#filters button[data-filter="${CSS.escape(pageCategory)}"]`);if(target){$$('#filters button').forEach(b=>b.classList.remove('active'));target.classList.add('active')}}
 render();updateCart()});
function safe(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
const categoryImages={
 Footwear:"https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto%2Cu_9ddf04c7-2a9a-4d76-add1-d15af8f0263d%2Cc_scale%2Cfl_relative%2Cw_1.0%2Ch_1.0%2Cfl_layer_apply/26588138-63d6-4d84-a5c9-7eb47bae8946/NIKE%2BAIR%2BMAX%2B95%2BBIG%2BBUBBLE.png",
 Clothing:"https://static.nike.com/a/images/t_web_pdp_535_v2/f_auto/dbcb43d1-d508-4275-b239-f988667d5001/AS%2BM%2BNK%2BTCH%2BFLC%2BFZ%2BWR%2BHOODIE.png",
 Colognes:"https://www.dior.com/dw/image/v2/BGXS_PRD/on/demandware.static/-/Library-Sites-DiorSharedLibrary/default/dw0a046890/images/beauty/01-FRAGRANCES/2025/PDP-REVAMP/SAUVAGE/Y0685240/DIOR_COM_SAUVAGE_10YEARS_1688x3000px_10.jpg?sw=800",
 AirPods:"https://www.apple.com/newsroom/images/2025/09/introducing-airpods-pro-3-the-ultimate-audio-experience/article/Apple-AirPods-Pro-3-hero-250909_inline.jpg.large.jpg",
 Accessories:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85"
};
function productImage(p){
  return p.image || categoryImages[p.category];
}
function render(){
 let q=$("#search").value.trim().toLowerCase(), f=document.querySelector("#filters .active").dataset.filter;
 let list=products.filter(p=>(f==="All"||p.category===f)&&p.name.toLowerCase().includes(q));
 const s=$("#sort").value;if(s==="low")list.sort((a,b)=>a.price-b.price);if(s==="high")list.sort((a,b)=>b.price-a.price);
 $("#grid").innerHTML=list.map(p=>{const i=products.indexOf(p), initials=p.name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase(), img=productImage(p);
 return `<article class="product"><div class="visual has-photo"><img src="${img}" alt="Real photographic ${safe(p.name)} product image" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><span class="photo-note">PRODUCT PHOTO</span><span class="tag">${safe(p.category)}</span><span class="initial fallback">${safe(initials)}</span></div><div class="product-body"><div class="product-cat">${safe(p.category)}</div><h3>${safe(p.name)}</h3><div class="product-foot"><span class="price"><small>FROM </small>${money(p.price)}</span><button class="add" onclick="add(${i})">Add +</button></div></div></article>`}).join("")||'<div class="empty" style="grid-column:1/-1">No products matched your search.</div>';
}
function add(i){const p=products[i],x=cart.find(a=>a.id===p.id);x?x.qty++:cart.push({...p,qty:1});save();updateCart();toast("Added to cart");openCart()}
function save(){localStorage.setItem("usa_vendor_cart",JSON.stringify(cart))}
function updateCart(){
 $("#count").textContent=cart.reduce((a,x)=>a+x.qty,0);
 const total=cart.reduce((a,x)=>a+x.price*x.qty,0);$("#total").textContent=money(total);
 $("#cartList").innerHTML=cart.length?cart.map((p,i)=>`<div class="cart-row"><div><h4>${safe(p.name)}</h4><small>${safe(p.category)} · ${money(p.price)} each</small></div><div class="qty"><button onclick="changeQty(${i},-1)">−</button><span>${p.qty}</span><button onclick="changeQty(${i},1)">+</button></div></div>`).join(""):'<div class="empty">Your cart is empty.<br>Add products to get started.</div>';
}
function changeQty(i,d){cart[i].qty+=d;if(cart[i].qty<1)cart.splice(i,1);save();updateCart()}
function openCart(){$("#cart").classList.add("open");$("#overlay").classList.add("open")}
function closeCart(){$("#cart").classList.remove("open");$("#overlay").classList.remove("open")}
function checkout(){
 if(!cart.length){toast("Your cart is empty");return}
 let total=cart.reduce((a,x)=>a+x.price*x.qty,0);
 let msg="Hi USA Vendor! 👋\n\nI'd like to place an order:\n\n";
 cart.forEach(x=>msg+=`• ${x.name} × ${x.qty} — ${money(x.price*x.qty)}\n`);
 msg+=`\nEstimated total: ${money(total)}\n\nName: \nLocation: \n\nPlease confirm availability, final pricing and delivery details.`;
 window.open("https://wa.me/14488677564?text="+encodeURIComponent(msg),"_blank");
}
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1600)}
$("#openCart").onclick=openCart;$("#closeCart").onclick=closeCart;$("#overlay").onclick=closeCart;$("#checkout").onclick=checkout;
$("#search").oninput=render;$("#sort").onchange=render;
$$("#filters button").forEach(b=>b.onclick=()=>{$$("#filters button").forEach(x=>x.classList.remove("active"));b.classList.add("active");render()});
$$('.cat-grid [data-cat]').forEach(b=>b.onclick=(e)=>{let c=b.dataset.cat;if(b.tagName==='A' && b.getAttribute('href') && b.getAttribute('href')!=='#shop') return;e.preventDefault();$$("#filters button").forEach(x=>x.classList.toggle("active",x.dataset.filter===c));document.querySelector("#shop").scrollIntoView({behavior:"smooth"});render()});
