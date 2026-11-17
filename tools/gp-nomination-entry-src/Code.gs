/**
 * GP Nomination Entry — backend for https://raghuslogiclab.com/tools/gp-nomination-entry.html
 * Saves nominations into the "Nominations" tab of the Google Sheet, keeps scans in a Drive folder,
 * and (optionally) reads a scanned nomination paper with Claude.
 *
 * Script properties (Project Settings → Script properties):
 *   ACCESS_CODE        required. Shared code officers type on the page.
 *   ANTHROPIC_API_KEY  optional. Turns on "Read form into fields". From console.anthropic.com.
 *   ANTHROPIC_MODEL    optional. Default claude-sonnet-5-5.
 */
const SHEET_ID = '1mRy3YOHFt613bGWebWbKOlLNiUKrI7zbfBU04oKV8S0';
const TAB = 'Nominations';
const HEADER_ROW = 3;
const FIRST_ROW = 5;           // row 4 is the worked example
const SCAN_FOLDER = 'GP Nomination Scans';
const FIELDS = [["election", "Election", "select"], ["district", "District", "text"], ["revenue_division", "Revenue Division", "text"], ["ac_no_name", "AC No. & Name", "text"], ["mandal", "Mandal", "text"], ["gram_panchayat", "Gram Panchayat", "text"], ["post", "Name of the Post", "select"], ["ward_no", "Ward No.", "int"], ["reservation", "Reservation", "select"], ["nom_ref_id", "Nomination Reference ID", "text"], ["nom_sl_no", "Nomination Sl. No.", "int"], ["receipt_date", "14(a) Date of Receipt", "date"], ["receipt_time", "14(b) Time of Receipt", "time"], ["cand_name_en", "1. Full Name of Candidate", "text"], ["cand_name_te", "2. అభ్యర్థి పేరు (Telugu)", "te"], ["rel_name_en", "3. Father's/Mother's/Husband's Name", "text"], ["rel_name_te", "4. తండ్రి / భర్త పేరు (Telugu)", "te"], ["cand_er_slno", "5. Sl. No. in GP Electoral Roll", "int"], ["cand_er_gp", "5. GP of Electoral Roll", "text"], ["age", "6. Age", "int"], ["gender", "7. Gender", "select"], ["education", "8. Educational Qualification", "text"], ["social_status", "9. Social Status", "select"], ["sub_caste", "9. Sub Caste", "text"], ["occupation_en", "10. Occupation", "text"], ["occupation_te", "11. వృత్తి (Telugu)", "te"], ["addr1", "12. Address Line 1", "text"], ["addr2", "12. Address Line 2", "text"], ["addr3", "12. Address Line 3", "text"], ["pin", "12. Pin Code", "pin"], ["address_te", "13. చిరునామా (Telugu)", "te"], ["mobile", "15. Mobile No.", "mobile"], ["email", "16. Email", "email"], ["prop_er_slno", "20. Proposer Sl. No. in Electoral Roll", "int"], ["prop_er_gp", "20. Proposer GP", "text"], ["prop_name_en", "18. Full Name of Proposer", "text"], ["prop_name_te", "19. ప్రతిపాదకుని పేరు (Telugu)", "te"], ["prop_addr1", "21. Address Line 1", "text"], ["prop_addr2", "21. Address Line 2", "text"], ["prop_addr3", "21. Address Line 3", "text"], ["prop_pin", "21. Pin Code", "pin"], ["prop_address_te", "22. చిరునామా (Telugu)", "te"], ["prop_mobile", "23. Mobile No.", "mobile"], ["prop_email", "24. Email", "email"], ["party_type", "Political Party Type", "select"], ["party_name", "Party Name", "text"], ["deposit_amount", "26. Amount of Deposit (Rs.)", "num"], ["payment_mode", "27. Mode of Payment", "select"], ["receipt_no", "Receipt / Challan No.", "text"], ["scrutiny", "Scrutiny Decision", "select"], ["rejection_reason", "Reason for Rejection", "long"], ["withdrawn", "Withdrawn", "select"], ["symbol", "Symbol Allotted", "text"], ["remarks", "Remarks", "long"], ["scan_file", "Scan File Name", "text"], ["scan_link", "Scan Link", "text"], ["entered_on", "Entered On", "text"], ["record_id", "Record ID", "text"]];     // [key, label, type] in sheet column order

