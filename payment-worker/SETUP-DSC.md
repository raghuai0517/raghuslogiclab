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
- If the content key is ever replaced, re-encrypt the files with `payment-worker/dsc-rekey.mjs` (below) or rebuild the tool with the new key (`make_paid.py site`).

## 5. Protect the paid content (server mode) — recommended
Until now every member's browser received the same content key, and the encrypted files are public in
this repo. One member sharing that key would unlock everything for anyone, forever. Server mode keeps the
key inside the worker: each file is unlocked by the worker only for a signed-in member whose access is active.

**Switch on (2 min):** Cloudflare → Workers & Pages → rll-pay → **Edit code** → paste the new
`payment-worker/worker.js` → Deploy. Then **Settings → Variables and Secrets → Add**: `DSC_SERVER_FILES` = `1` (Text) → Deploy.

**Test:** open the Exam Hall in a private window, sign in as a member (or admin) and open two or three books and a
mock test. If anything fails to open, delete `DSC_SERVER_FILES` (or set it to `0`) and deploy — it goes straight back
to the old way. Nothing on the website needs to change in either direction.

**Then change the key (do this once, after server mode works):** the old key may already have been shared.
1. On your computer, in this repo folder: `node payment-worker/dsc-rekey.mjs --new-key` → copy the new key into
   `WORKER-SETTINGS-PRIVATE.txt` first.
2. `node payment-worker/dsc-rekey.mjs OLD_KEY NEW_KEY` → re-encrypts `app.enc` and every book (it checks that the old
   key opens every file before changing anything).
3. Cloudflare → rll-pay → Settings → `DSC_CONTENT_KEY` → set NEW_KEY → Deploy, and straight away commit + push the
   changed `.enc` files in GitHub Desktop. Do it at night; members may need one reload.
4. In your `make_paid.py` build settings, use NEW_KEY from now on.

Notes: the worker only decrypts (AES, fast); the browser un-gzips, so it stays within the free plan's CPU limit.
A member who is signed in can still read what they paid for — server mode stops the *key* from spreading, and
expired or signed-out users get nothing.

## 6. Data protection (DPDP Act) records
- Sign-up now shows a short privacy notice and an **18+ / parent's consent** tick box. The worker stores
  `consent: { v: "2026-11-15", age18: true, at: <time> }` on the member record (after you deploy the new worker).
  If you change the privacy notice, change `NOTICE_V` in `tools/ap-dsc-2026/account.js`.
- The account menu has **"Show, correct or delete my data"** (opens an email to you). Reply within one month;
  to delete an account, open Cloudflare → Storage & Databases → KV → the ORDERS namespace and delete the key `dsc:u:<their gmail>`.
