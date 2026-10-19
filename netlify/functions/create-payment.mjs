import crypto from 'node:crypto';

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const secret = process.env.FLW_SECRET_KEY;
  const siteUrl = process.env.URL;
  if (!secret || !siteUrl) return json(503, { error: 'Payment setup is incomplete. Please contact USA Vendor.' });

  try {
    const body = JSON.parse(event.body || '{}');
    const name = String(body.name || '').trim().slice(0, 120);
    const email = String(body.email || '').trim().slice(0, 200);
    const phone = String(body.phone || '').trim().slice(0, 40);
    const cart = Array.isArray(body.cart) ? body.cart : [];
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) return json(400, { error: 'Enter your name and a valid email address.' });
    if (!cart.length || cart.length > 100) return json(400, { error: 'Your cart is empty or invalid.' });

    // Prices and product IDs are read from the published catalog, not trusted from the browser.
    const productsResponse = await fetch(`${siteUrl.replace(/\/$/, '')}/products.json`, { cache: 'no-store' });
    if (!productsResponse.ok) throw new Error('Could not load product catalog');
    const products = await productsResponse.json();
    const byId = new Map(products.map(p => [String(p.id), p]));
    let amount = 0;
    const items = [];
    for (const item of cart) {
      const product = byId.get(String(item.id));
      const qty = Number(item.qty);
      if (!product || !Number.isInteger(qty) || qty < 1 || qty > 50) return json(400, { error: 'One or more cart items are invalid. Please refresh your cart.' });
      amount += Number(product.price) * qty;
      items.push({ id: product.id, name: product.name, quantity: qty, price: Number(product.price) });
    }
    amount = Math.round(amount * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) return json(400, { error: 'Invalid order total.' });

    const txRef = `USA-${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;
    const currency = 'USD';
    const sig = crypto.createHmac('sha256', secret).update(`${txRef}|${amount.toFixed(2)}|${currency}`).digest('hex');
    const redirect = new URL('/payment-result.html', siteUrl);
    redirect.searchParams.set('tx_ref', txRef);
    redirect.searchParams.set('amount', amount.toFixed(2));
    redirect.searchParams.set('currency', currency);
    redirect.searchParams.set('sig', sig);

    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: amount.toFixed(2),
        currency,
        redirect_url: redirect.toString(),
        payment_options: 'card',
        customer: { name, email, phonenumber: phone || undefined },
        customizations: { title: 'USA Vendor', description: 'USA Vendor order payment' },
        meta: { order_items: items.map(x => `${x.name} x${x.quantity}`).join('; ').slice(0, 900) },
      }),
    });
    const data = await response.json();
    if (!response.ok || data.status !== 'success' || !data.data?.link) {
      return json(502, { error: 'Flutterwave could not create checkout. Check your account is enabled for USD card payments.' });
    }
    return json(200, { checkoutUrl: data.data.link, tx_ref: txRef });
  } catch (error) {
    console.error('Create payment failed:', error?.message || error);
    return json(500, { error: 'Unable to start payment right now. Please try again.' });
  }
}
