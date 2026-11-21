# RaghusLogicLab — main domain website

A simple static website (no server, no database) that you can host on any domain.

## Files

| File | What it is |
|---|---|
| `index.html` | Home page: hero, **Projects ▾ dropdown**, project grid, daily Lab Log, About, Contact |
| `project.html` | One page per project — this is the **customer link** (`project.html?p=link-name`) |
| `admin.html` | **Project Studio** — Create Project, Manage Projects, Daily Update, Settings & Publish |
| `site-admin.html` | **Site Admin** — who visited, what they opened, downloaded, printed and paid for. Same admin password as AP DSC 2026. Set-up: `payment-worker/SETUP-SITE-ADMIN.md` |
| `assets/track.js` | Visit and download log used by Site Admin; loaded by every page except the two admin pages |
| `data/site-data.js` | All your content: settings, projects and updates |
| `assets/style.css`, `assets/app.js` | Design and shared code |
| `tools/` | Tools, one HTML page each (Aadhaar DoB Annexure Maker, Aadhaar Name Update Affidavit Maker, Aadhaar Services Report for AP Seva, e-Aadhaar A4 Print Maker, DSC Exam Hall); `tools/ap-dsc-2026/` (paid, encrypted), `tools/ap-dsc-2026-trial/` and `tools/pahani-report/` are folders, as is `tools/appsc-group2/` (APPSC Group 2 Prep Hall) |
| `apps/` | Apps, one folder each (Sunshine Homes community app) |

## Try it now
Double-click `index.html` — it opens in your browser and works offline.

## Create a project (any time)
1. Open the **Projects ▾** menu → **+ Create Project** (or open `admin.html`).
2. Fill in name, status, visibility, and the project's own website/subdomain if it has one.
3. Click **Create project** → you get the **customer link** to copy and send.
   - *Public* projects show in the menu and on the home page.
   - *Unlisted* projects are hidden — only people with the link can open them.

Changes are saved in your browser as a **draft** and appear on your pages in *Preview mode* (only you see them).

## Tools
The **Tools ▾** menu and the *Tools* section on the home page list everything in the `tools` array at the bottom of `data/site-data.js`.
To add a tool:
1. Put its page in the `tools/` folder (one self-contained HTML file).
2. Add an entry to `"tools"` in `data/site-data.js` (copy an existing one and change `id`, `slug`, `name`, `tagline`, `description`, `url`, `color`, `added`).
3. Set `"visibility": "unlisted"` to hide a tool from the menu without deleting it.
4. Optional `"badge"` sets the label on the tool's card (default: "Free to fill · ₹10 PDF"), e.g. `"badge": "Free tool"`.

Tools with `"category": "APPSC"` appear in their own deep-green, gold-bordered **APPSC** section at the top of the home page. An optional `"icon"` (for example `"G2"`) sets the letters on the card.

**APPSC Group 2 Prep Hall** (`tools/appsc-group2/`) — free APPSC Group 2 preparation in English and Telugu (one tap switches every screen), in the green / gold / cream theme with a night mode. No login and no server: progress (XP, streak, topic accuracy, test history, bookmarks) is saved only in the visitor's browser under the key `appscg2.v1`, with backup / restore as a file in Progress → Settings.
- **Learn:** 30 topics with five key points each in History, Geography, Indian Society, Polity, Economy and Science & Technology, plus method notes for 8 mental ability topics.
- **Tests:** Prelims pattern mock (120 questions, 120 minutes: History 30, Geography 30, Indian Society 30, Mental Ability 30; Current Affairs is left out on purpose), Mini prelims (40), Mains Paper I and II practice (50 each). Timer, question palette, mark for review, ⅓ negative marking, section-wise marks and a full answer review. Quick 10-question practice shows the explanation at once. Mistake notebook and bookmarks.
- **Mental ability lab:** `reasoning.js` builds a fresh question every time (number series, clocks, calendars, direction sense, coding, arithmetic, blood relations, data interpretation) with an explanation and a drawn solution (clock face, walked path, family tree, bar chart).
- **Revise:** 10-card flashcard sprints, 16 economy story cards, a 34-event history timeline.
- **Home:** daily goal ring, today's plan, exam-date countdown, streak, XP / level and a study heatmap.
- **Question bank:** 165 original questions in `data/history.js`, `geography.js`, `society.js`, `polity.js`, `economy.js`, `science.js` (format is described at the top of `data/history.js`: the correct option is written first and the app shuffles options on screen). Add new questions only at the end of a list so saved progress stays matched. `data/extras.js` holds the timeline and story cards. These are practice questions written for the syllabus, not APPSC previous-year papers. Facts that change every year (schemes, budget and survey figures, current affairs) are left out.
- **Offline / install:** `manifest.webmanifest`, `sw.js` and the icons make it installable and usable without internet after the first visit. After changing any file, raise the `?v=` numbers in `index.html` and `sw.js` and change `CACHE` in `sw.js` so phones pick up the new copy.
- It is an independent practice tool and says so on its home screen; it is not affiliated with APPSC.

