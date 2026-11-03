// Excel workbook builder (SheetJS).
(function (root) {
  'use strict';
  const COLS = [
    ['క్ర.సం. (S.No)', (r, i) => i + 1, 7],
    ['పోలింగ్ స్టేషన్ నెం. (PS No)', r => isNaN(+r.psNo) ? r.psNo : +r.psNo, 10],
    ['పోలింగ్ స్టేషన్ పేరు (PS Name)', r => r.psName, 26],
    ['MPTC నియోజకవర్గం', r => r.mptc, 16],
    ['గ్రామ పంచాయతీ (GP)', r => r.gp, 16],
    ['వరుస సంఖ్య (Serial No)', r => r.serial, 10],
    ['ఓటరు పేరు (Voter Name)', r => r.name, 28],
    ['Name (English, approx.)', r => r._en || '', 26],
    ['సంబంధం (Relation)', r => r.relType, 10],
    ['తండ్రి/భర్త/తల్లి పేరు (Relative Name)', r => r.relName, 28],
    ['వయస్సు (Age)', r => r.age, 7],
    ['లింగము (Gender)', r => r.gender, 10],
    ['M/F', r => r.genderEn, 5],
    ['ఇంటి నెం. (House No)', r => r.house, 12],
    ['ఎపిక్ నెంబర్ (EPIC No)', r => r.epic, 14],
    ['పోలింగు తేది (Poll Date)', r => r.pollDate, 12],
    ['PDF పేజీ (Page)', r => r.page, 7],
  ];
  function build(XLSX, rows, opts) {
    opts = opts || {};
    const wb = XLSX.utils.book_new();
    const aoa = [COLS.map(c => c[0])].concat(rows.map((r, i) => COLS.map(c => { const v = c[1](r, i); return v == null ? '' : v; })));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = COLS.map(c => ({ wch: c[2] }));
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(aoa.length - 1, 1), c: COLS.length - 1 } }) };
    XLSX.utils.book_append_sheet(wb, ws, 'Voters');

    // summary by polling station
    const groups = new Map();
    for (const r of rows) { const k = r.psNo + '|' + r.gp; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
    const bands = [[18, 25], [26, 35], [36, 45], [46, 60], [61, 200]];
    const head = ['PS No', 'PS Name', 'GP', 'MPTC', 'Total', 'Male', 'Female', 'Serial From', 'Serial To', '18-25', '26-35', '36-45', '46-60', '60+'];
    const sum = [head];
    for (const [, g] of groups) {
      const s = g.map(r => r.serial).filter(Boolean);
      sum.push([isNaN(+g[0].psNo) ? g[0].psNo : +g[0].psNo, g[0].psName, g[0].gp, g[0].mptc, g.length,
        g.filter(r => r.genderEn === 'M').length, g.filter(r => r.genderEn === 'F').length,
        s.length ? Math.min(...s) : '', s.length ? Math.max(...s) : '',
        ...bands.map(([a, b]) => g.filter(r => r.age >= a && r.age <= b).length)]);
    }
    if (groups.size > 1) sum.push(['Total', '', '', '', rows.length, rows.filter(r => r.genderEn === 'M').length, rows.filter(r => r.genderEn === 'F').length, '', '',
      ...bands.map(([a, b]) => rows.filter(r => r.age >= a && r.age <= b).length)]);
    if (opts.filterText) { sum.push([]); sum.push(['Filters / శోధన:', opts.filterText]); }
    const ws2 = XLSX.utils.aoa_to_sheet(sum);
    ws2['!cols'] = head.map((h, i) => ({ wch: i === 1 ? 26 : i === 2 || i === 3 ? 16 : 9 }));
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');
    return XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true });
  }
  const api = { build, COLS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VoterExport = api;
})(typeof window !== 'undefined' ? window : globalThis);
