/* APPSC Group 2 Prep Hall — Mental Ability: question generators with visual solutions.
   Every call to APPSC_GEN.make(type) builds a fresh question, so practice never runs out.
   Each question: { subj:"mental", topic, q:[en,te], o:[[en,te] x4] (correct first), ex:[en,te], viz } */
(function () {
  "use strict";
  var rnd = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  var pick = function (arr) { return arr[rnd(0, arr.length - 1)]; };
  var shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(0, i), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  var fmt = function (n) { return (Math.round(n * 10) / 10).toLocaleString("en-IN"); };
  /* correct value + three different wrong values, as [en,te] pairs */
  function numOpts(c, cands, unit) {
    var out = [c], pool = shuffle(cands), i, k = 1;
    for (i = 0; i < pool.length && out.length < 4; i++) if (pool[i] > 0 && out.indexOf(pool[i]) < 0) out.push(pool[i]);
    while (out.length < 4) { var x = c + k * (k % 2 ? 1 : -1) * Math.max(1, Math.round(c / 10)); if (x > 0 && out.indexOf(x) < 0) out.push(x); k++; }
    return out.map(function (v) { var s = (unit && unit.pre || "") + fmt(v); return [s + (unit ? unit.en : ""), s + (unit ? unit.te : "")]; });
  }

  var TOPICS = [
    { id: "m1", key: "series", icon: "🔢", t: ["Number series", "సంఖ్యా శ్రేణులు"], p: [
      ["Write the difference between neighbouring numbers first. A constant difference means simple addition.", "ముందుగా పక్కపక్క సంఖ్యల మధ్య తేడాలు రాయండి. తేడా స్థిరంగా ఉంటే అది సాధారణ కూడిక."],
      ["If the differences themselves grow (2, 4, 6…), take the difference of the differences.", "తేడాలే పెరుగుతుంటే (2, 4, 6…), తేడాల మధ్య తేడాను చూడండి."],
      ["If numbers grow very fast, test multiplication (×2, ×3) or squares and cubes.", "సంఖ్యలు చాలా వేగంగా పెరుగుతుంటే గుణకారం (×2, ×3) లేదా వర్గాలు, ఘనాలు పరీక్షించండి."]] },
    { id: "m2", key: "clock", icon: "🕒", t: ["Clocks", "గడియారాలు"], p: [
      ["The minute hand moves 6° per minute; the hour hand moves 30° per hour and 0.5° per minute.", "నిమిషాల ముల్లు నిమిషానికి 6° కదులుతుంది; గంటల ముల్లు గంటకు 30°, నిమిషానికి 0.5° కదులుతుంది."],
      ["Angle at H hours M minutes = |30H − 5.5M|. If it is more than 180°, subtract it from 360°.", "H గంటల M నిమిషాలకు కోణం = |30H − 5.5M|. అది 180° కంటే ఎక్కువైతే 360° నుండి తీసివేయండి."],
      ["The hands overlap 11 times and are at right angles 22 times in 12 hours.", "12 గంటల్లో ముళ్లు 11 సార్లు కలుస్తాయి; 22 సార్లు లంబకోణంలో ఉంటాయి."]] },
    { id: "m3", key: "calendar", icon: "📅", t: ["Calendars", "క్యాలెండర్లు"], p: [
      ["Odd days = remainder when the number of days is divided by 7. An ordinary year has 1 odd day, a leap year 2.", "విషమ దినాలు = రోజుల సంఖ్యను 7తో భాగిస్తే వచ్చే శేషం. సాధారణ సంవత్సరంలో 1, లీపు సంవత్సరంలో 2 విషమ దినాలు."],
      ["Leap year: divisible by 4; a century year must be divisible by 400 (2000 yes, 1900 no).", "లీపు సంవత్సరం: 4తో భాగించబడాలి; శతాబ్ది సంవత్సరం 400తో భాగించబడాలి (2000 అవును, 1900 కాదు)."],
      ["Count the days between the two dates, find the remainder by 7 and move that many days forward.", "రెండు తేదీల మధ్య రోజులు లెక్కించి, 7తో శేషం కనుగొని, అన్ని రోజులు ముందుకు జరపండి."]] },
    { id: "m4", key: "direction", icon: "🧭", t: ["Direction sense", "దిశా జ్ఞానం"], p: [
      ["Always draw the path: North up, East to the right.", "ఎప్పుడూ మార్గాన్ని గీయండి: ఉత్తరం పైన, తూర్పు కుడి వైపు."],
      ["A right turn is clockwise (N → E → S → W); a left turn is anticlockwise.", "కుడి మలుపు సవ్యదిశ (ఉ → తూ → ద → ప); ఎడమ మలుపు అపసవ్యదిశ."],
      ["Find the net distance along North–South and East–West, then use Pythagoras: √(a² + b²).", "ఉత్తర–దక్షిణ, తూర్పు–పడమర దిశల్లో నికర దూరాలు కనుగొని పైథాగరస్ సూత్రం వాడండి: √(a² + b²)."]] },
    { id: "m5", key: "coding", icon: "🔤", t: ["Coding and decoding", "కోడింగ్, డీకోడింగ్"], p: [
      ["Write the alphabet positions (A=1 … Z=26) under each letter and compare word and code.", "ప్రతి అక్షరం కింద దాని స్థానం (A=1 … Z=26) రాసి పదాన్ని, కోడ్‌ను పోల్చండి."],
      ["Check for a fixed shift first (+1, +2, −1…), then for reversal of the word.", "ముందు స్థిరమైన జరుగుదల (+1, +2, −1…) ఉందేమో చూడండి; తర్వాత పదం తిరగబడిందేమో చూడండి."],
      ["After Z the alphabet starts again from A.", "Z తర్వాత అక్షరమాల మళ్లీ A నుండి మొదలవుతుంది."]] },
    { id: "m6", key: "arithmetic", icon: "➗", t: ["Arithmetic", "అంకగణితం"], p: [
      ["x% of N = N × x ÷ 100. Remember 25% = ¼, 20% = ⅕, 12½% = ⅛.", "Nలో x% = N × x ÷ 100. గుర్తుంచుకోండి: 25% = ¼, 20% = ⅕, 12½% = ⅛."],
      ["Two people who take a and b days alone finish together in ab ÷ (a + b) days.", "విడివిడిగా a, b రోజులు పట్టే ఇద్దరు కలిసి ab ÷ (a + b) రోజుల్లో పూర్తి చేస్తారు."],
      ["Simple interest = P × R × T ÷ 100. Average = sum ÷ number of items.", "బారువడ్డీ = P × R × T ÷ 100. సగటు = మొత్తం ÷ అంశాల సంఖ్య."]] },
    { id: "m7", key: "blood", icon: "👪", t: ["Blood relations", "రక్త సంబంధాలు"], p: [
      ["Draw a family tree: one generation per row, parents above children.", "వంశ వృక్షం గీయండి: ప్రతి తరానికి ఒక వరుస, తల్లిదండ్రులు పైన, పిల్లలు కింద."],
      ["Solve the statement from the end: 'my mother's only daughter' is the speaker herself.", "వాక్యాన్ని చివరి నుండి విప్పండి: 'నా తల్లి ఏకైక కుమార్తె' అంటే మాట్లాడుతున్న ఆమే."],
      ["Do not assume gender from a name unless the question states it.", "ప్రశ్నలో చెప్పకపోతే పేరును బట్టి లింగాన్ని ఊహించకండి."]] },
    { id: "m8", key: "di", icon: "📊", t: ["Data interpretation", "దత్తాంశ విశ్లేషణ"], p: [
      ["Read the title, the units and the labels before the question.", "ప్రశ్నకు ముందు శీర్షిక, ప్రమాణాలు, లేబుళ్లు చదవండి."],
      ["Note the highest and lowest values first; many questions use them.", "ముందుగా గరిష్ఠ, కనిష్ఠ విలువలను గుర్తించండి; చాలా ప్రశ్నలు వాటిపైనే ఉంటాయి."],
      ["Round numbers to estimate and remove wrong options quickly.", "సంఖ్యలను సుమారుగా తీసుకుని అంచనా వేస్తే తప్పు ఐచ్ఛికాలను వేగంగా తొలగించవచ్చు."]] }
  ];

  var G = {};

  G.series = function () {
    var type = rnd(0, 3), a = [], next, why, i, s, d;
    if (type === 0) { s = rnd(2, 25); d = rnd(3, 12); for (i = 0; i < 5; i++) a.push(s + i * d); next = s + 5 * d; why = ["Each number is " + d + " more than the one before it.", "ప్రతి సంఖ్య ముందు దాని కంటే " + d + " ఎక్కువ."]; }
    else if (type === 1) { s = rnd(1, 5); d = rnd(2, 3); for (i = 0; i < 5; i++) a.push(s * Math.pow(d, i)); next = s * Math.pow(d, 5); why = ["Each number is " + d + " times the one before it.", "ప్రతి సంఖ్య ముందు దానికి " + d + " రెట్లు."]; }
    else if (type === 2) { s = rnd(2, 9); for (i = 0; i < 5; i++) a.push((s + i) * (s + i)); next = (s + 5) * (s + 5); why = ["These are squares: " + s + "², " + (s + 1) + "², " + (s + 2) + "² … so the next is " + (s + 5) + "².", "ఇవి వర్గాలు: " + s + "², " + (s + 1) + "², " + (s + 2) + "² … కాబట్టి తర్వాతిది " + (s + 5) + "²."]; }
    else { s = rnd(2, 15); d = rnd(1, 4); var step = rnd(1, 3), cur = s, inc = d; a.push(cur); for (i = 0; i < 4; i++) { cur += inc; a.push(cur); inc += step; } next = cur + inc; why = ["The differences grow by " + step + " each time, so the next difference is " + inc + ".", "తేడాలు ప్రతిసారీ " + step + " చొప్పున పెరుగుతున్నాయి; తర్వాతి తేడా " + inc + "."]; }
    var gap = a[4] - a[3];
    return { topic: "m1", q: ["Find the next number in the series: " + a.join(", ") + ", ?", "శ్రేణిలో తర్వాతి సంఖ్యను కనుగొనండి: " + a.join(", ") + ", ?"],
      o: numOpts(next, [next + gap, next - 1, next + 1, next + 2, a[4] + gap, next - 2, next + 10]),
      ex: [why[0] + " Answer: " + fmt(next) + ".", why[1] + " జవాబు: " + fmt(next) + "."], viz: { type: "series", a: a, next: next, mul: type === 1 ? d : 0 } };
  };

  G.clock = function () {
    var h = rnd(1, 12), m = rnd(0, 11) * 5, hourAt = (h % 12) * 30 + m * 0.5, minAt = m * 6, raw = Math.abs(hourAt - minAt), ans = raw > 180 ? 360 - raw : raw;
    var t = h + ":" + (m < 10 ? "0" : "") + m, deg = { en: "°", te: "°" };
    var exEn = "Hour hand = 30 × " + (h % 12) + " + 0.5 × " + m + " = " + fmt(hourAt) + "°. Minute hand = 6 × " + m + " = " + minAt + "°. Difference = " + fmt(raw) + "°." + (raw > 180 ? " Take the smaller angle: 360° − " + fmt(raw) + "° = " + fmt(ans) + "°." : "");
    var exTe = "గంటల ముల్లు = 30 × " + (h % 12) + " + 0.5 × " + m + " = " + fmt(hourAt) + "°. నిమిషాల ముల్లు = 6 × " + m + " = " + minAt + "°. తేడా = " + fmt(raw) + "°." + (raw > 180 ? " చిన్న కోణం తీసుకోండి: 360° − " + fmt(raw) + "° = " + fmt(ans) + "°." : "");
    return { topic: "m2", q: ["What is the angle between the hour hand and the minute hand of a clock at " + t + "?", "గడియారంలో " + t + " సమయానికి గంటల ముల్లుకు, నిమిషాల ముల్లుకు మధ్య కోణం ఎంత?"],
      o: numOpts(ans, [ans + 15, ans - 15, ans + 30, ans - 30, ans + 5, ans + 27.5, Math.abs(30 * h - 6 * m) || 45, ans + 60, ans - 5, ans - 27.5].filter(function (v) { return v <= 180; }), deg), ex: [exEn, exTe], viz: { type: "clock", h: h, m: m, ans: ans } };
  };

  var DAYS = [["Sunday", "ఆదివారం"], ["Monday", "సోమవారం"], ["Tuesday", "మంగళవారం"], ["Wednesday", "బుధవారం"], ["Thursday", "గురువారం"], ["Friday", "శుక్రవారం"], ["Saturday", "శనివారం"]];
  var MONTHS = [["January", "జనవరి"], ["February", "ఫిబ్రవరి"], ["March", "మార్చి"], ["April", "ఏప్రిల్"], ["May", "మే"], ["June", "జూన్"], ["July", "జూలై"], ["August", "ఆగస్టు"], ["September", "సెప్టెంబర్"], ["October", "అక్టోబర్"], ["November", "నవంబర్"], ["December", "డిసెంబర్"]];
  G.calendar = function () {
    var y = rnd(2019, 2030), mo = rnd(1, 11), d = rnd(1, 28), leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    var base = new Date(Date.UTC(y, 0, 1)).getUTCDay(), target = new Date(Date.UTC(y, mo, d)).getUTCDay();
    var n = Math.round((Date.UTC(y, mo, d) - Date.UTC(y, 0, 1)) / 86400000), r = n % 7;
    var others = shuffle([0, 1, 2, 3, 4, 5, 6].filter(function (x) { return x !== target; })).slice(0, 3);
    var note = mo > 1 ? (leap ? [" (" + y + " is a leap year, so February has 29 days.)", " (" + y + " లీపు సంవత్సరం; ఫిబ్రవరిలో 29 రోజులు.)"] : [" (" + y + " is not a leap year, so February has 28 days.)", " (" + y + " లీపు సంవత్సరం కాదు; ఫిబ్రవరిలో 28 రోజులు.)"]) : ["", ""];
    return { topic: "m3",
      q: ["If 1 January " + y + " is a " + DAYS[base][0] + ", which day of the week is " + d + " " + MONTHS[mo][0] + " " + y + "?", y + " జనవరి 1 " + DAYS[base][1] + " అయితే, " + y + " " + MONTHS[mo][1] + " " + d + " ఏ వారం?"],
      o: [DAYS[target]].concat(others.map(function (x) { return DAYS[x]; })),
      ex: ["Days from 1 January to " + d + " " + MONTHS[mo][0] + " = " + n + "." + note[0] + " " + n + " ÷ 7 leaves remainder " + r + ". " + DAYS[base][0] + " + " + r + " days = " + DAYS[target][0] + ".",
        "జనవరి 1 నుండి " + MONTHS[mo][1] + " " + d + " వరకు రోజులు = " + n + "." + note[1] + " " + n + " ÷ 7 శేషం " + r + ". " + DAYS[base][1] + " + " + r + " రోజులు = " + DAYS[target][1] + "."],
      viz: { type: "odd", n: n, r: r, from: DAYS[base], to: DAYS[target] } };
  };

  var DIR = [["North", "ఉత్తరం"], ["East", "తూర్పు"], ["South", "దక్షిణం"], ["West", "పడమర"]], VEC = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  var DIAG = { "1,1": ["North-East", "ఈశాన్యం"], "1,-1": ["South-East", "ఆగ్నేయం"], "-1,-1": ["South-West", "నైరుతి"], "-1,1": ["North-West", "వాయవ్యం"] };
  G.direction = function () {
    var tri = pick([[3, 4], [4, 3], [6, 8], [8, 6], [5, 12], [12, 5], [9, 12], [8, 15], [0, rnd(3, 9)], [0, rnd(4, 12)]]);
    var x = tri[0], b = tri[1], c = rnd(2, 9), a = c + x, h0 = rnd(0, 3), turn = pick([1, -1]), h1 = (h0 + turn + 4) % 4, h2 = (h1 + turn + 4) % 4;
    var side = turn === 1 ? ["right", "కుడి"] : ["left", "ఎడమ"], dist = Math.sqrt(x * x + b * b);
    var pts = [[0, 0]], legs = [[h0, a], [h1, b], [h2, c]], px = 0, py = 0;
    legs.forEach(function (l) { px += VEC[l[0]][0] * l[1]; py += VEC[l[0]][1] * l[1]; pts.push([px, py]); });
    var where = (px && py) ? DIAG[(px > 0 ? 1 : -1) + "," + (py > 0 ? 1 : -1)] : DIR[px > 0 ? 1 : px < 0 ? 3 : py > 0 ? 0 : 2];
    var qEn = "A man walks " + a + " km towards " + DIR[h0][0] + ", turns " + side[0] + " and walks " + b + " km, then turns " + side[0] + " again and walks " + c + " km. ";
    var qTe = "ఒక వ్యక్తి " + DIR[h0][1] + " వైపు " + a + " కి.మీ నడిచి, " + side[1] + " వైపు తిరిగి " + b + " కి.మీ నడిచాడు; మళ్లీ " + side[1] + " వైపు తిరిగి " + c + " కి.మీ నడిచాడు. ";
    var exEn = (x ? "Net distance along " + DIR[h0][0] + "–" + DIR[h2][0] + " = " + a + " − " + c + " = " + x + " km; along " + DIR[h1][0] + " = " + b + " km. Distance = √(" + x + "² + " + b + "²) = " + dist + " km" : "He walks " + a + " km and comes back " + c + " km on the same line, so only the " + b + " km towards " + DIR[h1][0] + " remains") + ", to the " + where[0] + " of the start.";
    var exTe = (x ? DIR[h0][1] + "–" + DIR[h2][1] + " దిశలో నికర దూరం = " + a + " − " + c + " = " + x + " కి.మీ; " + DIR[h1][1] + " దిశలో = " + b + " కి.మీ. దూరం = √(" + x + "² + " + b + "²) = " + dist + " కి.మీ" : "అతను " + a + " కి.మీ వెళ్లి అదే రేఖపై " + c + " కి.మీ వెనక్కి వచ్చాడు; కాబట్టి " + DIR[h1][1] + " వైపు " + b + " కి.మీ మాత్రమే మిగులుతుంది") + "; బయలుదేరిన చోటుకు " + where[1] + " దిశలో.";
    var viz = { type: "path", pts: pts, dist: dist }, o;
    if (rnd(0, 9) < 7) { qEn += "How far is he from the starting point?"; qTe += "అతను బయలుదేరిన చోటు నుండి ఎంత దూరంలో ఉన్నాడు?"; o = numOpts(dist, [a + b + c, a + b - c, b + c, Math.abs(a - b) || 1, dist + 2, dist + 5, a], { en: " km", te: " కి.మీ" }); }
    else { qEn += "In which direction is he from the starting point?"; qTe += "అతను బయలుదేరిన చోటుకు ఏ దిశలో ఉన్నాడు?"; var poolD = (px && py) ? Object.keys(DIAG).map(function (k) { return DIAG[k]; }) : DIR; o = [where].concat(shuffle(poolD.filter(function (z) { return z[0] !== where[0]; })).slice(0, 3)); }
    return { topic: "m4", q: [qEn, qTe], o: o, ex: [exEn, exTe], viz: viz };
  };

  var WORDS = ["CAT", "DOG", "SUN", "PEN", "MAP", "BOOK", "TREE", "FISH", "LAMP", "RING", "GOLD", "KING", "RAIN", "MILK", "BIRD", "HAND"];
  function shiftWord(w, k) { return w.split("").map(function (ch) { return String.fromCharCode((ch.charCodeAt(0) - 65 + k + 26) % 26 + 65); }).join(""); }
  G.coding = function () {
    var k = pick([1, 2, 3, 4, -1, -2, -3]), two = shuffle(WORDS), w1 = two[0], w2 = two[1], ans = shiftWord(w2, k);
    var wrong = [shiftWord(w2, k + 1), shiftWord(w2, k - 1), shiftWord(w2, -k), ans.split("").reverse().join(""), shiftWord(w2, k + 2)], seen = {}; seen[ans] = 1;
    var o = [[ans, ans]]; wrong.forEach(function (x) { if (o.length < 4 && !seen[x]) { seen[x] = 1; o.push([x, x]); } });
    var n = Math.abs(k), steps = w2.split("").map(function (ch, i) { return ch + "→" + ans[i]; }).join(", ");
    return { topic: "m5", q: ["In a certain code, " + w1 + " is written as " + shiftWord(w1, k) + ". How is " + w2 + " written in that code?", "ఒక కోడ్‌లో " + w1 + "ని " + shiftWord(w1, k) + "గా రాస్తారు. అదే కోడ్‌లో " + w2 + "ని ఎలా రాస్తారు?"], o: o,
      ex: ["Each letter moves " + n + " place" + (n > 1 ? "s" : "") + (k > 0 ? " forward" : " back") + " in the alphabet: " + steps + ".", "ప్రతి అక్షరం అక్షరమాలలో " + n + (n > 1 ? " స్థానాలు " : " స్థానం ") + (k > 0 ? "ముందుకు" : "వెనక్కి") + " జరుగుతుంది: " + steps + "."],
      viz: { type: "shift", from: w2, to: ans, k: k } };
  };

  G.arithmetic = function () {
    var t = rnd(0, 4), rs = { pre: "₹", en: "", te: "" }, p, n, ans;
    if (t === 0) { p = pick([5, 10, 12, 15, 20, 25, 30, 40, 60, 75]); n = rnd(5, 45) * 20; ans = n * p / 100;
      return { topic: "m6", q: ["What is " + p + "% of " + fmt(n) + "?", fmt(n) + "లో " + p + "% ఎంత?"], o: numOpts(ans, [ans + 10, ans - 10, ans * 2, ans / 2, ans + p, n / p, ans + 20]),
        ex: [fmt(n) + " × " + p + " ÷ 100 = " + fmt(ans) + ".", fmt(n) + " × " + p + " ÷ 100 = " + fmt(ans) + "."], viz: null }; }
    if (t === 1) { var m1 = rnd(1, 5), m2 = rnd(2, 7); if (m1 === m2) m2++; var unit = rnd(2, 20) * 50, tot = (m1 + m2) * unit; ans = m1 * unit;
      return { topic: "m6", q: ["₹" + fmt(tot) + " is divided between A and B in the ratio " + m1 + " : " + m2 + ". How much does A get?", "₹" + fmt(tot) + "ను A, Bలకు " + m1 + " : " + m2 + " నిష్పత్తిలో పంచితే, Aకి ఎంత వస్తుంది?"], o: numOpts(ans, [m2 * unit, tot / 2, ans + unit, Math.abs(ans - unit) || unit * 3, tot / m1, unit], rs),
        ex: ["Total parts = " + m1 + " + " + m2 + " = " + (m1 + m2) + ". One part = ₹" + fmt(unit) + ". A gets " + m1 + " × " + fmt(unit) + " = ₹" + fmt(ans) + ".", "మొత్తం భాగాలు = " + m1 + " + " + m2 + " = " + (m1 + m2) + ". ఒక భాగం = ₹" + fmt(unit) + ". Aకి " + m1 + " × " + fmt(unit) + " = ₹" + fmt(ans) + "."], viz: { type: "ratio", a: m1, b: m2 } }; }
    if (t === 2) { var pr = pick([[10, 15, 6], [12, 24, 8], [6, 12, 4], [20, 30, 12], [15, 30, 10], [10, 40, 8], [9, 18, 6], [20, 5, 4], [30, 6, 5], [24, 8, 6], [3, 6, 2], [18, 36, 12], [12, 4, 3]]); ans = pr[2];
      return { topic: "m6", q: ["A can finish a work in " + pr[0] + " days and B in " + pr[1] + " days. In how many days can they finish it working together?", "A ఒక పనిని " + pr[0] + " రోజుల్లో, B " + pr[1] + " రోజుల్లో పూర్తి చేయగలరు. ఇద్దరూ కలిసి ఎన్ని రోజుల్లో పూర్తి చేస్తారు?"],
        o: numOpts(ans, [(pr[0] + pr[1]) / 2, ans + 1, ans + 2, ans - 1, Math.min(pr[0], pr[1]), ans + 3], { en: " days", te: " రోజులు" }),
        ex: ["Together = (" + pr[0] + " × " + pr[1] + ") ÷ (" + pr[0] + " + " + pr[1] + ") = " + ans + " days.", "కలిసి = (" + pr[0] + " × " + pr[1] + ") ÷ (" + pr[0] + " + " + pr[1] + ") = " + ans + " రోజులు."], viz: null }; }
    if (t === 3) { var P = rnd(2, 20) * 500, R = pick([4, 5, 6, 8, 10, 12]), T = rnd(2, 5); ans = P * R * T / 100;
      return { topic: "m6", q: ["Find the simple interest on ₹" + fmt(P) + " at " + R + "% per year for " + T + " years.", "₹" + fmt(P) + "పై సంవత్సరానికి " + R + "% వడ్డీ రేటుతో " + T + " సంవత్సరాలకు బారువడ్డీ ఎంత?"], o: numOpts(ans, [P * R / 100, ans + P * R / 100, P * T / 100, ans * 2, ans + 100, ans / 2], rs),
        ex: ["Simple interest = P × R × T ÷ 100 = " + fmt(P) + " × " + R + " × " + T + " ÷ 100 = ₹" + fmt(ans) + ".", "బారువడ్డీ = P × R × T ÷ 100 = " + fmt(P) + " × " + R + " × " + T + " ÷ 100 = ₹" + fmt(ans) + "."], viz: null }; }
    var arr = [], sum = 0, i; for (i = 0; i < 4; i++) { arr.push(rnd(8, 60)); sum += arr[i]; } var last = 5 * Math.ceil((sum + 8) / 5) - sum; if (last < 5) last += 5; arr.push(last); sum += last; ans = sum / 5;
    return { topic: "m6", q: ["Find the average of " + arr.slice(0, 4).join(", ") + " and " + arr[4] + ".", arr.join(", ") + " ల సగటు ఎంత?"], o: numOpts(ans, [ans + 1, ans - 1, ans + 2, ans + 5, ans - 2, sum / 4]),
      ex: ["Sum = " + sum + ". Average = " + sum + " ÷ 5 = " + ans + ".", "మొత్తం = " + sum + ". సగటు = " + sum + " ÷ 5 = " + ans + "."], viz: null };
  };

  var R = { mother: ["Mother", "తల్లి"], sister: ["Sister", "సోదరి"], aunt: ["Aunt", "అత్త"], grandma: ["Grandmother", "నానమ్మ / అమ్మమ్మ"], grandson: ["Grandson", "మనవడు"], son: ["Son", "కుమారుడు"], brother: ["Brother", "సోదరుడు"], nephew: ["Nephew", "మేనల్లుడు"], husband: ["Husband", "భర్త"], father: ["Father", "తండ్రి"], uncle: ["Uncle", "మామ"], grandpa: ["Grandfather", "తాత"], granddaughter: ["Granddaughter", "మనవరాలు"], daughter: ["Daughter", "కుమార్తె"], niece: ["Niece", "మేనకోడలు"] };
  G.blood = function () {
    var L = shuffle(["A", "B", "C", "D", "K", "M", "P", "Q", "R", "S"]), a = L[0], b = L[1], c = L[2], d = L[3], t = rnd(0, 3);
    if (t === 0) return { topic: "m7", q: ["Pointing to a boy, a woman said, \"His mother is the only daughter of my mother.\" How is the woman related to the boy?", "ఒక బాలుడిని చూపిస్తూ ఒక మహిళ ఇలా అంది: \"ఇతని తల్లి నా తల్లికి ఏకైక కుమార్తె.\" ఆ మహిళ బాలుడికి ఏమవుతుంది?"], o: [R.mother, R.sister, R.aunt, R.grandma],
      ex: ["The only daughter of the woman's mother is the woman herself. So she is the boy's mother.", "ఆ మహిళ తల్లికి ఏకైక కుమార్తె ఆ మహిళే. కాబట్టి ఆమె బాలుడి తల్లి."], viz: { type: "tree", rows: [[["Woman's mother", "మహిళ తల్లి"]], [["Woman (only daughter)", "మహిళ (ఏకైక కుమార్తె)"]], [["Boy", "బాలుడు"]]] } };
    if (t === 1) return { topic: "m7", q: [a + " is the brother of " + b + ". " + b + " is the daughter of " + c + ". " + d + " is the father of " + c + ". How is " + a + " related to " + d + "?", a + ", " + b + "కి సోదరుడు. " + b + ", " + c + "కి కుమార్తె. " + d + ", " + c + "కి తండ్రి. " + a + ", " + d + "కి ఏమవుతాడు?"], o: [R.grandson, R.son, R.brother, R.nephew],
      ex: [a + " and " + b + " are children of " + c + ". " + d + " is the father of " + c + ", so " + a + " is the grandson of " + d + ".", a + ", " + b + "లు " + c + " పిల్లలు. " + d + ", " + c + "కి తండ్రి; కాబట్టి " + a + ", " + d + "కి మనవడు."], viz: { type: "tree", rows: [[[d, d]], [[c, c]], [[a + " (brother)", a + " (సోదరుడు)"], [b + " (sister)", b + " (సోదరి)"]]] } };
    if (t === 2) return { topic: "m7", q: [a + " is the father of " + b + ". " + b + " is the sister of " + c + ". " + d + " is the mother of " + c + ". How is " + a + " related to " + d + "?", a + ", " + b + "కి తండ్రి. " + b + ", " + c + "కి సోదరి. " + d + ", " + c + "కి తల్లి. " + a + ", " + d + "కి ఏమవుతాడు?"], o: [R.husband, R.father, R.brother, R.uncle],
      ex: [b + " and " + c + " are children of the same parents. " + a + " is their father and " + d + " is their mother, so " + a + " is the husband of " + d + ".", b + ", " + c + "లు ఒకే తల్లిదండ్రుల పిల్లలు. " + a + " వారి తండ్రి, " + d + " వారి తల్లి; కాబట్టి " + a + ", " + d + "కి భర్త."], viz: { type: "tree", rows: [[[a + " (father)", a + " (తండ్రి)"], [d + " (mother)", d + " (తల్లి)"]], [[b, b], [c, c]]] } };
    return { topic: "m7", q: [a + " is the sister of " + b + ". " + c + " is the mother of " + b + ". " + d + " is the father of " + c + ". How is " + a + " related to " + d + "?", a + ", " + b + "కి సోదరి. " + c + ", " + b + "కి తల్లి. " + d + ", " + c + "కి తండ్రి. " + a + ", " + d + "కి ఏమవుతుంది?"], o: [R.granddaughter, R.daughter, R.niece, R.sister],
      ex: [a + " and " + b + " are children of " + c + ". " + d + " is the father of " + c + ", so " + a + " is the granddaughter of " + d + ".", a + ", " + b + "లు " + c + " పిల్లలు. " + d + ", " + c + "కి తండ్రి; కాబట్టి " + a + ", " + d + "కి మనవరాలు."], viz: { type: "tree", rows: [[[d, d]], [[c, c]], [[a + " (sister)", a + " (సోదరి)"], [b, b]]] } };
  };

  var CROPS = [["Rice", "వరి"], ["Maize", "మొక్కజొన్న"], ["Cotton", "పత్తి"], ["Chilli", "మిర్చి"], ["Groundnut", "వేరుశనగ"]];
  G.di = function () {
    var v = [], sum = 0, i; for (i = 0; i < 5; i++) { v.push(rnd(2, 9) * 10); sum += v[i]; }
    var hi = Math.max.apply(null, v), lo = Math.min.apply(null, v), t = rnd(0, 2), q, ans, ex, cands;
    var headEn = "The chart shows the production of five crops in a district (in thousand tonnes). ", headTe = "ఒక జిల్లాలో ఐదు పంటల ఉత్పత్తిని (వేల టన్నుల్లో) చార్ట్ చూపుతుంది. ";
    if (t === 0) { ans = sum; q = ["What is the total production of all five crops?", "ఐదు పంటల మొత్తం ఉత్పత్తి ఎంత?"]; ex = [v.join(" + ") + " = " + sum + ".", v.join(" + ") + " = " + sum + "."]; cands = [sum + 10, sum - 10, sum + 20, sum - hi, sum - lo, sum + 50]; }
    else if (t === 1) { ans = hi - lo; q = ["What is the difference between the highest and the lowest production?", "గరిష్ఠ, కనిష్ఠ ఉత్పత్తుల మధ్య తేడా ఎంత?"]; ex = ["Highest = " + hi + ", lowest = " + lo + ". Difference = " + (hi - lo) + ".", "గరిష్ఠం = " + hi + ", కనిష్ఠం = " + lo + ". తేడా = " + (hi - lo) + "."]; cands = [hi - lo + 10, hi - lo - 10, hi, lo, hi + lo, hi - lo + 20]; if (ans === 0) { ans = sum; q = ["What is the total production of all five crops?", "ఐదు పంటల మొత్తం ఉత్పత్తి ఎంత?"]; ex = [v.join(" + ") + " = " + sum + ".", v.join(" + ") + " = " + sum + "."]; cands = [sum + 10, sum - 10, sum + 20]; } }
    else { ans = sum / 5; q = ["What is the average production per crop?", "ఒక్కో పంట సగటు ఉత్పత్తి ఎంత?"]; ex = ["Total = " + sum + ". Average = " + sum + " ÷ 5 = " + ans + ".", "మొత్తం = " + sum + ". సగటు = " + sum + " ÷ 5 = " + ans + "."]; cands = [ans + 10, ans - 10, ans + 5, ans - 5, sum / 4, hi]; }
    return { topic: "m8", q: [headEn + q[0], headTe + q[1]], o: numOpts(ans, cands), ex: ex, viz: { type: "bars", labels: CROPS, v: v, pre: true } };
  };

  /* ---------- visual solutions (SVG / HTML strings) ---------- */
  function vizHtml(z, L) {
    if (!z) return "";
    var i, s;
    if (z.type === "series") { s = '<div class="vz-series">'; for (i = 0; i < z.a.length; i++) { var nx = i < z.a.length - 1 ? z.a[i + 1] : z.next; s += '<b>' + z.a[i] + '</b><i>' + (z.mul ? "×" + z.mul : "+" + (nx - z.a[i])) + '</i>'; } return s + '<b class="vz-ans">' + z.next + '</b></div>'; }
    if (z.type === "clock") { var ha = (z.h % 12) * 30 + z.m * 0.5, ma = z.m * 6; s = '<svg class="vz" viewBox="0 0 200 200" role="img"><circle cx="100" cy="100" r="92" class="vz-face"/>'; for (i = 1; i <= 12; i++) { var an = i * 30 * Math.PI / 180; s += '<text x="' + (100 + 76 * Math.sin(an)).toFixed(1) + '" y="' + (105 - 76 * Math.cos(an)).toFixed(1) + '" class="vz-num">' + i + '</text>'; }
      return s + '<line x1="100" y1="100" x2="100" y2="50" class="vz-hour" style="--to:' + ha + 'deg"/><line x1="100" y1="100" x2="100" y2="26" class="vz-min" style="--to:' + ma + 'deg"/><circle cx="100" cy="100" r="5" class="vz-pin"/><text x="100" y="150" class="vz-big">' + fmt(z.ans) + '°</text></svg>'; }
    if (z.type === "path") { var xs = z.pts.map(function (p) { return p[0]; }), ys = z.pts.map(function (p) { return p[1]; }), minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs), minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys), sc = 150 / Math.max(maxX - minX, maxY - minY, 1);
      var P = z.pts.map(function (p) { return [35 + (p[0] - minX) * sc + (150 - (maxX - minX) * sc) / 2, 185 - (p[1] - minY) * sc - (150 - (maxY - minY) * sc) / 2]; }), d = P.map(function (p, k) { return (k ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" "), e = P[P.length - 1];
      return '<svg class="vz" viewBox="0 0 220 220" role="img"><text x="205" y="22" class="vz-num">N ↑</text><path d="' + d + '" class="vz-path" pathLength="1"/><line x1="' + P[0][0].toFixed(1) + '" y1="' + P[0][1].toFixed(1) + '" x2="' + e[0].toFixed(1) + '" y2="' + e[1].toFixed(1) + '" class="vz-dash"/><circle cx="' + P[0][0].toFixed(1) + '" cy="' + P[0][1].toFixed(1) + '" r="6" class="vz-start"/><circle cx="' + e[0].toFixed(1) + '" cy="' + e[1].toFixed(1) + '" r="6" class="vz-end"/><text x="' + ((P[0][0] + e[0]) / 2 + 8).toFixed(1) + '" y="' + ((P[0][1] + e[1]) / 2 - 6).toFixed(1) + '" class="vz-big sm">' + z.dist + ' km</text></svg><div class="vz-key"><span class="k1"></span>' + (L ? "ప్రారంభం" : "Start") + ' <span class="k2"></span>' + (L ? "ముగింపు" : "End") + '</div>'; }
    if (z.type === "odd") return '<div class="vz-series"><b>' + z.from[L] + '</b><i>+' + z.n + (L ? " రోజులు" : " days") + '</i><i>÷7 → ' + z.r + '</i><b class="vz-ans">' + z.to[L] + '</b></div>';
    if (z.type === "shift") { s = '<div class="vz-shift">'; for (i = 0; i < z.from.length; i++) s += '<span><b>' + z.from[i] + '</b><i>' + (z.k > 0 ? "+" : "−") + Math.abs(z.k) + '</i><b class="vz-ans">' + z.to[i] + '</b></span>'; return s + '</div>'; }
    if (z.type === "ratio") return '<div class="vz-ratio"><span style="flex:' + z.a + '">A · ' + z.a + '</span><span style="flex:' + z.b + '">B · ' + z.b + '</span></div>';
    if (z.type === "tree") { s = '<div class="vz-tree">'; z.rows.forEach(function (row, k) { s += (k ? '<div class="vz-link">│</div>' : '') + '<div class="vz-row">' + row.map(function (n) { return '<span>' + n[L] + '</span>'; }).join('<em>—</em>') + '</div>'; }); return s + '</div>'; }
    if (z.type === "bars") { var mx = Math.max.apply(null, z.v); s = '<div class="vz-bars">'; z.v.forEach(function (val, k) { s += '<div><b>' + val + '</b><span style="height:' + Math.round(val / mx * 100) + '%"></span><i>' + z.labels[k][L] + '</i></div>'; }); return s + '</div>'; }
    return "";
  }

  window.APPSC_GEN = {
    topics: TOPICS,
    types: TOPICS.map(function (t) { return t.key; }),
    make: function (key) { key = key || pick(TOPICS).key; var q = G[key](); q.subj = "mental"; q.gen = key; return q; },
    viz: vizHtml
  };
})();
