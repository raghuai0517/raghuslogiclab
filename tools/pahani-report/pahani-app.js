/*
  Pahani Village Report — page script. © RLL – RaghusLogicLab. All rights reserved.
  Reads the Pahani in the browser (HTML-table .xls from Webland, or real .xls/.xlsx/.csv via SheetJS),
  shows a preview, and writes the Excel (ExcelJS), the PDF (pdfmake, real text) or a print layout.
  Nothing is uploaded. Only "download" events (file name) are counted by assets/track.js.
*/
(function () {
  "use strict";
  var C = window.PahaniCore;
  var $ = function (id) { return document.getElementById(id); };
  var state = { model: null, spec: null, fileName: "", sheet: 0, cancel: false, busy: false, pdfSel: null };
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
  async function readFile(file) {
    var buf = await file.arrayBuffer(), b = new Uint8Array(buf.slice(0, 8));
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
    if (!file || state.busy) return;
    state.fileName = file.name;
    status("Reading <b>" + esc(file.name) + "</b> …");
    try {
      var m = await readFile(file);
      state.model = m;
      var v = villageFromName(file.name);
      if (v) $("m-village").value = v;
      state.sheet = 0; state.pdfSel = null;
      rebuild();
      status("✔ Read <b>" + esc(file.name) + "</b>: " + m.surveys.length.toLocaleString("en-IN") + " survey numbers, " + m.recs.length.toLocaleString("en-IN") + " entries. Check the details in step 2, then download.", true);
      $("result").hidden = false;
      $("result").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      console.error(e);
      state.model = null; $("result").hidden = true;
      status("✖ " + esc(e.message || e) + "<br><span class='te'>ఈ ఫైల్ చదవలేకపోయాం. వెబ్‌ల్యాండ్ / మీభూమి నుండి డౌన్‌లోడ్ చేసిన పహాణీ ఫైల్‌ను అప్‌లోడ్ చేయండి.</span>");
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
    var s = state.spec.sheets[state.sheet], LIM = 200, h = "";
    h += '<div class="muted" style="margin:4px 0 8px"><b>' + esc(s.title[0]) + '</b> · <span class="te">' + esc(s.title[1]) + "</span>" + (s.line ? "<br>" + esc(s.line) : "") + "</div>";
    s.blocks.forEach(function (b) {
      if (b.type === "kv") b = kvTable(b);
      if (b.title) h += '<h3 class="bt">' + esc(b.title) + "</h3>";
      h += '<div class="tw">' + htmlTable(b, b.detail ? LIM : 0) + "</div>";
      if (b.detail && b.rows.length > LIM) h += '<p class="muted">Showing the first ' + LIM + " of " + b.rows.length.toLocaleString("en-IN") + " rows here. The Excel and PDF have all rows. <span class='te'>మొదటి " + LIM + " వరుసలు మాత్రమే చూపబడుతున్నాయి.</span></p>";
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

  /* ---------- Excel ---------- */
  $("b-xlsx").addEventListener("click", async function () {
    if (!state.spec || state.busy) return;
    setBusy(true); state.cancel = false; ov(true, "Building Excel…", "ఎక్సెల్ తయారవుతోంది", 0.2);
    try {
      await loadScript("lib/exceljs.min.js"); ov(true, null, null, 0.5); await raf();
      var buf = await C.writeExcel(window.ExcelJS, state.spec, meta());
      ov(true, null, null, 1);
      save(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), baseName() + ".xlsx");
      status("✔ Excel downloaded: <b>" + esc(baseName()) + ".xlsx</b> (" + state.spec.sheets.length + " sheets).", true);
    } catch (e) { console.error(e); status("✖ Excel failed: " + esc(e.message || e)); }
    ov(false); setBusy(false);
  });

  /* ---------- report pages (shared by PDF and print) ---------- */
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function overflow(body) { return body.scrollHeight > body.clientHeight + 0.5; }
  async function buildPages(idx, onProgress) {
    await document.fonts.load('400 12px "RLL Telugu"', "తెలుగు"); await document.fonts.load('700 12px "RLL Telugu"', "తెలుగు");
    try { await document.fonts.ready; } catch (e) {}
    var host = $("pages"); host.innerHTML = "";
    var M = meta(), sheets = state.spec.sheets, pages = [], totalRows = 0, done = 0;
    idx.forEach(function (i) { sheets[i].blocks.forEach(function (b) { totalRows += (b.rows ? b.rows.length : 0) + 2; }); });
    var cur = null, sh = null;
    function newPage() {
      var pg = el("div", "pg" + (sh.kind === "summary" ? " sum" : ""));
      pg.innerHTML = '<div class="pg-wm">© RLL</div><div class="pg-head"><div class="l"></div><div class="c"></div><div class="r">© RLL – RaghusLogicLab</div></div><div class="pg-body"></div>' +
        '<div class="pg-foot"><span>© RLL – RaghusLogicLab. All rights reserved. · కాపీరైట్ © RLL</span><span class="pno"></span><span></span></div>';
      pg.querySelector(".l").textContent = M.village + " – Pahani Report";
      pg.querySelector(".c").textContent = sh.title[0] + " | " + sh.title[1];
      pg.querySelector(".pg-foot span:last-child").textContent = "Generated " + M.date + " · raghuslogiclab.com";
      host.appendChild(pg); pages.push(pg);
      cur = pg.querySelector(".pg-body");
      return cur;
    }
    function put(node) {
      cur.appendChild(node);
      if (overflow(cur) && cur.childNodes.length > 1) { cur.removeChild(node); newPage(); cur.appendChild(node); }
    }
    function mkTable(b) {
      var sumW = b.cols.reduce(function (s, c) { return s + (c.pw || c.w || 10); }, 0);
      var t = el("table");
      t.innerHTML = "<colgroup>" + b.cols.map(function (c) { return '<col style="width:' + ((c.pw || c.w || 10) * 100 / sumW).toFixed(2) + '%">'; }).join("") + "</colgroup><thead><tr>" +
        b.cols.map(function (c) { return "<th>" + esc(b.detail && c.s ? c.s : c.en) + "<small>" + esc(c.te) + "</small></th>"; }).join("") + "</tr></thead><tbody></tbody>";
      return t;
    }
    function mkRow(b, r, j, cls) {
      var tr = el("tr", cls || ((b.flags && b.flags[j] ? "flag " : "") + (j % 2 ? "alt" : "")));
      tr.innerHTML = r.map(function (v, ci) { var c = b.cols[ci]; return '<td class="' + (c.f ? "n" : "") + (c.rem ? " rem" : "") + '">' + esc(c.f === "kv" ? v : fmt(v, c.f)) + "</td>"; }).join("");
      return tr;
    }
    for (var s = 0; s < idx.length; s++) {
      sh = sheets[idx[s]]; newPage();
      cur.appendChild(el("div", "band title", esc(sh.title[0]) + " &nbsp;|&nbsp; " + esc(sh.title[1])));
      cur.appendChild(el("div", "band info", sh.info.filter(function (x) { return x[2]; }).map(function (x) { return esc(x[0] + " / " + x[1] + ": " + x[2]); }).join(" &nbsp;&nbsp;&nbsp; ")));
      if (sh.line) cur.appendChild(el("div", "band line", esc(sh.line)));
      cur.appendChild(el("div", "band copy", "© RLL – RaghusLogicLab. All rights reserved. | కాపీరైట్ © RLL – అన్ని హక్కులు ప్రత్యేకించబడినవి."));
      for (var bi = 0; bi < sh.blocks.length; bi++) {
        var b = sh.blocks[bi]; if (b.type === "kv") b = kvTable(b);
        var title = b.title ? el("div", "band btitle", esc(b.title)) : null;
        var t = mkTable(b), tb = t.tBodies[0];
        if (title) cur.appendChild(title);
        cur.appendChild(t);
        var all = b.rows.map(function (r, j) { return { r: r, j: j }; });
        if (b.total) all.push({ r: b.total, j: -1 });
        if (overflow(cur) && cur.childNodes.length > 2) { if (title) cur.removeChild(title); cur.removeChild(t); newPage(); if (title) cur.appendChild(title); cur.appendChild(t); }
        for (var k = 0; k < all.length; k++) {
          var it = all[k], tr = mkRow(b, it.r, it.j, it.j < 0 ? "tot" : null);
          tb.appendChild(tr);
          if (overflow(cur) && tb.rows.length > 1) {
            tb.removeChild(tr); newPage();
            if (b.title) cur.appendChild(el("div", "band btitle", esc(b.title) + " (contd. / కొనసాగింపు)"));
            t = mkTable(b); tb = t.tBodies[0]; cur.appendChild(t); tb.appendChild(tr);
          }
          done++;
          if (done % 150 === 0) { onProgress(done / totalRows, pages.length); await raf(); if (state.cancel) throw new Error("cancelled"); }
        }
        if (b.note) put(el("div", "note", esc(b.note)));
      }
      put(el("div", "sign", "<div>Signature of VRO / గ్రామ రెవెన్యూ అధికారి సంతకం<br>Name / పేరు: " + esc(M.vro || "____________________") + "</div><div>Signature of VS / గ్రామ సర్వేయర్ సంతకం<br>Name / పేరు: " + esc(M.vs || "____________________") + "</div>"));
    }
    pages.forEach(function (pg, i) { pg.querySelector(".pno").textContent = "Page " + (i + 1) + " of " + pages.length + " · పేజీ " + (i + 1) + "/" + pages.length; });
    return pages;
  }
  function selected() {
    var idx = []; state.pdfSel.forEach(function (on, i) { if (on) idx.push(i); });
    if (!idx.length) { status("✖ Tick at least one sheet for the PDF / print."); return null; }
    return idx;
  }

  /* ---------- PDF (pdfmake, real text) ---------- */
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
    if (!state.spec || state.busy) return;
    var idx = selected(); if (!idx) return;
    setBusy(true); $("ov-cancel").hidden = true;
    ov(true, "Writing PDF…", "పీడీఎఫ్ తయారవుతోంది — a big village can take up to a minute", 0.15);
    try {
      await loadScript("lib/pdfmake.min.js"); ov(true, null, null, 0.3);
      await pdfFonts(); ov(true, null, null, 0.45); await raf(); await raf();
      var M = meta(), sub = { sheets: idx.map(function (i) { return state.spec.sheets[i]; }) };
      var dd = window.PahaniPdf.buildPdfDoc(sub, M, C.fmt, kvTable);
      var blob = await window.pdfMake.createPdf(dd).getBlob();
      ov(true, null, null, 1);
      save(blob, baseName() + ".pdf");
      status("✔ PDF downloaded: <b>" + esc(baseName()) + ".pdf</b> (" + (blob.size / 1048576).toFixed(1) + " MB, " + idx.length + " sheet" + (idx.length > 1 ? "s" : "") + ").", true);
    } catch (e) { console.error(e); status("✖ PDF failed: " + esc(e.message || e) + ". Try <b>Print / Save as PDF</b>, or untick some sheets."); }
    $("ov-cancel").hidden = false; ov(false); setBusy(false);
  });

  /* ---------- Print ---------- */
  window.addEventListener("afterprint", function () { if (!state.busy) $("pages").innerHTML = ""; });
  $("b-print").addEventListener("click", async function () {
    if (!state.spec || state.busy) return;
    var idx = selected(); if (!idx) return;
    setBusy(true); state.cancel = false; ov(true, "Preparing pages…", "పేజీలు తయారవుతున్నాయి", 0);
    try {
      var pages = await buildPages(idx, function (f, n) { ov(true, "Preparing pages…", n + " pages so far", f); });
      ov(false); await raf();
      track(baseName() + " (print, " + pages.length + " pages)");
      window.print();
    } catch (e) { if (!(e && e.message === "cancelled")) { console.error(e); status("✖ Print failed: " + esc(e.message || e)); } $("pages").innerHTML = ""; }
    ov(false); setBusy(false);
  });
})();
