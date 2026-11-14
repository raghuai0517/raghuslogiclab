/*
  Pahani Village Report — PDF document (pdfmake 0.3 docDefinition) from the report spec.
  Real text PDF with the "RLL Telugu" font (Noto Sans + Noto Sans Telugu, OFL), so Telugu stays sharp and searchable.
  © RLL – RaghusLogicLab. All rights reserved.
*/
(function (root) {
  "use strict";
  var RED = "#b91c1c", DRED = "#7f1d1d", GOLD = "#d4a017", LGOLD = "#fcefc2", LRED = "#fdecec", FLAG = "#fff4cc", ALT = "#fff8f8", INK = "#1f1308", LINE = "#e3c873";
  var COPY = "© RLL – RaghusLogicLab. All rights reserved. | కాపీరైట్ © RLL – అన్ని హక్కులు ప్రత్యేకించబడినవి.";
  var PAGE_W = 841.89, MARGIN = 20, AVAIL = PAGE_W - 2 * MARGIN;

  function band(text, fill, color, size, opt) {
    return Object.assign({
      table: { widths: ["*"], body: [[{ text: text, fillColor: fill, color: color, fontSize: size, bold: true, alignment: "center", margin: [2, 1.5, 2, 1.5] }]] },
      layout: { hLineWidth: function () { return 1; }, vLineWidth: function () { return 1; }, hLineColor: function () { return GOLD; }, vLineColor: function () { return GOLD; } },
      margin: [0, 0, 0, 3]
    }, opt || {});
  }

  function tableNode(b, fmt, detail, summary) {
    var cols = b.cols, n = cols.length, pad = 2.2;
    var wsum = cols.reduce(function (s, c) { return s + (c.pw || c.w || 10); }, 0);
    var free = AVAIL - n * 2 * pad - (n + 1) * 0.5;
    var widths = cols.map(function (c) { return Math.max(8, free * (c.pw || c.w || 10) / wsum); });
    var fs = detail ? 6.6 : 7.8, hfs = detail ? 6.3 : 7.4;
    var head = cols.map(function (c) {
      return { text: [{ text: (detail && c.s ? c.s : c.en) + "\n", bold: true }, { text: c.te, fontSize: hfs - 0.6, color: "#ffe8b0" }],
        fillColor: RED, color: "#ffffff", alignment: "center", fontSize: hfs, bold: true };
    });
    var body = [head];
    b.rows.forEach(function (r, j) {
      var flag = b.flags && b.flags[j];
      body.push(r.map(function (v, ci) {
        var c = cols[ci], txt = c.f === "kv" ? String(v) : fmt(v, c.f);
        var cell = { text: txt, alignment: c.f ? "right" : (ci === 0 ? "center" : "left") };
        if (c.rem && v) cell.color = "#8a1c1c";
        if (c.rem && flag) cell.fillColor = FLAG; else if (j % 2) cell.fillColor = ALT;
        if (summary && c.f === "kv") cell.bold = true;
        return cell;
      }));
    });
    if (b.total) body.push(b.total.map(function (v, ci) {
      var c = cols[ci]; return { text: fmt(v, c.f), alignment: c.f ? "right" : "left", bold: true, color: DRED, fillColor: LGOLD };
    }));
    return {
      table: { headerRows: 1, dontBreakRows: true, widths: widths, body: body },
      fontSize: fs, color: INK, lineHeight: detail ? 0.98 : 1.04,
      layout: {
        hLineWidth: function (i, node) { return (i === 0 || i === 1 || i === node.table.body.length || (b.total && i === node.table.body.length - 1)) ? 0.9 : 0.4; },
        vLineWidth: function () { return 0.4; },
        hLineColor: function (i, node) { return (i <= 1 || i >= node.table.body.length - (b.total ? 1 : 0)) ? GOLD : LINE; },
        vLineColor: function (i) { return GOLD; },
        paddingLeft: function () { return pad; }, paddingRight: function () { return pad; },
        paddingTop: function () { return detail ? 0.8 : 1.6; }, paddingBottom: function () { return detail ? 0.6 : 1.4; }
      },
      margin: [0, 0, 0, 6]
    };
  }

  function buildPdfDoc(spec, meta, fmt, kvTable) {
    var V = meta.village || "Village", content = [];
    spec.sheets.forEach(function (sh, si) {
      var st = sh.title[0] + "  |  " + sh.title[1];
      var sec = [];
      sec.push(band(sh.title[0] + "   |   " + sh.title[1], RED, "#ffffff", 13));
      sec.push(band(sh.info.filter(function (x) { return x[2]; }).map(function (x) { return x[0] + " / " + x[1] + ": " + x[2]; }).join("      "), LRED, DRED, 8.5));
      if (sh.line) sec.push(band(sh.line, LRED, DRED, 7.6, { margin: [0, 0, 0, 3] }));
      sec.push(band(COPY, LGOLD, "#6b4e00", 7.4, { margin: [0, 0, 0, 5] }));
      sh.blocks.forEach(function (b) {
        if (b.type === "kv") b = kvTable(b);
        if (b.title) sec.push(band(b.title, DRED, "#ffffff", 9, { headlineLevel: 1, margin: [0, 4, 0, 0] }));
        sec.push(tableNode(b, fmt, !!b.detail, sh.kind === "summary"));
        if (b.note) sec.push({ text: b.note, fontSize: 6.8, italics: true, color: "#6b4e00", margin: [0, -3, 0, 6] });
      });
      sec.push({
        unbreakable: true, margin: [0, 26, 0, 0],
        columns: [
          { stack: [{ canvas: [{ type: "line", x1: 40, y1: 0, x2: 330, y2: 0, lineWidth: 0.8, lineColor: GOLD }] }, { text: "Signature of VRO / గ్రామ రెవెన్యూ అధికారి సంతకం", bold: true, color: DRED, fontSize: 8.5, alignment: "center", margin: [0, 3, 0, 0] }, { text: "Name / పేరు: " + (meta.vro || "____________________"), fontSize: 8, alignment: "center", color: DRED }] },
          { stack: [{ canvas: [{ type: "line", x1: 40, y1: 0, x2: 330, y2: 0, lineWidth: 0.8, lineColor: GOLD }] }, { text: "Signature of VS / గ్రామ సర్వేయర్ సంతకం", bold: true, color: DRED, fontSize: 8.5, alignment: "center", margin: [0, 3, 0, 0] }, { text: "Name / పేరు: " + (meta.vs || "____________________"), fontSize: 8, alignment: "center", color: DRED }] }
        ]
      });
      content.push({
        section: sec, pageSize: "A4", pageOrientation: "landscape", pageMargins: [MARGIN, 34, MARGIN, 30],
        header: function () {
          return { margin: [MARGIN, 12, MARGIN, 0], table: { widths: ["*", "auto", "*"], body: [[
            { text: V + " – Pahani Report", bold: true }, { text: st, bold: true, alignment: "center" }, { text: "© RLL – RaghusLogicLab", bold: true, alignment: "right" }]] },
            fontSize: 7.4, color: DRED,
            layout: { hLineWidth: function (i) { return i === 1 ? 1.2 : 0; }, vLineWidth: function () { return 0; }, hLineColor: function () { return GOLD; }, paddingLeft: function () { return 0; }, paddingRight: function () { return 0; }, paddingBottom: function () { return 2; } } };
        },
        footer: function (cp, pc) {
          return { margin: [MARGIN, 6, MARGIN, 0], table: { widths: ["*", "auto", "*"], body: [[
            { text: "© RLL – RaghusLogicLab. All rights reserved. · కాపీరైట్ © RLL" }, { text: "Page " + cp + " of " + pc + "  ·  పేజీ " + cp + "/" + pc, alignment: "center" },
            { text: "Generated " + (meta.date || "") + " · raghuslogiclab.com", alignment: "right" }]] },
            fontSize: 6.8, color: "#6b4e00", bold: true,
            layout: { hLineWidth: function (i) { return i === 0 ? 1.2 : 0; }, vLineWidth: function () { return 0; }, hLineColor: function () { return GOLD; }, paddingLeft: function () { return 0; }, paddingRight: function () { return 0; }, paddingTop: function () { return 2; } } };
        },
        watermark: { text: "© RLL", color: RED, opacity: 0.05, bold: true, fontSize: 130 }
      });
    });
    return {
      info: { title: V + " – Pahani Report", author: "© RLL – RaghusLogicLab", subject: "Pahani / Adangal village report (English + Telugu)",
        keywords: "© RLL, Pahani, Adangal, VRO, VS", creator: "RLL Pahani Report – raghuslogiclab.com", producer: "RLL – RaghusLogicLab" },
      pageSize: "A4", pageOrientation: "landscape", pageMargins: [MARGIN, 34, MARGIN, 30],
      defaultStyle: { font: "RLL", fontSize: 7.5, lineHeight: 1.06 },
      content: content,
      pageBreakBefore: function (node, nodeQueries) {
        var q = nodeQueries || {};
        return node.headlineLevel === 1 && q.getFollowingNodesOnPage && q.getFollowingNodesOnPage().length === 0;
      }
    };
  }

  var API = { buildPdfDoc: buildPdfDoc };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.PahaniPdf = API;
})(this);
