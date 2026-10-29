/*
  RaghusLogicLab — automatic ₹10 payment (Razorpay Checkout + the "rll-pay" Cloudflare worker).
  Load it AFTER pay.js. It does nothing until apiUrl is set in pay-config.js.
  Private testing: with testApiUrl set, add ?paytest=1 to a tool's address. Only that visit uses the
  automatic flow (against testApiUrl); customers keep the manual box.

  When apiUrl is set:
    - "Pay ₹10 & Download PDF" opens Razorpay's checkout (PhonePe / Google Pay / any UPI app, QR on a computer).
    - The worker confirms the payment with Razorpay, then the PDF downloads by itself. No ID to type.
    - If the customer's phone reloads the page after the UPI app, resume() finishes the download.
    - If the worker can't be reached, it shows "payments unavailable, try again" (no manual ID box).

  Interface used by the tool pages (same as pay.js, plus resume):
    const paid = await RLLPay.request({ item, tool, snapshot });   // null if not paid
    RLLPay.complete();                                             // after the PDF is saved
    RLLPay.resume().then(back => ...)                              // on page load: { orderId, snapshot } or null
*/
(function () {
  "use strict";
  var manual = window.RLLPay || null;
  var cfg = window.RLL_PAY_CONFIG || {};
  var TEST = /[?&]paytest=1(&|$)/.test(location.search);
  var API = String((TEST ? cfg.testApiUrl : cfg.apiUrl) || "").trim().replace(/\/+$/, "");

  if (!API) {
    // Switch is off: keep the manual flow, just give the pages a harmless resume().
    if (manual) { manual.auto = false; if (!manual.resume) manual.resume = function () { return Promise.resolve(null); }; }
    return;
  }

  var PENDING = "rll_pending_order_v1", SNAP = "rll_form_snapshot_v1", MAX_AGE = 2 * 60 * 60 * 1000;
  var CHECKOUT_JS = "https://checkout.razorpay.com/v1/checkout.js";
  var price = Number(cfg.amount) > 0 ? Number(cfg.amount) : 10;

  function post(path, data) {
    return fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      .then(function (r) { return r.json(); });
  }
  function get(path) { return fetch(API + path, { cache: "no-store" }).then(function (r) { return r.json(); }); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function pending() {
    try {
      var p = JSON.parse(localStorage.getItem(PENDING) || "null");
      if (p && p.orderId && Date.now() - p.at < MAX_AGE) return p;
    } catch (e) {}
    return null;
  }
  function setPending(p) { try { localStorage.setItem(PENDING, JSON.stringify(p)); } catch (e) {} }
  function clearAll() { try { localStorage.removeItem(PENDING); sessionStorage.removeItem(SNAP); } catch (e) {} }
  function saveSnap(s) { try { if (s) sessionStorage.setItem(SNAP, JSON.stringify(s)); } catch (e) {} }
  function readSnap() { try { return JSON.parse(sessionStorage.getItem(SNAP) || "null"); } catch (e) { return null; } }

  var checkoutLoading = null;
  function loadCheckout() {
    if (typeof window.Razorpay === "function") return Promise.resolve();
    if (checkoutLoading) return checkoutLoading;
    checkoutLoading = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = CHECKOUT_JS; s.async = true;
      var t = setTimeout(function () { reject(new Error("checkout_timeout")); }, 15000);
      s.onload = function () { clearTimeout(t); typeof window.Razorpay === "function" ? resolve() : reject(new Error("checkout_missing")); };
      s.onerror = function () { clearTimeout(t); reject(new Error("checkout_blocked")); };
      document.head.appendChild(s);
    }).catch(function (e) { checkoutLoading = null; throw e; });
    return checkoutLoading;
  }

  /* Ask the worker until the order is paid (or time runs out). */
  function waitForPaid(orderId, seconds) {
    var until = Date.now() + seconds * 1000;
    return (function loop() {
      return get("/status?order=" + encodeURIComponent(orderId)).then(function (s) {
        if (s.status === "paid" || s.status === "delivered") return s.status;
        if (Date.now() > until) return "created";
        return wait(3000).then(loop);
      }, function () { return Date.now() > until ? "error" : wait(3000).then(loop); });
    })();
  }

  var lastError = "";
  function unavailable() {
    lastError = "unavailable"; window.RLLPay.lastError = lastError;
    return null;
  }

  function request(opts) {
    opts = opts || {};
    lastError = ""; window.RLLPay.lastError = "";
    var p = pending();
    if (p && p.paid) return Promise.resolve({ orderId: p.orderId, utr: p.paymentId || p.orderId, method: "razorpay", auto: true, resumed: true });

    var order;
    return post("/order", { tool: opts.tool || location.pathname.split("/").pop(), item: opts.item || "PDF" })
      .then(function (o) { if (!o || !o.ok) throw new Error((o && o.error) || "order_failed"); order = o; return loadCheckout(); })
      .then(function () { return openCheckout(order, opts); },
            function () { return unavailable(); }); // worker or Razorpay script unreachable
  }

  function openCheckout(o, opts) {
    var rec = { orderId: o.orderId, at: Date.now(), item: opts.item || "" };
    setPending(rec); saveSnap(opts.snapshot);
    return new Promise(function (resolve) {
      var done = false;
      function finish(status, paymentId) {
        if (done) return; done = true;
        if (status === "paid") {
          rec.paid = true; rec.paymentId = paymentId || ""; setPending(rec);
          resolve({ orderId: o.orderId, utr: paymentId || o.orderId, method: "razorpay", auto: true });
        } else {
          if (status === "delivered") clearAll();
          resolve(null); // not paid: the order stays pending, so resume() can still catch a late payment
        }
      }
      var rz = new window.Razorpay({
        key: o.keyId, order_id: o.orderId, amount: o.amount, currency: o.currency || "INR",
        name: "RaghusLogicLab", description: String(opts.item || "PDF download").slice(0, 60),
        theme: { color: "#1d4ed8" },
        handler: function (resp) {
          post("/verify", { orderId: o.orderId, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature })
            .then(function (v) { return v.status === "paid" ? "paid" : waitForPaid(o.orderId, 90); },
                  function () { return waitForPaid(o.orderId, 90); })
            .then(function (st) { finish(st, resp.razorpay_payment_id); });
        },
        modal: {
          ondismiss: function () { // closed the window: maybe they paid in PhonePe / GPay anyway
            waitForPaid(o.orderId, 6).then(function (st) { finish(st); });
          }
        }
      });
      rz.on("payment.failed", function () { /* Checkout shows the error and lets them retry */ });
      rz.open();
    });
  }

  /* Call after the PDF is saved. */
  function complete() {
    if (manual && manual.complete) try { manual.complete(); } catch (e) {}
    var p = pending();
    if (p && p.paid) { clearAll(); return post("/consume", { orderId: p.orderId }).catch(function () {}); }
    return Promise.resolve();
  }

  /* Call on page load. Returns { orderId, snapshot } when a paid order still needs its PDF. */
  function resume() {
    var p = pending();
    if (!p) return Promise.resolve(null);
    return waitForPaid(p.orderId, p.paid ? 1 : 20).then(function (st) {
      if (st === "paid") { p.paid = true; setPending(p); return { orderId: p.orderId, snapshot: readSnap() }; }
      if (st === "delivered") clearAll();
      return null;
    });
  }

  window.RLLPay = { request: request, complete: complete, resume: resume, auto: true, test: TEST, price: price, manual: manual,
    config: manual && manual.config };
})();
