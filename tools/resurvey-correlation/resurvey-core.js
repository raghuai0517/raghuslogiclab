/* Resurvey Correlation Check — checking logic (column matching, extent reconciliation, name matching).
   © RLL – RaghusLogicLab. Runs in the browser; no data leaves the page. */

const UNITS = {
  ac:   {f:1,                    label:'Acres (cents as decimals, e.g. 1.51)'},
  cents:{f:0.01,                 label:'Cents'},
  ha:   {f:2.471053814671653,    label:'Hectares'},
  sqm:  {f:1/4046.8564224,       label:'Square metres'},
  sqyd: {f:1/4840,               label:'Square yards'}
};
const HA_PER_AC = 1/2.471053814671653;

const FIELDS = [
  {k:'sy',       en:'Old survey no.',            te:'పాత సర్వే నంబరు', req:true},
  {k:'sub',      en:'Sub-division',              te:'సబ్ డివిజన్'},
  {k:'oldExt',   en:'Old extent (RSR / Webland)',te:'పాత విస్తీర్ణం', req:true},
  {k:'oldOwner', en:'Old pattadar (Webland 1B)', te:'పాత పట్టాదారు'},
  {k:'khata',    en:'Khata no.',                 te:'ఖాతా నంబరు'},
  {k:'lp',       en:'LP number',                 te:'ఎల్.పి. నంబరు', req:true},
  {k:'lpExt',    en:'LP extent',                 te:'ఎల్.పి. విస్తీర్ణం', req:true},
  {k:'portion',  en:'Correlated extent (part of this Sy.No in this LP)', te:'భాగ విస్తీర్ణం'},
  {k:'newOwner', en:'Pattadar after resurvey',   te:'కొత్త పట్టాదారు'},
  {k:'landType', en:'Land classification',       te:'భూమి వర్గీకరణ'}
];
const RX = {
  portion: /correlat|portion|part\s*ext|భాగ/,
  lpExt:   /(\blp\b|lpm|\bnew\b|re-?survey|\bror\b|ground)[^]*?(ext|area|విస్తీర్ణ)|(ext|area|విస్తీర్ణ)[^]*?(\blp\b|lpm|\bnew\b|re-?survey)|ఎల్[^]*విస్తీర్ణ|కొత్త[^]*విస్తీర్ణ/,
  oldExt:  /(old|rsr|webland|adangal|1-?b|\bsy\b|sy\.|survey|s\.?f\.?a|పాత|సర్వే)[^]*?(ext|area|విస్తీర్ణ)|(ext|area)[^]*?(old|rsr|webland|adangal)|^(extent|area|విస్తీర్ణం)\b/,
  oldOwner:/(old|webland|1-?b|rsr|existing|adangal|పాత)[^]*?(name|pattadar|owner|holder|పట్టా|పేరు)|(name|pattadar|owner)[^]*?(old|webland|1-?b|rsr|adangal)/,
  newOwner:/(\bnew\b|\blp\b|re-?survey|\bror\b|present|కొత్త)[^]*?(name|pattadar|owner|holder|పట్టా|పేరు)|(name|pattadar|owner)[^]*?(\bnew\b|\blp\b|re-?survey|\bror\b)/,
  lp:      /\blp\b|\bl\.\s*p\b|land\s*parcel|lpm|ఎల్/,
  sub:     /\bsub|సబ్|ఉప/,
  sy:      /\bsy\b|sy\.|survey|s\.?\s*f\.?\s*no|సర్వే/,
  khata:   /khata|ఖాతా/,
  landType:/classif|land\s*type|nature|category|వర్గీకరణ|రకం/
};
const MAP_ORDER = ['portion','lpExt','oldExt','oldOwner','newOwner','lp','sub','sy','khata','landType'];
const OWNER_FALLBACK = /pattadar|owner|name|పట్టాదారు|పేరు/;

