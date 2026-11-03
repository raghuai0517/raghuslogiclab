// Voter-slip extractor for AP SEC MPTC/ZPTC Telugu photo voter slip PDFs.
// Reads text including /ActualText spans (which carry the real Telugu for conjunct glyphs).
// Works in browser (window.VoterExtract) and node (module.exports).
(function (root) {
  'use strict';

  // ---------- small helpers ----------
  function mul(m, n) { // 3x3 affine [a b c d e f]
    return [m[0]*n[0]+m[1]*n[2], m[0]*n[1]+m[1]*n[3], m[2]*n[0]+m[3]*n[2], m[2]*n[1]+m[3]*n[3],
            m[4]*n[0]+m[5]*n[2]+n[4], m[4]*n[1]+m[5]*n[3]+n[5]];
  }
  function utf16be(bytes, start) {
    let s = '';
    for (let i = start; i + 1 < bytes.length; i += 2) s += String.fromCharCode((bytes[i] << 8) | bytes[i+1]);
    return s;
  }
  function pdfTextString(bytes) {
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) return utf16be(bytes, 2);
    let s = ''; for (const b of bytes) s += String.fromCharCode(b); return s;
  }
  function hexToBytes(h) {
    h = h.replace(/[^0-9a-fA-F]/g, ''); if (h.length % 2) h += '0';
    const out = new Uint8Array(h.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i*2, 2), 16);
    return out;
  }

  // ---------- content stream lexer ----------
  const WS = new Uint8Array(256); [0,9,10,12,13,32].forEach(c => WS[c] = 1);
  const DELIM = new Uint8Array(256); '()<>[]{}/%'.split('').forEach(c => DELIM[c.charCodeAt(0)] = 1);
  const OP = { op: 1 };

  function Lexer(buf) { this.b = buf; this.p = 0; }
  Lexer.prototype.skipWs = function () {
    const b = this.b; let p = this.p;
    for (;;) {
      while (p < b.length && WS[b[p]]) p++;
      if (b[p] === 37) { while (p < b.length && b[p] !== 10 && b[p] !== 13) p++; continue; }
      break;
    }
    this.p = p;
  };
  Lexer.prototype.next = function () {
    this.skipWs();
    const b = this.b; let p = this.p;
    if (p >= b.length) return undefined;
    const c = b[p];
    if (c === 40) { // literal string
      let depth = 1; p++; const out = [];
      while (p < b.length && depth > 0) {
        let ch = b[p++];
        if (ch === 92) {
          const e = b[p++];
          if (e === 110) out.push(10); else if (e === 114) out.push(13); else if (e === 116) out.push(9);
          else if (e === 98) out.push(8); else if (e === 102) out.push(12);
          else if (e >= 48 && e <= 55) {
            let v = e - 48;
            for (let k = 0; k < 2 && b[p] >= 48 && b[p] <= 55; k++) v = v * 8 + (b[p++] - 48);
            out.push(v & 255);
          } else if (e === 13) { if (b[p] === 10) p++; }
          else if (e === 10) {}
          else out.push(e);
          continue;
        }
        if (ch === 40) depth++;
        else if (ch === 41) { depth--; if (depth === 0) break; }
        out.push(ch);
      }
      this.p = p; return { str: Uint8Array.from(out) };
    }
    if (c === 60) {
      if (b[p+1] === 60) { this.p = p + 2; return this.readDict(); }
      let q = p + 1; while (q < b.length && b[q] !== 62) q++;
      let h = ''; for (let i = p + 1; i < q; i++) h += String.fromCharCode(b[i]);
      this.p = q + 1; return { str: hexToBytes(h) };
    }
    if (c === 91) { this.p = p + 1; const arr = []; for (;;) { this.skipWs(); if (this.b[this.p] === 93) { this.p++; break; } const t = this.next(); if (t === undefined) break; arr.push(t); } return arr; }
    if (c === 62 && b[p+1] === 62) { this.p = p + 2; return { endDict: true }; }
    if (c === 47) { // name
      p++; let s = '';
      while (p < b.length && !WS[b[p]] && !DELIM[b[p]]) {
        if (b[p] === 35) { s += String.fromCharCode(parseInt(String.fromCharCode(b[p+1], b[p+2]), 16)); p += 3; }
        else s += String.fromCharCode(b[p++]);
      }
      this.p = p; return { name: s };
    }
    // number or keyword
    let s = '';
    while (p < b.length && !WS[b[p]] && !DELIM[b[p]]) s += String.fromCharCode(b[p++]);
    if (s === '') { this.p = p + 1; return this.next(); } // stray delimiter
    this.p = p;
    const n = +s;
    if (!isNaN(n) && /^[+\-.\d]/.test(s)) return n;
    return { op: s };
  };
  Lexer.prototype.readDict = function () {
    const d = {};
    for (;;) {
      const k = this.next();
      if (k === undefined || (k && k.endDict)) break;
      if (k && k.name !== undefined) { const v = this.next(); d[k.name] = v; }
    }
    return { dict: d };
  };
  Lexer.prototype.skipInlineImage = function () {
    const b = this.b; let p = this.p;
    while (p < b.length) {
      if (b[p] === 69 && b[p+1] === 73 && (p === 0 || WS[b[p-1]]) && (p + 2 >= b.length || WS[b[p+2]])) { this.p = p + 2; return; }
      p++;
    }
    this.p = p;
  };

  // ---------- ToUnicode CMap ----------
  function parseToUnicode(bytes) {
    const map = new Map();
    let txt = ''; for (let i = 0; i < bytes.length; i++) txt += String.fromCharCode(bytes[i]);
    const hexStr = (h) => utf16be(hexToBytes(h), 0);
    let m; const reChar = /beginbfchar([\s\S]*?)endbfchar/g;
    while ((m = reChar.exec(txt))) {
      const re = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g; let x;
      while ((x = re.exec(m[1]))) map.set(parseInt(x[1], 16), hexStr(x[2]));
    }
    const reRange = /beginbfrange([\s\S]*?)endbfrange/g;
    while ((m = reRange.exec(txt))) {
      const re = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<([0-9a-fA-F]*)>|\[([^\]]*)\])/g; let x;
      while ((x = re.exec(m[1]))) {
        const lo = parseInt(x[1], 16), hi = parseInt(x[2], 16);
        if (x[4] !== undefined) {
          const base = hexToBytes(x[4]);
          for (let c = lo; c <= hi && c - lo < 65536; c++) {
            const bb = base.slice(); let add = c - lo, i = bb.length - 1;
            while (add > 0 && i >= 0) { const v = bb[i] + add; bb[i] = v & 255; add = v >> 8; i--; }
            map.set(c, utf16be(bb, 0));
          }
        } else {
          const items = x[5].match(/<([0-9a-fA-F]*)>/g) || [];
          items.forEach((it, i) => map.set(lo + i, hexStr(it.slice(1, -1))));
        }
      }
    }
    return map;
  }

  // ---------- pdf-lib accessors ----------
  function makeEnv(PDFLib, pdfDoc) {
    const { PDFName, PDFDict, PDFArray, PDFRawStream, PDFRef, decodePDFRawStream } = PDFLib;
    const ctx = pdfDoc.context;
    const fontCache = new Map();
    const look = (o) => (o instanceof PDFRef ? ctx.lookup(o) : o);
    function streamBytes(s) {
      s = look(s);
      if (!s) return new Uint8Array(0);
      if (s instanceof PDFRawStream) return decodePDFRawStream(s).decode();
      if (typeof s.getContents === 'function') return s.getContents();
      return new Uint8Array(0);
    }
    function dictGet(d, key) { d = look(d); if (!d || !(d instanceof PDFDict)) return undefined; return look(d.get(PDFName.of(key))); }
    function fontInfo(fontRefOrDict) {
      const key = fontRefOrDict instanceof PDFRef ? fontRefOrDict.toString() : null;
      if (key && fontCache.has(key)) return fontCache.get(key);
      const fd = look(fontRefOrDict);
      const sub = dictGet(fd, 'Subtype');
      const twoByte = sub && sub.toString() === '/Type0';
      const tu = fd instanceof PDFDict ? fd.get(PDFName.of('ToUnicode')) : null;
      let map = new Map();
      if (tu) { try { map = parseToUnicode(streamBytes(tu)); } catch (e) {} }
      const info = { twoByte, map };
      if (key) fontCache.set(key, info);
      return info;
    }
    function contentOf(obj) {
      const c = look(obj);
      if (c instanceof PDFArray) {
        const parts = []; let len = 0;
        for (let i = 0; i < c.size(); i++) { const b = streamBytes(c.get(i)); parts.push(b); len += b.length + 1; }
        const out = new Uint8Array(len); let o = 0;
        for (const b of parts) { out.set(b, o); o += b.length; out[o++] = 10; }
        return out;
      }
      return streamBytes(c);
    }
    return { PDFLib, ctx, look, dictGet, fontInfo, contentOf, streamBytes };
  }

  // ---------- interpreter: returns text pieces {x,y,t,seq} ----------
  function pageTextPieces(env, page) {
    const pieces = []; let seq = 0;
    const node = page.node;
    const resources = node.Resources();
    const mb = page.getMediaBox ? page.getMediaBox() : { x: 0, y: 0 };
    run(env.contentOf(node.Contents()), resources, [1,0,0,1,-(mb.x||0),-(mb.y||0)], 0);
    return pieces;

    function run(bytes, res, ctm0, depth) {
      if (depth > 6) return;
      const fontsDict = env.dictGet(res, 'Font');
      const xobjDict = env.dictGet(res, 'XObject');
      const lx = new Lexer(bytes);
      let ctm = ctm0, stack = [];
      let tm = [1,0,0,1,0,0], tlm = tm, font = null, fontSize = 1, leading = 0, rise = 0;
      const mc = []; // marked content stack: {actual, started, x, y}
      let suppress = 0;
      let ops = [];
      const curPos = () => { const m = mul([1,0,0,1,0,rise], mul(tm, ctm)); return [m[4], m[5]]; };
      const emit = (t, pos) => { if (t) pieces.push({ x: pos[0], y: pos[1], t, seq: seq++ }); };
      const show = (strBytes) => {
        const pos = curPos();
        if (suppress) { for (let i = mc.length - 1; i >= 0; i--) if (mc[i].actual != null && !mc[i].pos) { mc[i].pos = pos; break; } return; }
        if (!font) return;
        let s = '';
        if (font.twoByte) { for (let i = 0; i + 1 < strBytes.length; i += 2) { const u = font.map.get((strBytes[i] << 8) | strBytes[i+1]); if (u) s += u; } }
        else { for (const c of strBytes) { const u = font.map.get(c); s += u != null ? u : String.fromCharCode(c); } }
        emit(s, pos);
      };
      for (;;) {
        const tok = lx.next();
        if (tok === undefined) break;
        if (!(tok && tok.op !== undefined)) { ops.push(tok); continue; }
        const op = tok.op, a = ops; ops = [];
        switch (op) {
          case 'q': stack.push(ctm); break;
          case 'Q': if (stack.length) ctm = stack.pop(); break;
          case 'cm': if (a.length >= 6) ctm = mul(a.slice(-6), ctm); break;
          case 'BT': tm = tlm = [1,0,0,1,0,0]; break;
          case 'Tf': { const nm = a[a.length-2]; fontSize = a[a.length-1];
            const fr = fontsDict && nm && nm.name ? fontsDict.get(env.PDFLib.PDFName.of(nm.name)) : null;
            font = fr ? env.fontInfo(fr) : null; break; }
          case 'Tm': if (a.length >= 6) tm = tlm = a.slice(-6); break;
          case 'Td': tm = tlm = mul([1,0,0,1,a[0],a[1]], tlm); break;
          case 'TD': leading = -a[1]; tm = tlm = mul([1,0,0,1,a[0],a[1]], tlm); break;
          case 'TL': leading = a[0]; break;
          case 'Ts': rise = a[0]; break;
          case 'T*': tm = tlm = mul([1,0,0,1,0,-leading], tlm); break;
          case 'Tj': if (a[0] && a[0].str) show(a[0].str); break;
          case "'": tm = tlm = mul([1,0,0,1,0,-leading], tlm); if (a[0] && a[0].str) show(a[0].str); break;
          case '"': tm = tlm = mul([1,0,0,1,0,-leading], tlm); if (a[2] && a[2].str) show(a[2].str); break;
          case 'TJ': { const arr = Array.isArray(a[0]) ? a[0] : [];
            const parts = arr.filter(x => x && x.str);
            if (parts.length) { let tot = 0; parts.forEach(p => tot += p.str.length); const all = new Uint8Array(tot); let o = 0; parts.forEach(p => { all.set(p.str, o); o += p.str.length; }); show(all); }
            break; }
          case 'BDC': { const props = a[1]; let actual = null;
            if (props && props.dict && props.dict.ActualText && props.dict.ActualText.str) actual = pdfTextString(props.dict.ActualText.str);
            mc.push({ actual, pos: null }); if (actual != null) suppress++; break; }
          case 'BMC': mc.push({ actual: null }); break;
          case 'EMC': { const e = mc.pop(); if (e && e.actual != null) { suppress--; if (!suppress) emit(e.actual, e.pos || curPos()); } break; }
          case 'BI': lx.skipInlineImage(); break;
          case 'Do': { const nm = a[0]; if (!xobjDict || !nm || !nm.name) break;
            const xo = env.look(xobjDict.get(env.PDFLib.PDFName.of(nm.name)));
            if (!xo || !xo.dict) break;
            const st = xo.dict.get(env.PDFLib.PDFName.of('Subtype'));
            if (!st || st.toString() !== '/Form') break;
            const mArr = env.look(xo.dict.get(env.PDFLib.PDFName.of('Matrix')));
            let fm = [1,0,0,1,0,0];
            if (mArr && mArr.asArray) fm = mArr.asArray().map(n => n.asNumber ? n.asNumber() : +n.toString());
            const fres = env.look(xo.dict.get(env.PDFLib.PDFName.of('Resources'))) || res;
            run(env.streamBytes(xo), fres, mul(fm, ctm), depth + 1); break; }
        }
      }
    }
  }

  // ---------- layout → lines ----------
  function clean(s) {
    return s.replace(/\u0000/g, '').replace(/[  - 　]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function linesFromPieces(pieces, splitX) {
    const cols = [[], []];
    for (const p of pieces) cols[p.x >= splitX ? 1 : 0].push(p);
    return cols.map(col => {
      col.sort((a, b) => b.y - a.y || a.seq - b.seq);
      const groups = [];
      for (const p of col) {
        const g = groups[groups.length - 1];
        if (g && Math.abs(g.y - p.y) <= 3.5) g.items.push(p); else groups.push({ y: p.y, items: [p] });
      }
      return groups.map(g => ({ y: g.y, text: clean(g.items.sort((a, b) => a.seq - b.seq).map(i => i.t).join('')) }))
                   .filter(l => l.text);
    });
  }

  // ---------- slips → records ----------
  const nz = (s) => s.replace(/[\s​-‍]/g, '');
  const LABELS = [
    ['mptc', 'మండలపరిషత్'], ['gp', 'గ్రామపంచాయతీ'], ['psNo', 'పోలింగ్స్టేషన్నెం'], ['psName', 'పోలింగ్స్టేషన్పేరు'],
    ['serial', 'వరుససంఖ్య'], ['name', 'ఓటరుపేరు'], ['age', 'వయస్సు'], ['gender', 'లింగము'],
    ['house', 'ఇంటినెం'], ['epic', 'ఎపిక్'], ['pollDate', 'పోలింగుతేది'], ['pollTime', 'పోలింగుసమయం'],
  ];
  function labelKey(label) {
    const k = nz(label);
    for (const [f, l] of LABELS) if (k.startsWith(l)) return f;
    if (/పేరు$/.test(k)) return 'rel';
    return null;
  }
  function recordsFromLines(lines, pageNo) {
    const recs = []; let cur = null;
    const flush = () => { if (cur && (cur.serial || cur.epic || cur.name)) recs.push(cur); cur = null; };
    for (const ln of lines) {
      const i = ln.text.indexOf(':'); if (i < 0) continue;
      const label = ln.text.slice(0, i).trim(), val = ln.text.slice(i + 1).trim();
      let key = labelKey(label);
      if (!key && !nz(label) && cur && cur.name !== undefined && cur.relName === undefined && val) key = 'rel';
      if (!key) continue;
      if (key === 'mptc' || (cur && cur[key] !== undefined && key !== 'rel')) flush();
      if (!cur) cur = { page: pageNo };
      if (key === 'rel') { cur.relType = label.replace(/\s*పేరు\s*$/, '').trim() || 'ఇతర'; cur.relName = val; }
      else cur[key] = val;
    }
    flush();
    return recs;
  }

  function normalizeRecord(r) {
    const g = (r.gender || '').trim();
    const gender = /^స్త్రీ/.test(g) ? 'స్త్రీ' : /^పు/.test(g) ? 'పురుషుడు' : g;
    const genderEn = gender === 'స్త్రీ' ? 'F' : gender === 'పురుషుడు' ? 'M' : (g ? 'O' : '');
    return {
      psNo: (r.psNo || '').trim(), psName: r.psName || '', mptc: r.mptc || '', gp: r.gp || '',
      serial: parseInt(r.serial, 10) || null, name: r.name || '',
      relType: r.relType || '', relName: r.relName || '',
      age: parseInt(r.age, 10) || null, gender, genderEn,
      house: r.house || '', epic: (r.epic || '').replace(/\s+/g, '').toUpperCase(),
      pollDate: r.pollDate || '', page: r.page,
    };
  }

  // ---------- main ----------
  async function extract(PDFLib, bytes, onProgress) {
    const pdfDoc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const env = makeEnv(PDFLib, pdfDoc);
    const pages = pdfDoc.getPages();
    const out = [];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pieces = pageTextPieces(env, page);
      // split columns at the right-hand "మండల పరిషత్" label (fallback: 44% of width)
      const w = page.getWidth();
      let splitX = w * 0.44;
      const mand = pieces.filter(p => p.t.startsWith('మం') || p.t.startsWith('మండల')).map(p => p.x).filter(x => x > w * 0.3);
      if (mand.length) splitX = Math.min(...mand) - 4;
      const [left, right] = linesFromPieces(pieces, splitX);
      let recs = recordsFromLines(right, i + 1);
      if (!recs.length) recs = recordsFromLines(left, i + 1);
      for (const r of recs) out.push(normalizeRecord(r));
      if (onProgress) await onProgress(i + 1, pages.length);
    }
    // de-duplicate by EPIC+serial
    const seen = new Set(), res = [];
    for (const r of out) { const k = r.psNo + '|' + r.serial + '|' + r.epic; if (seen.has(k)) continue; seen.add(k); res.push(r); }
    return res;
  }

  const api = { extract, _pageTextPieces: pageTextPieces, _makeEnv: makeEnv, _linesFromPieces: linesFromPieces };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VoterExtract = api;
})(typeof window !== 'undefined' ? window : globalThis);
