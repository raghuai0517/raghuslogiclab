# Site Admin (visits and downloads): switch-on guide

`site-admin.html` shows who visited raghuslogiclab.com, what they opened, what they downloaded or printed,
and the Razorpay payments. Login: the **same admin password** as the AP DSC 2026 Exam Hall admin login
(`ADMIN_PASSWORD` in the rll-pay worker). Signing in on either page signs you in on both, in the same browser.

Open it at **https://raghuslogiclab.com/site-admin.html** (it is not linked from the menu and is hidden from search engines).

## Switch it on (10 minutes, once)
1. dash.cloudflare.com → **Storage & Databases → D1 SQL Database → Create** → name `rll-stats` → **Create**.
2. **Workers & Pages → rll-pay → Settings → Bindings → Add → D1 database** →
   Variable name `DB`, database `rll-stats` → **Deploy**. (Keep the existing `ORDERS` KV binding and all variables.)
3. **rll-pay → Edit code** → replace everything with `payment-worker/worker.js` from this repository → **Deploy**.
4. Open site-admin.html → sign in → the Overview fills as visitors arrive. The worker makes the table itself.

Until steps 1–3 are done the pages work normally; visits just aren't counted, and site-admin.html shows these steps.

## What is logged
- **Page opened**: every page that loads `assets/track.js` (all pages except admin.html and site-admin.html).
- **Downloaded**: any file a tool saves (jsPDF/pdf-lib PDFs, Word, CSV, APK links), with the file name.
  On the Aadhaar and SADAREM tools (`<meta name="rll-track-files" content="type-only">`) only the type, e.g. "PDF file".
- **Printed**: window.print() and the iframe print buttons on the e-Aadhaar A4 and Aadhaar Services Report tools.
- **Unlocked full tool**: AP DSC 2026 full tool opened after sign-in.
- **Signed in / Paid**: from the worker itself (DSC Google sign-in; Razorpay payments with amount, payment ID, mobile).
- Each row also has the visitor number (`ap26t.vid`, shared with the DSC free trial), city/region, device, and the site they came from.
- **Who**: a name or Gmail shows when the visitor signed in to AP DSC 2026; a mobile number shows when they paid by Razorpay;
  otherwise "Visitor #xxxxxx" (one browser).
- Bots and automated browsers are skipped. One visitor is capped at 400 events a day.

## Good to know
- "Don't count my visits" (ticked automatically when you sign in) stops logging in that browser only.
  Tick it on each phone/computer you use.
- Logging only runs on raghuslogiclab.com (not when a page is opened from your computer), unless the URL has `?rlltrack=1`.
- Records are deleted after 180 days. D1 free plan: 100,000 writes and 5 million reads a day — far above this site's needs,
  and separate from the KV storage that payments use, so heavy traffic can never stop payments.
- The AP DSC 2026 trial and full tool pages are built by `make_paid.py site`. If you rebuild them, keep the line
  `<script defer src="../../assets/track.js?v=1"></script>` before `</head>` in both `index.html` files, and in
  `tools/ap-dsc-2026/index.html` the two `RLLT` lines around `document.write`.
- Pages can log their own events: `if (window.RLLT) RLLT.ev("download", "file name")`.
