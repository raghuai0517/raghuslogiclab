/**
 * Kavitha Notebook — backend for https://raghuslogiclab.com/tools/kavitha-notebook/
 * Keeps the poems in a Google Sheet (so they are backed up and open on any phone),
 * translates Telugu <-> English with Google Translate (LanguageApp, free, no key),
 * and writes Telugu and English poems with Google Gemini when a Gemini key is set.
 *
 * Who writes the poem, in order:
 *   1. Google Gemini, when GEMINI_API_KEY is set (free key from https://aistudio.google.com/apikey).
 *   2. Claude, when ANTHROPIC_API_KEY is set (optional, paid).
 *   3. Otherwise the page's built-in poem shaper: it arranges Dad's own words into lines and stanzas,
 *      and this script translates those lines into English, line by line.
 *
 * Script properties (Project Settings -> Script properties):
 *   ACCESS_CODE        required. Family code typed once on the phone. setup() creates one.
 *   SHEET_ID           set by setup(): the "Kavitha Notebook – Poems" Google Sheet.
 *   GEMINI_API_KEY     optional. Turns on poem writing by Gemini.
 *   GEMINI_MODEL       optional. Default gemini-flash-latest; if Google retires that name the script
 *                      picks the newest Flash model itself and remembers it here.
 *   ANTHROPIC_API_KEY  optional. Poem writing by Claude, used only when there is no Gemini key or Gemini fails.
 *   ANTHROPIC_MODEL    optional. Default claude-sonnet-5-5.
 */
const TAB = 'Poems';
const COLS = ['id', 'created', 'updated', 'style', 'raw', 'title_te', 'title_en', 'note_te', 'note_en', 'poem_te', 'poem_en'];
const STYLES = {
  free: 'Telugu vachana kavitha (free verse): natural, modern, no forced rhyme',
  rhyme: 'gentle rhyme (prasa) and steady rhythm, lyrical and song-like',
  short: 'a short poem of 4 to 8 lines, distilled to its strongest image'
};

function doGet() {
  return json_({ ok: true, service: 'Kavitha Notebook', time: new Date().toISOString() });
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents || '{}');
    checkCode_(req.code);
    const p = req.payload || {};
    switch (req.action) {
      case 'ping':      return json_({ ok: true, ai: aiName_() });
      case 'list':      return json_({ ok: true, records: list_() });
      case 'save':      return json_({ ok: true, record: save_(p.record || {}) });
      case 'delete':    return json_({ ok: true, deleted: del_(String(p.id || '')) });
      case 'compose':   return json_({ ok: true, result: compose_(p) });
      case 'translate': return json_({ ok: true, text: translateLines_(String(p.text || ''), p.to === 'te' ? 'te' : 'en') });
      default:          throw new Error('Unknown action');
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* ---------- helpers ---------- */
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k); }
function aiName_() { return prop_('GEMINI_API_KEY') ? 'gemini' : prop_('ANTHROPIC_API_KEY') ? 'claude' : ''; }
function checkCode_(code) {
  const want = prop_('ACCESS_CODE');
  if (!want) throw new Error('Not set up yet (no access code). Run setup() in the script editor.');
  if (String(code || '').trim().toUpperCase() !== want.toUpperCase()) {
    Utilities.sleep(800);
    throw new Error('Wrong access code.');
  }
}
function sheet_() {
  const id = prop_('SHEET_ID');
  if (!id) throw new Error('Not set up yet (no sheet). Run setup() in the script editor.');
  return SpreadsheetApp.openById(id).getSheetByName(TAB);
}
function isTe_(s) { return /[ఀ-౿]/.test(s); }
function clip_(v, n) { return String(v == null ? '' : v).slice(0, n || 40000); }
function cell_(v) { const s = clip_(v); return /^[=+\-@]/.test(s) ? "'" + s : s; }   // never let text become a formula

