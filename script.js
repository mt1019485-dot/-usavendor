let products=[],cart=JSON.parse(localStorage.getItem("usa_vendor_cart")||"[]");
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const money=n=>"$"+Number(n).toLocaleString("en-US",{maximumFractionDigits:0});
fetch("products.json").then(r=>r.json()).then(x=>{products=x;render();updateCart()});
function safe(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function render(){
 let q=$("#search").value.trim().toLowerCase(), f=document.querySelector("#filters .active").dataset.filter;
 let list=products.filter(p=>(f==="All"||p.category===f)&&p.name.toLowerCase().includes(q));
 const s=$("#sort").value;if(s==="low")list.sort((a,b)=>a.price-b.price);if(s==="high")list.sort((a,b)=>b.price-a.price);
 $("#grid").innerHTML=list.map(p=>{const i=products.indexOf(p), initials=p.name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
 return `<article class="product"><div class="visual"><span class="tag">${safe(p.category)}</span><span class="initial">${safe(initials)}</span></div><div class="product-body"><div class="product-cat">${safe(p.category)}</div><h3>${safe(p.name)}</h3><div class="product-foot"><span class="price"><small>FROM </small>${money(p.price)}</span><button class="add" onclick="add(${i})">Add +</button></div></div></article>`}).join("")||'<div class="empty" style="grid-column:1/-1">No products matched your search.</div>';
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
 window.open("https://wa.me/18127669345?text="+encodeURIComponent(msg),"_blank");
}
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1600)}
$("#openCart").onclick=openCart;$("#closeCart").onclick=closeCart;$("#overlay").onclick=closeCart;$("#checkout").onclick=checkout;
$("#search").oninput=render;$("#sort").onchange=render;
$$("#filters button").forEach(b=>b.onclick=()=>{$$("#filters button").forEach(x=>x.classList.remove("active"));b.classList.add("active");render()});
$$(".cat-grid button").forEach(b=>b.onclick=()=>{let c=b.dataset.cat;$$("#filters button").forEach(x=>x.classList.toggle("active",x.dataset.filter===c));document.querySelector("#shop").scrollIntoView({behavior:"smooth"});render()});
