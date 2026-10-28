# Automatic payments: switch-on guide

The website code is already in place (`assets/pay-auto.js`, both Aadhaar tools). It stays **off** until you
finish the steps below and put the worker address in `assets/pay-config.js` → `apiUrl`.
Until then, customers keep seeing the manual payment box.

Full explanation: SOP-PAY-01 (PDF), "Automatic PDF download after a UPI payment".

## 1. Razorpay (Test Mode first) — 20 min
1. dashboard.razorpay.com → switch to **Test Mode**.
2. **Account & Settings → API Keys → Generate Test Key.** Save the Key ID (`rzp_test_…`) and Key Secret (shown once).
3. **Account & Settings → Payment Capture** must be **Automatic**.
4. Make up a long random **webhook secret** (32+ letters and numbers). Save it with the keys.

## 2. Cloudflare worker — 45 min
1. Sign up free at dash.cloudflare.com and turn on two-factor sign-in.
2. **Workers & Pages → Create → Worker** ("Hello World"), name it **rll-pay**, Deploy.
   Its address is `https://rll-pay.<your-subdomain>.workers.dev`.
3. **Edit code**: replace everything with `payment-worker/worker.js` from this repo. Deploy.
4. **Storage & Databases → KV → Create namespace** `RLL_ORDERS`.
5. Worker → **Settings → Bindings → Add → KV namespace**: variable name `ORDERS`, namespace `RLL_ORDERS`.
6. Worker → **Settings → Variables and Secrets**:

| Name | Type | Value |
|---|---|---|
| `RZP_KEY_ID` | Text | `rzp_test_…` |
| `RZP_KEY_SECRET` | **Secret** | test Key Secret |
| `RZP_WEBHOOK_SECRET` | **Secret** | your webhook secret |
| `PRICE_PAISE` | Text | `1000` |
| `ALLOWED_ORIGINS` | Text | `https://raghuslogiclab.com,https://www.raghuslogiclab.com` |

7. Check: open `https://rll-pay.<your-subdomain>.workers.dev/status?order=order_test123`.
   It must show `{"ok":false,"error":"unknown_order"}`.

## 3. Razorpay webhook — 10 min
**Account & Settings → Webhooks → Add New Webhook**
- URL: `https://rll-pay.<your-subdomain>.workers.dev/webhook`
- Secret: the same webhook secret
- Events: `payment.captured`, `order.paid`

## 4. Test privately on the live site (Test Mode)
1. In `assets/pay-config.js` set `testApiUrl: "https://rll-pay.<your-subdomain>.workers.dev"` (leave `apiUrl` empty). Commit and push.
2. Open `https://raghuslogiclab.com/tools/aadhaar-dob-annexure.html?paytest=1`.
   The button reads **Pay ₹10 & Download PDF · TEST**. Customers without `?paytest=1` still get the manual box.
3. Pay with UPI ID `success@razorpay` → the PDF downloads by itself.
4. Try `failure@razorpay` → no PDF. Close the checkout without paying → no PDF.
5. Pay again, then reload the page before the PDF saves → it finishes the download without a second payment.
6. Razorpay → Webhooks → delivery log shows HTTP 200.
7. Repeat on `tools/aadhaar-name-affidavit.html?paytest=1`.

## 5. Go live
1. Razorpay → **Live Mode → API Keys → Generate Live Key**.
2. Worker → Variables and Secrets: replace `RZP_KEY_ID` and `RZP_KEY_SECRET` with the live ones. Deploy.
3. Razorpay (Live Mode) → Webhooks → add the same webhook again (URL, secret, events).
4. Test once more with `?paytest=1`, paying ₹10 for real with PhonePe (it's the live worker now).
5. In `assets/pay-config.js` copy the address into `apiUrl` too. Commit and push. **Now every customer gets the automatic flow.**
6. Pay ₹10 with Google Pay and with a computer QR (no `?paytest=1`). Each must download by itself.
7. Add a Lab Log entry.

## Switch off (emergency)
Set `apiUrl: ""` in `assets/pay-config.js`, commit and push. The manual payment box comes back.

## Never
Put the Key Secret or webhook secret in this repository (it is public), in `pay-config.js`, email, WhatsApp or screenshots.