/* ---------- poems in the sheet ---------- */
function list_() {
  const sh = sheet_(), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, COLS.length).getValues()
    .filter(function (r) { return r[0]; })
    .map(function (r) { const o = {}; COLS.forEach(function (c, i) { o[c] = (c === 'created' || c === 'updated') ? Number(r[i]) || 0 : String(r[i]); }); return o; });
}
function rowOf_(sh, id) {
  const n = sh.getLastRow();
  if (n < 2) return 0;
  const ids = sh.getRange(2, 1, n - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return 0;
}
function save_(r) {
  const id = String(r.id || '');
  if (!/^[a-z0-9]{6,40}$/i.test(id)) throw new Error('Bad id');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = sheet_();
    const row = COLS.map(function (c) { return (c === 'created' || c === 'updated') ? (Number(r[c]) || Date.now()) : cell_(r[c]); });
    const at = rowOf_(sh, id);
    if (at) sh.getRange(at, 1, 1, COLS.length).setValues([row]);
    else sh.appendRow(row);
    return { id: id, updated: row[2] };
  } finally { lock.releaseLock(); }
}
function del_(id) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = sheet_(), at = rowOf_(sh, id);
    if (at) sh.deleteRow(at);
    return !!at;
  } finally { lock.releaseLock(); }
}

/* ---------- translation (Google Translate, free) ---------- */
function translate_(text, to) {
  text = clip_(text, 8000).trim();
  if (!text) return '';
  return LanguageApp.translate(text, '', to);
}
/* Line by line, so a poem keeps its lines and stanza breaks. */
function translateLines_(text, to) {
  const lines = clip_(text, 8000).split('\n');
  if (lines.length > 60) return translate_(text, to);
  return lines.map(function (l) { return l.trim() ? translate_(l, to) : ''; }).join('\n');
}

/* ---------- note + poems ---------- */
function compose_(p) {
  const text = clip_(p.text, 8000).trim();
  if (!text) throw new Error('No words received.');
  const style = STYLES[p.style] ? p.style : 'free';
  if (prop_('GEMINI_API_KEY')) {
    try { const r = gemini_(text, style); r.source = 'gemini'; return r; }
    catch (err) { console.warn('Gemini: ' + err.message); }
  }
  if (prop_('ANTHROPIC_API_KEY')) {
    try { const r = claude_(text, style); r.source = 'claude'; return r; }
    catch (err) { console.warn('Claude: ' + err.message); }
  }
  return plain_(text, clip_(p.shaped_te, 8000), clip_(p.shaped_en, 8000));
}

/* No AI: the page has already arranged his words into a poem (shaped_te / shaped_en);
   here they are translated, and the note is translated too. */
function plain_(text, shapedTe, shapedEn) {
  const te = isTe_(text) ? text : translate_(text, 'te');
  const en = isTe_(text) ? translate_(text, 'en') : text;
  const lines = function (s) {
    return s.replace(/\s+/g, ' ').split(/(?<=[.,!?;।|])\s+/).map(function (l) { return l.trim(); }).filter(String).join('\n');
  };
  const poemTe = shapedTe || (isTe_(text) ? lines(te) : translateLines_(shapedEn || lines(en), 'te'));
  const poemEn = shapedEn || translateLines_(poemTe, 'en');
  const title = function (s) { return s.replace(/[.,!?;।|]/g, ' ').trim().split(/\s+/).slice(0, 4).join(' '); };
  return {
    source: 'shaper',
    title_te: title(te), title_en: title(en),
    note_te: te, note_en: en,
    poem_te: poemTe, poem_en: poemEn
  };
}

function prompt_(text, style) {
  return 'You are a gentle, skilled editor helping an elderly Telugu poet turn spoken ideas into kavithas (poems).\n'
    + 'His spoken words came from speech-to-text, so they may contain recognition errors, and may be in Telugu script, romanized Telugu, English, or a mix:\n"""\n'
    + text + '\n"""\n\nDo the following:\n'
    + '1. note_te: his idea written down as a clear note in Telugu script. Stay faithful to his words and meaning; only fix obvious recognition errors, fillers and repetition. Add no new ideas.\n'
    + '2. note_en: a faithful English translation of note_te.\n'
    + '3. poem_te: shape his idea into a Telugu poem in Telugu script. Form: ' + STYLES[style] + '. Keep his images, feelings and key phrases. Use \\n for line breaks and a blank line between stanzas.\n'
    + '4. poem_en: an English poem carrying the same idea, images and feeling, written as real English poetry (not word-for-word), in the same form.\n'
    + '5. title_te and title_en: short titles of 2 to 5 words.\n\n'
    + 'Reply with only a JSON object with exactly these string keys: title_te, title_en, note_te, note_en, poem_te, poem_en.';
}
function parsePoem_(out) {
  const a = out.indexOf('{'), b = out.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('No poem in the reply');
  const j = JSON.parse(out.slice(a, b + 1)), r = {};
  ['title_te', 'title_en', 'note_te', 'note_en', 'poem_te', 'poem_en'].forEach(function (k) { r[k] = clip_(j[k], 20000).trim(); });
  if (!r.poem_te && !r.poem_en) throw new Error('Empty poem');
  return r;
}

