/**
 * Sunshine Homes → Google Sheet sync
 * ---------------------------------------------------------------------------
 * Copies everything from the Sunshine Homes app (Firebase project
 * sunshine-homes-d5e7b) into this Google Sheet every 5 minutes:
 * Summary, Maintenance Payments, Dues by flat, Expenses & Income, Residents,
 * Complaints, Notices, Visitors and Bookings.
 *
 * SET UP (once, on a computer, signed in as raghuslogiclab@gmail.com):
 *   1. Open https://sheets.new  → name the sheet "Sunshine Homes – Live Records".
 *   2. Extensions → Apps Script. Delete what is there, paste this whole file, click Save (💾).
 *   3. Go back to the sheet tab and reload it. A "🌇 Sunshine Homes" menu appears.
 *   4. 🌇 Sunshine Homes → "1. Connect to the app". Allow access when Google asks,
 *      then run the menu item again and type the COMMITTEE password.
 *   5. Optional, for the "Sync now" button in the app: in Apps Script click
 *      Deploy → New deployment → type "Web app" → Execute as: Me →
 *      Who has access: Anyone → Deploy.
 *
 * The sheet is a read-only copy: make entries in the app. Anything typed in
 * these tabs is replaced at the next sync.
 * The committee password is kept only in this script's Script properties.
 */

var FIREBASE = {
  apiKey: "AIzaSyA9x-wSqK9vvU647mgezMayfs3BbkTfUIk",   // public web key of the app (same as in the website)
  projectId: "sunshine-homes-d5e7b",
  email: "admin@sunshine-homes-d5e7b.firebaseapp.com", // the committee login
  referer: "https://raghuslogiclab.com/",
};
var COLL = "sunshine";
var TZ = "Asia/Kolkata";
var FLATS = ["G1", "G2", "G3", "G4", "G5", "G6",
  "F101", "F102", "F103", "F104", "F105", "F106",
  "F201", "F202", "F203", "F204", "F205", "F206",
  "F301", "F302", "F303", "F304", "F305", "F306",
  "F401", "F402", "F403", "F404", "F405", "F406"];
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var LABEL = { approved: "Paid", pending: "Pending", rejected: "Rejected", open: "Open", "in-progress": "In progress", resolved: "Resolved" };
var TEAL = "#0A8C80";
var RUPEE = '"₹"#,##,##0;[Red]-"₹"#,##,##0';
var STAMP = "dd-mmm-yyyy hh:mm";
var DAY = "dd-mmm-yyyy";

/* ------------------------------ menu ------------------------------ */
function onOpen() {
  SpreadsheetApp.getUi().createMenu("🌇 Sunshine Homes")
    .addItem("1. Connect to the app", "connectToApp")
    .addItem("Sync now", "menuSync")
    .addItem("Change committee password", "connectToApp")
    .addSeparator()
    .addItem("Stop automatic sync", "stopAutoSync")
    .addToUi();
}

function connectToApp() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt("Connect to the Sunshine Homes app",
    "Type the COMMITTEE password (the one used for the 🛡️ Committee login in the app).\n" +
    "It is saved only in this script's private settings, not in the sheet.", ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var pw = r.getResponseText().trim();
  if (!pw) return;
  try { signIn_(pw); } catch (e) { ui.alert("Couldn't log in to the app: " + e.message); return; }
  var props = PropertiesService.getScriptProperties();
  props.setProperty("COMMITTEE_PASSWORD", pw);
  props.setProperty("SHEET_ID", SpreadsheetApp.getActiveSpreadsheet().getId());
  props.deleteProperty("LAST_HASH");
  SpreadsheetApp.getActiveSpreadsheet().setSpreadsheetTimeZone(TZ);
  installTrigger_();
  var res = sync_(true);
  ui.alert(res.ok
    ? "Connected ✓\n\nAll app data has been copied to this sheet. It will update by itself every 5 minutes.\n\n" +
      "Optional: Apps Script → Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone) adds a \"Sync now\" button in the app."
    : "Logged in, but the copy failed: " + res.error);
}

function menuSync() {
  var res = sync_(true);
  SpreadsheetApp.getUi().alert(res.ok ? "Sheet updated ✓ (" + res.counts + ")" : "Sync problem: " + res.error);
}

