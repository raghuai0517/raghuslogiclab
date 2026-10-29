# AP DSC 2026 Exam Hall: sign-in, payment and admin (switch-on guide)

The website part is already live: `tools/ap-dsc-2026/` (sign-in page + encrypted tool) and
`tools/ap-dsc-2026-trial/` (free trial). It starts working when you finish the 3 steps below.
Your ₹10 PDF payments (Aadhaar tools) keep working exactly as before; the new worker code only adds `/dsc/...` addresses.

The private values (content key, session secret) were given to you in the Claude chat and saved in
`DSC EXAM HALL\WORKER-SETTINGS-PRIVATE.txt` on your computer. **Never put them in this repository** (it is public).

## 1. Google sign-in client ID (10 min)
1. Open console.cloud.google.com and sign in with your Gmail. Create a project, e.g. `RaghusLogicLab`.
2. **APIs & Services → OAuth consent screen**: User type **External**, app name `RaghusLogicLab`,
   support email = your Gmail, authorised domain `raghuslogiclab.com`. Scopes: leave the defaults (email, profile, openid).
   **Publish app** (status "In production") so every Gmail user can sign in.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**, name `AP DSC Exam Hall`
   - Authorised JavaScript origins: `https://raghuslogiclab.com` and `https://www.raghuslogiclab.com`
   - (No redirect URIs needed.)
4. Copy the **Client ID** (ends in `.apps.googleusercontent.com`). It is not secret.
5. Put it in `tools/ap-dsc-2026/dsc-config.js` → `googleClientId: "…"` (or send it to Claude to do it), commit and push.

## 2. Update the rll-pay worker (10 min)
1. dash.cloudflare.com → **Workers & Pages → rll-pay → Edit code**.
2. Replace everything with `payment-worker/worker.js` from this repository → **Deploy**.
3. **Settings → Variables and Secrets → Add** (keep all the existing ones):

| Name | Type | Value |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Text | the Client ID from step 1 |
| `ADMIN_EMAILS` | Text | your admin Gmail |
| `ADMIN_PASSWORD` | **Secret** | your admin password |
| `SESSION_SECRET` | **Secret** | from WORKER-SETTINGS-PRIVATE.txt |
| `DSC_CONTENT_KEY` | **Secret** | from WORKER-SETTINGS-PRIVATE.txt |

   Deploy again after adding them.
4. Check: open `https://rll-pay.raghusreenivas-pudeti.workers.dev/dsc/config` → `{"ok":true,"price":199,"days":365}`.

## 3. Razorpay webhook (2 min)
Razorpay → Account & Settings → Webhooks: the existing `/webhook` entry already covers these payments
(events `payment.captured`, `order.paid`). Nothing to add.

## 4. Test
1. Open `raghuslogiclab.com/tools/ap-dsc-2026/` → **Admin login** → your password → the full tool opens.
   Round button (top right) → **Admin panel** → set your price and days → Save.
2. In a private window: **Create account** → details → **Sign up with Google** → pay (UPI) → the tool opens.
3. Admin panel → **Members** shows the payment; **Sign-in log** shows the sign-in and payment;
   **Free trial log** shows visits to the trial page and the Android app.

## Notes
- Price and days apply to new payments at once. Renewals add days to any time left.
- Admin password: 5 wrong tries lock admin login for 15 minutes (per internet connection). To change the
  password, change the `ADMIN_PASSWORD` secret and deploy.
- Logs and visitor records are kept for 180 days. The free-trial log is anonymous (a visitor number, city, device).
- Cloudflare's free plan allows about 1,000 storage writes a day. Each sign-in, payment and trial visit uses
  1–3. If the trial gets more than ~500 visitors a day, upgrade to Workers Paid (US$5/month) to keep every log entry.
  Sign-in and payments keep working either way.
- If the content key is ever replaced, the tool must be rebuilt with the new key (`make_paid.py site`).