/* ---------- Google Gemini ---------- */
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/';
function geminiCall_(model, prompt) {
  const res = UrlFetchApp.fetch(GEMINI + 'models/' + encodeURIComponent(model) + ':generateContent', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-goog-api-key': prop_('GEMINI_API_KEY') },
    payload: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, responseMimeType: 'application/json' }
    })
  });
  return { code: res.getResponseCode(), body: res.getContentText() };
}
/* The newest general Flash model that can generate text, if the saved name stops working. */
function pickGeminiModel_() {
  const res = UrlFetchApp.fetch(GEMINI + 'models?pageSize=200', { muteHttpExceptions: true, headers: { 'x-goog-api-key': prop_('GEMINI_API_KEY') } });
  if (res.getResponseCode() !== 200) return '';
  const ver = function (n) { const m = n.match(/gemini-(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
  const names = (JSON.parse(res.getContentText()).models || [])
    .filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0; })
    .map(function (m) { return String(m.name).replace(/^models\//, ''); })
    .filter(function (n) { return /^gemini-.*flash/.test(n) && !/(image|tts|live|audio|lite|exp|thinking|embedding|robotics)/.test(n); })
    .sort(function (a, b) { return ver(b) - ver(a) || (/preview/.test(a) ? 1 : 0) - (/preview/.test(b) ? 1 : 0); });
  return names[0] || '';
}
function gemini_(text, style) {
  const prompt = prompt_(text, style);
  let model = prop_('GEMINI_MODEL') || 'gemini-flash-latest';
  let r = geminiCall_(model, prompt);
  if (r.code === 404 || r.code === 400 && /model/i.test(r.body)) {
    const m = pickGeminiModel_();
    if (m && m !== model) { model = m; PropertiesService.getScriptProperties().setProperty('GEMINI_MODEL', m); r = geminiCall_(m, prompt); }
  }
  if (r.code !== 200) throw new Error('Gemini failed (' + r.code + ')');
  const body = JSON.parse(r.body || '{}');
  const parts = (((body.candidates || [])[0] || {}).content || {}).parts || [];
  return parsePoem_(parts.map(function (x) { return x.text || ''; }).join(''));
}

/* ---------- Claude (optional) ---------- */
function claude_(text, style) {
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': prop_('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: prop_('ANTHROPIC_MODEL') || 'claude-sonnet-5-5', max_tokens: 4096, messages: [{ role: 'user', content: prompt_(text, style) }] })
  });
  const code = res.getResponseCode(), body = JSON.parse(res.getContentText() || '{}');
  if (code !== 200) throw new Error('Claude failed (' + code + ')');
  return parsePoem_((body.content || []).filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join(''));
}

/* Run once from the editor: creates the access code and the Google Sheet. Both are printed in the Execution log. */
function setup() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ACCESS_CODE')) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = ''; for (let i = 0; i < 6; i++) c += chars.charAt(Math.floor(Math.random() * chars.length));
    props.setProperty('ACCESS_CODE', c);
  }
  if (!props.getProperty('SHEET_ID')) {
    const ss = SpreadsheetApp.create('Kavitha Notebook – Poems');
    const sh = ss.getSheets()[0].setName(TAB);
    sh.getRange(1, 1, 1, COLS.length).setValues([COLS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    props.setProperty('SHEET_ID', ss.getId());
  }
  Logger.log('Family code for the page: ' + props.getProperty('ACCESS_CODE'));
  Logger.log('Poems sheet: https://docs.google.com/spreadsheets/d/' + props.getProperty('SHEET_ID') + '/edit');
  Logger.log('Translation test: ' + translate_('నమస్కారం', 'en'));
  Logger.log('Poem writer: ' + (aiName_() || 'built-in shaper (no GEMINI_API_KEY)'));
}

/* Run from the editor after adding GEMINI_API_KEY: writes one test poem and prints it. */
function testPoem() {
  const r = compose_({ text: 'మా ఊరి చెరువు గట్టున సాయంత్రం చల్లని గాలి వీస్తుంది. పిల్లలు ఆడుకుంటారు.', style: 'free' });
  Logger.log('Written by: ' + r.source + (prop_('GEMINI_MODEL') ? ' (' + prop_('GEMINI_MODEL') + ')' : ''));
  Logger.log(r.title_te + '\n' + r.poem_te + '\n\n' + r.title_en + '\n' + r.poem_en);
}