function stopAutoSync() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === "autoSync") ScriptApp.deleteTrigger(t); });
  SpreadsheetApp.getUi().alert("Automatic sync stopped. Use \"1. Connect to the app\" to start it again.");
}

function installTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === "autoSync") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("autoSync").timeBased().everyMinutes(5).create();
}

function autoSync() { sync_(false); }

/* "Sync now" button in the app (after deploying as a web app). It takes no data in. */
function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  var out;
  if (action === "sync") {
    var cache = CacheService.getScriptCache();
    if (cache.get("webSync")) out = { ok: true, note: "Synced a few seconds ago" };
    else { cache.put("webSync", "1", 30); out = sync_(true); }
  } else {
    out = { ok: true, app: "Sunshine Homes sheet sync", lastSync: PropertiesService.getScriptProperties().getProperty("LAST_SYNC") || "" };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------------------- firebase ---------------------------- */
function signIn_(password) {
  var res = UrlFetchApp.fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + FIREBASE.apiKey, {
    method: "post", contentType: "application/json", muteHttpExceptions: true,
    headers: { Referer: FIREBASE.referer },
    payload: JSON.stringify({ email: FIREBASE.email, password: password, returnSecureToken: true }),
  });
  var j = JSON.parse(res.getContentText() || "{}");
  if (j.idToken) { CacheService.getScriptCache().put("idToken", j.idToken, 3000); return j.idToken; }
  var msg = (j.error && j.error.message) || ("HTTP " + res.getResponseCode());
  if (/INVALID_PASSWORD|INVALID_LOGIN_CREDENTIALS/.test(msg)) msg = "wrong committee password";
  else if (/TOO_MANY_ATTEMPTS/.test(msg)) msg = "too many wrong attempts — wait a few minutes";
  else if (/EMAIL_NOT_FOUND/.test(msg)) msg = "the committee login doesn't exist in Firebase";
  throw new Error(msg);
}

function token_(fresh) {
  var cached = !fresh && CacheService.getScriptCache().get("idToken");
  if (cached) return cached;
  var pw = PropertiesService.getScriptProperties().getProperty("COMMITTEE_PASSWORD");
  if (!pw) throw new Error("not connected — use 🌇 Sunshine Homes → 1. Connect to the app");
  return signIn_(pw);
}

function firestore_(path, opts) {
  var url = "https://firestore.googleapis.com/v1/projects/" + FIREBASE.projectId + "/databases/(default)/documents/" + path;
  for (var attempt = 0; attempt < 2; attempt++) {
    var o = opts || {};
    var res = UrlFetchApp.fetch(url, {
      method: o.method || "get", contentType: "application/json", muteHttpExceptions: true,
      headers: { Authorization: "Bearer " + token_(attempt > 0), Referer: FIREBASE.referer },
      payload: o.payload ? JSON.stringify(o.payload) : undefined,
    });
    var code = res.getResponseCode();
    if ((code === 401 || code === 403) && attempt === 0) continue;   // token expired → log in again
    if (code >= 300) throw new Error("database answered " + code + ": " + res.getContentText().slice(0, 160));
    return JSON.parse(res.getContentText() || "{}");
  }
}

// All app data: { config, payments, approvals, users, ledger, ... }, plus the raw text for change detection.
function readAll_() {
  var j = firestore_(COLL + "?pageSize=100");
  var data = {}, raw = [];
  (j.documents || []).forEach(function (d) {
    var key = d.name.split("/").pop();
    if (key === "sheetSync") return;
    var v = d.fields && d.fields.v && d.fields.v.stringValue;
    if (!v) return;
    raw.push(key + "=" + v);
    try { data[key] = JSON.parse(v); } catch (e) {}
  });
  raw.sort();
  return { data: data, raw: raw.join("\n") };
}

function writeStatus_(status) {
  firestore_(COLL + "/sheetSync?updateMask.fieldPaths=v&updateMask.fieldPaths=at", {
    method: "patch",
    payload: { fields: { v: { stringValue: JSON.stringify(status) }, at: { integerValue: String(Date.now()) } } },
  });
}

