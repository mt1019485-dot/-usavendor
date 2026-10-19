import crypto from 'node:crypto';

const html = (statusCode, title, message) => ({
  statusCode,
  headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  body: `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | USA Vendor</title><style>body{font:16px system-ui;margin:0;background:#f6f4ef;color:#191919;display:grid;min-height:100vh;place-items:center}.box{background:white;padding:32px;border-radius:18px;max-width:520px;margin:20px;box-shadow:0 10px 40px #0001}a{color:#8a641b}</style><main class="box"><h1>${title}</h1><p>${message}</p><p><a href="/">Return to USA Vendor</a></p></main></html>`,
});

export async function handler(event) {
  const secret = process.env.FLW_SECRET_KEY;
  const q = event.queryStringParameters || {};
  const txRef = String(q.tx_ref || '');
  const amountText = String(q.amount || '');
  const currency = String(q.currency || '');
  const sig = String(q.sig || '');
  const transactionId = String(q.transaction_id || '');
  if (!secret || !txRef || !amountText || currency !== 'USD' || !sig || !transactionId) {
    return html(400, 'Payment not confirmed', 'We could not verify this payment. Please contact USA Vendor with your order reference before placing another order.');
  }
  const expected = crypto.createHmac('sha256', secret).update(`${txRef}|${Number(amountText).toFixed(2)}|${currency}`).digest('hex');
  const a = Buffer.from(sig); const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return html(400, 'Payment not confirmed', 'The payment details could not be verified. Please contact USA Vendor.');
  try {
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
      headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json' },
    });
    const result = await response.json();
    const tx = result?.data;
    const paid = response.ok && result.status === 'success' && tx?.status === 'successful' && tx?.tx_ref === txRef && tx?.currency === currency && Number(tx.amount) >= Number(amountText);
    if (!paid) return html(400, 'Payment not confirmed', 'Flutterwave has not confirmed a successful payment for this order. If you were charged, contact USA Vendor before trying again.');
    return html(200, 'Thank you for your order!', `Flutterwave has confirmed payment for reference <strong>${txRef.replace(/[&<>"']/g, '')}</strong>. Please keep this reference for your records. USA Vendor will follow up using the contact details supplied at checkout.`);
  } catch (error) {
    console.error('Verify payment failed:', error?.message || error);
    return html(502, 'Verification pending', 'We could not verify the transaction just now. Do not pay again yet. Contact USA Vendor with your transaction reference.');
  }
}
