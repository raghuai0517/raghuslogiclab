/*
  RaghusLogicLab — site data
  ------------------------------------------------------------
  This ONE file holds your site settings, every project, every daily update
  and the list of tools ("tools" at the bottom).
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
    }
  ]
};
