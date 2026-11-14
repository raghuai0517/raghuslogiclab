/*
  RaghusLogicLab — site data
  ------------------------------------------------------------
  This ONE file holds your site settings, every project, every daily update
  the list of tools ("tools") and the list of apps ("apps" at the bottom).
  Easiest way to edit: open admin.html in your browser, make changes, then click
  "Download site-data.js" and replace this file on your host.
  (You can also edit it by hand — keep the format exactly as below.)
*/
window.RLL_DATA = {
  "site": {
    "name": "RaghusLogicLab",
    "tagline": "Where logic becomes products.",
    "intro": "A growing lab of tools, websites and experiments. Every project lives here and links out to its own subdomain or site — and the lab gets a little bigger every day.",
    "baseUrl": "",
    "email": "raghusreenivas.pudeti@gmail.com",
    "about": "RaghusLogicLab is the home base for everything I build. Each project starts as an idea, gets its own page and customer link, and grows into a live product on its own subdomain."
  },
  "projects": [
    {
      "id": "p-main",
      "slug": "raghuslogiclab-main",
      "name": "RaghusLogicLab Main Domain",
      "tagline": "The hub that links every project together.",
      "description": "The main domain you are looking at. It lists every project, gives each one a shareable customer link, and carries the daily Lab Log.",
      "category": "Website",
      "status": "live",
      "visibility": "public",
      "url": "",
      "color": "#22d3ee",
      "started": "2026-09-30",
      "created": "2026-09-30"
    },
    {
      "id": "p-sample-tools",
      "slug": "logic-tools",
      "name": "Logic Tools (sample)",
      "tagline": "Sample project — edit or delete it in the admin page.",
      "description": "This is a placeholder to show how an in-progress project looks. Open admin.html → Manage Projects to change it, or delete it once you have real projects.",
      "category": "Tool",
      "status": "progress",
      "visibility": "public",
      "url": "https://tools.raghuslogiclab.com",
      "color": "#a78bfa",
      "started": "2026-09-30",
      "created": "2026-09-30"
    }
  ],
  "updates": [
    {
      "id": "u-pahani-report",
      "date": "2026-11-14",
      "type": "launch",
      "title": "New: REVENUE section with the Pahani Village Report",
      "body": "A new red REVENUE section on the home page. First tool: upload the Pahani / Adangal of any village and download an Excel and a PDF report in English and Telugu: summary, land-nature-wise sheets, Government & poramboke register, khata abstract and remarks for the VRO and VS. The file is read only in your browser.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-pe-phase2-guide-telugu",
      "date": "2026-11-11",
      "type": "launch",
      "title": "New: Telugu edition of the Population Enumeration Phase-II Guide",
      "body": "The CENSUS 2027 section now has a Telugu guide built from the Telugu PE Instruction Manual: ask doubts in Telugu, Q.1–Q.40 guides, field doubts, quiz, codes and calculators, with Telugu manual page numbers. Each guide has a one-tap switch to the other language. Free; works on phone.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-pe-phase2-guide",
      "date": "2026-11-11",
      "type": "launch",
      "title": "New: CENSUS 2027 with the Population Enumeration Phase-II Guide",
      "body": "A new blue CENSUS 2027 section on the home page. First tool: a doubt-clearing guide for Census 2027 enumerators and supervisors, built from the Population Enumeration Instruction Manual. Ask a doubt or a question number and get the answer with the manual page; guides for Q.1 to Q.40, a which-questions-apply checker, field doubts, a quiz, codes and calculators. Free; works on phone.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-telugu-election-certificate",
      "date": "2026-11-07",
      "type": "launch",
      "title": "New: Election Certificate Maker (Telugu)",
      "body": "Fill and print the Telugu MPTC/ZPTC Certificate of Election (ఎన్నిక ధ్రువపత్రం, Form XXIX) with a decorative border on A4 landscape. Choose MPTC / ZPTC and recognised / registered party; the certificate fills in as you type. Free; data stays in your browser.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-election-id-card-maker",
      "date": "2026-11-06",
      "type": "launch",
      "title": "New: Election Duty ID Card & Agent Pass Maker",
      "body": "Make MPTC/ZPTC Election Duty ID cards and Agent Passes with photos. Enter details one by one or import an Excel/CSV list, upload photos, and print 10.5 × 7.5 cm cards, 5 per A4 sheet with crop marks. Free; everything stays in your browser.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-voter-slip-search",
      "date": "2026-11-03",
      "type": "launch",
      "title": "New: LOCAL BODY ELECTIONS with Voter Slip Search",
      "body": "A new orange LOCAL BODY ELECTIONS section on the home page. First tool: search MPTC/ZPTC photo voter slip PDFs by name in Telugu or English, EPIC number, serial number or house number, and download the voter list as Excel (name, age, gender, relation, house number, EPIC, serial number). PS 16 is built in; upload any other polling station's PDF and it works the same way. Free; PDFs are read only in your browser.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-sadarem-security-print",
      "date": "2026-10-30",
      "type": "launch",
      "title": "New: SWSG RELATED tools with SADAREM Security Paper Print",
      "body": "A new gold SWSG RELATED section on the home page. First tool: upload a SADAREM disability certificate PDF and move it down (1.5 inches by default) so it prints below the header on security paper. Adjust the position in inches or mm, keep the digitally-signed box, shrink to fit if needed, and print several certificates in one A4 PDF. Free; files never leave your browser.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-auto-pdf-payment",
      "date": "2026-10-29",
      "type": "feature",
      "title": "Pay ₹10 and the PDF downloads by itself",
      "body": "The Aadhaar affidavit tools now take payment through Razorpay: pay with PhonePe, Google Pay, any UPI app, card or net banking, and the PDF downloads automatically once the payment is confirmed. No transaction ID to copy or type. Each payment gives one PDF.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-ap-dsc-2026-trial",
      "date": "2026-10-29",
      "type": "feature",
      "title": "AP DSC 2026 Exam Hall: free trial and full access",
      "body": "Try the AP DSC 2026 Exam Hall free with the new Free Trial tile: no login needed. For the full Exam Hall (every chapter of all 83 AP textbooks, full CBT mocks for every post, all question banks), create an account with your Gmail and pay once through Razorpay (UPI, cards, netbanking).",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-ap-dsc-2026",
      "date": "2026-10-28",
      "type": "launch",
      "title": "New in DSC EXAM HALL: AP DSC 2026 Exam Hall",
      "body": "Post-wise mock exams for AP DSC 2026 (SGT, SA in every subject, Special Education, TGT, PGT, PET, Physical Director, Principal) and chapter, topic and quick tests from all AP textbooks for Classes 1–10, in English and Telugu, with notebook notes, glossaries and A4 PDFs. The earlier DSC Exam Hall tool stays as it is.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-dsc-exam-hall",
      "date": "2026-10-27",
      "type": "feature",
      "title": "New: DSC EXAM HALL — bilingual mock tests",
      "body": "A new DSC EXAM HALL section on the home page. First tool: 356 DSC-pattern questions in English and Telugu from the AP Class 8 Social Science Semester 1 textbook, with chapter-wise full exams, 10-question quick tests, a grand test, explained answers and A4 answer-sheet PDFs. You can also upload another textbook PDF to build a new question bank.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-eaadhaar-a4-print",
      "date": "2026-10-27",
      "type": "launch",
      "title": "New tool: e-Aadhaar A4 Print Maker",
      "body": "Upload the e-Aadhaar PDF and get one A4 page with the full Aadhaar letter on top and the cut-out card (front and back) at real ID-card size below. The photo is brightened and sharpened for glossy photo paper. Download a 300 dpi JPEG or PDF, or print directly. Card-only and letter-only layouts too. Free, and the file is read only in your browser.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-aadhaar-services-report",
      "date": "2026-10-27",
      "type": "launch",
      "title": "New tool: Aadhaar Services Report for AP Seva",
      "body": "Aadhaar operators can upload the CSV exported from the UC Client and get a day-wise report of services done, using the AP Seva portal's Challan Payment service names and amounts. Print all sheets on A4, print just the portal checklist, or download Excel. It's free, and the files are read only in your browser.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-sunshine-backup",
      "date": "2026-10-24",
      "type": "feature",
      "title": "Sunshine Homes: download backups",
      "body": "The committee can now download a backup from Admin → Settings: an Excel file with residents, dues by flat, payments, complaints, notices, visitors and bookings, plus a full data copy. Settings shows when the last backup was taken.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-sunshine-committee",
      "date": "2026-10-24",
      "type": "feature",
      "title": "Sunshine Homes: separate Committee login",
      "body": "The committee now has its own login with its own password and goes straight to the admin panel; residents no longer see Admin at all. Only the committee login can approve payments, update complaints, post notices and change settings — enforced by the database, not just the app.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-sunshine-password",
      "date": "2026-10-24",
      "type": "update",
      "title": "Sunshine Homes: login with mobile number and society password",
      "body": "OTP login has been replaced: residents now log in with their mobile number and the password shared by the committee. All data stays shared live between residents and the committee.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-apps-sunshine",
      "date": "2026-10-24",
      "type": "launch",
      "title": "New: APPS section with the Sunshine Homes community app",
      "body": "Added an Apps menu and an APPS section on the home page. First app: Sunshine Homes, an apartment community app where residents log in with their mobile number and OTP, pay maintenance by UPI, raise complaints, pre-approve visitors and book amenities; the committee approves payments and tracks every flat.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-dob-corrigendum",
      "date": "2026-10-22",
      "type": "feature",
      "title": "DoB Annexure Maker updated to UIDAI Corrigendum",
      "body": "The Aadhaar DoB Annexure Maker now follows the UIDAI SOP as amended by Corrigendum I/58955/2026: new birth-certificate / corrected-document choice in Annexure I, EID and earlier-document lines removed from Annexure I, IA, II and IIA, and revised invalid-document wording in Annexure III and IIIA.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-pay-once",
      "date": "2026-10-18",
      "type": "fix",
      "title": "One payment ID = one PDF",
      "body": "Each UPI reference or Razorpay payment ID now unlocks only one PDF. Entering the same ID again shows \"This payment ID has already been used\". If a PDF fails to save after paying, the next click re-uses that payment instead of asking again.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-aadhaar-paid-pdf",
      "date": "2026-10-17",
      "type": "feature",
      "title": "Aadhaar Related tools on the home page; PDF download ₹10 by UPI",
      "body": "The Aadhaar tools now sit at the top of the home page under AADHAAR RELATED. Filling and previewing stay free; the print-ready PDF is ₹10 per download by UPI (PhonePe, Google Pay, Paytm). The Word download has been removed.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-launch",
      "date": "2026-09-30",
      "type": "launch",
      "title": "RaghusLogicLab is live",
      "body": "First version of the main domain: project dropdown, Create Project studio, customer links and this daily Lab Log.",
      "project": "raghuslogiclab-main"
    },
    {
      "id": "u-tools-aadhaar",
      "date": "2026-10-16",
      "type": "feature",
      "title": "New: Tools section with two Aadhaar affidavit makers",
      "body": "Added a Tools menu and section. First two tools: the Aadhaar DoB Annexure Maker and the Aadhaar Name Update Affidavit Maker. Both fill UIDAI's prescribed wording and download a print-ready A4 PDF or Word file for stamp paper.",
      "project": "raghuslogiclab-main"
    }
  ],
  "tools": [
    {
      "id": "t-pahani-report",
      "slug": "pahani-report",
      "name": "Pahani Village Report (Excel + PDF)",
      "tagline": "Upload the Pahani / Adangal of any village and get a ready report for the VRO and VS — పహాణీ నుండి గ్రామ నివేదిక.",
      "description": "Excel and PDF in English and తెలుగు: a summary sheet (land nature, Govt / private, classification, water source and enjoyment abstracts with totals), one sheet for each land nature, the Government & poramboke register, a khata abstract and an action list with remarks for VRO / VS. © RLL on every sheet and printed page. Aadhaar is masked by default.",
      "category": "REVENUE",
      "badge": "Free tool · English + తెలుగు",
      "url": "tools/pahani-report/index.html",
      "color": "#b91c1c",
      "visibility": "public",
      "added": "2026-11-14"
    },
    {
      "id": "t-pe-phase2-guide-telugu",
      "slug": "pe-phase2-guide-telugu",
      "name": "జనాభా గణన దశ-II మార్గదర్శి (Telugu)",
      "tagline": "తెలుగు సూచనల మాన్యువల్ నుండి జనాభా గణన 2027 సందేహాలు తీర్చుకోండి — PE యాప్ పూరించే ముందు.",
      "description": "మీ సందేహాన్ని తెలుగులో లేదా ప్రశ్న సంఖ్యతో (ప్ర 18) టైప్ చేయండి; తెలుగు మాన్యువల్ పేజీతో సమాధానం వస్తుంది. ప్ర.1 నుండి ప్ర.40 వరకు మార్గదర్శి (ఎవరికి అడగాలి, ఎలా పూరించాలి, నియమాలు, సాధారణ తప్పులు), 'ఏ ప్రశ్నలు వర్తిస్తాయి' తనిఖీ, సుమారు 170 క్షేత్ర సందేహాలు, అభ్యాస క్విజ్, కోడ్‌లు, వయస్సు మరియు క్యాలెండర్ కన్వర్టర్‌లు. ఉచితం; ఫోన్‌లో పని చేస్తుంది.",
      "category": "CENSUS",
      "badge": "Free tool · తెలుగు",
      "url": "tools/pe-phase2-guide-telugu/index.html",
      "color": "#1e40af",
      "visibility": "public",
      "added": "2026-11-11"
    },
    {
      "id": "t-pe-phase2-guide",
      "slug": "pe-phase2-guide",
      "name": "Population Enumeration Phase-II Guide",
      "tagline": "Clear Census 2027 Population Enumeration doubts from the Instruction Manual before you fill the PE App.",
      "description": "Type a doubt in your own words or a question number (Q 18) and get the answer with the exact manual page. Guide for every question Q.1 to Q.40 (who is asked, how to fill, rules, common mistakes), a 'which questions apply' checker, about 150 field doubts, a practice quiz, code lists, all State/District and mother tongue codes, and age and local-calendar converters. Free; works on phone, even offline once opened.",
      "category": "CENSUS",
      "badge": "Free tool",
      "url": "tools/pe-phase2-guide/index.html",
      "color": "#1d4ed8",
      "visibility": "public",
      "added": "2026-11-11"
    },
    {
      "id": "t-telugu-election-certificate",
      "slug": "telugu-election-certificate",
      "name": "Election Certificate Maker (Telugu) · ఎన్నిక ధ్రువపత్రం",
      "tagline": "Fill and print the Telugu MPTC/ZPTC Certificate of Election (Form XXIX, Rule 63) on A4 landscape.",
      "description": "Type the constituency, Returning Officer, date, party and winning candidate and the Telugu certificate fills in as you type. Click any word on the certificate to change it. Choose MPTC, ZPTC or both; recognised or registered party, or an independent candidate; and శ్రీ / శ్రీమతి / కుమారి (అతనికి / ఆమెకు changes to match). Empty fields print as dotted lines to fill by hand. Prints only the certificate on A4 landscape. Free; data stays in your browser.",
      "category": "ELECTIONS",
      "badge": "Free tool",
      "url": "tools/telugu-election-certificate.html",
      "color": "#7A1F1F",
      "visibility": "public",
      "added": "2026-11-07"
    },
    {
      "id": "t-election-id-card-maker",
      "slug": "election-id-card-maker",
      "name": "Election Duty ID Card & Agent Pass Maker",
      "tagline": "Make MPTC/ZPTC Election Duty ID cards and Agent Passes with photos, 10.5 × 7.5 cm, printed 5 per A4 sheet.",
      "description": "Type each person's details or import your staff list from Excel (CSV), upload photos (matched automatically by file name), and print ready-to-cut cards with crop marks. Election Duty cards: name, designation, department, appointed as. Agent Passes: name, party affiliation / independent, MPTC/ZPTC segment. Change the mandal, election line and colour; add blank cards to fill by hand. Free; data and photos stay in your browser.",
      "category": "ELECTIONS",
      "badge": "Free tool",
      "url": "tools/election-id-card-maker.html",
      "color": "#b07a4f",
      "visibility": "public",
      "added": "2026-11-06"
    },
    {
      "id": "t-voter-slip-search",
      "slug": "voter-slip-search",
      "name": "Voter Slip Search (ఓటరు స్లిప్ శోధన)",
      "tagline": "Search MPTC/ZPTC photo voter slip PDFs by name in Telugu or English, EPIC number, serial number or house number, and download the list as Excel.",
      "description": "PS 16 (చేనిగుంట) is built in. Upload the AP SEC photo voter slip PDF of any other polling station and it is read in your browser: search by voter or father/husband name (తెలుగు or English spelling), EPIC, serial number or range, house number, age, gender and relation, see everyone in the same house, and download results or the full list as Excel with a summary sheet. Free; PDFs never leave your browser.",
      "category": "ELECTIONS",
      "badge": "Free tool",
      "url": "tools/voter-slip-search.html",
      "color": "#f97316",
      "visibility": "public",
      "added": "2026-11-03"
    },
    {
      "id": "t-sadarem-security-print",
      "slug": "sadarem-security-print",
      "name": "SADAREM Security Paper Print",
      "tagline": "Move a SADAREM certificate PDF down the page so it prints below the header on security paper.",
      "description": "Upload one or more SADAREM disability certificate PDFs and get a print-ready A4 PDF moved down 1.5 inches (or any amount, in inches or mm). Live A4 preview, left/right and size adjustment, shrink to fit, and the digitally-signed box kept for printing. Free; files never leave your browser.",
      "category": "SWSG",
      "badge": "Free tool",
      "url": "tools/sadarem-security-print.html",
      "color": "#d4a017",
      "visibility": "public",
      "added": "2026-10-30"
    },
    {
      "id": "t-ap-dsc-2026-trial",
      "slug": "ap-dsc-2026-trial",
      "name": "AP DSC 2026 Exam Hall — Free Trial",
      "tagline": "Try it free, no login: the first 2 chapters of your post's syllabus with notes and tests, 10-question quick tests in every part and a 30-question mini mock. English and తెలుగు.",
      "description": "The free trial of the AP DSC 2026 Exam Hall. Open the first two chapters of your post's syllabus with notebook notes, Do You Know, Glossary, Exercises and chapter tests; take 10-question quick tests in GK, Perspectives, Psychology, Methodology and Content; and sit a 30-question mini mock for your post. Unlock the full Exam Hall any time.",
      "category": "DSC",
      "badge": "Free trial",
      "url": "tools/ap-dsc-2026-trial/index.html",
      "color": "#0284c7",
      "visibility": "public",
      "added": "2026-10-29"
    },
    {
      "id": "t-ap-dsc-2026",
      "slug": "ap-dsc-2026",
      "name": "AP DSC 2026 Exam Hall",
      "tagline": "Full access: post-wise CBT mock tests for AP DSC 2026 (SGT, SA, TGT, PGT, PET, PD, Principal) and chapter tests from every AP textbook, Classes 1–10, in English and తెలుగు. Sign in with Google.",
      "description": "Full CBT-pattern mock exams for every post as per the AP DSC 2026 TRT scheme, plus a clickable syllabus index of 83 AP textbooks and 972 chapters with quick, full and topic tests, notebook-style notes, Do You Know, Glossary and Exercises. GK, Perspectives, Psychology, Methodology, English, PE and Administration question banks. Explained answers and A4 PDFs. Sign in with Google and pay once through Razorpay for full access.",
      "category": "DSC",
      "badge": "Sign in · Full access",
      "url": "tools/ap-dsc-2026/index.html",
      "color": "#ec4899",
      "visibility": "public",
      "added": "2026-10-28"
    },
    {
      "id": "t-dsc-exam-hall",
      "slug": "dsc-exam-hall",
      "name": "DSC Exam Hall",
      "tagline": "Bilingual (English / తెలుగు) DSC-pattern mock tests, chapter by chapter, with scores and explained answers.",
      "description": "356 questions from the AP Class 8 Social Science Semester 1 textbook: full chapter exams, 10-question quick tests and a grand test with timer, question palette and negative-marking option. Every answer is explained; download A4 answer-sheet PDFs. Upload other textbook PDFs to make new question banks. Free.",
      "category": "DSC",
      "badge": "Free tool",
      "url": "tools/dsc-exam-hall.html",
      "color": "#ec4899",
      "visibility": "public",
      "added": "2026-10-27"
    },
    {
      "id": "t-aadhaar-dob",
      "slug": "aadhaar-dob-annexure",
      "name": "Aadhaar DoB Annexure Maker",
      "tagline": "Affidavit or self-declaration for a date of birth update, ready for ₹10 stamp paper.",
      "description": "Covers UIDAI Annexure I, IA, II, IIA, III and IIIA (DoB update, operator error, reactivation). Fill the form and check the A4 preview free; download the PDF for ₹10 by UPI.",
      "category": "Aadhaar",
      "url": "tools/aadhaar-dob-annexure.html",
      "color": "#34d399",
      "visibility": "public",
      "added": "2026-10-16"
    },
    {
      "id": "t-aadhaar-name",
      "slug": "aadhaar-name-affidavit",
      "name": "Aadhaar Name Update Affidavit Maker",
      "tagline": "Affidavit for a name correction, surname change or removing urf/alias.",
      "description": "Covers UIDAI Annexure B to F, with a quick guide on when no affidavit is needed. Fill the form and check the A4 preview free; download the PDF for ₹10 by UPI.",
      "category": "Aadhaar",
      "url": "tools/aadhaar-name-affidavit.html",
      "color": "#fbbf24",
      "visibility": "public",
      "added": "2026-10-16"
    },
    {
      "id": "t-aadhaar-services-report",
      "slug": "aadhaar-services-report",
      "name": "Aadhaar Services Report for AP Seva",
      "tagline": "Upload the UC Client CSV and get a day-wise report to enter in the AP Seva portal.",
      "description": "For Aadhaar operators: counts services day by day under the AP Seva Challan Payment service names, with amounts. Print on A4 or download Excel. Free; files never leave your browser.",
      "category": "Aadhaar",
      "badge": "Free tool",
      "url": "tools/aadhaar-services-report.html",
      "color": "#60a5fa",
      "visibility": "public",
      "added": "2026-10-27"
    },
    {
      "id": "t-eaadhaar-a4-print",
      "slug": "eaadhaar-a4-print",
      "name": "e-Aadhaar A4 Print Maker",
      "tagline": "Full Aadhaar letter plus the cut-out card at real ID size on one A4 page, photo enhanced.",
      "description": "Upload the e-Aadhaar PDF (password-protected ones too). Get the full letter on top and the card front and back at 85.6 × 54 mm below, with a brighter, sharper photo. Download a 300 dpi JPEG or PDF for glossy photo paper. Free; the file never leaves your browser.",
      "category": "Aadhaar",
      "badge": "Free tool",
      "url": "tools/eaadhaar-a4-print.html",
      "color": "#f472b6",
      "visibility": "public",
      "added": "2026-10-27"
    }
  ],
  "apps": [
    {
      "id": "a-sunshine-homes",
      "slug": "sunshine-homes",
      "name": "Sunshine Homes",
      "tagline": "Apartment community app: maintenance by UPI, notices, helpdesk, visitors and amenities.",
      "description": "Residents log in with their mobile number and the society password, pay monthly maintenance by UPI and track dues. The management committee has its own login to approve payments, track every flat and post notices.",
      "category": "Community",
      "icon": "🌇",
      "url": "apps/sunshine-homes/",
      "color": "#0FB5A6",
      "visibility": "public",
      "added": "2026-10-24"
    }
  ]
};
