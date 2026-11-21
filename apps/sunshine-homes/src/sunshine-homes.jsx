import { useState, useEffect } from "react";

/* ================================================================== */
/*  Sunshine Homes — Community Super App (ADDA-style)                   */
/*  Resident + Committee login · Maintenance · Notices · Helpdesk       */
/*  Amenities · Admin                                                   */
/* ================================================================== */

/* --------------------- FIREBASE (LOGIN + DATA) -------------------- */
/*  With FIREBASE_CONFIG filled in, the app:                            */
/*   • logs residents in with their mobile number + the society         */
/*     password. Firebase checks the password against ONE login account */
/*     (SOCIETY_LOGIN_EMAIL below), so the password is never in this   */
/*     code. To change it: Authentication → Users → delete that user,  */
/*     then Add user again with the same email and the new password.    */
/*   • keeps all society data in Firestore, shared live between every   */
/*     resident's phone and the committee.                             */
/*   • gives the committee its own login (ADMIN_LOGIN_EMAIL + its own   */
/*     password). Only that login sees and runs the admin panel.        */
/*  Firebase console setup: Authentication → Email/Password ON, users   */
/*  for SOCIETY_LOGIN_EMAIL and ADMIN_LOGIN_EMAIL · Firestore rules: see */
/*  the README (residents: read all, write submissions; committee: all).*/
/*  If FIREBASE_CONFIG is null the app runs in DEMO mode: any password  */
/*  of 4+ characters works and data stays in this browser.             */
const FIREBASE_CONFIG = {
  // Firebase project "sunshine-homes" (web app "Sunshine Homes web"). These values are public by design;
  // access is protected by Firestore rules + phone sign-in, not by keeping this secret.
  apiKey: "AIzaSyA9x-wSqK9vvU647mgezMayfs3BbkTfUIk",
  authDomain: "sunshine-homes-d5e7b.firebaseapp.com",
  projectId: "sunshine-homes-d5e7b",
  storageBucket: "sunshine-homes-d5e7b.firebasestorage.app",
  messagingSenderId: "730379536822",
  appId: "1:730379536822:web:f9e19f374f0c947579d917",
};
/* Set FIREBASE_CONFIG = null to switch back to DEMO mode. */
const FIREBASE_VERSION = "13.1.0";
/* The one Firebase account every resident logs in through (its password = the society password). */
const SOCIETY_LOGIN_EMAIL = "residents@sunshine-homes-d5e7b.firebaseapp.com";
/* The committee's separate login (its own password). Only this account can approve payments,
   update complaints, post notices, change settings and remove residents. */
const ADMIN_LOGIN_EMAIL = "admin@sunshine-homes-d5e7b.firebaseapp.com";
const ADMIN_USER = { role: "admin", phone: "admin", name: "Committee", flat: "Committee" };
const SESSION_DAYS = 30;

const YEAR = new Date().getFullYear();
const NOW_MONTH = new Date().getMonth();
const FLOORS = [
  { name: "Ground Floor", flats: ["G1", "G2", "G3", "G4", "G5", "G6"] },
  { name: "First Floor", flats: ["F101", "F102", "F103", "F104", "F105", "F106"] },
  { name: "Second Floor", flats: ["F201", "F202", "F203", "F204", "F205", "F206"] },
  { name: "Third Floor", flats: ["F301", "F302", "F303", "F304", "F305", "F306"] },
  { name: "Fourth Floor", flats: ["F401", "F402", "F403", "F404", "F405", "F406"] },
];
const ALL_FLATS = FLOORS.flatMap((f) => f.flats);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SLOTS = ["Morning (6–11)", "Afternoon (12–4)", "Evening (5–10)"];
const ROLES = ["Owner", "Tenant", "Family member"];
const EXPENSE_CATS = ["Watchman salary", "Common power bill", "Lift service & repairs", "Generator diesel & service", "Cleaning & sanitation",
  "Water sump & tank cleaning", "Electrical & plumbing works", "Festival / events", "Stationery & misc", "Other"];
const INCOME_CATS = ["Builder contribution", "Donation", "Penalty / late fee", "Hall / terrace rent", "Refund", "Other"];
const PAY_MODES = ["Cash", "UPI", "Bank transfer", "Cheque"];
const DEFAULT_CONTACTS = [
  { name: "Security / Watchman", detail: "Main gate", phone: "" },
  { name: "Committee — President", detail: "Society matters", phone: "" },
  { name: "Committee — Treasurer", detail: "Maintenance & accounts", phone: "" },
  { name: "Emergency / Ambulance", detail: "24×7", phone: "108" },
  { name: "Police", detail: "24×7", phone: "100" },
  { name: "Fire", detail: "24×7", phone: "101" },
];