const CHECKS = {
  missing:          'Missing value',
  badnum:           'Extent not a number',
  oldConflict:      'Old extent differs between rows',
  lpConflict:       'LP extent differs between rows',
  syMismatch:       'Survey no. extent does not match',
  lpMismatch:       'LP parts do not add up',
  unresolved:       'Part extent needed',
  duplicate:        'Duplicate row',
  ownerChange:      'Pattadar name differs',
  classConflict:    'Classification differs',
  joint:            'Several pattadars on one LP',
  lpGap:            'LP numbers not in statement'
};
const SEV_ORDER = {error:0, warning:1, info:2};

const coll = new Intl.Collator('en', {numeric:true, sensitivity:'base'});

function cellStr(v){
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return String(Math.round(v*1e6)/1e6);
  return String(v).replace(/[​‌﻿]/g,'').replace(/\s+/g,' ').trim();
}
function idStr(v){ return cellStr(v).replace(/\.0+$/,''); }
function lpStr(v){ return idStr(v).replace(/^l\.?\s*p\.?\s*[-:.]?\s*/i,'').trim(); }
function normHeader(h){ return cellStr(h).toLowerCase(); }

function headerScore(row){
  let s = 0;
  for (const c of row){
    const h = normHeader(c);
    if (!h || h.length > 80) continue;
    if (Object.values(RX).some(r => r.test(h))) s++;
  }
  return s;
}
function detectHeaderRow(rows){
  let best = 0, bestScore = -1;
  const lim = Math.min(rows.length, 25);
  for (let r = 0; r < lim; r++){
    const sc = headerScore(rows[r] || []);
    if (sc > bestScore){ best = r; bestScore = sc; }
  }
  if (bestScore <= 0){
    best = rows.findIndex(r => (r||[]).some(c => cellStr(c) !== ''));
    if (best < 0) best = 0;
  }
  return best;
}
function autoMap(headers){
  const map = {}; const used = new Set();
  FIELDS.forEach(f => map[f.k] = -1);
  for (const k of MAP_ORDER){
    for (let i = 0; i < headers.length; i++){
      if (used.has(i)) continue;
      const h = normHeader(headers[i]);
      if (h && RX[k].test(h)){ map[k] = i; used.add(i); break; }
    }
  }
  if (map.newOwner < 0){
    for (let i = 0; i < headers.length; i++){
      if (!used.has(i) && OWNER_FALLBACK.test(normHeader(headers[i]))){ map.newOwner = i; used.add(i); break; }
    }
  }
  return map;
}

function parseExt(v, unit){
  if (v === null || v === undefined || cellStr(v) === '') return {empty:true};
  let n;
  if (typeof v === 'number') n = v;
  else {
    let s = cellStr(v).replace(/,/g,'');
    const m = s.match(/^(\d+)\s*[-–]\s*(\d{1,2})$/);
    if (m && unit === 'ac') n = Number(m[1]) + Number(m[2])/100;
    else {
      s = s.replace(/\s*(acres?|ac|hectares?|ha|cents?|cts|sq\.?\s*(m|mts|yds?|yards?)|ఎ|సెం)\.?\s*$/i,'');
      n = s === '' ? NaN : Number(s);
    }
  }
  if (!isFinite(n)) return {bad:true};
  return {ac: n * UNITS[unit].f, raw:n};
}

const r4 = x => Math.round(x*10000)/10000;

