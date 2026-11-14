# Pahani Village Report: paid Excel download (switch-on guide)

The tool (`tools/pahani-report/`) takes payment through the same **rll-pay** worker and Razorpay account
as the ₹10 PDFs and AP DSC 2026. Customers pay the admin price (default **₹500**) and the Excel downloads by
itself. PDF and Print are shown only to the admin. Nothing else changes for the existing tools.

## 1. Update the worker (5 min)
1. dash.cloudflare.com → **Workers & Pages → rll-pay → Edit code**.
2. Replace everything with `payment-worker/worker.js` from this repository → **Deploy**.
3. **Settings → Variables and Secrets → Add** (keep all the existing ones):

| Name | Type | Value |
|---|---|---|
| `PAHANI_KEY` | **Secret** | the value given to you in the Claude chat (also in `PAHANI-PRIVATE.zip` → `PAHANI_KEY.txt`) |

   Deploy again if Cloudflare asks.
4. Check: open `https://rll-pay.raghusreenivas-pudeti.workers.dev/pahani/config` → `{"ok":true,"price":500,"ready":true}`.
   `"ready":false` means the `PAHANI_KEY` secret is missing or misspelled.

The Razorpay webhook already covers these payments; nothing to add there.

## 2. Change the price (any time)
Open the tool → **Admin login** (bottom of the page) → the admin password (same as the AP DSC 2026 admin panel).
The admin bar shows **Excel price for customers ₹ ___ → Save price**. New customers pay the new amount at once.
Admin mode also shows **Download PDF** and **Print**, and Excel downloads are free for the admin.
Payments show in **Site Admin** (site-admin.html) as "Pahani Village Report · Excel · village name".

## How it is protected
- The Excel writer (`xl.enc`) and the PDF / print code (`adm.enc`) are encrypted. The worker gives the Excel key only
  for a paid order (24 hours after payment, up to 30 unlocks, so a customer can re-download the same village),
  and the PDF / print key only to the admin.
- The plain sources and `PAHANI_KEY.txt` are in `PAHANI-PRIVATE.zip` (given in the Claude chat). **Never put them in
  this repository** — it is public. To change the Excel or PDF layout: edit `xl.src.js` / `adm.src.js`, then run
  `node build.js <website>/tools/pahani-report` and commit the new `xl.enc` / `adm.enc` (change `ENC_V` in
  `pahani-app.js` so phones load the new files).
- The report is still made inside the visitor's browser, so a person with technical skill can get around any
  browser-side lock; this keeps ordinary visitors on the paid path.