/* ------------------------------ sync ------------------------------ */
function sync_(force) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return { ok: false, error: "another sync is running — try again in a minute" };
  var props = PropertiesService.getScriptProperties();
  var ss = null;
  try {
    var id = props.getProperty("SHEET_ID");
    ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
    var all = readAll_();
    var hash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, all.raw));
    var now = Date.now();
    var lastFull = +props.getProperty("LAST_FULL") || 0;
    var lastStatus = +props.getProperty("LAST_STATUS") || 0;
    // Nothing changed: skip rewriting (but refresh every 6 hours so "outstanding" stays current).
    if (!force && hash === props.getProperty("LAST_HASH") && now - lastFull < 6 * 3600000) {
      if (now - lastStatus > 30 * 60000) { writeStatus_(statusObj_(ss, props, null)); props.setProperty("LAST_STATUS", String(now)); }
      return { ok: true, skipped: true };
    }
    var counts = writeSheets_(ss, all.data);
    props.setProperties({ LAST_HASH: hash, LAST_FULL: String(now), LAST_STATUS: String(now), LAST_SYNC: new Date(now).toISOString(), LAST_COUNTS: JSON.stringify(counts) });
    try { writeStatus_(statusObj_(ss, props, null)); } catch (e) { /* the sheet is still up to date */ }
    return { ok: true, counts: counts.payments + " payments, " + counts.ledger + " expense/income entries, " + counts.residents + " residents" };
  } catch (e) {
    var msg = String(e && e.message || e);
    try { if (ss) ss.getSheetByName("Summary") && ss.getSheetByName("Summary").getRange("A2").setValue("⚠ Last sync failed " + Utilities.formatDate(new Date(), TZ, "dd-MMM-yyyy HH:mm") + ": " + msg); } catch (x) {}
    try { writeStatus_(statusObj_(ss, props, msg)); } catch (x) {}
    return { ok: false, error: msg };
  } finally {
    lock.releaseLock();
  }
}

function statusObj_(ss, props, error) {
  var url = "";
  try { url = ScriptApp.getService().getUrl() || ""; } catch (e) {}
  return {
    at: Date.now(),
    url: ss ? ss.getUrl() : "",
    webAppUrl: url && /\/exec$/.test(url) ? url : "",
    rows: JSON.parse(props.getProperty("LAST_COUNTS") || "{}"),
    error: error || "",
  };
}

