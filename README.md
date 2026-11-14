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
| `tools/` | Tools, one HTML page each (Aadhaar DoB Annexure Maker, Aadhaar Name Update Affidavit Maker, Aadhaar Services Report for AP Seva, e-Aadhaar A4 Print Maker, DSC Exam Hall); `tools/ap-dsc-2026/` (paid, encrypted), `tools/ap-dsc-2026-trial/` and `tools/pahani-report/` are folders |
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

Tools with `"category": "REVENUE"` appear in their own red **REVENUE** section (gold-bordered cards) at the top of the home page.

**Pahani Village Report** (`tools/pahani-report/`) — upload a village Pahani / Adangal (the HTML-table `.xls` from Webland / MeeBhoomi, or `.xlsx` / `.csv`) and download a bilingual (English + Telugu) report as Excel (ExcelJS) and PDF (pdfmake, real text), or print it. Sheets: Summary (village at a glance; land nature, Govt / private, classification, water source and enjoyment nature abstracts; observations for VRO / VS; sheet index; signature lines), one sheet per land nature (భూమి స్వభావం) found in the file, Govt & Poramboke register, Remarks – Action List and Khata Abstract (1-B). Columns are found by their Telugu/English headings; rows with a blank survey number (second owner of the same survey) are kept with the survey above so extents are not counted twice. Remarks come from rules in `pahani-core.js` (`RULES`): extent mismatches, Govt land in private names, pattadar ≠ enjoyer, Aadhaar not linked, nil sist, missing data, NALA, assigned / Inam / freehold notes, and more; notes are shown in the Remarks column but left out of the Action List. Every sheet has © RLL bands plus a © RLL print header and footer; every PDF page has a © RLL header, footer and watermark. Aadhaar is masked to the last 4 digits unless the visitor unticks it. Files: `index.html` (page), `pahani-core.js` (parsing, report spec, Excel writer; also runs in Node for tests), `pahani-pdf.js` (pdfmake document), `pahani-app.js` (page script). Libraries in `lib/` load only when needed (no CDN). `fonts/RLLTelugu-*.ttf` is Noto Sans (Latin subset) merged with Noto Sans Telugu, with one GPOS mark-to-base lookup split per mark class because pdfmake's fontkit crashes on its blank anchors (OFL; see `lib/LICENSES.txt`).

Tools with `"category": "CENSUS"` appear in their own deep-blue **CENSUS 2027** section at the top of the home page.

