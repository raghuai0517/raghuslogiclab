/*
  RaghusLogicLab — visit and download log for the Site Admin page (site-admin.html).
  Sends to the rll-pay worker (POST /t): page opened, file downloaded, page printed.
  Sent: a random visitor number kept in this browser (same one the DSC free trial uses), the page,
  the file name, the site the visitor came from, and — only when the visitor is signed in to
  AP DSC 2026 Exam Hall — their session, so the admin sees their Gmail. The worker adds city and device.
  No form contents, Aadhaar numbers or file contents are ever sent.
  Pages can log their own events with  RLLT.ev("download", "file name").
  Turned off in a browser where the admin chose "Don't count my visits" on site-admin.html.
*/
(function () {
  "use strict";
  if (window.RLLT) return;
  var API = "https://rll-pay.raghusreenivas-pudeti.workers.dev";
  var VK = "ap26t.vid";

  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function vid() {
    var v = null;
    try { v = JSON.parse(ls(VK) || "null"); } catch (e) {}
    if (!v || !/^[a-z0-9]{6,20}$/.test(v)) {
      v = (Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)).replace(/[^a-z0-9]/g, "");
      try { localStorage.setItem(VK, JSON.stringify(v)); } catch (e) {}
    }
    return v;
  }
  function off() {
    if (ls("rll.notrack") === "1") return true;
    if (navigator.webdriver) return true;
    var h = location.hostname;
    return !(h === "raghuslogiclab.com" || h === "www.raghuslogiclab.com" || /[?&]rlltrack=1/.test(location.search));
  }
  function token() {
    try { var s = JSON.parse(ls("ap26.session") || "null"); return s && s.token && s.token.indexOf("demo.") !== 0 ? s.token : ""; }
    catch (e) { return ""; }
  }
  function payRef() {
    var keys = ["rll_pending_order_v1", "rll_pending_pay_v1"], stores = [];
    try { stores.push(sessionStorage); } catch (e) {}
    try { stores.push(localStorage); } catch (e) {}
    for (var i = 0; i < stores.length; i++) for (var j = 0; j < keys.length; j++) {
      try { var p = JSON.parse(stores[i].getItem(keys[j]) || "null"); if (p) return String(p.paymentId || p.orderId || p.utr || "").slice(0, 40); } catch (e) {}
    }
    return "";
  }
  function isApp() { try { return !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()); } catch (e) { return false; } }

  var last = {};
  function ev(kind, item) {
    if (off()) return;
    item = String(item || "").slice(0, 160);
    var key = kind + "|" + item, t = Date.now();
    if (kind !== "view" && last[key] && t - last[key] < 4000) return; // same file twice in a row = one download
    last[key] = t;
    var body = {
      vid: vid(), ev: kind, path: location.pathname, title: (document.title || "").slice(0, 120), item: item,
      ref: kind === "view" ? document.referrer || "" : "", tok: token(), src: isApp() ? "app" : "web",
      pay: kind === "view" ? "" : payRef()
    };
    var data = JSON.stringify(body);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(API + "/t", new Blob([data], { type: "text/plain" }))) return;
    } catch (e) {}
    try { fetch(API + "/t", { method: "POST", mode: "no-cors", keepalive: true, body: data }).catch(function () {}); } catch (e) {}
  }

  /* ---------- downloads ---------- */
  var FILE = /\.(pdf|apk|aab|docx?|xlsx?|csv|zip|pptx?|png|jpe?g|txt|json)(\?|#|$)/i;
  /* Pages with personal documents (Aadhaar, SADAREM) carry <meta name="rll-track-files" content="type-only">:
     only the file type is logged there, never the file name (it can hold the card holder's name). */
  function typeOnly() { return !!document.querySelector('meta[name="rll-track-files"][content="type-only"]'); }
  function nameOf(a) {
    if (typeOnly()) {
      var x = ((a.getAttribute("download") || a.getAttribute("href") || "").split(/[?#]/)[0].match(/\.([a-z0-9]{2,5})$/i) || [])[1];
      return x ? x.toUpperCase() + " file" : "File";
    }
    var n = a.getAttribute("download");
    if (n) return n;
    var h = a.getAttribute("href") || "";
    try { return decodeURIComponent(h.split(/[?#]/)[0].split("/").pop()) || h; } catch (e) { return h; }
  }
  function isDownload(a) {
    if (!a || !a.getAttribute) return false;
    var h = a.getAttribute("href") || "";
    return a.hasAttribute("download") || (FILE.test(h) && !/^(mailto|tel|javascript):/i.test(h));
  }
  function seen(a) { if (isDownload(a)) ev("download", nameOf(a)); }

  var AP = window.HTMLAnchorElement && HTMLAnchorElement.prototype;
  if (AP && AP.click) {
    var oc = AP.click;
    AP.click = function () { try { seen(this); } catch (e) {} return oc.apply(this, arguments); };
  }
  if (window.EventTarget && EventTarget.prototype.dispatchEvent) {
    var od = EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent = function (e) {
      try { if (e && e.type === "click" && AP && this instanceof HTMLAnchorElement) seen(this); } catch (x) {}
      return od.apply(this, arguments);
    };
  }
  function onClick(e) {
    if (!e.isTrusted) return; // programmatic clicks are caught above
    var a = e.target && e.target.closest ? e.target.closest("a") : null;
    if (a) seen(a);
  }
  document.addEventListener("click", onClick, true);
  document.addEventListener("auxclick", onClick, true);

  /* ---------- printing and PDFs opened in a new tab ---------- */
  if (window.print) {
    var op = window.print;
    window.print = function () { ev("print", document.title); return op.apply(this, arguments); };
  }
  if (window.open) {
    var oo = window.open;
    window.open = function (u) {
      try { var s = String(u || ""); if (/^blob:|^data:application\/pdf/.test(s) || FILE.test(s)) ev("download", FILE.test(s) && !typeOnly() ? s.split(/[?#]/)[0].split("/").pop() : "PDF opened in new tab"); } catch (e) {}
      return oo.apply(this, arguments);
    };
  }

  /* after a page replaces itself with document.write (AP DSC 2026 full tool), call RLLT.rebind() */
  function rebind() { document.addEventListener("click", onClick, true); document.addEventListener("auxclick", onClick, true); }
  window.RLLT = { ev: ev, vid: vid, rebind: rebind };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { ev("view"); });
  else ev("view");
})();