/* ----------------------------- sheets ----------------------------- */
function writeSheets_(ss, d) {
  var cfg = d.config || {};
  var monthly = +cfg.monthlyAmount || 800;
  var approvals = d.approvals || {};
  var tStatus = d.ticketStatus || {};
  var users = d.users || {};
  var ledger = (d.ledger || []).slice();
  var payments = (d.payments || []).map(function (p) {
    var a = approvals[p.id] || {};
    return Object.assign({}, p, { status: a.status || "pending", decidedAt: a.at || "" });
  }).sort(function (a, b) { return (a.submittedAt || 0) - (b.submittedAt || 0); });
  var memberStatus = function (ph) {
    var a = approvals["member:" + ph];
    return a && a.status ? a.status : (cfg.memberApproval ? "pending" : "approved");
  };
  var year = +Utilities.formatDate(new Date(), TZ, "yyyy");
  var curMonth = +Utilities.formatDate(new Date(), TZ, "M") - 1;
  var residentsOf = function (flat) {
    return Object.keys(users).map(function (k) { return users[k]; })
      .filter(function (u) { return u.flat === flat && memberStatus(u.phone) === "approved"; })
      .map(function (u) { return u.name; }).join(", ");
  };
  var statusOf = function (flat, key) {
    var list = payments.filter(function (p) { return p.flat === flat && p.month === key; });
    return list.length ? list[list.length - 1].status : "none";
  };
  var approvedSum = function (filter) {
    return payments.filter(function (p) { return p.status === "approved" && filter(p); }).reduce(function (s, p) { return s + (+p.amount || 0); }, 0);
  };
  var ledSum = function (kind, filter) {
    return ledger.filter(function (e) { return e.kind === kind && filter(e); }).reduce(function (s, e) { return s + (+e.amount || 0); }, 0);
  };
  var from = cfg.openingDate || "";
  var ymdOf = function (t) { return t ? Utilities.formatDate(new Date(t), TZ, "yyyy-MM-dd") : ""; };
  var balance = (+cfg.openingBalance || 0)
    + approvedSum(function (p) { return ymdOf(p.decidedAt || p.submittedAt) >= from; })
    + ledSum("income", function (e) { return e.date >= from; })
    - ledSum("expense", function (e) { return e.date >= from; });
  var inYear = function (s) { return String(s).slice(0, 4) === String(year); };
  var maintYear = approvedSum(function (p) { return inYear(p.month); });
  var incYear = ledSum("income", function (e) { return inYear(e.date); });
  var outYear = ledSum("expense", function (e) { return inYear(e.date); });
  var userList = Object.keys(users).map(function (k) { return users[k]; })
    .sort(function (a, b) { return FLATS.indexOf(a.flat) - FLATS.indexOf(b.flat) || String(a.name).localeCompare(String(b.name)); });

  /* Summary */
  var sum = sheet_(ss, "Summary", 0);
  sum.clear();
  var rows = [
    ["Sunshine Homes Apartment — live records from the app", ""],
    ["Last synced: " + Utilities.formatDate(new Date(), TZ, "dd-MMM-yyyy HH:mm") + " (updates every 5 minutes)", ""],
    ["Read-only copy. Make all entries in the app (raghuslogiclab.com/apps/sunshine-homes) — anything typed here is replaced at the next sync.", ""],
    ["", ""],
    ["Key figures", ""],
    ["Flats", FLATS.length],
    ["Registered residents", userList.filter(function (u) { return memberStatus(u.phone) === "approved"; }).length],
    ["New residents waiting for approval", userList.filter(function (u) { return memberStatus(u.phone) === "pending"; }).length],
    ["Monthly maintenance per flat", monthly],
    ["Maintenance collected " + year, maintYear],
    ["Other income " + year, incYear],
    ["Expenses " + year, outYear],
    ["Surplus / deficit " + year, maintYear + incYear - outYear],
    ["Opening balance" + (from ? " on " + from : ""), +cfg.openingBalance || 0],
    ["Balance in hand", balance],
    ["Payments awaiting approval", payments.filter(function (p) { return p.status === "pending"; }).length],
    ["Open complaints", (d.tickets || []).filter(function (t) { return (tStatus[t.id] || "open") !== "resolved"; }).length],
  ];
  sum.getRange(1, 1, rows.length, 2).setValues(rows);
  sum.getRange("A1").setFontSize(15).setFontWeight("bold").setFontColor(TEAL);
  sum.getRange("A2:A3").setFontColor("#5b6b73").setFontStyle("italic");
  sum.getRange("A5").setFontWeight("bold").setFontSize(12);
  sum.getRange("B9:B15").setNumberFormat(RUPEE);
  sum.getRange("A15:B15").setFontWeight("bold");
  var mHead = ["Month " + year, "Maintenance collected", "Other income", "Total in", "Expenses", "Net"];
  var mRows = MONTHS.map(function (m, i) {
    var k = year + "-" + ("0" + (i + 1)).slice(-2);
    var a = approvedSum(function (p) { return p.month === k; });
    var b = ledSum("income", function (e) { return String(e.date).slice(0, 7) === k; });
    var c = ledSum("expense", function (e) { return String(e.date).slice(0, 7) === k; });
    return [m, a, b, a + b, c, a + b - c];
  });
  mRows.push(["Total", maintYear, incYear, maintYear + incYear, outYear, maintYear + incYear - outYear]);
  var top = rows.length + 2;
  table_(sum, top, 1, mHead, mRows, { money: [2, 3, 4, 5, 6] });
  sum.getRange(top + mRows.length, 1, 1, 6).setFontWeight("bold");
  var cats = {};
  ledger.filter(function (e) { return e.kind === "expense" && inYear(e.date); }).forEach(function (e) { cats[e.cat] = (cats[e.cat] || 0) + (+e.amount || 0); });
  var cRows = Object.keys(cats).map(function (k) { return [k, cats[k], outYear ? cats[k] / outYear : 0]; }).sort(function (a, b) { return b[1] - a[1]; });
  var top2 = top + mRows.length + 2;
  table_(sum, top2, 1, ["Expenses by category " + year, "Amount", "Share"], cRows.length ? cRows : [["(no expenses yet)", "", ""]], { money: [2] });
  if (cRows.length) sum.getRange(top2 + 1, 3, cRows.length, 1).setNumberFormat("0.0%");
  sum.setColumnWidth(1, 300); sum.setColumnWidths(2, 5, 140);

  /* Maintenance Payments */
  var pRows = payments.map(function (p, i) {
    return ["RCPT-" + ("000" + (i + 1)).slice(-4), p.flat, monthName_(p.month), +p.amount || 0, p.payer || "", p.phone ? "+91 " + p.phone : "",
      p.ref || "", date_(p.submittedAt), LABEL[p.status] || p.status, date_(p.decidedAt)];
  });
  writeTab_(ss, "Maintenance Payments", 1,
    ["Receipt no.", "Flat", "For month", "Amount (₹)", "Paid by", "Mobile", "UPI ref", "Submitted on", "Status", "Approved / rejected on"],
    pRows, { money: [4], stamp: [8, 10], widths: [95, 60, 85, 90, 160, 120, 140, 130, 80, 150] });

  /* Dues per year (current year + any earlier year with payments, newest first, at most 3) */
  var years = {};
  years[year] = true;
  payments.forEach(function (p) { var y = +String(p.month).slice(0, 4); if (y && y <= year) years[y] = true; });
  var yList = Object.keys(years).map(Number).sort(function (a, b) { return b - a; }).slice(0, 3);
  var pos = 2;
  yList.forEach(function (y) {
    var dRows = FLATS.map(function (f) {
      var owed = 0, paid = 0;
      var cells = MONTHS.map(function (m, i) {
        var s = statusOf(f, y + "-" + ("0" + (i + 1)).slice(-2));
        var due = y < year || i <= curMonth;
        if (s === "approved") paid++; else if (due) owed += monthly;
        return s === "none" ? (due ? "Due" : "") : (LABEL[s] || s);
      });
      return [f, residentsOf(f)].concat(cells).concat([paid, owed]);
    });
    var sh = writeTab_(ss, "Dues " + y, pos++, ["Flat", "Residents"].concat(MONTHS).concat(["Months paid", "Outstanding (₹)"]), dRows,
      { money: [16], widths: [60, 200, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 62, 90, 120] });
    colourDues_(sh, dRows.length);
  });

  /* Expenses & Income */
  ledger.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.at || 0) - (b.at || 0); });
  var lRows = ledger.map(function (e) {
    return [e.voucher || "", day_(e.date), e.kind === "income" ? "Income" : "Expense", e.cat || "", e.desc || "", e.party || "", e.mode || "", e.ref || "",
      e.kind === "income" ? +e.amount || 0 : "", e.kind === "expense" ? +e.amount || 0 : "", date_(e.at)];
  });
  if (lRows.length) lRows.push(["", "", "", "", "Total", "", "", "", ledSum("income", function () { return true; }), ledSum("expense", function () { return true; }), ""]);
  var lsh = writeTab_(ss, "Expenses & Income", pos++,
    ["Voucher", "Date", "Type", "Category", "Description", "Paid to / received from", "Mode", "Bill / ref", "In (₹)", "Out (₹)", "Entered on"],
    lRows, { money: [9, 10], day: [2], stamp: [11], widths: [85, 95, 70, 170, 220, 170, 90, 120, 90, 90, 130] });
  if (lRows.length) lsh.getRange(lRows.length + 1, 1, 1, 11).setFontWeight("bold").setBackground("#F2F6F7");

  /* Residents */
  writeTab_(ss, "Residents", pos++, ["Flat", "Name", "Mobile", "Role", "Status", "Registered on", "Last login"],
    userList.map(function (u) {
      var st = memberStatus(u.phone);
      return [u.flat, u.name, "+91 " + u.phone, u.role || "", st === "approved" ? "Approved" : st === "rejected" ? "Rejected" : "Waiting for approval", date_(u.createdAt), date_(u.lastLogin)];
    }), { stamp: [6, 7], widths: [60, 180, 130, 110, 150, 130, 130] });

  /* Complaints */
  writeTab_(ss, "Complaints", pos++, ["Raised on", "Flat", "Raised by", "Mobile", "Category", "Title", "Details", "Status"],
    (d.tickets || []).slice().sort(function (a, b) { return a.at - b.at; }).map(function (t) {
      return [date_(t.at), t.flat, t.by || "", t.phone ? "+91 " + t.phone : "", t.cat || "", t.title || "", t.desc || "", LABEL[tStatus[t.id] || "open"]];
    }), { stamp: [1], widths: [130, 60, 140, 120, 100, 200, 280, 90] });

  /* Notices, Visitors, Bookings */
  writeTab_(ss, "Notices", pos++, ["Posted on", "Category", "Title", "Message"],
    (d.notices || []).slice().sort(function (a, b) { return a.at - b.at; }).map(function (n) { return [date_(n.at), n.cat || "", n.title || "", n.body || ""]; }),
    { stamp: [1], widths: [130, 100, 220, 420] });
  writeTab_(ss, "Visitors", pos++, ["Created on", "Flat", "Visitor", "Purpose", "Gate code", "Status"],
    (d.visitors || []).slice().sort(function (a, b) { return a.at - b.at; }).map(function (v) { return [date_(v.at), v.flat, v.name || "", v.purpose || "", v.code || "", v.status === "arrived" ? "Arrived" : "Expected"]; }),
    { stamp: [1], widths: [130, 60, 180, 130, 80, 90] });
  writeTab_(ss, "Bookings", pos++, ["Date", "Facility", "Slot", "Flat", "Booked on"],
    (d.bookings || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (b) { return [day_(b.date), b.fac || "", b.slot || "", b.flat, date_(b.at)]; }),
    { day: [1], stamp: [5], widths: [100, 130, 140, 60, 130] });

  // remove the empty starter tab
  var s1 = ss.getSheetByName("Sheet1");
  if (s1 && ss.getSheets().length > 1 && s1.getLastRow() === 0) ss.deleteSheet(s1);
  return { payments: pRows.length, ledger: ledger.length, residents: userList.length };
}

