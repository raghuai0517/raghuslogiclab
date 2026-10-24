import { useState, useEffect } from "react";

/* ================================================================== */
/*  Sunshine Homes — Community Super App (ADDA-style)                   */
/*  Password login · Maintenance · Notices · Helpdesk · Visitors        */
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
/*  Firebase console setup: Authentication → Email/Password ON, a user  */
/*  with SOCIETY_LOGIN_EMAIL and the society password · Firestore rules:*/
/*    match /sunshine/{key} { allow read, write:                        */
/*      if request.auth != null && request.auth.token.email == "<SOCIETY_LOGIN_EMAIL>"; } */
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
const FACILITIES = ["Clubhouse", "Gym", "Swimming Pool", "Party Hall", "Tennis Court"];
const SLOTS = ["Morning (6–11)", "Afternoon (12–4)", "Evening (5–10)"];
const ROLES = ["Owner", "Tenant", "Family member"];

const monthKey = (i) => `${YEAR}-${String(i + 1).padStart(2, "0")}`;
const inr = (n) => "₹" + new Intl.NumberFormat("en-IN").format(n || 0);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const code4 = () => String(Math.floor(1000 + Math.random() * 9000));
const fmtDate = (t) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const fmtPhone = (p) => "+91 " + p.slice(0, 5) + " " + p.slice(5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");

/* The admin PIN is never stored as plain text: only a salted SHA-256 hash of it.
   To change it, use Admin → Settings → Change admin PIN in the app. */
const DEFAULTS = { upiId: "sunshinehomes@okicici", adminPinHash: "5fcdf12a5d60a36eb3ee9665daf4b1a9d92729eb7e38657c22b036d151104e66", monthlyAmount: 2000 };
const PIN_SALT = "sunshine-homes-admin-pin:";
async function hashPin(pin) {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(PIN_SALT + pin));
    return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
  } catch (e) { return null; }
}
async function pinMatches(cfg, pin) {
  if (cfg.adminPinHash) { const h = await hashPin(pin); return !!h && h === cfg.adminPinHash; }
  return !!cfg.adminPin && pin === cfg.adminPin;   // older saved settings (plain PIN)
}
// merge saved settings over the defaults; an older plain-text PIN keeps working until it's changed
const withDefaults = (c) => { const m = { ...DEFAULTS, ...c }; if (c && c.adminPin && !c.adminPinHash) delete m.adminPinHash; return m; };

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
  "auth/user-not-found": "The society login isn't set up yet. Please contact the committee.",
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

// Checks the society password. Firebase verifies it — the password itself is never stored in this code.
async function checkPassword(password) {
  if (MODE === "demo") {
    await sleep(400);
    return password.length >= 4 ? { ok: true } : { error: "Incorrect password." };
  }
  try {
    const { auth, mod } = await loadFirebase();
    await mod.signInWithEmailAndPassword(auth, SOCIETY_LOGIN_EMAIL, password);
    return { ok: true };
  } catch (e) {
    return { error: FB_ERR[e?.code] || "Couldn't log in. Please try again." };
  }
}

