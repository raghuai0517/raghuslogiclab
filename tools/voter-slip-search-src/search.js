// Search helpers: Telugu normalisation, rough romanisation for English-typed names, phonetic keys.
(function (root) {
  'use strict';
  const CONS = { 'క':'k','ఖ':'kh','గ':'g','ఘ':'gh','ఙ':'n','చ':'ch','ఛ':'chh','జ':'j','ఝ':'jh','ఞ':'n','ట':'t','ఠ':'th','డ':'d','ఢ':'dh','ణ':'n',
    'త':'t','థ':'th','ద':'d','ధ':'dh','న':'n','ప':'p','ఫ':'ph','బ':'b','భ':'bh','మ':'m','య':'y','ర':'r','ఱ':'r','ల':'l','ళ':'l','వ':'v',
    'శ':'sh','ష':'sh','స':'s','హ':'h' };
  const VOW = { 'అ':'a','ఆ':'aa','ఇ':'i','ఈ':'ee','ఉ':'u','ఊ':'oo','ఋ':'ru','ౠ':'ru','ఎ':'e','ఏ':'e','ఐ':'ai','ఒ':'o','ఓ':'o','ఔ':'au' };
  const SIGN = { 'ా':'aa','ి':'i','ీ':'ee','ు':'u','ూ':'oo','ృ':'ru','ౄ':'ru','ె':'e','ే':'e','ై':'ai','ొ':'o','ో':'o','ౌ':'au' };

  function romanize(s) {
    let out = '';
    const ch = Array.from(s || '');
    for (let i = 0; i < ch.length; i++) {
      const c = ch[i], n = ch[i + 1];
      if (CONS[c]) {
        out += CONS[c];
        if (n === '్') { i++; }
        else if (SIGN[n]) { out += SIGN[n]; i++; }
        else out += 'a';
      } else if (VOW[c]) out += VOW[c];
      else if (c === 'ం' || c === 'ఁ') out += (CONS[n] && !/[పఫబభమ]/.test(n)) ? 'n' : 'm';
      else if (c === 'ః') out += 'h';
      else if (SIGN[c]) out += SIGN[c];
      else if (c === '‌' || c === '‍' || c === '్') {}
      else out += c.toLowerCase();
    }
    return out;
  }
  // phonetic key: tolerant of common English spellings of Telugu names
  function phon(s) {
    let k = (s || '').toLowerCase();
    if (/[ఀ-౿]/.test(k)) k = romanize(k);
    k = k.replace(/[^a-z]/g, '')
      .replace(/x/g, 'ks').replace(/q/g, 'k').replace(/z/g, 'j').replace(/w/g, 'v').replace(/f/g, 'p')
      .replace(/ph/g, 'p').replace(/h/g, '')
      .replace(/[ei]+/g, 'i').replace(/[ou]+/g, 'u')
      .replace(/(.)\1+/g, '$1')
      .replace(/m(?=[^aiu])/g, 'n');
    return k;
  }
  function display(s) {
    return romanize(s).replace(/aa/g, 'a').replace(/oo/g, 'u').replace(/\b\w/g, c => c.toUpperCase());
  }
  const nzTe = (s) => (s || '').replace(/[\s​-‍.]/g, '').toLowerCase();
  const isTe = (s) => /[ఀ-౿]/.test(s);

  function prepare(r) {
    r._n = nzTe(r.name); r._r = nzTe(r.relName);
    r._nw = (r.name || '').split(/\s+/).map(phon); r._rw = (r.relName || '').split(/\s+/).map(phon);
    r._np = r._nw.join(' '); r._rp = r._rw.join(' ');
    r._en = display(r.name);
    return r;
  }
  // score: 0 = no match, 3 = exact Telugu substring, 2 = all tokens Telugu, 1 = phonetic
  function nameScore(r, q, scope) {
    q = (q || '').trim(); if (!q) return 3;
    const fields = scope === 'rel' ? ['r'] : scope === 'name' ? ['n'] : ['n', 'r'];
    const toks = q.split(/\s+/).filter(Boolean);
    let best = 0;
    for (const f of fields) {
      const tel = r['_' + f], words = r['_' + f + 'w'], ph = r['_' + f + 'p'];
      if (isTe(q) && tel.includes(nzTe(q))) { best = Math.max(best, 3); continue; }
      if (isTe(q) && toks.every(t => tel.includes(nzTe(t)))) { best = Math.max(best, 2); continue; }
      const pq = toks.map(phon).filter(Boolean);
      if (pq.length && pq.every(t => ph.includes(t))) best = Math.max(best, 1);
    }
    return best;
  }
  const api = { romanize, display, phon, prepare, nameScore, nzTe };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VoterSearch = api;
})(typeof window !== 'undefined' ? window : globalThis);