/* ----------------------------- helpers ---------------------------- */
function sheet_(ss, name, index) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name, Math.min(index, ss.getSheets().length));
    try { sh.protect().setDescription("Filled by the Sunshine Homes app — make entries in the app").setWarningOnly(true); } catch (e) {}
  }
  return sh;
}

function writeTab_(ss, name, index, head, rows, opt) {
  var sh = sheet_(ss, name, index);
  sh.clear();
  if (sh.getFilter()) sh.getFilter().remove();
  table_(sh, 1, 1, head, rows.length ? rows : [["(no entries yet)"].concat(head.slice(1).map(function () { return ""; }))], opt);
  sh.setFrozenRows(1);
  if (rows.length) sh.getRange(1, 1, rows.length + 1, head.length).createFilter();
  (opt.widths || []).forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  return sh;
}

function table_(sh, r, c, head, rows, opt) {
  sh.getRange(r, c, 1, head.length).setValues([head]).setFontWeight("bold").setBackground(TEAL).setFontColor("#FFFFFF").setWrap(true);
  if (!rows.length) return;
  sh.getRange(r + 1, c, rows.length, head.length).setValues(rows);
  var fmt = function (cols, f) { (cols || []).forEach(function (k) { sh.getRange(r + 1, c + k - 1, rows.length, 1).setNumberFormat(f); }); };
  fmt(opt.money, RUPEE); fmt(opt.stamp, STAMP); fmt(opt.day, DAY);
}

function colourDues_(sh, n) {
  if (!n) return;
  var rng = sh.getRange(2, 3, n, 12);
  var rule = function (text, bg, fg) { return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(text).setBackground(bg).setFontColor(fg).setRanges([rng]).build(); };
  sh.setConditionalFormatRules([
    rule("Paid", "#E5F4EA", "#16A34A"), rule("Pending", "#FCEFD4", "#B7791F"),
    rule("Rejected", "#FDE8E8", "#C53030"), rule("Due", "#FDE8E8", "#C53030"),
  ]);
  rng.setHorizontalAlignment("center");
}

function date_(t) { return t ? new Date(+t) : ""; }
function day_(s) { return s ? Utilities.parseDate(String(s), TZ, "yyyy-MM-dd") : ""; }
function monthName_(k) { return k ? MONTHS[+String(k).slice(5, 7) - 1] + " " + String(k).slice(0, 4) : ""; }