async function firebaseSignOut() {
  try { if (fb) await fb.mod.signOut(fb.auth); } catch (e) {}
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

.bar-row{display:flex;align-items:center;gap:8px;margin:6px 0}
.bar-row .lab{width:30px;font-size:11px;color:var(--muted);font-weight:700}
.bar-track{flex:1;height:16px;background:#EDF2F3;border-radius:6px;overflow:hidden}
.bar-fill{height:100%;border-radius:6px;background:linear-gradient(90deg,var(--teal),var(--teal-d));min-width:2px}
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
  const [payments, setPayments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState({});
  const [user, setUser] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("home");
  const [toast, setToast] = useState("");
  const [loadErr, setLoadErr] = useState(false);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2200); };
  onSaveError = () => flash("Couldn't save — check your internet connection");

  // Loads all shared data. Returns the users map, or null if the database couldn't be reached.
  const loadShared = async () => {
    try {
      const keys = ["config", "payments", "notices", "tickets", "visitors", "bookings", "users"];
      const [c, p, n, t, v, b, u] = await Promise.all(keys.map((k) => store.get(k, true, true)));
      if (c) setCfg(withDefaults(c));
      if (p) setPayments(p);
      if (n) setNotices(n); else seedNotices(setNotices);
      if (t) setTickets(t);
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
    let valid = !!(sess && sess.exp > Date.now());
    if (valid && MODE === "online") {
      // the Firebase society login must still be active on this device
      try { const fu = await firebaseUser(); valid = !!fu && fu.email === SOCIETY_LOGIN_EMAIL; }
      catch (e) { valid = false; }
    }
    if (MODE === "demo" || valid) {
      const us = await loadShared();
      if (valid && us && us[sess.phone]) setUser(us[sess.phone]);
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
      payments: (v) => v && setPayments(v),
      notices: (v) => v && setNotices(v),
      tickets: (v) => v && setTickets(v),
      visitors: (v) => v && setVisitors(v),
      bookings: (v) => v && setBookings(v),
      users: (v) => { if (!v) return; setUsers(v); if (!v[user.phone]) signOut(true); },
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
  const savePayments = mk(setPayments, "payments");
  const saveNotices = mk(setNotices, "notices");
  const saveTickets = mk(setTickets, "tickets");
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
    if (MODE === "online") await loadShared();
    setUser(me); setTab("home");
    flash(isNew ? "Welcome to Sunshine Homes, " + me.name.split(" ")[0] + "!" : "Logged in");
    return true;
  };
  const signOut = async (removed) => {
    await store.del("session", false);
    await firebaseSignOut();
    setUser(null); setTab("home");
    flash(removed === true ? "Your account was removed by the committee" : "Logged out");
  };

  const myFlat = user?.flat;
  const pendingAppr = payments.filter((p) => p.status === "pending").length;
  const openTix = tickets.filter((t) => t.status !== "resolved").length;
  const inApp = loaded && user;

  return (
    <div className="wrap">
      <style>{CSS}</style>
      <div className="app">
        <div className="top">
          <div className="brand">
            <div className="logo">🌇</div>
            <div>
              <div className="bname">Sunshine Homes</div>
              <div className="bsub">Community Super App</div>
            </div>
            {inApp && <button className="flatchip" onClick={() => setTab("profile")}>🏠 {myFlat} ▾</button>}
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
          {loaded && !user && !loadErr && <Auth flash={flash} onDone={signIn} />}

          {inApp && tab === "home" && (
            <Home user={user} cfg={cfg} payments={payments} notices={notices} tickets={tickets}
              visitors={visitors} go={setTab} pendingAppr={pendingAppr} />
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
            <Amenities flat={myFlat} bookings={bookings} save={saveBookings} flash={flash} />
          )}
          {inApp && tab === "directory" && <Directory />}
          {inApp && tab === "admin" && (
            <Admin cfg={cfg} saveCfg={saveCfg} payments={payments} savePayments={savePayments}
              notices={notices} saveNotices={saveNotices} tickets={tickets} saveTickets={saveTickets}
              users={users} saveUsers={saveUsers} flash={flash} />
          )}
        </div>

        {inApp && (
          <div className="nav">
            {[["home", "🏠", "Home"], ["dues", "💳", "Dues"], ["notices", "📢", "Notices"],
              ["help", "🛠️", "Helpdesk", openTix], ["admin", "🔐", "Admin", pendingAppr]].map(([id, ic, lb, bd]) => (
              <button key={id} className={"navb" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>
                {bd > 0 && <span className="nbadge">{bd}</span>}
                <span className="ni">{ic}</span><span className="nl">{lb}</span>
              </button>
            ))}
          </div>
        )}

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
function Auth({ flash, onDone }) {
  const [step, setStep] = useState("login"); // login → (register | retry)
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [name, setName] = useState("");
  const [flat, setFlat] = useState("");
  const [role, setRole] = useState(ROLES[0]);

  const validPhone = /^[6-9]\d{9}$/.test(phone);

  const login = async () => {
    if (!validPhone) return setErr("Enter a valid 10-digit mobile number.");
    if (!pw) return setErr("Enter the password.");
    setBusy(true); setErr("");
    const r = await checkPassword(pw);
    if (r.error) { setBusy(false); return setErr(r.error); }
    setPw("");
    await lookup();
  };

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
    } else { setBusy(false); setStep("register"); }
  };

  const register = async () => {
    if (name.trim().length < 2) return setErr("Enter your full name.");
    if (!flat) return setErr("Select your flat.");
    setErr(""); setBusy(true);
    const ok = await onDone({ phone, name: name.trim(), flat, role, createdAt: Date.now() }, true);
    if (ok === false) { setBusy(false); setErr("Couldn't reach the server. Please try again."); }
  };

  const head = {
    login: ["🔐", "Login or Register", "Enter your mobile number and the Sunshine Homes password."],
    register: ["📝", "Complete registration", "Tell us who you are and which flat you live in."],
    retry: ["📶", "Almost there", "Password accepted ✓"],
  }[step];

  return (
    <div className="fade" key={step}>
      <div className="auth-hero">
        <div className="auth-ic">{head[0]}</div>
        <div className="greet">{head[1]}<small>{head[2]}</small></div>
      </div>

      {step === "login" && (
        <form className="card" onSubmit={(e) => { e.preventDefault(); if (!busy) login(); }}>
          <p className="label">Mobile number</p>
          <div className="phone-row">
            <span className="cc">🇮🇳 +91</span>
            <input className="input" type="tel" inputMode="numeric" autoComplete="username" maxLength={10}
              value={phone} placeholder="98765 43210" autoFocus name="mobile"
              onChange={(e) => { setErr(""); setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); }} />
          </div>
          <p className="label" style={{ marginTop: 13 }}>Password</p>
          <div className="pw-row">
            <input className="input" type={showPw ? "text" : "password"} autoComplete="current-password" name="password"
              value={pw} placeholder="Society password"
              onChange={(e) => { setErr(""); setPw(e.target.value); }} />
            <button type="button" className="linkbtn" onClick={() => setShowPw((v) => !v)}>{showPw ? "Hide" : "Show"}</button>
          </div>
          {err && <div className="err">{err}</div>}
          <button type="submit" className="btn" style={{ marginTop: 15 }} disabled={busy || !validPhone || !pw}>
            {busy ? "Checking…" : "Login"}
          </button>
          <p className="note">New to the app? Enter your number and the password shared by the committee — you'll then be asked for your name and flat. Existing residents go straight in.</p>
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
function Home({ user, cfg, payments, notices, tickets, visitors, go, pendingAppr }) {
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
    ["amenities", "🏊", "Amenities", "var(--green-bg)", 0],
    ["directory", "📇", "Directory", "var(--teal-bg)", 0],
    ["notices", "🗳️", "Events", "var(--amber-bg)", 0],
    ["admin", "🔐", "Admin", "#EEF2F4", pendingAppr],
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
              <div style={{ fontWeight: 700, fontSize: 14 }}>{MONTHS[+p.month.slice(5) - 1]} {YEAR} · {inr(p.amount)}</div>
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
function Amenities({ flat, bookings, save, flash }) {
  const today = new Date().toISOString().slice(0, 10);
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
function Directory() {
  const contacts = [
    ["Security Gate", "Main gate intercom", "📞 0 88XX XX0001"],
    ["Society Manager", "Mon–Sat, 9–6", "📞 0 88XX XX0002"],
    ["Plumber (on-call)", "Common area issues", "📞 0 88XX XX0003"],
    ["Electrician", "Common area issues", "📞 0 88XX XX0004"],
    ["Emergency / Ambulance", "24×7", "📞 108"],
  ];
  return (
    <div className="fade">
      <div className="greet">Directory<small>Emergency & society contacts.</small></div>
      <div style={{ marginTop: 12 }}>
        {contacts.map(([n, d, p]) => (
          <div key={n} className="listcard">
            <div className="lc-top"><div className="lc-title">{n}</div><span className="pill p-ok">{p}</span></div>
            <div className="lc-meta">{d}</div>
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

/* ------------------------------ ADMIN ----------------------------- */
function Admin(props) {
  const [authed, setAuthed] = useState(false);
  if (!authed) return <PinGate cfg={props.cfg} onOk={() => setAuthed(true)} />;
  return <AdminPanel {...props} signOut={() => setAuthed(false)} />;
}

function PinGate({ cfg, onOk }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const press = (k) => {
    setErr(false);
    if (k === "del") return setPin((p) => p.slice(0, -1));
    if (pin.length >= 4) return;
    const next = pin + k; setPin(next);
    if (next.length === 4) setTimeout(async () => { if (await pinMatches(cfg, next)) onOk(); else { setErr(true); setPin(""); } }, 150);
  };
  return (
    <div className="fade">
      <div className="greet">Management Committee<small>Admin access for Sunshine Homes.</small></div>
      <div className="card" style={{ textAlign: "center", marginTop: 12 }}>
        <div style={{ fontSize: 32 }}>🔐</div>
        <h3 style={{ margin: "8px 0 2px" }}>Enter admin PIN</h3>
        <p className="note" style={{ marginTop: 2 }}>Required to approve payments, manage notices, complaints, residents & accounts.</p>
        <div className="pindots">{[0, 1, 2, 3].map((i) => <div key={i} className={"pindot" + (i < pin.length ? " f" : "")} />)}</div>
        {err && <div style={{ color: "var(--red)", fontSize: 13, fontWeight: 700 }}>Wrong PIN, try again</div>}
        <div className="keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => <div key={k} className="key" onClick={() => press(k)}>{k}</div>)}
          <div className="key fn" onClick={() => setPin("")}>clear</div>
          <div className="key" onClick={() => press("0")}>0</div>
          <div className="key fn" onClick={() => press("del")}>⌫</div>
        </div>
        <p className="note">Forgot the PIN? Ask the management committee.</p>
      </div>
    </div>
  );
}

function AdminPanel({ cfg, saveCfg, payments, savePayments, notices, saveNotices, tickets, saveTickets, users, saveUsers, flash, signOut }) {
  const [tab, setTab] = useState("overview");
  const approved = payments.filter((p) => p.status === "approved");
  const pending = payments.filter((p) => p.status === "pending").sort((a, b) => a.submittedAt - b.submittedAt);
  const openTix = tickets.filter((t) => t.status !== "resolved");
  const act = (id, status) => savePayments(payments.map((p) => (p.id === id ? { ...p, status, decidedAt: Date.now() } : p)));
  const collected = approved.reduce((s, p) => s + p.amount, 0);
  const expectedSoFar = ALL_FLATS.length * (NOW_MONTH + 1) * cfg.monthlyAmount;
  const rate = expectedSoFar ? Math.round((collected / expectedSoFar) * 100) : 0;
  const residents = Object.values(users);
  const flatsReg = new Set(residents.map((u) => u.flat)).size;

  return (
    <div className="fade">
      <div className="greet" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Admin · MC</span>
        <button className="btn ghost sm" onClick={signOut}>Lock admin</button>
      </div>
      <div className="tabs" style={{ marginTop: 12 }}>
        {[["overview", "Overview"], ["approvals", `Approvals${pending.length ? " (" + pending.length + ")" : ""}`], ["markpaid", "Mark Paid"],
          ["residents", `Residents (${residents.length})`], ["accounts", "Accounts"], ["reports", "Reports"],
          ["help", `Helpdesk${openTix.length ? " (" + openTix.length + ")" : ""}`], ["notice", "Notices"], ["settings", "Settings"]].map(([id, lbl]) => (
          <button key={id} className={"tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{lbl}</button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="stat">
            <div className="statbox"><div className="n">{inr(collected)}</div><div className="l">Collected {YEAR}</div></div>
            <div className="statbox"><div className="n">{pending.length}</div><div className="l">Pending approval</div></div>
            <div className="statbox"><div className="n">{rate}%</div><div className="l">Collection rate</div></div>
            <div className="statbox"><div className="n">{openTix.length}</div><div className="l">Open complaints</div></div>
          </div>
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
                  <div className="lc-meta">{p.payer}{p.phone ? " · " + fmtPhone(p.phone) : ""} · {MONTHS[+p.month.slice(5) - 1]} {YEAR}<br />Ref {p.ref} · {new Date(p.submittedAt).toLocaleString("en-IN")}</div></div>
              </div>
              <div className="row" style={{ marginTop: 11 }}>
                <button className="btn sm" style={{ flex: 1, background: "var(--green)" }} onClick={() => { act(p.id, "approved"); flash(p.flat + " approved"); }}>✓ Approve</button>
                <button className="btn ghost sm" style={{ flex: 1, color: "var(--red)" }} onClick={() => { act(p.id, "rejected"); flash(p.flat + " rejected"); }}>✕ Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "markpaid" && <MarkPaid cfg={cfg} payments={payments} save={savePayments} flash={flash} />}
      {tab === "residents" && <Residents users={users} save={saveUsers} flash={flash} />}
      {tab === "accounts" && <Accounts payments={payments} />}
      {tab === "reports" && <Reports payments={payments} cfg={cfg} />}
      {tab === "help" && <AdminHelp tickets={tickets} save={saveTickets} flash={flash} />}
      {tab === "notice" && <AdminNotices notices={notices} save={saveNotices} flash={flash} />}
      {tab === "settings" && <Settings cfg={cfg} saveCfg={saveCfg} flash={flash} />}
    </div>
  );
}

/* --------------------------- RESIDENTS ---------------------------- */
function Residents({ users, save, flash }) {
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState(null);
  const list = Object.values(users).sort((a, b) => ALL_FLATS.indexOf(a.flat) - ALL_FLATS.indexOf(b.flat) || a.name.localeCompare(b.name));
  const ql = q.trim().toLowerCase();
  const shown = ql ? list.filter((u) => (u.name + " " + u.flat + " " + u.phone).toLowerCase().includes(ql)) : list;
  const remove = (ph) => { const next = { ...users }; delete next[ph]; save(next); setConfirm(null); flash("Resident removed"); };
  return (
    <div className="card">
      <p className="label">Registered residents</p>
      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, flat or mobile" />
      <div style={{ marginTop: 6 }}>
        {shown.length === 0 && <div className="empty">{list.length ? "No match." : "No residents have registered yet."}</div>}
        {shown.map((u) => (
          <div key={u.phone} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "11px 0", borderBottom: "1px solid var(--line)" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{u.flat} · {u.name}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, lineHeight: 1.5 }}>{u.role} · {fmtPhone(u.phone)}<br />Joined {fmtDate(u.createdAt)}{u.lastLogin ? " · last login " + fmtDate(u.lastLogin) : ""}</div>
            </div>
            {confirm === u.phone
              ? <div className="row"><button className="btn ghost sm" onClick={() => setConfirm(null)}>Keep</button>
                  <button className="btn sm" style={{ background: "var(--red)" }} onClick={() => remove(u.phone)}>Remove</button></div>
              : <button className="btn ghost sm" style={{ color: "var(--red)" }} onClick={() => setConfirm(u.phone)}>Remove</button>}
          </div>
        ))}
      </div>
      <p className="note">Removing a resident signs them out of the app; they'll need to log in and register again.</p>
    </div>
  );
}

/* --------------------------- MARK PAID ---------------------------- */
function MarkPaid({ cfg, payments, save, flash }) {
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
    const fresh = toCreate.map(({ f, i }, n) => ({ id: uid(), flat: f, month: monthKey(i), amount: +amt, payer: "Admin entry", ref: "Manual", status: "approved", submittedAt: stamp + n, decidedAt: stamp + n }));
    save([...payments, ...fresh]); flash(`Marked ${fresh.length} payment(s) as paid`);
  };
  return (
    <div className="card">
      <p className="label">Admin shortcut · record payments directly</p>
      <p className="label" style={{ marginTop: 6 }}>Flat</p>
      <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
        <option value="ALL">All 30 flats</option>
        {FLOORS.map((fl) => <optgroup key={fl.name} label={fl.name}>{fl.flats.map((f) => <option key={f} value={f}>{f}</option>)}</optgroup>)}
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
function Reports({ payments, cfg }) {
  const approved = payments.filter((p) => p.status === "approved");
  const byMonth = MONTHS.map((_, i) => approved.filter((p) => p.month === monthKey(i)).reduce((s, p) => s + p.amount, 0));
  const maxM = Math.max(1, ...byMonth);
  const total = byMonth.reduce((a, b) => a + b, 0);
  const byFloor = FLOORS.map((fl) => ({ name: fl.name, total: approved.filter((p) => fl.flats.includes(p.flat)).reduce((s, p) => s + p.amount, 0) }));
  const defaulters = ALL_FLATS.filter((f) => MONTHS.some((_, i) => i <= NOW_MONTH && statusOf(payments, f, monthKey(i)) !== "approved"));
  return (
    <div>
      <div className="card">
        <p className="label">Yearly report · {YEAR}</p>
        <div style={{ fontFamily: "Sora", fontSize: 28, fontWeight: 700, color: "var(--teal-d)" }}>{inr(total)}</div>
        <div className="label" style={{ marginTop: 2 }}>Total approved collection</div>
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
        {defaulters.length > 0 && <div className="flatgrid">{defaulters.map((f) => <div key={f} className="flat" style={{ background: "var(--red-bg)", borderColor: "#EFC9C9", color: "var(--red)", cursor: "default" }}>{f}</div>)}</div>}
      </div>
    </div>
  );
}

/* ------------------------ ADMIN: HELPDESK ------------------------- */
function AdminHelp({ tickets, save, flash }) {
  const list = [...tickets].sort((a, b) => b.at - a.at);
  const setStatus = (id, status) => { save(tickets.map((t) => (t.id === id ? { ...t, status } : t))); flash("Ticket " + status); };
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

/* ---------------------------- SETTINGS ---------------------------- */
function Settings({ cfg, saveCfg, flash }) {
  const [upi, setUpi] = useState(cfg.upiId);
  const [amt, setAmt] = useState(String(cfg.monthlyAmount));
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  return (
    <div>
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
        <p className="label">Change admin PIN</p>
        <input className="input" type="tel" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="New 4-digit PIN" />
        <input className="input" type="tel" maxLength={4} style={{ marginTop: 10 }} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} placeholder="Confirm PIN" />
        <button className="btn" style={{ marginTop: 11 }} onClick={() => { if (pin.length !== 4) return flash("PIN must be 4 digits"); if (pin !== pin2) return flash("PINs don't match"); hashPin(pin).then((h) => { if (!h) return flash("Couldn't change the PIN on this browser"); const { adminPin, ...rest } = cfg; saveCfg({ ...rest, adminPinHash: h }); setPin(""); setPin2(""); flash("PIN changed"); }); }}>Update PIN</button>
      </div>
    </div>
  );
}
