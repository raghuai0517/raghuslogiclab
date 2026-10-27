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
