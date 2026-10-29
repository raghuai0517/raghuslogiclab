/*
  AP DSC 2026 Exam Hall — accounts, payment and admin (RaghusLogicLab)
  Used by the sign-in page (index.html) and inside the full tool after it unlocks.
  Talks to the "rll-pay" Cloudflare worker (/dsc/* routes). Settings: dsc-config.js (window.DSC_CFG).
  DSC_CFG.demo = true runs everything in this browser with a simulated Google account chooser and a
  simulated Razorpay checkout (used for the preview only; nothing is charged).
*/
(function () {
  "use strict";
  var C = Object.assign({ api: "", googleClientId: "", trialUrl: "", demo: false, demoKey: "", demoAdmins: [] }, window.DSC_CFG || {});
  var API = String(C.api || "").replace(/\/+$/, "");
  var SK = "ap26.session", PK = "ap26.pendingOrder";
  var mem = {};
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return mem[k] || null; } },
    set: function (k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) {} }
  };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function bi(en, te, cls) { return '<span class="' + (cls || "") + '">' + esc(en) + '</span>' + (te ? '<small class="dga-te" lang="te">' + esc(te) + "</small>" : ""); }
  function fmtDate(iso) { try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return iso; } }
  function rupees(n) { return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 }); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function session() { return store.get(SK); }
  function trialVid() { try { var v = JSON.parse(localStorage.getItem("ap26t.vid") || "null"); return typeof v === "string" ? v : undefined; } catch (e) { return undefined; } }
  function fmtTime(iso) { try { return new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (e) { return iso; } }

  /* ---------------- styles ---------------- */
  var css = "\
.dga-te{display:block;font-family:'Noto Sans Telugu','Noto Sans',sans-serif;font-size:.86em;opacity:.85;font-weight:inherit;margin-top:1px}\
.dga-ov{position:fixed;inset:0;z-index:1000;background:rgba(10,16,32,.55);display:grid;place-items:center;padding:14px;overflow:auto}\
.dga-box{background:var(--dga-bg,#fff);color:var(--dga-ink,#141A2E);border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.35);width:min(100%,460px);max-height:calc(100vh - 28px);overflow:auto;font-family:'Noto Sans','Noto Sans Telugu',system-ui,sans-serif}\
.dga-box.wide{width:min(100%,1020px)}\
.dga-hd{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--dga-line,#E3E6EF)}\
.dga-hd h2{margin:0;font-size:18px;flex:1}\
.dga-bd{padding:16px 18px}\
.dga-x{border:0;background:transparent;font-size:24px;line-height:1;cursor:pointer;color:inherit;padding:4px 8px}\
.dga-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--dga-line2,#C9CEDD);background:var(--dga-bg,#fff);color:inherit;border-radius:9px;padding:9px 16px;font-weight:700;font-size:14px;cursor:pointer;min-height:42px;text-decoration:none;font-family:inherit}\
.dga-btn:has(.dga-te){flex-direction:column;gap:0;line-height:1.25}.dga-btn .dga-te{font-size:.8em}\
.dga-btn.pri{background:#B5195A;border-color:#B5195A;color:#fff}\
.dga-btn.sky{background:#0284C7;border-color:#FACC15;border-width:2px;color:#FDE047}\
.dga-btn.sm{padding:6px 11px;min-height:34px;font-size:13px}\
.dga-btn:disabled{opacity:.55;cursor:default}\
.dga-in{width:100%;box-sizing:border-box;border:1px solid var(--dga-line2,#C9CEDD);border-radius:9px;padding:10px 12px;font-size:15px;background:var(--dga-bg,#fff);color:inherit;font-family:inherit}\
.dga-f{display:grid;gap:5px;margin-bottom:12px}.dga-f label{font-size:13px;font-weight:700}\
.dga-err{color:#B42318;font-size:13px;font-weight:600;margin:6px 0 0}\
.dga-ok{color:#067647;font-size:13px;font-weight:600;margin:6px 0 0}\
.dga-muted{color:var(--dga-muted,#5B647D);font-size:13px}\
.dga-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}\
.dga-chip{display:inline-block;border-radius:999px;padding:2px 9px;font-size:12px;font-weight:700;background:#E7F6EC;color:#067647}\
.dga-chip.off{background:#FDECEC;color:#B42318}.dga-chip.adm{background:#FEF3C7;color:#92400E}\
.dga-acc{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line-strong,#C9CEDD);background:var(--card,#fff);color:var(--ink,#141A2E);border-radius:999px;padding:3px 10px 3px 3px;font-weight:700;font-size:13px;cursor:pointer;min-height:34px;font-family:inherit}\
.dga-av{width:28px;height:28px;border-radius:50%;background:#0284C7;color:#FDE047;display:grid;place-items:center;font-weight:800;font-size:13px;overflow:hidden;flex:none}\
.dga-av img{width:100%;height:100%;object-fit:cover}\
.dga-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}\
.dga-card{border:1px solid var(--dga-line,#E3E6EF);border-radius:12px;padding:14px}\
.dga-card h3{margin:0 0 10px;font-size:15px}\
.dga-stats{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}.dga-stats div{border:1px solid var(--dga-line,#E3E6EF);border-radius:10px;padding:8px 12px;min-width:110px}\
.dga-stats b{display:block;font-size:20px}.dga-stats span{font-size:12px;color:var(--dga-muted,#5B647D)}\
.dga-tw{overflow:auto;border:1px solid var(--dga-line,#E3E6EF);border-radius:10px;max-height:420px}\
.dga-t{border-collapse:collapse;width:100%;font-size:13px}\
.dga-t th,.dga-t td{padding:7px 9px;border-bottom:1px solid var(--dga-line,#E3E6EF);text-align:left;white-space:nowrap}\
.dga-t th{position:sticky;top:0;background:var(--dga-bg2,#F5F6FA);font-size:12px}\
.dga-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 14px;border-bottom:1px solid var(--dga-line,#E3E6EF)}\
.dga-tabs button{border:0;background:transparent;color:inherit;font:700 14px/1.2 inherit;padding:9px 12px;cursor:pointer;border-bottom:3px solid transparent;opacity:.7;font-family:inherit}\
.dga-tabs button.on{opacity:1;border-bottom-color:#B5195A}\
.dga-ev{display:inline-block;border-radius:6px;padding:1px 7px;font-size:12px;font-weight:700;background:#E0F2FE;color:#075985}\
.dga-ev.signup{background:#EDE9FE;color:#5B21B6}.dga-ev.paid{background:#E7F6EC;color:#067647}.dga-ev.admin{background:#FEF3C7;color:#92400E}.dga-ev.admin-fail{background:#FDECEC;color:#B42318}\
.g-adm{display:block;margin:18px auto 0;border:0;background:transparent;color:var(--muted,#5B647D);font:600 13px/1.2 inherit;text-decoration:underline;cursor:pointer;font-family:inherit}\
.dga-demo{background:#FEF3C7;color:#78350F;border:1px dashed #D97706;border-radius:10px;padding:8px 12px;font-size:12.5px;font-weight:600}\
.dga-gbtn{display:inline-flex;align-items:center;gap:12px;border:1px solid #DADCE0;background:#fff;color:#1F1F1F;border-radius:999px;padding:9px 20px 9px 12px;font-weight:600;font-size:15px;cursor:pointer;min-height:44px;font-family:Roboto,'Noto Sans',sans-serif}\
.dga-gbtn svg{width:20px;height:20px}\
.dga-acct{display:flex;align-items:center;gap:12px;width:100%;border:0;border-bottom:1px solid #E3E6EF;background:transparent;padding:12px 4px;cursor:pointer;text-align:left;font-family:inherit;color:inherit}\
.dga-acct:hover{background:#F5F6FA}\
.dga-rzp-top{background:#0B1B3F;color:#fff;padding:16px 18px;border-radius:14px 14px 0 0}\
.dga-rzp-top b{font-size:18px}.dga-rzp-amt{font-size:26px;font-weight:800;margin-top:6px}\
.dga-rzp-opt{display:flex;justify-content:space-between;align-items:center;border:1px solid #E3E6EF;border-radius:10px;padding:12px;margin-bottom:8px;font-weight:600}\
@media (prefers-color-scheme:dark){.dga-box{--dga-bg:#151B2E;--dga-bg2:#1C2338;--dga-ink:#E8EBF5;--dga-line:#2B3350;--dga-line2:#3A4466;--dga-muted:#A3ABC6}.dga-acct:hover{background:#1C2338}.dga-rzp-opt{border-color:#2B3350}}\
@media (max-width:620px){.dga-acc .dga-nm{display:none}.dga-acc{padding:3px}.dga-hd{padding:12px 14px}.dga-bd{padding:14px}}\
";
  function addCss() { if (document.getElementById("dga-css")) return; var s = document.createElement("style"); s.id = "dga-css"; s.textContent = css; document.head.appendChild(s); }

  /* ---------------- overlay helper ---------------- */
  function overlay(html, opts) {
    addCss(); opts = opts || {};
    var ov = document.createElement("div"); ov.className = "dga-ov";
    ov.innerHTML = '<div class="dga-box ' + (opts.wide ? "wide" : "") + '" role="dialog" aria-modal="true">' + html + "</div>";
    document.body.appendChild(ov);
    function close() { if (ov.parentNode) ov.parentNode.removeChild(ov); if (opts.onClose) opts.onClose(); }
    var x = ov.querySelector("[data-close]"); if (x) x.onclick = close;
    if (!opts.sticky) ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    return { el: ov, box: ov.firstChild, close: close };
  }

  /* ---------------- server calls ---------------- */
  function api(path, method, body) {
    if (C.demo) return Promise.resolve(Mock.handle(path, method || "GET", body, (session() || {}).token));
    var h = { "Content-Type": "application/json" };
    var s = session(); if (s && s.token) h.Authorization = "Bearer " + s.token;
    return fetch(API + path, { method: method || "GET", headers: h, body: body ? JSON.stringify(body) : undefined, cache: "no-store" })
      .then(function (r) { return r.json(); });
  }

  /* ---------------- content decryption ---------------- */
  var keyP = null;
  function cryptoKey(b64) {
    if (b64) keyP = null;
    if (!keyP) {
      var raw = Uint8Array.from(atob(b64 || window.DSC_KEY || ""), function (c) { return c.charCodeAt(0); });
      keyP = crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
    }
    return keyP;
  }
  function decrypt(buf, b64) {
    return cryptoKey(b64).then(function (k) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(buf.slice(0, 12)) }, k, buf.slice(12));
    }).then(function (plain) {
      var ds = new Blob([plain]).stream().pipeThrough(new DecompressionStream("gzip"));
      return new Response(ds).text();
    });
  }
  var EXT = C.ext || ".enc";
  function b64buf(t) { var bin = atob(t.trim()), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
  function loadText(url, b64) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return /\.txt$/.test(url) ? r.text().then(b64buf) : r.arrayBuffer(); })
      .then(function (buf) { return decrypt(buf, b64); });
  }
  function loadJSON(url) { return loadText(url).then(JSON.parse); }

  /* ---------------- Google sign-in ---------------- */
  var G_ICON = '<svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  var gisP = null;
  function loadGis() {
    if (window.google && google.accounts && google.accounts.id) return Promise.resolve();
    if (gisP) return gisP;
    gisP = new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true;
      s.onload = function () { res(); }; s.onerror = function () { gisP = null; rej(new Error("gis_blocked")); };
      document.head.appendChild(s);
    });
    return gisP;
  }
  /* Renders a Google button into el; calls onCred(credential). */
  function googleButton(el, mode, onCred, onErr) {
    if (C.demo) {
      el.innerHTML = '<button type="button" class="dga-gbtn">' + G_ICON + (mode === "signup" ? "Sign up with Google" : "Sign in with Google") + "</button>";
      el.firstChild.onclick = function () { demoChooser(onCred); };
      return;
    }
    if (!C.googleClientId) { el.innerHTML = '<p class="dga-err">' + bi("Google sign-in is being set up. Please try the free trial for now.", "Google సైన్ ఇన్ సిద్ధమవుతోంది. ప్రస్తుతానికి ఉచిత ట్రయల్ ప్రయత్నించండి.") + "</p>" + (C.trialUrl ? '<a class="dga-btn sky" href="' + esc(C.trialUrl) + '">Open free trial</a>' : ""); return; }
    el.innerHTML = '<p class="dga-muted">Loading Google sign-in…</p>';
    loadGis().then(function () {
      google.accounts.id.initialize({ client_id: C.googleClientId, callback: function (r) { onCred(r.credential); }, ux_mode: "popup", auto_select: false, cancel_on_tap_outside: true });
      el.innerHTML = "";
      google.accounts.id.renderButton(el, { type: "standard", theme: "filled_blue", size: "large", shape: "pill", text: mode === "signup" ? "signup_with" : "signin_with", width: Math.min(320, el.clientWidth || 300), logo_alignment: "left" });
    }, function () { el.innerHTML = '<p class="dga-err">Google sign-in could not load. Check your internet or turn off content blockers, then reload.</p>'; if (onErr) onErr(); });
  }
  function demoChooser(onCred) {
    var accts = [["Demo Customer", "preview.customer@gmail.com"]].concat((C.demoAdmins || []).map(function (e) { return ["Admin (you)", e]; }));
    var o = overlay('<div class="dga-hd"><h2>' + G_ICON.replace("<svg", '<svg width="20" height="20"') + " Choose an account</h2><button class=\"dga-x\" data-close aria-label=\"Close\">×</button></div>" +
      '<div class="dga-bd"><p class="dga-demo">Preview: this stands in for Google’s account chooser. On the website the real Google window opens.</p>' +
      accts.map(function (a) { return '<button class="dga-acct" data-e="' + esc(a[1]) + '" data-n="' + esc(a[0]) + '"><span class="dga-av">' + esc(a[0][0]) + "</span><span><b>" + esc(a[0]) + '</b><br><span class="dga-muted">' + esc(a[1]) + "</span></span></button>"; }).join("") +
      '<div class="dga-f" style="margin-top:12px"><label for="dgaOther">Use another Gmail</label><div class="dga-row"><input class="dga-in" id="dgaOther" type="email" placeholder="name@gmail.com" style="flex:1"><button class="dga-btn sm" id="dgaOtherGo">Next</button></div></div></div>');
    function pick(e, n) { o.close(); onCred(JSON.stringify({ demo: 1, email: e, name: n })); }
    o.box.querySelectorAll("[data-e]").forEach(function (b) { b.onclick = function () { pick(b.dataset.e, b.dataset.n === "Admin (you)" ? "Raghu" : "Demo Customer"); }; });
    o.box.querySelector("#dgaOtherGo").onclick = function () { var v = o.box.querySelector("#dgaOther").value.trim(); if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) pick(v, v.split("@")[0]); };
  }

  /* ---------------- Razorpay ---------------- */
  function loadCheckout() {
    if (typeof window.Razorpay === "function") return Promise.resolve();
    return new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.async = true;
      s.onload = function () { typeof window.Razorpay === "function" ? res() : rej(new Error("checkout_missing")); };
      s.onerror = function () { rej(new Error("checkout_blocked")); };
      document.head.appendChild(s);
    });
  }
  function waitPaid(orderId, seconds) {
    var until = Date.now() + seconds * 1000;
    return (function loop() {
      return api("/dsc/status?order=" + encodeURIComponent(orderId)).then(function (s) {
        if (s && s.ok && s.active) return s;
        if (Date.now() > until) return null;
        return wait(3000).then(loop);
      }, function () { return Date.now() > until ? null : wait(3000).then(loop); });
    })();
  }
  /* Resolves with the /me result once access is active, or null. */
  function pay() {
    return api("/dsc/order", "POST", {}).then(function (o) {
      if (!o || !o.ok) throw new Error((o && o.error) || "order_failed");
      if (C.demo) return demoCheckout(o);
      store.set(PK, { orderId: o.orderId, at: Date.now() });
      return loadCheckout().then(function () {
        return new Promise(function (resolve) {
          var done = false;
          function finish(r) { if (done) return; done = true; if (r) store.del(PK); resolve(r); }
          var rz = new window.Razorpay({
            key: o.keyId, order_id: o.orderId, amount: o.amount, currency: o.currency || "INR",
            name: "RaghusLogicLab", description: "AP DSC 2026 Exam Hall · " + o.days + " days",
            prefill: o.prefill || {}, theme: { color: "#0284C7" },
            handler: function (resp) {
              api("/dsc/verify", "POST", { orderId: o.orderId, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature })
                .then(function (v) { return v && v.active ? v : waitPaid(o.orderId, 90); }, function () { return waitPaid(o.orderId, 90); })
                .then(finish);
            },
            modal: { ondismiss: function () { waitPaid(o.orderId, 6).then(finish); } }
          });
          rz.open();
        });
      });
    });
  }
  function demoCheckout(o) {
    return new Promise(function (resolve) {
      var ov = overlay('<div class="dga-rzp-top"><div class="dga-row" style="justify-content:space-between"><b>RaghusLogicLab</b><button class="dga-x" data-close style="color:#fff">×</button></div>' +
        '<div class="dga-muted" style="color:#C7D2FE">AP DSC 2026 Exam Hall · ' + esc(o.days) + ' days</div><div class="dga-rzp-amt">' + rupees(o.amount / 100) + "</div></div>" +
        '<div class="dga-bd"><p class="dga-demo">Preview: simulated Razorpay checkout. Nothing is charged.</p>' +
        '<div class="dga-rzp-opt"><span>UPI · PhonePe / Google Pay / Paytm</span><span>›</span></div><div class="dga-rzp-opt"><span>Cards · Netbanking · Wallets</span><span>›</span></div>' +
        '<div class="dga-row" style="margin-top:12px"><button class="dga-btn pri" id="dgaPayOk" style="flex:1">Pay ' + rupees(o.amount / 100) + '</button><button class="dga-btn sm" id="dgaPayFail">Simulate failure</button></div><p class="dga-err" id="dgaPayMsg" hidden></p></div>',
        { sticky: true, onClose: function () { resolve(null); } });
      ov.box.querySelector("#dgaPayOk").onclick = function () {
        this.disabled = true; this.textContent = "Processing…";
        setTimeout(function () { var v = Mock.handle("/dsc/verify", "POST", { orderId: o.orderId, paymentId: "pay_DEMO" + Date.now(), demoPaid: true }, (session() || {}).token); store.del(PK); ov.el.remove(); resolve(v && v.active ? v : null); }, 900);
      };
      ov.box.querySelector("#dgaPayFail").onclick = function () { var m = ov.box.querySelector("#dgaPayMsg"); m.hidden = false; m.textContent = "Payment failed (simulated). Your bank declined it — try again or use another UPI app."; };
    });
  }

  /* ---------------- the sign-in page ---------------- */
  var POSTS = ["SGT", "School Assistant (SA)", "TGT", "PGT", "PET", "Physical Director (PD)", "Principal", "Other"];
  var DISTRICTS = ["Alluri Sitharama Raju", "Anakapalli", "Ananthapuramu", "Annamayya", "Bapatla", "Chittoor", "Dr. B.R. Ambedkar Konaseema", "East Godavari", "Eluru", "Guntur", "Kakinada", "Krishna", "Kurnool", "Nandyal", "NTR", "Palnadu", "Parvathipuram Manyam", "Prakasam", "Sri Potti Sriramulu Nellore", "Sri Sathya Sai", "Srikakulam", "Tirupati", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"];

  function profileFields(u) {
    u = u || {};
    return '<div class="dga-f"><label for="pfName">' + bi("Full name", "పూర్తి పేరు") + '</label><input class="dga-in" id="pfName" autocomplete="name" value="' + esc(u.name || "") + '"></div>' +
      '<div class="dga-f"><label for="pfPhone">' + bi("Mobile number", "మొబైల్ నంబర్") + '</label><input class="dga-in" id="pfPhone" inputmode="numeric" autocomplete="tel-national" maxlength="10" placeholder="10 digits" value="' + esc((u.phone || "").replace(/^\+?91/, "")) + '"></div>' +
      '<div class="dga-f"><label for="pfDist">' + bi("District", "జిల్లా") + '</label><input class="dga-in" id="pfDist" list="pfDistL" value="' + esc(u.district || "") + '"><datalist id="pfDistL">' + DISTRICTS.map(function (d) { return '<option value="' + esc(d) + '">'; }).join("") + "</datalist></div>" +
      '<div class="dga-f"><label for="pfPost">' + bi("Preparing for", "సిద్ధమవుతున్న పోస్టు") + '</label><select class="dga-in" id="pfPost"><option value="">—</option>' + POSTS.map(function (p) { return "<option" + (u.post === p ? " selected" : "") + ">" + esc(p) + "</option>"; }).join("") + "</select></div>";
  }
  function readProfile(root) {
    var p = { name: root.querySelector("#pfName").value.trim(), phone: root.querySelector("#pfPhone").value.replace(/\D/g, ""), district: root.querySelector("#pfDist").value.trim(), post: root.querySelector("#pfPost").value };
    if (p.name.length < 2) return { err: "Please enter your name. / మీ పేరు నమోదు చేయండి." };
    if (!/^[6-9]\d{9}$/.test(p.phone)) return { err: "Enter a valid 10-digit mobile number. / సరైన 10 అంకెల మొబైల్ నంబర్ ఇవ్వండి." };
    if (!p.district) return { err: "Please choose your district. / జిల్లా ఎంచుకోండి." };
    return { p: p };
  }

  var gate = null, onUnlock = null, cfgCache = null;
  function startGate(el, unlock) {
    addCss(); gate = el; onUnlock = unlock;
    if (C.demo) { var dr = document.getElementById("dgaDemo"); if (dr) dr.hidden = false; }
    loading("Checking your account…");
    api("/dsc/config").then(function (c) { if (c && c.ok) { cfgCache = c; paintPrice(); } }).catch(function () {});
    var s = session();
    if (!s || !s.token) return authScreen("signin");
    var pend = store.get(PK);
    var first = pend && Date.now() - pend.at < 2 * 3600000 ? waitPaid(pend.orderId, 15).then(function (r) { if (r) store.del(PK); return r || api("/dsc/me"); }) : api("/dsc/me");
    first.then(route, function () { errorScreen(); });
  }
  function paintPrice() {
    document.querySelectorAll("[data-dga-price]").forEach(function (x) { x.textContent = rupees(cfgCache.price); });
    document.querySelectorAll("[data-dga-days]").forEach(function (x) { x.textContent = cfgCache.days; });
    document.querySelectorAll("[data-dga-pricebox]").forEach(function (x) { x.hidden = false; });
  }
  function route(me) {
    if (!me || !me.ok) { if (me && (me.error === "signed_out" || me.error === "no_account")) { store.del(SK); return authScreen("signin"); } return errorScreen(); }
    var s = session() || {}; s.name = me.user.name; s.email = me.user.email; s.picture = me.user.picture; store.set(SK, s);
    if (!me.user.phone && !me.user.admin) return profileScreen(me);
    if (me.active) return unlockApp(me);
    payScreen(me);
  }
  function loading(msg) { gate.innerHTML = '<div class="g-pad"><p class="dga-muted"><span class="g-spin"></span> ' + esc(msg) + "</p></div>"; }
  function errorScreen(msg) {
    gate.innerHTML = '<div class="g-pad"><h2>' + bi("Can’t reach the server", "సర్వర్ అందుబాటులో లేదు") + '</h2><p class="dga-muted">' + esc(msg || "Check your internet connection and try again.") + '</p><button class="dga-btn pri" id="gRetry">Try again</button></div>';
    gate.querySelector("#gRetry").onclick = function () { startGate(gate, onUnlock); };
  }
  function authScreen(tab) {
    gate.innerHTML = '<div class="g-tabs" role="tablist"><button role="tab" data-t="signin" class="' + (tab === "signin" ? "on" : "") + '">' + bi("Sign in", "సైన్ ఇన్") + '</button><button role="tab" data-t="signup" class="' + (tab === "signup" ? "on" : "") + '">' + bi("Create account", "ఖాతా తెరవండి") + '</button></div><div class="g-pad" id="gBody"></div>';
    gate.querySelectorAll("[data-t]").forEach(function (b) { b.onclick = function () { authScreen(b.dataset.t); }; });
    var body = gate.querySelector("#gBody");
    if (tab === "signin") {
      body.innerHTML = "<h2>" + bi("Welcome back", "మళ్ళీ స్వాగతం") + '</h2><p class="dga-muted">' + bi("Sign in with the Gmail account you used to join.", "మీరు చేరిన Gmail ఖాతాతో సైన్ ఇన్ చేయండి.") + '</p><div id="gBtn" class="g-gbtn"></div><p class="dga-err" id="gErr" hidden></p>' +
        '<p class="dga-muted g-small">' + bi("New here? Choose “Create account”.", "కొత్తవారా? “ఖాతా తెరవండి” ఎంచుకోండి.") + '</p><button class="g-adm" id="gAdm" type="button">Admin login</button>';
      googleButton(body.querySelector("#gBtn"), "signin", function (cred) { doLogin(cred, null); });
      body.querySelector("#gAdm").onclick = function () { adminForm(body); };
    } else {
      body.innerHTML = "<h2>" + bi("Create your account", "మీ ఖాతా తెరవండి") + '</h2><p class="dga-muted">' + bi("Step 1 of 2 · your details", "దశ 1/2 · మీ వివరాలు") + "</p>" + profileFields({}) +
        '<button class="dga-btn pri" id="gNext" style="width:100%">' + bi("Continue", "కొనసాగండి") + '</button><p class="dga-err" id="gErr" hidden></p>';
      body.querySelector("#gNext").onclick = function () {
        var r = readProfile(body); var er = body.querySelector("#gErr");
        if (r.err) { er.hidden = false; er.textContent = r.err; return; }
        body.innerHTML = "<h2>" + bi("Create your account", "మీ ఖాతా తెరవండి") + '</h2><p class="dga-muted">' + bi("Step 2 of 2 · confirm with your Gmail", "దశ 2/2 · మీ Gmailతో నిర్ధారించండి") + '</p><div class="dga-card" style="margin:10px 0 14px"><b>' + esc(r.p.name) + '</b><br><span class="dga-muted">' + esc(r.p.phone) + " · " + esc(r.p.district) + (r.p.post ? " · " + esc(r.p.post) : "") +
          '</span></div><div id="gBtn" class="g-gbtn"></div><p class="dga-err" id="gErr" hidden></p><button class="dga-btn sm" id="gBack" style="margin-top:12px">← ' + bi("Edit details", "వివరాలు మార్చండి") + "</button>";
        body.querySelector("#gBack").onclick = function () { authScreen("signup"); };
        googleButton(body.querySelector("#gBtn"), "signup", function (cred) { doLogin(cred, r.p); });
      };
    }
  }
  function adminForm(body) {
    body.innerHTML = "<h2>Admin login</h2><p class=\"dga-muted\">For the site owner only.</p>" + (C.demo ? '<p class="dga-demo">Preview: any password works here. On the website only your admin password works.</p>' : "") +
      '<form id="gAdmF"><div class="dga-f"><label for="gPw">Password</label><input class="dga-in" id="gPw" type="password" autocomplete="current-password" required></div>' +
      '<button class="dga-btn pri" style="width:100%" type="submit">Sign in as admin</button></form><p class="dga-err" id="gErr" hidden></p><button class="g-adm" id="gBackU" type="button">← Back to customer sign-in</button>';
    body.querySelector("#gBackU").onclick = function () { authScreen("signin"); };
    body.querySelector("#gPw").focus();
    body.querySelector("#gAdmF").onsubmit = function (e) {
      e.preventDefault();
      var pw = body.querySelector("#gPw").value, er = body.querySelector("#gErr"), btn = this.querySelector("button");
      if (!pw) return;
      btn.disabled = true; er.hidden = true;
      api("/dsc/admin/login", "POST", { password: pw }).then(function (r) {
        btn.disabled = false;
        if (r && r.ok && r.token) { store.set(SK, { token: r.token, email: r.user.email, name: r.user.name || "Admin", picture: "" }); return route(r); }
        er.hidden = false;
        er.textContent = !r ? "Sign-in failed." : r.error === "locked" ? "Too many wrong tries. Wait 15 minutes and try again." : r.error === "not_set" ? "The admin password is not set on the server yet (ADMIN_PASSWORD)." : "Wrong password." + (r.left != null ? " " + r.left + " tries left." : "");
        body.querySelector("#gPw").select();
      }, function () { btn.disabled = false; er.hidden = false; er.textContent = "Could not reach the server."; });
    };
  }
  function doLogin(cred, profile) {
    loading("Signing you in…");
    api("/dsc/login", "POST", { credential: cred, profile: profile || undefined, vid: trialVid() }).then(function (r) {
      if (!r || !r.ok) { authScreen(profile ? "signup" : "signin"); var e = gate.querySelector("#gErr"); if (e) { e.hidden = false; e.textContent = r && r.error === "bad_google_token" ? "Google sign-in could not be confirmed. Please try again." : "Sign-in failed. Please try again."; } return; }
      store.set(SK, { token: r.token, email: r.user.email, name: r.user.name, picture: r.user.picture });
      route(r);
    }, function () { errorScreen(); });
  }
  function profileScreen(me) {
    gate.innerHTML = '<div class="g-pad"><h2>' + bi("Complete your details", "మీ వివరాలు పూర్తి చేయండి") + '</h2><p class="dga-muted">' + esc(me.user.email) + "</p>" + profileFields(me.user) +
      '<button class="dga-btn pri" id="gSave" style="width:100%">' + bi("Save and continue", "సేవ్ చేసి కొనసాగండి") + '</button><p class="dga-err" id="gErr" hidden></p></div>';
    gate.querySelector("#gSave").onclick = function () {
      var r = readProfile(gate), er = gate.querySelector("#gErr");
      if (r.err) { er.hidden = false; er.textContent = r.err; return; }
      this.disabled = true;
      api("/dsc/profile", "POST", r.p).then(function (x) { if (!x || !x.ok) { er.hidden = false; er.textContent = "Could not save. Try again."; return; } return api("/dsc/me").then(route); }, function () { errorScreen(); });
    };
  }
  function payScreen(me) {
    var expired = me.user.until && Date.parse(me.user.until) < Date.now();
    gate.innerHTML = '<div class="g-pad"><div class="dga-row" style="justify-content:space-between"><div class="dga-row"><span class="dga-av">' + avatar(me.user) + "</span><div><b>" + esc(me.user.name || me.user.email) + '</b><br><span class="dga-muted">' + esc(me.user.email) + '</span></div></div><button class="dga-btn sm" id="gOut">' + bi("Sign out", "సైన్ అవుట్") + "</button></div>" +
      (expired ? '<p class="dga-err">' + bi("Your access ended on " + fmtDate(me.user.until) + ". Renew to continue.", "మీ యాక్సెస్ " + fmtDate(me.user.until) + "న ముగిసింది. కొనసాగడానికి రెన్యూ చేయండి.") + "</p>" : "") +
      '<div class="g-plan"><div class="g-plan-k">' + bi("Full access", "పూర్తి యాక్సెస్") + '</div><div class="g-plan-p">' + rupees(me.price) + '</div><div class="g-plan-d">' + bi(me.days + " days of full access", me.days + " రోజుల పూర్తి యాక్సెస్") + "</div>" +
      '<ul class="g-list"><li>' + bi("All 83 AP textbooks · 972 chapters · notes, tiles, tests", "83 AP పాఠ్యపుస్తకాలు · 972 అధ్యాయాలు · నోట్స్, టైల్స్, పరీక్షలు") + "</li><li>" + bi("Full CBT mock exams for every post", "ప్రతి పోస్టుకు పూర్తి CBT మాదిరి పరీక్షలు") + "</li><li>" + bi("Every question bank, explained answers, A4 PDFs", "అన్ని ప్రశ్నల బ్యాంకులు, వివరణలు, A4 PDFలు") + "</li></ul>" +
      '<button class="dga-btn sky" id="gPay" style="width:100%;font-size:17px">' + bi((expired ? "Renew · Pay " : "Pay ") + rupees(me.price) + " & unlock", (expired ? "రెన్యూ · " : "") + rupees(me.price) + " చెల్లించి తెరవండి") + '</button>' +
      '<p class="dga-muted g-small">' + bi("Secure payment by Razorpay · UPI (PhonePe, Google Pay, Paytm), cards, netbanking. Access starts right after payment.", "Razorpay ద్వారా సురక్షిత చెల్లింపు · UPI, కార్డులు, నెట్‌బ్యాంకింగ్. చెల్లించిన వెంటనే యాక్సెస్.") + '</p><p class="dga-err" id="gErr" hidden></p></div></div>';
    gate.querySelector("#gOut").onclick = signOut;
    gate.querySelector("#gPay").onclick = function () {
      var b = this, er = gate.querySelector("#gErr"); b.disabled = true; er.hidden = true;
      pay().then(function (r) {
        b.disabled = false;
        if (r && r.active) { unlockApp(r); return; }
        er.hidden = false; er.textContent = "Payment not completed. If money was debited, wait a minute and reload this page — access opens automatically.";
      }, function () { b.disabled = false; er.hidden = false; er.textContent = "Payments are unavailable right now. Please try again in a few minutes."; });
    };
  }
  function avatar(u) { return u && u.picture ? '<img alt="" src="' + esc(u.picture) + '" referrerpolicy="no-referrer">' : esc(((u && (u.name || u.email)) || "?").trim()[0].toUpperCase()); }
  function unlockApp(me) {
    loading("Opening the Exam Hall…");
    var s = session() || {}; s.until = me.user.until; s.admin = !!me.user.admin; store.set(SK, s);
    Promise.resolve(onUnlock(me.key)).catch(function (e) { errorScreen("The tool could not open (" + (e && e.message || "error") + "). Reload the page to try again."); });
  }
  function signOut() {
    store.del(SK); store.del(PK);
    try { if (!C.demo && window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) {}
    location.reload();
  }

  /* ---------------- inside the tool: account button + admin ---------------- */
  function mountBar() {
    addCss();
    var host = document.querySelector(".top-actions"); if (!host || document.getElementById("dgaAcc")) return;
    var s = session() || {};
    var b = document.createElement("button"); b.id = "dgaAcc"; b.className = "dga-acc"; b.type = "button";
    b.innerHTML = '<span class="dga-av">' + avatar(s) + '</span><span class="dga-nm">' + esc((s.name || s.email || "Account").split(" ")[0]) + "</span>";
    b.onclick = accountMenu; host.appendChild(b);
    if (C.demo) { var dr = document.createElement("div"); dr.className = "dga-demo"; dr.style.cssText = "border-radius:0;text-align:center;border-left:0;border-right:0"; dr.textContent = "Preview · Google sign-in and Razorpay are simulated. Nothing is charged."; document.body.insertBefore(dr, document.body.firstChild); }
  }
  function accountMenu() {
    var s = session() || {};
    var o = overlay('<div class="dga-hd"><span class="dga-av">' + avatar(s) + "</span><h2>" + esc(s.name || "Account") + '<br><span class="dga-muted" style="font-weight:400">' + esc(s.email || "") + '</span></h2><button class="dga-x" data-close aria-label="Close">×</button></div>' +
      '<div class="dga-bd"><p>' + (s.admin ? '<span class="dga-chip adm">Admin</span>' : '<span class="dga-chip">' + bi("Full access", "పూర్తి యాక్సెస్") + "</span>") + "</p>" +
      (s.until && !s.admin ? '<p class="dga-muted">' + bi("Access until " + fmtDate(s.until), fmtDate(s.until) + " వరకు యాక్సెస్") + "</p>" : "") +
      '<div class="dga-row" style="margin-top:14px">' + (s.admin ? '<button class="dga-btn sky" id="dgaAdm">Admin panel</button>' : "") + '<button class="dga-btn" id="dgaOut">' + bi("Sign out", "సైన్ అవుట్") + "</button></div></div>");
    o.box.querySelector("#dgaOut").onclick = signOut;
    var a = o.box.querySelector("#dgaAdm"); if (a) a.onclick = function () { o.close(); openAdmin(); };
  }

  function openAdmin() {
    var o = overlay('<div class="dga-hd"><h2>Admin panel · AP DSC 2026 Exam Hall</h2><button class="dga-x" data-close aria-label="Close">×</button></div><div class="dga-bd"><div class="dga-tabs" role="tablist"><button data-at="m" class="on">Members &amp; price</button><button data-at="l">Sign-in log</button><button data-at="t">Free trial log</button></div><div id="admBody"><p class="dga-muted">Loading…</p></div></div>', { wide: true });
    var root = o.box.querySelector("#admBody");
    o.box.querySelectorAll("[data-at]").forEach(function (b) {
      b.onclick = function () {
        o.box.querySelectorAll("[data-at]").forEach(function (x) { x.classList.toggle("on", x === b); });
        root.innerHTML = '<p class="dga-muted">Loading…</p>';
        if (b.dataset.at === "m") load(); else logs(root, b.dataset.at === "t" ? "trial" : "login");
      };
    });
    function load() {
      api("/dsc/admin").then(function (d) {
        if (!d || !d.ok) { root.innerHTML = '<p class="dga-err">' + (d && d.error === "not_admin" ? "This Gmail is not an admin." : "Could not load (sign in again).") + "</p>"; return; }
        draw(d);
      }, function () { root.innerHTML = '<p class="dga-err">Could not reach the server.</p>'; });
    }
    function draw(d) {
      var nowT = Date.now(), act = d.users.filter(function (u) { return Date.parse(u.until || 0) > nowT; });
      var revenue = d.users.reduce(function (s, u) { return s + (Number(u.paid) || 0); }, 0);
      root.innerHTML = (C.demo ? '<p class="dga-demo" style="margin-top:0">Preview data lives only in this browser.</p>' : "") +
        '<div class="dga-stats"><div><b>' + d.users.length + "</b><span>Accounts</span></div><div><b>" + act.length + "</b><span>Active now</span></div><div><b>" + rupees(revenue) + "</b><span>Total paid</span></div><div><b>" + rupees(d.price) + "</b><span>Current price · " + d.days + " days</span></div></div>" +
        '<div class="dga-grid"><div class="dga-card"><h3>Price customers pay</h3><div class="dga-row"><div class="dga-f" style="flex:1;min-width:110px"><label for="admPrice">Amount (₹)</label><input class="dga-in" id="admPrice" type="number" min="1" step="1" value="' + esc(d.price) + '"></div>' +
        '<div class="dga-f" style="flex:1;min-width:110px"><label for="admDays">Access (days)</label><input class="dga-in" id="admDays" type="number" min="1" max="3650" step="1" value="' + esc(d.days) + '"></div></div>' +
        '<div class="dga-row"><button class="dga-btn pri" id="admSave">Save price</button><span class="dga-muted" id="admPrev"></span></div><p class="dga-muted" style="margin:8px 0 0">New payments use this at once. People who already paid keep their days.' + (d.updated ? " Last changed " + fmtDate(d.updated) + "." : "") + '</p><p id="admMsg" hidden></p></div>' +
        '<div class="dga-card"><h3>Give or remove access by hand</h3><div class="dga-f"><label for="admEmail">Gmail address</label><input class="dga-in" id="admEmail" type="email" placeholder="name@gmail.com"></div>' +
        '<div class="dga-row"><div class="dga-f" style="width:120px"><label for="admGDays">Days</label><input class="dga-in" id="admGDays" type="number" value="' + esc(d.days) + '"></div><button class="dga-btn sky" id="admGrant" style="margin-top:8px">Add days</button><button class="dga-btn" id="admRevoke" style="margin-top:8px">Remove access</button></div>' +
        '<p class="dga-muted" style="margin:4px 0 0">For cash or bank payments, or a free pass. Days add to any time left.</p><p id="admGMsg" hidden></p></div></div>' +
        '<div class="dga-row" style="margin:18px 0 10px;justify-content:space-between"><h3 style="margin:0;font-size:15px">Members</h3><div class="dga-row"><input class="dga-in" id="admQ" placeholder="Search name, Gmail, phone, district" style="width:min(320px,70vw)"><button class="dga-btn sm" id="admCsv">Download CSV</button></div></div>' +
        '<div class="dga-tw"><table class="dga-t"><thead><tr><th>Name</th><th>Gmail</th><th>Mobile</th><th>District</th><th>Post</th><th>Joined</th><th>Access</th><th>Paid</th></tr></thead><tbody id="admRows"></tbody></table></div>';
      var prev = root.querySelector("#admPrev");
      function pv() { prev.textContent = "Customers will see: " + rupees(root.querySelector("#admPrice").value) + " for " + (root.querySelector("#admDays").value || "?") + " days"; }
      root.querySelector("#admPrice").oninput = pv; root.querySelector("#admDays").oninput = pv; pv();
      function msg(id, ok, text) { var m = root.querySelector(id); m.hidden = false; m.className = ok ? "dga-ok" : "dga-err"; m.textContent = text; }
      root.querySelector("#admSave").onclick = function () {
        var price = Number(root.querySelector("#admPrice").value), days = Number(root.querySelector("#admDays").value);
        if (!(price >= 1)) return msg("#admMsg", false, "Enter an amount of ₹1 or more.");
        if (!(days >= 1 && days <= 3650)) return msg("#admMsg", false, "Days must be between 1 and 3650.");
        api("/dsc/admin/config", "POST", { price: price, days: days }).then(function (r) {
          if (r && r.ok) { msg("#admMsg", true, "Saved. New price: " + rupees(r.price) + " for " + r.days + " days."); setTimeout(load, 900); } else msg("#admMsg", false, "Could not save (" + ((r && r.error) || "error") + ").");
        });
      };
      function grant(days) {
        var e = root.querySelector("#admEmail").value.trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return msg("#admGMsg", false, "Enter a Gmail address.");
        api("/dsc/admin/grant", "POST", { email: e, days: days }).then(function (r) {
          if (r && r.ok) { msg("#admGMsg", true, days > 0 ? "Done. " + e + " has access until " + fmtDate(r.user.until) + "." : "Access removed for " + e + "."); setTimeout(load, 1200); } else msg("#admGMsg", false, "Could not update (" + ((r && r.error) || "error") + ").");
        });
      }
      root.querySelector("#admGrant").onclick = function () { var n = Math.round(Number(root.querySelector("#admGDays").value)); if (!(n > 0)) return msg("#admGMsg", false, "Enter the number of days."); grant(n); };
      root.querySelector("#admRevoke").onclick = function () { grant(0); };
      function rows(q) {
        q = (q || "").toLowerCase();
        var list = d.users.filter(function (u) { return !q || [u.name, u.email, u.phone, u.district, u.post].join(" ").toLowerCase().indexOf(q) >= 0; });
        root.querySelector("#admRows").innerHTML = list.map(function (u) {
          var on = Date.parse(u.until || 0) > nowT;
          return "<tr><td>" + esc(u.name || "—") + "</td><td>" + esc(u.email) + "</td><td>" + esc(u.phone || "—") + "</td><td>" + esc(u.district || "—") + "</td><td>" + esc(u.post || "—") + "</td><td>" + (u.created ? fmtDate(u.created) : "—") + "</td><td>" +
            (u.email === (session() || {}).email && (session() || {}).admin ? '<span class="dga-chip adm">admin</span>' : on ? '<span class="dga-chip">until ' + fmtDate(u.until) + "</span>" : '<span class="dga-chip off">' + (u.until ? "ended " + fmtDate(u.until) : "not paid") + "</span>") + "</td><td>" + (u.paid ? rupees(u.paid) : "—") + "</td></tr>";
        }).join("") || '<tr><td colspan="8" class="dga-muted">No members yet.</td></tr>';
      }
      rows(""); root.querySelector("#admQ").oninput = function (e) { rows(e.target.value); };
      root.querySelector("#admCsv").onclick = function () {
        var head = ["name", "gmail", "mobile", "district", "post", "joined", "access_until", "paid_rupees", "payments"];
        var lines = [head.join(",")].concat(d.users.map(function (u) { return [u.name, u.email, u.phone, u.district, u.post, u.created, u.until, u.paid || 0, u.n || 0].map(function (v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","); }));
        var blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv" });
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ap-dsc-2026-members.csv"; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      };
    }
    load();
  }

  /* ---------------- admin logs ---------------- */
  function csvDownload(name, head, rows) {
    var lines = [head.join(",")].concat(rows.map(function (r) { return r.map(function (v) { v = String(v == null ? "" : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","); }));
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv" })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function placeOf(x) { return [x.c, x.r].filter(Boolean).join(", ") || (x.co || "—"); }
  var EV = { signup: "New account", login: "Sign-in", paid: "Payment", admin: "Admin login", "admin-fail": "Wrong admin password" };
  function logs(root, kind) {
    var want = [api("/dsc/admin/logs?kind=" + kind)];
    if (kind === "trial") want.push(api("/dsc/admin"));
    Promise.all(want).then(function (res) {
      var d = res[0];
      if (!d || !d.ok) { root.innerHTML = '<p class="dga-err">Could not load the log' + (d && d.error ? " (" + esc(d.error) + ")" : "") + ".</p>"; return; }
      var items = d.items || [], nowT = Date.now(), DAY = 86400000;
      var since = function (x, days) { return nowT - Date.parse(x.at || x.last || x.first || 0) < days * DAY; };
      if (kind === "login") {
        var today = new Date(nowT + 5.5 * 3600000).toISOString().slice(0, 10);
        var isToday = function (x) { return new Date(Date.parse(x.at) + 5.5 * 3600000).toISOString().slice(0, 10) === today; };
        root.innerHTML = '<div class="dga-stats"><div><b>' + items.filter(function (x) { return (x.t === "login" || x.t === "signup") && isToday(x); }).length + "</b><span>Sign-ins today</span></div><div><b>" +
          items.filter(function (x) { return x.t === "signup" && since(x, 7); }).length + "</b><span>New accounts · 7 days</span></div><div><b>" +
          rupees(items.filter(function (x) { return x.t === "paid" && since(x, 7); }).reduce(function (s, x) { return s + (Number(x.a) || 0); }, 0)) + "</b><span>Payments · 7 days</span></div><div><b>" +
          items.filter(function (x) { return x.t === "admin-fail" && since(x, 7); }).length + "</b><span>Wrong admin passwords · 7 days</span></div></div>" +
          '<div class="dga-row" style="margin-bottom:10px"><select class="dga-in" id="lgT" style="width:auto"><option value="">All events</option><option value="signup">New accounts</option><option value="login">Sign-ins</option><option value="paid">Payments</option><option value="admin">Admin logins</option><option value="admin-fail">Wrong admin passwords</option></select>' +
          '<input class="dga-in" id="lgQ" placeholder="Search name, Gmail, place" style="flex:1;min-width:180px"><button class="dga-btn sm" id="lgCsv">Download CSV</button></div>' +
          '<div class="dga-tw"><table class="dga-t"><thead><tr><th>When (IST)</th><th>Event</th><th>Name</th><th>Gmail</th><th>How</th><th>Place</th><th>Device</th></tr></thead><tbody id="lgRows"></tbody></table></div><p class="dga-muted">Kept for 180 days. Newest first.</p>';
        var draw = function () {
          var ty = root.querySelector("#lgT").value, q = root.querySelector("#lgQ").value.toLowerCase();
          var list = items.filter(function (x) { return (!ty || x.t === ty) && (!q || [x.n, x.e, x.c, x.r].join(" ").toLowerCase().indexOf(q) >= 0); });
          root.querySelector("#lgRows").innerHTML = list.map(function (x) {
            return "<tr><td>" + fmtTime(x.at) + '</td><td><span class="dga-ev ' + esc(x.t) + '">' + esc(EV[x.t] || x.t) + (x.t === "paid" ? " " + rupees(x.a) : "") + "</span></td><td>" + esc(x.n || "—") + "</td><td>" + esc(x.e || "—") + "</td><td>" +
              (x.t === "paid" ? "Razorpay · " + esc(x.dy || "") + " days" : x.m === "password" ? "Password" : "Google") + "</td><td>" + esc(placeOf(x)) + "</td><td>" + esc(x.d || "—") + "</td></tr>";
          }).join("") || '<tr><td colspan="7" class="dga-muted">No entries yet.</td></tr>';
          return list;
        };
        draw(); root.querySelector("#lgT").onchange = draw; root.querySelector("#lgQ").oninput = draw;
        root.querySelector("#lgCsv").onclick = function () { csvDownload("ap-dsc-2026-signin-log.csv", ["time", "event", "name", "gmail", "how", "city", "region", "country", "device", "amount"], draw().map(function (x) { return [x.at, EV[x.t] || x.t, x.n, x.e, x.m || "", x.c, x.r, x.co, x.d, x.a || ""]; })); };
      } else {
        var members = {}; ((res[1] && res[1].users) || []).forEach(function (u) { if (u.v) members[u.v] = u.email; });
        var vis = function (days) { var s = {}; items.forEach(function (x) { if (since(x, days)) s[x.vid] = 1; }); return Object.keys(s).length; };
        var sum = function (f, days) { return items.filter(function (x) { return since(x, days); }).reduce(function (s, x) { return s + (Number(x[f]) || 0); }, 0); };
        var joined = {}; items.forEach(function (x) { if (members[x.vid]) joined[x.vid] = 1; });
        root.innerHTML = '<div class="dga-stats"><div><b>' + vis(1) + "</b><span>Visitors · 24 h</span></div><div><b>" + vis(7) + "</b><span>Visitors · 7 days</span></div><div><b>" + vis(30) + "</b><span>Visitors · 30 days</span></div><div><b>" +
          sum("tests", 30) + "</b><span>Tests started · 30 days</span></div><div><b>" + sum("unlocks", 30) + "</b><span>Unlock taps · 30 days</span></div><div><b>" + Object.keys(joined).length + "</b><span>Became members</span></div></div>" +
          '<div class="dga-row" style="margin-bottom:10px"><input class="dga-in" id="tlQ" placeholder="Search place, device, post, Gmail" style="flex:1;min-width:180px"><button class="dga-btn sm" id="tlCsv">Download CSV</button></div>' +
          '<div class="dga-tw"><table class="dga-t"><thead><tr><th>Date</th><th>Visitor</th><th>Place</th><th>Device</th><th>From</th><th>Post</th><th>Tests</th><th>Unlock taps</th><th>Seen (IST)</th><th>Became member</th></tr></thead><tbody id="tlRows"></tbody></table></div>' +
          '<p class="dga-muted">Free-trial users don’t sign in, so each browser or phone gets an anonymous visitor number. One row per visitor per day, kept for 180 days. When a visitor later creates an account on the same browser, their Gmail shows in the last column.</p>';
        var drawT = function () {
          var q = root.querySelector("#tlQ").value.toLowerCase();
          var list = items.filter(function (x) { return !q || [x.c, x.r, x.d, x.post, members[x.vid], x.vid].join(" ").toLowerCase().indexOf(q) >= 0; });
          root.querySelector("#tlRows").innerHTML = list.map(function (x) {
            return "<tr><td>" + esc(x.date) + '</td><td class="dga-muted">#' + esc(String(x.vid).slice(0, 6)) + "</td><td>" + esc(placeOf(x)) + "</td><td>" + esc(x.d || "—") + "</td><td>" + (x.src === "app" ? "Android app" : "Website") + "</td><td>" + esc(x.post || "—") + "</td><td>" + (x.tests || 0) + "</td><td>" + (x.unlocks || 0) + "</td><td>" +
              fmtTime(x.first).split(", ").pop() + " – " + fmtTime(x.last).split(", ").pop() + "</td><td>" + (members[x.vid] ? '<span class="dga-chip">' + esc(members[x.vid]) + "</span>" : "—") + "</td></tr>";
          }).join("") || '<tr><td colspan="10" class="dga-muted">No free-trial visits yet.</td></tr>';
          return list;
        };
        drawT(); root.querySelector("#tlQ").oninput = drawT;
        root.querySelector("#tlCsv").onclick = function () { csvDownload("ap-dsc-2026-free-trial-log.csv", ["date", "visitor", "city", "region", "country", "device", "from", "post", "tests", "unlock_taps", "first_seen", "last_seen", "member_gmail"], drawT().map(function (x) { return [x.date, x.vid, x.c, x.r, x.co, x.d, x.src, x.post, x.tests, x.unlocks, x.first, x.last, members[x.vid] || ""]; })); };
      }
    }, function () { root.innerHTML = '<p class="dga-err">Could not reach the server.</p>'; });
  }

  /* ---------------- preview-only simulated server (DSC_CFG.demo) ---------------- */
  var Mock = {
    db: function () { var d = store.get("ap26.demo.db"); if (!d) { d = { cfg: { pricePaise: 19900, days: 365 }, users: {}, orders: {} }; } return d; },
    put: function (d) { store.set("ap26.demo.db", d); },
    me: function (d, email) {
      var u = d.users[email]; if (!u) return { ok: false, error: "no_account" };
      var admin = (C.demoAdmins || []).indexOf(email) >= 0, active = admin || Date.parse(u.until || 0) > Date.now();
      var r = { ok: true, user: { email: u.email, name: u.name, picture: "", phone: u.phone, district: u.district, post: u.post, created: u.created, until: u.until || "", admin: admin }, active: active, price: d.cfg.pricePaise / 100, days: d.cfg.days };
      if (active) r.key = C.demoKey; return r;
    },
    handle: function (path, method, body, token) {
      var d = this.db(), now = new Date().toISOString(), DAY = 86400000;
      function save(r) { Mock.put(d); return r; }
      function ext(until, days) { return new Date(Math.max(Date.now(), Date.parse(until || 0) || 0) + days * DAY).toISOString(); }
      function profile(u, b) { if (!b) return; ["name", "phone", "district", "post"].forEach(function (k) { if (b[k] != null) u[k] = String(b[k]); }); }
      d.logs = d.logs || [];
      function log(m) { m.at = now; m.c = "Guntur"; m.r = "Andhra Pradesh"; m.co = "IN"; m.d = /Android/.test(navigator.userAgent) ? "Android · Chrome" : "Windows · Chrome"; d.logs.unshift(m); if (d.logs.length > 300) d.logs.length = 300; }
      if (path === "/dsc/config") return { ok: true, price: d.cfg.pricePaise / 100, days: d.cfg.days };
      if (path === "/dsc/admin/login") {
        if (!body.password) return { ok: false, error: "bad_password", left: 4 };
        var ae = (C.demoAdmins || [])[0] || "admin@raghuslogiclab.com";
        if (!d.users[ae]) d.users[ae] = { email: ae, name: "Raghu", phone: "", district: "", post: "", created: now, until: "", paid: 0, n: 0 };
        log({ t: "admin", e: ae, n: "Raghu", m: "password" }); save();
        var ar = this.me(d, ae); ar.token = "demo." + ae; return ar;
      }
      if (path === "/dsc/login") {
        var g = JSON.parse(body.credential), email = g.email.toLowerCase(), u = d.users[email], isNew = !u;
        if (!u) u = d.users[email] = { email: email, name: g.name || "", phone: "", district: "", post: "", created: now, until: "", paid: 0, n: 0 };
        profile(u, body.profile); log({ t: isNew ? "signup" : "login", e: email, n: u.name, m: "google" }); save();
        var r = this.me(d, email); r.token = "demo." + email; r.isNew = isNew; return r;
      }
      var who = token && token.indexOf("demo.") === 0 ? token.slice(5) : null;
      if (!who || !d.users[who]) return { ok: false, error: "signed_out" };
      var adm = (C.demoAdmins || []).indexOf(who) >= 0;
      if (path === "/dsc/me") return this.me(d, who);
      if (path === "/dsc/profile") { profile(d.users[who], body); save(); return { ok: true }; }
      if (path === "/dsc/order") { var id = "order_DEMO" + Date.now(); d.orders[id] = { email: who, amount: d.cfg.pricePaise, days: d.cfg.days }; save(); var uu = d.users[who]; return { ok: true, orderId: id, amount: d.cfg.pricePaise, currency: "INR", keyId: "rzp_demo", days: d.cfg.days, prefill: { name: uu.name, email: who, contact: uu.phone } }; }
      if (path === "/dsc/verify") { var o = d.orders[body.orderId]; if (!o || o.email !== who) return { ok: false, error: "unknown_order" }; if (!o.paid && body.demoPaid) { o.paid = now; var pu = d.users[who]; pu.until = ext(pu.until, o.days); pu.paid = (pu.paid || 0) + o.amount / 100; pu.n = (pu.n || 0) + 1; log({ t: "paid", e: who, n: pu.name, a: o.amount / 100, dy: o.days }); save(); } return this.me(d, who); }
      if (path.indexOf("/dsc/status") === 0) { return this.me(d, who); }
      if (!adm) return { ok: false, error: "not_admin" };
      if (path === "/dsc/admin") return { ok: true, price: d.cfg.pricePaise / 100, days: d.cfg.days, updated: d.cfg.updated || "", users: Object.keys(d.users).map(function (k) { var x = d.users[k]; return { email: k, name: x.name, phone: x.phone, district: x.district, post: x.post, created: x.created, until: x.until, paid: x.paid, n: x.n }; }).sort(function (a, b) { return String(b.created).localeCompare(String(a.created)); }) };
      if (path.indexOf("/dsc/admin/logs") === 0) return { ok: true, items: path.indexOf("trial") > 0 ? (d.trial || []) : d.logs };
      if (path === "/dsc/admin/config") { var p = Math.round(Number(body.price) * 100), dy = Math.round(Number(body.days)); if (!(p >= 100)) return { ok: false, error: "bad_price" }; if (!(dy >= 1 && dy <= 3650)) return { ok: false, error: "bad_days" }; d.cfg = { pricePaise: p, days: dy, updated: now }; save(); return { ok: true, price: p / 100, days: dy }; }
      if (path === "/dsc/admin/grant") { var e = String(body.email).toLowerCase(), gu = d.users[e] || (d.users[e] = { email: e, name: "", phone: "", district: "", post: "", created: now, until: "", paid: 0, n: 0 }); gu.until = body.days > 0 ? ext(gu.until, body.days) : now; save(); return { ok: true, user: { until: gu.until } }; }
      return { ok: false, error: "not_found" };
    }
  };

  window.DSCAcc = { startGate: startGate, mountBar: mountBar, openAdmin: openAdmin, signOut: signOut, loadJSON: loadJSON, loadText: loadText, ext: EXT, session: session, config: C };
})();
