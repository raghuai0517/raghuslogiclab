/*
  Pahani Village Report — page script. © RLL – RaghusLogicLab. All rights reserved.
  Reads the Pahani in the browser (HTML-table .xls from Webland, or real .xls/.xlsx/.csv via SheetJS),
  shows a preview, and writes the Excel (ExcelJS), the PDF (pdfmake, real text) or a print layout.
  The Pahani itself is never uploaded. Excel: paid through Razorpay via the rll-pay worker (/pahani/*), which
  returns the key that opens xl.enc (the Excel writer). PDF / print: admin only; the admin key opens adm.enc.
*/
(function () {
  "use strict";
  var C = window.PahaniCore;
  var $ = function (id) { return document.getElementById(id); };
  var state = { model: null, spec: null, fileName: "", fileBuf: null, fileType: "", sheet: 0, cancel: false, busy: false, pdfSel: null,
    admin: null, price: null, ready: false };
  var LS = "rll.pahani.meta";
  var FIELDS = ["mandal", "district", "vro", "vs"];

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function today() { var d = new Date(); return pad(d.getDate()) + "-" + pad(d.getMonth() + 1) + "-" + d.getFullYear(); }
  function lsGet() { try { return JSON.parse(localStorage.getItem(LS) || "{}") || {}; } catch (e) { return {}; } }
  function lsSet(o) { try { localStorage.setItem(LS, JSON.stringify(o)); } catch (e) {} }
  function raf() { return new Promise(function (r) { requestAnimationFrame(function () { setTimeout(r, 0); }); }); }
  function track(name) { try { if (window.RLLT) window.RLLT.ev("download", name); } catch (e) {} }

  function status(msg, ok) {
    var s = $("status"); s.innerHTML = msg; s.className = "status show" + (ok ? " ok" : "");
  }
  var scripts = {};
  function loadScript(src) {
    if (!scripts[src]) scripts[src] = new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = src; s.onload = res;
      s.onerror = function () { delete scripts[src]; rej(new Error("Could not load " + src + ". Check your internet connection and try again.")); };
      document.head.appendChild(s);
    });
    return scripts[src];
  }

  /* ---------- meta ---------- */
  (function initMeta() {
    var o = lsGet();
    FIELDS.forEach(function (k) { if (o[k]) $("m-" + k).value = o[k]; });
    if (o.mask === false) $("m-mask").checked = false;
    $("m-date").value = today();
  })();
  function meta() {
    return {
      village: $("m-village").value.trim() || "Village", mandal: $("m-mandal").value.trim(), district: $("m-district").value.trim(),
      date: $("m-date").value.trim() || today(), vro: $("m-vro").value.trim(), vs: $("m-vs").value.trim(), maskAadhaar: $("m-mask").checked
    };
  }
  var tmr = null;
  function onMeta() {
    var o = lsGet(); FIELDS.forEach(function (k) { o[k] = $("m-" + k).value.trim(); }); o.mask = $("m-mask").checked; lsSet(o);
    if (!state.model) return;
    clearTimeout(tmr); tmr = setTimeout(rebuild, 250);
  }
  ["village", "mandal", "district", "date", "vro", "vs"].forEach(function (k) { $("m-" + k).addEventListener("input", onMeta); });
  $("m-mask").addEventListener("change", onMeta);

  function villageFromName(n) {
    var s = n.replace(/\.[^.]+$/, "").replace(/^[0-9a-f]{8}-/i, "")
      .replace(/(pahani|pahane|adangal|adangals|report|village|data|final|copy)/ig, " ").replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();
    return s ? s.toUpperCase() : "";
  }

  /* ---------- reading the file ---------- */
  function decodeText(buf) {
    var b = new Uint8Array(buf);
    var enc = (b[0] === 0xff && b[1] === 0xfe) ? "utf-16le" : (b[0] === 0xfe && b[1] === 0xff) ? "utf-16be" : "utf-8";
    var t = new TextDecoder(enc).decode(buf);
    if (enc === "utf-8" && /\x00/.test(t.slice(0, 400))) t = new TextDecoder("utf-16le").decode(buf);
    return t;
  }
  function htmlRows(text) {
    var doc = new DOMParser().parseFromString(text, "text/html");
    var tables = Array.prototype.slice.call(doc.querySelectorAll("table"));
    tables.sort(function (a, b) { return b.rows.length - a.rows.length; });
    var out = [];
    for (var t = 0; t < tables.length; t++) {
      var rows = [];
      Array.prototype.forEach.call(tables[t].rows, function (tr) {
        var row = [];
        Array.prototype.forEach.call(tr.cells, function (td) {
          var c = td.cloneNode(true);
          Array.prototype.forEach.call(c.querySelectorAll("br"), function (br) { br.replaceWith("\n"); });
          row.push(c.textContent);
          for (var k = 1; k < (td.colSpan || 1); k++) row.push("");
        });
        rows.push(row);
      });
      out.push(rows);
    }
    return out;
  }
  async function sheetRows(buf) {
    await loadScript("lib/xlsx.full.min.js");
    var wb = XLSX.read(buf, { type: "array", cellDates: false });
    return wb.SheetNames.map(function (n) { return XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: "" }); });
  }
  async function readBuf(buf) {
    var b = new Uint8Array(buf.slice(0, 8));
    var binary = (b[0] === 0x50 && b[1] === 0x4b) || (b[0] === 0xd0 && b[1] === 0xcf);
    var candidates = [];
    if (!binary) {
      var text = decodeText(buf);
      if (/<table/i.test(text)) candidates = htmlRows(text);
    }
    if (!candidates.length) candidates = await sheetRows(buf);
    var err = null;
    for (var i = 0; i < candidates.length; i++) {
      try { return C.rowsToModel(candidates[i]); } catch (e) { err = e; }
    }
    throw err || new Error("No table found in this file.");
  }

  async function handleFile(file) {
    if (!file || state.busy) return false;
    state.fileName = file.name;
    status("Reading <b>" + esc(file.name) + "</b> …");
    try {
      var buf = await file.arrayBuffer();
      var m = await readBuf(buf);
      state.fileBuf = buf; state.fileType = file.type || "";
      state.model = m;
      var v = villageFromName(file.name);
      if (v) $("m-village").value = v;
      state.sheet = 0; state.pdfSel = null;
      rebuild();
      status("✔ Read <b>" + esc(file.name) + "</b>: " + m.surveys.length.toLocaleString("en-IN") + " survey numbers, " + m.recs.length.toLocaleString("en-IN") + " entries. Check the details in step 2, then download.", true);
      $("result").hidden = false;
      $("result").scrollIntoView({ behavior: "smooth", block: "start" });
      return true;
    } catch (e) {
      console.error(e);
      state.model = null; $("result").hidden = true;
      status("✖ " + esc(e.message || e) + "<br><span class='te'>ఈ ఫైల్ చదవలేకపోయాం. వెబ్‌ల్యాండ్ / మీభూమి నుండి డౌన్‌లోడ్ చేసిన పహాణీ ఫైల్‌ను అప్‌లోడ్ చేయండి.</span>");
      return false;
    }
  }
  $("file").addEventListener("change", function (e) { handleFile(e.target.files[0]); e.target.value = ""; });
  var drop = $("drop");
  ["dragenter", "dragover"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (e) { var f = e.dataTransfer && e.dataTransfer.files[0]; if (f) handleFile(f); });

  /* ---------- formatting ---------- */
  var fmt = C.fmt;
  function kvTable(b) {
    return {
      type: "table", title: b.title,
      cols: [{ en: "Sl.No", te: "క్ర.సం", w: 6 }, { en: "Item", te: "అంశం (English)", w: 40 }, { en: "అంశం", te: "తెలుగు", w: 36 }, { en: "Value", te: "విలువ", w: 22, f: "kv" }],
      rows: b.rows.map(function (r, i) { return [i + 1, r[0], r[1], fmt(r[2], r[3])]; })
    };
  }

  /* ---------- preview ---------- */
  function rebuild() {
    if (!state.model) return;
    state.spec = C.buildSpec(state.model, meta());
    renderCards(); renderPdfOpts(); renderSheetBar(); renderPreview();
  }
  function renderCards() {
    var sp = state.spec, T = sp.totals, sum = sp.sheets[0].blocks;
    var grp = {}; sum[2].rows.forEach(function (r) { grp[r[1]] = r[5]; });
    var cards = [
      [sp.counts.surveys.toLocaleString("en-IN"), "Survey numbers", "సర్వే నెంబర్లు"],
      [sp.counts.entries.toLocaleString("en-IN"), "Entries", "నమోదులు"],
      [T.ext.toFixed(2), "Total extent (Ac)", "మొత్తం విస్తీర్ణం (ఎ.)"],
      [(grp["Government lands"] || 0).toFixed(2), "Government land (Ac)", "ప్రభుత్వ భూమి (ఎ.)"],
      [(grp["Private – Patta"] || 0).toFixed(2), "Patta land (Ac)", "పట్టా భూమి (ఎ.)"],
      ["₹ " + fmt(T.sist, "rs"), "Total sist", "మొత్తం శిస్తు"],
      [sp.counts.khatas.toLocaleString("en-IN"), "Khatas", "ఖాతాలు"],
      [sp.counts.flagged.toLocaleString("en-IN"), "Entries with remarks", "వ్యాఖ్యలున్న నమోదులు"]
    ];
    $("cards").innerHTML = cards.map(function (c) { return '<div class="card"><b>' + esc(c[0]) + "</b><span>" + esc(c[1]) + '</span><span class="te">' + esc(c[2]) + "</span></div>"; }).join("");
  }
  function renderPdfOpts() {
    var sh = state.spec.sheets;
    if (!state.pdfSel || state.pdfSel.length !== sh.length) state.pdfSel = sh.map(function () { return true; });
    $("pdfopts").innerHTML = sh.map(function (s, i) {
      return '<label><input type="checkbox" data-i="' + i + '"' + (state.pdfSel[i] ? " checked" : "") + "> " + esc(s.name) + "</label>";
    }).join("");
  }
  $("pdfopts").addEventListener("change", function (e) { var i = +e.target.dataset.i; if (!isNaN(i)) state.pdfSel[i] = e.target.checked; });
  function sheetCount(s) { var n = 0; s.blocks.forEach(function (b) { if (b.detail) n = b.rows.length; }); return n; }
  function renderSheetBar() {
    $("sheetbar").innerHTML = state.spec.sheets.map(function (s, i) {
      var n = sheetCount(s);
      return '<button type="button" data-i="' + i + '" class="' + (i === state.sheet ? "on" : "") + '">' + esc(s.name) + (n ? "<small>" + n.toLocaleString("en-IN") + "</small>" : "") + "</button>";
    }).join("");
  }
  $("sheetbar").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    state.sheet = +b.dataset.i; renderSheetBar(); renderPreview();
  });
  function htmlTable(b, limit) {
    var h = '<table class="t"><thead><tr>' + b.cols.map(function (c) { return "<th>" + esc(c.en) + "<small>" + esc(c.te) + "</small></th>"; }).join("") + "</tr></thead><tbody>";
    var rows = limit ? b.rows.slice(0, limit) : b.rows;
    h += rows.map(function (r, j) {
      return '<tr class="' + (b.flags && b.flags[j] ? "flag" : "") + '">' + r.map(function (v, ci) {
        var c = b.cols[ci]; return '<td class="' + (c.f ? "n" : "") + (c.rem ? " rem" : "") + '">' + esc(c.f === "kv" ? v : fmt(v, c.f)) + "</td>";
      }).join("") + "</tr>";
    }).join("");
    if (b.total && (!limit || b.rows.length <= limit)) h += '<tr class="tot">' + b.total.map(function (v, ci) { var c = b.cols[ci]; return '<td class="' + (c.f ? "n" : "") + '">' + esc(fmt(v, c.f)) + "</td>"; }).join("") + "</tr>";
    return h + "</tbody></table>";
  }
  function renderPreview() {
    var s = state.spec.sheets[state.sheet], LIM = state.admin ? 200 : 25, h = "";
    h += '<div class="muted" style="margin:4px 0 8px"><b>' + esc(s.title[0]) + '</b> · <span class="te">' + esc(s.title[1]) + "</span>" + (s.line ? "<br>" + esc(s.line) : "") + "</div>";
    s.blocks.forEach(function (b) {
      if (b.type === "kv") b = kvTable(b);
      if (b.title) h += '<h3 class="bt">' + esc(b.title) + "</h3>";
      h += '<div class="tw">' + htmlTable(b, b.detail ? LIM : 0) + "</div>";
      if (b.detail && b.rows.length > LIM) h += '<p class="muted">Showing the first ' + LIM + " of " + b.rows.length.toLocaleString("en-IN") + " rows here. The Excel has all rows. <span class='te'>మొదటి " + LIM + " వరుసలు మాత్రమే చూపబడుతున్నాయి; అన్నీ ఎక్సెల్‌లో ఉంటాయి.</span></p>";
      if (b.note) h += '<p class="muted">' + esc(b.note) + "</p>";
    });
    $("preview").innerHTML = h;
  }

  /* ---------- overlay ---------- */
  function ov(show, title, sub, frac) {
    $("overlay").className = show ? "show" : "";
    if (title != null) $("ov-t").textContent = title;
    if (sub != null) $("ov-s").textContent = sub;
    $("ov-bar").style.width = Math.round((frac || 0) * 100) + "%";
  }
  $("ov-cancel").addEventListener("click", function () { state.cancel = true; });
  function setBusy(b) { state.busy = b; ["b-xlsx", "b-pdf", "b-print"].forEach(function (id) { $(id).disabled = b; }); }
  function baseName() { return (meta().village.replace(/[^\wఀ-౿]+/g, "_").replace(/^_+|_+$/g, "") || "Village") + "_Pahani_Report_RLL"; }
  function save(blob, name) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
    track(name);
  }


  /* ---------- unlock the encrypted bundles (xl.enc: Excel writer, adm.enc: PDF + print) ---------- */
  var ENC_V = "1";
  var unlocked = {};
  function hexBytes(h) { var o = new Uint8Array(h.length / 2); for (var i = 0; i < o.length; i++) o[i] = parseInt(h.substr(i * 2, 2), 16); return o; }
  async function unlock(name, keyHex) {
    if (unlocked[name]) return;
    if (!/^[0-9a-f]{64}$/.test(String(keyHex || ""))) throw new Error("No unlock key");
    if (!(window.crypto && crypto.subtle)) throw new Error("This browser cannot open the download. Please use Chrome.");
    var r = await fetch(name + ".enc?v=" + ENC_V, { cache: "no-cache" });
    if (!r.ok) throw new Error("Could not load the download module.");
    var buf = await r.arrayBuffer();
    var key = await crypto.subtle.importKey("raw", hexBytes(keyHex), "AES-GCM", false, ["decrypt"]);
    var plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(buf.slice(0, 12)) }, key, buf.slice(12));
    (new Function(new TextDecoder().decode(plain)))();
    unlocked[name] = true;
  }

  /* ---------- rll-pay worker ---------- */
  var PCFG = window.RLL_PAY_CONFIG || {};
  var TEST = /[?&]paytest=1(&|$)/.test(location.search);
  var API = String((TEST ? PCFG.testApiUrl : PCFG.apiUrl) || PCFG.apiUrl || "").trim().replace(/\/+$/, "");
  function api(path, opt) {
    opt = opt || {};
    var h = { "Content-Type": "application/json" };
    if (opt.token) h.Authorization = "Bearer " + opt.token;
    return fetch(API + path, { method: opt.body ? "POST" : "GET", headers: h, body: opt.body ? JSON.stringify(opt.body) : undefined, cache: "no-store" })
      .then(function (r) { return r.json(); });
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function jget(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function jset(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var PENDING = "rll.pahani.pending", PAID = "rll.pahani.paid", ADMTOK = "rll.pahani.admintok";
  var DAYMS = 86400000;
  function rupees(n) { return "₹" + Number(n).toLocaleString("en-IN"); }

  function fingerprint() {
    var sp = state.spec, s = sp.counts.surveys + "|" + sp.counts.entries + "|" + sp.totals.ext.toFixed(4) + "|" + sp.totals.sist.toFixed(2) + "|" + state.model.recs.slice(0, 5).map(function (r) { return r.survey; }).join(",");
    var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  /* file kept in this browser (IndexedDB) while the customer pays, so a page reload after PhonePe / GPay can finish the download */
  function idb(mode, fn) {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error("no idb"));
      var o = indexedDB.open("rll-pahani", 1);
      o.onupgradeneeded = function () { o.result.createObjectStore("f"); };
      o.onerror = function () { rej(o.error); };
      o.onsuccess = function () {
        var tx = o.result.transaction("f", mode), st = tx.objectStore("f"), q = fn(st);
        tx.oncomplete = function () { res(q && q.result); o.result.close(); };
        tx.onerror = function () { rej(tx.error); };
      };
    });
  }
  function keepFile() { return idb("readwrite", function (st) { return st.put({ name: state.fileName, type: state.fileType, buf: state.fileBuf, meta: meta(), at: Date.now() }, "last"); }).catch(function () {}); }
  function keptFile() { return idb("readonly", function (st) { return st.get("last"); }).catch(function () { return null; }); }
  function dropFile() { return idb("readwrite", function (st) { return st.delete("last"); }).catch(function () {}); }

  /* ---------- Excel price / buttons ---------- */
  function paintButtons() {
    var x = $("b-xlsx"), adm = !!state.admin;
    x.innerHTML = adm ? '⬇ Download Excel <span class="te">ఎక్సెల్</span> <small style="opacity:.8">(admin · free)</small>'
      : state.ready && state.price ? "⬇ Pay " + rupees(state.price) + ' &amp; Download Excel <span class="te">చెల్లించి ఎక్సెల్ పొందండి</span>'
      : '⬇ Download Excel <span class="te">ఎక్సెల్</span>';
    $("b-pdf").hidden = !adm; $("b-print").hidden = !adm; $("pdfwrap").hidden = !adm;
    $("paynote").hidden = adm;
    $("paynote").innerHTML = state.ready && state.price
      ? "Pay " + rupees(state.price) + " once by UPI (PhonePe, Google Pay, Paytm), card or net banking through Razorpay. The Excel downloads by itself after payment. If the download fails, download the same village again free for 24 hours on this phone / computer. <span class='te'>ఒకసారి " + rupees(state.price) + " చెల్లిస్తే ఈ గ్రామ ఎక్సెల్ వస్తుంది; 24 గంటలలో మళ్ళీ ఉచితంగా డౌన్‌లోడ్ చేసుకోవచ్చు.</span>"
      : "Online payment is not available right now. Please try again in a little while. <span class='te'>చెల్లింపు ప్రస్తుతం అందుబాటులో లేదు; కొద్దిసేపటి తర్వాత ప్రయత్నించండి.</span>";
    $("adminbar").hidden = !adm;
    if (adm) { $("adm-price").value = state.admin.price; $("adm-who").textContent = state.admin.email || "admin"; }
    $("adm-open").textContent = adm ? "Admin ✔" : "Admin login";
  }
  function loadConfig() {
    if (!API) { state.ready = false; paintButtons(); return Promise.resolve(); }
    return api("/pahani/config").then(function (c) { state.ready = !!(c && c.ok && c.ready); state.price = c && c.price; paintButtons(); },
      function () { state.ready = false; paintButtons(); });
  }

  /* ---------- admin ---------- */
  function adminToken() {
    var t = jget(ADMTOK); if (t) return t;
    var s = jget("ap26.session"); return s && s.token && String(s.token).indexOf("demo.") !== 0 ? s.token : null;
  }
  function loadAdmin(tok) {
    tok = tok || adminToken();
    if (!tok || !API) return Promise.resolve(false);
    return api("/pahani/admin", { token: tok }).then(function (r) {
      if (r && r.ok && r.admin) { state.admin = { token: tok, key: r.key, adminKey: r.adminKey, price: r.price, email: r.email }; state.price = r.price; state.ready = true; }
      else { state.admin = null; if (jget(ADMTOK) === tok) jset(ADMTOK, null); }
      paintButtons(); if (state.spec) { renderPreview(); }
      return !!state.admin;
    }, function () { return false; });
  }
  $("adm-open").addEventListener("click", function () {
    if (state.admin) { $("adminbar").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    $("adminlogin").hidden = !$("adminlogin").hidden; if (!$("adminlogin").hidden) $("adm-pass").focus();
  });
  $("adm-login").addEventListener("click", async function () {
    var pw = $("adm-pass").value; if (!pw) return;
    $("adm-msg").textContent = "Checking…";
    try {
      var r = await api("/dsc/admin/login", { body: { password: pw } });
      if (r && r.ok && r.token) {
        jset(ADMTOK, r.token); $("adm-pass").value = "";
        if (await loadAdmin(r.token)) { $("adminlogin").hidden = true; $("adm-msg").textContent = ""; status("✔ Admin mode: PDF, Print and the Excel price are now available. Excel downloads are free for you.", true); }
        else $("adm-msg").textContent = "Signed in, but the Pahani payment settings are not switched on in the worker yet (PAHANI_KEY).";
      } else $("adm-msg").textContent = r && r.error === "locked" ? "Too many wrong tries. Wait 15 minutes." : r && r.error === "bad_password" ? "Wrong password." + (r.left != null ? " " + r.left + " tries left." : "") : "Could not sign in (" + ((r && r.error) || "error") + ").";
    } catch (e) { $("adm-msg").textContent = "Could not reach the server. Check internet and try again."; }
  });
  $("adm-pass").addEventListener("keydown", function (e) { if (e.key === "Enter") $("adm-login").click(); });
  $("adm-save").addEventListener("click", async function () {
    var v = Number($("adm-price").value);
    if (!(v >= 1 && v <= 100000)) { $("adm-pmsg").textContent = "Enter an amount from ₹1 to ₹1,00,000."; return; }
    $("adm-pmsg").textContent = "Saving…";
    try {
      var r = await api("/pahani/admin/config", { token: state.admin.token, body: { price: v } });
      if (r && r.ok) { state.admin.price = r.price; state.price = r.price; paintButtons(); $("adm-pmsg").textContent = "✔ Saved. Customers now pay " + rupees(r.price) + "."; }
      else $("adm-pmsg").textContent = r && r.error === "signed_out" ? "Session ended — sign in again." : "Could not save (" + ((r && r.error) || "error") + ").";
    } catch (e) { $("adm-pmsg").textContent = "Could not reach the server."; }
  });
  $("adm-out").addEventListener("click", function () { jset(ADMTOK, null); state.admin = null; paintButtons(); if (state.spec) renderPreview(); status("Signed out of admin mode.", true); });

  /* ---------- Excel (paid) ---------- */
  async function writeXl(key) {
    ov(true, "Building Excel…", "ఎక్సెల్ తయారవుతోంది", 0.3);
    await Promise.all([loadScript("lib/exceljs.min.js"), unlock("xl", key)]); ov(true, null, null, 0.6); await raf();
    var buf = await window.PahaniXL.writeExcel(window.ExcelJS, state.spec, meta());
    ov(true, null, null, 1);
    save(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), baseName() + ".xlsx");
    status("✔ Excel downloaded: <b>" + esc(baseName()) + ".xlsx</b> (" + state.spec.sheets.length + " sheets).", true);
  }
  function waitPaid(orderId, seconds) {
    var until = Date.now() + seconds * 1000;
    return (function loop() {
      return api("/pahani/status?order=" + encodeURIComponent(orderId)).then(function (s) {
        if (s && (s.key || s.status === "expired" || s.status === "used_up")) return s;
        if (Date.now() > until) return s || {};
        return wait(3000).then(loop);
      }, function () { return Date.now() > until ? {} : wait(3000).then(loop); });
    })();
  }
  var checkoutLoading = null;
  function loadCheckout() {
    if (typeof window.Razorpay === "function") return Promise.resolve();
    if (!checkoutLoading) checkoutLoading = loadScript("https://checkout.razorpay.com/v1/checkout.js").then(function () {
      if (typeof window.Razorpay !== "function") throw new Error("checkout_missing");
    }).catch(function (e) { checkoutLoading = null; throw e; });
    return checkoutLoading;
  }
  function paidDone(orderId, fp, key) {
    jset(PAID, { orderId: orderId, fp: fp, at: Date.now(), village: meta().village });
    jset(PENDING, null); dropFile();
    return writeXl(key);
  }
  function payAndDownload() {
    var fp = fingerprint();
    return api("/pahani/order", { body: { vid: window.RLLT && RLLT.vid ? RLLT.vid() : "", village: meta().village, surveys: state.spec.counts.surveys } })
      .then(function (o) {
        if (!o || !o.ok) throw new Error(o && o.error === "not_set" ? "Payments are being switched on. Please try again later." : "Could not start the payment (" + ((o && o.error) || "error") + ").");
        jset(PENDING, { orderId: o.orderId, fp: fp, at: Date.now() });
        return keepFile().then(loadCheckout).then(function () { return o; });
      })
      .then(function (o) {
        ov(false);
        return new Promise(function (resolve) {
          var done = false;
          function finish(s) { if (done) return; done = true; resolve(s || {}); }
          var rz = new window.Razorpay({
            key: o.keyId, order_id: o.orderId, amount: o.amount, currency: o.currency || "INR",
            name: "RaghusLogicLab", description: ("Pahani Excel · " + meta().village).slice(0, 60),
            theme: { color: "#b91c1c" },
            handler: function (resp) {
              ov(true, "Confirming payment…", "చెల్లింపు నిర్ధారిస్తున్నాం", 0.2);
              api("/pahani/verify", { body: { orderId: o.orderId, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature } })
                .then(function (v) { return v && v.key ? v : waitPaid(o.orderId, 90); }, function () { return waitPaid(o.orderId, 90); })
                .then(finish);
            },
            modal: { ondismiss: function () { waitPaid(o.orderId, 6).then(finish); } }
          });
          rz.open();
        }).then(function (s) {
          if (s.key) return paidDone(o.orderId, fp, s.key);
          status("Payment not completed. If money was taken, keep this page open or come back to it: the Excel downloads as soon as Razorpay confirms. <span class='te'>చెల్లింపు పూర్తి కాలేదు.</span>");
        });
      });
  }
  $("b-xlsx").addEventListener("click", async function () {
    if (!state.spec || state.busy) return;
    setBusy(true); state.cancel = false;
    try {
      if (state.admin) { await writeXl(state.admin.key); }
      else {
        var paid = jget(PAID), fp = fingerprint(), again = null;
        if (paid && paid.fp === fp && Date.now() - paid.at < DAYMS) {
          ov(true, "Checking your payment…", "", 0.2);
          again = await api("/pahani/status?order=" + encodeURIComponent(paid.orderId)).catch(function () { return null; });
        }
        if (again && again.key) await writeXl(again.key);
        else if (!state.ready) status("✖ Online payment is not available right now. Please try again in a little while.");
        else { ov(true, "Opening payment…", "చెల్లింపు తెరుస్తున్నాం", 0.2); await payAndDownload(); }
      }
    } catch (e) { console.error(e); status("✖ " + esc(e.message || e)); }
    ov(false); setBusy(false);
  });

  /* back from PhonePe / GPay: finish a paid order */
  async function resume() {
    var p = jget(PENDING);
    if (!p || !p.orderId || Date.now() - p.at > 2 * 3600000 || !API) { if (p) jset(PENDING, null); return; }
    status("Checking your payment… <span class='te'>మీ చెల్లింపు పరిశీలిస్తున్నాం…</span>");
    var s = await waitPaid(p.orderId, 25);
    if (!s.key) { status("Your last payment was not confirmed yet. If money was taken, reopen this page in a few minutes — the Excel downloads once Razorpay confirms."); return; }
    jset(PAID, { orderId: p.orderId, fp: p.fp, at: Date.now() }); jset(PENDING, null);
    var f = await keptFile();
    if (f && f.buf) {
      var file = new File([f.buf], f.name || "pahani.xls", { type: f.type || "" });
      if (await handleFile(file)) {
        if (f.meta) { ["village", "mandal", "district", "date", "vro", "vs"].forEach(function (k) { if (f.meta[k] != null) $("m-" + k).value = f.meta[k]; }); $("m-mask").checked = f.meta.maskAadhaar !== false; rebuild(); }
        if (fingerprint() === p.fp) { setBusy(true); try { await writeXl(s.key); dropFile(); } catch (e) { status("✖ " + esc(e.message || e)); } ov(false); setBusy(false); return; }
      }
    }
    status("✔ Payment received. Upload the same Pahani again and press Download Excel — it is free for 24 hours. <span class='te'>చెల్లింపు అందింది. అదే పహాణీని మళ్ళీ అప్‌లోడ్ చేసి ఎక్సెల్ డౌన్‌లోడ్ చేయండి.</span>", true);
  }

  /* ---------- PDF + print (admin only) ---------- */
  function selected() {
    var idx = []; state.pdfSel.forEach(function (on, i) { if (on) idx.push(i); });
    if (!idx.length) { status("✖ Tick at least one sheet for the PDF / print."); return null; }
    return idx;
  }
  var pdfFontsReady = null;
  function b64(buf) {
    var b = new Uint8Array(buf), out = "", CH = 0x8000;
    for (var i = 0; i < b.length; i += CH) out += String.fromCharCode.apply(null, b.subarray(i, i + CH));
    return btoa(out);
  }
  function pdfFonts() {
    if (!pdfFontsReady) pdfFontsReady = Promise.all(["fonts/RLLTelugu-Regular.ttf", "fonts/RLLTelugu-Bold.ttf"].map(function (u) {
      return fetch(u).then(function (r) { if (!r.ok) throw new Error("Could not load the Telugu font."); return r.arrayBuffer(); });
    })).then(function (bufs) {
      window.pdfMake.addVirtualFileSystem({ "RLLTelugu-Regular.ttf": b64(bufs[0]), "RLLTelugu-Bold.ttf": b64(bufs[1]) });
      window.pdfMake.addFonts({ RLL: { normal: "RLLTelugu-Regular.ttf", bold: "RLLTelugu-Bold.ttf", italics: "RLLTelugu-Regular.ttf", bolditalics: "RLLTelugu-Bold.ttf" } });
    }).catch(function (e) { pdfFontsReady = null; throw e; });
    return pdfFontsReady;
  }
  $("b-pdf").addEventListener("click", async function () {
    if (!state.spec || state.busy || !state.admin) return;
    var idx = selected(); if (!idx) return;
    setBusy(true); $("ov-cancel").hidden = true;
    ov(true, "Writing PDF…", "పీడీఎఫ్ తయారవుతోంది — a big village can take up to a minute", 0.15);
    try {
      await Promise.all([loadScript("lib/pdfmake.min.js"), unlock("adm", state.admin.adminKey)]); ov(true, null, null, 0.3);
      await pdfFonts(); ov(true, null, null, 0.45); await raf(); await raf();
      var sub = { sheets: idx.map(function (i) { return state.spec.sheets[i]; }) };
      var blob = await window.pdfMake.createPdf(window.PahaniAdmin.buildPdfDoc(sub, meta(), C.fmt, kvTable)).getBlob();
      ov(true, null, null, 1);
      save(blob, baseName() + ".pdf");
      status("✔ PDF downloaded: <b>" + esc(baseName()) + ".pdf</b> (" + (blob.size / 1048576).toFixed(1) + " MB, " + idx.length + " sheet" + (idx.length > 1 ? "s" : "") + ").", true);
    } catch (e) { console.error(e); status("✖ PDF failed: " + esc(e.message || e) + ". Try <b>Print / Save as PDF</b>, or untick some sheets."); }
    $("ov-cancel").hidden = false; ov(false); setBusy(false);
  });
  window.addEventListener("afterprint", function () { if (!state.busy) $("pages").innerHTML = ""; });
  $("b-print").addEventListener("click", async function () {
    if (!state.spec || state.busy || !state.admin) return;
    var idx = selected(); if (!idx) return;
    setBusy(true); state.cancel = false; ov(true, "Preparing pages…", "పేజీలు తయారవుతున్నాయి", 0);
    try {
      await unlock("adm", state.admin.adminKey);
      var ctx = { spec: state.spec, meta: meta(), fmt: C.fmt, kvTable: kvTable, esc: esc, raf: raf, cancelled: function () { return state.cancel; } };
      var pages = await window.PahaniAdmin.buildPages(ctx, idx, function (f, n) { ov(true, "Preparing pages…", n + " pages so far", f); });
      ov(false); await raf();
      track(baseName() + " (print, " + pages.length + " pages)");
      window.print();
    } catch (e) { if (!(e && e.message === "cancelled")) { console.error(e); status("✖ Print failed: " + esc(e.message || e)); } $("pages").innerHTML = ""; }
    ov(false); setBusy(false);
  });

  /* ---------- start ---------- */
  paintButtons();
  loadConfig().then(function () { return loadAdmin(); }).then(resume);
})();