Tools with `"category": "REVENUE"` appear in their own red **REVENUE** section (gold-bordered cards) at the top of the home page.

**Pahani Village Report** (`tools/pahani-report/`) — upload a village Pahani / Adangal (the HTML-table `.xls` from Webland / MeeBhoomi, or `.xlsx` / `.csv`); the summary preview is free and the full bilingual (English + Telugu) **Excel is a paid download** (Razorpay through the `rll-pay` worker, `/pahani/*`; default ₹500, the admin changes the price in the tool's admin bar). **PDF (pdfmake, real text) and Print are admin only** (Admin login at the bottom of the tool, same password as the DSC admin). Sheets: Summary (village at a glance; land nature, Govt / private, classification, water source and enjoyment nature abstracts; observations for VRO / VS; sheet index; signature lines), one sheet per land nature (భూమి స్వభావం) found in the file, Govt & Poramboke register, Remarks – Action List and Khata Abstract (1-B). Columns are found by their Telugu/English headings; rows with a blank survey number (second owner of the same survey) are kept with the survey above so extents are not counted twice. Remarks come from rules in `pahani-core.js` (`RULES`); notes are shown in the Remarks column but left out of the Action List. Every sheet has © RLL bands plus a © RLL print header and footer; every PDF page has a © RLL header, footer and watermark. Aadhaar is masked to the last 4 digits unless unticked. Files: `index.html`, `pahani-core.js` (parsing, report spec), `pahani-app.js` (page, payment, admin), `xl.enc` (Excel writer, unlocked after payment) and `adm.enc` (PDF + print, unlocked for the admin) — encrypted from private sources kept out of this public repo; switch-on and rebuild steps: `payment-worker/SETUP-PAHANI.md`. Libraries in `lib/` load only when needed (no CDN). `fonts/RLLTelugu-*.ttf` is Noto Sans (Latin subset) merged with Noto Sans Telugu, with one GPOS mark-to-base lookup split per mark class because pdfmake's fontkit crashes on its blank anchors (OFL; see `lib/LICENSES.txt`).

**Resurvey Correlation Check & 9(2) Notices** (`tools/resurvey-correlation/`) — free tool for AP Resurvey 2.0 (mandal surveyors, village surveyors, VROs). Upload a village correlation statement (`.xlsx`, `.xls`, `.csv`); the header row and columns (old Sy.No, sub-division, old/RSR extent, old pattadar, khata, LP No, LP extent, correlated extent, pattadar after resurvey, classification) are found from their English/Telugu titles and can be changed. Checks: blank values, unreadable extents (1-25 is read as 1.25 Ac), one survey number or LP with two extents, survey-number old vs correlated new extent and LP parts vs LP extent beyond an allowed difference (% or cents, set by the user), LPs over several survey numbers with no part extent, duplicate rows, pattadar name changes (initials and word order allowed for; Government land skipped), classification conflicts, joint pattadars and LP number gaps. Merged Sy.No cells are filled from the row above. Excel check report (Summary, Problems, By survey number, By LP number) and CSV. **9(2) notices:** bilingual Telugu + English A4 notices under Section 9(2) of the AP Survey and Boundaries Act, 1923 — one per LP (joint pattadars together) or one per pattadar — with old survey numbers, part extents, LP extent in Ac and Ha, classification, the Section 11 appeal line (authority and days as entered; blank days print as a line to fill by hand), signature lines for VS / VRO / survey officer and a tear-off acknowledgement with mode of service. LPs with open errors are left out by default. Print / Save as PDF through the browser; the 9(2) notice register downloads as Excel. Notice settings are remembered in that browser (`rll.resurvey.v1`). Files: `index.html`, `resurvey-core.js` (checking logic), `resurvey-app.js` (page, notices, Excel). Uses `tools/pahani-report/lib/xlsx.full.min.js` and the Telugu fonts in `tools/pahani-report/fonts/` (no CDN). It opens with a made-up example village (Kondapalem) that has planted problems.

Tools with `"category": "CENSUS"` appear in their own deep-blue **CENSUS 2027** section at the top of the home page.

**Population Enumeration Phase-II Guide** (`tools/pe-phase2-guide/`) — doubt-clearing tool for Census of India 2027 enumerators and supervisors, built from the Population Enumeration Instruction Manual (209 pages, OCR'd). Ask a doubt in plain words or a question number and get matching answers, the question guide and the exact manual text with page numbers; Q.1–Q.40 guides; a which-questions-apply checker; about 150 field doubts; a 10-question practice quiz; Annexure V code lists, relationship/country codes, all State/District codes and the mother tongue directory; age ↔ year of birth and local-calendar year converters. `index.html` is self-contained (the manual text and search run in the browser, no CDN needed except Google Fonts); `pg/` holds the original page scans shown under "Original page". Marked `noindex` because the manual is marked "Restricted – For Official Use Only". An AI-written answer appears only when the page is opened inside Claude; on this site it runs in manual-search mode.

**AHL → Household Schedule Generator** (`tools/census-household-schedule/`) — upload the Abridged Houselist (AHL, HLO) PDF of a Houselisting Block, plus the optional CMMS HLB Excel, and get prefilled compact English Household Schedules: A4 landscape, 4 pages per household (page 1: location particulars and the Q1–10 roster; pages 2–4: Q11–40 with one column per member). The AHL is read with PDF.js: location codes from the 21-digit "Location Code" row, household rows from Section 2 using the column-number row (1–7) on each page; only rows with a household number are kept (temples, vacant and non-residential census houses are skipped). The Excel sheet `HLB <no>` is matched by household number and gives Total Persons (member slots, maximum 6; 6 when there is no Excel or no match), head's sex, SC/ST (English or Telugu values), mobile (Q36) and institutional flag; the hamlet comes from the "CMMS Summary" sheet. Prefilled values print in blue. Output is a self-contained print file (Liberation Sans fonts embedded from `schedule-fonts.js`) opened in a new tab or downloaded, printed from Chrome / Edge at Margins: Default, Scale 100, Background graphics on; the layout is tuned for Chromium page breaks (4 pages per household). Files: `index.html` (page), `schedule-core.js` (parsing and schedule HTML; the same file is used by the RaghusLogicLab artifact and Claude skill, so keep them in step), `schedule-fonts.js`. Uses `assets/lib/pdf-3.11.174.min.js` (+ worker) and `tools/pahani-report/lib/xlsx.full.min.js` (no CDN). Marked `noindex` like the other Census tools. Never commit AHL PDFs or CMMS Excel files: they contain names and mobile numbers.

**జనాభా గణన దశ-II మార్గదర్శి (Telugu)** (`tools/pe-phase2-guide-telugu/`) — the same tool built from the Telugu PE Instruction Manual (212 pages, OCR'd with Telugu tesseract). Telugu interface, Q.1–Q.40 guides, field doubts and quiz in Telugu using the manual's own terms; search understands Telugu word endings and common colloquial words, and English-typed doubts also show English answers. Page numbers are the Telugu manual's printed pages (Telugu printed page = PDF page − 2); English pages were mapped to Telugu pages by shared paragraph numbers. Header link switches between the English and Telugu guides. OCR sometimes reads the digit 3 as 5 in Telugu text, so the page viewer points users to "Original page" for numbers and tables.

Tools with `"category": "SWSG"` appear in their own gold **SWSG RELATED** section on the home page.

**SADAREM Security Paper Print** (`tools/sadarem-security-print.html`) — upload SADAREM disability certificate PDFs and get a print-ready A4 PDF moved down (1.5 in by default) to print below the header on security paper. Inches/mm, left/right shift, size, shrink to fit, keeps the digitally-signed box (flattened for print), several certificates in one PDF. Free; runs in the browser (pdf-lib and pdf.js from cdnjs). The output file's digital signature is no longer verifiable, which the page tells users.

Tools with `"category": "ELECTIONS"` appear in their own orange **LOCAL BODY ELECTIONS** section on the home page.

**GP Nomination Entry** (`tools/gp-nomination-entry.html`) — for Gram Panchayat Returning Officers: add a photo or PDF of a Sarpanch / Ward Member nomination paper and fill the APSEC nomination fields (items 1–27 plus location, scrutiny and withdrawal) beside it. Unlike the other tools it saves to a server: a Google Apps Script web app ("GP Nomination Entry backend" in the raghuslogiclab@gmail.com account) writes each entry to the **GP Nomination Register – Tada Mandal (Live)** Google Sheet (tab `Nominations`, header row 3, data from row 5) and keeps scans in the Drive folder `GP Nomination Scans`. The page holds only the web app URL (`GAS_URL`); candidate data is never committed here. Access is by a shared code kept in the script's Script properties (`ACCESS_CODE`); "Read form into fields" works only when `ANTHROPIC_API_KEY` is also set there. Column labels must match the sheet's header row exactly — change both together. After the access code, the page receives the Sheet's `GP Master` (Tada mandal: 18 GPs, 184 wards, SEC reservations, voters, Stage-I RO/ARO) and uses it for the GP list, the automatic reservation and the women / SC / ST / BC eligibility check.

**Voter Slip Search** (`tools/voter-slip-search.html`) — search AP SEC MPTC/ZPTC photo voter slip PDFs (ఓటరు స్లిప్) by voter or father/husband name in Telugu or English spelling, EPIC number, serial number or range, house number, age, gender and relation; "ఇంటి సభ్యులు" shows everyone in the same house. Downloads the search results or the full list as Excel (Voters sheet + Summary sheet per polling station). No voter data is built in (removed for privacy): visitors upload a PS PDF and it is read in their browser (uploaded stations are remembered only in that browser). pdf-lib and SheetJS are built into the page, so it needs no CDN. The PDFs keep Telugu conjunct letters in `/ActualText` tags, which pdf.js ignores, so the page reads the PDF content itself. Marked `noindex`. Never commit voter PDFs or extracted data to this repo. Source and build steps: `tools/voter-slip-search-src/` — rebuild rather than hand-editing the 1 MB page.

**Election Duty ID Card & Agent Pass Maker** (`tools/election-id-card-maker.html`) — makes MPTC/ZPTC Election Duty ID cards (name, designation, department, appointed as) and Agent Passes (name, party affiliation / independent, MPTC/ZPTC segment), 10.5 × 7.5 cm, printed 5 per A4 sheet (3 flat + 2 turned) with crop marks. Add people one by one or import a CSV (template download in the page), then upload photos in bulk — matched by the `photo` column file name or the person's name; photos are cropped to the box. Mandal name, election line and colour are editable; extra blank cards can be added. Data is saved only in that browser (localStorage). Print at A4, 100%, with Background graphics on.

**Election Certificate Maker (Telugu)** (`tools/telugu-election-certificate.html`) — fills and prints the Telugu Certificate of Election (ఎన్నిక ధ్రువపత్రం, Form XXIX, Rule 63) on A4 landscape with a decorative maroon/gold border. Fields: election type (MPTC / ZPTC / both), title (heading override; blank = automatic), mandal, district (ZPTC), territorial constituency, Returning Officer, date, party, party type (గుర్తింపు పొందిన / రిజిస్టరయిన / both / independent — స్వతంత్ర అభ్యర్థిగా పోటీ చేసిన), శ్రీ/శ్రీమతి/కుమారి (sets అతనికి/ఆమెకు), candidate, place and date. Empty fields print as dotted lines. Every word on the certificate is editable in place (contenteditable); edits to filled-in values sync back to the form, text edits are saved in localStorage and "అసలు పాఠ్యం తిరిగి తెచ్చు" restores the original wording. Fonts: Ramabhadra + Noto Serif Telugu from Google Fonts. Prints only the certificate; data saved in that browser (localStorage). Print at A4 landscape, 100%, Background graphics on.

Tools with `"category": "DSC"` appear in their own pink **DSC EXAM HALL** section on the home page instead of under AADHAAR RELATED.

**DSC Exam Hall** (`tools/dsc-exam-hall.html`) — bilingual (English / Telugu) DSC-pattern mock tests built from the AP Class 8 Social Science Semester 1 textbook (356 questions, built into the page). Chapter-wise full exams, 10-question quick tests, grand test, explained answers and A4 answer-sheet PDFs. Visitors can upload another textbook PDF to build an offline question bank; it is saved only in their browser. Results are also saved only in the visitor's browser.

**AP DSC 2026 Exam Hall** (`tools/ap-dsc-2026/`) — post-wise CBT mock exams for AP DSC 2026 following the 2026 TRT pattern, and a syllabus index of all AP textbooks for Classes 1–10 (83 books, 972 chapters) with quick, full and topic tests, notebook-style notes, Do You Know, Glossary and Exercises. Bilingual (English / Telugu). **Paid:** `index.html` is a sign-in page (Google sign-in, Razorpay payment, admin login); the tool itself (`app.enc`) and its chapter data (`data/books/*.enc`) are encrypted and open only with the key the `rll-pay` worker gives to members with active access. Admin panel inside the tool: price and access days, members, manual access, sign-in log and free-trial log. Settings: `tools/ap-dsc-2026/dsc-config.js`. Worker set-up: `payment-worker/SETUP-DSC.md`.

**AP DSC 2026 Exam Hall — Free Trial** (`tools/ap-dsc-2026-trial/`) — no login: the first 2 chapters of the chosen post's syllabus (syllabus index locked), 10-question quick tests, a 30-question mini mock; locked parts link to the full tool. Visits are reported anonymously to the worker for the admin's free-trial log. Results are saved in the visitor's browser under `ap26t.*` keys.

Both folders are generated by the DSC Exam Hall build (`make_paid.py site`); rebuild rather than hand-editing them.

Tool pages download PDF/Word files straight from the browser. They need internet for the PDF/Word libraries (loaded from cdnjs/unpkg).

## Apps
The **Apps ▾** menu and the **APPS** section on the home page list everything in the `apps` array at the bottom of `data/site-data.js`.
Each app lives in its own folder under `apps/` (for example `apps/sunshine-homes/`).

**Sunshine Homes** (`apps/sunshine-homes/`) — apartment community app for Sunshine Homes Apartment, Sulurpeta (30 flats, G1–F406), with two logins:
- **Resident** — mobile number + the society password. First-time users register (name, flat, Owner/Tenant/Family) and wait until the committee approves them. Then: pay maintenance by UPI, see dues, society accounts (money in/out, expenses by category, balance), notices, complaints, visitor passes, common-area booking, contacts.
- **Committee** — its own password, no mobile number. Opens the admin panel: payment approvals, **Expenses** (cashbook: expenses and other income with voucher numbers EXP-0001 / INC-0001, date, category, paid to, mode, bill no.), mark paid, residents (approve / reject new registrations), dues grid, reports (collection, expenses, surplus, balance in hand, defaulters with amounts), complaints, notices, settings (UPI ID, monthly amount — ₹1000 (raised from ₹800 on 21 Nov 2026, for all months), opening balance, contacts, common areas, approval switch, residents-see-accounts switch, Google Sheet status, backups).
- Installable: `manifest.webmanifest`, icons and `sw.js` (keeps the app shell for offline opening; never touches Firebase; bump `CACHE` to clear). `index.html` keeps the browser's install offer from the first moment, so the Install button opens Android/desktop Chrome's own "Install app" box (one tap and the icon is on the home screen). iPhone and in-app browsers (WhatsApp, Instagram) can't be installed by a website, so the button shows step-by-step help instead.
- `thumbnail.jpg` (1200×630) is the link preview (og:image) and the card image on the home page (`"image"` in `data/site-data.js`); `poster.jpg` (1080×1350) is the WhatsApp/print poster with a QR code to the app.

**Google Sheet (raghuslogiclab@gmail.com):** `sheets-sync/Code.gs` is a Google Apps Script bound to the sheet "Sunshine Homes – Live Records" in the raghuslogiclab@gmail.com Drive. Every 5 minutes it logs in to Firebase as the committee (password kept only in the script's Script properties), reads the `sunshine` collection and rewrites the tabs Summary, Maintenance Payments, Dues <year>, Expenses & Income, Residents, Complaints, Notices, Visitors and Bookings (read-only copy; entries are made in the app). It writes its status into the `sunshine/sheetSync` document, which the committee sees in Admin → Overview / Settings with "Open sheet" and, if the script is deployed as a web app (Execute as: Me, Anyone), "Sync now". Setup steps are at the top of `Code.gs`.

Files:
- `index.html` + `app.js` are what the website serves. `app.js` is a built file — don't edit it by hand.
- `src/sunshine-homes.jsx` is the source. To rebuild `app.js` after editing it (needs Node.js):
  ```
  cd apps/sunshine-homes/src
  npm install --no-save react@18 react-dom@18 esbuild
  npx esbuild main.jsx --bundle --minify --jsx=automatic --define:process.env.NODE_ENV='"production"' --target=es2018 --outfile=../app.js
  ```
  Then change the `?v=` value on the `app.js` line in `apps/sunshine-homes/index.html` (any new text) so phones load the new version immediately.

Firebase (project `sunshine-homes-d5e7b`, console: https://console.firebase.google.com/project/sunshine-homes-d5e7b) checks both passwords and stores all data in Firestore (collection `sunshine`, Mumbai), updating live on every phone. Neither password is stored in this website's code.
- Accounts (Authentication → Users): `residents@sunshine-homes-d5e7b.firebaseapp.com` (society password) and `admin@sunshine-homes-d5e7b.firebaseapp.com` (committee password).
- **Change a password:** Authentication → Users → delete that account, then **Add user** with the same email and the new password. Data isn't affected; people using that login sign in again.
- Settings in use: Email/Password sign-in ON, Phone OFF, user sign-up and delete OFF (Authentication → Settings → User actions).
- Payment approvals, resident approvals (`member:<mobile>` keys) and complaint status live in their own documents (`approvals`, `ticketStatus`) that only the committee can write, so a resident can't mark their own payment as paid or approve themselves. The cashbook is the `ledger` document and the sheet status is `sheetSync`; both are committee-only. Firestore rules:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /sunshine/{key} {
        function isResident() { return request.auth != null && request.auth.token.email == "residents@sunshine-homes-d5e7b.firebaseapp.com"; }
        function isAdmin() { return request.auth != null && request.auth.token.email == "admin@sunshine-homes-d5e7b.firebaseapp.com"; }
        allow read: if isResident() || isAdmin();
        allow write: if isAdmin() || (isResident() && !(key in ["config", "notices", "approvals", "ticketStatus", "ledger", "sheetSync"]));
      }
    }
  }
  ```
- **Backups:** the free Firebase plan has no automatic backups; the Google Sheet is the live copy. Committee login → Admin → Settings → **Backup** also downloads an Excel file (residents, dues by flat, payments, expenses & income, complaints, notices, visitors, bookings, settings) and a full `.json` copy of all data. Settings shows when the last backup was taken; download one at least monthly. The Excel library (SheetJS) loads from cdn.sheetjs.com only when that button is pressed.
- **Without Firebase** (`FIREBASE_CONFIG = null`) it runs in demo mode: any password works and data is saved only in that browser.

To add another app: put it in `apps/<name>/`, then add an entry to `"apps"` in `data/site-data.js` (copy the Sunshine Homes one and change `id`, `slug`, `name`, `tagline`, `description`, `icon`, `url`, `color`, `added`).

## Daily update routine
1. `admin.html` → **Daily Update** → write what changed → **Add to Lab Log**.
2. **Settings & Publish** → **Download site-data.js**.
3. Replace `data/site-data.js` on your host with the downloaded file. Done — customers see it.

## Put it on your domain
- Set **Your domain** in *Settings & Publish* (e.g. `https://raghuslogiclab.com`) so customer links use it.
- Upload the whole folder to any static host: Netlify (drag & drop), GitHub Pages, Cloudflare Pages, or Hostinger/cPanel `public_html`.
- **Subdomains:** create them at your DNS/host (e.g. `tools.raghuslogiclab.com`), point each at that project's site, then put the address in the project's *website / subdomain* field.

## Site Admin (visits and downloads)
Open `site-admin.html` and sign in with the AP DSC 2026 admin password. It shows visitors, pages opened, downloads, prints and Razorpay payments for the whole site (last 180 days), with CSV export. Every new page must load `assets/track.js` (one `<script defer>` line before `</head>`) to be counted. Switch-on steps: `payment-worker/SETUP-SITE-ADMIN.md`.

## Good to know
- `admin.html` can't change the live site on its own — only uploading `site-data.js` does — so visitors who open it can't alter anything. It is marked `noindex` (and blocked in `robots.txt`) so search engines skip it, and it is no longer linked for public visitors. If you prefer, don't upload `admin.html` at all and keep it only on your computer.
- Unlisted links are hidden, not password-protected. Don't put secrets in project descriptions.
- Drafts live in one browser. Use **Import site-data.js** to continue on another computer.

## Rules for every new page (privacy, security, SEO)
- **Never commit real personal data** — voter lists, Aadhaar numbers, Pahani files, names from customers. This repo is public. Tools must read such files in the visitor's browser only.
- **No CDN scripts.** Put libraries in `assets/lib/` (see `assets/lib/LICENSES.txt`) and load them from there. Every PDF.js `getDocument()` call must pass `isEvalSupported: false` (CVE-2024-4367) until PDF.js is upgraded to 4.2.67+.
- **Head tags:** title, meta description, canonical, Open Graph/Twitter tags, favicon and `assets/track.js`. Easiest: copy the `<!-- share preview, canonical & icons -->` block from any tool page and change the title, description and URLs. The shared preview image is `assets/og-image.png` (1200×630).
- **Government-related tools** (Aadhaar, census, elections, SWSG): show the "Independent tool" notice near the top (see `.rll-disclaimer` in the Aadhaar tools), never use official logos or emblems, and link to the official portal.
- **New paid product?** Update `terms.html`, `refund.html` and `privacy.html` before it goes live.
- Add the page to `sitemap.xml` (skip `noindex` pages).
- Admin shortcuts (Project Studio, + Create Project) appear only in a browser where `admin.html` has been opened once; public visitors don't see them.

## Moving to Cloudflare Pages (recommended, optional)
GitHub Pages cannot send security headers. Cloudflare Pages (free) can deploy this same repo and reads the `_headers` file in the root:
1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick this repo. Build command: none. Output directory: `/`.
2. After the first deploy works on the `*.pages.dev` address, add the custom domain `raghuslogiclab.com` in the Pages project (and remove it from GitHub Pages settings).
3. The Content-Security-Policy in `_headers` starts in report-only mode. Open the main tools with the browser console open; if no "Content-Security-Policy" warnings appear for a week, rename the header to `Content-Security-Policy` to enforce it.
4. Optional: move `admin.html` and `site-admin.html` behind Cloudflare Access (Zero Trust → Access → Applications → self-hosted, path `/admin.html` and `/site-admin.html`, allow only your Gmail).

## Ideas to add next (scope for daily growth)
Project screenshots/gallery · search box · customer enquiry form (Formspree/Netlify Forms) · per-project changelog pages · RSS feed of the Lab Log · real login for private client areas (needs a backend such as Supabase/Firebase).