const monthKey = (i) => `${YEAR}-${String(i + 1).padStart(2, "0")}`;
const inr = (n) => "₹" + new Intl.NumberFormat("en-IN").format(n || 0);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const code4 = () => String(Math.floor(1000 + Math.random() * 9000));
const fmtDate = (t) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const fmtPhone = (p) => "+91 " + p.slice(0, 5) + " " + p.slice(5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

const DEFAULTS = { upiId: "sunshinehomes@okicici", monthlyAmount: 1000, facilities: ["Terrace"], contacts: DEFAULT_CONTACTS,
  openingBalance: 0, openingDate: "", showAccounts: true };
const memberKey = (phone) => "member:" + phone;
// Owner register: { F101: { name, phone } }. A mobile number is 10 digits without +91.
const cleanPhone = (p) => String(p || "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "").slice(-10);
const flatsOfPhone = (owners, phone) => ALL_FLATS.filter((f) => owners[f] && owners[f].phone && owners[f].phone === phone);
const toFlat = (f) => { const t = String(f || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, ""); return /^\d{3}$/.test(t) ? "F" + t : t; };
// Reads a one-time import link: base64url of [[flat, name, phone], …]
function readOwnersImport() {
  let raw = null;
  try { raw = sessionStorage.getItem("sh-owners-import"); } catch (e) {}
  if (!raw) return null;
  try {
    const json = decodeURIComponent(escape(atob(raw.replace(/-/g, "+").replace(/_/g, "/"))));
    const rows = JSON.parse(json).map(([f, n, p]) => ({ flat: toFlat(f), name: String(n || "").trim(), phone: cleanPhone(p) })).filter((r) => ALL_FLATS.includes(r.flat) && r.name);
    return rows.length ? rows : null;
  } catch (e) { return null; }
}
const clearOwnersImport = () => { try { sessionStorage.removeItem("sh-owners-import"); } catch (e) {} };
const fmtDay = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
const ymd = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
// Next voucher number for the cashbook: EXP-0001, INC-0001 …
const nextVoucher = (ledger, kind) => {
  const pre = kind === "income" ? "INC-" : "EXP-";
  const max = ledger.filter((e) => e.kind === kind).reduce((m, e) => Math.max(m, +String(e.voucher || "").replace(pre, "") || 0), 0);
  return pre + String(max + 1).padStart(4, "0");
};
// Money in and out. Maintenance counts once the committee has approved it.
function accountTotals(payments, ledger, cfg, year) {
  const inYear = (d) => !year || String(d).slice(0, 4) === String(year);
  const maint = payments.filter((p) => p.status === "approved" && inYear(p.month)).reduce((s, p) => s + (+p.amount || 0), 0);
  const income = ledger.filter((e) => e.kind === "income" && inYear(e.date)).reduce((s, e) => s + (+e.amount || 0), 0);
  const spent = ledger.filter((e) => e.kind === "expense" && inYear(e.date)).reduce((s, e) => s + (+e.amount || 0), 0);
  // Balance in hand = opening balance + money received on/after the opening date − money spent on/after it.
  const from = cfg.openingDate || "";
  const allMaint = payments.filter((p) => p.status === "approved" && ymd(p.decidedAt || p.submittedAt) >= from).reduce((s, p) => s + (+p.amount || 0), 0);
  const allIn = ledger.filter((e) => e.kind === "income" && e.date >= from).reduce((s, e) => s + (+e.amount || 0), 0);
  const allOut = ledger.filter((e) => e.kind === "expense" && e.date >= from).reduce((s, e) => s + (+e.amount || 0), 0);
  return { maint, income, spent, balance: (+cfg.openingBalance || 0) + allMaint + allIn - allOut };
}
const withDefaults = (c) => { const { adminPin, adminPinHash, ...rest } = c || {}; return { ...DEFAULTS, ...rest }; };

/* localStorage keys are prefixed so they never clash with other pages on the same website */
const LS_PREFIX = "sunshine-homes:";
const MODE = FIREBASE_CONFIG ? "online" : "demo";    // online = Firebase: password check + shared online data
const COLL = "sunshine";                              // Firestore collection that holds the app's data
const hasClaudeStorage = () => typeof window !== "undefined" && !!window.storage;
let onSaveError = () => {};

const local = {
  key: (k, shared) => LS_PREFIX + (shared ? "s:" : "p:") + k,
  get(k, shared) { try { const v = localStorage.getItem(local.key(k, shared)); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v, shared) { try { localStorage.setItem(local.key(k, shared), JSON.stringify(v)); } catch (e) {} },
  del(k, shared) { try { localStorage.removeItem(local.key(k, shared)); } catch (e) {} },
};

/* storage: shared=true → visible to every resident (Firestore when Firebase is set up);
   shared=false → this device only (the login session). */
const store = {
  // Returns null when a key doesn't exist yet. With strict=true, connection or
  // permission errors are thrown instead of being treated as "no data".
  async get(k, shared = true, strict = false) {
    if (shared && MODE === "online") {
      try { return await remoteGet(k); } catch (e) { if (strict) throw e; return null; }
    }
    if (hasClaudeStorage()) {
      try { const r = await window.storage.get(k, shared); return r ? JSON.parse(r.value) : null; } catch (e) { return null; }
    }
    return local.get(k, shared);
  },
  async set(k, v, shared = true) {
    if (shared && MODE === "online") {
      try { await remoteSet(k, v); } catch (e) { onSaveError(e); }
      return;
    }
    if (hasClaudeStorage()) { try { await window.storage.set(k, JSON.stringify(v), shared); } catch (e) {} return; }
    local.set(k, v, shared);
  },
  async del(k, shared = true) {
    if (hasClaudeStorage()) { try { await window.storage.delete(k, shared); } catch (e) {} return; }
    local.del(k, shared);
  },
};

/* ------------------------- FIREBASE + LOGIN ------------------------ */
let fb = null;                 // { auth, mod, fs, db }
const dynImport = (u) => new Function("u", "return import(u)")(u);
const FB_ERR = {
  "auth/invalid-credential": "Incorrect password.",
  "auth/invalid-login-credentials": "Incorrect password.",
  "auth/wrong-password": "Incorrect password.",
  "auth/user-not-found": "This login isn't set up yet. Please contact the committee.",
  "auth/too-many-requests": "Too many wrong attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed": "Network error. Check your internet connection.",
  "auth/operation-not-allowed": "Password login isn't switched on yet. Please contact the committee.",
  "auth/user-disabled": "This login has been turned off. Please contact the committee.",
};

async function loadFirebase() {
  if (fb) return fb;
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
  const [appMod, mod, fs] = await Promise.all([
    dynImport(`${base}/firebase-app.js`), dynImport(`${base}/firebase-auth.js`), dynImport(`${base}/firebase-firestore.js`),
  ]);
  const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(FIREBASE_CONFIG);
  const auth = mod.getAuth(app);
  auth.languageCode = "en";
  fb = { auth, mod, fs, db: fs.getFirestore(app) };
  return fb;
}

/* Each key (payments, notices, users…) is one Firestore document: sunshine/<key> = { v: "<json>" } */
async function remoteGet(k) {
  const { fs, db } = await loadFirebase();
  const snap = await fs.getDoc(fs.doc(db, COLL, k));
  return snap.exists() ? JSON.parse(snap.data().v) : null;
}
async function remoteSet(k, v) {
  const { fs, db } = await loadFirebase();
  await fs.setDoc(fs.doc(db, COLL, k), { v: JSON.stringify(v), at: Date.now() });
}
async function remoteWatch(k, cb) {
  const { fs, db } = await loadFirebase();
  return fs.onSnapshot(fs.doc(db, COLL, k), (snap) => {
    try { cb(snap.exists() ? JSON.parse(snap.data().v) : null); } catch (e) {}
  }, () => {});
}
async function firebaseUser() {
  const { auth, mod } = await loadFirebase();
  await new Promise((resolve) => {
    let un = null;
    un = mod.onAuthStateChanged(auth, () => { setTimeout(() => un && un(), 0); resolve(); });
  });
  return auth.currentUser;
}

// Checks a password with Firebase (who = "resident" or "admin"). The passwords are never stored in this code.
async function checkPassword(password, who = "resident") {
  if (MODE === "demo") {
    await sleep(400);
    return password.length >= 4 ? { ok: true } : { error: "Incorrect password." };
  }
  try {
    const { auth, mod } = await loadFirebase();
    await mod.signInWithEmailAndPassword(auth, who === "admin" ? ADMIN_LOGIN_EMAIL : SOCIETY_LOGIN_EMAIL, password);
    return { ok: true };
  } catch (e) {
    return { error: FB_ERR[e?.code] || "Couldn't log in. Please try again." };
  }
}

async function firebaseSignOut() {
  try { if (fb) await fb.mod.signOut(fb.auth); } catch (e) {}
}

/* ------------------------------ BACKUP ----------------------------- */
const SHEETJS_URL = "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";   // loaded only when a backup is downloaded
const pad2 = (n) => String(n).padStart(2, "0");
const stamp = (t) => { if (!t) return ""; const d = new Date(t); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const today = () => stamp(Date.now()).slice(0, 10);
const monthName = (key) => (key ? MONTHS[+key.slice(5) - 1] + " " + key.slice(0, 4) : "");
const STATUS_LABEL = { approved: "Paid", pending: "Pending", rejected: "Rejected", none: "Unpaid", open: "Open", "in-progress": "In progress", resolved: "Resolved" };

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// One sheet per kind of data, in plain words the committee can read.
function backupSheets(d) {
  const users = Object.values(d.users || {}).sort((a, b) => ALL_FLATS.indexOf(a.flat) - ALL_FLATS.indexOf(b.flat));
  const byFlat = {};
  (d.payments || []).forEach((p) => { (byFlat[p.flat] = byFlat[p.flat] || []).push(p); });
  const dues = ALL_FLATS.map((f) => {
    const row = { Flat: f, Residents: users.filter((u) => u.flat === f).map((u) => u.name).join(", ") };
    let owed = 0;
    MONTHS.forEach((m, i) => {
      const s = statusOf(d.payments || [], f, monthKey(i));
      row[m] = i > NOW_MONTH && s === "none" ? "" : STATUS_LABEL[s] || s;
      if (i <= NOW_MONTH && s !== "approved") owed += d.cfg.monthlyAmount;
    });
    row["Outstanding (₹)"] = owed;
    return row;
  });
  return [
    ["Residents", users.map((u) => ({ Flat: u.flat, Name: u.name, Mobile: u.phone, Role: u.role, Joined: stamp(u.createdAt), "Last login": stamp(u.lastLogin) }))],
    [`Dues ${YEAR}`, dues],
    ["Payments", (d.payments || []).slice().sort((a, b) => a.submittedAt - b.submittedAt).map((p) => ({ Flat: p.flat, Month: monthName(p.month), "Amount (₹)": p.amount, Payer: p.payer, Mobile: p.phone || "", "UPI ref": p.ref, Submitted: stamp(p.submittedAt), Status: STATUS_LABEL[p.status] || p.status, Decided: stamp(p.decidedAt) }))],
    ["Complaints", (d.tickets || []).slice().sort((a, b) => a.at - b.at).map((t) => ({ Flat: t.flat, "Raised by": t.by || "", Mobile: t.phone || "", Category: t.cat, Title: t.title, Details: t.desc || "", Raised: stamp(t.at), Status: STATUS_LABEL[t.status] || t.status }))],
    ["Notices", (d.notices || []).slice().sort((a, b) => a.at - b.at).map((n) => ({ Date: stamp(n.at), Category: n.cat, Title: n.title, Message: n.body }))],
    ["Visitors", (d.visitors || []).slice().sort((a, b) => a.at - b.at).map((v) => ({ Flat: v.flat, Visitor: v.name, Purpose: v.purpose, "Gate code": v.code, Status: v.status === "arrived" ? "Arrived" : "Expected", Created: stamp(v.at) }))],
    ["Bookings", (d.bookings || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1)).map((b) => ({ Flat: b.flat, Facility: b.fac, Date: b.date, Slot: b.slot, "Booked on": stamp(b.at) }))],
    ["Owners", ALL_FLATS.map((f) => ({ Flat: f, Owner: (d.owners || {})[f]?.name || "", Mobile: (d.owners || {})[f]?.phone || "", "Registered in app": users.filter((u) => u.flat === f).map((u) => u.name).join(", ") }))],
    ["Expenses & income", (d.ledger || []).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.at - b.at)).map((e) => ({ Voucher: e.voucher, Date: e.date, Type: e.kind === "income" ? "Income" : "Expense", Category: e.cat, Description: e.desc || "", "Paid to / received from": e.party || "", Mode: e.mode, "Bill / ref": e.ref || "", "In (₹)": e.kind === "income" ? e.amount : "", "Out (₹)": e.kind === "expense" ? e.amount : "", "Entered": stamp(e.at) }))],
    ["Settings", [{ "UPI ID": d.cfg.upiId, "Monthly maintenance (₹)": d.cfg.monthlyAmount, "Backup taken": stamp(Date.now()) }]],
  ];
}

async function downloadExcelBackup(d) {
  const XLSX = await dynImport(SHEETJS_URL);
  const wb = XLSX.utils.book_new();
  backupSheets(d).forEach(([name, rows]) => {
    const ws = rows.length ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([["(no entries yet)"]]);
    const cols = rows.length ? Object.keys(rows[0]) : ["x"];
    ws["!cols"] = cols.map((c) => ({ wch: Math.min(48, Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length)) + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, `sunshine-homes-backup-${today()}.xlsx`);
}

function downloadJsonBackup(raw) {
  const data = { app: "sunshine-homes", format: 1, exportedAt: new Date().toISOString(), data: raw };
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `sunshine-homes-backup-${today()}.json`);
}

/* ------------------------------ styles ---------------------------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
:root{
  --teal:#0FB5A6; --teal-d:#0A8C80; --teal-bg:#E4F6F4; --coral:#FF6B5C; --coral-d:#E8513F;
  --ink:#16242E; --muted:#6B7A86; --line:#E7EDF0; --bg:#F2F6F7; --card:#FFFFFF;
  --green:#16A34A; --green-bg:#E5F4EA; --amber:#E89B12; --amber-bg:#FCEFD4;
  --red:#E5484D; --red-bg:#FBE7E7; --blue:#2D7FF9; --blue-bg:#E5EEFE; --grey:#CBD5DA;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.wrap{font-family:'Plus Jakarta Sans',sans-serif;color:var(--ink);background:var(--bg);min-height:100%}
.app{max-width:480px;margin:0 auto;min-height:100%;display:flex;flex-direction:column;position:relative;background:var(--bg)}
h1,h2,h3,.disp{font-family:'Sora',sans-serif}
.fade{animation:up .42s cubic-bezier(.2,.7,.2,1) both}
@keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}

/* top bar */
.top{background:linear-gradient(135deg,var(--teal) 0%,var(--teal-d) 100%);color:#fff;padding:18px 18px 20px;
  border-radius:0 0 24px 24px;box-shadow:0 8px 22px -12px rgba(15,140,128,.6)}
.top .brand{display:flex;align-items:center;gap:10px}
.top .logo{width:34px;height:34px;border-radius:10px;background:#fff;display:grid;place-items:center;font-size:19px;flex:none}
.top .bname{font-family:'Sora';font-weight:700;font-size:17px;line-height:1}
.top .bsub{font-size:11px;opacity:.85;margin-top:2px}
.flatchip{margin-left:auto;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);
  color:#fff;font:inherit;font-weight:600;font-size:13px;padding:7px 12px;border-radius:30px;cursor:pointer;display:flex;gap:6px;align-items:center}

.content{flex:1;padding:16px 14px 86px}
.greet{font-family:'Sora';font-size:20px;font-weight:600;margin:4px 4px 2px}
.greet small{display:block;font-family:'Plus Jakarta Sans';font-size:13px;color:var(--muted);font-weight:500;margin-top:3px}

.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px}
.card+.card{margin-top:13px}
.sec-h{font-family:'Sora';font-weight:600;font-size:15px;margin:20px 4px 11px;display:flex;align-items:center;gap:8px}

/* auth */
.auth-hero{text-align:center;margin:14px 0 16px}
.auth-ic{width:66px;height:66px;border-radius:21px;background:var(--teal-bg);display:grid;place-items:center;font-size:31px;margin:0 auto 12px}
.auth-hero .greet{margin:0}
.phone-row{display:flex;gap:8px}
.pw-row{position:relative}
.pw-row .input{padding-right:64px}
.pw-row .linkbtn{position:absolute;right:13px;top:50%;transform:translateY(-50%)}
.demo-note{background:#FFFBEF;border:1px dashed #E8C976;border-radius:12px;padding:9px 12px;margin-top:12px;font-size:12px;color:#5b4a1d}
.cc{flex:none;display:flex;align-items:center;gap:5px;padding:0 12px;border:1.5px solid var(--line);border-radius:12px;background:#F7FAFB;font-weight:700;font-size:15px}
.err{color:var(--red);font-size:12.5px;font-weight:700;margin-top:10px}
.linkbtn{background:none;border:none;color:var(--teal-d);font:inherit;font-weight:700;font-size:13px;cursor:pointer;padding:0}
.linkbtn:disabled{color:var(--muted);cursor:default}
.avatar{width:54px;height:54px;border-radius:17px;background:linear-gradient(135deg,var(--teal),var(--teal-d));color:#fff;display:grid;place-items:center;font-family:'Sora';font-weight:700;font-size:19px;flex:none}
.kv{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--line);font-size:14px;font-weight:600}
.kv:last-child{border-bottom:none;padding-bottom:0}
.kv>span:first-child{color:var(--muted);font-weight:600;font-size:12.5px}
.secure{display:flex;gap:7px;align-items:center;justify-content:center;font-size:11.5px;color:var(--muted);margin-top:16px}

/* dues hero */
.dues-hero{background:linear-gradient(135deg,#1f2b33,#101b22);color:#fff;border:none}
.dues-hero .lab{font-size:12px;opacity:.7;font-weight:500}
.dues-hero .big{font-family:'Sora';font-size:30px;font-weight:700;margin:4px 0 0}
.dues-hero .sub{font-size:12px;opacity:.8;margin-top:4px}

/* tile grid */
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 6px 11px;text-align:center;cursor:pointer;position:relative}
.tile:active{transform:scale(.95)}
.tile .ic{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;font-size:21px;margin:0 auto 7px}
.tile .tl{font-size:11px;font-weight:600;line-height:1.25;color:var(--ink)}
.badge{position:absolute;top:7px;right:9px;background:var(--coral);color:#fff;font-size:10px;font-weight:700;
  min-width:17px;height:17px;border-radius:9px;display:grid;place-items:center;padding:0 4px}

/* generic ui */
.label{font-size:12px;color:var(--muted);font-weight:600;letter-spacing:.02em;margin:0 0 7px}
.input,select.input,textarea.input{width:100%;font-family:inherit;font-size:15px;color:var(--ink);background:#fff;
  border:1.5px solid var(--line);border-radius:12px;padding:12px 13px;outline:none}
.input:focus{border-color:var(--teal)}
.input.lock{background:#F1F5F6;color:#5a6b74;font-weight:600}
textarea.input{resize:vertical;min-height:78px}
.btn{width:100%;font-family:'Plus Jakarta Sans';font-size:15px;font-weight:700;border:none;border-radius:13px;
  padding:14px;cursor:pointer;color:#fff;background:var(--teal);box-shadow:0 8px 16px -8px rgba(15,140,128,.7)}
.btn:active{transform:translateY(1px)}
.btn.coral{background:var(--coral);box-shadow:0 8px 16px -8px rgba(232,81,63,.6)}
.btn.ghost{background:#fff;color:var(--ink);border:1.5px solid var(--line);box-shadow:none}
.btn.sm{padding:9px 13px;font-size:13px;width:auto}
.btn:disabled{opacity:.45}
.row{display:flex;gap:9px}
.back{background:none;border:none;color:var(--teal-d);font:inherit;font-weight:700;font-size:14px;cursor:pointer;padding:4px 0 10px;display:inline-flex;gap:5px;align-items:center}

.pill{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:4px 9px;border-radius:20px}
.p-ok{background:var(--green-bg);color:var(--green)} .p-pend{background:var(--amber-bg);color:var(--amber)}
.p-no{background:#EEF2F4;color:var(--muted)} .p-rej{background:var(--red-bg);color:var(--red)}
.p-blue{background:var(--blue-bg);color:var(--blue)}

.floor-h{font-size:12px;color:var(--muted);font-weight:700;margin:15px 3px 8px;letter-spacing:.03em;text-transform:uppercase}
.flatgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.flat{background:#fff;border:1.5px solid var(--line);border-radius:13px;padding:13px 6px;text-align:center;font-weight:700;font-size:15px;cursor:pointer;position:relative}
.flat:active{transform:scale(.96)}
.flat .dot{width:7px;height:7px;border-radius:50%;position:absolute;top:8px;right:8px}
.flat.on{border-color:var(--teal);background:var(--teal-bg)}

.monthgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
.mchip{border-radius:11px;padding:10px 3px;text-align:center;font-size:12px;font-weight:700;border:1.5px solid var(--line);background:#fff;cursor:pointer}
.mchip small{display:block;font-size:8px;font-weight:700;margin-top:3px;letter-spacing:.03em}
.mchip.ok{background:var(--green-bg);border-color:#CFE9D7;color:var(--green)}
.mchip.pend{background:var(--amber-bg);border-color:#F1DDB2;color:var(--amber)}
.mchip.rej{background:var(--red-bg);border-color:#EFC9C9;color:var(--red)}

.stat{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.statbox{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:13px}
.statbox .n{font-family:'Sora';font-size:22px;font-weight:700;line-height:1}
.statbox .l{font-size:11px;color:var(--muted);margin-top:5px;font-weight:500}

.tabs{display:flex;gap:5px;background:#E7EEF0;padding:4px;border-radius:13px;margin-bottom:13px;overflow-x:auto}
.tab{flex:none;white-space:nowrap;border:none;background:none;font:inherit;font-size:12.5px;font-weight:700;color:var(--muted);padding:8px 11px;border-radius:9px;cursor:pointer}
.tab.on{background:#fff;color:var(--ink);box-shadow:0 2px 7px -3px rgba(0,0,0,.25)}

.listcard{border:1px solid var(--line);border-radius:14px;padding:13px;background:#fff}
.listcard+.listcard{margin-top:10px}
.lc-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.lc-title{font-family:'Sora';font-weight:600;font-size:15px}
.lc-meta{font-size:11.5px;color:var(--muted);margin-top:3px;line-height:1.5}
.lc-body{font-size:13.5px;color:#36454f;margin-top:8px;line-height:1.5}

.matrix-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:13px;background:#fff}
table.mx{border-collapse:collapse;font-size:11px;min-width:100%}
table.mx th,table.mx td{padding:6px 4px;text-align:center;border-bottom:1px solid #F0F4F5;white-space:nowrap}
table.mx th{color:var(--muted);font-weight:700;position:sticky;top:0;background:#F7FAFB}
table.mx td.fc,table.mx th.fc{position:sticky;left:0;background:#F7FAFB;font-weight:700;text-align:left;padding-left:10px;z-index:1}
.cell{width:13px;height:13px;border-radius:4px;display:inline-block}
.c-ok{background:var(--green)} .c-pend{background:var(--amber)} .c-no{background:#DCE3E6} .c-rej{background:var(--red)}

table.mx.ledger-t{font-size:12.5px}
table.mx.ledger-t td,table.mx.ledger-t th{padding:8px 10px;text-align:right}
.seg{display:flex;gap:6px;margin-bottom:12px}
.seg .btn{flex:1;padding:10px 4px}
.mini{font-size:11px;color:var(--muted);margin-top:2px;line-height:1.5}
.row-it{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)}
.amt-in{color:var(--green);font-weight:700;font-family:'Sora';white-space:nowrap}
.amt-out{color:var(--red);font-weight:700;font-family:'Sora';white-space:nowrap}
.sheet-bg{position:fixed;inset:0;background:rgba(10,30,30,.45);display:flex;align-items:flex-end;justify-content:center;z-index:60}
.sheet{width:100%;max-width:480px;background:#fff;border-radius:22px 22px 0 0;padding:20px 18px calc(18px + env(safe-area-inset-bottom))}
.isteps{list-style:none;margin:16px 0;padding:0}
.isteps li{display:flex;gap:11px;align-items:flex-start;font-size:14.5px;font-weight:600;line-height:1.4;padding:7px 0}
.isteps li span{flex:none;width:26px;height:26px;border-radius:50%;background:var(--teal);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700}
.logo img{width:100%;height:100%;border-radius:inherit;display:block}
.bar-row{display:flex;align-items:center;gap:8px;margin:6px 0}
.bar-row .lab{width:30px;font-size:11px;color:var(--muted);font-weight:700}
.bar-track{flex:1;height:16px;background:#EDF2F3;border-radius:6px;overflow:hidden}
.bar-fill{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,var(--teal),var(--teal-d));min-width:2px}
.bar-row .val{width:60px;text-align:right;font-size:11px;font-weight:700}

.keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}
.key{background:#fff;border:1.5px solid var(--line);border-radius:13px;padding:15px;font-size:20px;font-family:'Sora';font-weight:600;cursor:pointer}
.key:active{background:var(--teal-bg)}
.key.fn{font-family:'Plus Jakarta Sans';font-size:13px;color:var(--muted);font-weight:700}
.pindots{display:flex;gap:13px;justify-content:center;margin:16px 0 4px}
.pindot{width:14px;height:14px;border-radius:50%;border:2px solid var(--teal);background:#fff}
.pindot.f{background:var(--teal)}

.passcode{font-family:'Sora';font-weight:700;font-size:30px;letter-spacing:.18em;color:var(--teal-d);text-align:center;
  background:var(--teal-bg);border:1.5px dashed var(--teal);border-radius:14px;padding:16px;margin-top:6px}
.legend{display:flex;flex-wrap:wrap;gap:11px;font-size:11px;color:var(--muted);margin-top:11px}
.legend span{display:inline-flex;align-items:center;gap:5px}
.note{font-size:12px;color:var(--muted);line-height:1.55;margin-top:9px}
.lockrow{display:flex;align-items:center;gap:7px;font-size:11px;color:#5a6b74;background:#F1F5F6;border:1px solid var(--line);padding:7px 10px;border-radius:10px;margin-top:8px}
.empty{text-align:center;color:var(--muted);font-size:13.5px;padding:24px 10px}
.toast{position:fixed;left:50%;bottom:94px;transform:translateX(-50%);background:var(--ink);color:#fff;padding:11px 19px;border-radius:30px;font-size:13.5px;font-weight:600;box-shadow:0 10px 30px -8px rgba(0,0,0,.45);z-index:60;animation:up .3s both;width:max-content;max-width:90%;text-align:center}

/* bottom nav */
.nav{position:sticky;bottom:0;z-index:30;display:flex;background:#fff;border-top:1px solid var(--line);
  padding:8px 4px calc(8px + env(safe-area-inset-bottom));box-shadow:0 -6px 20px -14px rgba(0,0,0,.3)}
.navb{flex:1;border:none;background:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px;position:relative}
.navb .ni{font-size:20px;filter:grayscale(1);opacity:.5}
.navb .nl{font-size:10px;font-weight:700;color:var(--muted)}
.navb.on .ni{filter:none;opacity:1}
.navb.on .nl{color:var(--teal-d)}
.navb .nbadge{position:absolute;top:0;right:18%;background:var(--coral);color:#fff;font-size:9px;font-weight:700;min-width:15px;height:15px;border-radius:8px;display:grid;place-items:center;padding:0 3px}
`;

/* ------------------------------ helpers --------------------------- */
function statusOf(payments, flat, mKey) {
  const p = payments.filter((x) => x.flat === flat && x.month === mKey).sort((a, b) => b.submittedAt - a.submittedAt)[0];
  return p ? p.status : "none";
}
function Pill({ s }) {
  const map = { approved: ["p-ok", "Paid"], pending: ["p-pend", "Pending"], rejected: ["p-rej", "Rejected"],
    open: ["p-rej", "Open"], "in-progress": ["p-pend", "In progress"], resolved: ["p-ok", "Resolved"],
    expected: ["p-blue", "Expected"], booked: ["p-ok", "Booked"] };
  const [cls, lbl] = map[s] || ["p-no", "Unpaid"];
  return <span className={"pill " + cls}>● {lbl}</span>;
}

/* ============================== APP =============================== */
export default function App() {
  const [cfg, setCfg] = useState(DEFAULTS);
  const [payRaw, setPayRaw] = useState([]);          // submissions (residents can write)
  const [approvals, setApprovals] = useState({});    // paymentId → { status, at }   (committee only)
  const [notices, setNotices] = useState([]);
  const [tixRaw, setTixRaw] = useState([]);          // complaints (residents can write)
  const [ticketStatus, setTicketStatusMap] = useState({}); // ticketId → status        (committee only)
  const [visitors, setVisitors] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState({});
  const [ledger, setLedger] = useState([]);           // expenses & other income (committee only)
  const [owners, setOwners] = useState({});           // flat → { name, phone } (committee only)
  const [sheetSync, setSheetSync] = useState(null);   // written by the Google Sheets sync script
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("home");
  const [toast, setToast] = useState("");
  const [loadErr, setLoadErr] = useState(false);
  const [cfgLoaded, setCfgLoaded] = useState(false);  // true once the saved settings have been read

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2200); };
  onSaveError = () => flash("Couldn't save — check your internet connection");

  // Loads all shared data. Returns the users map, or null if the database couldn't be reached.
  const loadShared = async (role) => {
    try {
      const keys = ["config", "payments", "approvals", "notices", "tickets", "ticketStatus", "visitors", "bookings", "users", "ledger", "sheetSync", "owners"];
      const [c, p, ap, n, t, ts, v, b, u, lg, ss, ow] = await Promise.all(keys.map((k) => store.get(k, true, true)));
      if (ow) setOwners(ow);
      if (lg) setLedger(lg);
      if (ss) setSheetSync(ss);
      if (c) { setCfg(withDefaults(c)); setCfgLoaded(true); }
      if (p) setPayRaw(p);
      if (ap) setApprovals(ap);
      if (n) setNotices(n); else if (MODE === "demo" || role === "admin") seedNotices(setNotices);
      if (t) setTixRaw(t);
      if (ts) setTicketStatusMap(ts);
      if (v) setVisitors(v);
      if (b) setBookings(b);
      const us = u || {};
      setUsers(us);
      setLoadErr(false);
      return us;
    } catch (e) {
      setLoadErr(true);
      return null;
    }
  };

  const boot = async () => {
    setLoaded(false);
    const sess = await store.get("session", false);
    const asAdmin = !!(sess && sess.admin);
    let valid = !!(sess && sess.exp > Date.now());
    if (valid && MODE === "online") {
      // the matching Firebase login must still be active on this device
      try { const fu = await firebaseUser(); valid = !!fu && fu.email === (asAdmin ? ADMIN_LOGIN_EMAIL : SOCIETY_LOGIN_EMAIL); }
      catch (e) { valid = false; }
    }
    if (MODE === "demo" || valid) {
      const us = await loadShared(asAdmin ? "admin" : "resident");
      if (valid && us && asAdmin) setUser(ADMIN_USER);
      else if (valid && us && us[sess.phone]) setUser(us[sess.phone]);
      else if (sess && us) store.del("session", false);
    } else if (sess) {
      store.del("session", false);
    }
    setLoaded(true);
  };
  useEffect(() => { boot(); }, []);

  // Firebase mode: keep everything in sync live while signed in
  useEffect(() => {
    if (MODE !== "online" || !user) return;
    const handlers = {
      config: (v) => v && setCfg(withDefaults(v)),
      payments: (v) => v && setPayRaw(v),
      approvals: (v) => v && setApprovals(v),
      notices: (v) => v && setNotices(v),
      tickets: (v) => v && setTixRaw(v),
      ticketStatus: (v) => v && setTicketStatusMap(v),
      visitors: (v) => v && setVisitors(v),
      bookings: (v) => v && setBookings(v),
      users: (v) => { if (!v) return; setUsers(v); if (user.role !== "admin" && !v[user.phone]) signOut(true); },
      ledger: (v) => v && setLedger(v),
      owners: (v) => v && setOwners(v),
      sheetSync: (v) => v && setSheetSync(v),
    };
    let alive = true;
    const unsubs = [];
    Object.entries(handlers).forEach(([k, h]) => {
      remoteWatch(k, h).then((un) => { if (alive) unsubs.push(un); else un(); }).catch(() => {});
    });
    return () => { alive = false; unsubs.forEach((un) => un()); };
  }, [user?.phone]);
  const mk = (setter, key) => (next) => { setter(next); store.set(key, next); };
  const saveCfg = mk(setCfg, "config");
  // Status comes only from the committee's approvals / ticketStatus documents, never from what a resident submitted.
  const payments = payRaw.map((p) => ({ ...p, status: (approvals[p.id] && approvals[p.id].status) || (MODE === "demo" && p.status) || "pending", decidedAt: approvals[p.id] && approvals[p.id].at }));
  const tickets = tixRaw.map((t) => ({ ...t, status: ticketStatus[t.id] || (MODE === "demo" && t.status) || "open" }));
  const savePayments = (next) => { const clean = next.map(({ status, decidedAt, ...p }) => p); setPayRaw(clean); store.set("payments", clean); };
  const saveTickets = (next) => { const clean = next.map(({ status, ...t }) => t); setTixRaw(clean); store.set("tickets", clean); };
  const decide = (entries) => { const next = { ...approvals }; entries.forEach(({ id, status }) => { next[id] = { status, at: Date.now() }; }); setApprovals(next); store.set("approvals", next); };
  const setTicketStatus = (id, status) => { const next = { ...ticketStatus, [id]: status }; setTicketStatusMap(next); store.set("ticketStatus", next); };
  const saveNotices = mk(setNotices, "notices");
  const saveLedger = mk(setLedger, "ledger");
  const saveOwners = mk(setOwners, "owners");
  // New residents need the committee's OK. The decision lives in the committee-only "approvals" document.
  // Until the committee has switched approvals on (cfg.memberApproval), everyone already registered counts as approved.
  const memberStatus = (phone) => {
    const a = approvals[memberKey(phone)];
    if (a && a.status) return a.status;
    // An owner who registers with the number in the owners list, for one of their own flats, is approved at once.
    const u = users[phone];
    if (u && owners[u.flat] && owners[u.flat].phone === phone) return "approved";
    return cfg.memberApproval ? "pending" : "approved";
  };
  const decideMember = (phone, status) => decide([{ id: memberKey(phone), status }]);
  // everything for backups: readable copy (with statuses) and the exact stored data
  const backupData = () => ({
    readable: { cfg, users, payments, tickets, notices, visitors, bookings, ledger, owners },
    raw: { config: cfg, users, payments: payRaw, approvals, notices, tickets: tixRaw, ticketStatus, visitors, bookings, ledger, owners },
  });

  // First committee login after this update: approve everyone already registered, then switch approvals on.
  useEffect(() => {
    if (!user || user.role !== "admin" || !cfgLoaded || cfg.memberApproval !== undefined) return;
    const next = { ...approvals };
    Object.keys(users).forEach((ph) => { if (!next[memberKey(ph)]) next[memberKey(ph)] = { status: "approved", at: Date.now() }; });
    setApprovals(next); store.set("approvals", next);
    saveCfg({ ...cfg, memberApproval: true });
  }, [user?.role, cfgLoaded, cfg.memberApproval]);

  // Maintenance raised to ₹1000 a month (21 Nov 2026, applies to all months). Applied once on the next
  // committee login; after that the committee can change it in Settings as usual.
  useEffect(() => {
    if (!user || user.role !== "admin" || !cfgLoaded || cfg.memberApproval === undefined || cfg.amount1000Applied) return;
    saveCfg({ ...cfg, monthlyAmount: 1000, amount1000Applied: true });
  }, [user?.role, cfgLoaded, cfg.amount1000Applied, cfg.memberApproval]);

  // "Install app" button (Android / desktop Chrome); iPhone users get Share → Add to Home Screen instructions.
  const [installEvt, setInstallEvt] = useState(() => (typeof window !== "undefined" && window.__shInstall) || null);
  const [installHelp, setInstallHelp] = useState(false);
  const [installed, setInstalled] = useState(() => { try { return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; } catch (e) { return false; } });
  useEffect(() => {
    const h = (e) => { e.preventDefault(); window.__shInstall = e; setInstallEvt(e); };
    const ready = () => window.__shInstall && setInstallEvt(window.__shInstall);
    const done = () => { setInstalled(true); setInstallEvt(null); setInstallHelp(false); window.__shInstall = null; flash("Installed ✓ — Sunshine Homes is on your home screen"); };
    window.addEventListener("beforeinstallprompt", h);
    window.addEventListener("sh-installable", ready);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", h); window.removeEventListener("sh-installable", ready); window.removeEventListener("appinstalled", done); };
  }, []);
  // Android / desktop Chrome & Edge: the phone's own "Install app" box opens straight away and puts the icon on
  // the home screen. iPhone and in-app browsers (WhatsApp etc.) don't allow that, so we show simple steps.
  const install = async () => {
    const evt = installEvt || window.__shInstall;
    if (evt) {
      try { evt.prompt(); const r = await evt.userChoice; if (r && r.outcome === "accepted") { setInstalled(true); flash("Installing… the icon will appear on your home screen"); } }
      catch (e) { setInstallHelp(true); }
      setInstallEvt(null); window.__shInstall = null;
      return;
    }
    setInstallHelp(true);
  };
  const saveVisitors = mk(setVisitors, "visitors");
  const saveBookings = mk(setBookings, "bookings");
  const saveUsers = mk(setUsers, "users");

  // called after the password is accepted (and registration done, for new numbers)
  // returns false if the database couldn't be reached
  const signIn = async (u, isNew) => {
    let latest;
    try { latest = (await store.get("users", true, true)) || {}; }
    catch (e) { flash("Couldn't reach the server — please try again"); return false; }
    const me = { ...(latest[u.phone] || u), lastLogin: Date.now() };
    const next = { ...latest, [u.phone]: me };
    setUsers(next);
    await store.set("users", next);
    await store.set("session", { phone: u.phone, exp: Date.now() + SESSION_DAYS * 86400000 }, false);
    if (MODE === "online") await loadShared("resident");
    setUser(me); setTab("home");
    flash(isNew ? "Welcome to Sunshine Homes, " + me.name.split(" ")[0] + "!" : "Logged in");
    return true;
  };
  // committee login (after its password is accepted)
  const signInAdmin = async () => {
    if (!(await loadShared("admin"))) { flash("Couldn't reach the server — please try again"); return false; }
    await store.set("session", { admin: true, exp: Date.now() + SESSION_DAYS * 86400000 }, false);
    setUser(ADMIN_USER); setTab("home");
    flash("Logged in as committee");
    return true;
  };
  const signOut = async (removed) => {
    await store.del("session", false);
    await firebaseSignOut();
    setUser(null); setTab("home");
    flash(removed === true ? "Your account was removed by the committee" : "Logged out");
  };

  const myFlat = user?.flat;
  const isAdmin = user?.role === "admin";
  const myStatus = user && !isAdmin ? memberStatus(user.phone) : "approved";
  const myOpenTix = tickets.filter((t) => t.flat === myFlat && t.status !== "resolved").length;
  const inApp = loaded && user && !isAdmin && myStatus === "approved";   // resident screens
  const waiting = loaded && user && !isAdmin && myStatus !== "approved"; // registered, awaiting committee
  const inAdmin = loaded && user && isAdmin;    // committee screens
  useEffect(() => { if (loaded && user && !isAdmin) clearOwnersImport(); }, [loaded, user?.phone]);
  const showAccounts = cfg.showAccounts !== false;
  const pendingMembers = Object.values(users).filter((u) => memberStatus(u.phone) === "pending").length;

  return (
    <div className="wrap">
      <style>{CSS}</style>
      <div className="app">
        <div className="top">
          <div className="brand">
            <div className="logo"><img src="icon-192.png" alt="" /></div>
            <div>
              <div className="bname">Sunshine Homes</div>
              <div className="bsub">Apartment Community App</div>
            </div>
            {inApp && <button className="flatchip" onClick={() => setTab("profile")}>🏠 {myFlat} ▾</button>}
            {inAdmin && <span className="flatchip" style={{ cursor: "default" }}>🛡️ Committee</span>}
          </div>
        </div>

        <div className="content">
          {!loaded && <div className="empty">Loading your community…</div>}

          {loaded && !user && loadErr && (
            <div className="card fade" style={{ marginTop: 20, textAlign: "center" }}>
              <div style={{ fontSize: 34 }}>📶</div>
              <h3 style={{ margin: "8px 0 4px" }}>Can't reach Sunshine Homes</h3>
              <p className="note" style={{ marginTop: 0 }}>Check your internet connection and try again.</p>
              <button className="btn" style={{ marginTop: 12 }} onClick={boot}>Try again</button>
            </div>
          )}
          {loaded && !user && !loadErr && <Auth flash={flash} onDone={signIn} onAdmin={signInAdmin} />}
          {loaded && !user && !installed && <button className="btn coral" style={{ marginTop: 12 }} onClick={install}>📲 Install app on this phone</button>}

          {waiting && <Waiting user={user} status={myStatus} cfg={cfg} logout={signOut} />}

          {inAdmin && (
            <AdminPanel cfg={cfg} saveCfg={saveCfg} payments={payments} savePayments={savePayments} decide={decide}
              notices={notices} saveNotices={saveNotices} tickets={tickets} setTicketStatus={setTicketStatus}
              users={users} saveUsers={saveUsers} flash={flash} signOut={signOut} backupData={backupData}
              ledger={ledger} saveLedger={saveLedger} memberStatus={memberStatus} decideMember={decideMember}
              pendingMembers={pendingMembers} sheetSync={sheetSync} owners={owners} saveOwners={saveOwners} />
          )}

          {inApp && tab === "home" && (
            <Home user={user} cfg={cfg} payments={payments} notices={notices} tickets={tickets}
              visitors={visitors} go={setTab} showAccounts={showAccounts} installed={installed} install={install} />
          )}
          {inApp && tab === "profile" && <Profile user={user} logout={signOut} />}
          {inApp && tab === "dues" && (
            <Dues flat={myFlat} user={user} cfg={cfg} payments={payments} save={savePayments} flash={flash} />
          )}
          {inApp && tab === "notices" && <Notices notices={notices} />}
          {inApp && tab === "help" && (
            <Helpdesk flat={myFlat} user={user} tickets={tickets} save={saveTickets} flash={flash} />
          )}
          {inApp && tab === "visitors" && (
            <Visitors flat={myFlat} visitors={visitors} save={saveVisitors} flash={flash} />
          )}
          {inApp && tab === "amenities" && (
            <Amenities flat={myFlat} bookings={bookings} save={saveBookings} flash={flash} facilities={cfg.facilities || []} />
          )}
          {inApp && tab === "directory" && <Directory contacts={cfg.contacts || DEFAULT_CONTACTS} />}
          {inApp && tab === "accounts" && showAccounts && <SocietyAccounts payments={payments} ledger={ledger} cfg={cfg} />}
        </div>

        {inApp && (
          <div className="nav">
            {[["home", "🏠", "Home"], ["dues", "💳", "Dues"], ["notices", "📢", "Notices"],
              ["help", "🛠️", "Helpdesk", myOpenTix], ["profile", "👤", "Profile"]].map(([id, ic, lb, bd]) => (
              <button key={id} className={"navb" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>
                {bd > 0 && <span className="nbadge">{bd}</span>}
                <span className="ni">{ic}</span><span className="nl">{lb}</span>
              </button>
            ))}
          </div>
        )}

        {installHelp && <InstallHelp onClose={() => setInstallHelp(false)} />}
        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  );
}

function seedNotices(setNotices) {
  const base = [
    { id: uid(), cat: "Notice", title: "Water tank cleaning — Sat 9 AM", body: "Annual overhead & underground tank cleaning this Saturday from 9 AM to 1 PM. Water supply will be paused during this window. Please store enough water.", at: Date.now() - 86400000 * 2 },
    { id: uid(), cat: "Event", title: "Community Diwali get-together", body: "Join your neighbours for snacks, music and rangoli in the clubhouse. Families welcome!", at: Date.now() - 86400000 * 5 },
  ];
  setNotices(base); store.set("notices", base);
}

/* ---------------------- AUTH (MOBILE + PASSWORD) ------------------- */
function Auth({ flash, onDone, onAdmin }) {
  const [who, setWho] = useState("resident"); // resident | admin
  const [step, setStep] = useState("login"); // login → (register | retry)
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [name, setName] = useState("");
  const [flat, setFlat] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [ownFlats, setOwnFlats] = useState([]);   // flats the owners list gives for this mobile

  const validPhone = /^[6-9]\d{9}$/.test(phone);

  const login = async () => {
    if (who === "resident" && !validPhone) return setErr("Enter a valid 10-digit mobile number.");
    if (!pw) return setErr("Enter the password.");
    setBusy(true); setErr("");
    const r = await checkPassword(pw, who);
    if (r.error) { setBusy(false); return setErr(r.error); }
    setPw("");
    if (who === "admin") { const ok = await onAdmin(); if (ok === false) setBusy(false); return; }
    await lookup();
  };
  const switchWho = (w) => { setWho(w); setErr(""); setPw(""); setShowPw(false); };

  // after the password is accepted: existing resident → straight in, new number → register
  const lookup = async () => {
    setBusy(true); setErr("");
    let users;
    try { users = (await store.get("users", true, true)) || {}; }
    catch (e) {
      setBusy(false); setStep("retry");
      return setErr("Couldn't reach the server. Check your internet and tap Try again.");
    }
    if (users[phone]) {
      const ok = await onDone(users[phone], false);
      if (ok === false) { setBusy(false); setStep("retry"); }
    } else {
      // Known owner? Fill in their name and flat from the committee's owners list.
      let owners = {};
      try { owners = (await store.get("owners", true, false)) || {}; } catch (e) {}
      const mine = flatsOfPhone(owners, phone);
      setOwnFlats(mine);
      if (mine.length) { setName(owners[mine[0]].name); setFlat(mine[0]); setRole("Owner"); }
      setBusy(false); setStep("register");
    }
  };

  const register = async () => {
    if (name.trim().length < 2) return setErr("Enter your full name.");
    if (!flat) return setErr("Select your flat.");
    setErr(""); setBusy(true);
    const ok = await onDone({ phone, name: name.trim(), flat, role, createdAt: Date.now() }, true);
    if (ok === false) { setBusy(false); setErr("Couldn't reach the server. Please try again."); }
  };

  const head = {
    login: who === "admin"
      ? ["🛡️", "Committee login", "For the management committee only — enter the committee password."]
      : ["🔐", "Login or Register", "Enter your mobile number and the Sunshine Homes password."],
    register: ["📝", "Complete registration", ownFlats.length ? "We found you in the owners list — check and continue." : "Tell us who you are and which flat you live in."],
    retry: ["📶", "Almost there", "Password accepted ✓"],
  }[step];

  return (
    <div className="fade" key={step}>
      <div className="auth-hero">
        <div className="auth-ic">{head[0]}</div>
        <div className="greet">{head[1]}<small>{head[2]}</small></div>
      </div>

      {step === "login" && (
        <div className="tabs" role="tablist" style={{ marginBottom: 12 }}>
          <button type="button" role="tab" className={"tab" + (who === "resident" ? " on" : "")} style={{ flex: 1 }} onClick={() => switchWho("resident")}>🏠 Resident</button>
          <button type="button" role="tab" className={"tab" + (who === "admin" ? " on" : "")} style={{ flex: 1 }} onClick={() => switchWho("admin")}>🛡️ Committee</button>
        </div>
      )}

      {step === "login" && (
        <form className="card" onSubmit={(e) => { e.preventDefault(); if (!busy) login(); }}>
          {who === "resident" && (<>
          <p className="label">Mobile number</p>
          <div className="phone-row">
            <span className="cc">🇮🇳 +91</span>
            <input className="input" type="tel" inputMode="numeric" autoComplete="username" maxLength={10}
              value={phone} placeholder="98765 43210" autoFocus name="mobile"
              onChange={(e) => { setErr(""); setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); }} />
          </div>
          </>)}
          {who === "admin" && <input type="hidden" name="username" autoComplete="username" value="committee" readOnly />}
          <p className="label" style={{ marginTop: who === "resident" ? 13 : 0 }}>{who === "admin" ? "Committee password" : "Password"}</p>
          <div className="pw-row">
            <input className="input" type={showPw ? "text" : "password"} autoComplete="current-password" name="password"
              value={pw} placeholder={who === "admin" ? "Committee password" : "Society password"} autoFocus={who === "admin"}
              onChange={(e) => { setErr(""); setPw(e.target.value); }} />
            <button type="button" className="linkbtn" onClick={() => setShowPw((v) => !v)}>{showPw ? "Hide" : "Show"}</button>
          </div>
          {err && <div className="err">{err}</div>}
          <button type="submit" className="btn" style={{ marginTop: 15 }} disabled={busy || (who === "resident" && !validPhone) || !pw}>
            {busy ? "Checking…" : who === "admin" ? "Login as committee" : "Login"}
          </button>
          {who === "resident"
            ? <p className="note">New to the app? Enter your number and the password shared by the committee — you'll then be asked for your name and flat. Existing residents go straight in.</p>
            : <p className="note">The committee login opens the admin panel: payment approvals, accounts, reports, notices, complaints, residents and settings.</p>}
          {MODE === "demo" && <div className="demo-note"><b>Demo mode:</b> any password with 4 or more characters works.</div>}
        </form>
      )}

      {step === "retry" && (
        <div className="card">
          {err && <div className="err" style={{ marginTop: 0 }}>{err}</div>}
          <button className="btn" style={{ marginTop: 14 }} disabled={busy} onClick={lookup}>
            {busy ? "Connecting…" : "Try again"}
          </button>
        </div>
      )}

      {step === "register" && (
        <div className="card">
          <p className="label">Mobile number</p>
          <div className="input lock">{fmtPhone(phone)}</div>
          <p className="label" style={{ marginTop: 13 }}>Full name</p>
          <input className="input" value={name} autoFocus placeholder="e.g. Priya Sharma"
            onChange={(e) => { setErr(""); setName(e.target.value); }} />
          {ownFlats.length > 0 && <div className="lockrow" style={{ marginTop: 10 }}>✓ Owner of {ownFlats.join(", ")} — you'll go straight in.</div>}
          <p className="label" style={{ marginTop: 13 }}>Your flat</p>
          <select className="input" value={flat} onChange={(e) => { setErr(""); setFlat(e.target.value); }}>
            <option value="">Select flat…</option>
            {FLOORS.map((fl) => <optgroup key={fl.name} label={fl.name}>{fl.flats.map((f) => <option key={f} value={f}>{f}</option>)}</optgroup>)}
          </select>
          <p className="label" style={{ marginTop: 13 }}>I am the</p>
          <div className="row">
            {ROLES.map((r) => (
              <button key={r} className={"btn sm " + (role === r ? "" : "ghost")} style={{ flex: 1, padding: "10px 4px" }}
                onClick={() => setRole(r)}>{r}</button>
            ))}
          </div>
          {err && <div className="err">{err}</div>}
          <button className="btn" style={{ marginTop: 16 }} disabled={busy} onClick={register}>
            {busy ? "Creating account…" : "Register & enter app"}
          </button>
        </div>
      )}

      <div className="secure">🔒 Your number is used only for login and society communication.</div>
    </div>
  );
}

/* ------------------------- INSTALL STEPS -------------------------- */
function InstallHelp({ onClose }) {
  const ua = navigator.userAgent || "";
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const inApp = /WhatsApp|FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|; wv\)/i.test(ua);
  const link = "https://raghuslogiclab.com/apps/sunshine-homes/";
  const copy = () => { try { navigator.clipboard.writeText(link); } catch (e) {} };
  let title, steps;
  if (inApp && ios) {
    title = "Open in Safari first";
    steps = ["Tap the ••• or Share button in this window", "Choose “Open in Safari”", "In Safari tap Share ⬆ → “Add to Home Screen” → Add"];
  } else if (inApp) {
    title = "Open in Chrome first";
    steps = ["Tap ⋮ (top right) in this window", "Choose “Open in Chrome” (or “Open in browser”)", "In Chrome tap “Install the app” — it goes on your home screen"];
  } else if (ios) {
    title = "Add to your iPhone home screen";
    steps = ["Tap the Share button ⬆ (bottom of Safari, or top right in Chrome)", "Scroll down and tap “Add to Home Screen”", "Tap “Add” — the Sunshine Homes icon appears on your home screen"];
  } else {
    title = "Add to your home screen";
    steps = ["Tap ⋮ (top right of Chrome)", "Tap “Install app” or “Add to Home screen”", "Tap “Install” — the Sunshine Homes icon appears on your home screen"];
  }
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet fade" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="icon-192.png" alt="" width="52" height="52" style={{ borderRadius: 14 }} />
          <div><div className="lc-title" style={{ fontSize: 17 }}>{title}</div><div className="mini">Opens like an app — no app store needed.</div></div>
        </div>
        <ol className="isteps">{steps.map((t, i) => <li key={i}><span>{i + 1}</span>{t}</li>)}</ol>
        {inApp && <button className="btn ghost sm" style={{ width: "100%", marginBottom: 9 }} onClick={copy}>Copy app link</button>}
        <button className="btn" onClick={onClose}>OK, got it</button>
      </div>
    </div>
  );
}

/* ------------------------- WAITING FOR OK ------------------------- */
function Waiting({ user, status, cfg, logout }) {
  const rejected = status === "rejected";
  const contacts = (cfg.contacts || []).filter((c) => c.phone && /committee/i.test(c.name));
  return (
    <div className="fade">
      <div className="auth-hero">
        <div className="auth-ic">{rejected ? "⛔" : "⏳"}</div>
        <div className="greet">{rejected ? "Registration not approved" : "Waiting for committee approval"}
          <small>{rejected ? "The committee couldn't confirm this registration." : "Thanks, " + user.name.split(" ")[0] + "! The committee will check your details and approve you shortly."}</small></div>
      </div>
      <div className="card">
        <div className="kv"><span>Name</span><span>{user.name}</span></div>
        <div className="kv"><span>Flat</span><span>{user.flat}</span></div>
        <div className="kv"><span>Mobile</span><span>{fmtPhone(user.phone)}</span></div>
        <div className="kv"><span>I am the</span><span>{user.role}</span></div>
        <p className="note">{rejected
          ? "If this is a mistake, please speak to the committee. They can remove this registration so you can register again with the right flat."
          : "This page opens the app by itself as soon as you're approved — you can close it and come back later."}</p>
      </div>
      {contacts.length > 0 && (
        <div className="card">
          <p className="label">Contact the committee</p>
          {contacts.map((c) => <div key={c.name} className="kv"><span>{c.name.replace(/^Committee\s*—\s*/, "")}</span><a href={"tel:" + c.phone.replace(/\s/g, "")}>📞 {c.phone}</a></div>)}
        </div>
      )}
      <button className="btn ghost" style={{ marginTop: 14, color: "var(--red)" }} onClick={logout}>Log out</button>
    </div>
  );
}

/* ----------------------------- PROFILE ---------------------------- */
function Profile({ user, logout }) {
  return (
    <div className="fade">
      <div className="greet">My Profile<small>Signed in with your mobile number and the society password.</small></div>
      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 8 }}>
          <div className="avatar">{initials(user.name)}</div>
          <div><div className="lc-title" style={{ fontSize: 17 }}>{user.name}</div>
            <div className="lc-meta">{user.role} · Flat {user.flat}</div></div>
        </div>
        <div className="kv"><span>Mobile</span><span>{fmtPhone(user.phone)}</span></div>
        <div className="kv"><span>Flat</span><span>{user.flat}</span></div>
        <div className="kv"><span>Member since</span><span>{new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>
      </div>
      <p className="note" style={{ margin: "11px 4px 0" }}>Moved flats or changed number? Ask the management committee to remove this account, then register again.</p>
      <button className="btn ghost" style={{ marginTop: 14, color: "var(--red)" }} onClick={logout}>Log out</button>
    </div>
  );
}

/* ------------------------------ HOME ------------------------------ */
function Home({ user, cfg, payments, notices, tickets, visitors, go, showAccounts, installed, install }) {
  const myFlat = user.flat;
  const owed = MONTHS.reduce((s, _, i) => (i > NOW_MONTH ? s : statusOf(payments, myFlat, monthKey(i)) === "approved" ? s : s + cfg.monthlyAmount), 0);
  const myTix = tickets.filter((t) => t.flat === myFlat && t.status !== "resolved").length;
  const myVis = visitors.filter((v) => v.flat === myFlat && v.status === "expected").length;
  const latest = [...notices].sort((a, b) => b.at - a.at)[0];

  const tiles = [
    ["dues", "💳", "My Dues", "var(--teal-bg)", owed > 0 ? "₹" : 0],
    ["notices", "📢", "Notices", "var(--amber-bg)", 0],
    ["help", "🛠️", "Helpdesk", "var(--blue-bg)", myTix],
    ["visitors", "🚪", "Visitors", "var(--red-bg)", myVis],
    ...((cfg.facilities || []).length ? [["amenities", "🏊", "Amenities", "var(--green-bg)", 0]] : []),
    ["directory", "📇", "Contacts", "var(--teal-bg)", 0],
    ...(showAccounts ? [["accounts", "📒", "Accounts", "var(--amber-bg)", 0]] : []),
    ["profile", "👤", "Profile", "#EEF2F4", 0],
  ];

  return (
    <div className="fade">
      <div className="greet">Hello, {user.name.split(" ")[0]} 👋<small>Flat {myFlat} · Welcome to your Sunshine Homes community.</small></div>

      <div className="card dues-hero" style={{ marginTop: 12 }} onClick={() => go("dues")}>
        <div className="lab">Maintenance outstanding · {YEAR}</div>
        <div className="big">{inr(owed)}</div>
        <div className="sub">{owed > 0 ? "Tap to pay via UPI →" : "You're all paid up ✓"}</div>
      </div>

      <div className="sec-h">⚡ Quick access</div>
      <div className="tiles">
        {tiles.map(([t, ic, lb, bg, bd], idx) => (
          <div key={idx} className="tile" onClick={() => go(t)}>
            {bd ? <span className="badge">{bd === "₹" ? "!" : bd}</span> : null}
            <div className="ic" style={{ background: bg }}>{ic}</div>
            <div className="tl">{lb}</div>
          </div>
        ))}
      </div>

      {latest && (
        <>
          <div className="sec-h">📢 Latest notice</div>
          <div className="card" onClick={() => go("notices")}>
            <div className="lc-top"><div className="lc-title">{latest.title}</div><span className="pill p-blue">{latest.cat}</span></div>
            <div className="lc-meta">{fmtDate(latest.at)}</div>
            <div className="lc-body">{latest.body.length > 110 ? latest.body.slice(0, 110) + "…" : latest.body}</div>
          </div>
        </>
      )}
      {!installed && <button className="btn coral" style={{ marginTop: 14 }} onClick={install}>📲 Install app on this phone</button>}
    </div>
  );
}

/* ------------------------------ DUES ------------------------------ */
function Dues({ flat, user, cfg, payments, save, flash }) {
  const [paying, setPaying] = useState(false);
  if (paying) return <PayForm flat={flat} user={user} cfg={cfg} payments={payments} save={save} flash={flash} done={() => setPaying(false)} />;

  const mine = payments.filter((p) => p.flat === flat).sort((a, b) => b.submittedAt - a.submittedAt);
  const paidMonths = MONTHS.filter((_, i) => statusOf(payments, flat, monthKey(i)) === "approved").length;
  const owed = MONTHS.reduce((s, _, i) => (i > NOW_MONTH ? s : statusOf(payments, flat, monthKey(i)) === "approved" ? s : s + cfg.monthlyAmount), 0);

  return (
    <div className="fade">
      <div className="greet">My Dues<small>Flat {flat} · monthly maintenance {inr(cfg.monthlyAmount)}</small></div>
      <div className="card dues-hero" style={{ marginTop: 12 }}>
        <div className="lab">Outstanding</div>
        <div className="big" style={{ color: owed ? "#FF8A7E" : "#7DE0C8" }}>{inr(owed)}</div>
        <div className="sub">{paidMonths}/12 months cleared this year</div>
        <button className="btn coral" style={{ marginTop: 14 }} onClick={() => setPaying(true)}>Pay via UPI</button>
      </div>

      <div className="card">
        <p className="label">{YEAR} payment status</p>
        <div className="monthgrid">
          {MONTHS.map((m, i) => {
            const s = statusOf(payments, flat, monthKey(i));
            const cls = s === "approved" ? "ok" : s === "pending" ? "pend" : s === "rejected" ? "rej" : "";
            const lbl = s === "approved" ? "PAID" : s === "pending" ? "PENDING" : s === "rejected" ? "REJECT" : i > NOW_MONTH ? "—" : "DUE";
            return <div key={m} className={"mchip " + cls} style={{ cursor: "default" }}>{m}<small>{lbl}</small></div>;
          })}
        </div>
      </div>

      <div className="card">
        <p className="label">Payment history</p>
        {mine.length === 0 && <div className="empty">No payments yet.</div>}
        {mine.map((p) => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{monthName(p.month)} · {inr(p.amount)}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Ref {p.ref || "—"} · {fmtDate(p.submittedAt)}</div>
            </div>
            <Pill s={p.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PayForm({ flat, user, cfg, payments, save, flash, done }) {
  const open = MONTHS.map((m, i) => ({ m, i, key: monthKey(i) })).filter((x) => x.i <= NOW_MONTH && !["approved", "pending"].includes(statusOf(payments, flat, x.key)));
  const [month, setMonth] = useState(open[0]?.key || monthKey(NOW_MONTH));
  const [amount, setAmount] = useState(String(cfg.monthlyAmount));
  const [name, setName] = useState(user?.name || "");
  const [ref, setRef] = useState("");
  const copy = () => { try { navigator.clipboard.writeText(cfg.upiId); flash("UPI ID copied"); } catch (e) { flash(cfg.upiId); } };
  const link = `upi://pay?pa=${encodeURIComponent(cfg.upiId)}&pn=${encodeURIComponent("Sunshine Homes")}&am=${amount}&cu=INR&tn=${encodeURIComponent("Maint " + flat + " " + month)}`;
  const submit = () => {
    if (!name.trim()) return flash("Enter your name");
    if (!ref.trim()) return flash("Enter UPI reference no.");
    if (!amount || +amount <= 0) return flash("Enter a valid amount");
    save([...payments, { id: uid(), flat, month, amount: +amount, payer: name.trim(), phone: user?.phone, ref: ref.trim(), status: "pending", submittedAt: Date.now() }]);
    flash("Submitted — awaiting admin approval"); done();
  };
  return (
    <div className="fade">
      <button className="back" onClick={done}>‹ Back to dues</button>
      <div className="card">
        <p className="label">Pay to (UPI ID)</p>
        <input className="input lock" value={cfg.upiId} readOnly />
        <div className="lockrow">🔒 UPI ID is set by management and can't be changed by residents.</div>
        <div className="row" style={{ marginTop: 11 }}>
          <button className="btn ghost sm" style={{ flex: 1 }} onClick={copy}>Copy UPI ID</button>
          <a href={link} style={{ flex: 1, textDecoration: "none" }}><button className="btn sm" style={{ width: "100%" }}>Open UPI app</button></a>
        </div>
        <p className="note">Pay with any UPI app, then enter the transaction reference below for the admin to verify & approve.</p>
      </div>
      <div className="card">
        <p className="label">For month</p>
        <select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
          {open.length === 0 && <option value={monthKey(NOW_MONTH)}>No dues — all paid ✓</option>}
          {open.map((x) => <option key={x.key} value={x.key}>{x.m} {YEAR}</option>)}
        </select>
        <p className="label" style={{ marginTop: 13 }}>Amount</p>
        <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <p className="label" style={{ marginTop: 13 }}>Your name</p>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Resident name" />
        <p className="label" style={{ marginTop: 13 }}>UPI reference / txn no.</p>
        <input className="input" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. 4193XXXXXX21" />
        <button className="btn" style={{ marginTop: 16 }} onClick={submit} disabled={open.length === 0}>Submit payment</button>
      </div>
    </div>
  );
}

/* ----------------------------- NOTICES ---------------------------- */
function Notices({ notices }) {
  const list = [...notices].sort((a, b) => b.at - a.at);
  return (
    <div className="fade">
      <div className="greet">Notice Board<small>Announcements & events from your management committee.</small></div>
      <div style={{ marginTop: 12 }}>
        {list.length === 0 && <div className="empty">No notices yet.</div>}
        {list.map((n) => (
          <div key={n.id} className="listcard">
            <div className="lc-top"><div className="lc-title">{n.title}</div><span className="pill p-blue">{n.cat}</span></div>
            <div className="lc-meta">{fmtDate(n.at)}</div>
            <div className="lc-body">{n.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------- HELPDESK ---------------------------- */
function Helpdesk({ flat, user, tickets, save, flash }) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState("Plumbing");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const mine = tickets.filter((t) => t.flat === flat).sort((a, b) => b.at - a.at);
  const submit = () => {
    if (!title.trim()) return flash("Add a short title");
    save([...tickets, { id: uid(), flat, by: user?.name, phone: user?.phone, cat, title: title.trim(), desc: desc.trim(), status: "open", at: Date.now() }]);
    flash("Complaint raised"); setTitle(""); setDesc(""); setOpen(false);
  };
  return (
    <div className="fade">
      <div className="greet">Helpdesk<small>Raise & track complaints for flat {flat}.</small></div>
      {!open && <button className="btn" style={{ marginTop: 12 }} onClick={() => setOpen(true)}>+ Raise a complaint</button>}
      {open && (
        <div className="card" style={{ marginTop: 12 }}>
          <p className="label">Category</p>
          <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
            {["Plumbing", "Electrical", "Lift", "Housekeeping", "Security", "Parking", "Other"].map((c) => <option key={c}>{c}</option>)}
          </select>
          <p className="label" style={{ marginTop: 13 }}>Title</p>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Leaking tap in kitchen" />
          <p className="label" style={{ marginTop: 13 }}>Details</p>
          <textarea className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe the issue…" />
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn sm" style={{ flex: 1 }} onClick={submit}>Submit</button>
          </div>
        </div>
      )}
      <div style={{ marginTop: 13 }}>
        {mine.length === 0 && <div className="empty">No complaints yet.</div>}
        {mine.map((t) => (
          <div key={t.id} className="listcard">
            <div className="lc-top"><div className="lc-title">{t.title}</div><Pill s={t.status} /></div>
            <div className="lc-meta">{t.cat} · {fmtDate(t.at)}{t.by ? " · by " + t.by : ""}</div>
            {t.desc && <div className="lc-body">{t.desc}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------- VISITORS ---------------------------- */
function Visitors({ flat, visitors, save, flash }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("Guest");
  const mine = visitors.filter((v) => v.flat === flat).sort((a, b) => b.at - a.at);
  const add = () => {
    if (!name.trim()) return flash("Enter visitor name");
    const code = code4();
    save([...visitors, { id: uid(), flat, name: name.trim(), purpose, code, status: "expected", at: Date.now() }]);
    flash("Gate pass created: " + code); setName(""); setOpen(false);
  };
  const arrived = (id) => save(visitors.map((v) => (v.id === id ? { ...v, status: "arrived" } : v)));
  return (
    <div className="fade">
      <div className="greet">Gatekeeper<small>Pre-approve guests & share a gate pass code.</small></div>
      {!open && <button className="btn coral" style={{ marginTop: 12 }} onClick={() => setOpen(true)}>+ Pre-approve a visitor</button>}
      {open && (
        <div className="card" style={{ marginTop: 12 }}>
          <p className="label">Visitor name</p>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh (Plumber)" />
          <p className="label" style={{ marginTop: 13 }}>Purpose</p>
          <select className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            {["Guest", "Delivery", "Cab", "Service / Repair", "Domestic help", "Other"].map((c) => <option key={c}>{c}</option>)}
          </select>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn coral sm" style={{ flex: 1 }} onClick={add}>Create pass</button>
          </div>
        </div>
      )}
      <div style={{ marginTop: 13 }}>
        {mine.length === 0 && <div className="empty">No visitors pre-approved.</div>}
        {mine.map((v) => (
          <div key={v.id} className="listcard">
            <div className="lc-top"><div className="lc-title">{v.name}</div>
              <span className={"pill " + (v.status === "arrived" ? "p-ok" : "p-blue")}>● {v.status === "arrived" ? "Arrived" : "Expected"}</span></div>
            <div className="lc-meta">{v.purpose} · {fmtDate(v.at)}</div>
            <div className="passcode">{v.code}</div>
            {v.status !== "arrived" && <button className="btn ghost sm" style={{ width: "100%", marginTop: 10 }} onClick={() => arrived(v.id)}>Mark as arrived</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------- AMENITIES ---------------------------- */
function Amenities({ flat, bookings, save, flash, facilities }) {
  const today = ymd(Date.now());
  const FACILITIES = facilities.length ? facilities : ["—"];
  const [fac, setFac] = useState(FACILITIES[0]);
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState(SLOTS[0]);
  const taken = (f, d, s) => bookings.some((b) => b.fac === f && b.date === d && b.slot === s);
  const book = () => {
    if (!date) return flash("Pick a date");
    if (taken(fac, date, slot)) return flash("That slot is already booked");
    save([...bookings, { id: uid(), flat, fac, date, slot, at: Date.now() }]);
    flash(fac + " booked");
  };
  const mine = bookings.filter((b) => b.flat === flat).sort((a, b) => (a.date < b.date ? 1 : -1));
  const cancel = (id) => save(bookings.filter((b) => b.id !== id));
  return (
    <div className="fade">
      <div className="greet">Amenities<small>Book common facilities for your flat.</small></div>
      <div className="card" style={{ marginTop: 12 }}>
        <p className="label">Facility</p>
        <select className="input" value={fac} onChange={(e) => setFac(e.target.value)}>{FACILITIES.map((f) => <option key={f}>{f}</option>)}</select>
        <p className="label" style={{ marginTop: 13 }}>Date</p>
        <input className="input" type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
        <p className="label" style={{ marginTop: 13 }}>Slot</p>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {SLOTS.map((s) => (
            <button key={s} className={"btn sm " + (slot === s ? "" : "ghost")} style={{ flex: "1 1 30%", opacity: taken(fac, date, s) ? .4 : 1 }}
              disabled={taken(fac, date, s)} onClick={() => setSlot(s)}>{s.split(" ")[0]}</button>
          ))}
        </div>
        <button className="btn" style={{ marginTop: 14 }} onClick={book}>Book {fac}</button>
      </div>
      <div className="card">
        <p className="label">My bookings</p>
        {mine.length === 0 && <div className="empty">No bookings yet.</div>}
        {mine.map((b) => (
          <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
            <div><div style={{ fontWeight: 700, fontSize: 14 }}>{b.fac}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{new Date(b.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {b.slot}</div></div>
            <button className="btn ghost sm" style={{ color: "var(--red)" }} onClick={() => cancel(b.id)}>Cancel</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------- DIRECTORY --------------------------- */
function Directory({ contacts }) {
  const list = contacts.filter((c) => c.name);
  return (
    <div className="fade">
      <div className="greet">Contacts<small>Committee, security & emergency numbers. Tap to call.</small></div>
      <div style={{ marginTop: 12 }}>
        {list.map((c) => (
          <div key={c.name} className="listcard">
            <div className="lc-top"><div className="lc-title">{c.name}</div>
              {c.phone ? <a className="pill p-ok" style={{ textDecoration: "none" }} href={"tel:" + c.phone.replace(/\s/g, "")}>📞 {c.phone}</a> : <span className="pill p-no">Not added yet</span>}</div>
            {c.detail && <div className="lc-meta">{c.detail}</div>}
          </div>
        ))}
      </div>
      <div className="sec-h">🏢 Flats by floor</div>
      {FLOORS.map((fl) => (
        <div key={fl.name}><div className="floor-h">{fl.name}</div>
          <div className="flatgrid">{fl.flats.map((f) => <div key={f} className="flat" style={{ cursor: "default" }}>{f}</div>)}</div></div>
      ))}
    </div>
  );
}

/* ------------------------ SOCIETY ACCOUNTS ------------------------ */
// What residents see: money in, money out and the balance — no personal details.
function SocietyAccounts({ payments, ledger, cfg }) {
  const [year, setYear] = useState(YEAR);
  const years = [...new Set([YEAR, ...ledger.map((e) => +e.date.slice(0, 4)), ...payments.map((p) => +p.month.slice(0, 4))])].filter(Boolean).sort((a, b) => b - a);
  const t = accountTotals(payments, ledger, cfg, year);
  const rows = MONTHS.map((m, i) => {
    const k = `${year}-${pad2(i + 1)}`;
    const maint = payments.filter((p) => p.status === "approved" && p.month === k).reduce((s, p) => s + (+p.amount || 0), 0);
    const inc = ledger.filter((e) => e.kind === "income" && e.date.slice(0, 7) === k).reduce((s, e) => s + (+e.amount || 0), 0);
    const out = ledger.filter((e) => e.kind === "expense" && e.date.slice(0, 7) === k).reduce((s, e) => s + (+e.amount || 0), 0);
    return { m, maint, inc, out };
  });
  const byCat = {};
  ledger.filter((e) => e.kind === "expense" && e.date.slice(0, 4) === String(year)).forEach((e) => { byCat[e.cat] = (byCat[e.cat] || 0) + (+e.amount || 0); });
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const maxC = Math.max(1, ...cats.map((c) => c[1]));
  const recent = ledger.filter((e) => e.kind === "expense").sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.at - a.at)).slice(0, 15);
  return (
    <div className="fade">
      <div className="greet">Society Accounts<small>Maintenance collected, other income and every expense recorded by the committee.</small></div>
      {years.length > 1 && <select className="input" style={{ marginTop: 12 }} value={year} onChange={(e) => setYear(+e.target.value)}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>}
      <div className="card dues-hero" style={{ marginTop: 12 }}>
        <div className="lab">Balance in hand</div>
        <div className="big" style={{ color: t.balance < 0 ? "#FF8A7E" : "#7DE0C8" }}>{t.balance < 0 ? "−" : ""}{inr(Math.abs(t.balance))}</div>
        <div className="sub">{cfg.openingDate ? "Since " + fmtDay(cfg.openingDate) + " (opening " + inr(cfg.openingBalance) + ")" : "All recorded entries"}</div>
      </div>
      <div className="stat">
        <div className="statbox"><div className="n">{inr(t.maint)}</div><div className="l">Maintenance {year}</div></div>
        <div className="statbox"><div className="n">{inr(t.income)}</div><div className="l">Other income {year}</div></div>
        <div className="statbox"><div className="n">{inr(t.spent)}</div><div className="l">Expenses {year}</div></div>
        <div className="statbox"><div className="n" style={{ color: t.maint + t.income - t.spent < 0 ? "var(--red)" : undefined }}>{inr(t.maint + t.income - t.spent)}</div><div className="l">Surplus {year}</div></div>
      </div>
      <div className="card" style={{ marginTop: 13 }}>
        <p className="label">Month by month · {year}</p>
        <div className="matrix-wrap">
          <table className="mx ledger-t">
            <thead><tr><th className="fc">Month</th><th>In</th><th>Out</th><th>Net</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.m}><td className="fc">{r.m}</td><td>{inr(r.maint + r.inc)}</td><td>{inr(r.out)}</td>
                <td style={{ color: r.maint + r.inc - r.out < 0 ? "var(--red)" : "var(--green)", fontWeight: 700 }}>{inr(r.maint + r.inc - r.out)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <p className="label">Where the money went · {year}</p>
        {cats.length === 0 && <div className="empty">No expenses recorded yet.</div>}
        {cats.map(([c, v]) => (
          <div className="bar-row" key={c}><span className="lab" style={{ width: 120 }}>{c}</span>
            <span className="bar-track"><span className="bar-fill" style={{ width: (v / maxC) * 100 + "%", background: "var(--coral)" }} /></span>
            <span className="val">{inr(v)}</span></div>
        ))}
      </div>
      <div className="card">
        <p className="label">Latest expenses</p>
        {recent.length === 0 && <div className="empty">Nothing yet.</div>}
        {recent.map((e) => (
          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
            <div><div style={{ fontWeight: 700, fontSize: 13.5 }}>{e.cat}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{fmtDay(e.date)} · {e.voucher}{e.desc ? " · " + e.desc : ""}</div></div>
            <span style={{ fontWeight: 700, fontFamily: "Sora", whiteSpace: "nowrap" }}>{inr(e.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ ADMIN ----------------------------- */
function AdminPanel({ cfg, saveCfg, payments, savePayments, decide, notices, saveNotices, tickets, setTicketStatus, users, saveUsers, flash, signOut, backupData,
  ledger, saveLedger, memberStatus, decideMember, pendingMembers, sheetSync, owners, saveOwners }) {
  const [tab, setTab] = useState("overview");
  const [importRows, setImportRows] = useState(() => readOwnersImport());
  const approved = payments.filter((p) => p.status === "approved");
  const pending = payments.filter((p) => p.status === "pending").sort((a, b) => a.submittedAt - b.submittedAt);
  const openTix = tickets.filter((t) => t.status !== "resolved");
  const act = (id, status) => decide([{ id, status }]);
  const collected = approved.reduce((s, p) => s + p.amount, 0);
  const expectedSoFar = ALL_FLATS.length * (NOW_MONTH + 1) * cfg.monthlyAmount;
  const rate = expectedSoFar ? Math.round((collected / expectedSoFar) * 100) : 0;
  const residents = Object.values(users);
  const flatsReg = new Set(residents.map((u) => u.flat)).size;
  const acc = accountTotals(payments, ledger, cfg, YEAR);
  const thisMonth = ymd(Date.now()).slice(0, 7);
  const spentMonth = ledger.filter((e) => e.kind === "expense" && e.date.slice(0, 7) === thisMonth).reduce((s, e) => s + (+e.amount || 0), 0);

  return (
    <div className="fade">
      <div className="greet" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Committee · Admin</span>
        <button className="btn ghost sm" onClick={signOut}>Log out</button>
      </div>
      <div className="tabs" style={{ marginTop: 12 }}>
        {[["overview", "Overview"], ["approvals", `Payments${pending.length ? " (" + pending.length + ")" : ""}`], ["expenses", "Expenses"], ["markpaid", "Mark Paid"],
          ["residents", `Residents${pendingMembers ? " (" + pendingMembers + " new)" : " (" + residents.length + ")"}`], ["owners", "Flats & Owners"], ["accounts", "Dues Grid"], ["reports", "Reports"],
          ["help", `Helpdesk${openTix.length ? " (" + openTix.length + ")" : ""}`], ["notice", "Notices"], ["settings", "Settings"]].map(([id, lbl]) => (
          <button key={id} className={"tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{lbl}</button>
        ))}
      </div>

      {importRows && (
        <div className="card" style={{ borderColor: "#9FDDD4", background: "var(--teal-bg)" }}>
          <p className="label">Import owner details · {importRows.length} flats</p>
          <div style={{ maxHeight: 230, overflowY: "auto" }}>
            {importRows.map((r) => <div key={r.flat} className="kv" style={{ padding: "6px 0", fontSize: 13 }}><span>{r.flat}</span><span>{r.name} · {r.phone ? fmtPhone(r.phone) : "—"}</span></div>)}
          </div>
          <div className="row" style={{ marginTop: 11 }}>
            <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => { clearOwnersImport(); setImportRows(null); }}>Cancel</button>
            <button className="btn sm" style={{ flex: 1 }} onClick={() => {
              const next = { ...owners }; importRows.forEach((r) => { next[r.flat] = { name: r.name, phone: r.phone }; });
              saveOwners(next); clearOwnersImport(); setImportRows(null); setTab("owners"); flash(`Owner details saved for ${importRows.length} flats`);
            }}>Save to app</button>
          </div>
          <p className="note">Saved only in the society's private database (and the Google Sheet) — not on the public website.</p>
        </div>
      )}

      {tab === "overview" && (
        <>
          <div className="stat">
            <div className="statbox"><div className="n">{inr(collected)}</div><div className="l">Collected {YEAR}</div></div>
            <div className="statbox"><div className="n">{pending.length}</div><div className="l">Pending approval</div></div>
            <div className="statbox"><div className="n">{rate}%</div><div className="l">Collection rate</div></div>
            <div className="statbox"><div className="n">{openTix.length}</div><div className="l">Open complaints</div></div>
            <div className="statbox"><div className="n" style={{ color: acc.balance < 0 ? "var(--red)" : "var(--teal-d)" }}>{acc.balance < 0 ? "−" : ""}{inr(Math.abs(acc.balance))}</div><div className="l">Balance in hand</div></div>
            <div className="statbox"><div className="n">{inr(spentMonth)}</div><div className="l">Spent this month</div></div>
          </div>
          {pendingMembers > 0 && (
            <div className="card" style={{ marginTop: 13, borderColor: "#F3D9A4", background: "var(--amber-bg)" }} onClick={() => setTab("residents")}>
              <div className="lc-title">👋 {pendingMembers} new resident{pendingMembers > 1 ? "s" : ""} waiting for approval</div>
              <div className="lc-meta">Tap to check name, flat and mobile, then approve.</div>
            </div>
          )}
          <SheetCard sheetSync={sheetSync} flash={flash} compact />
          <div className="card" style={{ marginTop: 13 }}>
            <p className="label">Summary</p>
            <p className="note" style={{ marginTop: 0 }}>{ALL_FLATS.length} flats · {residents.length} registered resident(s) across {flatsReg} flat(s) · maintenance {inr(cfg.monthlyAmount)}/mo · expected so far {inr(expectedSoFar)}. {pending.length ? `${pending.length} payment(s) await approval.` : "No payments awaiting approval."}</p>
          </div>
        </>
      )}

      {tab === "approvals" && (
        <div className="card">
          <p className="label">Approve to record payment</p>
          {pending.length === 0 && <div className="empty">Nothing to approve ✓</div>}
          {pending.map((p) => (
            <div key={p.id} className="listcard">
              <div className="lc-top">
                <div><div className="lc-title">{p.flat} · {inr(p.amount)}</div>
                  <div className="lc-meta">{p.payer}{p.phone ? " · " + fmtPhone(p.phone) : ""} · {monthName(p.month)}<br />Ref {p.ref} · {new Date(p.submittedAt).toLocaleString("en-IN")}</div></div>
              </div>
              <div className="row" style={{ marginTop: 11 }}>
                <button className="btn sm" style={{ flex: 1, background: "var(--green)" }} onClick={() => { act(p.id, "approved"); flash(p.flat + " approved"); }}>✓ Approve</button>
                <button className="btn ghost sm" style={{ flex: 1, color: "var(--red)" }} onClick={() => { act(p.id, "rejected"); flash(p.flat + " rejected"); }}>✕ Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "markpaid" && <MarkPaid cfg={cfg} payments={payments} save={savePayments} decide={decide} flash={flash} owners={owners} />}
      {tab === "expenses" && <Expenses ledger={ledger} save={saveLedger} flash={flash} />}
      {tab === "owners" && <Owners owners={owners} save={saveOwners} users={users} payments={payments} cfg={cfg} flash={flash} />}
      {tab === "residents" && <Residents users={users} save={saveUsers} flash={flash} memberStatus={memberStatus} decideMember={decideMember} owners={owners} />}
      {tab === "accounts" && <Accounts payments={payments} />}
      {tab === "reports" && <Reports payments={payments} cfg={cfg} ledger={ledger} owners={owners} />}
      {tab === "help" && <AdminHelp tickets={tickets} setTicketStatus={setTicketStatus} flash={flash} />}
      {tab === "notice" && <AdminNotices notices={notices} save={saveNotices} flash={flash} />}
      {tab === "settings" && <Settings cfg={cfg} saveCfg={saveCfg} flash={flash} backupData={backupData} sheetSync={sheetSync} />}
    </div>
  );
}

/* --------------------------- RESIDENTS ---------------------------- */
function Residents({ users, save, flash, memberStatus, decideMember, owners }) {
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState(null);
  const all = Object.values(users).sort((a, b) => ALL_FLATS.indexOf(a.flat) - ALL_FLATS.indexOf(b.flat) || a.name.localeCompare(b.name));
  const waiting = all.filter((u) => memberStatus(u.phone) === "pending").sort((a, b) => a.createdAt - b.createdAt);
  const list = all.filter((u) => memberStatus(u.phone) !== "pending");
  const ql = q.trim().toLowerCase();
  const shown = ql ? list.filter((u) => (u.name + " " + u.flat + " " + u.phone).toLowerCase().includes(ql)) : list;
  const remove = (ph) => { const next = { ...users }; delete next[ph]; save(next); setConfirm(null); flash("Resident removed"); };
  const sameFlat = (u) => list.filter((x) => x.flat === u.flat && memberStatus(x.phone) === "approved").map((x) => x.name);
  return (
    <div>
      {waiting.length > 0 && (
        <div className="card" style={{ borderColor: "#F3D9A4" }}>
          <p className="label">New registrations · approve only people you know</p>
          {waiting.map((u) => (
            <div key={u.phone} className="listcard">
              <div className="lc-title">{u.flat} · {u.name}</div>
              <div className="lc-meta">{u.role} · {fmtPhone(u.phone)} · registered {fmtDate(u.createdAt)}{owners[u.flat] ? <><br />Owner on record: {owners[u.flat].name}{owners[u.flat].phone ? " · " + fmtPhone(owners[u.flat].phone) : ""}</> : ""}{sameFlat(u).length ? <><br />Already in {u.flat}: {sameFlat(u).join(", ")}</> : ""}</div>
              <div className="row" style={{ marginTop: 10 }}>
                <a href={"tel:+91" + u.phone} style={{ flex: 1 }}><button className="btn ghost sm" style={{ width: "100%" }}>📞 Call</button></a>
                <button className="btn ghost sm" style={{ flex: 1, color: "var(--red)" }} onClick={() => { decideMember(u.phone, "rejected"); flash("Registration rejected"); }}>✕ Reject</button>
                <button className="btn sm" style={{ flex: 1, background: "var(--green)" }} onClick={() => { decideMember(u.phone, "approved"); flash(u.name.split(" ")[0] + " approved"); }}>✓ Approve</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="card">
        <p className="label">Registered residents · {list.length}</p>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, flat or mobile" />
        <div style={{ marginTop: 6 }}>
          {shown.length === 0 && <div className="empty">{list.length ? "No match." : "No residents have registered yet."}</div>}
          {shown.map((u) => {
            const st = memberStatus(u.phone);
            return (
              <div key={u.phone} className="row-it">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{u.flat} · {u.name} {owners[u.flat] && owners[u.flat].phone === u.phone && <span className="pill p-ok">Owner ✓</span>} {st === "rejected" && <span className="pill p-rej">Rejected</span>}</div>
                  <div className="mini">{u.role} · {fmtPhone(u.phone)}<br />Joined {fmtDate(u.createdAt)}{u.lastLogin ? " · last login " + fmtDate(u.lastLogin) : ""}</div>
                </div>
                {confirm === u.phone
                  ? <div className="row"><button className="btn ghost sm" onClick={() => setConfirm(null)}>Keep</button>
                      <button className="btn sm" style={{ background: "var(--red)" }} onClick={() => remove(u.phone)}>Remove</button></div>
                  : <div className="row">{st === "rejected" && <button className="btn ghost sm" onClick={() => { decideMember(u.phone, "approved"); flash("Approved"); }}>Approve</button>}
                      <button className="btn ghost sm" style={{ color: "var(--red)" }} onClick={() => setConfirm(u.phone)}>Remove</button></div>}
              </div>
            );
          })}
        </div>
        <p className="note">Removing a resident signs them out of the app; they'll need to log in and register again (and be approved again).</p>
      </div>
    </div>
  );
}

/* -------------------------- FLATS & OWNERS ------------------------ */
function Owners({ owners, save, users, payments, cfg, flash }) {
  const [edit, setEdit] = useState(null);   // flat being edited
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [q, setQ] = useState("");
  const start = (f) => { setEdit(f); setName(owners[f]?.name || ""); setPhone(owners[f]?.phone || ""); };
  const saveOne = () => {
    const ph = cleanPhone(phone);
    if (phone && !/^[6-9]\d{9}$/.test(ph)) return flash("Enter a 10-digit mobile number");
    const next = { ...owners };
    if (name.trim()) next[edit] = { name: name.trim(), phone: ph }; else delete next[edit];
    save(next); setEdit(null); flash(edit + " saved");
  };
  const owed = (f) => MONTHS.reduce((s, _, i) => (i <= NOW_MONTH && statusOf(payments, f, monthKey(i)) !== "approved" ? s + cfg.monthlyAmount : s), 0);
  const ql = q.trim().toLowerCase();
  const known = ALL_FLATS.filter((f) => owners[f]).length;
  const byOwner = {};
  ALL_FLATS.forEach((f) => { const o = owners[f]; if (o && o.phone) (byOwner[o.phone] = byOwner[o.phone] || []).push(f); });
  return (
    <div className="card">
      <p className="label">Flats & owners · {known}/{ALL_FLATS.length} recorded</p>
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search flat, owner or mobile" />
      {FLOORS.map((fl) => {
        const flats = fl.flats.filter((f) => !ql || (f + " " + (owners[f]?.name || "") + " " + (owners[f]?.phone || "")).toLowerCase().includes(ql));
        if (!flats.length) return null;
        return (
          <div key={fl.name}>
            <div className="floor-h" style={{ marginTop: 12 }}>{fl.name}</div>
            {flats.map((f) => {
              const o = owners[f];
              const reg = Object.values(users).filter((u) => u.flat === f);
              const due = owed(f);
              if (edit === f) return (
                <div key={f} className="listcard">
                  <div className="lc-title">{f}</div>
                  <input className="input" style={{ marginTop: 8 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Owner name (empty = remove)" />
                  <input className="input" style={{ marginTop: 8 }} type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" />
                  <div className="row" style={{ marginTop: 9 }}>
                    <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => setEdit(null)}>Cancel</button>
                    <button className="btn sm" style={{ flex: 1 }} onClick={saveOne}>Save</button>
                  </div>
                </div>
              );
              return (
                <div key={f} className="row-it">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{f} · {o ? o.name : <span style={{ color: "var(--muted)" }}>Owner not added</span>}</div>
                    <div className="mini">
                      {o && o.phone ? fmtPhone(o.phone) : ""}{o && o.phone && byOwner[o.phone].length > 1 ? ` · ${byOwner[o.phone].length} flats` : ""}
                      <br />{reg.length ? "In app: " + reg.map((u) => u.name).join(", ") : "No one registered yet"} · {due ? <span style={{ color: "var(--red)" }}>due {inr(due)}</span> : <span style={{ color: "var(--green)" }}>paid up</span>}
                    </div>
                  </div>
                  <div className="row" style={{ flex: "none" }}>
                    {o && o.phone && <a href={"tel:+91" + o.phone}><button className="btn ghost sm">📞</button></a>}
                    {o && o.phone && <a href={"https://wa.me/91" + o.phone + "?text=" + encodeURIComponent(`Sunshine Homes: please open the society app https://raghuslogiclab.com/apps/sunshine-homes/ — log in with this mobile number and the society password.${due ? " Maintenance due for " + f + ": " + inr(due) + "." : ""}`)} target="_blank" rel="noopener"><button className="btn ghost sm">💬</button></a>}
                    <button className="btn ghost sm" onClick={() => start(f)}>Edit</button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      <p className="note">Owners who register with the mobile number shown here are approved automatically. 💬 opens WhatsApp with the app link (and any dues) ready to send.</p>
    </div>
  );
}

/* ---------------------------- EXPENSES ---------------------------- */
function Expenses({ ledger, save, flash }) {
  const [kind, setKind] = useState("expense");
  const cats = kind === "income" ? INCOME_CATS : EXPENSE_CATS;
  const [date, setDate] = useState(ymd(Date.now()));
  const [cat, setCat] = useState(EXPENSE_CATS[0]);
  const [desc, setDesc] = useState("");
  const [party, setParty] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState(PAY_MODES[0]);
  const [ref, setRef] = useState("");
  const [month, setMonth] = useState(ymd(Date.now()).slice(0, 7));
  const [confirm, setConfirm] = useState(null);
  const switchKind = (k) => { setKind(k); setCat((k === "income" ? INCOME_CATS : EXPENSE_CATS)[0]); };
  const add = () => {
    if (!date) return flash("Pick the date");
    if (!amount || +amount <= 0) return flash("Enter the amount");
    if (cat === "Other" && !desc.trim()) return flash("Add a short description");
    const voucher = nextVoucher(ledger, kind);
    save([...ledger, { id: uid(), kind, voucher, date, cat, desc: desc.trim(), party: party.trim(), amount: Math.round(+amount * 100) / 100, mode, ref: ref.trim(), at: Date.now() }]);
    flash(`${voucher} saved · ${inr(+amount)}`); setDesc(""); setParty(""); setAmount(""); setRef("");
    setMonth(date.slice(0, 7));
  };
  const del = (id) => { save(ledger.filter((e) => e.id !== id)); setConfirm(null); flash("Entry deleted"); };
  const months = [...new Set([ymd(Date.now()).slice(0, 7), ...ledger.map((e) => e.date.slice(0, 7))])].sort().reverse();
  const shown = ledger.filter((e) => e.date.slice(0, 7) === month).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.at - a.at));
  const mIn = shown.filter((e) => e.kind === "income").reduce((s, e) => s + (+e.amount || 0), 0);
  const mOut = shown.filter((e) => e.kind === "expense").reduce((s, e) => s + (+e.amount || 0), 0);
  return (
    <div>
      <div className="card">
        <div className="seg">
          <button className={"btn sm " + (kind === "expense" ? "" : "ghost")} style={kind === "expense" ? { background: "var(--coral)" } : {}} onClick={() => switchKind("expense")}>− Expense</button>
          <button className={"btn sm " + (kind === "income" ? "" : "ghost")} style={kind === "income" ? { background: "var(--green)" } : {}} onClick={() => switchKind("income")}>+ Other income</button>
        </div>
        <p className="label">Date</p>
        <input className="input" type="date" value={date} max={ymd(Date.now())} onChange={(e) => setDate(e.target.value)} />
        <p className="label" style={{ marginTop: 13 }}>Category</p>
        <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>{cats.map((c) => <option key={c}>{c}</option>)}</select>
        <p className="label" style={{ marginTop: 13 }}>Amount (₹)</p>
        <input className="input" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 10500" />
        <p className="label" style={{ marginTop: 13 }}>{kind === "income" ? "Received from" : "Paid to"}</p>
        <input className="input" value={party} onChange={(e) => setParty(e.target.value)} placeholder={kind === "income" ? "e.g. Builder" : "e.g. Watchman Ramaiah / APSPDCL"} />
        <p className="label" style={{ marginTop: 13 }}>Description</p>
        <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={kind === "income" ? "e.g. Share for unsold flats, Nov" : "e.g. Nov salary / Meter 3631253000499 bill"} />
        <p className="label" style={{ marginTop: 13 }}>Paid by</p>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {PAY_MODES.map((m) => <button key={m} className={"btn sm " + (mode === m ? "" : "ghost")} style={{ flex: "1 1 22%", padding: "9px 2px" }} onClick={() => setMode(m)}>{m}</button>)}
        </div>
        <p className="label" style={{ marginTop: 13 }}>Bill no. / UPI ref (optional)</p>
        <input className="input" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Receipt or transaction number" />
        <button className="btn" style={{ marginTop: 15, background: kind === "income" ? "var(--green)" : undefined }} onClick={add}>
          Save {kind === "income" ? "income" : "expense"} · {nextVoucher(ledger, kind)}</button>
        <p className="note">Every entry gets a voucher number and goes to the Google Sheet with the next sync. Keep the paper bill with the same voucher number.</p>
      </div>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <p className="label" style={{ margin: 0 }}>Cashbook</p>
          <select className="input" style={{ width: "auto", padding: "7px 10px" }} value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
          </select>
        </div>
        <div className="kv"><span>Other income</span><span className="amt-in">{inr(mIn)}</span></div>
        <div className="kv"><span>Expenses</span><span className="amt-out">{inr(mOut)}</span></div>
        <div style={{ marginTop: 6 }}>
          {shown.length === 0 && <div className="empty">No entries in {monthName(month)}.</div>}
          {shown.map((e) => (
            <div key={e.id} className="row-it">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{e.cat}</div>
                <div className="mini">{e.voucher} · {fmtDay(e.date)} · {e.mode}{e.party ? " · " + e.party : ""}{e.desc ? <><br />{e.desc}</> : ""}{e.ref ? " · ref " + e.ref : ""}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className={e.kind === "income" ? "amt-in" : "amt-out"}>{e.kind === "income" ? "+" : "−"}{inr(e.amount)}</div>
                {confirm === e.id
                  ? <div className="row" style={{ marginTop: 5 }}><button className="btn ghost sm" onClick={() => setConfirm(null)}>Keep</button><button className="btn sm" style={{ background: "var(--red)" }} onClick={() => del(e.id)}>Delete</button></div>
                  : <button className="linkbtn" style={{ fontSize: 11, color: "var(--red)", marginTop: 4 }} onClick={() => setConfirm(e.id)}>Delete</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --------------------------- MARK PAID ---------------------------- */
function MarkPaid({ cfg, payments, save, decide, flash, owners }) {
  const [target, setTarget] = useState("ALL");
  const [sel, setSel] = useState(() => { const s = {}; MONTHS.forEach((_, i) => { if (i <= NOW_MONTH) s[i] = true; }); return s; });
  const [amt, setAmt] = useState(String(cfg.monthlyAmount));
  const toggle = (i) => setSel((s) => ({ ...s, [i]: !s[i] }));
  const chosen = MONTHS.map((_, i) => i).filter((i) => sel[i]);
  const flats = target === "ALL" ? ALL_FLATS : [target];
  const toCreate = [];
  flats.forEach((f) => chosen.forEach((i) => { if (statusOf(payments, f, monthKey(i)) !== "approved") toCreate.push({ f, i }); }));
  const apply = () => {
    if (chosen.length === 0) return flash("Pick at least one month");
    if (!amt || +amt <= 0) return flash("Enter a valid amount");
    if (toCreate.length === 0) return flash("Nothing to mark — already paid");
    const stamp = Date.now();
    const fresh = toCreate.map(({ f, i }, n) => ({ id: uid(), flat: f, month: monthKey(i), amount: +amt, payer: "Committee entry", ref: "Manual", submittedAt: stamp + n }));
    save([...payments, ...fresh]); decide(fresh.map((x) => ({ id: x.id, status: "approved" }))); flash(`Marked ${fresh.length} payment(s) as paid`);
  };
  return (
    <div className="card">
      <p className="label">Admin shortcut · record payments directly</p>
      <p className="label" style={{ marginTop: 6 }}>Flat</p>
      <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
        <option value="ALL">All 30 flats</option>
        {FLOORS.map((fl) => <optgroup key={fl.name} label={fl.name}>{fl.flats.map((f) => <option key={f} value={f}>{f}{owners[f] ? " · " + owners[f].name : ""}</option>)}</optgroup>)}
      </select>
      <p className="label" style={{ marginTop: 13 }}>Months to mark paid</p>
      <div className="monthgrid">
        {MONTHS.map((m, i) => <div key={m} className={"mchip " + (sel[i] ? "ok" : "")} onClick={() => toggle(i)}>{m}<small>{sel[i] ? "✓ SEL" : "tap"}</small></div>)}
      </div>
      <div className="row" style={{ marginTop: 9 }}>
        <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => setSel(Object.fromEntries(MONTHS.map((_, i) => [i, true])))}>Select all</button>
        <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => setSel({})}>Clear</button>
      </div>
      <p className="label" style={{ marginTop: 13 }}>Amount per month</p>
      <input className="input" type="number" value={amt} onChange={(e) => setAmt(e.target.value)} />
      <p className="note">Will create <b>{toCreate.length}</b> approved payment(s){target === "ALL" ? " across all flats" : " for " + target}. Total ≈ <b>{inr(toCreate.length * (+amt || 0))}</b>. Already-paid months are skipped.</p>
      <button className="btn" style={{ marginTop: 8 }} onClick={apply}>Mark as Paid</button>
    </div>
  );
}

/* --------------------------- ACCOUNTS ----------------------------- */
function Accounts({ payments }) {
  return (
    <div className="card">
      <p className="label">Account monitoring · every flat × month</p>
      <div className="matrix-wrap">
        <table className="mx">
          <thead><tr><th className="fc">Flat</th>{MONTHS.map((m) => <th key={m}>{m}</th>)}</tr></thead>
          <tbody>
            {ALL_FLATS.map((f) => (
              <tr key={f}><td className="fc">{f}</td>
                {MONTHS.map((_, i) => { const s = statusOf(payments, f, monthKey(i)); const c = s === "approved" ? "c-ok" : s === "pending" ? "c-pend" : s === "rejected" ? "c-rej" : "c-no"; return <td key={i}><span className={"cell " + c} /></td>; })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="legend">
        <span><span className="cell c-ok" /> Paid</span><span><span className="cell c-pend" /> Pending</span>
        <span><span className="cell c-rej" /> Rejected</span><span><span className="cell c-no" /> Unpaid</span>
      </div>
    </div>
  );
}

/* ---------------------------- REPORTS ----------------------------- */
function Reports({ payments, cfg, ledger, owners }) {
  const approved = payments.filter((p) => p.status === "approved");
  const byMonth = MONTHS.map((_, i) => approved.filter((p) => p.month === monthKey(i)).reduce((s, p) => s + p.amount, 0));
  const maxM = Math.max(1, ...byMonth);
  const total = byMonth.reduce((a, b) => a + b, 0);
  const byFloor = FLOORS.map((fl) => ({ name: fl.name, total: approved.filter((p) => fl.flats.includes(p.flat)).reduce((s, p) => s + p.amount, 0) }));
  const defaulters = ALL_FLATS.filter((f) => MONTHS.some((_, i) => i <= NOW_MONTH && statusOf(payments, f, monthKey(i)) !== "approved"));
  const owedBy = (f) => MONTHS.reduce((s, _, i) => (i <= NOW_MONTH && statusOf(payments, f, monthKey(i)) !== "approved" ? s + cfg.monthlyAmount : s), 0);
  const acc = accountTotals(payments, ledger, cfg, YEAR);
  const outByMonth = MONTHS.map((_, i) => ledger.filter((e) => e.kind === "expense" && e.date.slice(0, 7) === monthKey(i)).reduce((s, e) => s + (+e.amount || 0), 0));
  return (
    <div>
      <div className="card">
        <p className="label">Yearly report · {YEAR}</p>
        <div style={{ fontFamily: "Sora", fontSize: 28, fontWeight: 700, color: "var(--teal-d)" }}>{inr(total)}</div>
        <div className="label" style={{ marginTop: 2 }}>Total approved collection</div>
        <div className="kv" style={{ marginTop: 8 }}><span>Other income</span><span className="amt-in">{inr(acc.income)}</span></div>
        <div className="kv"><span>Expenses</span><span className="amt-out">{inr(acc.spent)}</span></div>
        <div className="kv"><span>Surplus / deficit {YEAR}</span><span style={{ fontWeight: 700, color: acc.maint + acc.income - acc.spent < 0 ? "var(--red)" : "var(--green)" }}>{inr(acc.maint + acc.income - acc.spent)}</span></div>
        <div className="kv"><span>Balance in hand</span><span style={{ fontWeight: 700 }}>{acc.balance < 0 ? "−" : ""}{inr(Math.abs(acc.balance))}</span></div>
      </div>
      <div className="card">
        <p className="label">Monthly expenses</p>
        {MONTHS.map((m, i) => (
          <div className="bar-row" key={m}><span className="lab">{m}</span>
            <span className="bar-track"><span className="bar-fill" style={{ width: (outByMonth[i] / Math.max(1, ...outByMonth)) * 100 + "%", background: "var(--coral)" }} /></span>
            <span className="val">{inr(outByMonth[i])}</span></div>
        ))}
      </div>
      <div className="card">
        <p className="label">Monthly collection</p>
        {MONTHS.map((m, i) => (
          <div className="bar-row" key={m}><span className="lab">{m}</span>
            <span className="bar-track"><span className="bar-fill" style={{ width: (byMonth[i] / maxM) * 100 + "%" }} /></span>
            <span className="val">{inr(byMonth[i])}</span></div>
        ))}
      </div>
      <div className="card">
        <p className="label">By floor</p>
        {byFloor.map((fl) => (
          <div key={fl.name} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{fl.name}</span><span style={{ fontWeight: 700, fontFamily: "Sora" }}>{inr(fl.total)}</span></div>
        ))}
      </div>
      <div className="card">
        <p className="label">Defaulters · {defaulters.length} flat(s)</p>
        {defaulters.length === 0 && <div className="empty">Everyone is up to date 🎉</div>}
        {defaulters.map((f) => <div key={f} className="kv"><span>{f}{owners[f] ? " · " + owners[f].name : ""}</span><span className="amt-out">{inr(owedBy(f))}</span></div>)}
      </div>
    </div>
  );
}

/* ------------------------ ADMIN: HELPDESK ------------------------- */
function AdminHelp({ tickets, setTicketStatus, flash }) {
  const list = [...tickets].sort((a, b) => b.at - a.at);
  const setStatus = (id, status) => { setTicketStatus(id, status); flash("Ticket " + status); };
  return (
    <div className="card">
      <p className="label">All complaints</p>
      {list.length === 0 && <div className="empty">No complaints raised.</div>}
      {list.map((t) => (
        <div key={t.id} className="listcard">
          <div className="lc-top"><div className="lc-title">{t.flat} · {t.title}</div><Pill s={t.status} /></div>
          <div className="lc-meta">{t.cat} · {fmtDate(t.at)}{t.by ? " · " + t.by : ""}{t.phone ? " · " + fmtPhone(t.phone) : ""}</div>
          {t.desc && <div className="lc-body">{t.desc}</div>}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => setStatus(t.id, "in-progress")}>In progress</button>
            <button className="btn sm" style={{ flex: 1, background: "var(--green)" }} onClick={() => setStatus(t.id, "resolved")}>Resolve</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------ ADMIN: NOTICES -------------------------- */
function AdminNotices({ notices, save, flash }) {
  const [cat, setCat] = useState("Notice");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const post = () => {
    if (!title.trim()) return flash("Add a title");
    save([{ id: uid(), cat, title: title.trim(), body: body.trim(), at: Date.now() }, ...notices]);
    flash("Notice posted"); setTitle(""); setBody("");
  };
  const del = (id) => { save(notices.filter((n) => n.id !== id)); flash("Notice deleted"); };
  return (
    <div>
      <div className="card">
        <p className="label">Post a notice</p>
        <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>{["Notice", "Event", "Emergency", "Maintenance", "Poll"].map((c) => <option key={c}>{c}</option>)}</select>
        <input className="input" style={{ marginTop: 11 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <textarea className="input" style={{ marginTop: 11 }} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message to residents…" />
        <button className="btn" style={{ marginTop: 13 }} onClick={post}>Publish notice</button>
      </div>
      <div className="card">
        <p className="label">Posted notices</p>
        {notices.length === 0 && <div className="empty">No notices.</div>}
        {[...notices].sort((a, b) => b.at - a.at).map((n) => (
          <div key={n.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
            <div><div style={{ fontWeight: 700, fontSize: 14 }}>{n.title}</div><div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{n.cat} · {fmtDate(n.at)}</div></div>
            <button className="btn ghost sm" style={{ color: "var(--red)" }} onClick={() => del(n.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------- GOOGLE SHEET --------------------------- */
// The Google Apps Script (apps/sunshine-homes/sheets-sync/Code.gs) copies every record to the
// society's Google Sheet every 5 minutes and writes its status into the "sheetSync" document.
function SheetCard({ sheetSync, flash, compact }) {
  const [busy, setBusy] = useState(false);
  const s = sheetSync;
  const mins = s && s.at ? Math.round((Date.now() - s.at) / 60000) : null;
  const ok = s && !s.error && mins !== null && mins <= 40;
  const syncNow = async () => {
    if (!s || !s.webAppUrl) return;
    setBusy(true);
    try {
      const r = await fetch(s.webAppUrl + "?action=sync");
      const j = await r.json();
      flash(j.ok ? "Google Sheet updated ✓" : "Sync problem: " + (j.error || "unknown"));
    } catch (e) { window.open(s.webAppUrl + "?action=sync", "_blank"); }
    setBusy(false);
  };
  if (compact && !s) return null;
  return (
    <div className="card" style={{ marginTop: compact ? 13 : 0 }}>
      <p className="label">📗 Google Sheet (raghuslogiclab@gmail.com)</p>
      {!s && <p className="note" style={{ marginTop: 0 }}>Not connected yet. Follow “Connect the Google Sheet” in the setup guide — after that every payment, expense, resident and complaint is copied to the sheet automatically every 5 minutes.</p>}
      {s && <>
        <div className="kv"><span>Last copied</span><span className={"pill " + (ok ? "p-ok" : "p-pend")}>● {mins === null ? "—" : mins < 1 ? "just now" : mins < 60 ? mins + " min ago" : fmtDate(s.at) + " " + new Date(s.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></div>
        {s.rows && <div className="kv"><span>Rows in sheet</span><span>{s.rows.payments || 0} payments · {s.rows.ledger || 0} expenses/income</span></div>}
        {s.error && <div className="err">Last sync problem: {s.error}</div>}
        <div className="row" style={{ marginTop: 11 }}>
          {s.url && <a href={s.url} target="_blank" rel="noopener" style={{ flex: 1 }}><button className="btn ghost sm" style={{ width: "100%" }}>Open sheet</button></a>}
          {s.webAppUrl && <button className="btn sm" style={{ flex: 1 }} disabled={busy} onClick={syncNow}>{busy ? "Syncing…" : "Sync now"}</button>}
        </div>
      </>}
    </div>
  );
}

/* ---------------------------- SETTINGS ---------------------------- */
function Settings({ cfg, saveCfg, flash, backupData, sheetSync }) {
  const [upi, setUpi] = useState(cfg.upiId);
  const [amt, setAmt] = useState(String(cfg.monthlyAmount));
  const [ob, setOb] = useState(String(cfg.openingBalance || 0));
  const [od, setOd] = useState(cfg.openingDate || "");
  const [fac, setFac] = useState((cfg.facilities || []).join(", "));
  const [contacts, setContacts] = useState(() => (cfg.contacts || DEFAULT_CONTACTS).map((c) => ({ ...c })));
  const setC = (i, k, v) => setContacts((cs) => cs.map((c, j) => (j === i ? { ...c, [k]: v } : c)));
  const [busy, setBusy] = useState("");
  const markBackup = () => saveCfg({ ...cfg, lastBackupAt: Date.now() });
  const excel = async () => {
    setBusy("excel");
    try { await downloadExcelBackup(backupData().readable); markBackup(); flash("Excel backup downloaded"); }
    catch (e) { flash("Couldn't make the Excel file — check your internet, or use the full backup"); }
    setBusy("");
  };
  const json = () => {
    try { downloadJsonBackup(backupData().raw); markBackup(); flash("Full backup downloaded"); }
    catch (e) { flash("Couldn't make the backup file"); }
  };
  const daysSince = cfg.lastBackupAt ? Math.floor((Date.now() - cfg.lastBackupAt) / 86400000) : null;
  return (
    <div>
      <SheetCard sheetSync={sheetSync} flash={flash} />
      <div className="card">
        <p className="label">New residents</p>
        <div className="kv"><span>Committee must approve new registrations</span>
          <button className={"btn sm " + (cfg.memberApproval ? "" : "ghost")} onClick={() => { saveCfg({ ...cfg, memberApproval: !cfg.memberApproval }); flash(cfg.memberApproval ? "Approval turned off" : "Approval turned on"); }}>{cfg.memberApproval ? "On" : "Off"}</button></div>
        <div className="kv"><span>Residents can see society accounts</span>
          <button className={"btn sm " + (cfg.showAccounts !== false ? "" : "ghost")} onClick={() => saveCfg({ ...cfg, showAccounts: cfg.showAccounts === false })}>{cfg.showAccounts !== false ? "On" : "Off"}</button></div>
        <p className="note">With approval on, anyone who registers waits on a "waiting for approval" screen until you approve them in Residents. Residents see totals and expenses only — never other residents' numbers.</p>
      </div>
      <div className="card">
        <p className="label">Opening balance (cash in hand when you started)</p>
        <div className="row">
          <input className="input" type="number" value={ob} onChange={(e) => setOb(e.target.value)} placeholder="₹" />
          <input className="input" type="date" value={od} onChange={(e) => setOd(e.target.value)} />
        </div>
        <button className="btn" style={{ marginTop: 11 }} onClick={() => { saveCfg({ ...cfg, openingBalance: +ob || 0, openingDate: od }); flash("Opening balance saved"); }}>Save opening balance</button>
        <p className="note">Balance in hand = this amount + maintenance approved and other income from this date − expenses from this date.</p>
      </div>
      <div className="card">
        <p className="label">Contacts shown to residents</p>
        {contacts.map((c, i) => (
          <div key={i} style={{ borderBottom: "1px solid var(--line)", padding: "8px 0" }}>
            <div className="row">
              <input className="input" value={c.name} onChange={(e) => setC(i, "name", e.target.value)} placeholder="Name / role" />
              <input className="input" type="tel" value={c.phone} onChange={(e) => setC(i, "phone", e.target.value)} placeholder="Phone" />
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              <input className="input" value={c.detail} onChange={(e) => setC(i, "detail", e.target.value)} placeholder="Note (e.g. Mon–Sat, 9–6)" />
              <button className="btn ghost sm" style={{ color: "var(--red)" }} onClick={() => setContacts((cs) => cs.filter((_, j) => j !== i))}>✕</button>
            </div>
          </div>
        ))}
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => setContacts((cs) => [...cs, { name: "", detail: "", phone: "" }])}>+ Add contact</button>
          <button className="btn sm" style={{ flex: 1 }} onClick={() => { saveCfg({ ...cfg, contacts: contacts.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), detail: c.detail.trim(), phone: c.phone.trim() })) }); flash("Contacts saved"); }}>Save contacts</button>
        </div>
        <p className="note">Contacts whose name starts with "Committee" are also shown to new residents waiting for approval.</p>
      </div>
      <div className="card">
        <p className="label">Bookable common areas</p>
        <input className="input" value={fac} onChange={(e) => setFac(e.target.value)} placeholder="e.g. Terrace, Common hall" />
        <button className="btn" style={{ marginTop: 11 }} onClick={() => { saveCfg({ ...cfg, facilities: fac.split(",").map((x) => x.trim()).filter(Boolean) }); flash("Saved"); }}>Save</button>
        <p className="note">Separate with commas. Leave empty to hide Amenities from residents.</p>
      </div>
      <div className="card">
        <p className="label">Backup</p>
        <div className="kv"><span>Last backup</span>
          <span className={"pill " + (daysSince !== null && daysSince <= 31 ? "p-ok" : "p-pend")}>● {cfg.lastBackupAt ? fmtDate(cfg.lastBackupAt) + (daysSince === 0 ? " (today)" : ` (${daysSince} day${daysSince === 1 ? "" : "s"} ago)`) : "Never"}</span></div>
        <button className="btn" style={{ marginTop: 12 }} disabled={!!busy} onClick={excel}>{busy === "excel" ? "Preparing Excel file…" : "⬇ Download Excel backup (.xlsx)"}</button>
        <button className="btn ghost" style={{ marginTop: 9 }} disabled={!!busy} onClick={json}>⬇ Download full backup (.json)</button>
        <p className="note">The Google Sheet above is your live copy. Also download a backup at least once a month and keep it safe. The Excel file has a sheet each for residents, dues by flat, payments, expenses & income, complaints, notices, visitors, bookings and settings. The full backup is an exact copy of everything, for restoring if ever needed.</p>
      </div>
      <div className="card">
        <p className="label">Login</p>
        <div className="kv"><span>Login</span><span className={"pill " + (MODE === "online" ? "p-ok" : "p-pend")}>● {MODE === "online" ? "Society password (Firebase)" : "Demo (any password)"}</span></div>
        <div className="kv"><span>Data</span><span className={"pill " + (MODE === "online" ? "p-ok" : "p-pend")}>● {MODE === "online" ? "Shared online (Firestore)" : "This browser only"}</span></div>
        <p className="note">{MODE === "online"
          ? <>Residents log in with their mobile number and the society password, which Firebase checks. To change the password: Firebase console → Authentication → Users → delete <b>{SOCIETY_LOGIN_EMAIL}</b>, then Add user with the same email and the new password. Residents' data isn't affected; everyone logs in again with the new password.</>
          : "Firebase isn't connected, so any password works and data isn't shared between phones. Add your Firebase config at the top of the app code (FIREBASE_CONFIG) to turn on the real password check and shared data."}</p>
      </div>
      <div className="card">
        <p className="label">UPI ID (editable by admin only)</p>
        <input className="input" value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@bank" />
        <div className="lockrow">🔒 Residents see this as read-only.</div>
        <button className="btn" style={{ marginTop: 11 }} onClick={() => { if (!upi.trim()) return flash("Enter a UPI ID"); saveCfg({ ...cfg, upiId: upi.trim() }); flash("UPI ID updated"); }}>Save UPI ID</button>
      </div>
      <div className="card">
        <p className="label">Monthly maintenance amount</p>
        <input className="input" type="number" value={amt} onChange={(e) => setAmt(e.target.value)} />
        <button className="btn" style={{ marginTop: 11 }} onClick={() => { if (!amt || +amt <= 0) return flash("Enter a valid amount"); saveCfg({ ...cfg, monthlyAmount: +amt }); flash("Amount updated"); }}>Save amount</button>
      </div>
      <div className="card">
        <p className="label">Committee login</p>
        <p className="note" style={{ marginTop: 0 }}>{MODE === "online"
          ? <>Only the committee login (<b>{ADMIN_LOGIN_EMAIL}</b>) can approve payments, update complaints, post notices, change settings and remove residents — Firebase enforces this, not just the app. To change the committee password: Firebase console → Authentication → Users → delete that account, then Add user again with the same email and the new password.</>
          : "Demo mode: any committee password with 4 or more characters works."}</p>
      </div>
    </div>
  );
}