**Population Enumeration Phase-II Guide** (`tools/pe-phase2-guide/`) — doubt-clearing tool for Census of India 2027 enumerators and supervisors, built from the Population Enumeration Instruction Manual (209 pages, OCR'd). Ask a doubt in plain words or a question number and get matching answers, the question guide and the exact manual text with page numbers; Q.1–Q.40 guides; a which-questions-apply checker; about 150 field doubts; a 10-question practice quiz; Annexure V code lists, relationship/country codes, all State/District codes and the mother tongue directory; age ↔ year of birth and local-calendar year converters. `index.html` is self-contained (the manual text and search run in the browser, no CDN needed except Google Fonts); `pg/` holds the original page scans shown under "Original page". Marked `noindex` because the manual is marked "Restricted – For Official Use Only". An AI-written answer appears only when the page is opened inside Claude; on this site it runs in manual-search mode.

**జనాభా గణన దశ-II మార్గదర్శి (Telugu)** (`tools/pe-phase2-guide-telugu/`) — the same tool built from the Telugu PE Instruction Manual (212 pages, OCR'd with Telugu tesseract). Telugu interface, Q.1–Q.40 guides, field doubts and quiz in Telugu using the manual's own terms; search understands Telugu word endings and common colloquial words, and English-typed doubts also show English answers. Page numbers are the Telugu manual's printed pages (Telugu printed page = PDF page − 2); English pages were mapped to Telugu pages by shared paragraph numbers. Header link switches between the English and Telugu guides. OCR sometimes reads the digit 3 as 5 in Telugu text, so the page viewer points users to "Original page" for numbers and tables.

Tools with `"category": "SWSG"` appear in their own gold **SWSG RELATED** section on the home page.

**SADAREM Security Paper Print** (`tools/sadarem-security-print.html`) — upload SADAREM disability certificate PDFs and get a print-ready A4 PDF moved down (1.5 in by default) to print below the header on security paper. Inches/mm, left/right shift, size, shrink to fit, keeps the digitally-signed box (flattened for print), several certificates in one PDF. Free; runs in the browser (pdf-lib and pdf.js from cdnjs). The output file's digital signature is no longer verifiable, which the page tells users.

Tools with `"category": "ELECTIONS"` appear in their own orange **LOCAL BODY ELECTIONS** section on the home page.

**Voter Slip Search** (`tools/voter-slip-search.html`) — search AP SEC MPTC/ZPTC photo voter slip PDFs (ఓటరు స్లిప్) by voter or father/husband name in Telugu or English spelling, EPIC number, serial number or range, house number, age, gender and relation; "ఇంటి సభ్యులు" shows everyone in the same house. Downloads the search results or the full list as Excel (Voters sheet + Summary sheet per polling station). PS 16 (చేనిగుంట, serials 691–1384, 694 voters) is built in; visitors upload any other PS PDF and it is read in their browser (uploaded stations are remembered only in that browser). pdf-lib and SheetJS are built into the page, so it needs no CDN. The PDFs keep Telugu conjunct letters in `/ActualText` tags, which pdf.js ignores, so the page reads the PDF content itself. Marked `noindex` because it carries voter names. Source and build steps: `tools/voter-slip-search-src/` — rebuild rather than hand-editing the 1 MB page.

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

**Sunshine Homes** (`apps/sunshine-homes/`) — apartment community app with two logins:
- **Resident** — mobile number + the society password. Pay maintenance by UPI, see dues, notices, raise complaints, visitor passes, amenity booking.
- **Committee** — its own password, no mobile number. Opens the admin panel: payment approvals, mark paid, residents, accounts, reports, complaints, notices, settings.

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
- Payment approvals and complaint status live in their own documents (`approvals`, `ticketStatus`) that only the committee can write, so a resident can't mark their own payment as paid. Firestore rules:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /sunshine/{key} {
        function isResident() { return request.auth != null && request.auth.token.email == "residents@sunshine-homes-d5e7b.firebaseapp.com"; }
        function isAdmin() { return request.auth != null && request.auth.token.email == "admin@sunshine-homes-d5e7b.firebaseapp.com"; }
        allow read: if isResident() || isAdmin();
        allow write: if isAdmin() || (isResident() && !(key in ["config", "notices", "approvals", "ticketStatus"]));
      }
    }
  }
  ```
- **Backups:** the free Firebase plan has no automatic backups. Committee login → Admin → Settings → **Backup** downloads an Excel file (residents, dues by flat, payments, complaints, notices, visitors, bookings, settings) and a full `.json` copy of all data. Settings shows when the last backup was taken; download one at least monthly. The Excel library (SheetJS) loads from cdn.sheetjs.com only when that button is pressed.
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
- `admin.html` can't change the live site on its own — only uploading `site-data.js` does — so visitors who open it can't alter anything. It is marked `noindex` so search engines skip it. If you prefer, don't upload `admin.html` at all and keep it only on your computer.
- Unlisted links are hidden, not password-protected. Don't put secrets in project descriptions.
- Drafts live in one browser. Use **Import site-data.js** to continue on another computer.

## Ideas to add next (scope for daily growth)
Project screenshots/gallery · search box · customer enquiry form (Formspree/Netlify Forms) · per-project changelog pages · RSS feed of the Lab Log · real login for private client areas (needs a backend such as Supabase/Firebase).
