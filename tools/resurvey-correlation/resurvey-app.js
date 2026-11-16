/* Resurvey Correlation Check & 9(2) Notices — page code. © RLL – RaghusLogicLab.
   Checking logic lives in resurvey-core.js. Everything runs in the browser. */
(function () {
'use strict';

const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const colLetter = i => { let s = ''; i++; while (i > 0){ const m = (i-1) % 26; s = String.fromCharCode(65+m) + s; i = Math.floor((i-1)/26); } return s; };
const GOVT = /govt|government|poramboke|panchayat|ప్రభుత్వ|పోరంబోకు/i;
const STORE = 'rll.resurvey.v1';
const NFIELDS = ['n-village','n-mandal','n-district','n-prefix','n-officer','n-desig','n-vs','n-vro','n-auth','n-days','n-mode','n-lang'];

const state = {
  sourceName:'', isSample:true, sheets:[], sheet:'', rows:[], headerRow:0, headers:[], map:{},
  result:null, sev:'all', check:'all', q:'', tab:'issues',
  notices:[], off:new Set(), cur:0, skipped:{err:0, govt:0, noOwner:0}
};
let currentGet = null;

/* ---------- loading ---------- */
function opts(){
  return {
    uOld:$('u-old').value, uNew:$('u-new').value,
    tolPct:Number($('tol-pct').value)||0, tolAbsCents:Number($('tol-abs').value)||0,
    nameThr:Number($('name-thr').value), fillMerged:$('fill').checked
  };
}
function initSelects(){
  for (const id of ['u-old','u-new']) $(id).innerHTML = Object.entries(UNITS).map(([k,u]) => `<option value="${k}">${esc(u.label)}</option>`).join('');
}
function guessUnits(){
  const h = k => state.map[k] >= 0 ? normHeader(state.headers[state.map[k]]) : '';
  const pick = s => /hect|\bha\b/.test(s) ? 'ha' : /sq\.?\s*(m|mt)/.test(s) ? 'sqm' : /sq\.?\s*y/.test(s) ? 'sqyd' : /cent/.test(s) && !/ac/.test(s) ? 'cents' : 'ac';
  $('u-old').value = pick(h('oldExt'));
  $('u-new').value = pick(h('lpExt') || h('portion'));
}
function loadRows(rows, name, isSample){
  state.rows = rows; state.sourceName = name; state.isSample = isSample;
  state.off = new Set(); state.cur = 0;
  setHeader(detectHeaderRow(rows), true);
}
function setHeader(idx, remap){
  state.headerRow = Math.max(0, Math.min(idx, Math.max(0, state.rows.length-1)));
  state.headers = (state.rows[state.headerRow] || []).map(cellStr);
  const maxLen = state.rows.reduce((m,r) => Math.max(m, (r||[]).length), 0);
  while (state.headers.length < maxLen) state.headers.push('');
  $('hdr').value = state.headerRow + 1;
  if (remap){ state.map = autoMap(state.headers); guessUnits(); }
  renderSource(); renderMap(); run();
}
function renderSource(){
  const n = Math.max(0, state.rows.length - state.headerRow - 1);
  $('source').innerHTML = (state.isSample ? '<span class="badge">Example data</span>' : '') +
    `<span><b>${esc(state.sourceName)}</b></span><span class="muted">${n} rows below the header</span>` +
    (state.isSample ? '<span class="muted">Made-up village. Upload your own statement to check real data.</span>' : '');
  const sel = $('sheet');
  sel.innerHTML = state.sheets.map(s => `<option${s===state.sheet?' selected':''}>${esc(s)}</option>`).join('');
  sel.disabled = state.sheets.length < 2;
}
function renderMap(){
  const opt = i => `<option value="${i}">${colLetter(i)} · ${esc(state.headers[i] || '(no title)')}</option>`;
  $('mapgrid').innerHTML = FIELDS.map(f => {
    const v = state.map[f.k];
    return `<label class="f${f.req && v < 0 ? ' missing' : ''}" for="m-${f.k}">${esc(f.en)}${f.req ? ' <span class="req">*</span>' : ''} <span class="te">${f.te}</span>
      <select id="m-${f.k}" data-k="${f.k}"><option value="-1">Not in file</option>${state.headers.map((_,i) => opt(i)).join('')}</select></label>`;
  }).join('');
  FIELDS.forEach(f => { $('m-'+f.k).value = String(state.map[f.k]); });
  $('mapgrid').querySelectorAll('select').forEach(s => s.addEventListener('change', e => {
    const k = e.target.dataset.k, v = Number(e.target.value);
    if (v >= 0) for (const kk in state.map) if (kk !== k && state.map[kk] === v) state.map[kk] = -1;
    state.map[k] = v; renderMap(); run();
  }));
}
function readWorkbook(buf, name){
  if (typeof XLSX === 'undefined'){
    if (/\.csv$/i.test(name)) return {sheets:['CSV'], get:() => parseCSV(new TextDecoder().decode(buf))};
    throw new Error('The Excel reader did not load. Reload the page, or save the sheet as CSV and try again.');
  }
  const wb = XLSX.read(buf, {type:'array'});
  return {sheets:wb.SheetNames, get:s => XLSX.utils.sheet_to_json(wb.Sheets[s], {header:1, raw:true, defval:'', blankrows:true})};
}
function parseCSV(text){
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++){
    const ch = text[i];
    if (q){ if (ch === '"'){ if (text[i+1] === '"'){ cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ','){ row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r'){ if (ch === '\r' && text[i+1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur !== '' || row.length){ row.push(cur); rows.push(row); }
  return rows.map(r => r.map(c => { const t = c.replace(/^﻿/,'').trim(); return t !== '' && /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : t; }));
}
function bestSheet(names, get){
  let best = names[0], bestScore = -1;
  for (const n of names){
    const rows = get(n), h = detectHeaderRow(rows);
    const sc = headerScore(rows[h] || []) * 1000 + Math.min(rows.length, 999);
    if (sc > bestScore){ bestScore = sc; best = n; }
  }
  return best;
}
async function onFile(file){
  $('loaderr').hidden = true;
  try {
    const buf = await file.arrayBuffer();
    const wb = readWorkbook(buf, file.name);
    currentGet = wb.get; state.sheets = wb.sheets; state.sheet = bestSheet(wb.sheets, wb.get);
    state.sev = 'all'; state.check = 'all'; state.q = ''; $('q').value = '';
    loadRows(wb.get(state.sheet), file.name, false);
    if (!$('n-village').value){ const v = file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').replace(/correlation|statement|resurvey/ig,'').trim(); if (v && v.length < 40) $('n-village').value = v; buildNotices(); }
    toast('Loaded ' + file.name);
  } catch (e){
    $('loaderr').textContent = 'Could not read this file. ' + (e && e.message ? e.message : '');
    $('loaderr').hidden = false;
  }
}
function loadSample(){
  currentGet = null; state.sheets = ['Sheet1']; state.sheet = 'Sheet1'; state.sev = 'all'; state.check = 'all';
  loadRows(SAMPLE, 'Kondapalem (V) correlation statement', true);
}

/* ---------- check results ---------- */
function run(){
  DISP = $('disp').value;
  state.result = analyse(state.rows, state.headerRow, state.map, opts());
  const req = FIELDS.filter(f => f.req && state.map[f.k] < 0);
  if (req.length) state.result.missingMap = req.map(f => f.en);
  renderResults();
  buildNotices();
}
const SEV_LABEL = {error:'Error', warning:'Warning', info:'Info'};
const STATUS = {ok:['ok','Matches'], mismatch:['error','Mismatch'], unresolved:['warning','Needs part extent'], incomplete:['error','Data missing']};
const statusPill = s => { const [c,l] = STATUS[s] || ['info', s]; return `<span class="pill ${c}">${l}</span>`; };
function renderResults(){
  const R = state.result, c = R.counts;
  const card = (n, l, cls) => `<div class="card ${cls}"><b>${n}</b><span>${l}</span></div>`;
  $('tiles').innerHTML = card(R.recs.length, 'Rows checked', '') + card(R.syList.length, 'Survey numbers', '') + card(R.lpList.length, 'LP numbers', '') +
    card(c.error, c.error === 1 ? 'Error to fix' : 'Errors to fix', c.error ? 'err' : 'ok') +
    card(c.warning, c.warning === 1 ? 'Warning to verify' : 'Warnings to verify', c.warning ? 'warn' : 'ok');
  const diff = R.totalNew - R.totalOld, pct = R.totalOld ? diff / R.totalOld * 100 : 0, o = opts();
  const within = Math.abs(diff) <= Math.max(o.tolAbsCents*0.01, o.tolPct/100*R.totalOld) + 1e-9;
  let tot = `<b>Village total</b><span>Old ${fmt(R.totalOld)}</span><span>New ${fmt(R.totalNew)}</span><span>Difference ${fmtSigned(diff)} (${signed(pct,2)}%)</span><span class="pill ${within?'ok':'warning'}">${within?'Within allowed difference':'Outside allowed difference'}</span>`;
  const notes = [];
  if (R.filled) notes.push(`${R.filled} merged-cell row${R.filled>1?'s':''} filled from above`);
  if (R.skipped) notes.push(`${R.skipped} total or blank row${R.skipped>1?'s':''} skipped`);
  if (R.missingMap) notes.push(`<span class="err-text">Match a column for: ${R.missingMap.map(esc).join(', ')}</span>`);
  if (notes.length) tot += `<span class="muted">${notes.join(' · ')}</span>`;
  $('totals').innerHTML = tot;
  $('t-issues').textContent = `Problems (${R.issues.length})`;
  $('t-sy').textContent = `By survey number (${R.syList.length})`;
  $('t-lp').textContent = `By LP number (${R.lpList.length})`;
  const chips = [['all','All',R.issues.length],['error','Errors',c.error],['warning','Warnings',c.warning],['info','For information',c.info]];
  $('sevchips').innerHTML = chips.map(([k,l,n]) => `<button type="button" class="chip" data-sev="${k}" aria-pressed="${state.sev===k}">${l} · ${n}</button>`).join('');
  $('sevchips').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { state.sev = b.dataset.sev; renderResults(); }));
  const present = [...new Set(R.issues.map(i => i.check))];
  if (state.check !== 'all' && !present.includes(state.check)) state.check = 'all';
  $('checkfilter').innerHTML = '<option value="all">All checks</option>' + Object.entries(CHECKS).filter(([k]) => present.includes(k)).map(([k,l]) => `<option value="${k}"${state.check===k?' selected':''}>${esc(l)} (${R.issues.filter(i=>i.check===k).length})</option>`).join('');
  renderIssues(); renderSy(); renderLp();
}
function rowList(rows){
  if (!rows || !rows.length) return '–';
  const out = []; let s = rows[0], p = rows[0];
  for (let k = 1; k <= rows.length; k++){
    const v = rows[k];
    if (v === p + 1){ p = v; continue; }
    out.push(s === p ? String(s) : `${s}–${p}`); s = p = v;
  }
  return out.join(', ');
}
function renderIssues(){
  const R = state.result, q = state.q.toLowerCase();
  if (!R.issues.length){ $('tbl-issues').innerHTML = '<tbody><tr><td>No problems found with the current settings.</td></tr></tbody>'; return; }
  const list = R.issues.filter(i => (state.sev === 'all' || i.sev === state.sev) && (state.check === 'all' || i.check === state.check) && (!q || (i.sy + ' ' + i.lp + ' ' + i.msg).toLowerCase().includes(q)));
  const LIMIT = 1500;
  let h = '<thead><tr><th>Level</th><th>Check</th><th>Old Sy.No</th><th>LP No</th><th>What to look at</th><th>Excel rows</th></tr></thead><tbody>';
  for (const i of list.slice(0, LIMIT)) h += `<tr class="sev-${i.sev}"><td><span class="pill ${i.sev}">${SEV_LABEL[i.sev]}</span></td><td>${esc(CHECKS[i.check])}</td><td>${esc(i.sy||'–')}</td><td>${esc(i.lp||'–')}</td><td class="detail">${esc(i.msg)}</td><td class="rows">${esc(rowList(i.rows))}</td></tr>`;
  if (!list.length) h += '<tr><td colspan="6" class="muted">Nothing matches this filter.</td></tr>';
  if (list.length > LIMIT) h += `<tr><td colspan="6" class="muted">Showing ${LIMIT} of ${list.length}. The Excel report has all of them.</td></tr>`;
  $('tbl-issues').innerHTML = h + '</tbody>';
}
function renderSy(){
  const R = state.result, q = $('q-sy').value.trim().toLowerCase(), only = $('only-sy').checked;
  const list = R.syList.filter(s => (!q || s.key.toLowerCase().includes(q)) && (!only || s.status !== 'ok' || R.issueKeys.sy.has(s.key)));
  let h = '<thead><tr><th>Old Sy.No</th><th class="n">Old extent</th><th>LP numbers</th><th class="n">New extent</th><th class="n">Difference</th><th>Status</th><th>Excel rows</th></tr></thead><tbody>';
  for (const s of list){
    const flag = s.status === 'ok' && R.issueKeys.sy.has(s.key);
    h += `<tr><td>${esc(s.key)}</td><td class="n">${fmt(s.old)}</td><td>${esc([...s.lps].join(', ') || '–')}</td><td class="n">${s.unknown ? '?' : fmt(s.newSum)}</td><td class="n">${s.diff !== undefined ? fmtSigned(s.diff) + ' (' + signed(s.pct,1) + '%)' : '–'}</td><td>${statusPill(s.status)}${flag ? ' <span class="pill warning">See problems</span>' : ''}</td><td class="rows">${esc(rowList(s.rows))}</td></tr>`;
  }
  if (!list.length) h += '<tr><td colspan="7" class="muted">Nothing to show.</td></tr>';
  $('tbl-sy').innerHTML = h + '</tbody>';
}
function renderLp(){
  const R = state.result, q = $('q-lp').value.trim().toLowerCase(), only = $('only-lp').checked;
  const list = R.lpList.filter(l => (!q || (l.lp + ' ' + l.owners.join(' ')).toLowerCase().includes(q)) && (!only || l.status !== 'ok' || R.issueKeys.lp.has(l.lp)));
  let h = '<thead><tr><th>LP No</th><th class="n">LP extent</th><th>Old Sy.Nos</th><th class="n">Parts total</th><th>Pattadar after resurvey</th><th>Classification</th><th>Status</th><th>Excel rows</th></tr></thead><tbody>';
  for (const l of list){
    const flag = l.status === 'ok' && R.issueKeys.lp.has(l.lp);
    h += `<tr><td>${esc(l.lp)}</td><td class="n">${fmt(l.ext)}</td><td>${esc([...l.sys].join(', ') || '–')}</td><td class="n">${l.status==='unresolved' ? '?' : fmt(l.partSum)}</td><td>${esc(l.owners.join('; ') || '–')}</td><td>${esc(l.types.join(', ') || '–')}</td><td>${statusPill(l.status)}${flag ? ' <span class="pill warning">See problems</span>' : ''}</td><td class="rows">${esc(rowList(l.rows))}</td></tr>`;
  }
  if (!list.length) h += '<tr><td colspan="8" class="muted">Nothing to show.</td></tr>';
  $('tbl-lp').innerHTML = h + '</tbody>';
}

/* ---------- files out ---------- */
function download(data, filename, mime){
  const blob = data instanceof Blob ? data : new Blob([data], {type: mime || 'application/octet-stream'});
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
}
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const RLL_ROW = ['© RLL – RaghusLogicLab · raghuslogiclab.com'];
function issueRows(){ return [['Level','Check','Old Sy.No','LP No','Details','Excel rows'], ...state.result.issues.map(i => [SEV_LABEL[i.sev], CHECKS[i.check], i.sy, i.lp, i.msg, rowList(i.rows)])]; }
function toCSV(rows){ return '﻿' + rows.map(r => r.map(v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; }).join(',')).join('\r\n'); }
function baseName(){ return (state.isSample ? 'example-village' : state.sourceName.replace(/\.[^.]+$/,'')).replace(/[^\wఀ-౿-]+/g,'_').slice(0,60) || 'statement'; }
function addSheet(wb, name, aoa, widths){
  const ws = XLSX.utils.aoa_to_sheet(aoa.concat([[], RLL_ROW]));
  ws['!cols'] = widths.map(w => ({wch:w}));
  XLSX.utils.book_append_sheet(wb, ws, name);
}
function reportWorkbook(){
  const R = state.result, o = opts(), unit = DISP === 'ha' ? 'Ha' : 'Ac';
  const v = ac => (ac === null || ac === undefined || !isFinite(ac)) ? '' : (DISP === 'ha' ? +(ac*HA_PER_AC).toFixed(4) : +ac.toFixed(3));
  const wb = XLSX.utils.book_new();
  addSheet(wb, 'Summary', [
    ['Correlation statement check · కోరిలేషన్ తనిఖీ'], ['File', state.isSample ? 'Example data (Kondapalem, not real)' : state.sourceName], ['Sheet', state.sheet || ''],
    ['Village', $('n-village').value], ['Mandal', $('n-mandal').value], ['Checked on', new Date().toLocaleString('en-IN')], [],
    ['Rows checked', R.recs.length], ['Survey numbers', R.syList.length], ['LP numbers', R.lpList.length],
    ['Errors', R.counts.error], ['Warnings', R.counts.warning], ['For information', R.counts.info], [],
    [`Village old extent (${unit})`, v(R.totalOld)], [`Village new extent (${unit})`, v(R.totalNew)], [`Difference (${unit})`, v(R.totalNew - R.totalOld)], [],
    ['Allowed difference', `${o.tolPct}% or ${o.tolAbsCents} cents, whichever is larger`], ['Name match threshold', Math.round(o.nameThr*100) + '%'],
    ['Old extent unit in file', UNITS[o.uOld].label], ['LP extent unit in file', UNITS[o.uNew].label]
  ], [34, 50]);
  addSheet(wb, 'Problems', issueRows(), [10, 30, 12, 12, 90, 14]);
  addSheet(wb, 'By survey number', [['Old Sy.No', `Old extent (${unit})`, 'LP numbers', `New extent (${unit})`, `Difference (${unit})`, 'Difference %', 'Status', 'Excel rows'],
    ...R.syList.map(s => [s.key, v(s.old), [...s.lps].join(', '), s.unknown ? '' : v(s.newSum), s.diff !== undefined ? v(s.diff) : '', s.pct !== undefined ? +s.pct.toFixed(2) : '', (STATUS[s.status]||[])[1] || s.status, rowList(s.rows)])], [12, 14, 20, 14, 14, 12, 18, 14]);
  addSheet(wb, 'By LP number', [['LP No', `LP extent (${unit})`, 'Old Sy.Nos', `Parts total (${unit})`, 'Pattadar after resurvey', 'Classification', 'Status', 'Excel rows'],
    ...R.lpList.map(l => [l.lp, v(l.ext), [...l.sys].join(', '), l.status === 'unresolved' ? '' : v(l.partSum), l.owners.join('; '), l.types.join(', '), (STATUS[l.status]||[])[1] || l.status, rowList(l.rows)])], [10, 14, 18, 14, 40, 16, 18, 14]);
  return XLSX.write(wb, {bookType:'xlsx', type:'array'});
}
const TEMPLATE = [['Old Sy.No','Sub Div','RSR Extent (Ac)','Webland Pattadar Name','Khata No','LP No','LP Extent (Ac)','Correlated Extent (Ac)','Resurvey Pattadar Name','Land Classification'],
  ['12','1',1.51,'Pattadar name as in 1B','101','45',1.49,1.49,'Pattadar name after resurvey','Patta']];

/* ---------- 9(2) notices ---------- */
const acStr = ac => (ac === null || ac === undefined || !isFinite(ac)) ? '–' : (Math.abs(ac*100 - Math.round(ac*100)) < 1e-6 ? ac.toFixed(2) : ac.toFixed(3));
const haStr = ac => (ac === null || ac === undefined || !isFinite(ac)) ? '–' : (ac*HA_PER_AC).toFixed(4);
const bi = (t, e) => `<span class="t">${t}</span><span class="t e"> / </span><span class="e">${e}</span>`;
const blank = (v, w) => v ? esc(v) : `<span class="blank" style="min-width:${w||60}px">&nbsp;</span>`;
function cfg(){
  const d = $('n-date').value;
  return {
    village:$('n-village').value.trim(), mandal:$('n-mandal').value.trim(), district:$('n-district').value.trim(),
    date: d ? d.split('-').reverse().join('-') : '', prefix:$('n-prefix').value, start:Math.max(1, Math.floor(Number($('n-start').value)||1)),
    officer:$('n-officer').value.trim(), desig:$('n-desig').value.trim() || 'Mandal Surveyor', vs:$('n-vs').value.trim(), vro:$('n-vro').value.trim(),
    auth:$('n-auth').value.trim(), days:$('n-days').value.trim(), mode:$('n-mode').value, lang:$('n-lang').value,
    skipErr:$('n-skiperr').checked, skipGovt:$('n-skipgovt').checked, rll:$('n-rll').checked
  };
}
function lpInfos(R){
  return R.lpList.map(l => {
    const parts = R.pairs.filter(p => p.lp === l.lp).map(p => { const s = R.bySy.get(p.key); return {key:p.key, old:s ? s.old : null, part:p.part}; }).sort((a,b) => coll.compare(a.key, b.key));
    const names = [];
    for (const o of l.owners) for (const n of splitNames(o)) if (!names.some(x => normName(x) === normName(n))) names.push(n);
    return {
      lp:l.lp, ext:l.ext, parts, names, types:l.types,
      khatas:[...new Set(l.recs.map(r => r.khata).filter(Boolean))],
      err: l.ext === null || R.errKeys.lp.has(l.lp) || [...l.sys].some(k => R.errKeys.sy.has(k)),
      govt: l.types.some(t => GOVT.test(t)) || l.owners.some(o => GOVT.test(o))
    };
  });
}
function buildNotices(){
  if (!state.result) return;
  const c = cfg(), infos = lpInfos(state.result);
  const sk = {err:0, govt:0, noOwner:0};
  const use = infos.filter(i => {
    if (c.skipErr && i.err){ sk.err++; return false; }
    if (c.skipGovt && i.govt){ sk.govt++; return false; }
    if (!i.names.length){ sk.noOwner++; return false; }
    return true;
  });
  let list = [];
  if (c.mode === 'lp'){
    list = use.map(i => ({id:'lp:' + i.lp, names:i.names, khatas:i.khatas, lps:[i]}));
  } else {
    const by = new Map();
    for (const i of use) for (const n of i.names){
      const k = normName(n);
      if (!by.has(k)) by.set(k, {id:'ow:' + k, names:[n], khatas:new Set(), lps:[]});
      const g = by.get(k); g.lps.push(i); i.khatas.forEach(x => g.khatas.add(x));
    }
    list = [...by.values()].map(g => ({...g, khatas:[...g.khatas]})).sort((a,b) => coll.compare(a.names[0], b.names[0]));
  }
  list.forEach((n, i) => { n.no = c.prefix + String(c.start + i).padStart(3, '0'); });
  state.notices = list; state.skipped = sk;
  if (state.cur >= list.length) state.cur = 0;
  renderNoticeList(); renderPreview(); saveCfg();
}
function selected(){ return state.notices.filter(n => !state.off.has(n.id)); }
function renderNoticeList(){
  const q = $('n-q').value.trim().toLowerCase(), sk = state.skipped, sel = selected();
  const parts = [`<b>${state.notices.length}</b> notice${state.notices.length === 1 ? '' : 's'} ready, <b>${sel.length}</b> ticked for printing.`];
  const left = [];
  if (sk.err) left.push(`${sk.err} LP${sk.err>1?'s':''} with errors`);
  if (sk.govt) left.push(`${sk.govt} Government LP${sk.govt>1?'s':''}`);
  if (sk.noOwner) left.push(`${sk.noOwner} LP${sk.noOwner>1?'s':''} with no pattadar name`);
  if (left.length) parts.push('Left out: ' + left.join(', ') + '.');
  $('n-status').innerHTML = parts.join(' ');
  $('n-status').className = 'status' + (left.length && !state.notices.length ? '' : ' ok');
  const shown = state.notices.map((n, idx) => ({n, idx})).filter(({n}) => !q || (n.no + ' ' + n.names.join(' ') + ' ' + n.lps.map(l => 'lp ' + l.lp + ' ' + l.parts.map(p => p.key).join(' ')).join(' ')).toLowerCase().includes(q));
  $('n-list').innerHTML = shown.length ? shown.map(({n, idx}) => {
    const ext = n.lps.reduce((a, l) => a + (l.ext || 0), 0);
    const sys = [...new Set(n.lps.flatMap(l => l.parts.map(p => p.key)))];
    return `<div class="nitem${idx === state.cur ? ' cur' : ''}" role="listitem" data-idx="${idx}">
      <input type="checkbox" aria-label="Print notice ${esc(n.no)}" data-id="${esc(n.id)}"${state.off.has(n.id) ? '' : ' checked'}>
      <div><b>${esc(n.names.join(', '))}</b><div class="meta">LP ${esc(n.lps.map(l => l.lp).join(', '))} · Sy.No ${esc(sys.join(', '))} · ${acStr(ext)} Ac</div></div>
      <span class="no">${esc(n.no)}</span></div>`;
  }).join('') : `<div class="nitem"><span></span><span class="muted">${state.notices.length ? 'No notice matches the search.' : 'No notices yet. Clear the errors in step 3 or untick "Leave out LPs that still have errors".'}</span><span></span></div>`;
  $('n-print').innerHTML = `Print / Save as PDF (${sel.length}) <span class="te">ప్రింట్</span>`;
  $('n-print').disabled = !sel.length;
  $('n-reg').disabled = !state.notices.length;
}
function noticeHTML(n, c){
  const V = esc(c.village), names = n.names.map(esc).join(', ');
  const vil = c.village ? V : blank('', 90);
  let rows = '', sno = 0, totAc = 0;
  for (const l of n.lps){
    totAc += l.ext || 0;
    const span = Math.max(1, l.parts.length);
    const type = esc(l.types.join(', ') || '–');
    (l.parts.length ? l.parts : [{key:'–', old:null, part:null}]).forEach((p, i) => {
      sno++;
      rows += `<tr><td>${sno}</td><td>${esc(p.key)}</td><td>${acStr(p.old)}</td><td>${acStr(p.part)}</td>` +
        (i === 0 ? `<td rowspan="${span}"><b>${esc(l.lp)}</b></td><td rowspan="${span}"><b>${acStr(l.ext)}</b></td><td rowspan="${span}">${haStr(l.ext)}</td><td rowspan="${span}">${type}</td>` : '') + '</tr>';
    });
  }
  rows += `<tr class="tot"><td colspan="5" style="text-align:right">${bi('మొత్తం','Total')}</td><td>${acStr(totAc)}</td><td>${haStr(totAc)}</td><td></td></tr>`;
  const joint = c.mode === 'owner' ? n.lps.filter(l => l.names.length > 1).map(l => `LP ${esc(l.lp)}: ${l.names.filter(x => normName(x) !== normName(n.names[0])).map(esc).join(', ')}`) : [];
  const days = c.days ? esc(c.days) : blank('', 30);
  const auth = c.auth ? esc(c.auth) : blank('', 120);
  const lpNos = n.lps.map(l => esc(l.lp)).join(', ');
  return `<article class="notice lang-${c.lang}">
  <div class="gov">
    <div class="l1">${bi('ఆంధ్రప్రదేశ్ ప్రభుత్వము','GOVERNMENT OF ANDHRA PRADESH')}</div>
    <div class="l2">${bi('సర్వే, సెటిల్‌మెంట్స్ మరియు భూ రికార్డుల శాఖ','Department of Survey, Settlements and Land Records')}</div>
    <div class="l3">${bi(`${c.mandal ? esc(c.mandal) : blank('',70)} మండలం, ${c.district ? esc(c.district) : blank('',70)} జిల్లా`, `${c.mandal ? esc(c.mandal) : blank('',70)} Mandal, ${c.district ? esc(c.district) : blank('',70)} District`)}</div>
  </div>
  <div class="ttl">
    <div class="te1 t">ఆంధ్రప్రదేశ్ సర్వే మరియు సరిహద్దుల చట్టం, 1923 లోని సెక్షన్ 9(2) ప్రకారం నోటీసు</div>
    <div class="en1 e">NOTICE UNDER SECTION 9(2) OF THE ANDHRA PRADESH SURVEY AND BOUNDARIES ACT, 1923</div>
    <div class="small">${bi('భూముల రీసర్వే','Land Resurvey')}</div>
  </div>
  <div class="meta">
    <div><b>${bi('నోటీసు సంఖ్య','Notice No.')}:</b> ${esc(n.no)}</div>
    <div><b>${bi('తేదీ','Date')}:</b> ${blank(c.date, 80)}</div>
    <div><b>${bi('గ్రామం','Village')}:</b> ${vil}</div>
  </div>
  <div class="to">
    <div><b>${bi('గ్రహీత','To')}:</b> <span class="nm">${names}</span></div>
    <div>${bi('ఖాతా సంఖ్య','Khata No.')}: ${blank(n.khatas.join(', '), 60)} &nbsp;·&nbsp; ${bi('ఎల్.పి. సంఖ్య','LP No.')}: ${lpNos} &nbsp;·&nbsp; ${bi('గ్రామం','Village')}: ${vil}</div>
  </div>
  <p class="t">${vil} గ్రామములో ఆంధ్రప్రదేశ్ సర్వే మరియు సరిహద్దుల చట్టం, 1923 ప్రకారం భూముల రీసర్వే నిర్వహించడమైనది. సదరు చట్టంలోని సెక్షన్ 9(1) ప్రకారం సర్వే అధికారి నిర్ణయించిన మీ భూమి సరిహద్దులు మరియు విస్తీర్ణం వివరాలు క్రింద ఇవ్వబడినవి.</p>
  <p class="e">Resurvey of lands in ${vil} village has been carried out under the Andhra Pradesh Survey and Boundaries Act, 1923. The boundaries and extent of your land, as decided by the survey officer under Section 9(1) of the Act, are given below.</p>
  <table>
    <colgroup><col style="width:6%"><col style="width:12%"><col style="width:12%"><col style="width:14%"><col style="width:11%"><col style="width:13%"><col style="width:12%"><col style="width:20%"></colgroup>
    <thead><tr>
      <th><span class="t">క్ర.సం.</span><span class="e">S.No</span></th>
      <th><span class="t">పాత సర్వే నం.</span><span class="e">Old Sy.No</span></th>
      <th><span class="t">పాత విస్తీర్ణం (ఎ.)</span><span class="e">Old extent (Ac)</span></th>
      <th><span class="t">ఎల్.పి.లో చేరిన భాగం (ఎ.)</span><span class="e">Part in this LP (Ac)</span></th>
      <th><span class="t">ఎల్.పి. నం.</span><span class="e">LP No</span></th>
      <th><span class="t">ఎల్.పి. విస్తీర్ణం (ఎ.)</span><span class="e">LP extent (Ac)</span></th>
      <th><span class="t">విస్తీర్ణం (హె.)</span><span class="e">Extent (Ha)</span></th>
      <th><span class="t">భూమి వర్గీకరణ</span><span class="e">Classification</span></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${joint.length ? `<p>${bi('ఉమ్మడి పట్టాదారులు','Joint pattadars')}: ${joint.join('; ')}</p>` : ''}
  <p class="t">పై వివరాలపై మీకు ఏదైనా అభ్యంతరం ఉన్నట్లయితే, ఈ నోటీసు అందిన తేదీ నుండి ${days} రోజులలోపు సదరు చట్టంలోని సెక్షన్ 11 ప్రకారం ${auth} వారికి అప్పీలు దాఖలు చేసుకొనవచ్చును. నిర్ణీత గడువులోపు అప్పీలు దాఖలు కానిచో, పై వివరాలను మీరు అంగీకరించినట్లుగా భావించి తుది రికార్డులు తయారు చేయబడును. అప్పీలుతో పాటు మీ పట్టాదారు పాసు పుస్తకము, దస్తావేజులు మరియు ఇతర ఆధారాల నకళ్ళు జతపరచగలరు.</p>
  <p class="e">If you have any objection to the above details, you may file an appeal under Section 11 of the Act before the ${auth} within ${days} days from the date of receipt of this notice. If no appeal is filed within this period, the above details will be treated as accepted by you and the final records will be prepared accordingly. Please enclose copies of your pattadar passbook, title deeds and other supporting documents with the appeal.</p>
  <div class="sig">
    <div><b>${blank(c.vs, 100)}</b>${bi('గ్రామ సర్వేయర్','Village Surveyor')}</div>
    <div><b>${blank(c.vro, 100)}</b>${bi('గ్రామ రెవెన్యూ అధికారి','Village Revenue Officer')}</div>
    <div><b>${blank(c.officer, 100)}</b>${bi('సర్వే అధికారి','Survey Officer')}, ${esc(c.desig)}</div>
  </div>
  <div class="cut"><div class="ack">
    <div class="h">${bi('నోటీసు అందినట్లు రశీదు','ACKNOWLEDGEMENT')}</div>
    <div>${bi(`నోటీసు సంఖ్య ${esc(n.no)} (ఎల్.పి. సంఖ్య ${lpNos}, ${vil} గ్రామం) నాకు అందినది.`, `I have received Notice No. ${esc(n.no)} (LP No. ${lpNos}, ${vil} village).`)}</div>
    <div class="ln"><span>${bi('పేరు','Name')}:</span><span>${bi('సంతకం / వేలిముద్ర','Signature / Thumb impression')}:</span><span>${bi('తేదీ','Date')}:</span><span>${bi('మొబైల్','Mobile')}:</span></div>
    <div class="modes"><b>${bi('అందజేసిన విధానం','Mode of service')}:</b> <span>☐ ${bi('స్వయంగా','In person')}</span><span>☐ ${bi('రిజిస్టర్డ్ పోస్ట్','RPAD')}</span><span>☐ ${bi('అతికించుట','Affixture')}</span><span>☐ ${bi('వాట్సాప్ / ఎస్.ఎం.ఎస్.','WhatsApp / SMS')}</span></div>
    <div class="ln"><span>${bi('అందజేసిన వారు','Served by')} (VRO / VS):</span><span>${bi('సంతకం','Signature')}:</span></div>
  </div></div>
  ${c.rll ? '<div class="rll">© RLL – RaghusLogicLab</div>' : ''}
</article>`;
}
function renderPreview(){
  const n = state.notices[state.cur];
  $('pv-title').textContent = n ? `Preview · ${n.no} (${state.cur + 1} of ${state.notices.length})` : 'Preview';
  $('pv-scale').innerHTML = n ? noticeHTML(n, cfg()) : '<div class="notice"><p class="muted">No notice to show.</p></div>';
  $('pv-prev').disabled = state.cur <= 0; $('pv-next').disabled = state.cur >= state.notices.length - 1;
  fitPreview();
}
function fitPreview(){
  const box = $('pv-box'), sc = $('pv-scale'), el = sc.firstElementChild;
  if (!el) return;
  const s = Math.min(1, (box.clientWidth - 20) / el.offsetWidth);
  sc.style.transform = `scale(${s})`;
  box.style.height = Math.ceil(el.offsetHeight * s + 20) + 'px';
}
function printNotices(){
  const sel = selected();
  if (!sel.length){ toast('Tick at least one notice'); return; }
  const c = cfg();
  $('pages').innerHTML = sel.map(n => noticeHTML(n, c)).join('');
  setTimeout(() => window.print(), 60);
}
function noticeRegister(){
  if (typeof XLSX === 'undefined'){ toast('The Excel writer did not load. Reload the page.'); return; }
  const c = cfg(), list = selected().length ? selected() : state.notices;
  const head = ['Notice No · నోటీసు సంఖ్య','Date · తేదీ','Pattadar(s) · పట్టాదారు','Khata No','LP No(s)','Old Sy.No(s)','Extent (Ac)','Extent (Ha)','Date served · అందజేసిన తేదీ','Mode of service · విధానం','Acknowledged (Y/N)','Appeal received · అప్పీలు','Remarks · వ్యాఖ్యలు'];
  const rows = list.map(n => {
    const ext = n.lps.reduce((a,l) => a + (l.ext||0), 0);
    return [n.no, c.date, n.names.join(', '), n.khatas.join(', '), n.lps.map(l => l.lp).join(', '), [...new Set(n.lps.flatMap(l => l.parts.map(p => p.key)))].join(', '), +acStr(ext), +haStr(ext), '', '', '', '', ''];
  });
  const wb = XLSX.utils.book_new();
  addSheet(wb, '9(2) Notice Register', [[`9(2) Notice Register · 9(2) నోటీసుల రిజిస్టర్ — ${c.village || '……'} village, ${c.mandal || '……'} mandal, ${c.district || '……'} district`], [], head, ...rows], [16, 11, 34, 10, 10, 16, 11, 11, 14, 16, 12, 14, 24]);
  download(XLSX.write(wb, {bookType:'xlsx', type:'array'}), `${(c.village || baseName()).replace(/[^\wఀ-౿-]+/g,'_')}-9-2-notice-register.xlsx`, XLSX_MIME);
}
function saveCfg(){ try { const o = {}; NFIELDS.forEach(id => o[id] = $(id).value); localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) {} }
function loadCfg(){ try { const o = JSON.parse(localStorage.getItem(STORE) || 'null'); if (o) NFIELDS.forEach(id => { if (o[id] != null && $(id)) $(id).value = o[id]; }); } catch (e) {} }

/* ---------- misc ---------- */
let toastTimer;
function toast(msg){ const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); }
function setTab(t){ [['issues','t-issues','p-issues'],['sy','t-sy','p-sy'],['lp','t-lp','p-lp']].forEach(([k,tb,p]) => { $(tb).setAttribute('aria-selected', String(k===t)); $(p).hidden = k !== t; }); }

initSelects(); loadCfg();
if (!$('n-date').value) $('n-date').value = new Date().toISOString().slice(0,10);
const drop = $('drop');
['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) onFile(f); });
$('file').addEventListener('change', e => { const f = e.target.files[0]; if (f) onFile(f); e.target.value = ''; });
$('btn-sample').addEventListener('click', loadSample);
$('sheet').addEventListener('change', e => { if (!currentGet) return; state.sheet = e.target.value; loadRows(currentGet(state.sheet), state.sourceName, false); });
$('hdr').addEventListener('change', e => setHeader((Number(e.target.value)||1) - 1, true));
['u-old','u-new','tol-pct','tol-abs','name-thr','disp','fill'].forEach(id => $(id).addEventListener('change', run));
$('checkfilter').addEventListener('change', e => { state.check = e.target.value; renderIssues(); });
$('q').addEventListener('input', e => { state.q = e.target.value; renderIssues(); });
$('q-sy').addEventListener('input', renderSy); $('only-sy').addEventListener('change', renderSy);
$('q-lp').addEventListener('input', renderLp); $('only-lp').addEventListener('change', renderLp);
$('t-issues').addEventListener('click', () => setTab('issues'));
$('t-sy').addEventListener('click', () => setTab('sy'));
$('t-lp').addEventListener('click', () => setTab('lp'));
$('btn-csv').addEventListener('click', () => download(toCSV(issueRows()), baseName() + '-problems.csv', 'text/csv'));
$('btn-xlsx').addEventListener('click', () => {
  if (typeof XLSX === 'undefined'){ download(toCSV(issueRows()), baseName() + '-problems.csv', 'text/csv'); return; }
  download(reportWorkbook(), baseName() + '-check-report.xlsx', XLSX_MIME);
});
$('btn-template').addEventListener('click', () => {
  if (typeof XLSX === 'undefined'){ download(toCSV(TEMPLATE), 'correlation-statement-template.csv', 'text/csv'); return; }
  const wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(TEMPLATE);
  ws['!cols'] = TEMPLATE[0].map(h => ({wch: Math.max(12, h.length + 2)}));
  XLSX.utils.book_append_sheet(wb, ws, 'Correlation');
  download(XLSX.write(wb, {bookType:'xlsx', type:'array'}), 'correlation-statement-template.xlsx', XLSX_MIME);
});
$('btn-copy').addEventListener('click', async () => {
  const tsv = issueRows().map(r => r.map(v => String(v == null ? '' : v).replace(/\t|\n/g,' ')).join('\t')).join('\n');
  try { await navigator.clipboard.writeText(tsv); toast('Problems copied. Paste into Excel or WhatsApp.'); $('copybox').hidden = true; }
  catch (e){ const b = $('copybox'); b.value = tsv; b.hidden = false; b.focus(); b.select(); toast('Select all in the box below and copy'); }
});
NFIELDS.concat(['n-date','n-start','n-skiperr','n-skipgovt','n-rll']).forEach(id => $(id).addEventListener(/^(n-mode|n-lang|n-skiperr|n-skipgovt|n-rll|n-date)$/.test(id) ? 'change' : 'input', () => { if (id === 'n-mode') state.off = new Set(); buildNotices(); }));
$('n-q').addEventListener('input', renderNoticeList);
$('n-all').addEventListener('click', () => { state.off = new Set(); renderNoticeList(); });
$('n-none').addEventListener('click', () => { state.off = new Set(state.notices.map(n => n.id)); renderNoticeList(); });
$('n-list').addEventListener('change', e => { const id = e.target.dataset && e.target.dataset.id; if (!id) return; if (e.target.checked) state.off.delete(id); else state.off.add(id); renderNoticeList(); });
$('n-list').addEventListener('click', e => { if (e.target.tagName === 'INPUT') return; const it = e.target.closest('.nitem[data-idx]'); if (!it) return; state.cur = Number(it.dataset.idx); renderNoticeList(); renderPreview(); });
$('pv-prev').addEventListener('click', () => { if (state.cur > 0){ state.cur--; renderNoticeList(); renderPreview(); } });
$('pv-next').addEventListener('click', () => { if (state.cur < state.notices.length - 1){ state.cur++; renderNoticeList(); renderPreview(); } });
$('n-print').addEventListener('click', printNotices);
$('n-reg').addEventListener('click', noticeRegister);
window.addEventListener('resize', fitPreview);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPreview);

loadSample();
})();
