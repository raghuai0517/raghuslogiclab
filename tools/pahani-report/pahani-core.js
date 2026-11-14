/*
  Pahani / Adangal Village Report — core logic (no DOM).
  © RLL – RaghusLogicLab. All rights reserved.

  rowsToModel(rows)  : array of string rows (first matching header row is found automatically) -> model
  buildSpec(model, meta) : model -> report spec (sheets -> blocks), used by both the Excel and the PDF writers
  writeExcel(ExcelJS, spec, meta) : -> Promise<ArrayBuffer>
*/
(function (root) {
  "use strict";

  /* ---------------- Dictionaries (Telugu <-> English) ---------------- */
  var NATURE = {
    "పట్టా": ["Patta (Private)", "పట్టా", "Patta", "PVT"],
    "ప్రభుత్వము": ["Government", "ప్రభుత్వము", "Government", "GOVT"],
    "ప్రభుత్వం": ["Government", "ప్రభుత్వము", "Government", "GOVT"],
    "ప్రభుత్వ భూమి (govt land)": ["Government Land", "ప్రభుత్వ భూమి", "Govt Land", "GOVT"],
    "ప్రభుత్వ భూమి": ["Government Land", "ప్రభుత్వ భూమి", "Govt Land", "GOVT"],
    "assigned land made freehold in 2023": ["Assigned Land made Freehold (2023)", "2023లో ఫ్రీహోల్డ్ అయిన అసైన్డ్ భూమి", "Assigned Freehold 2023", "ASG"],
    "assigned in the year 2018": ["Assigned Land (2018)", "2018లో అసైన్ చేసిన భూమి", "Assigned 2018", "ASG"],
    "ఇనాం": ["Inam", "ఇనాం", "Inam", "INAM"],
    "village service inam made freehold in 2023": ["Village Service Inam made Freehold (2023)", "2023లో ఫ్రీహోల్డ్ అయిన గ్రామ సేవా ఇనాం", "VSI Freehold 2023", "INAM"],
    "": ["Not recorded", "నమోదు కాలేదు", "Not Recorded", "NR"]
  };
  var GROUPS = {
    PVT: ["Private – Patta", "ప్రైవేటు – పట్టా"],
    ASG: ["Assigned lands", "అసైన్డ్ భూములు"],
    INAM: ["Inam lands", "ఇనాం భూములు"],
    GOVT: ["Government lands", "ప్రభుత్వ భూములు"],
    NR: ["Not recorded", "నమోదు కాలేదు"]
  };
  var CLASS = {
    "మాగాణి": ["Wet", "WET"], "మెట్ట": ["Dry", "DRY"],
    "అనాదీనం": ["Anadheenam (Govt)", "GOVT"],
    "కాలువ పోరంబోకు": ["Canal Poramboke", "POR"], "బండి పోరంబోకు": ["Cart-track Poramboke", "POR"],
    "రహదారి పోరంబోకు": ["Road Poramboke", "POR"], "రోడ్డు పోరంబోకు": ["Road Poramboke", "POR"],
    "శిస్తు కట్టిన గయాళు (assessed-waste)": ["Assessed Waste (Gayalu)", "GOVT"],
    "రయిల్వే పోరంబోకు": ["Railway Poramboke", "POR"], "రైల్వే పోరంబోకు": ["Railway Poramboke", "POR"],
    "గ్రామనత్తం పోరంబోకు": ["Gramanatham Poramboke", "POR"],
    "చెరువు పోరంబోకు": ["Tank Poramboke", "POR"], "అడవి పోరంబోకు": ["Forest Poramboke", "POR"],
    "గుంట పోరంబోకు": ["Pond (Gunta) Poramboke", "POR"], "శ్మశాన పోరంబోకు": ["Burial-ground Poramboke", "POR"],
    "పోరంబోకు": ["Poramboke", "POR"], "k.p.రోడ్డు": ["K.P. Road", "POR"],
    "సీలింగు భూమి": ["Ceiling Surplus Land", "GOVT"], "ప్రభుత్వం": ["Government", "GOVT"],
    "దారి పోరంబోకు": ["Path Poramboke", "POR"], "నది పోరంబోకు": ["River Poramboke", "POR"],
    "మేత పోరంబోకు": ["Grazing Poramboke", "POR"], "కుంట పోరంబోకు": ["Pond (Kunta) Poramboke", "POR"],
    "": ["Not recorded", "NR"]
  };
  var WATER = {
    "చెరువు": ["Tank", "చెరువు"], "వర్షాధారం": ["Rain-fed", "వర్షాధారం"], "వర్షాదారం": ["Rain-fed", "వర్షాధారం"],
    "గుంట": ["Pond", "గుంట"], "కుంట": ["Pond", "కుంట"], "చి.చెరువు": ["Small tank", "చి.చెరువు"],
    "పె.చెరువు": ["Big tank", "పె.చెరువు"], "కాలువ": ["Canal", "కాలువ"], "బోరు": ["Bore well", "బోరు"],
    "బావి": ["Well", "బావి"], "": ["Not recorded", "నమోదు కాలేదు"]
  };
  var ENJ = {
    "స్వంతం": "Own", "rsd కొనుగోలు": "Purchase (RSD)", "వారసత్వం": "Inheritance",
    "assigned land made freehold in 2023": "Freehold 2023", "శెటిల్మెంటు": "Settlement",
    "సెటిల్ మెంటు": "Settlement", "కాలువ": "Canal", "కొనుగోలు": "Purchase", "దరఖాస్తు": "Application",
    "అనాదీనం": "Anadheenam", "assigned in the year 2018": "Assigned 2018", "బహుమతి": "Gift", "బండిదారి": "Cart track",
    "nh-5": "NH-5", "సి.జే.ఎఫ్.యస్": "CJFS society",
    "అసైన్మెంట్ ల్యాండ్ / dkt పట్టా": "DKT Patta", "చెరువు": "Tank", "రైల్వే": "Railway",
    "దేవాలయ భూములు": "Temple land", "పరిశ్రమలు": "Industries", "గ్రామ నత్తము": "Gramanatham",
    "శ్మశాన భూమి": "Burial ground", "village service inam made freehold in 2023": "VSI Freehold 2023",
    "సీలింగు": "Ceiling surplus", "ఇళ్లు": "House sites", "గుంట": "Pond (Gunta)", "గ్రామ కంటము": "Gramakantam",
    "రోడ్డు పోరంబోకు": "Road Poramboke", "చెరువు కట్ట": "Tank bund", "పోరంబోకు": "Poramboke", "కాలనీ": "Colony",
    "సాదా బైనామా": "Sada Bainama", "డొంక": "Cart path", "నదీ": "River", "నది": "River",
    "పాలు పంపకం": "Partition", "భాగ పరిష్కారం": "Partition", "దానం": "Gift deed", "కౌలు": "Tenancy",
    "": "Not recorded"
  };
  var TE_EN = { "assigned land made freehold in 2023": "2023లో ఫ్రీహోల్డ్ అయిన అసైన్డ్ భూమి", "assigned in the year 2018": "2018లో అసైన్ చేసిన భూమి",
    "village service inam made freehold in 2023": "2023లో ఫ్రీహోల్డ్ అయిన గ్రామ సేవా ఇనాం", "nh-5": "జాతీయ రహదారి NH-5", "": "నమోదు కాలేదు" };

  function norm(s) { return String(s == null ? "" : s).replace(/&nbsp;?/gi, " ").replace(/ /g, " ").replace(/[​﻿]/g, "").replace(/\s+/g, " ").trim(); }
  function key(s) { var k = norm(s).toLowerCase(); return (k === "unknown" || k === "--" || k === "-" || k === "na" || k === "n/a") ? "" : k; }
  var isTe = function (s) { return /[ఀ-౿]/.test(s); };

  function natureInfo(v) {
    var k = key(v), d = NATURE[k];
    if (!d) {
      var g = /ప్రభుత్వ|govt|government/i.test(k) ? "GOVT" : /assign|అసైన్/i.test(k) ? "ASG" : /inam|ఇనాం|ఈనాం/i.test(k) ? "INAM" : /పట్టా|patta/i.test(k) ? "PVT" : "PVT";
      d = [norm(v), norm(v), norm(v).slice(0, 22), g];
    }
    return { key: k, en: d[0], te: d[1], short: d[2], group: d[3] };
  }
  function classInfo(v) {
    var k = key(v), d = CLASS[k];
    if (!d) d = [norm(v), /పోరంబోకు|poramboke/i.test(k) ? "POR" : "OTH"];
    return { key: k, en: d[0], te: k ? norm(v).replace(/\s*\((assessed-waste)\)/i, "") : "నమోదు కాలేదు", group: d[1] };
  }
  function waterInfo(v) {
    var k = key(v), d = WATER[k];
    if (!d) d = [/గుంట|కుంట/.test(k) ? "Pond – " + norm(v) : /చెరువు/.test(k) ? "Tank – " + norm(v) : norm(v), norm(v)];
    return { key: d[1], en: d[0], te: d[1] };
  }
  function enjInfo(v) {
    var k = key(v), en = ENJ[k];
    if (en == null) en = norm(v);
    var te = isTe(norm(v)) ? norm(v) : (TE_EN[k] || norm(v));
    return { key: k, en: en, te: te };
  }
  function biText(te, en) { return te === en || !en ? te : (te ? te + " / " + en : en); }

  /* ---------------- Column detection ---------------- */
  var COLS = [
    ["enjExt", ["అనుభవ విస్తీర్ణం", "enjoyment extent", "occupant extent"]],
    ["enjNature", ["అనుభవ స్వభావం", "enjoyment nature", "nature of enjoyment"]],
    ["enjoyer", ["అనుభవ దారు", "అనుభవదారు", "enjoyer", "occupant"]],
    ["unc", ["పనికి రాని", "పనికిరాని", "uncultivable", "un cultivable"]],
    ["cult", ["పనికి వచ్చు", "పనికివచ్చు", "cultivable"]],
    ["ayacut", ["ఆయకట్టు", "ayacut"]],
    ["ext", ["పూర్తి విస్తీర్ణం", "total extent", "విస్తీర్ణం", "extent"]],
    ["nature", ["భూమి స్వభావం", "land nature", "nature of land"]],
    ["sist", ["శిస్తు", "assessment", "sist", "tax"]],
    ["cls", ["భూమి వివరణ", "classification", "land description", "land type"]],
    ["water", ["జలాధార", "water source", "water"]],
    ["khata", ["ఖాతా", "khata"]],
    ["pattadar", ["పట్టాదారు", "pattadar"]],
    ["survey", ["సర్వే", "survey"]],
    ["sl", ["వరుస", "క్ర.సం", "sl.no", "sl no", "s.no", "serial"]]
  ];
  function detectHeader(rows) {
    for (var r = 0; r < Math.min(rows.length, 30); r++) {
      var map = {}, hits = 0;
      (rows[r] || []).forEach(function (h, ci) {
        var t = norm(h).toLowerCase();
        if (!t) return;
        for (var i = 0; i < COLS.length; i++) {
          var name = COLS[i][0];
          if (map[name] != null) continue;
          if (COLS[i][1].some(function (kw) { return t.indexOf(kw) > -1; })) { map[name] = ci; hits++; break; }
        }
      });
      if (hits >= 5 && map.survey != null) return { row: r, map: map };
    }
    return null;
  }

  function num(v) {
    var s = norm(v).replace(/,/g, "");
    if (s === "" || s === "-" || s === "--") return null;
    var n = parseFloat(s);
    return isNaN(n) ? null : n;
  }
  function person(v) {
    var lines = String(v == null ? "" : v).split(/\n/).map(norm).filter(Boolean);
    var full = lines.join(" ").replace(/\s+\(/g, " (").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
    var name = (lines[0] || "").replace(/\(.*$/, "").trim();
    return { full: full, name: name, cmp: name.replace(/[\s.\u200c\u200d]/g, "").toLowerCase() };
  }
  var GOVT_WORDS = /ప్రభుత్వ|ప్రభుత|govt|government|అనాదీనం|కాలువ|చెరువు|గుంట|కుంట|బండి|దారి|రహదారి|రోడ్డు|road|highway|నది|నదీ|శ్మశాన|దేవాలయ|గ్రామ కం|నత్త|పోరంబోకు|railway|రైల్వే|రయిల్వే|cjfs|అడవి|forest/i;
  var isGovtKhata = function (k) { return /^2000\d{4}$/.test(k); };

  /* ---------------- Remark rules ---------------- */
  var RULES = {
    over:      { en: "Enjoyment extent more than survey extent", te: "సర్వే విస్తీర్ణం కంటే అనుభవ విస్తీర్ణం ఎక్కువ", by: "VRO + VS",
                 aen: "Check with 1-B / FMB and correct the enjoyment extents", ate: "1-బి / FMB తో సరిచూసి అనుభవ విస్తీర్ణాలు సవరించండి" },
    under:     { en: "Part of survey extent not in any enjoyment entry", te: "సర్వే విస్తీర్ణంలో కొంత భాగం ఏ అనుభవదారు పేరునా లేదు", by: "VRO + VS",
                 aen: "Identify the enjoyer of the balance extent and update Adangal", ate: "మిగిలిన విస్తీర్ణం అనుభవదారును గుర్తించి అడంగల్ నవీకరించండి" },
    tally:     { en: "Cultivable + uncultivable not equal to total extent", te: "సాగుకు పనికివచ్చు + పనికిరాని విస్తీర్ణం మొత్తం విస్తీర్ణానికి సమానం కాదు", by: "VS",
                 aen: "Recheck extents with FMB / RSR", ate: "FMB / RSR తో విస్తీర్ణాలు సరిచూడండి" },
    ayacut:    { en: "Ayacut extent more than survey extent", te: "సర్వే విస్తీర్ణం కంటే ఆయకట్టు ఎక్కువ", by: "VRO + VS",
                 aen: "Correct the ayacut extent", ate: "ఆయకట్టు విస్తీర్ణం సవరించండి" },
    govtpvt:   { en: "Government land recorded in a private person's name", te: "ప్రభుత్వ భూమి ప్రైవేటు వ్యక్తి పేరున నమోదైంది", by: "VRO + VS",
                 aen: "Field inspection; verify assignment orders or encroachment; protect Govt land", ate: "క్షేత్ర పరిశీలన చేసి అసైన్మెంట్ ఉత్తర్వులు / ఆక్రమణ పరిశీలించండి; ప్రభుత్వ భూమిని కాపాడండి" },
    govtapp:   { en: "Government land under application by a private person", te: "ప్రభుత్వ భూమిపై ప్రైవేటు వ్యక్తి దరఖాస్తు", by: "VRO",
                 aen: "Dispose the application as per rules; till then treat as Govt land", ate: "నిబంధనల ప్రకారం దరఖాస్తు పరిష్కరించండి; అప్పటి వరకు ప్రభుత్వ భూమిగానే పరిగణించండి" },
    mutation:  { en: "Pattadar and enjoyer are different", te: "పట్టాదారు, అనుభవదారు వేరు వేరు", by: "VRO",
                 aen: "Verify documents; do mutation or record tenancy (CCRC)", ate: "పత్రాలు పరిశీలించి మ్యుటేషన్ చేయండి లేదా కౌలు (CCRC) నమోదు చేయండి" },
    aadhaar:   { en: "Aadhaar not linked to khata", te: "ఖాతాకు ఆధార్ అనుసంధానం కాలేదు", by: "VRO",
                 aen: "Collect Aadhaar and link it to the khata (e-KYC)", ate: "ఆధార్ సేకరించి ఖాతాకు అనుసంధానం (e-KYC) చేయండి" },
    nilsist:   { en: "Patta land with nil assessment (sist)", te: "పట్టా భూమికి శిస్తు సున్నా", by: "VRO",
                 aen: "Verify the assessment with village accounts", ate: "గ్రామ లెక్కలతో శిస్తు సరిచూడండి" },
    wetnowater:{ en: "Wet land without water source", te: "మాగాణి భూమికి జలాధారం నమోదు కాలేదు", by: "VRO",
                 aen: "Record the water source (tank / canal / bore)", ate: "జలాధారం (చెరువు / కాలువ / బోరు) నమోదు చేయండి" },
    nonature:  { en: "Land nature / classification not recorded", te: "భూమి స్వభావం / వివరణ నమోదు కాలేదు", by: "VRO + VS",
                 aen: "Record land nature and classification as per RSR", ate: "RSR ప్రకారం భూమి స్వభావం, వివరణ నమోదు చేయండి" },
    asg:       { en: "Assigned land (not freehold)", te: "అసైన్డ్ భూమి (ఫ్రీహోల్డ్ కాదు)", by: "VRO", note: true,
                 aen: "Verify assignee is in possession; transfer is prohibited (POT Act)", ate: "అసైనీ స్వాధీనంలో ఉన్నారో పరిశీలించండి; బదిలీ నిషేధం (POT చట్టం)" },
    freehold:  { en: "Assigned / Inam land made freehold (2023)", te: "2023లో ఫ్రీహోల్డ్ అయిన అసైన్డ్ / ఇనాం భూమి", by: "VRO", note: true,
                 aen: "Keep the freehold proceedings on record; check them before mutation", ate: "ఫ్రీహోల్డ్ ఉత్తర్వులు దస్త్రంలో ఉంచి, మ్యుటేషన్ ముందు పరిశీలించండి" },
    inam:      { en: "Inam land", te: "ఇనాం భూమి", by: "VRO", note: true,
                 aen: "Verify Inam / ORC / freehold status", ate: "ఇనాం / ORC / ఫ్రీహోల్డ్ స్థితి పరిశీలించండి" },
    nala:      { en: "Marked as non-agricultural land", te: "వ్యవసాయేతర భూమిగా పేర్కొనబడింది", by: "VRO",
                 aen: "Update classification as non-agricultural (NALA) in Adangal", ate: "అడంగల్ లో వ్యవసాయేతర (NALA) వర్గీకరణ నవీకరించండి" },
    sada:      { en: "Unregistered sale (Sada Bainama)", te: "సాదా బైనామా (రిజిస్టర్ కాని కొనుగోలు)", by: "VRO",
                 aen: "Regularise as per rules", ate: "నిబంధనల ప్రకారం క్రమబద్ధీకరించండి" },
    incomplete:{ en: "Pattadar name / khata details incomplete", te: "పట్టాదారు పేరు / ఖాతా వివరాలు అసంపూర్ణం", by: "VRO",
                 aen: "Correct the pattadar name / khata number in Webland", ate: "వెబ్‌ల్యాండ్ లో పట్టాదారు పేరు / ఖాతా నెంబరు సరిచేయండి" },
    ceiling:   { en: "Ceiling surplus land", te: "సీలింగు మిగులు భూమి", by: "VRO", note: true,
                 aen: "Verify the ceiling surplus allotment and possession", ate: "సీలింగు భూమి కేటాయింపు, స్వాధీనం పరిశీలించండి" },
    temple:    { en: "Temple (Endowment) land", te: "దేవాలయ (దేవాదాయ) భూమి", by: "VRO", note: true,
                 aen: "Verify with Endowments Dept.; prevent alienation", ate: "దేవాదాయ శాఖతో సరిచూడండి; అన్యాక్రాంతం కాకుండా చూడండి" },
    cjfs:      { en: "CJFS society land", te: "సి.జే.ఎఫ్.ఎస్ సంఘ భూమి", by: "VRO", note: true,
                 aen: "Verify CJFS allotment and present enjoyment", ate: "సి.జే.ఎఫ్.ఎస్ కేటాయింపు, ప్రస్తుత అనుభవం పరిశీలించండి" },
    enjnr:     { en: "Enjoyment nature not recorded", te: "అనుభవ స్వభావం నమోదు కాలేదు", by: "VRO",
                 aen: "Record how the enjoyer holds the land", ate: "అనుభవదారు భూమిని ఏ విధంగా పొందారో నమోదు చేయండి" },
    zeroenj:   { en: "Enjoyment extent is zero / blank", te: "అనుభవ విస్తీర్ణం సున్నా / ఖాళీ", by: "VRO",
                 aen: "Enter the correct enjoyment extent", ate: "సరైన అనుభవ విస్తీర్ణం నమోదు చేయండి" }
  };
  var RULE_ORDER = ["govtpvt", "govtapp", "over", "under", "tally", "ayacut", "nonature", "incomplete", "zeroenj", "mutation", "aadhaar",
    "nilsist", "wetnowater", "enjnr", "nala", "sada", "asg", "freehold", "inam", "ceiling", "temple", "cjfs"];
  var EPS = 0.00005;
  var f4 = function (n) { return (Math.round(n * 10000) / 10000).toFixed(4); };

  /* ---------------- rows -> model ---------------- */
  function rowsToModel(rows) {
    var h = detectHeader(rows);
    if (!h) throw new Error("Could not find the Pahani header row (సర్వే నెం, భూమి స్వభావం, ...). Please upload the Adangal / Pahani file downloaded from Webland / MeeBhoomi.");
    var m = h.map, recs = [], last = null;
    var g = function (r, k) { return m[k] == null ? "" : (r[m[k]] == null ? "" : String(r[m[k]])); };
    for (var i = h.row + 1; i < rows.length; i++) {
      var r = rows[i] || [];
      if (!r.some(function (c) { return norm(c); })) continue;
      var survey = norm(g(r, "survey")).replace(/^'+|'+$/g, "").trim();
      var pat = person(g(r, "pattadar")), enj = person(g(r, "enjoyer"));
      var kt = norm(g(r, "khata")).split(/[\s\/|,]+/).filter(Boolean);
      var aad = kt.filter(function (t) { return /^\d{12}$/.test(t); })[0] || "";
      var khata = kt.filter(function (t) { return t !== aad; })[0] || "";
      if (!survey && !pat.full && !enj.full && num(g(r, "enjExt")) == null) continue;
      var contd = !survey && last;
      var rec = {
        sl: norm(g(r, "sl")),
        survey: contd ? last.survey : survey,
        contd: !!contd,
        ext: contd ? null : num(g(r, "ext")), unc: contd ? null : num(g(r, "unc")), cult: contd ? null : num(g(r, "cult")),
        sist: contd ? null : num(g(r, "sist")), ayacut: contd ? null : num(g(r, "ayacut")),
        natureRaw: contd ? last.natureRaw : g(r, "nature"), clsRaw: contd ? last.clsRaw : g(r, "cls"), waterRaw: contd ? last.waterRaw : g(r, "water"),
        khata: khata, aadhaar: aad, pattadar: pat, enjoyer: enj,
        enjExt: num(g(r, "enjExt")), enjRaw: g(r, "enjNature"), rem: []
      };
      rec.nature = natureInfo(rec.natureRaw); rec.cls = classInfo(rec.clsRaw); rec.water = waterInfo(rec.waterRaw); rec.enj = enjInfo(rec.enjRaw);
      rec.govtKhata = isGovtKhata(khata);
      rec.isGovtLand = rec.nature.group === "GOVT" || rec.cls.group === "POR" || rec.cls.group === "GOVT";
      recs.push(rec);
      if (!contd) last = rec;
    }
    if (!recs.length) throw new Error("No land entries found below the header row.");

    /* survey groups */
    var surveys = [], byS = {};
    recs.forEach(function (r) {
      var k = r.contd ? r.survey + "\u0000" + surveys.length : r.survey;
      if (r.contd) { surveys[surveys.length - 1].recs.push(r); r.group = surveys[surveys.length - 1]; return; }
      var s = { survey: r.survey, head: r, recs: [r] }; surveys.push(s); byS[k] = s; r.group = s;
    });

    /* remarks */
    function add(r, id, extra) { r.rem.push({ id: id, extra: extra || null }); }
    surveys.forEach(function (s) {
      var hd = s.head, ext = hd.ext || 0, sum = 0;
      s.recs.forEach(function (r) { sum += r.enjExt || 0; });
      s.enjSum = sum;
      if (sum - ext > EPS) add(hd, "over", { en: "enjoyment " + f4(sum) + " Ac vs extent " + f4(ext) + " Ac (+" + f4(sum - ext) + ")", te: "అనుభవం " + f4(sum) + " ఎ., విస్తీర్ణం " + f4(ext) + " ఎ. (+" + f4(sum - ext) + ")", diff: sum - ext });
      else if (ext - sum > EPS) add(hd, "under", { en: f4(ext - sum) + " Ac unaccounted", te: f4(ext - sum) + " ఎ. లెక్కలో లేదు", diff: ext - sum });
      if (hd.cult != null && hd.unc != null && Math.abs((hd.cult + hd.unc) - ext) > EPS) add(hd, "tally");
      if ((hd.ayacut || 0) - ext > EPS) add(hd, "ayacut");
      if (hd.nature.group === "NR" || !hd.cls.key) add(hd, "nonature");
      if (hd.nature.group === "PVT" && hd.nature.key === "పట్టా" && !(hd.sist > 0)) add(hd, "nilsist");
      if (hd.cls.group === "WET" && !hd.water.key) add(hd, "wetnowater");
    });
    recs.forEach(function (r) {
      var pvtPerson = !r.govtKhata && !GOVT_WORDS.test(r.enjoyer.full + " " + r.pattadar.full);
      var placeholder = !r.khata || /^(\d)\1{4,}$/.test(r.khata) || /^(శ్రీ|sri|shri)?$/i.test(r.pattadar.name.replace(/[\s.]/g, ""));
      if (r.isGovtLand && r.nature.group === "GOVT" && pvtPerson) add(r, /దరఖాస్తు/.test(r.enj.key) ? "govtapp" : "govtpvt");
      if (placeholder) add(r, "incomplete");
      if (!(r.enjExt > 0)) add(r, "zeroenj");
      if (pvtPerson && !r.isGovtLand && r.pattadar.cmp && r.enjoyer.cmp && r.pattadar.cmp !== r.enjoyer.cmp) add(r, "mutation");
      if (pvtPerson && !r.isGovtLand && !r.aadhaar && !placeholder) add(r, "aadhaar");
      if (!r.enj.key) add(r, "enjnr");
      if (/వ్యవసాయేతర|non[\s-]*agri|nala/i.test(r.pattadar.full + " " + r.enjoyer.full)) add(r, "nala");
      if (/సాదా బైనామా|sada/i.test(r.enj.key)) add(r, "sada");
      var nk = r.nature.key;
      if (/freehold/i.test(nk)) add(r, "freehold");
      else if (r.nature.group === "ASG") add(r, "asg");
      else if (r.nature.group === "INAM") add(r, "inam");
      if (/సీలింగు|ceiling/i.test(r.cls.key + " " + r.enj.key)) add(r, "ceiling");
      if (/దేవాలయ|temple|endow/i.test(r.enj.key + " " + r.enjoyer.full)) add(r, "temple");
      if (/సి\.జే\.ఎఫ్|cjfs/i.test(r.enj.key + " " + r.enjoyer.full)) add(r, "cjfs");
    });
    recs.forEach(function (r) {
      var seen = {};
      r.rem = r.rem.filter(function (x) { if (seen[x.id]) return false; seen[x.id] = 1; return true; });
      r.remEn = r.rem.map(function (x) { return RULES[x.id].en + (x.extra ? " (" + x.extra.en + ")" : ""); }).join("; ");
      r.remTe = r.rem.map(function (x) { return RULES[x.id].te + (x.extra ? " (" + x.extra.te + ")" : ""); }).join("; ");
    });
    return { recs: recs, surveys: surveys, header: h };
  }

  /* ---------------- aggregation helpers ---------------- */
  function agg(recs, keyFn, infoFn) {
    var out = [], by = {};
    recs.forEach(function (r) {
      var k = keyFn(r);
      if (!by[k]) { by[k] = { key: k, info: infoFn(r), surveys: {}, n: 0, ext: 0, cult: 0, unc: 0, ayacut: 0, sist: 0, enjExt: 0, recs: [] }; out.push(by[k]); }
      var a = by[k]; a.n++; a.enjExt += r.enjExt || 0; a.recs.push(r);
      if (!r.contd) { a.surveys[r.survey] = 1; a.ext += r.ext || 0; a.cult += r.cult || 0; a.unc += r.unc || 0; a.ayacut += r.ayacut || 0; a.sist += r.sist || 0; }
    });
    out.forEach(function (a) { a.sn = Object.keys(a.surveys).length; });
    return out.sort(function (x, y) { return y.ext - x.ext || y.enjExt - x.enjExt; });
  }
  function maskA(a, mask) { return !a ? "" : mask ? "XXXX XXXX " + a.slice(-4) : a.slice(0, 4) + " " + a.slice(4, 8) + " " + a.slice(8); }

  /* ---------------- model -> spec ---------------- */
  function buildSpec(model, meta) {
    var recs = model.recs, heads = model.surveys.map(function (s) { return s.head; });
    var T = { ext: 0, cult: 0, unc: 0, ayacut: 0, sist: 0, enjExt: 0 };
    heads.forEach(function (r) { T.ext += r.ext || 0; T.cult += r.cult || 0; T.unc += r.unc || 0; T.ayacut += r.ayacut || 0; T.sist += r.sist || 0; });
    recs.forEach(function (r) { T.enjExt += r.enjExt || 0; });
    var pct = function (x) { return T.ext ? x / T.ext : 0; };
    var khatas = {}, pvtKh = {}, govtKh = {}, aadh = {};
    recs.forEach(function (r) { if (!r.khata) return; khatas[r.khata] = 1; (r.govtKhata ? govtKh : pvtKh)[r.khata] = 1; if (r.aadhaar) aadh[r.khata] = 1; });
    var pvtKhN = Object.keys(pvtKh).length, aadN = Object.keys(aadh).filter(function (k) { return pvtKh[k]; }).length;

    var byNature = agg(recs, function (r) { return r.nature.key; }, function (r) { return r.nature; });
    var byGroup = agg(recs, function (r) { return r.nature.group; }, function (r) { return { en: GROUPS[r.nature.group][0], te: GROUPS[r.nature.group][1] }; });
    var byClass = agg(recs, function (r) { return r.cls.key; }, function (r) { return r.cls; });
    var byWater = agg(recs, function (r) { return r.water.key; }, function (r) { return r.water; });
    var byEnj = agg(recs, function (r) { return r.enj.en; }, function (r) { return r.enj; }).sort(function (x, y) { return y.enjExt - x.enjExt; });

    var obs = RULE_ORDER.map(function (id) {
      var n = 0, ext = 0, sv = {};
      recs.forEach(function (r) { r.rem.forEach(function (x) { if (x.id !== id) return; n++; sv[r.survey] = 1; ext += x.extra && x.extra.diff != null ? x.extra.diff : (r.enjExt || 0); }); });
      return { id: id, rule: RULES[id], n: n, sn: Object.keys(sv).length, ext: ext };
    }).filter(function (o) { return o.n; });
    var flagged = recs.filter(function (r) { return r.rem.length; });
    var actionRows = recs.filter(function (r) { return r.rem.some(function (x) { return !RULES[x.id].note; }); });

    var V = meta.village || "Village";
    var sheets = [];
    var info = [["Village", "గ్రామం", V], ["Mandal", "మండలం", meta.mandal || ""], ["District", "జిల్లా", meta.district || ""], ["Report date", "నివేదిక తేదీ", meta.date || ""]];

    /* Summary sheet */
    var natCols = [
      { en: "Sl.No", te: "క్ర.సం", w: 6, f: "int" }, { en: "Land Nature", te: "భూమి స్వభావం (English)", w: 34 }, { en: "భూమి స్వభావం", te: "తెలుగు", w: 30 },
      { en: "Survey Nos", te: "సర్వే నెంబర్లు", w: 11, f: "int" }, { en: "Entries", te: "నమోదులు", w: 10, f: "int" },
      { en: "Total Extent (Ac)", te: "పూర్తి విస్తీర్ణం (ఎ.)", w: 13, f: "ac" }, { en: "Cultivable (Ac)", te: "సాగుకు పనికివచ్చు", w: 13, f: "ac" },
      { en: "Uncultivable (Ac)", te: "సాగుకు పనికిరాని", w: 13, f: "ac" }, { en: "Ayacut (Ac)", te: "ఆయకట్టు", w: 12, f: "ac" },
      { en: "Sist (Rs)", te: "శిస్తు (రూ.)", w: 11, f: "rs" }, { en: "% of village", te: "గ్రామంలో %", w: 10, f: "pct" }
    ];
    function aggRows(list, te) {
      return list.map(function (a, i) { return [i + 1, a.info.en, te ? te(a) : a.info.te, a.sn, a.n, a.ext, a.cult, a.unc, a.ayacut, a.sist, pct(a.ext)]; });
    }
    var totRow = ["", "Total / మొత్తం", "", heads.length, recs.length, T.ext, T.cult, T.unc, T.ayacut, T.sist, T.ext ? 1 : 0];
    var govt = byGroup.filter(function (a) { return a.key === "GOVT"; })[0], pvt = byGroup.filter(function (a) { return a.key === "PVT"; })[0];
    var glance = [
      ["Total survey numbers", "మొత్తం సర్వే నెంబర్లు", heads.length, "int"],
      ["Total entries (rows in Pahani)", "పహాణీలో మొత్తం నమోదులు", recs.length, "int"],
      ["Total extent of village (Acres)", "గ్రామ మొత్తం విస్తీర్ణం (ఎకరాలు)", T.ext, "ac"],
      ["Total extent of village (Hectares)", "గ్రామ మొత్తం విస్తీర్ణం (హెక్టార్లు)", T.ext * 0.4046856, "ac"],
      ["Cultivable extent (Acres)", "సాగుకు పనికివచ్చు విస్తీర్ణం", T.cult, "ac"],
      ["Uncultivable extent (Acres)", "సాగుకు పనికిరాని విస్తీర్ణం", T.unc, "ac"],
      ["Ayacut extent (Acres)", "ఆయకట్టు విస్తీర్ణం", T.ayacut, "ac"],
      ["Total enjoyment extent (Acres)", "మొత్తం అనుభవ విస్తీర్ణం", T.enjExt, "ac"],
      ["Total land revenue / sist (Rs)", "మొత్తం శిస్తు (రూ.)", T.sist, "rs"],
      ["Patta (private) extent (Acres)", "పట్టా భూమి విస్తీర్ణం", pvt ? pvt.ext : 0, "ac"],
      ["Government land extent (Acres)", "ప్రభుత్వ భూమి విస్తీర్ణం", govt ? govt.ext : 0, "ac"],
      ["Total khatas", "మొత్తం ఖాతాలు", Object.keys(khatas).length, "int"],
      ["Private khatas", "ప్రైవేటు ఖాతాలు", pvtKhN, "int"],
      ["Government khatas (2000xxxx)", "ప్రభుత్వ ఖాతాలు (2000xxxx)", Object.keys(govtKh).length, "int"],
      ["Private khatas with Aadhaar linked", "ఆధార్ అనుసంధానమైన ప్రైవేటు ఖాతాలు", aadN + " of " + pvtKhN + (pvtKhN ? " (" + Math.round(aadN * 100 / pvtKhN) + "%)" : ""), "text"],
      ["Entries with remarks (all)", "వ్యాఖ్యలున్న నమోదులు (మొత్తం)", flagged.length, "int"],
      ["Entries needing action (Action List)", "చర్య అవసరమైన నమోదులు (చర్యల జాబితా)", actionRows.length, "int"]
    ];
    var sumBlocks = [
      { type: "kv", title: "A. Village at a glance  |  గ్రామ వివరాలు ఒక చూపులో", rows: glance },
      { type: "table", title: "B. Land Nature-wise Abstract  |  భూమి స్వభావం వారీ సారాంశం", cols: natCols, rows: aggRows(byNature), total: totRow },
      { type: "table", title: "C. Government / Private Abstract  |  ప్రభుత్వ / ప్రైవేటు భూముల సారాంశం", cols: natCols, rows: aggRows(byGroup), total: totRow },
      { type: "table", title: "D. Land Classification-wise Abstract  |  భూమి వివరణ వారీ సారాంశం", cols: natCols.map(function (c, i) { return i === 1 ? { en: "Land Classification", te: "భూమి వివరణ (English)", w: 34 } : i === 2 ? { en: "భూమి వివరణ", te: "తెలుగు", w: 30 } : c; }), rows: aggRows(byClass), total: totRow },
      { type: "table", title: "E. Water Source-wise Abstract  |  జలాధారం వారీ సారాంశం", cols: natCols.map(function (c, i) { return i === 1 ? { en: "Water Source", te: "జలాధారం (English)", w: 34 } : i === 2 ? { en: "జలాధారము", te: "తెలుగు", w: 30 } : c; }), rows: aggRows(byWater), total: totRow },
      { type: "table", title: "F. Enjoyment Nature-wise Abstract  |  అనుభవ స్వభావం వారీ సారాంశం", cols: [natCols[0], { en: "Enjoyment Nature", te: "అనుభవ స్వభావం (English)", w: 34 }, { en: "అనుభవ స్వభావం", te: "తెలుగు", w: 30 },
        { en: "Survey Nos", te: "సర్వే నెంబర్లు", w: 11, f: "int" }, { en: "Entries", te: "నమోదులు", w: 10, f: "int" }, { en: "Enjoyment Extent (Ac)", te: "అనుభవ విస్తీర్ణం (ఎ.)", w: 13, f: "ac" }, { en: "% of enjoyment", te: "అనుభవంలో %", w: 10, f: "pct" }],
        rows: byEnj.map(function (a, i) { return [i + 1, a.info.en, a.info.te, Object.keys(a.recs.reduce(function (o, r) { o[r.survey] = 1; return o; }, {})).length, a.n, a.enjExt, T.enjExt ? a.enjExt / T.enjExt : 0]; }),
        total: ["", "Total / మొత్తం", "", heads.length, recs.length, T.enjExt, 1] },
      { type: "table", title: "G. Observations & Remarks for VRO / VS  |  గ్రా.రె.అ / గ్రామ సర్వేయర్ కొరకు పరిశీలనలు, సూచనలు", wrap: true,
        cols: [natCols[0], { en: "Observation", te: "పరిశీలన (English)", w: 34 }, { en: "పరిశీలన", te: "తెలుగు", w: 30 },
          { en: "Survey Nos", te: "సర్వే నెంబర్లు", w: 11, f: "int" }, { en: "Entries", te: "నమోదులు", w: 10, f: "int" }, { en: "Extent (Ac)", te: "విస్తీర్ణం (ఎ.)", w: 13, f: "ac" },
          { en: "Action by", te: "చర్య ఎవరు", w: 13 }, { en: "Suggested action", te: "సూచించిన చర్య (English)", w: 30 }, { en: "సూచించిన చర్య", te: "తెలుగు", w: 30 }],
        rows: obs.map(function (o, i) { return [i + 1, o.rule.en + (o.rule.note ? " (note)" : ""), o.rule.te + (o.rule.note ? " (గమనిక)" : ""), o.sn, o.n, o.ext, o.rule.by, o.rule.aen, o.rule.ate]; }),
        note: "Extent: for 'more than / not in enjoyment' it is the difference; for others it is the enjoyment extent of the entries. Entries needing action are listed in sheet 'Remarks – Action List'; notes are shown in the Remarks column of each sheet. | విస్తీర్ణం: 'ఎక్కువ / లెక్కలో లేదు' కు తేడా; మిగిలిన వాటికి ఆ నమోదుల అనుభవ విస్తీర్ణం." }
    ];

    /* Detail columns */
    function detCols(withNature) {
      var c = [
        { en: "Sl.No", te: "క్ర.సం", w: 6, pw: 4.2, f: "int" }, { en: "Pahani Sl", s: "Pah. Sl", te: "పహాణీ వరుస", w: 7, pw: 4.8 }, { en: "Survey No", te: "సర్వే నెం", w: 10, pw: 7.2 },
        { en: "Total Extent (Ac)", s: "Total Ext. (Ac)", te: "పూర్తి విస్తీర్ణం", w: 10, pw: 6.2, f: "ac" }, { en: "Uncultivable (Ac)", s: "Uncult. (Ac)", te: "సాగుకు పనికిరాని", w: 10, pw: 6, f: "ac" },
        { en: "Cultivable (Ac)", s: "Cult. (Ac)", te: "సాగుకు పనికివచ్చు", w: 10, pw: 6.2, f: "ac" }, { en: "Sist (Rs)", te: "శిస్తు (రూ.)", w: 8, pw: 5, f: "rs" }
      ];
      if (withNature) c.push({ en: "Land Nature", te: "భూమి స్వభావం", w: 16, pw: 12 });
      return c.concat([
        { en: "Land Classification", s: "Classification", te: "భూమి వివరణ", w: 16, pw: 14.5 }, { en: "Water Source", te: "జలాధారము", w: 12, pw: 11 }, { en: "Ayacut (Ac)", te: "ఆయకట్టు", w: 9, pw: 6, f: "ac" },
        { en: "Khata No", te: "ఖాతా నెం", w: 9, pw: 8.4 }, { en: "Aadhaar", te: "ఆధార్", w: 14, pw: 9 },
        { en: "Pattadar (Father/Husband)", te: "పట్టాదారు (తండ్రి/భర్త)", w: 24, pw: 16 }, { en: "Enjoyer (Father/Husband)", te: "అనుభవదారు (తండ్రి/భర్త)", w: 24, pw: 16 },
        { en: "Enjoyment Extent (Ac)", s: "Enjoy. Ext. (Ac)", te: "అనుభవ విస్తీర్ణం", w: 10, pw: 6.2, f: "ac" }, { en: "Enjoyment Nature", s: "Enjoy. Nature", te: "అనుభవ స్వభావం", w: 16, pw: 12 },
        { en: "Remarks (English)", te: "Remarks", w: 34, pw: 17, rem: true }, { en: "వ్యాఖ్యలు (తెలుగు)", te: "Remarks (Telugu)", w: 34, pw: 17, rem: true }
      ]);
    }
    function detRow(r, i, withNature) {
      var row = [i + 1, r.sl, r.survey + (r.contd ? " (contd.)" : ""), r.ext, r.unc, r.cult, r.sist];
      if (withNature) row.push(biText(r.nature.te, r.nature.en));
      return row.concat([biText(r.cls.te, r.cls.en), biText(r.water.te, r.water.en), r.ayacut, r.khata, maskA(r.aadhaar, meta.maskAadhaar),
        r.pattadar.full, r.enjoyer.full, r.enjExt, biText(r.enj.te, r.enj.en), r.remEn, r.remTe]);
    }
    function detTotal(list, withNature) {
      var t = { ext: 0, unc: 0, cult: 0, sist: 0, ay: 0, enj: 0 }, sv = {};
      list.forEach(function (r) { t.enj += r.enjExt || 0; if (!r.contd) { sv[r.survey] = 1; t.ext += r.ext || 0; t.unc += r.unc || 0; t.cult += r.cult || 0; t.sist += r.sist || 0; t.ay += r.ayacut || 0; } });
      var row = ["", "", "Total / మొత్తం", t.ext, t.unc, t.cult, t.sist];
      if (withNature) row.push("");
      return { row: row.concat(["", "", t.ay, "", "", list.length + " entries / నమోదులు", Object.keys(sv).length + " survey nos", t.enj, "", "", ""]), t: t, sn: Object.keys(sv).length };
    }
    function detSheet(name, title, list, withNature, extraBlocks) {
      var tt = detTotal(list, withNature);
      return {
        name: name, title: title, info: info, kind: "detail",
        line: "Survey Nos / సర్వే నెంబర్లు: " + tt.sn + "   |   Entries / నమోదులు: " + list.length + "   |   Extent / విస్తీర్ణం: " + f4(tt.t.ext) + " Ac   |   Enjoyment / అనుభవం: " + f4(tt.t.enj) + " Ac   |   Sist / శిస్తు: Rs " + tt.t.sist.toFixed(2),
        blocks: (extraBlocks || []).concat([{ type: "table", detail: true, cols: detCols(withNature), rows: list.map(function (r, i) { return detRow(r, i, withNature); }), flags: list.map(function (r) { return r.rem.length > 0; }), total: tt.row }])
      };
    }

    sheets.push({ name: "Summary సారాంశం", title: ["Village Land Abstract – Summary Report", "గ్రామ భూ వివరాల సారాంశ నివేదిక"], info: info, kind: "summary", blocks: sumBlocks, sign: true });
    var used = {};
    byNature.forEach(function (a, i) {
      var nm = (i + 2) + "." + a.info.short;
      nm = nm.replace(/[\\\/\?\*\[\]:]/g, " ").slice(0, 31);
      while (used[nm]) nm = nm.slice(0, 29) + "_" + i; used[nm] = 1;
      sheets.push(detSheet(nm, [a.info.en + " – Land Report", a.info.te + " – భూముల నివేదిక"], a.recs.slice(), false));
    });
    var gl = recs.filter(function (r) { return r.isGovtLand; });
    var glc = agg(gl, function (r) { return r.cls.key; }, function (r) { return r.cls; });
    gl = []; glc.forEach(function (a) { gl = gl.concat(a.recs); });
    sheets.push(detSheet("Govt & Poramboke", ["Government & Poramboke Lands Register", "ప్రభుత్వ మరియు పోరంబోకు భూముల రిజిస్టర్"], gl, true, [
      { type: "table", title: "Classification-wise abstract  |  వివరణ వారీ సారాంశం", cols: natCols, rows: aggRows(glc), total: (function () { var t = detTotal(gl, false).t; return ["", "Total / మొత్తం", "", glc.reduce(function (s, a) { return s + a.sn; }, 0), gl.length, t.ext, t.cult, t.unc, t.ay, t.sist, pct(t.ext)]; })() }
    ]));
    sheets.push(detSheet("Remarks – Action List", ["Remarks – Action List for VRO / VS", "చర్య తీసుకోవలసిన నమోదుల జాబితా (గ్రా.రె.అ / గ్రామ సర్వేయర్)"], actionRows, true));

    /* Khata abstract */
    var kh = [], kby = {};
    recs.forEach(function (r) {
      var k = r.khata || "(blank)";
      if (!kby[k]) { kby[k] = { k: k, name: r.pattadar.full, aad: r.aadhaar, sv: [], n: 0, ext: 0, nat: {}, govt: r.govtKhata, flags: 0 }; kh.push(kby[k]); }
      var o = kby[k]; o.n++; o.ext += r.enjExt || 0; if (o.sv.indexOf(r.survey) < 0) o.sv.push(r.survey); o.nat[r.nature.short] = 1; if (r.aadhaar) o.aad = r.aadhaar; if (r.rem.length) o.flags++;
    });
    kh.sort(function (a, b) { return (parseFloat(a.k) || 9e15) - (parseFloat(b.k) || 9e15) || (a.k < b.k ? -1 : 1); });
    sheets.push({
      name: "Khata Abstract", title: ["Khata-wise Abstract (1-B)", "ఖాతా వారీ సారాంశం (1-బి)"], info: info, kind: "detail",
      line: "Khatas / ఖాతాలు: " + kh.length + "   |   Private / ప్రైవేటు: " + pvtKhN + "   |   Aadhaar linked / ఆధార్ అనుసంధానం: " + aadN,
      blocks: [{ type: "table", detail: true,
        cols: [{ en: "Sl.No", te: "క్ర.సం", w: 6, f: "int" }, { en: "Khata No", te: "ఖాతా నెం", w: 10 }, { en: "Khata type", te: "ఖాతా రకం", w: 14 },
          { en: "Pattadar (Father/Husband)", te: "పట్టాదారు (తండ్రి/భర్త)", w: 30 }, { en: "Aadhaar", te: "ఆధార్", w: 15 },
          { en: "Survey Nos", te: "సర్వే నెంబర్లు", w: 40 }, { en: "Entries", te: "నమోదులు", w: 9, f: "int" }, { en: "Enjoyment Extent (Ac)", te: "అనుభవ విస్తీర్ణం", w: 12, f: "ac" },
          { en: "Land Nature", te: "భూమి స్వభావం", w: 22 }, { en: "Entries with remarks", s: "With remarks", te: "వ్యాఖ్యలున్నవి", w: 11, f: "int" }],
        rows: kh.map(function (o, i) { return [i + 1, o.k, o.govt ? "Govt / ప్రభుత్వ" : "Private / ప్రైవేటు", o.name, maskA(o.aad, meta.maskAadhaar), o.sv.join(", "), o.n, o.ext, Object.keys(o.nat).join(", "), o.flags]; }),
        flags: kh.map(function (o) { return o.flags > 0; }),
        total: ["", "", "", "Total / మొత్తం", "", "", recs.length, T.enjExt, "", flagged.length] }]
    });

    sheets[0].blocks.push({ type: "table", title: "H. Sheets in this report  |  ఈ నివేదికలోని షీట్లు", cols: [natCols[0], { en: "Sheet", te: "షీట్", w: 34 }, { en: "Contents", te: "వివరాలు", w: 30 }],
      rows: sheets.slice(1).map(function (s, i) { return [i + 2, s.name, s.title[0] + " | " + s.title[1]]; }) });
    return { sheets: sheets, totals: T, meta: meta, counts: { surveys: heads.length, entries: recs.length, flagged: flagged.length, action: actionRows.length, khatas: kh.length, obs: obs } };
  }

  /* ---------------- Excel writer (ExcelJS) ---------------- */
  var RED = "FFB91C1C", DRED = "FF7F1D1D", GOLD = "FFD4A017", LGOLD = "FFFCEFC2", LRED = "FFFDECEC", WHITE = "FFFFFFFF", INK = "FF1F1308", FLAG = "FFFFF4CC";
  var FONT = "Nirmala UI";
  var COPY = "© RLL – RaghusLogicLab. All rights reserved. | కాపీరైట్ © RLL – అన్ని హక్కులు ప్రత్యేకించబడినవి.";
  function fmtOf(f) { return f === "ac" ? "0.0000" : f === "rs" ? "#,##0.00" : f === "pct" ? "0.0%" : f === "int" ? "0" : null; }

  function writeExcel(ExcelJS, spec, meta) {
    var wb = new ExcelJS.Workbook();
    wb.creator = "RLL – RaghusLogicLab"; wb.lastModifiedBy = "RLL – RaghusLogicLab"; wb.company = "RLL – RaghusLogicLab";
    wb.title = (meta.village || "") + " Pahani Report"; wb.subject = "Pahani / Adangal village report"; wb.keywords = "© RLL";
    wb.description = "© RLL – RaghusLogicLab. All rights reserved."; wb.created = new Date(); wb.modified = new Date();
    var amp = function (s) { return String(s).replace(/&/g, "&&"); };
    var gb = { style: "thin", color: { argb: GOLD } }, gbm = { style: "medium", color: { argb: GOLD } };
    var allGold = { top: gb, left: gb, bottom: gb, right: gb };

    spec.sheets.forEach(function (sh) {
      var ncol = 0;
      sh.blocks.forEach(function (b) { ncol = Math.max(ncol, b.type === "kv" ? 4 : b.cols.length); });
      var ws = wb.addWorksheet(sh.name, {
        properties: { tabColor: { argb: sh.kind === "summary" ? GOLD : RED } },
        pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true,
          margins: { left: 0.35, right: 0.35, top: 0.7, bottom: 0.7, header: 0.3, footer: 0.3 } },
        headerFooter: {
          oddHeader: '&L&"' + FONT + ',Bold"&9' + amp(meta.village || "") + " – Pahani Report&C&\"" + FONT + ',Bold"&9' + amp(sh.title[0]) + '&R&"' + FONT + ',Bold"&9&K7F1D1D© RLL',
          oddFooter: '&L&"' + FONT + '"&8© RLL – RaghusLogicLab. All rights reserved.&C&8Page &P of &N&R&"' + FONT + '"&8Generated ' + amp(meta.date || "") + " · raghuslogiclab.com"
        }
      });
      var widths = [];
      sh.blocks.forEach(function (b) { if (b.type === "table" && (b.detail || sh.kind === "summary")) b.cols.forEach(function (c, i) { widths[i] = Math.max(widths[i] || 0, c.w || 10); }); });
      if (sh.kind === "summary") { widths[1] = Math.max(widths[1] || 0, 36); widths[2] = Math.max(widths[2] || 0, 32); }
      for (var i = 0; i < ncol; i++) ws.getColumn(i + 1).width = widths[i] || 12;

      var r = 1;
      function band(text, fill, font, h) {
        ws.mergeCells(r, 1, r, ncol);
        var c = ws.getCell(r, 1); c.value = text; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
        c.font = Object.assign({ name: FONT, size: 10, color: { argb: INK } }, font || {}); c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        c.border = { top: gbm, left: gbm, bottom: gbm, right: gbm };
        if (h) ws.getRow(r).height = h; r++;
      }
      band(sh.title[0] + "  |  " + sh.title[1], RED, { size: 15, bold: true, color: { argb: WHITE } }, 30);
      band(sh.info.filter(function (x) { return x[2]; }).map(function (x) { return x[0] + " / " + x[1] + ": " + x[2]; }).join("     "), LRED, { size: 10.5, bold: true, color: { argb: DRED } }, 20);
      if (sh.line) band(sh.line, LRED, { size: 9.5, color: { argb: DRED } }, 18);
      band(COPY, LGOLD, { size: 9, italic: true, bold: true, color: { argb: "FF7A5A00" } }, 16);
      r++;
      var headerRow = null;

      sh.blocks.forEach(function (b) {
        if (b.title) { band(b.title, DRED, { size: 11.5, bold: true, color: { argb: WHITE } }, 22); }
        if (b.type === "kv") {
          b.rows.forEach(function (kv, j) {
            var row = ws.getRow(r);
            row.getCell(1).value = j + 1; row.getCell(2).value = kv[0]; row.getCell(3).value = kv[1];
            ws.mergeCells(r, 4, r, Math.max(4, Math.min(ncol, 6)));
            var vc = row.getCell(4); vc.value = kv[2]; if (fmtOf(kv[3])) vc.numFmt = kv[3] === "int" ? "#,##0" : fmtOf(kv[3]);
            for (var c = 1; c <= Math.max(4, Math.min(ncol, 6)); c++) {
              var cc = row.getCell(c); cc.border = allGold; cc.font = { name: FONT, size: 10, bold: c === 4, color: { argb: c === 4 ? DRED : INK } };
              cc.alignment = { vertical: "middle", horizontal: c === 4 ? "left" : c === 1 ? "center" : "left", wrapText: true };
              if (j % 2) cc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LRED } };
            }
            r++;
          });
          r++; return;
        }
        var hr = ws.getRow(r);
        b.cols.forEach(function (c, ci) {
          var cell = hr.getCell(ci + 1); cell.value = c.en + "\n" + c.te;
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: RED } };
          cell.font = { name: FONT, size: 9.5, bold: true, color: { argb: WHITE } };
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          cell.border = { top: gbm, left: gb, bottom: gbm, right: gb };
        });
        hr.height = b.detail ? 46 : 40;
        if (b.detail && !headerRow) headerRow = r;
        var first = r + 1; r++;
        b.rows.forEach(function (row, j) {
          var xr = ws.getRow(r), flag = b.flags && b.flags[j];
          row.forEach(function (v, ci) {
            var c = b.cols[ci], cell = xr.getCell(ci + 1);
            cell.value = (v === null || v === undefined) ? null : v;
            var nf = fmtOf(c.f); if (nf && typeof v === "number") cell.numFmt = nf;
            cell.font = { name: FONT, size: b.detail ? 9 : 10, color: { argb: c.rem && v ? "FF8A1C1C" : INK } };
            cell.alignment = { vertical: "top", horizontal: c.f ? "right" : (ci === 0 ? "center" : "left"), wrapText: !c.f };
            cell.border = allGold;
            if (c.rem && flag) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FLAG } };
            else if (j % 2) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF8F8" } };
          });
          r++;
        });
        var last = r - 1;
        if (b.total) {
          var tr = ws.getRow(r);
          b.total.forEach(function (v, ci) {
            var c = b.cols[ci], cell = tr.getCell(ci + 1), L = ws.getColumn(ci + 1).letter;
            if (typeof v === "number" && (c.f === "ac" || c.f === "rs") && last >= first) {
              cell.value = { formula: "SUBTOTAL(9," + L + first + ":" + L + last + ")", result: v };
            } else cell.value = v === "" ? null : v;
            var nf = fmtOf(c.f); if (nf && typeof v === "number") cell.numFmt = c.f === "int" ? "#,##0" : nf;
            cell.font = { name: FONT, size: 10, bold: true, color: { argb: DRED } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LGOLD } };
            cell.alignment = { vertical: "middle", horizontal: c.f ? "right" : "left", wrapText: true };
            cell.border = { top: gbm, left: gb, bottom: gbm, right: gb };
          });
          r++;
        }
        if (b.note) { ws.mergeCells(r, 1, r, ncol); var nc = ws.getCell(r, 1); nc.value = b.note; nc.font = { name: FONT, size: 8.5, italic: true, color: { argb: "FF6B4E00" } }; nc.alignment = { wrapText: true }; ws.getRow(r).height = 26; r++; }
        r++;
      });
      if (headerRow) {
        ws.views = [{ state: "frozen", ySplit: headerRow, xSplit: 0, topLeftCell: "A" + (headerRow + 1), activeCell: "A" + (headerRow + 1) }];
        ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: ncol } };
        ws.pageSetup.printTitlesRow = headerRow + ":" + headerRow;
      }
      if (sh.sign || sh.kind === "detail") {
        r++;
        var half = Math.floor(ncol / 2);
        ws.mergeCells(r, 1, r, half); ws.mergeCells(r, half + 1, r, ncol);
        ws.getCell(r, 1).value = "Signature of VRO / గ్రామ రెవెన్యూ అధికారి సంతకం\n\n\nName / పేరు: " + (meta.vro || "____________________");
        ws.getCell(r, half + 1).value = "Signature of VS / గ్రామ సర్వేయర్ సంతకం\n\n\nName / పేరు: " + (meta.vs || "____________________");
        [1, half + 1].forEach(function (c) { var x = ws.getCell(r, c); x.font = { name: FONT, size: 10, bold: true, color: { argb: DRED } }; x.alignment = { wrapText: true, vertical: "bottom", horizontal: "center" }; x.border = { top: gb }; });
        ws.getRow(r).height = 62; r += 2;
      }
      band(COPY + "  Generated with RLL Pahani Report tool – raghuslogiclab.com", LGOLD, { size: 9, italic: true, bold: true, color: { argb: "FF7A5A00" } }, 18);
    });
    return wb.xlsx.writeBuffer();
  }

  function fmt(v, f) {
    if (v === null || v === undefined || v === "") return "";
    if (typeof v !== "number") return String(v);
    if (f === "ac") return v.toFixed(4);
    if (f === "rs") return v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (f === "pct") return (v * 100).toFixed(1) + "%";
    if (f === "int") return Math.round(v).toLocaleString("en-IN");
    return String(v);
  }
  var API = { fmt: fmt, rowsToModel: rowsToModel, buildSpec: buildSpec, writeExcel: writeExcel, RULES: RULES, f4: f4, norm: norm };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.PahaniCore = API;
})(this);
