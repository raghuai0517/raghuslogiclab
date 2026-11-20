/* AHL -> Census 2027 Household Schedule (compact enumerator format, English)
   Shared core: used by the web tool (browser) and the Claude skill (node). */
(function (root) {
  'use strict';
  const AHL = {};

  /* ------------------------------------------------------------------ */
  /* 1. Read AHL PDF text                                                */
  /* ------------------------------------------------------------------ */
  AHL.pdfWords = async function (pdfjsLib, data) {
    const doc = await pdfjsLib.getDocument({ data, disableWorker: true, isEvalSupported: false, verbosity: 0 }).promise;
    const pages = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const pg = await doc.getPage(p);
      const tc = await pg.getTextContent();
      const words = [];
      for (const it of tc.items) {
        const s = it.str; if (!s || !s.trim()) continue;
        const x = it.transform[4], y = it.transform[5], w = it.width, n = s.length;
        const re = /\S+/g; let m;
        while ((m = re.exec(s))) {
          const x0 = x + w * m.index / n, x1 = x + w * (m.index + m[0].length) / n;
          words.push({ t: m[0], x0, x1, xc: (x0 + x1) / 2, y });
        }
      }
      pages.push(words);
    }
    return pages;
  };

  function lines(words, tol) {
    tol = tol || 4.5;
    const ws = words.slice().sort((a, b) => b.y - a.y || a.x0 - b.x0);
    const out = [];
    for (const w of ws) {
      let L = null;
      for (const l of out) if (Math.abs(l.y - w.y) <= tol) { L = l; break; }
      if (!L) { L = { y: w.y, words: [] }; out.push(L); }
      L.words.push(w);
    }
    out.forEach(l => { l.words.sort((a, b) => a.x0 - b.x0); l.text = l.words.map(w => w.t).join(' '); });
    out.sort((a, b) => b.y - a.y);
    return out;
  }

  const between = (L, startRe, endRe) => {
    const ws = L.words; let i = ws.findIndex(w => startRe.test(w.t));
    if (i < 0) return '';
    const out = [];
    for (let k = i + 1; k < ws.length; k++) { if (endRe.test(ws[k].t)) break; out.push(ws[k].t); }
    return out.join(' ');
  };
  const digitsOf = (L, afterRe) => {
    const ws = L.words; let i = afterRe ? ws.findIndex(w => afterRe.test(w.t)) : -1;
    return ws.slice(i + 1).filter(w => /^\d$/.test(w.t)).map(w => w.t).join('');
  };

  AHL.parseAHL = function (pages) {
    const res = { loc: null, names: {}, hlb: null, totalHH: null, households: [], warnings: [] };
    const allLines = pages.map(p => lines(p));

    // --- location codes: the 21-digit "Location Code" row (State2 Dist2 Tahsil3 Village4 Ward4 EB4 SubBlock2)
    for (const pl of allLines) {
      for (const L of pl) {
        if (L.words.length === 21 && L.words.every(w => /^\d$/.test(w.t))) {
          const d = L.text.replace(/ /g, '');
          res.loc = { state: d.slice(0, 2), dist: d.slice(2, 4), sub: d.slice(4, 7), vill: d.slice(7, 11), ward: d.slice(11, 15), eb: d.slice(15, 19), subeb: d.slice(19, 21) };
          break;
        }
      }
      if (res.loc) break;
    }
    // --- identification block (names, and codes as fallback)
    const fb = {};
    for (const L of allLines[0].concat(allLines[1] || [])) {
      const t = L.text;
      if (/Name of State\/UT/.test(t)) { res.names.state = res.names.state || between(L, /^State\/UT$/, /^Code$/); fb.state = fb.state || digitsOf(L, /^Code$/); }
      else if (/Name of the district/i.test(t)) { res.names.district = res.names.district || between(L, /^district$/i, /^Code$/); fb.dist = fb.dist || digitsOf(L, /^Code$/); }
      else if (/Mandal/i.test(t) && /Name of/.test(t)) { res.names.mandal = res.names.mandal || between(L, /etc$/i, /^Code$/); fb.sub = fb.sub || digitsOf(L, /^Code$/); }
      else if (/Name of Town\/Village/i.test(t)) { res.names.village = res.names.village || between(L, /^Town\/Village$/i, /^Code$/); fb.vill = fb.vill || digitsOf(L, /^Code$/); }
      else if (/Ward Code/i.test(t)) { fb.ward = fb.ward || digitsOf(L, /^Code$/); }
      else if (/Enumeration Block Number/i.test(t)) { const d = digitsOf(L, /^Number$/); fb.eb = fb.eb || d.slice(0, 4); fb.subeb = fb.subeb || d.slice(4, 6); }
      else if (/Houselisting Block Number/i.test(t)) { res.hlb = res.hlb || digitsOf(L, /^Number$/).slice(0, 4); }
    }
    for (const pl of allLines) for (const L of pl) {
      let m = L.text.match(/Houselisting Block No\.?\s*:?\s*(\d{4})\b/i); if (m && !res.hlb) res.hlb = m[1];
      m = L.text.match(/Total Number of HLO Households in the EB\s*:?\s*(\d+)/i); if (m) res.totalHH = +m[1];
    }
    if (!res.loc) {
      res.loc = { state: fb.state || '', dist: fb.dist || '', sub: fb.sub || '', vill: fb.vill || '', ward: fb.ward || '', eb: fb.eb || '', subeb: fb.subeb || '' };
      res.warnings.push('Location Code row not found; codes taken from the identification block.');
    }
    if (!res.hlb) { res.hlb = res.loc.eb; res.warnings.push('Houselisting Block number not found; EB number used.'); }

    // --- Section 2 rows, column positions taken from the "1 2 3 4 5 6 7" column-number row on each page
    for (const pl of allLines) {
      const ci = pl.findIndex(L => L.words.length === 7 && L.words.every((w, k) => w.t === String(k + 1)));
      if (ci < 0) continue;
      const c = pl[ci].words.map(w => w.xc);
      const b = c.slice(0, 6).map((v, k) => (v + c[k + 1]) / 2);
      let last = null;
      for (let li = ci + 1; li < pl.length; li++) {
        const L = pl[li], ws = L.words;
        if (/^(Section|Page|Location|Concordance)/i.test(L.text)) { last = null; continue; }
        if (/^\d+$/.test(ws[0].t) && ws[0].xc < b[0] && ws.length >= 3) {
          const bno = ws.filter(w => w.xc > b[0] && w.xc <= b[1]).map(w => w.t).join(' ');
          const chno = ws.filter(w => w.xc > b[1] && w.xc <= b[2]).map(w => w.t).join('');
          const hh = ws.find(w => w.xc > b[2] && /^\d{1,4}$/.test(w.t) && Math.abs(w.xc - c[4]) < (c[5] - c[4]) / 2);
          if (hh) {
            const head = ws.filter(w => w.x0 > hh.x1 && w.xc < c[6] - 25).map(w => w.t).join(' ');
            last = { serial: +ws[0].t, bno, chno, hhno: hh.t.padStart(3, '0'), head, y: L.y };
            res.households.push(last);
          } else last = null;
        } else if (last && ws.every(w => w.xc > b[4] && w.xc < c[6] - 25) && last.y - L.y < 16) {
          last.head = (last.head + ' ' + L.text).trim(); last.y = L.y;   // wrapped head name
        }
      }
    }
    res.households.forEach(h => { h.head = h.head.replace(/\s+/g, ' ').trim(); delete h.y; });
    if (res.totalHH != null && res.totalHH !== res.households.length)
      res.warnings.push(`AHL says ${res.totalHH} households but ${res.households.length} were read.`);
    return res;
  };

  /* ------------------------------------------------------------------ */
  /* 2. Read CMMS Excel (optional)                                       */
  /* ------------------------------------------------------------------ */
  const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase();
  AHL.cmmsSheetNames = function (names, hlb) {
    const sum = names.find(n => /summary/i.test(n));
    const sh = names.find(n => norm(n) === 'hlb ' + hlb) || names.find(n => norm(n).includes(hlb));
    return { sum, sh };
  };
  AHL.parseCMMS = function (XLSX, wb, hlb) {
    const res = { hamlet: null, byHH: {}, sheet: null, warnings: [] };
    const { sum, sh } = AHL.cmmsSheetNames(wb.SheetNames, hlb);
    const rowsOf = n => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null });
    if (sum && wb.Sheets[sum]) {
      const R = rowsOf(sum); const hi = R.findIndex(r => r.some(v => norm(v) === 'hlb no.'));
      if (hi >= 0) {
        const H = R[hi].map(norm), iH = H.findIndex(v => v.startsWith('hamlet')), i0 = H.indexOf('hlb no.');
        const row = R.slice(hi + 1).find(r => r[i0] != null && String(r[i0]).trim().padStart(4, '0') === hlb);
        if (row && iH >= 0) res.hamlet = row[iH];
      }
    }
    if (!sh || !wb.Sheets[sh]) { res.warnings.push(`Sheet for HLB ${hlb} not found in the Excel file.`); return res; }
    res.sheet = sh;
    const R = rowsOf(sh); const hi = R.findIndex(r => r.some(v => norm(v) === 'household number'));
    if (hi < 0) { res.warnings.push(`Header row not found in sheet ${sh}.`); return res; }
    const H = R[hi].map(norm), col = k => H.findIndex(v => v.startsWith(k));
    const iHH = col('household number'), iN = col('total persons'), iName = col('name of head'), iSex = col('sex'),
      iCat = col('sc/st'), iMob = col('mobile'), iInst = col('is institutional'), iSt = col('status');
    for (const r of R.slice(hi + 1)) {
      if (r[iHH] == null || r[iHH] === '' || norm(r[iSt]) === 'deleted') continue;
      const k = String(parseInt(r[iHH], 10)).padStart(3, '0');
      const sx = norm(r[iSex]), ct = norm(r[iCat]);
      res.byHH[k] = {
        n: parseInt(r[iN], 10) || 0,
        head: r[iName],
        sex: /^male|పురుష/.test(sx) ? 'M' : /female|స్త్రీ/.test(sx) ? 'F' : sx ? 'T' : null,
        cat: /^sc$|కుల/.test(ct) ? 'SC' : /^st$|తెగ/.test(ct) ? 'ST' : ct ? 'Other' : null,
        mob: r[iMob] ? String(r[iMob]).replace(/\.0$/, '') : null,
        inst: r[iInst] === true || norm(r[iInst]) === 'true',
        known: true,
      };
    }
    return res;
  };

  AHL.merge = function (ahl, cmms) {
    const hhs = ahl.households.map(h => {
      const x = cmms && cmms.byHH[h.hhno];
      return Object.assign({}, h, x ? { n: x.n, sex: x.sex, cat: x.cat, mob: x.mob, inst: x.inst, known: true }
        : { n: null, sex: null, cat: null, mob: null, inst: null, known: false });
    });
    return { loc: ahl.loc, names: ahl.names, hlb: ahl.hlb, hamlet: (cmms && cmms.hamlet) || ahl.names.village || '', households: hhs };
  };

  /* ------------------------------------------------------------------ */
  /* 3. Build the printable HTML                                         */
  /* ------------------------------------------------------------------ */
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  AHL.CSS = `
@page { size: A4 landscape; margin: 7mm 8mm 8mm 8mm;
  @bottom-left { content: "Census of India 2027 · Household Schedule · Enumerator compact format (English)"; font: 6.5pt CSans, 'Liberation Sans', Arial, sans-serif; color:#555; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font: bold 7pt CSans, 'Liberation Sans', Arial, sans-serif; }
}
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; }
body { font-family: CSans, 'Liberation Sans', Arial, sans-serif; font-size: 7.5pt; color: #000; }
.pg { break-after: page; page-break-after: always; }
.pg:last-child { break-after: auto; page-break-after: auto; }
.title { display: flex; align-items: center; justify-content: space-between; border: 1.4pt solid #000; padding: 1.2mm 2.5mm; margin-bottom: 1.5mm; }
.title .t1 { font-size: 13pt; font-weight: bold; letter-spacing: .3pt; }
.title .t2 { font-size: 7pt; text-align: right; line-height: 1.35; }
.conf { font-style: italic; }
table { border-collapse: collapse; width: 100%; }
td, th { border: .6pt solid #000; padding: .5mm .8mm; vertical-align: top; }
th { background: #e6e6e6; font-weight: bold; text-align: center; vertical-align: middle; }
.loc { table-layout: fixed; }
.loc td { height: 8.5mm; }
.loc .lab { background: #e6e6e6; font-weight: bold; vertical-align: middle; }
.digits { display: flex; height: 5.2mm; margin-top: .6mm; }
.digits span { flex: 1; border: .5pt solid #000; border-right: none; text-align: center; font: bold 9pt CSans, 'Liberation Sans', Arial, sans-serif; color: #0a2f8a; line-height: 5mm; }
.digits span:last-child { border-right: .5pt solid #000; }
.small { font-size: 6pt; font-weight: normal; color: #333; }
.leg { font-family: CSansN, 'Liberation Sans Narrow', 'Arial Narrow', CSans, Arial, sans-serif; font-size: 6.6pt; font-weight: normal; line-height: 1.2; color: #111; }
.roster { table-layout: fixed; }
.roster td { height: 17.5mm; }
.roster th { font-size: 7pt; line-height: 1.15; padding: .6mm .5mm; }
.roster .sl { text-align: center; vertical-align: middle; font-weight: bold; font-size: 10pt; }
.roster td.big { font-size: 9pt; }
.c { text-align: center; }
.circ { font-family: CSansN, 'Liberation Sans Narrow', 'Arial Narrow', CSans, Arial, sans-serif; font-size: 7pt; color: #222; }
.ln { border-bottom: .5pt dotted #555; height: 4.2mm; }
.mini { font-size: 6pt; color: #333; font-family: CSansN, 'Liberation Sans Narrow', 'Arial Narrow', CSans, Arial, sans-serif; }
.dob { font-size: 6.5pt; color: #666; letter-spacing: .3pt; text-align: center; padding-top: 1mm; }
.foot { font-size: 6.3pt; margin-top: 1mm; line-height: 1.3; }
.mx { table-layout: fixed; }
.mx td.q { width: 9mm; text-align: center; font-weight: bold; }
.mx td.lbl, .mx th.lbl { width: 86mm; }
.mx thead th { font-size: 8pt; }
.mx tbody { break-inside: avoid; page-break-inside: avoid; }
.mx tr.sec td { background: #d4d4d4; font-weight: bold; font-size: 7.5pt; padding: .6mm 1mm; }
.cellin { font-family: CSansN, 'Liberation Sans Narrow', 'Arial Narrow', CSans, Arial, sans-serif; font-size: 6.4pt; color: #444; }
.yn { font-family: CSansN, 'Liberation Sans Narrow', 'Arial Narrow', CSans, Arial, sans-serif; font-size: 7.5pt; color:#222; }
.boxes { display:flex; gap: 1.2mm; margin-top: .6mm; }
.boxes span { width: 6mm; height: 4.6mm; border: .5pt solid #000; display:inline-block; }
.sigs { margin-top: 2mm; break-inside: avoid; }
.sigs td { height: 13mm; vertical-align: bottom; text-align: center; font-size: 6.5pt; color: #333; }
.note { font-size: 6.4pt; margin: 1mm 0 0 0; }
.pf { color:#0a2f8a; font-weight:bold; }
.on, .opt { display:inline-block; padding:0 .9mm; border:1.3pt solid transparent; border-radius:50%; margin-right: .8mm; }
.on { border-color:#0a2f8a; color:#0a2f8a; font-weight:bold; }
.circ, .yn { white-space: nowrap; }
.circ .on, .circ .opt { margin-right: .2mm; padding: 0 .7mm; }
.hhtag { float: right; color:#0a2f8a; font-size: 7.5pt; }
`;

  const opts = (letters, sel) => letters.split('').map(l => `<span class="${l === sel ? 'on' : 'opt'}">${l}</span>`).join('');
  const L = t => `<span class='leg'>${t}</span>`;
  const CELL = {
    '': '',
    YN: `<span class="yn">${opts('YN')}</span>`,
    LI: `<span class="yn">${opts('LI')}</span>`,
    RU: `<span class="yn">${opts('RU')}</span>`,
    STDT: '<span class="cellin">St ____ &nbsp; Dt ____</span>',
    WIN: '<span class="cellin">St ____ &nbsp; Dt ____<br><br>Vill/Town:</span>',
    DOB: '<div class="dob" style="padding-top:.4mm">DD / MM / YYYY</div>',
    DS: '<span class="cellin">D ____ &nbsp; S ____</span>',
    HHMM: '<span class="cellin">____ h ____ m</span>',
    KM: '<span class="cellin">______ km</span>',
    CODE: '<span class="cellin">Code ____</span>',
    CTRY: '<span class="cellin">Code ___ Name</span>',
    BOX3: '<div class="boxes"><span></span><span></span><span></span></div>',
    SLNO: '<span class="cellin">Sl. No. ____</span>',
    CLASS: '<span class="cellin">Code ___ &nbsp; Class ___</span>',
    COVID: '<span class="cellin">St ___ Dt ___<br>Country</span>',
  };
  const REL = '1 Hindu · 2 Muslim · 3 Christian · 4 Sikh · 5 Buddhist · 6 Jain · 7 Other (write name)';
  const parent = (q, who) => [`${q}. ${who}’s Particulars`, [
    [String(q), `<b>${who} is a member of this HH?</b> If Yes, write ${who.toLowerCase()}’s Sl. No.<br>` + L('If not enumerated in this HH / not alive → fill (a) to (d)'), 'SLNO', 8],
    ['', 'a) Name', '', 8],
    ['', 'b) Date of Birth', 'DOB', 6],
    ['', 'c) Place of Birth#: <b>Within India</b> – State code, District code &amp; Village/Town (with locality) name', 'WIN', 10],
    ['', '&nbsp;&nbsp;&nbsp;&nbsp; <b>Outside India</b> – Country code &amp; name', 'CTRY', 6.5],
    ['', 'd) Religion ' + L(REL), '', 6.5],
  ]];
  const Q1824 = '(for marginal, semi-marginal &amp; non-worker in Q18)';
  // three matrix pages
  AHL.PAGES = [
    [parent(11, 'Father'), parent(12, 'Mother'),
     ['13. Disability · 14. Mother tongue &amp; other languages', [
       ['13a', 'Does this person have any disability?', 'YN', 5.5],
       ['13b', 'If Yes, write code(s) – maximum 3 ' + L('1 Seeing · 2 Hearing · 3 Speech · 4 Mobility · 5 Intellectual disability · 6 Mental illness · 7 Due to acid attack · 8 Due to chronic neurological disease · 9 Due to blood disorder'), 'BOX3', 9],
       ['14a', 'Mother tongue – code ' + L('(write name if others)'), 'CODE', 7],
       ['14b', 'Language 1 known – code ' + L('(in order of proficiency, excluding mother tongue; name if others)'), 'CODE', 7],
       ['14c', 'Language 2 known – code ' + L('(name if others)'), 'CODE', 6.5]]],
     ['15. Literacy · 16. Attendance in educational institution', [
       ['15a', 'Literacy status ' + L('(for 7 years of age &amp; above) · L = Literate, I = Illiterate'), 'LI', 5.5],
       ['15b', 'If literate, whether digitally literate?', 'YN', 5.5],
       ['16', 'Attendance in educational institution ' + L('<b>Attending:</b> 1 School · 2 College · 3 Vocational · 4 Professional · 5 Special institution for disabled · 6 Literacy centre · 7 Other institution · <b>Not attending:</b> 8 Attended before · 9 Never attended'), '', 9]]]],
    [['17. Highest educational level &amp; Stream/Discipline', [
       ['17a', 'Highest educational level ' + L('1 Pre-primary · 2 Class 1–12 (write class) · 3 ITI · 4 Diploma/Certificate · 5 Bachelor/Undergraduate · 6 PG Diploma · 7 Masters/Postgraduate · 8 M.Phil. · 9 Doctorate &amp; above'), 'CLASS', 9],
       ['17b', 'Stream/Discipline ' + L('(Class 11 or higher) 1 Arts/Social Science · 2 Science · 3 Commerce · 4 Engineering &amp; Technology · 5 IT &amp; Computer · 6 Language · 7 Medical Science · 8 Education · 9 Management · 10 Law · 11 Agriculture &amp; allied · 12 Other'), '', 9]]],
     ['18–25. Work', [
       ['18', 'Worked any time during last year? ' + L('<b>Yes:</b> 1 Main worker (6 months or more) · 2 Marginal worker (3 months or more but &lt; 6 months) · 3 Semi-marginal worker (&lt; 3 months) · <b>No:</b> 4 Non-worker (not worked at all)'), '', 9],
       ['19', 'Category of economic activity ' + L('1 Cultivator · 2 Agricultural labourer · 3 Worker in household industry · <b>Other worker engaged in:</b> 4 Plantation, livestock, forestry, fishing, hunting &amp; allied · 5 Manufacturing · 6 Construction · 7 Services · 8 Other activities'), '', 9],
       ['20', 'Occupation ' + L('(for worker in HH industry or other worker – write)'), '', 9],
       ['21', 'Nature of industry, trade or service ' + L('(for worker in HH industry or other worker – write)'), '', 9],
       ['22', 'Class of worker ' + L('(HH industry or other worker) 1 Employer · 2 Employee · 3 Single worker · 4 Family worker'), '', 6.5],
       ['23', 'Non-economic activity ' + L(Q1824 + ' 1 Student · 2 Household duties · 3 Dependent · 4 Pensioner · 5 Rentier · 6 Other'), '', 6.5],
       ['24', 'Seeking / available for work ' + L(Q1824 + ' Yes: 1 Full-time work · 2 Part-time work · 3 No'), '', 6.5],
       ['25a', 'Travel to work ' + L('(for ‘Other worker’ in Q19)') + ' – (i) one-way distance in km', 'KM', 5.5],
       ['', '(ii) Travel time – hours &amp; minutes', 'HHMM', 5.5],
       ['25b', 'Mode of travel ' + L('1 On foot · 2 Bicycle · 3 Moped/Scooter/Motorcycle · 4 Car/Jeep/Van · 5 Tempo/Auto-rickshaw/Taxi · 6 Bus · 7 Train/Metro rail · 8 Water transport · 9 Any other · 10 No travel'), '', 8]]],
     ['26–27. Birth place &amp; place of last residence', [
       ['26', 'Born outside this Village/Town? ' + L('If Yes, fill below'), 'YN', 5.5],
       ['', '<b>Within India</b> – State code, District code &amp; Village/Town (with locality) name', 'WIN', 10],
       ['', '<b>Outside India</b> – Country code &amp; name', 'CTRY', 6.5],
       ['27a', 'Came to this Village/Town from elsewhere? ' + L('If Yes, place of last residence:'), 'YN', 5.5],
       ['', '<b>Within India</b> – State code, District code &amp; Village/Town (with locality) name', 'WIN', 10],
       ['', '<b>Outside India</b> – Country code &amp; name', 'CTRY', 6.5],
       ['27b', 'Status of place of last residence at time of migration ' + L('R = Rural, U = Urban'), 'RU', 5.5]]]],
    [['28. Reason for migration · 29. Duration of stay · 30. Permanent residential address', [
       ['28', 'Reason for migration ' + L('1 Work/Employment · 2 Business · 3 Education · 4 Marriage · 5 Moved after birth · 6 Moved with household · 7 Natural calamities · 8 Any other'), '', 7],
       ['29', 'Duration of stay in this village/town since last migration ' + L('(completed years)'), '', 5.5],
       ['30', L('1 Same as present address · 2 Same as head of household (not for head) · otherwise leave blank and write below'), '', 6],
       ['', 'a) State code, b) District code', 'STDT', 6],
       ['', 'c) Town/Village', '', 7],
       ['', 'd) House Number &amp; Locality', '', 9],
       ['', 'If outside India – Country code &amp; name', 'CTRY', 6.5]]],
     ['31–33. Fertility (women only) · 34–40. Other particulars', [
       ['31', 'Children surviving at present – Daughters, Sons ' + L('(currently married, widowed, divorced &amp; separated women only)'), 'DS', 7],
       ['32', 'Children ever born alive – Daughters, Sons ' + L('(same women as Q31)'), 'DS', 6],
       ['33', 'Children born alive during last one year – D, S ' + L('(currently married women only)'), 'DS', 6],
       ['34', 'Vaccination for Covid-19 taken?', 'YN', 5.5],
       ['', 'If Yes, place: <b>Within India</b> – St/Dt code, or <b>Outside India</b> – Country code &amp; name', 'COVID', 8],
       ['35', 'Total number of Bank Accounts', '', 5.5],
       ['36', 'Mobile Number available? If Yes, write number', 'YN', 8],
       ['37', 'Aadhaar Number available? If Yes, write number', 'YN', 8],
       ['38', 'Voter ID Number available? If Yes, write number', 'YN', 8],
       ['39', 'Indian Passport holder? If Yes, write Passport number', 'YN', 8],
       ['40', 'Driving License available?', 'YN', 5.5],
       ['', '<b>Respondent</b> – Serial No., Signature / Thumb impression &amp; Date', 'SLNO', 13]]]],
  ];
  AHL.ROWSCALE = 1.06;

  const dg = v => '<div class="digits">' + String(v || '').split('').map(c => `<span>${esc(c)}</span>`).join('') + '</div>';

  function page1(d, h, n, tag) {
    const head = h.head ? `<span class="pf">${esc(h.head)}</span>` : '';
    const htype = h.inst === true ? 'Institutional' : h.inst === false ? 'Normal' : '';
    const sc = { SC: 'Y', ST: 'N', Other: 'N' }[h.cat], st = { SC: 'N', ST: 'Y', Other: 'N' }[h.cat];
    const info = h.known ? `Persons in household (HLO): <b class="pf">${h.n}</b>${h.n > 6 ? ` (total ${h.n} – only first 6 here)` : ''}`
      : 'Persons in household: <b>not in Excel – 6 slots given</b>';
    const big = v => `<span class="pf" style="font-size:10pt">${esc(v)}</span>`;
    let s = `<div class="pg"><div class="title">
  <div><span class="t1">CENSUS OF INDIA 2027 — HOUSEHOLD SCHEDULE</span>
  &nbsp; <span class="small">HLB ${esc(d.hlb)} · ${esc(d.names.village || '')} · ${info}</span></div>
  <div class="t2"><span class="conf">Confidential when filled</span> &nbsp;<span class="pf">${esc(tag)}</span><br>Page 1: Q1–10 · Pages 2–4: Q11–40</div>
</div>
<table class="loc"><tr>
 <td class="lab" style="width:24mm">Location<br>Particulars</td>
 <td style="width:18mm"><b>State^</b> <span class="small">2 digits</span>${dg(d.loc.state)}</td>
 <td style="width:18mm"><b>District</b> <span class="small">2</span>${dg(d.loc.dist)}</td>
 <td style="width:24mm"><b>Sub-district</b> <span class="small">3</span>${dg(d.loc.sub)}</td>
 <td style="width:30mm"><b>Village/Town</b> <span class="small">4</span>${dg(d.loc.vill)}</td>
 <td style="width:30mm"><b>Ward</b> <span class="small">4</span>${dg(d.loc.ward)}</td>
 <td style="width:30mm"><b>EB Code</b> <span class="small">4</span>${dg(d.loc.eb)}</td>
 <td style="width:18mm"><b>Sub-EB</b> <span class="small">2</span>${dg(d.loc.subeb)}</td>
 <td><b>Building No.</b><br>${big(h.bno)}</td>
 <td><b>Census House No.</b><br>${big(h.chno)}</td>
 <td><b>Household No.</b><br>${big(h.hhno)}</td>
 <td><b>Type of Household</b><br>${big(htype)}</td>
</tr><tr>
 <td class="lab">House Number</td><td colspan="2"></td>
 <td class="lab">Hamlet / Locality</td><td colspan="4">${big(d.hamlet)}</td>
 <td class="lab">Institutional HH details, if applicable</td><td colspan="3"></td>
</tr></table>
<div style="height:1.5mm"></div>
<table class="roster"><thead><tr>
 <th style="width:7mm">Sl.<br>No.</th>
 <th style="width:37mm">01. Name of the person<br><span class="small">(Start with Head of Household)</span></th>
 <th style="width:11mm">02. Relation to head<br><span class="small">(Code)</span></th>
 <th style="width:15mm">03. Sex<br><span class="leg">Circle<br>M F T</span></th>
 <th style="width:25mm">04. (a) Date of Birth<br>(b) Age <span class="small">(compl. yrs)</span></th>
 <th style="width:17mm">05. Marital status<br><span class="leg">1 Never mar.<br>2 Curr. married<br>3 Widowed<br>4 Separated<br>5 Divorced</span></th>
 <th style="width:12mm">06. Age at marriage<br><span class="leg">(not for never married)</span></th>
 <th style="width:31mm">07. Spouse name<br><span class="leg">(If spouse is HH member, give Sl. No.)</span></th>
 <th style="width:19mm">08. Nationality<br><span class="leg">1 Indian<br>2 Others → write country</span></th>
 <th style="width:20mm">09. Religion<br><span class="leg">1 Hindu 2 Muslim<br>3 Christian 4 Sikh<br>5 Buddhist 6 Jain<br>7 Other → write name</span></th>
 <th style="width:27mm">10(a). Scheduled Caste (SC)?<br><span class="leg">If Yes: Code &amp; Name of SC</span></th>
 <th style="width:27mm">10(b). Scheduled Tribe (ST)?<br><span class="leg">If Yes: Code &amp; Name of ST</span></th>
 <th>10(c). If not SC/ST in this State/UT:<br><span class="leg">Name of Caste, or circle<br>DND = Does not want to declare · NC = No Caste</span></th>
</tr></thead><tbody>`;
    for (let i = 1; i <= n; i++) {
      const hd = i === 1;
      s += `<tr>
 <td class="sl">${i}</td>
 <td class="big">${hd ? head : ''}</td>
 <td></td>
 <td class="c" style="vertical-align:middle"><span class="circ">${opts('MFT', hd ? h.sex : null)}</span></td>
 <td><div class="mini">(a)</div><div class="dob">DD / MM / YYYY</div><div class="mini" style="margin-top:2.2mm">(b) Age: ______</div></td>
 <td></td><td></td>
 <td><div class="ln"></div><div class="mini" style="margin-top:2.5mm">Sl. No. ____</div></td>
 <td><div class="mini" style="margin-top:7mm">Country:</div></td>
 <td><div class="mini" style="margin-top:7mm">Other:</div></td>
 <td><span class="yn">${opts('YN', hd ? sc : null)}</span><div class="mini" style="margin-top:1.2mm">Code ______</div><div class="mini" style="margin-top:1.4mm">Name:</div></td>
 <td><span class="yn">${opts('YN', hd ? st : null)}</span><div class="mini" style="margin-top:1.2mm">Code ______</div><div class="mini" style="margin-top:1.4mm">Name:</div></td>
 <td><div class="mini">Caste name:</div><div class="mini" style="margin-top:6mm">or circle: &nbsp; DND &nbsp;&nbsp; NC</div></td>
</tr>`;
    }
    s += `</tbody></table>
<div class="foot">^ State includes Union Territory (UT) also. &nbsp;·&nbsp; * SC can only be among Hindus, Sikhs and Buddhists. ST can be of any religion. &nbsp;·&nbsp;
Write the option number (code) where options are numbered; circle the letter where letters are printed (Y = Yes, N = No, M = Male, F = Female, T = TGP). &nbsp;·&nbsp; <span class="pf">Blue</span> = prefilled from AHL / CMMS.</div></div>`;
    return s;
  }

  function matrixPage(d, h, n, sections, tag, last) {
    const cw = ((281 - 9 - 86) / n).toFixed(1);
    let s = `<div class="pg"><table class="mx"><thead><tr><th style="width:9mm">Q.</th><th class="lbl" style="text-align:left">Question &nbsp;<span class='small'>(write code / circle Y N)</span><span class="hhtag">${esc(tag)}</span></th>` +
      Array.from({ length: n }, (_, i) => `<th style="width:${cw}mm">Member Sl. No. ${i + 1}</th>`).join('') + `</tr>
<tr><td colspan='2' style='font-weight:bold;height:7mm;vertical-align:middle'>Household member name</td>` +
      Array.from({ length: n }, (_, i) => `<td>${i === 0 && h.head ? `<span class="pf">${esc(h.head)}</span>` : ''}</td>`).join('') + '</tr></thead>';
    for (const [title, rows] of sections) {
      const groups = [];
      for (const r of rows) { if (r[0] === '' && groups.length) groups[groups.length - 1].push(r); else groups.push([r]); }
      groups.forEach((g, gi) => {
        s += '<tbody>';
        if (gi === 0) s += `<tr class="sec"><td colspan="${n + 2}">${title}</td></tr>`;
        for (const [q, lbl, cell, ht] of g) {
          s += `<tr style="height:${(ht * AHL.ROWSCALE).toFixed(1)}mm"><td class="q">${q}</td><td class="lbl">${lbl}</td>`;
          for (let i = 1; i <= n; i++) {
            let c = CELL[cell];
            if (q === '36' && i === 1 && h.mob) c = `<span class="yn">${opts('YN', 'Y')}</span><div class="pf" style="font-size:9pt;margin-top:.5mm">${esc(h.mob)}</div>`;
            s += `<td class="cell">${c}</td>`;
          }
          s += '</tr>';
        }
        s += '</tbody>';
      });
    }
    s += '</table>';
    if (last) s += `<table class="sigs"><tr><td style="width:50%">Signature of Enumerator with Date</td><td>Signature of Supervisor with Date</td></tr></table>
<div class="note"># For countries outside India, State and District details are not required.</div>`;
    return s + '</div>';
  }

  AHL.SCREEN = `
@media screen {
  body { background: #d9dde3; padding-top: 14mm; }
  .pg { width: 281mm; min-height: 195mm; margin: 6mm auto; background: #fff; padding: 0; box-shadow: 0 1px 6px rgba(0,0,0,.25); outline: 7mm solid #fff; }
  .bar { position: fixed; top: 0; left: 0; right: 0; z-index: 9; background: #0a2f8a; color: #fff; font: 14px CSans, Arial, sans-serif; padding: 10px 16px; display: flex; gap: 16px; align-items: center; }
  .bar button { font: bold 14px CSans, Arial, sans-serif; padding: 7px 16px; border: 0; border-radius: 6px; background: #fff; color: #0a2f8a; cursor: pointer; }
}
@media print { .bar { display: none; } }
`;
  AHL.buildHTML = function (d, fontCSS, opt) {
    opt = opt || {};
    let body = '';
    for (const h of d.households) {
      const n = h.known && h.n > 0 ? Math.min(h.n, 6) : 6;
      const tag = `HH No. ${h.hhno} · ${h.head || ''} · ${h.bno}`;
      body += page1(d, h, n, tag);
      AHL.PAGES.forEach((secs, k) => { body += matrixPage(d, h, n, secs, tag, k === AHL.PAGES.length - 1); });
    }
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Household Schedules – HLB ${esc(d.hlb)} ${esc(d.names.village || '')}</title>
<style>${fontCSS || ''}${AHL.CSS}${opt.screen ? AHL.SCREEN : ''}</style></head><body>${opt.screen ? `<div class="bar"><button onclick="window.print()">Print / Save as PDF</button><span>${d.households.length} households · ${d.households.length * 4} pages · A4 landscape · use Chrome or Edge, Margins: Default, Scale: 100, tick “Background graphics”</span></div>` : ''}${body}</body></html>`;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AHL; else root.AHL = AHL;
})(typeof window !== 'undefined' ? window : globalThis);