function doGet() {
  return json_({ ok: true, service: 'GP Nomination Entry', time: new Date().toISOString() });
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents || '{}');
    checkCode_(req.code);
    const p = req.payload || {};
    switch (req.action) {
      case 'ping':   return json_({ ok: true, ai: !!prop_('ANTHROPIC_API_KEY'), sheetUrl: 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit' });
      case 'list':   return json_({ ok: true, records: listRecords_() });
      case 'save':   return json_({ ok: true, record: saveRecord_(p.record || {}, p.files || []) });
      case 'delete': return json_({ ok: true, deleted: deleteRecord_(String(p.id || '')) });
      case 'read':   return json_({ ok: true, result: readForm_(p) });
      default:       throw new Error('Unknown action');
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* ---------- helpers ---------- */
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k); }
function checkCode_(code) {
  const want = prop_('ACCESS_CODE');
  if (!want) throw new Error('The register is not set up yet (no access code).');
  if (String(code || '').trim() !== want) {
    Utilities.sleep(800);
    throw new Error('Wrong access code.');
  }
}
function norm_(s) { return String(s == null ? '' : s).replace(/[▾*]/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); }
function sheet_() { return SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB); }
function colMap_(sh) {
  const head = sh.getRange(HEADER_ROW, 1, 1, sh.getLastColumn()).getValues()[0].map(norm_);
  const map = {};
  FIELDS.forEach(function (f) { const i = head.indexOf(norm_(f[1])); if (i >= 0) map[f[0]] = i + 1; });
  if (!map.cand_name_en || !map.record_id) throw new Error('Header row not found in the Nominations tab.');
  return map;
}
function pad_(n) { return (n < 10 ? '0' : '') + n; }
function cellOut_(v, type, tz) {
  if (v === '' || v == null) return '';
  if (v instanceof Date) {
    if (type === 'time') return Utilities.formatDate(v, tz, 'HH:mm');
    if (type === 'date') return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
    return Utilities.formatDate(v, tz, 'dd-MM-yyyy HH:mm');
  }
  return String(v);
}
function cellIn_(v, type, tz) {
  v = v == null ? '' : String(v).trim();
  if (v === '') return '';
  if (type === 'date') { return /^\d{4}-\d{2}-\d{2}$/.test(v) ? Utilities.parseDate(v + ' 12:00', tz, 'yyyy-MM-dd HH:mm') : v; }
  if (type === 'int' || type === 'num') return isNaN(Number(v)) ? v : Number(v);
  if (/^[=+\-@]/.test(v)) return "'" + v;      // never let entered text run as a formula
  return v;
}

/* ---------- list ---------- */
function listRecords_() {
  const sh = sheet_(), map = colMap_(sh), tz = sh.getParent().getSpreadsheetTimeZone();
  const last = sh.getLastRow();
  if (last < FIRST_ROW) return [];
  const width = Math.max.apply(null, Object.keys(map).map(function (k) { return map[k]; }));
  const rows = sh.getRange(FIRST_ROW, 1, last - FIRST_ROW + 1, width).getValues();
  const out = [];
  rows.forEach(function (r, i) {
    const name = r[map.cand_name_en - 1], id = r[map.record_id - 1];
    if (name === '' && id === '') return;
    const rec = { _row: FIRST_ROW + i };
    FIELDS.forEach(function (f) { if (map[f[0]]) rec[f[0]] = cellOut_(r[map[f[0]] - 1], f[2], tz); });
    if (!rec.record_id) rec.record_id = 'row' + (FIRST_ROW + i);
    out.push(rec);
  });
  return out;
}

/* ---------- save ---------- */
function findRow_(sh, map, id) {
  if (!id) return 0;
  const last = sh.getLastRow();
  if (last < FIRST_ROW) return 0;
  if (/^row\d+$/.test(id)) { const n = +id.slice(3); return n >= FIRST_ROW && n <= last ? n : 0; }
  const ids = sh.getRange(FIRST_ROW, map.record_id, last - FIRST_ROW + 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return FIRST_ROW + i;
  return 0;
}
function emptyRow_(sh, map) {
  const last = Math.max(sh.getLastRow(), FIRST_ROW);
  const names = sh.getRange(FIRST_ROW, map.cand_name_en, last - FIRST_ROW + 1, 1).getValues();
  const ids = sh.getRange(FIRST_ROW, map.record_id, last - FIRST_ROW + 1, 1).getValues();
  for (let i = 0; i < names.length; i++) if (names[i][0] === '' && ids[i][0] === '') return FIRST_ROW + i;
  // no blank formatted row left: add one, copying format and the Entry Check formula from the row above
  sh.insertRowAfter(last);
  sh.getRange(last, 1, 1, sh.getLastColumn()).copyTo(sh.getRange(last + 1, 1, 1, sh.getLastColumn()));
  sh.getRange(last + 1, 1, 1, Math.max.apply(null, Object.keys(map).map(function (k) { return map[k]; }))).clearContent();
  return last + 1;
}
function folder_() {
  const it = DriveApp.getFoldersByName(SCAN_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(SCAN_FOLDER);
}
function saveRecord_(rec, files) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(), map = colMap_(sh);
    let row = findRow_(sh, map, String(rec.record_id || ''));
    const isNew = !row;
    if (isNew) row = emptyRow_(sh, map);
    if (!rec.record_id || /^row\d+$/.test(rec.record_id)) rec.record_id = Utilities.getUuid().slice(0, 8);
    if (isNew) rec.entered_on = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd-MM-yyyy HH:mm');
    if (files && files.length) {
      const folder = folder_(), names = [], links = [];
      files.slice(0, 10).forEach(function (f, i) {
        const blob = Utilities.newBlob(Utilities.base64Decode(f.data), f.type || 'application/octet-stream',
          (rec.gram_panchayat || 'GP') + '_' + (rec.post || '') + '_' + (rec.cand_name_en || 'nomination') + '_' + rec.record_id + (files.length > 1 ? '_' + (i + 1) : '') + '_' + (f.name || 'scan'));
        const file = folder.createFile(blob);
        names.push(file.getName()); links.push(file.getUrl());
      });
      rec.scan_file = names.join('; ');
      rec.scan_link = links[0];
    }
    const width = Math.max.apply(null, Object.keys(map).map(function (k) { return map[k]; }));
    const range = sh.getRange(row, 1, 1, width);
    const vals = range.getValues()[0];
    const formulas = range.getFormulas()[0];
    FIELDS.forEach(function (f) {
      if (!map[f[0]]) return;
      if (!isNew && (f[0] === 'entered_on' || ((f[0] === 'scan_file' || f[0] === 'scan_link') && !(files && files.length)))) return;
      vals[map[f[0]] - 1] = cellIn_(rec[f[0]], f[2], sh.getParent().getSpreadsheetTimeZone());
    });
    range.setValues([vals.map(function (v, i) { return formulas[i] ? formulas[i] : v; })]);
    SpreadsheetApp.flush();
    return { record_id: rec.record_id, row: row, scan_link: rec.scan_link || '' };
  } finally { lock.releaseLock(); }
}

