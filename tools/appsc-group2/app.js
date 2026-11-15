/* APPSC Group 2 Prep Hall — app logic (no libraries, no server).
   Progress is saved only in this browser under the key "appscg2.v1". */
(function () {
  "use strict";
  var D = window.APPSC_DATA, GEN = window.APPSC_GEN, KEY = "appscg2.v1";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var rnd = function (n) { return Math.floor(Math.random() * n); };
  var shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

  /* ---------- saved state ---------- */
  function fresh() { return { lang: "en", theme: "light", xp: 0, days: {}, seen: {}, st: {}, read: {}, marks: {}, tests: [], goal: 20, exam: "" }; }
  function load() { var d = fresh(); try { var j = JSON.parse(localStorage.getItem(KEY) || "null"); if (j && typeof j === "object") for (var k in d) if (j[k] != null) d[k] = j[k]; } catch (e) {} return d; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  var S = load(), L = S.lang === "te" ? 1 : 0;
  var x = function (en, te) { return L ? te : en; }, tr = function (p) { return p[L]; };

  /* ---------- question bank ---------- */
  var MENTAL = { id: "mental", icon: "🧠", name: ["Mental Ability", "మానసిక సామర్థ్యం"], sub: ["Reasoning and arithmetic · unlimited practice", "రీజనింగ్, అంకగణితం · అపరిమిత అభ్యాసం"], topics: GEN.topics, q: [] };
  var SUBJECTS = D.subjects.concat([MENTAL]), SUBJ = {}, TOPIC = {}, BANK = [], BYID = {};
  SUBJECTS.forEach(function (s) {
    SUBJ[s.id] = s;
    s.topics.forEach(function (t, i) { TOPIC[t.id] = { subj: s.id, t: t, i: i }; });
    s.q.forEach(function (q, i) {
      var it = { id: s.id + ":" + i, subj: s.id, topic: q[0], q: [q[1], q[2]], o: q[3].map(function (en, k) { return [en, q[4] ? q[4][k] : en]; }), ex: [q[5], q[6]] };
      BANK.push(it); BYID[it.id] = it;
    });
  });
  var take = function (subj, n, topic) { return shuffle(BANK.filter(function (q) { return q.subj === subj && (!topic || q.topic === topic); })).slice(0, n); };
  var gens = function (n, key) { var out = [], types = shuffle(GEN.types); for (var i = 0; i < n; i++) out.push(GEN.make(key || types[i % types.length])); return out; };

  /* ---------- dates, stats, XP ---------- */
  var dkey = function (d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); };
  var today = function () { return dkey(new Date()); };
  var pct = function (c, n) { return n ? Math.round(c * 100 / n) : 0; };
  function subjStat(id) { var a = 0, c = 0; SUBJ[id].topics.forEach(function (t) { var s = S.st[t.id]; if (s) { a += s[0]; c += s[1]; } }); return [a, c]; }
  function allStat() { var a = 0, c = 0; for (var k in S.st) { a += S.st[k][0]; c += S.st[k][1]; } return [a, c]; }
  function streak() { var d = new Date(), n = 0; if (!S.days[dkey(d)]) d.setDate(d.getDate() - 1); while (S.days[dkey(d)]) { n++; d.setDate(d.getDate() - 1); } return n; }
  var level = function () { return Math.floor(S.xp / 300) + 1; };
  var mistakes = function () { return BANK.filter(function (q) { var s = S.seen[q.id]; return s && !s[2]; }); };
  var marked = function () { return BANK.filter(function (q) { return S.marks[q.id]; }); };
  function record(it) {
    if (it.pick < 0 || it.rec) return;
    var ok = it.pick === it.ans ? 1 : 0, src = it.src, st = S.st[src.topic] || (S.st[src.topic] = [0, 0]), dy = S.days[today()] || (S.days[today()] = [0, 0]);
    st[0]++; st[1] += ok; dy[0]++; dy[1] += ok; S.xp += ok ? 10 : 2; it.rec = true;
    if (src.id) { var sn = S.seen[src.id] || [0, 0, 0]; S.seen[src.id] = [sn[0] + 1, sn[1] + ok, ok]; }
    save();
  }

  /* ---------- small UI helpers ---------- */
  var toastT;
  function toast(msg) { var t = $("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("on"); }, 2200); }
  var onYes = null;
  function modal(title, body, yes, fn, no) { onYes = fn; $("modal").innerHTML = '<div class="card"><h2>' + esc(title) + '</h2><div style="margin:10px 0 16px">' + body + '</div><div class="btns end"><button class="btn ghost" data-act="no">' + esc(no || x("Cancel", "రద్దు")) + '</button><button class="btn pri" data-act="yes">' + esc(yes) + "</button></div></div>"; $("modal").classList.add("on"); }
  function closeModal() { $("modal").classList.remove("on"); onYes = null; }
  var clock = function (s) { s = Math.max(0, s); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return (h ? h + ":" + ("0" + m).slice(-2) : m) + ":" + ("0" + ss).slice(-2); };
  var bar = function (p) { return '<div class="bar" role="img" aria-label="' + p + '%"><i style="width:' + p + '%"></i></div>'; };
  var sec = function (t, right) { return '<div class="sec"><h2>' + t + "</h2>" + (right || "") + "</div>"; };
  function heat(weeks) {
    var d = new Date(), out = "", cells = weeks * 7 - (6 - d.getDay()), t = today(); d.setDate(d.getDate() - cells + 1);
    for (var i = 0; i < cells; i++) { var k = dkey(d), n = S.days[k] ? S.days[k][0] : 0, lv = n >= 40 ? 4 : n >= 20 ? 3 : n >= 10 ? 2 : n ? 1 : 0; out += '<i class="l' + lv + (k === t ? " today" : "") + '" title="' + k + ": " + n + '"></i>'; d.setDate(d.getDate() + 1); }
    return '<div class="scroll"><div class="heat">' + out + '</div></div><div class="legend"><span>' + x("Each square is one day; darker means more questions.", "ప్రతి గడి ఒక రోజు; ముదురు రంగు అంటే ఎక్కువ ప్రశ్నలు.") + "</span></div>";
  }
  var ICON = { home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>', learn: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M8 7h7M8 11h7"/>', tests: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12l2 2 4-4M9 18h6"/>', revise: '<rect x="3" y="7" width="14" height="13" rx="2"/><path d="M7 4h12a2 2 0 0 1 2 2v10"/>', progress: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>' };

  /* ---------- test engine ---------- */
  var X = null, RES = null, timerId = null, CUR = "home";
  function inst(src) { var order = shuffle([0, 1, 2, 3]); return { src: src, order: order, ans: order.indexOf(0), pick: -1, flag: false, rec: false }; }
  function startTest(cfg) {
    if (!cfg.items.length) { toast(x("No questions here yet.", "ఇక్కడ ఇంకా ప్రశ్నలు లేవు.")); return; }
    X = { name: cfg.name, items: cfg.items.map(inst), i: 0, timed: !!cfg.mins, left: (cfg.mins || 0) * 60, instant: !!cfg.instant, neg: !!cfg.neg, start: Date.now(), pal: false, xp0: S.xp };
    clearInterval(timerId);
    timerId = setInterval(function () {
      if (!X) { clearInterval(timerId); return; }
      if (!X.timed) return;
      X.left--; var el = $("timer"); if (el) { el.textContent = clock(X.left); el.classList.toggle("low", X.left < 300); }
      if (X.left <= 0) { toast(x("Time is up. Test submitted.", "సమయం ముగిసింది. పరీక్ష సమర్పించబడింది.")); finish(); }
    }, 1000);
    if (location.hash === "#/test") route(); else location.hash = "#/test";
  }
  function finish() {
    if (!X) return;
    clearInterval(timerId);
    var c = 0, w = 0, by = {}, order = [];
    X.items.forEach(function (it) {
      record(it);
      var sid = it.src.subj; if (!by[sid]) { by[sid] = [0, 0, 0]; order.push(sid); }
      by[sid][0]++; if (it.pick === it.ans) { c++; by[sid][1]++; } else if (it.pick >= 0) { w++; by[sid][2]++; }
    });
    var n = X.items.length, done = c + w, score = X.neg ? c - w / 3 : c;
    if (done >= 10) S.xp += 20;
    RES = { name: X.name, items: X.items, n: n, c: c, w: w, sk: n - done, score: Math.round(score * 100) / 100, neg: X.neg, lost: Math.round(w / 3 * 100) / 100, secs: Math.round((Date.now() - X.start) / 1000), by: by, order: order, xp: S.xp - X.xp0, filter: w ? "wrong" : "all" };
    if (done) { S.tests.unshift({ d: Date.now(), name: X.name, n: n, c: c, w: w, s: RES.score, neg: X.neg }); S.tests = S.tests.slice(0, 30); }
    save(); X = null;
    if (location.hash === "#/result") route(); else location.hash = "#/result";
  }
  /* one question block: live (during a test) or review (after it) */
  function qBlock(it, num, review) {
    var src = it.src, locked = review || (X && X.instant && it.pick >= 0), s = SUBJ[src.subj], h = "";
    h += '<div class="row" style="margin-bottom:6px"><span class="tag wrap">' + esc(tr(s.name)) + " · " + esc(tr(TOPIC[src.topic].t.t)) + '</span><span class="grow"></span>' +
      (review ? (it.pick < 0 ? '<span class="tag warn">' + x("Skipped", "వదిలేశారు") + "</span>" : it.pick === it.ans ? '<span class="tag good">' + x("Correct", "సరైనది") + "</span>" : '<span class="tag bad">' + x("Wrong", "తప్పు") + "</span>") : "") +
      (src.id ? '<button class="chip' + (S.marks[src.id] ? " on" : "") + '" data-act="mark" data-id="' + src.id + '" aria-label="' + x("Bookmark", "బుక్‌మార్క్") + '">' + (S.marks[src.id] ? "★" : "☆") + "</button>" : "") + "</div>";
    h += '<p class="q">' + (num ? num + ". " : "") + esc(tr(src.q)) + "</p>";
    if (src.viz && src.viz.pre) h += GEN.viz(src.viz, L);
    for (var k = 0; k < 4; k++) {
      var cls = locked ? (k === it.ans ? " ok" : k === it.pick ? " no" : "") : (k === it.pick ? " sel" : "");
      h += '<button class="opt' + cls + '"' + (locked ? " disabled" : ' data-act="pick" data-k="' + k + '"') + '><span class="k">' + "ABCD"[k] + "</span><span>" + esc(tr(src.o[it.order[k]])) + "</span></button>";
    }
    if (locked) h += '<div class="expl"><b class="h">' + x("Explanation", "వివరణ") + "</b><p>" + esc(tr(src.ex)) + "</p>" + (src.viz && !src.viz.pre ? GEN.viz(src.viz, L) : "") +
      (review && src.id ? '<p class="small" style="margin-top:8px"><a href="#/topic/' + src.topic + '" style="text-decoration:underline">' + x("Read the notes for this topic", "ఈ అంశం నోట్స్ చదవండి") + " →</a></p>" : "") + "</div>";
    return h;
  }
  function vTest() {
    if (!X) { location.hash = "#/tests"; return ""; }
    var it = X.items[X.i], n = X.items.length, last = X.i === n - 1, answered = X.items.filter(function (q) { return q.pick >= 0; }).length, h = "";
    h += '<div class="tbar"><div class="grow"><b>' + esc(X.name) + '</b><div class="small muted">' + x("Question", "ప్రశ్న") + " " + (X.i + 1) + " / " + n + " · " + x("answered", "జవాబిచ్చినవి") + " " + answered + "</div></div>" +
      (X.timed ? '<span class="timer' + (X.left < 300 ? " low" : "") + '" id="timer">' + clock(X.left) + "</span>" : "") + '<button class="chip' + (X.pal ? " on" : "") + '" data-act="pal">▦ ' + x("All", "అన్నీ") + "</button></div>";
    h += bar(pct(X.i + 1, n)) + '<div class="card" style="margin-top:12px">' + qBlock(it, X.i + 1, false) + "</div>";
    if (X.instant) {
      h += '<div class="btns end"><button class="btn ghost bad" data-act="quit">' + x("End practice", "అభ్యాసం ముగించు") + '</button><button class="btn pri" data-act="' + (last ? "submitNow" : "next") + '"' + (it.pick < 0 ? " disabled" : "") + ">" + (last ? x("See result", "ఫలితం చూడండి") : x("Next question →", "తర్వాతి ప్రశ్న →")) + "</button></div>";
    } else {
      h += '<div class="btns"><button class="btn" data-act="prev"' + (X.i ? "" : " disabled") + ">← " + x("Previous", "మునుపటి") + '</button><button class="btn" data-act="flag">' + (it.flag ? "⚑ " + x("Marked", "గుర్తించారు") : "⚐ " + x("Mark for review", "సమీక్షకు గుర్తించు")) + '</button><button class="btn" data-act="clear"' + (it.pick < 0 ? " disabled" : "") + ">" + x("Clear", "తొలగించు") + '</button><span class="grow" style="flex:1"></span>' +
        (last ? "" : '<button class="btn pri" data-act="next">' + x("Next", "తర్వాత") + " →</button>") + "</div>" +
        '<div class="btns end" style="margin-top:14px"><button class="btn ghost bad" data-act="quit">' + x("Leave test", "పరీక్ష వదిలేయి") + '</button><button class="btn' + (last ? " pri" : "") + '" data-act="submit">' + x("Submit test", "పరీక్ష సమర్పించు") + "</button></div>";
    }
    if (X.pal) {
      h += '<div class="card" style="margin-top:14px"><div class="pal">';
      X.items.forEach(function (q, i) { h += '<button class="' + (q.flag ? "f" : q.pick >= 0 ? "a" : "") + (i === X.i ? " cur" : "") + '" data-act="goto" data-i="' + i + '">' + (i + 1) + "</button>"; });
      h += '</div><div class="legend"><span><i class="a" style="background:var(--good)"></i>' + x("Answered", "జవాబిచ్చినవి") + '</span><span><i style="background:var(--warn)"></i>' + x("Marked for review", "సమీక్షకు గుర్తించినవి") + "</span><span><i></i>" + x("Not answered", "జవాబివ్వనివి") + "</span></div></div>";
    }
    return h;
  }
  function vResult() {
    if (!RES) { location.hash = "#/tests"; return ""; }
    var R = RES, acc = pct(R.c, R.c + R.w), h = "";
    h += '<div class="card hero"><span class="eyebrow">' + x("Result", "ఫలితం") + "</span><h1>" + esc(R.name) + '</h1><div class="score">' + R.score + ' <span style="font-size:1.1rem;opacity:.8">/ ' + R.n + "</span></div>" +
      '<p class="it">' + (R.neg ? x("After negative marking of ⅓ mark for each wrong answer", "ప్రతి తప్పు జవాబుకు ⅓ మార్కు తగ్గించిన తర్వాత") : x("No negative marking in practice mode", "అభ్యాస విధానంలో నెగటివ్ మార్కులు లేవు")) + "</p>" +
      '<div class="stats"><div class="stat"><b>' + R.c + "</b><span>" + x("Correct", "సరైనవి") + '</span></div><div class="stat"><b>' + R.w + "</b><span>" + x("Wrong", "తప్పులు") + '</span></div><div class="stat"><b>' + R.sk + "</b><span>" + x("Skipped", "వదిలేసినవి") + '</span></div><div class="stat"><b>' + acc + "%</b><span>" + x("Accuracy", "ఖచ్చితత్వం") + "</span></div></div></div>";
    h += '<div class="card"><div class="set"><span>' + x("Time taken", "పట్టిన సమయం") + "</span><b>" + clock(R.secs) + "</b></div>" + (R.neg ? '<div class="set"><span>' + x("Marks lost to wrong answers", "తప్పు జవాబుల వల్ల కోల్పోయిన మార్కులు") + '</span><b style="color:var(--bad)">−' + R.lost + "</b></div>" : "") + '<div class="set"><span>XP</span><b>+' + R.xp + "</b></div></div>";
    if (R.order.length > 1) {
      h += sec(x("Section-wise", "విభాగాల వారీగా")) + '<div class="card scroll"><table><tr><th>' + x("Section", "విభాగం") + "</th><th>" + x("Q", "ప్ర") + "</th><th>✓</th><th>✗</th><th>" + x("Marks", "మార్కులు") + "</th></tr>";
      R.order.forEach(function (sid) { var b = R.by[sid]; h += "<tr><td>" + esc(tr(SUBJ[sid].name)) + "</td><td>" + b[0] + "</td><td>" + b[1] + "</td><td>" + b[2] + "</td><td>" + Math.round((R.neg ? b[1] - b[2] / 3 : b[1]) * 100) / 100 + "</td></tr>"; });
      h += "</table></div>";
    }
    var miss = R.items.filter(function (q) { return q.pick !== q.ans; }).length;
    h += '<div class="btns" style="margin:14px 0">' + (miss ? '<button class="btn pri" data-act="retry">' + x("Practise the " + miss + " I missed", "తప్పిన " + miss + " ప్రశ్నలు మళ్లీ చేయండి") + "</button>" : "") + '<a class="btn" href="#/tests">' + x("More tests", "మరిన్ని పరీక్షలు") + '</a><a class="btn" href="#/home">' + x("Home", "హోమ్") + "</a></div>";
    h += sec(x("Review answers", "జవాబుల సమీక్ష")) + '<div class="chips">' + [["all", x("All", "అన్నీ")], ["wrong", x("Wrong", "తప్పులు")], ["skip", x("Skipped", "వదిలేసినవి")]].map(function (f) { return '<button class="chip' + (R.filter === f[0] ? " on" : "") + '" data-act="rfilter" data-f="' + f[0] + '">' + f[1] + "</button>"; }).join("") + "</div>";
    var shown = 0;
    R.items.forEach(function (it, i) { var kind = it.pick < 0 ? "skip" : it.pick === it.ans ? "ok" : "wrong"; if (R.filter !== "all" && R.filter !== kind) return; shown++; h += '<div class="card">' + qBlock(it, i + 1, true) + "</div>"; });
    if (!shown) h += '<p class="muted center">' + x("Nothing in this list.", "ఈ జాబితాలో ఏమీ లేదు.") + "</p>";
    return h;
  }

  /* ---------- mock tests ---------- */
  function mockList() {
    return [
      { id: "pre", gold: true, name: x("Prelims pattern mock", "ప్రిలిమ్స్ నమూనా మాక్ టెస్ట్"), meta: x("120 questions · 120 minutes", "120 ప్రశ్నలు · 120 నిమిషాలు"), desc: x("History 30, Geography 30, Indian Society 30, Mental Ability 30. The Current Affairs section is not included.", "చరిత్ర 30, భూగోళం 30, భారతీయ సమాజం 30, మానసిక సామర్థ్యం 30. కరెంట్ అఫైర్స్ విభాగం ఇందులో లేదు."), mins: 120, build: function () { return take("history", 30).concat(take("geography", 30), take("society", 30), gens(30)); } },
      { id: "mini", name: x("Mini prelims", "మినీ ప్రిలిమ్స్"), meta: x("40 questions · 40 minutes", "40 ప్రశ్నలు · 40 నిమిషాలు"), desc: x("10 questions from each of the four prelims sections.", "నాలుగు ప్రిలిమ్స్ విభాగాల నుండి 10 చొప్పున ప్రశ్నలు."), mins: 40, build: function () { return take("history", 10).concat(take("geography", 10), take("society", 10), gens(10)); } },
      { id: "m1", name: x("Mains Paper I practice", "మెయిన్స్ పేపర్ I అభ్యాసం"), meta: x("50 questions · 50 minutes", "50 ప్రశ్నలు · 50 నిమిషాలు"), desc: x("Andhra history and culture first, then the Indian Constitution.", "ముందు ఆంధ్ర చరిత్ర, సంస్కృతి; తర్వాత భారత రాజ్యాంగం."), mins: 50, build: function () { var ap = shuffle(BANK.filter(function (q) { return q.topic === "h4" || q.topic === "h5"; })), rest = shuffle(BANK.filter(function (q) { return q.subj === "history" && q.topic !== "h4" && q.topic !== "h5"; })); return ap.concat(rest).slice(0, 25).concat(take("polity", 25)); } },
      { id: "m2", name: x("Mains Paper II practice", "మెయిన్స్ పేపర్ II అభ్యాసం"), meta: x("50 questions · 50 minutes", "50 ప్రశ్నలు · 50 నిమిషాలు"), desc: x("Indian and AP economy, then Science and Technology.", "భారత, ఏపీ ఆర్థిక వ్యవస్థ; తర్వాత శాస్త్ర, సాంకేతికత."), mins: 50, build: function () { return take("economy", 25).concat(take("science", 25)); } }
    ];
  }

  /* ---------- screens ---------- */
  function nextTopic() {
    var best = null; D.subjects.forEach(function (s) { var un = s.topics.filter(function (t) { return !S.read[t.id]; }); if (!un.length) return; var ratio = 1 - un.length / s.topics.length; if (!best || ratio < best.r) best = { r: ratio, t: un[0], s: s }; }); return best;
  }
  function weakSubject() { var w = null; SUBJECTS.forEach(function (s) { var st = subjStat(s.id); if (st[0] >= 5) { var p = st[1] / st[0]; if (!w || p < w.p) w = { p: p, s: s }; } }); return w && w.p < 0.8 ? w.s : null; }
  function vHome() {
    var all = allStat(), dy = S.days[today()] || [0, 0], goalP = Math.min(100, pct(dy[0], S.goal)), C = 2 * Math.PI * 30, h = "";
    h += '<div class="card hero"><span class="eyebrow">' + x("A.P. Public Service Commission pattern", "ఏ.పీ. పబ్లిక్ సర్వీస్ కమిషన్ నమూనా") + "</span><h1>" + x("Group 2 — Prep Hall", "గ్రూప్ 2 — ప్రిపరేషన్ హాల్") + '</h1><p class="it">' + x("Prelims and Mains · notes, tests and revision", "ప్రిలిమ్స్, మెయిన్స్ · నోట్స్, పరీక్షలు, పునశ్చరణ") + "</p>" +
      '<div class="tags"><span>' + x("Objective type (MCQ)", "ఆబ్జెక్టివ్ (MCQ)") + "</span><span>" + x("Negative marking ⅓", "నెగటివ్ మార్కింగ్ ⅓") + "</span><span>English + తెలుగు</span><span>© @Raghuslogiclab</span></div>" +
      '<div class="stats"><div class="stat"><b>' + streak() + "</b><span>" + x("Day streak", "వరుస రోజులు") + '</span></div><div class="stat"><b>' + level() + "</b><span>" + x("Level", "స్థాయి") + '</span></div><div class="stat"><b>' + S.xp + '</b><span>XP</span></div><div class="stat"><b>' + pct(all[1], all[0]) + "%</b><span>" + x("Accuracy", "ఖచ్చితత్వం") + "</span></div></div></div>";
    if (X) h += '<a class="card tap gold row" href="#/test"><div class="grow"><b>' + x("Test in progress", "పరీక్ష కొనసాగుతోంది") + '</b><div class="small muted">' + esc(X.name) + '</div></div><span class="btn pri">' + x("Resume", "కొనసాగించు") + "</span></a>";
    var days = S.exam ? Math.ceil((new Date(S.exam + "T00:00:00") - new Date(today() + "T00:00:00")) / 86400000) : null;
    h += sec(x("Today's plan", "నేటి ప్రణాళిక")) + '<div class="card"><div class="row"><svg class="ring" viewBox="0 0 76 76" role="img" aria-label="' + goalP + '%"><circle class="bg" cx="38" cy="38" r="30"/><circle class="fg" cx="38" cy="38" r="30" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - goalP / 100)).toFixed(1) + '"/><text x="38" y="45">' + dy[0] + '</text></svg><div class="grow"><b>' + x(dy[0] + " questions today · goal " + S.goal, "నేడు " + dy[0] + " ప్రశ్నలు · లక్ష్యం " + S.goal) + '</b><div class="small muted">' +
      (dy[0] >= S.goal ? x("Daily goal reached. Well done.", "నేటి లక్ష్యం పూర్తయింది. భేష్.") : x("Answer " + (S.goal - dy[0]) + " more to keep your streak strong.", "మీ స్ట్రీక్ నిలబడాలంటే ఇంకా " + (S.goal - dy[0]) + " ప్రశ్నలు చేయండి.")) + (days != null && days >= 0 ? " · " + x(days + " days to the exam", "పరీక్షకు " + days + " రోజులు") : "") + "</div></div></div>";
    var nt = nextTopic(), ws = weakSubject(), mis = mistakes().length, plan = [];
    if (nt) plan.push(['#/topic/' + nt.t.id, x("Read: ", "చదవండి: ") + tr(nt.t.t), tr(nt.s.name) + " · +15 XP"]);
    plan.push(ws ? ["act:quick:" + ws.id, x("Quick test: ", "క్విక్ టెస్ట్: ") + tr(ws.name), x("Your weakest subject so far", "ఇప్పటివరకు మీ బలహీన సబ్జెక్ట్")] : ["act:quick:mix", x("Mixed quick test", "మిశ్రమ క్విక్ టెస్ట్"), x("10 questions from all subjects", "అన్ని సబ్జెక్టుల నుండి 10 ప్రశ్నలు")]);
    plan.push(mis >= 5 ? ["act:mistakes", x("Revise your mistakes", "మీ తప్పులను పునశ్చరణ చేయండి"), x(mis + " questions waiting", mis + " ప్రశ్నలు ఉన్నాయి")] : ["act:lab:", x("Mental ability: 10 questions", "మానసిక సామర్థ్యం: 10 ప్రశ్నలు"), x("With step-by-step visual solutions", "దశలవారీ దృశ్య పరిష్కారాలతో")]);
    h += '<ul class="plan">' + plan.map(function (p, i) { var act = p[0].indexOf("act:") === 0 ? p[0].split(":") : null; return "<li>" + '<span class="n">' + (i + 1) + '</span><div class="grow"><b>' + esc(p[1]) + '</b><div class="small muted">' + esc(p[2]) + "</div></div>" + (act ? '<button class="btn" data-act="' + act[1] + '" data-id="' + (act[2] || "") + '">' : '<a class="btn" href="' + p[0] + '">') + x("Start", "మొదలు") + (act ? "</button>" : "</a>") + "</li>"; }).join("") + "</ul></div>";
    h += sec(x("Jump in", "నేరుగా మొదలుపెట్టండి")) + '<div class="grid">' +
      '<button class="card tap gold" data-act="mock" data-id="pre" style="text-align:left"><span class="eyebrow">' + x("Full mock", "పూర్తి మాక్") + "</span><h3>" + x("Prelims pattern mock", "ప్రిలిమ్స్ నమూనా మాక్") + '</h3><p class="small muted">' + x("120 questions, 120 minutes, ⅓ negative", "120 ప్రశ్నలు, 120 నిమిషాలు, ⅓ నెగటివ్") + "</p></button>" +
      '<a class="card tap" href="#/learn"><span class="eyebrow">' + x("Syllabus", "సిలబస్") + "</span><h3>" + x("Topic-wise notes", "అంశాల వారీ నోట్స్") + '</h3><p class="small muted">' + x("30 topics in 6 subjects", "6 సబ్జెక్టుల్లో 30 అంశాలు") + "</p></a>" +
      '<a class="card tap" href="#/subject/mental"><span class="eyebrow">' + x("Unlimited", "అపరిమితం") + "</span><h3>" + x("Mental ability lab", "మానసిక సామర్థ్య ల్యాబ్") + '</h3><p class="small muted">' + x("Clocks, calendars, directions and more", "గడియారాలు, క్యాలెండర్లు, దిశలు, మరిన్ని") + "</p></a>" +
      '<a class="card tap" href="#/revise"><span class="eyebrow">' + x("Fast revision", "వేగవంతమైన పునశ్చరణ") + "</span><h3>" + x("Flashcards and timeline", "ఫ్లాష్‌కార్డులు, కాలరేఖ") + '</h3><p class="small muted">' + x("10-card sprints, story cards", "10 కార్డుల స్ప్రింట్లు, కథా కార్డులు") + "</p></a></div>";
    h += sec(x("Study heatmap", "అధ్యయన హీట్‌మ్యాప్")) + '<div class="card">' + heat(16) + "</div>";
    h += '<p class="small muted center" style="margin-top:18px">' + x("Independent practice tool by RaghusLogicLab. Not affiliated with APPSC. Always check the official notification and syllabus at psc.ap.gov.in.", "ఇది రఘూస్ లాజిక్ ల్యాబ్ రూపొందించిన స్వతంత్ర అభ్యాస సాధనం. APPSCతో సంబంధం లేదు. అధికారిక నోటిఫికేషన్, సిలబస్ కోసం psc.ap.gov.in చూడండి.") + "</p>";
    return h;
  }
  function vLearn() {
    var h = '<span class="eyebrow">' + x("Syllabus first", "ముందు సిలబస్") + "</span><h1>" + x("Learn", "నేర్చుకోండి") + '</h1><p class="muted" style="margin:4px 0 14px">' + x("Read the key points of a topic, then test yourself on it.", "ఒక అంశం ముఖ్యాంశాలు చదివి, వెంటనే దానిపై పరీక్ష రాయండి.") + "</p>";
    SUBJECTS.forEach(function (s) {
      var st = subjStat(s.id), rd = s.topics.filter(function (t) { return S.read[t.id]; }).length;
      h += '<a class="card tap" href="#/subject/' + s.id + '"><div class="row"><div class="ico">' + s.icon + '</div><div class="grow"><h3>' + esc(tr(s.name)) + '</h3><div class="small muted">' + esc(tr(s.sub)) + '</div></div><span class="tag' + (st[0] ? (pct(st[1], st[0]) >= 70 ? " good" : " warn") : "") + '">' + (st[0] ? pct(st[1], st[0]) + "%" : x("New", "కొత్త")) + '</span></div><div style="margin-top:12px">' + bar(pct(rd, s.topics.length)) + '<div class="small muted" style="margin-top:4px">' + x(rd + " of " + s.topics.length + " topics read", s.topics.length + " అంశాలలో " + rd + " చదివారు") + (s.q.length ? " · " + x(s.q.length + " questions", s.q.length + " ప్రశ్నలు") : " · " + x("unlimited questions", "అపరిమిత ప్రశ్నలు")) + "</div></div></a>";
    });
    return h;
  }
  function vSubject(id) {
    var s = SUBJ[id]; if (!s) return vLearn();
    var h = '<a class="small muted" href="#/learn">← ' + x("All subjects", "అన్ని సబ్జెక్టులు") + '</a><div class="row" style="margin:8px 0 14px"><div class="ico">' + s.icon + '</div><div class="grow"><h1>' + esc(tr(s.name)) + '</h1><div class="small muted">' + esc(tr(s.sub)) + "</div></div></div>";
    h += '<div class="btns" style="margin-bottom:14px"><button class="btn pri" data-act="quick" data-id="' + id + '">' + x("Quick test · 10 questions", "క్విక్ టెస్ట్ · 10 ప్రశ్నలు") + "</button>" + (s.q.length ? '<button class="btn" data-act="cards" data-id="' + id + '">' + x("Flashcards", "ఫ్లాష్‌కార్డులు") + "</button>" : "") + "</div><div class=\"card\">";
    s.topics.forEach(function (t) { var st = S.st[t.id]; h += '<a class="topic" href="#/topic/' + t.id + '"><span class="tick' + (S.read[t.id] ? " on" : "") + '">✓</span><div class="grow"><b>' + (t.icon ? t.icon + " " : "") + esc(tr(t.t)) + '</b><div class="small muted">' + (st ? x(st[0] + " answered · " + pct(st[1], st[0]) + "% correct", st[0] + " జవాబులు · " + pct(st[1], st[0]) + "% సరైనవి") : x("Not practised yet", "ఇంకా అభ్యాసం చేయలేదు")) + '</div></div><span class="muted">›</span></a>'; });
    return h + "</div>";
  }
  function vTopic(id) {
    var T = TOPIC[id]; if (!T) return vLearn();
    var s = SUBJ[T.subj], t = T.t, gen = T.subj === "mental", n = BANK.filter(function (q) { return q.topic === id; }).length, prev = s.topics[T.i - 1], next = s.topics[T.i + 1];
    var h = '<a class="small muted" href="#/subject/' + s.id + '">← ' + esc(tr(s.name)) + '</a><h1 style="margin:8px 0 12px">' + esc(tr(t.t)) + "</h1>";
    h += '<div class="card"><span class="eyebrow">' + (gen ? x("How to solve", "ఎలా చేయాలి") : x("Key points", "ముఖ్యాంశాలు")) + '</span><ol class="notes">' + t.p.map(function (p) { return "<li>" + esc(tr(p)) + "</li>"; }).join("") + "</ol></div>";
    h += '<div class="btns" style="margin-bottom:14px"><button class="btn' + (S.read[id] ? "" : " pri") + '" data-act="read" data-id="' + id + '">' + (S.read[id] ? "✓ " + x("Read", "చదివారు") : x("Mark as read · +15 XP", "చదివినట్లు గుర్తించు · +15 XP")) + '</button><button class="btn' + (S.read[id] ? " pri" : "") + '" data-act="' + (gen ? "lab" : "ttest") + '" data-id="' + (gen ? t.key : id) + '">' + (gen ? x("Practise 10 questions", "10 ప్రశ్నలు అభ్యసించండి") : x("Test this topic · " + n + " questions", "ఈ అంశంపై పరీక్ష · " + n + " ప్రశ్నలు")) + "</button></div>";
    h += '<div class="btns end">' + (prev ? '<a class="btn ghost" href="#/topic/' + prev.id + '">← ' + esc(tr(prev.t)) + "</a>" : "<span></span>") + (next ? '<a class="btn ghost" href="#/topic/' + next.id + '">' + esc(tr(next.t)) + " →</a>" : "") + "</div>";
    return h;
  }
  function vTests() {
    var mis = mistakes().length, mk = marked().length, h = '<span class="eyebrow">' + x("Exam hall", "పరీక్ష హాల్") + "</span><h1>" + x("Tests", "పరీక్షలు") + "</h1>";
    if (X) h += '<a class="card tap gold row" href="#/test" style="margin-top:12px"><div class="grow"><b>' + x("Test in progress", "పరీక్ష కొనసాగుతోంది") + '</b><div class="small muted">' + esc(X.name) + '</div></div><span class="btn pri">' + x("Resume", "కొనసాగించు") + "</span></a>";
    h += sec(x("Mock tests", "మాక్ టెస్టులు"), '<span class="tag">' + x("⅓ negative marking", "⅓ నెగటివ్ మార్కింగ్") + "</span>");
    mockList().forEach(function (m) { h += '<div class="card' + (m.gold ? " gold" : "") + '"><span class="eyebrow">' + m.meta + "</span><h3>" + m.name + '</h3><p class="small muted" style="margin:4px 0 12px">' + m.desc + '</p><button class="btn pri" data-act="mock" data-id="' + m.id + '">' + x("Start test", "పరీక్ష మొదలుపెట్టు") + "</button></div>"; });
    h += sec(x("Quick practice", "క్విక్ అభ్యాసం"), '<span class="tag">' + x("answer shown at once", "వెంటనే జవాబు") + "</span>") + '<div class="card"><p class="small muted" style="margin-bottom:10px">' + x("10 questions, no timer. The explanation appears as soon as you answer.", "10 ప్రశ్నలు, టైమర్ లేదు. జవాబు ఇచ్చిన వెంటనే వివరణ కనిపిస్తుంది.") + '</p><div class="chips" style="margin:0"><button class="chip on" data-act="quick" data-id="mix">' + x("Mixed", "మిశ్రమం") + "</button>" + SUBJECTS.map(function (s) { return '<button class="chip" data-act="quick" data-id="' + s.id + '">' + s.icon + " " + esc(tr(s.name)) + "</button>"; }).join("") + "</div></div>";
    h += sec(x("Mental ability lab", "మానసిక సామర్థ్య ల్యాబ్"), '<span class="tag">' + x("new questions every time", "ప్రతిసారీ కొత్త ప్రశ్నలు") + "</span>") + '<div class="grid">' + GEN.topics.map(function (t) { return '<button class="card tap" data-act="lab" data-id="' + t.key + '" style="text-align:left"><div class="row"><div class="ico">' + t.icon + '</div><div class="grow"><b>' + esc(tr(t.t)) + '</b><div class="small muted">' + x("10 questions", "10 ప్రశ్నలు") + "</div></div></div></button>"; }).join("") + "</div>";
    h += sec(x("Your notebook", "మీ నోట్‌బుక్")) + '<div class="grid"><button class="card tap" data-act="mistakes" style="text-align:left"><h3>' + x("Mistake notebook", "తప్పుల నోట్‌బుక్") + '</h3><p class="small muted">' + x(mis + " questions you last got wrong", "మీరు చివరిసారి తప్పు చేసిన " + mis + " ప్రశ్నలు") + '</p></button><button class="card tap" data-act="marked" style="text-align:left"><h3>★ ' + x("Bookmarks", "బుక్‌మార్కులు") + '</h3><p class="small muted">' + x(mk + " saved questions", mk + " సేవ్ చేసిన ప్రశ్నలు") + "</p></button></div>";
    return h;
  }
  var F = null, ERA = "all";
  function vRevise() {
    var h = '<span class="eyebrow">' + x("Fast revision", "వేగవంతమైన పునశ్చరణ") + "</span><h1>" + x("Revise", "పునశ్చరణ") + "</h1>";
    h += sec(x("Flashcard sprint", "ఫ్లాష్‌కార్డ్ స్ప్రింట్")) + '<div class="card"><p class="small muted" style="margin-bottom:10px">' + x("10 cards. Say the answer in your mind, then tap the card to check.", "10 కార్డులు. జవాబు మనసులో అనుకుని, కార్డును నొక్కి సరిచూసుకోండి.") + '</p><div class="chips" style="margin:0"><button class="chip on" data-act="cards" data-id="mix">' + x("All subjects", "అన్ని సబ్జెక్టులు") + "</button>" + D.subjects.map(function (s) { return '<button class="chip" data-act="cards" data-id="' + s.id + '">' + s.icon + " " + esc(tr(s.name)) + "</button>"; }).join("") + "</div></div>";
    h += '<div class="grid"><a class="card tap" href="#/stories"><span class="eyebrow">' + x("Economy", "ఆర్థిక వ్యవస్థ") + "</span><h3>" + x("Story cards", "కథా కార్డులు") + '</h3><p class="small muted">' + x(D.glossary.length + " terms explained with everyday examples", D.glossary.length + " పదాలు రోజువారీ ఉదాహరణలతో") + '</p></a><a class="card tap" href="#/timeline"><span class="eyebrow">' + x("History", "చరిత్ర") + "</span><h3>" + x("Timeline", "కాలరేఖ") + '</h3><p class="small muted">' + x(D.timeline.length + " events from the Indus Valley to 2014", "సింధు నాగరికత నుండి 2014 వరకు " + D.timeline.length + " సంఘటనలు") + "</p></a></div>";
    return h;
  }
  function vCards() {
    if (!F) { location.hash = "#/revise"; return ""; }
    if (F.i >= F.cards.length) return '<div class="card hero"><span class="eyebrow">' + x("Sprint finished", "స్ప్రింట్ పూర్తయింది") + '</span><div class="score">' + F.known + " / " + F.cards.length + '</div><p class="it">' + x("cards you knew", "మీకు తెలిసిన కార్డులు") + '</p></div><div class="btns"><button class="btn pri" data-act="cards" data-id="' + F.id + '">' + x("Another sprint", "మరో స్ప్రింట్") + '</button><a class="btn" href="#/revise">' + x("Back", "వెనక్కి") + "</a></div>";
    var c = F.cards[F.i];
    return '<div class="row" style="margin-bottom:10px"><b class="grow">' + x("Card", "కార్డు") + " " + (F.i + 1) + " / " + F.cards.length + '</b><span class="tag">' + esc(tr(SUBJ[c.subj].name)) + "</span></div>" + bar(pct(F.i, F.cards.length)) +
      '<div class="card flash gold" data-act="flip" style="margin-top:12px" tabindex="0" role="button">' + (F.flip ? '<div class="side">' + x("Answer", "జవాబు") + '</div><div class="big">' + esc(tr(c.o[0])) + '</div><p class="muted" style="margin-top:10px">' + esc(tr(c.ex)) + "</p>" : '<div class="side">' + x("Question", "ప్రశ్న") + '</div><div class="big q" style="margin:0">' + esc(tr(c.q)) + '</div><p class="small muted" style="margin-top:14px">' + x("Tap to see the answer", "జవాబు కోసం నొక్కండి") + "</p>") + "</div>" +
      (F.flip ? '<div class="btns end"><button class="btn" data-act="fagain">' + x("Didn't know", "తెలియదు") + '</button><button class="btn pri" data-act="fknow">' + x("Knew it · +3 XP", "తెలుసు · +3 XP") + "</button></div>" : "");
  }
  function vStories() {
    return '<a class="small muted" href="#/revise">← ' + x("Revise", "పునశ్చరణ") + '</a><h1 style="margin:8px 0 4px">' + x("Economy story cards", "ఆర్థిక వ్యవస్థ కథా కార్డులు") + '</h1><p class="muted" style="margin-bottom:14px">' + x("Each term with its meaning and a small story to remember it.", "ప్రతి పదానికి అర్థం, గుర్తుంచుకోవడానికి ఒక చిన్న కథ.") + "</p>" +
      D.glossary.map(function (g) { return '<details class="story"><summary>' + esc(g[L]) + '</summary><div class="in"><p>' + esc(g[2 + L]) + '</p><div class="storybox"><b class="eyebrow">' + x("Story", "కథ") + "</b><p>" + esc(g[4 + L]) + "</p></div></div></details>"; }).join("");
  }
  function vTimeline() {
    var h = '<a class="small muted" href="#/revise">← ' + x("Revise", "పునశ్చరణ") + '</a><h1 style="margin:8px 0 12px">' + x("History timeline", "చరిత్ర కాలరేఖ") + '</h1><div class="chips"><button class="chip' + (ERA === "all" ? " on" : "") + '" data-act="era" data-id="all">' + x("All", "అన్నీ") + "</button>" + D.eras.map(function (e) { return '<button class="chip' + (ERA === e[0] ? " on" : "") + '" data-act="era" data-id="' + e[0] + '">' + esc(e[1 + L]) + "</button>"; }).join("") + '</div><div class="card"><ul class="tl">';
    D.timeline.forEach(function (e) { if (ERA === "all" || ERA === e[2]) h += "<li><b>" + esc(e[0]) + "</b>" + esc(e[3 + L]) + "</li>"; });
    return h + "</ul></div>";
  }
  function vProgress() {
    var all = allStat(), lv = level(), into = S.xp % 300, h = '<span class="eyebrow">' + x("Your record", "మీ రికార్డు") + "</span><h1>" + x("Progress", "ప్రగతి") + "</h1>";
    h += '<div class="card" style="margin-top:12px"><div class="row"><div class="grow"><b>' + x("Level ", "స్థాయి ") + lv + '</b><div class="small muted">' + x(S.xp + " XP · " + (300 - into) + " XP to the next level", S.xp + " XP · తర్వాతి స్థాయికి " + (300 - into) + " XP") + '</div></div><span class="tag good">' + x(streak() + "-day streak", streak() + " రోజుల స్ట్రీక్") + '</span></div><div style="margin-top:10px">' + bar(pct(into, 300)) + '</div><div class="stats"><div class="stat"><b>' + all[0] + "</b><span>" + x("Answered", "జవాబులు") + '</span></div><div class="stat"><b>' + pct(all[1], all[0]) + "%</b><span>" + x("Accuracy", "ఖచ్చితత్వం") + '</span></div><div class="stat"><b>' + Object.keys(S.read).length + "</b><span>" + x("Topics read", "చదివిన అంశాలు") + '</span></div><div class="stat"><b>' + S.tests.length + "</b><span>" + x("Tests", "పరీక్షలు") + "</span></div></div></div>";
    h += sec(x("Subject accuracy", "సబ్జెక్టుల వారీ ఖచ్చితత్వం")) + '<div class="card">';
    SUBJECTS.forEach(function (s) { var st = subjStat(s.id), p = pct(st[1], st[0]); h += '<div style="padding:8px 0"><div class="row small"><b class="grow">' + s.icon + " " + esc(tr(s.name)) + "</b><span>" + (st[0] ? p + "% · " + st[0] + x(" answered", " జవాబులు") : "—") + "</span></div>" + bar(p) + "</div>"; });
    h += "</div>";
    var weak = Object.keys(S.st).filter(function (k) { return S.st[k][0] >= 3 && TOPIC[k]; }).map(function (k) { return [k, S.st[k][1] / S.st[k][0]]; }).sort(function (a, b) { return a[1] - b[1]; }).filter(function (w) { return w[1] < 0.7; }).slice(0, 5);
    h += sec(x("Topics to strengthen", "మెరుగుపరచుకోవాల్సిన అంశాలు")) + '<div class="card">' + (weak.length ? weak.map(function (w) { var T = TOPIC[w[0]]; return '<a class="topic" href="#/topic/' + w[0] + '"><div class="grow"><b>' + esc(tr(T.t.t)) + '</b><div class="small muted">' + esc(tr(SUBJ[T.subj].name)) + '</div></div><span class="tag bad">' + Math.round(w[1] * 100) + "%</span></a>"; }).join("") : '<p class="muted">' + x("Nothing weak yet. Topics below 70% after 3 or more answers will show here.", "ప్రస్తుతానికి బలహీన అంశాలు లేవు. 3 లేదా అంతకంటే ఎక్కువ జవాబుల తర్వాత 70% కంటే తక్కువ ఉన్న అంశాలు ఇక్కడ కనిపిస్తాయి.") + "</p>") + "</div>";
    h += sec(x("Study heatmap", "అధ్యయన హీట్‌మ్యాప్")) + '<div class="card">' + heat(20) + "</div>";
    h += sec(x("Recent tests", "ఇటీవలి పరీక్షలు")) + '<div class="card scroll">' + (S.tests.length ? "<table><tr><th>" + x("Test", "పరీక్ష") + "</th><th>" + x("Date", "తేదీ") + "</th><th>✓</th><th>✗</th><th>" + x("Marks", "మార్కులు") + "</th></tr>" + S.tests.slice(0, 12).map(function (t) { var d = new Date(t.d); return "<tr><td>" + esc(t.name) + "</td><td>" + d.getDate() + "/" + (d.getMonth() + 1) + "</td><td>" + t.c + "</td><td>" + t.w + "</td><td>" + t.s + "/" + t.n + "</td></tr>"; }).join("") + "</table>" : '<p class="muted">' + x("No tests yet.", "ఇంకా పరీక్షలు రాయలేదు.") + "</p>") + "</div>";
    h += sec(x("Settings", "సెట్టింగులు")) + '<div class="card"><div class="set"><span>' + x("Daily goal (questions)", "రోజువారీ లక్ష్యం (ప్రశ్నలు)") + '</span><select data-chg="goal">' + [10, 20, 30, 50, 100].map(function (g) { return "<option" + (S.goal === g ? " selected" : "") + ">" + g + "</option>"; }).join("") + '</select></div><div class="set"><span>' + x("Exam date (for the countdown)", "పరీక్ష తేదీ (కౌంట్‌డౌన్ కోసం)") + '</span><input type="date" data-chg="exam" value="' + esc(S.exam) + '"></div>' +
      '<div class="set"><span>' + x("Backup: save your progress as a file, or bring it to another phone", "బ్యాకప్: మీ ప్రగతిని ఫైల్‌గా సేవ్ చేయండి లేదా మరో ఫోన్‌కు తీసుకెళ్లండి") + '</span><span class="btns"><button class="btn" data-act="export">' + x("Download backup", "బ్యాకప్ డౌన్‌లోడ్") + '</button><button class="btn" data-act="import">' + x("Restore", "పునరుద్ధరించు") + '</button></span></div><div class="set"><span>' + x("Erase all progress on this device", "ఈ పరికరంలోని ప్రగతి అంతా తొలగించు") + '</span><button class="btn bad" data-act="reset">' + x("Reset", "రీసెట్") + '</button></div></div><input type="file" id="importFile" accept="application/json,.json" hidden>';
    h += '<p class="small muted center">' + x("Your progress is stored only in this browser. Nothing is sent to any server.", "మీ ప్రగతి ఈ బ్రౌజర్‌లో మాత్రమే నిల్వ ఉంటుంది. ఏ సర్వర్‌కూ ఏమీ పంపబడదు.") + "</p>";
    return h;
  }

  /* ---------- router ---------- */
  var VIEWS = { home: vHome, learn: vLearn, subject: vSubject, topic: vTopic, tests: vTests, test: vTest, result: vResult, revise: vRevise, cards: vCards, stories: vStories, timeline: vTimeline, progress: vProgress };
  var TABOF = { home: "home", learn: "learn", subject: "learn", topic: "learn", tests: "tests", test: "tests", result: "tests", revise: "revise", cards: "revise", stories: "revise", timeline: "revise", progress: "progress" };
  function route(keepScroll) {
    var parts = (location.hash || "#/home").replace(/^#\/?/, "").split("/"), page = VIEWS[parts[0]] ? parts[0] : "home";
    CUR = page;
    document.body.classList.toggle("testing", page === "test");
    document.body.classList.toggle("te", !!L);
    document.documentElement.lang = L ? "te" : "en";
    $("app").innerHTML = VIEWS[page](parts[1]);
    var tabs = [["home", x("Home", "హోమ్")], ["learn", x("Learn", "నేర్చుకో")], ["tests", x("Tests", "పరీక్షలు")], ["revise", x("Revise", "పునశ్చరణ")], ["progress", x("Progress", "ప్రగతి")]];
    $("tabs").innerHTML = tabs.map(function (t) { return '<a href="#/' + t[0] + '"' + (TABOF[page] === t[0] ? ' class="on" aria-current="page"' : "") + '><svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[t[0]] + "</svg>" + t[1] + "</a>"; }).join("");
    $("langBtn").textContent = L ? "English" : "తెలుగు";
    $("themeBtn").textContent = S.theme === "dark" ? "☀" : "☾";
    if (!keepScroll) window.scrollTo(0, 0);
  }

  /* ---------- actions ---------- */
  var ACT = {
    yes: function () { var f = onYes; closeModal(); if (f) f(); },
    no: closeModal,
    pick: function (d) { if (!X) return; var it = X.items[X.i]; if (X.instant && it.pick >= 0) return; it.pick = +d.k; if (X.instant) record(it); route(true); },
    next: function () { if (X && X.i < X.items.length - 1) { X.i++; route(); } },
    prev: function () { if (X && X.i) { X.i--; route(); } },
    goto: function (d) { if (X) { X.i = +d.i; X.pal = false; route(); } },
    flag: function () { if (X) { X.items[X.i].flag = !X.items[X.i].flag; route(true); } },
    clear: function () { if (X) { X.items[X.i].pick = -1; route(true); } },
    pal: function () { if (X) { X.pal = !X.pal; route(true); if (X.pal) window.scrollTo(0, document.body.scrollHeight); } },
    submitNow: finish,
    submit: function () { var left = X.items.filter(function (q) { return q.pick < 0; }).length; modal(x("Submit the test?", "పరీక్ష సమర్పించాలా?"), "<p>" + (left ? x(left + " questions are not answered.", left + " ప్రశ్నలకు జవాబు ఇవ్వలేదు.") : x("All questions are answered.", "అన్ని ప్రశ్నలకు జవాబు ఇచ్చారు.")) + "</p>", x("Submit", "సమర్పించు"), finish, x("Keep going", "కొనసాగించు")); },
    quit: function () { var done = X.items.some(function (q) { return q.pick >= 0; }); if (X.instant) { if (done) finish(); else { X = null; location.hash = "#/tests"; } return; } modal(x("Leave this test?", "ఈ పరీక్ష వదిలేయాలా?"), "<p>" + x("Your answers in this test will not be saved.", "ఈ పరీక్షలో మీ జవాబులు సేవ్ కావు.") + "</p>", x("Leave", "వదిలేయి"), function () { X = null; clearInterval(timerId); location.hash = "#/tests"; }, x("Stay", "ఉండు")); },
    mark: function (d) { if (S.marks[d.id]) delete S.marks[d.id]; else S.marks[d.id] = 1; save(); route(true); },
    rfilter: function (d) { RES.filter = d.f; route(true); },
    retry: function () { startTest({ name: x("Missed questions", "తప్పిన ప్రశ్నలు"), items: RES.items.filter(function (q) { return q.pick !== q.ans; }).map(function (q) { return q.src; }), instant: true }); },
    mock: function (d) { var m = mockList().filter(function (z) { return z.id === d.id; })[0]; modal(m.name, "<p>" + m.meta + "</p><p class=\"small muted\" style=\"margin-top:6px\">" + m.desc + "</p><p class=\"small\" style=\"margin-top:10px\">" + x("Each correct answer: +1. Each wrong answer: −⅓. Unanswered: 0. The test submits itself when the time ends.", "ప్రతి సరైన జవాబుకు +1. ప్రతి తప్పు జవాబుకు −⅓. జవాబివ్వని వాటికి 0. సమయం ముగియగానే పరీక్ష దానంతట అదే సమర్పించబడుతుంది.") + "</p>", x("Start now", "ఇప్పుడే మొదలుపెట్టు"), function () { startTest({ name: m.name, items: m.build(), mins: m.mins, neg: true }); }); },
    quick: function (d) { var id = d.id || "mix", items = id === "mental" ? gens(10) : id === "mix" ? shuffle(shuffle(BANK).slice(0, 8).concat(gens(2))) : take(id, 10); startTest({ name: id === "mix" ? x("Mixed quick test", "మిశ్రమ క్విక్ టెస్ట్") : x("Quick test: ", "క్విక్ టెస్ట్: ") + tr(SUBJ[id].name), items: items, instant: true }); },
    ttest: function (d) { startTest({ name: tr(TOPIC[d.id].t.t), items: take(TOPIC[d.id].subj, 99, d.id), instant: true }); },
    lab: function (d) { var t = GEN.topics.filter(function (z) { return z.key === d.id; })[0]; startTest({ name: t ? tr(t.t) : tr(MENTAL.name), items: gens(10, d.id || null), instant: true }); },
    mistakes: function () { startTest({ name: x("Mistake notebook", "తప్పుల నోట్‌బుక్"), items: shuffle(mistakes()).slice(0, 20), instant: true }); },
    marked: function () { startTest({ name: x("Bookmarks", "బుక్‌మార్కులు"), items: shuffle(marked()).slice(0, 30), instant: true }); },
    read: function (d) { if (!S.read[d.id]) { S.read[d.id] = 1; S.xp += 15; save(); toast("+15 XP"); } route(true); },
    cards: function (d) { var id = d.id || "mix", pool = id === "mix" ? BANK : BANK.filter(function (q) { return q.subj === id; }); F = { id: id, cards: shuffle(pool).slice(0, 10), i: 0, known: 0, flip: false }; if (location.hash === "#/cards") route(); else location.hash = "#/cards"; },
    flip: function () { if (F) { F.flip = !F.flip; route(true); } },
    fknow: function () { F.known++; F.i++; F.flip = false; S.xp += 3; save(); route(true); },
    fagain: function () { F.i++; F.flip = false; S.xp += 1; save(); route(true); },
    era: function (d) { ERA = d.id; route(true); },
    export: function () { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: "application/json" })); a.download = "appsc-group2-progress-" + today() + ".json"; document.body.appendChild(a); a.click(); a.remove(); toast(x("Backup downloaded", "బ్యాకప్ డౌన్‌లోడ్ అయింది")); },
    import: function () { $("importFile").click(); },
    reset: function () { modal(x("Erase all progress?", "ప్రగతి అంతా తొలగించాలా?"), "<p>" + x("XP, streak, test history and bookmarks on this device will be removed. This cannot be undone.", "ఈ పరికరంలోని XP, స్ట్రీక్, పరీక్షల చరిత్ర, బుక్‌మార్కులు తొలగిపోతాయి. దీన్ని వెనక్కి తీసుకోలేరు.") + "</p>", x("Erase", "తొలగించు"), function () { var keep = { lang: S.lang, theme: S.theme }; S = fresh(); S.lang = keep.lang; S.theme = keep.theme; save(); route(); }); }
  };
  document.addEventListener("click", function (e) { var el = e.target.closest("[data-act]"); if (!el || el.disabled) return; var f = ACT[el.dataset.act]; if (f) { e.preventDefault(); f(el.dataset); } });
  document.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target.dataset && e.target.dataset.act === "flip") { e.preventDefault(); ACT.flip(); } if (e.key === "Escape") closeModal(); });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.dataset.chg === "goal") { S.goal = +t.value; save(); }
    if (t.dataset.chg === "exam") { S.exam = t.value; save(); }
    if (t.id === "importFile" && t.files[0]) { var r = new FileReader(); r.onload = function () { try { var j = JSON.parse(r.result); if (!j || typeof j.xp !== "number" || !j.st) throw 0; localStorage.setItem(KEY, JSON.stringify(j)); S = load(); L = S.lang === "te" ? 1 : 0; applyTheme(); route(); toast(x("Progress restored", "ప్రగతి పునరుద్ధరించబడింది")); } catch (err) { toast(x("That file is not a backup from this app.", "ఆ ఫైల్ ఈ యాప్ బ్యాకప్ కాదు.")); } }; r.readAsText(t.files[0]); }
  });
  function applyTheme() { if (S.theme === "dark") document.documentElement.setAttribute("data-theme", "dark"); else document.documentElement.removeAttribute("data-theme"); }
  $("langBtn").addEventListener("click", function () { S.lang = L ? "en" : "te"; L = L ? 0 : 1; save(); route(true); });
  $("themeBtn").addEventListener("click", function () { S.theme = S.theme === "dark" ? "light" : "dark"; save(); applyTheme(); route(true); });
  window.addEventListener("hashchange", function () { route(); });
  window.addEventListener("beforeunload", function (e) { if (X && !X.instant) { e.preventDefault(); e.returnValue = ""; } });
  applyTheme(); route();
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("sw.js").catch(function () {});
})();