/* ---- name matching ---- */
function lev(a, b){
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = new Array(n+1), cur = new Array(n+1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++){
    cur[0] = i;
    for (let j = 1; j <= n; j++){
      cur[j] = Math.min(prev[j]+1, cur[j-1]+1, prev[j-1] + (a[i-1] === b[j-1] ? 0 : 1));
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}
function ratio(a, b){ const L = Math.max(a.length, b.length); return L ? 1 - lev(a,b)/L : 1; }
function nameTokens(s){
  let t = String(s).normalize('NFC').toLowerCase();
  t = t.replace(/\b([sdwc])\s*\/\s*o\b\.?/g, ' $1o ');
  t = t.replace(/\s(so|do|wo|co)\s.*$/,'');
  t = t.replace(/\b(late|sri|smt|kum|mr|mrs|ms|dr)\b\.?/g,' ');
  t = t.replace(/[.,()\-_'"`:;]/g,' ');
  return t.split(/\s+/).filter(Boolean);
}
function splitNames(s){
  const t = String(s).replace(/\b([sdwc])\s*\/\s*o\b/gi, ' $1o ');
  return t.split(/[,;&\/\n]|\sand\s/i).map(x => x.trim()).filter(x => nameTokens(x).length);
}
function nameSim(a, b){
  const ta = nameTokens(a), tb = nameTokens(b);
  if (!ta.length || !tb.length) return 1;
  const sa = ta.slice().sort().join(' '), sb = tb.slice().sort().join(' ');
  if (sa === sb) return 1;
  const s1 = ratio(sa, sb);
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const taken = new Set(); let hit = 0;
  for (const x of short){
    let found = -1;
    for (let j = 0; j < long.length; j++){
      if (taken.has(j)) continue;
      const y = long[j];
      if (x === y || (x.length === 1 && y[0] === x) || (y.length === 1 && x[0] === y) || (x.length > 2 && y.length > 2 && ratio(x,y) >= 0.8)){ found = j; break; }
    }
    if (found >= 0){ taken.add(found); hit++; }
  }
  const s2 = hit / long.length;
  return Math.max(s1, s2);
}
const normName = s => nameTokens(s).sort().join(' ');

/* ---- main analysis ---- */
function buildRecords(rows, headerRow, map, opts){
  const recs = []; let filled = 0, skipped = 0, prev = null;
  const g = (row, k) => map[k] >= 0 ? row[map[k]] : '';
  for (let r = headerRow + 1; r < rows.length; r++){
    const row = rows[r] || [];
    if (!row.some(c => cellStr(c) !== '')) continue;
    const rec = {
      row: r + 1,
      sy: idStr(g(row,'sy')), sub: idStr(g(row,'sub')),
      oldRaw: g(row,'oldExt'), oldOwner: cellStr(g(row,'oldOwner')), khata: idStr(g(row,'khata')),
      lp: lpStr(g(row,'lp')), lpRaw: g(row,'lpExt'), portionRaw: g(row,'portion'),
      newOwner: cellStr(g(row,'newOwner')), landType: cellStr(g(row,'landType')), filled:false
    };
    const joined = row.map(cellStr).join(' ');
    if (/total|మొత్తం/i.test(rec.sy) || (!rec.sy && !rec.lp && /\btotal\b|మొత్తం/i.test(joined))){ skipped++; continue; }
    if (!rec.sy && !rec.lp && cellStr(rec.oldRaw) === '' && cellStr(rec.lpRaw) === ''){ skipped++; continue; }
    if (opts.fillMerged && !rec.sy && prev && (rec.lp || cellStr(rec.lpRaw) !== '')){
      rec.sy = prev.sy; if (!rec.sub) rec.sub = prev.sub;
      if (cellStr(rec.oldRaw) === '') rec.oldRaw = prev.oldRaw;
      if (!rec.oldOwner) rec.oldOwner = prev.oldOwner;
      if (!rec.khata) rec.khata = prev.khata;
      rec.filled = true; filled++;
    }
    rec.key = rec.sy ? (rec.sub ? rec.sy + '/' + rec.sub : rec.sy) : '';
    rec.old = parseExt(rec.oldRaw, opts.uOld);
    rec.lpE = parseExt(rec.lpRaw, opts.uNew);
    rec.por = parseExt(rec.portionRaw, opts.uNew);
    recs.push(rec); prev = rec;
  }
  return {recs, filled, skipped};
}

function analyse(rows, headerRow, map, opts){
  const {recs, filled, skipped} = buildRecords(rows, headerRow, map, opts);
  const issues = [];
  const tolOk = (diff, base) => Math.abs(diff) <= Math.max((opts.tolAbsCents||0)*0.01, (opts.tolPct||0)/100*Math.abs(base)) + 1e-9;
  const add = (sev, check, sy, lp, msg, rws) => issues.push({sev, check, sy:sy||'', lp:lp||'', msg, rows:[...new Set(rws||[])].sort((a,b)=>a-b)});
  const hasPortionCol = map.portion >= 0;

  // per-row checks
  for (const r of recs){
    const miss = [];
    if (!r.sy) miss.push('old survey no.');
    if (map.lp >= 0 && !r.lp) miss.push('LP number');
    if (map.oldExt >= 0 && r.old.empty) miss.push('old extent');
    if (map.lpExt >= 0 && r.lp && r.lpE.empty) miss.push('LP extent');
    if (miss.length){
      const noLp = miss.includes('LP number');
      add('error','missing', r.key, r.lp, (noLp ? 'Not correlated to any LP. ' : '') + 'Blank: ' + miss.join(', ') + '.', [r.row]);
    }
    for (const [f, label] of [['old','Old extent'],['lpE','LP extent'],['por','Correlated extent']]){
      const v = r[f];
      if (v.bad) add('error','badnum', r.key, r.lp, `${label} "${cellStr(f==='old'?r.oldRaw:f==='lpE'?r.lpRaw:r.portionRaw)}" can't be read as a number.`, [r.row]);
      else if (!v.empty && v.ac <= 0 && f !== 'por') add('error','badnum', r.key, r.lp, `${label} is zero or negative.`, [r.row]);
    }
  }

  // group by survey number and by LP
  const bySy = new Map(), byLp = new Map(), pairs = new Map();
  for (const r of recs){
    if (r.key){
      if (!bySy.has(r.key)) bySy.set(r.key, {key:r.key, recs:[], lps:new Set()});
      const s = bySy.get(r.key); s.recs.push(r); if (r.lp) s.lps.add(r.lp);
    }
    if (r.lp){
      if (!byLp.has(r.lp)) byLp.set(r.lp, {lp:r.lp, recs:[], sys:new Set()});
      const l = byLp.get(r.lp); l.recs.push(r); if (r.key) l.sys.add(r.key);
    }
    if (r.key && r.lp){
      const pk = r.key + '\u0001' + r.lp;
      if (!pairs.has(pk)) pairs.set(pk, {key:r.key, lp:r.lp, recs:[]});
      pairs.get(pk).recs.push(r);
    }
  }

  // consistent extents
  for (const s of bySy.values()){
    const vals = s.recs.filter(r => r.old.ac > 0);
    const distinct = [...new Set(vals.map(r => r4(r.old.ac)))];
    s.old = vals.length ? vals[0].old.ac : null;
    if (distinct.length > 1) add('error','oldConflict', s.key, '', `Old extent entered as ${distinct.map(fmt).join(' and ')}. Using ${fmt(s.old)} for the checks below.`, vals.map(r=>r.row));
    s.oldOwners = [...new Set(s.recs.flatMap(r => r.oldOwner ? splitNames(r.oldOwner) : []))];
  }
  for (const l of byLp.values()){
    const vals = l.recs.filter(r => r.lpE.ac > 0);
    const distinct = [...new Set(vals.map(r => r4(r.lpE.ac)))];
    l.ext = vals.length ? vals[0].lpE.ac : null;
    if (distinct.length > 1) add('error','lpConflict', '', l.lp, `LP extent entered as ${distinct.map(fmt).join(' and ')}. Using ${fmt(l.ext)} for the checks below.`, vals.map(r=>r.row));
  }

  // part extent of each survey-number/LP pair
  for (const p of pairs.values()){
    const ps = p.recs.filter(r => r.por.ac !== undefined && !r.por.bad && !r.por.empty);
    const lpInfo = byLp.get(p.lp);
    if (ps.length){
      const d = [...new Set(ps.map(r => r4(r.por.ac)))];
      p.part = d.length === 1 ? ps[0].por.ac : ps.reduce((a,r)=>a + r.por.ac, 0);
      p.src = 'given';
    } else if (lpInfo.sys.size === 1 && lpInfo.ext !== null){
      p.part = lpInfo.ext; p.src = 'lp';
    } else { p.part = null; p.src = 'none'; }
  }

  // reconcile survey numbers
  const syList = [];
  for (const s of bySy.values()){
    const ps = [...pairs.values()].filter(p => p.key === s.key);
    let sum = 0, unknown = false;
    for (const p of ps){ if (p.part === null) unknown = true; else sum += p.part; }
    s.newSum = ps.length ? sum : null;
    s.unknown = unknown;
    s.rows = s.recs.map(r => r.row);
    if (!ps.length || s.old === null) s.status = 'incomplete';
    else if (unknown) s.status = 'unresolved';
    else {
      s.diff = sum - s.old;
      s.pct = s.old ? s.diff / s.old * 100 : 0;
      if (tolOk(s.diff, s.old)) s.status = 'ok';
      else {
        s.status = 'mismatch';
        add('error','syMismatch', s.key, [...s.lps].join(', '), `Old ${fmt(s.old)} → new ${fmt(sum)} (${fmtSigned(s.diff)}, ${signed(s.pct,1)}%).`, s.rows);
      }
    }
    syList.push(s);
  }

  // reconcile LPs
  const lpList = [];
  for (const l of byLp.values()){
    const ps = [...pairs.values()].filter(p => p.lp === l.lp);
    l.rows = l.recs.map(r => r.row);
    l.owners = [...new Set(l.recs.map(r => r.newOwner).filter(Boolean))];
    l.types = [...new Set(l.recs.map(r => r.landType).filter(Boolean))];
    const givenParts = ps.filter(p => p.src === 'given');
    if (l.ext === null) l.status = 'incomplete';
    else if (l.sys.size > 1 && ps.some(p => p.part === null)){
      l.status = 'unresolved';
      add('warning','unresolved', [...l.sys].join(', '), l.lp, `LP covers ${l.sys.size} survey numbers (${[...l.sys].join(', ')}) but no correlated extent is given, so its ${fmt(l.ext)} can't be split between them.` + (hasPortionCol ? '' : ' Map a "Correlated extent" column if your file has one.'), l.rows);
    } else if (givenParts.length){
      l.partSum = ps.reduce((a,p)=>a + (p.part||0), 0);
      l.diff = l.partSum - l.ext;
      if (tolOk(l.diff, l.ext)) l.status = 'ok';
      else {
        l.status = 'mismatch';
        add('error','lpMismatch', [...l.sys].join(', '), l.lp, `Parts add up to ${fmt(l.partSum)} but LP extent is ${fmt(l.ext)} (${fmtSigned(l.diff)}).`, l.rows);
      }
    } else { l.partSum = l.ext; l.status = 'ok'; }
    l.ownerFlags = 0;
    lpList.push(l);
  }

  // duplicates
  const sig = new Map();
  for (const r of recs){
    if (!r.key && !r.lp) continue;
    const k = [r.key, r.lp, normName(r.newOwner), r.lpE.ac !== undefined ? r4(r.lpE.ac) : '', r.por.ac !== undefined ? r4(r.por.ac) : ''].join('|');
    if (!sig.has(k)) sig.set(k, []);
    sig.get(k).push(r);
  }
  for (const list of sig.values()){
    if (list.length > 1) add('warning','duplicate', list[0].key, list[0].lp, `Same row appears ${list.length} times. Totals count it once.`, list.map(r=>r.row));
  }

  // pattadar names
  if (map.oldOwner >= 0 && map.newOwner >= 0){
    for (const p of pairs.values()){
      const s = bySy.get(p.key);
      if (!s.oldOwners.length) continue;
      const govt = /govt|government|poramboke|panchayat|ప్రభుత్వ|పోరంబోకు/i;
      if (p.recs.some(r => govt.test(r.landType)) || s.oldOwners.some(n => govt.test(n))) continue;
      const newNames = [...new Set(p.recs.flatMap(r => r.newOwner ? splitNames(r.newOwner) : []))];
      for (const nn of newNames){
        let best = 0, bestName = '';
        for (const on of s.oldOwners){ const sc = nameSim(nn, on); if (sc > best){ best = sc; bestName = on; } }
        if (best < opts.nameThr){
          add('warning','ownerChange', p.key, p.lp, `"${nn}" does not match old pattadar ${s.oldOwners.length > 1 ? 'names' : '"' + bestName + '"'}${s.oldOwners.length > 1 ? ' (' + s.oldOwners.map(x=>'"'+x+'"').join(', ') + ')' : ''}. Closest match ${Math.round(best*100)}%. Check sale, succession or mutation papers.`, p.recs.map(r=>r.row));
          const l = byLp.get(p.lp); if (l) l.ownerFlags++;
        }
      }
    }
  }

  // classification and joint holdings
  for (const l of lpList){
    if (l.types.length > 1){
      const distinct = [...new Set(l.types.map(t => t.toLowerCase()))];
      if (distinct.length > 1) add('warning','classConflict', [...l.sys].join(', '), l.lp, `Marked as ${l.types.join(' and ')}.`, l.rows);
    }
    const distinctOwners = [...new Set(l.owners.map(normName))];
    if (distinctOwners.length > 1) add('info','joint', [...l.sys].join(', '), l.lp, `${distinctOwners.length} pattadars: ${l.owners.join('; ')}. Confirm the joint holding against the 1B.`, l.rows);
  }

  // LP sequence gaps
  const nums = [...byLp.keys()].filter(x => /^\d+$/.test(x)).map(Number).sort((a,b)=>a-b);
  if (nums.length > 2){
    const gaps = [];
    for (let i = 1; i < nums.length; i++){
      if (nums[i] - nums[i-1] > 1) gaps.push(nums[i]-nums[i-1] === 2 ? String(nums[i-1]+1) : `${nums[i-1]+1}–${nums[i]-1}`);
    }
    if (gaps.length){
      const shown = gaps.slice(0, 40).join(', ') + (gaps.length > 40 ? ` and ${gaps.length-40} more ranges` : '');
      add('info','lpGap','', '', `LP ${nums[0]} to ${nums[nums.length-1]}: these numbers are not in this statement: ${shown}. Fine if they are Government, road or water-body parcels listed elsewhere.`, []);
    }
  }

  issues.sort((a,b) => SEV_ORDER[a.sev]-SEV_ORDER[b.sev] || coll.compare(a.sy||'~', b.sy||'~') || coll.compare(a.lp||'~', b.lp||'~'));
  syList.sort((a,b) => coll.compare(a.key, b.key));
  lpList.sort((a,b) => coll.compare(a.lp, b.lp));

  const totalOld = syList.reduce((a,s)=>a + (s.old||0), 0);
  const totalNew = lpList.reduce((a,l)=>a + (l.ext||0), 0);
  const issueKeys = {sy:new Set(), lp:new Set()};
  for (const i of issues){ if (i.sev === 'info') continue; i.sy.split(', ').forEach(k => k && issueKeys.sy.add(k)); i.lp.split(', ').forEach(k => k && issueKeys.lp.add(k)); }
  const errKeys = {sy:new Set(), lp:new Set()};
  for (const i of issues){ if (i.sev !== 'error') continue; i.sy.split(', ').forEach(k => k && errKeys.sy.add(k)); i.lp.split(', ').forEach(k => k && errKeys.lp.add(k)); }
  return {recs, issues, syList, lpList, pairs:[...pairs.values()], bySy, byLp, errKeys, filled, skipped, totalOld, totalNew, issueKeys,
          counts:{error:issues.filter(i=>i.sev==='error').length, warning:issues.filter(i=>i.sev==='warning').length, info:issues.filter(i=>i.sev==='info').length}};
}

/* ---- formatting ---- */
let DISP = 'ac';
function fmt(ac){
  if (ac === null || ac === undefined || !isFinite(ac)) return '–';
  return DISP === 'ha' ? (ac*HA_PER_AC).toFixed(4) + ' Ha' : ac.toFixed(3) + ' Ac';
}
function fmtSigned(ac){ return (ac > 0 ? '+' : ac < 0 ? '−' : '') + fmt(Math.abs(ac)); }
function signed(x, d){ return (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(d); }

/* ---- example village ---- */
const SAMPLE = [
  ['Correlation Statement — Kondapalem (V) — EXAMPLE DATA, not a real village record'],
  ['S.No','Old Sy.No','Sub Div','RSR Extent (Ac)','Webland Pattadar Name','Khata No','LP No','LP Extent (Ac)','Correlated Extent (Ac)','Resurvey Pattadar Name','Land Classification'],
  [1,'1','',2.40,'Kondapalli Ramudu',101,1,2.38,2.38,'Kondapalli Ramudu','Patta'],
  [2,'2','1',1.20,'Gali Venkata Subbaiah',102,2,1.19,1.19,'G. Venkata Subbaiah','Patta'],
  [3,'2','2',0.80,'Gali Lakshmamma',103,3,0.62,0.62,'Gali Lakshmamma','Patta'],
  [4,'3','',3.10,'Bandaru Sivaiah',104,4,1.55,1.55,'Bandaru Sivaiah','Patta'],
  [5,'3','',3.10,'Bandaru Sivaiah',104,5,1.53,1.53,'Bandaru Nageswara Rao','Patta'],
  [6,'4','',1.75,'Peddinti Anjaneyulu',105,6,2.90,1.74,'Peddinti Anjaneyulu','Patta'],
  [7,'5','',1.30,'Peddinti Anjaneyulu',105,6,2.90,1.30,'Peddinti Anjaneyulu','Patta'],
  [8,'6','',0.95,'Ravuri Padmavathi',106,7,0.95,0.95,'Ravuri Padmavathi','Patta'],
  [9,'6','',0.95,'Ravuri Padmavathi',106,7,0.95,0.95,'Ravuri Padmavathi','Patta'],
  [10,'7','',2.00,'Gram Panchayat (Poramboke)','',8,2.00,2.00,'Government','Govt'],
  [11,'8','',1.10,'Mallela China Obulesu',107,9,1.10,1.10,'Mallela China Obulesu','Patta'],
  [12,'8','',1.10,'Mallela China Obulesu',107,9,1.10,1.10,'Mallela Pedda Obulesu','Assigned'],
  [13,'9','',0.60,'Thota Raghavulu',108,'','','','',''],
  [14,'10','',1.40,'Kanumuri Sitaramayya',109,11,0.70,0.70,'Kanumuri Sitaramayya','Patta'],
  [15,'10','',1.45,'Kanumuri Sitaramayya',109,12,0.70,0.70,'K. Sitaramayya','Patta'],
  [16,'11','','1-25','Kotha Suresh',110,13,1.25,1.25,'Kotha Suresh','Patta'],
  [17,'12','',0.50,'కొండపల్లి రాముడు',111,14,0.49,0.49,'కొండపల్లి రాముడు','Patta'],
  [18,'13','',2.25,'Nallapu Srinivasa Rao',112,15,1.20,'','Nallapu Srinivasa Rao','Patta'],
  [19,'13','',2.25,'Nallapu Srinivasa Rao',112,16,1.00,'','Nallapu Srinivasa Rao','Patta'],
  [20,'14','',0.40,'Nallapu Srinivasa Rao',112,16,1.00,'','Nallapu Srinivasa Rao','Patta'],
  [21,'15','',0.30,'',113,17,0.30,0.30,'Uppala Ramana','Patta'],
  [22,'16','',1.60,'Yarlagadda Krishna',114,18,0.80,0.80,'Yarlagadda Krishna','Patta'],
  [23,'','','','','',19,0.81,0.81,'Yarlagadda Krishna','Patta'],
  ['','','','Total','','','','','','','']
];