/* ---------- delete (clears the row's entries; formatting and formulas stay) ---------- */
function deleteRecord_(id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(), map = colMap_(sh), row = findRow_(sh, map, id);
    if (!row) throw new Error('Entry not found. Refresh the register.');
    FIELDS.forEach(function (f) { if (map[f[0]]) sh.getRange(row, map[f[0]]).clearContent(); });
    return true;
  } finally { lock.releaseLock(); }
}

/* ---------- read a scan with Claude ---------- */
function readForm_(p) {
  const key = prop_('ANTHROPIC_API_KEY');
  if (!key) throw new Error('Reading scans is not switched on (no API key set).');
  const images = (p.images || []).slice(0, 12);
  if (!images.length) throw new Error('No images received.');
  const content = images.map(function (im) {
    return { type: 'image', source: { type: 'base64', media_type: im.type || 'image/jpeg', data: im.data } };
  });
  content.push({ type: 'text', text: String(p.prompt || '') });
  const model = p.careful ? (prop_('ANTHROPIC_MODEL_CAREFUL') || 'claude-opus-5-5') : (prop_('ANTHROPIC_MODEL') || 'claude-sonnet-5-5');
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: model, max_tokens: 4096, messages: [{ role: 'user', content: content }] })
  });
  const code = res.getResponseCode(), body = JSON.parse(res.getContentText() || '{}');
  if (code !== 200) throw new Error('Reading failed (' + code + '): ' + ((body.error && body.error.message) || 'error'));
  const text = (body.content || []).filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('');
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('The reading came back without data. Try again.');
  return JSON.parse(text.slice(a, b + 1));
}

/* Run once from the editor to check the sheet connection. */
function testConnection() {
  const sh = sheet_();
  Logger.log('Sheet: ' + sh.getParent().getName() + ' · columns mapped: ' + Object.keys(colMap_(sh)).length + ' · records: ' + listRecords_().length);
}

/* Run once: creates the access code (if none) and checks the sheet. The code is printed in the Execution log. */
function setup() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ACCESS_CODE')) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = ''; for (let i = 0; i < 8; i++) c += chars.charAt(Math.floor(Math.random() * chars.length));
    props.setProperty('ACCESS_CODE', c);
  }
  Logger.log('Access code for the page: ' + props.getProperty('ACCESS_CODE') + '  (change it any time in Project Settings > Script properties)');
  testConnection();
  folder_();
}

/* Saves a test entry, reads it back, then clears it. */
function selfTest() {
  const r = saveRecord_({ election: 'Ordinary Elections', district: 'TEST', mandal: 'TEST', gram_panchayat: 'TEST GP', post: 'Sarpanch', cand_name_en: 'SELF TEST - delete me', age: '30', receipt_date: '2026-11-17', receipt_time: '10:30', mobile: '9000000000' }, []);
  const found = listRecords_().filter(function (x) { return x.record_id === r.record_id; })[0];
  Logger.log('Saved to row ' + r.row + '; read back: ' + JSON.stringify({ name: found && found.cand_name_en, date: found && found.receipt_date, time: found && found.receipt_time, mobile: found && found.mobile }));
  deleteRecord_(r.record_id);
  Logger.log('Cleared test row. Records now: ' + listRecords_().length);
}
