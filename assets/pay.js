/*
  RaghusLogicLab — ₹10 pay-per-PDF step (UPI QR, PhonePe / UPI app buttons, optional Razorpay link).
  Usage from a tool page:
    const paid = await RLLPay.request({ item: "Annexure I" });   // null if the visitor cancels
    if (paid) { ...build and save the PDF...; paid.utr is the UPI reference they entered }
  Settings live in assets/pay-config.js.
  Note: this is a static site, so the UPI reference is checked for format only (12 digits).
  Match references against your PhonePe / bank history.
*/
(function () {
  "use strict";

  var CSS = '' +
    '.rllpay-back{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto}' +
    '.rllpay{background:#fff;color:#0f172a;border-radius:16px;max-width:430px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.35);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow:hidden}' +
    '.rllpay-head{background:#1d4ed8;color:#fff;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}' +
    '.rllpay-head h2{margin:0;font-size:1.1rem;font-weight:700}' +
    '.rllpay-price{background:#fff;color:#1d4ed8;font-weight:800;border-radius:999px;padding:3px 12px;font-size:1rem;white-space:nowrap}' +
    '.rllpay-body{padding:16px 20px 20px}' +
    '.rllpay-step{font-size:.78rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#1d4ed8;margin:0 0 6px}' +
    '.rllpay-qr{display:flex;justify-content:center;margin:6px 0 4px}' +
    '.rllpay-qr svg{width:200px;height:200px;border:1px solid #e2e8f0;border-radius:10px;padding:6px;background:#fff}' +
    '.rllpay-hint{text-align:center;color:#475569;font-size:.85rem;margin:0 0 10px}' +
    '.rllpay-upi{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;font-size:.88rem}' +
    '.rllpay-upi code{background:#eff6ff;color:#1e3a8a;padding:3px 8px;border-radius:6px;font-weight:600;user-select:all}' +
    '.rllpay-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px}' +
    '.rllpay-btn{flex:1 1 auto;display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid #1d4ed8;background:#fff;color:#1d4ed8;border-radius:10px;padding:10px 12px;font:600 .9rem system-ui,sans-serif;text-decoration:none;cursor:pointer}' +
    '.rllpay-btn:hover{background:#eff6ff}' +
    '.rllpay-btn.solid{background:#1d4ed8;color:#fff}' +
    '.rllpay-btn.solid:hover{background:#1e40af}' +
    '.rllpay-btn.pp{border-color:#5f259f;color:#5f259f}' +
    '.rllpay-btn.small{flex:none;padding:4px 10px;font-size:.8rem;border-radius:8px}' +
    '.rllpay-btn:disabled{opacity:.5;cursor:not-allowed}' +
    '.rllpay hr{border:0;border-top:1px solid #e2e8f0;margin:14px 0}' +
    '.rllpay label{display:block;font-weight:600;font-size:.88rem;margin-bottom:6px}' +
    '.rllpay input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;font:600 1.05rem ui-monospace,Consolas,monospace;letter-spacing:.08em}' +
    '.rllpay input:focus{outline:2px solid #93c5fd;border-color:#1d4ed8}' +
    '.rllpay-err{color:#b91c1c;font-size:.85rem;min-height:1.2em;margin:6px 0 8px}' +
    '.rllpay-note{color:#64748b;font-size:.78rem;margin:10px 0 0}' +
    '.rllpay-off{background:#fef9c3;color:#713f12;border-radius:10px;padding:12px;font-size:.9rem}' +
    '@media (prefers-reduced-motion:no-preference){.rllpay{animation:rllpayIn .18s ease-out}@keyframes rllpayIn{from{transform:translateY(10px);opacity:0}to{transform:none;opacity:1}}}';

  function cfg() {
    var c = window.RLL_PAY_CONFIG || {};
    return {
      upiId: String(c.upiId || "").trim(),
      payeeName: String(c.payeeName || "RaghusLogicLab").trim(),
      amount: Number(c.amount) > 0 ? Number(c.amount) : 10,
      razorpayUrl: String(c.razorpayUrl || "").trim()
    };
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function upiParams(c, note) {
    return "pa=" + c.upiId.replace(/[^A-Za-z0-9.\-_@]/g, "") +
      "&pn=" + encodeURIComponent(c.payeeName) +
      "&am=" + encodeURIComponent(c.amount.toFixed(2)) +
      "&cu=INR&tn=" + encodeURIComponent(note);
  }

  function qrSvg(text) {
    if (typeof window.qrcode !== "function") return "";
    try {
      var q = window.qrcode(0, "M");
      q.addData(text); q.make();
      return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
    } catch (e) { return ""; }
  }

  function injectCss() {
    if (document.getElementById("rllpay-css")) return;
    var s = document.createElement("style"); s.id = "rllpay-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function copyText(t, btn) {
    function done() { if (btn) { var o = btn.textContent; btn.textContent = "Copied"; setTimeout(function () { btn.textContent = o; }, 1500); } }
    try {
      if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(t).then(done, done); return; }
    } catch (e) {}
    var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    ta.remove(); done();
  }

  function request(opts) {
    opts = opts || {};
    var c = cfg();
    var item = String(opts.item || "PDF").slice(0, 30);
    injectCss();

    return new Promise(function (resolve) {
      var back = document.createElement("div");
      back.className = "rllpay-back";
      back.setAttribute("role", "dialog");
      back.setAttribute("aria-modal", "true");
      back.setAttribute("aria-labelledby", "rllpay-title");

      var note = ("RLL PDF " + item).slice(0, 40);
      var price = "₹" + c.amount;
      var html = '<div class="rllpay"><div class="rllpay-head"><h2 id="rllpay-title">Download PDF</h2><span class="rllpay-price">' + esc(price) + '</span></div><div class="rllpay-body">';

      if (!c.upiId && !c.razorpayUrl) {
        html += '<div class="rllpay-off">PDF downloads are being set up and will open shortly. Please check back soon.</div>' +
          '<div class="rllpay-row" style="margin-top:14px"><button type="button" class="rllpay-btn" data-act="cancel">Close</button></div>';
      } else {
        html += '<p class="rllpay-step">Step 1 · Pay ' + esc(price) + '</p>';
        if (c.upiId) {
          var link = "upi://pay?" + upiParams(c, note);
          var svg = qrSvg(link);
          if (svg) html += '<div class="rllpay-qr" aria-label="UPI QR code for ' + esc(price) + '">' + svg + '</div>' +
            '<p class="rllpay-hint">Scan with PhonePe, Google Pay, Paytm or any UPI app</p>';
          html += '<div class="rllpay-upi">UPI ID <code>' + esc(c.upiId) + '</code><button type="button" class="rllpay-btn small" data-act="copy">Copy</button></div>' +
            '<div class="rllpay-row">' +
              '<a class="rllpay-btn pp" href="phonepe://pay?' + esc(upiParams(c, note)) + '">Pay with PhonePe</a>' +
              '<a class="rllpay-btn" href="' + esc(link) + '">Other UPI app</a>' +
            '</div>' +
            '<p class="rllpay-note" style="margin-top:0">On a phone, the buttons open your UPI app with ' + esc(price) + ' filled in.</p>';
        }
        if (c.razorpayUrl) {
          html += (c.upiId ? '<p class="rllpay-hint" style="margin:10px 0 6px">or</p>' : '') + '<div class="rllpay-row"><a class="rllpay-btn solid" style="background:#0b72e7;border-color:#0b72e7" href="' + esc(c.razorpayUrl) + '" target="_blank" rel="noopener">Pay ' + esc(price) + ' with Razorpay (UPI, card, net banking, wallet)</a></div>' + '<p class="rllpay-note" style="margin-top:0">Razorpay opens in a new tab. After paying, copy the Payment ID (starts with pay_) from the receipt and come back here.</p>';
        }
        html += '<hr><p class="rllpay-step">Step 2 · Enter your payment reference</p>' +
          '<label for="rllpay-utr">' + (c.razorpayUrl ? '12-digit UPI reference (UTR) or Razorpay Payment ID (pay_\u2026)' : '12-digit UPI reference number (UTR / UPI Ref No.)') + '</label>' +
          '<input id="rllpay-utr" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="24" placeholder="e.g. 428812345678 or pay_Abc123\u2026">' +
          '<div class="rllpay-err" id="rllpay-err" role="alert"></div>' +
          '<div class="rllpay-row"><button type="button" class="rllpay-btn solid" data-act="ok">I’ve paid — Download PDF</button></div>' +
          '<div class="rllpay-row"><button type="button" class="rllpay-btn" data-act="cancel">Cancel</button></div>' +
          '<p class="rllpay-note">Find the reference in your UPI app under the payment details (“UPI Ref No.” or “UTR”). One payment = one PDF download. Payments are matched against our UPI statement.</p>';
      }
      html += '</div></div>';
      back.innerHTML = html;
      document.body.appendChild(back);

      var prevFocus = document.activeElement;
      var input = back.querySelector("#rllpay-utr");
      var err = back.querySelector("#rllpay-err");
      (input || back.querySelector("[data-act]")).focus();

      function close(result) {
        document.removeEventListener("keydown", onKey);
        back.remove();
        if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) {}
        resolve(result);
      }
      function onKey(e) {
        if (e.key === "Escape") close(null);
        if (e.key === "Enter" && input && document.activeElement === input) submit();
      }
      function submit() {
        var utr = (input.value || "").replace(/\s+/g, "");
        var okUtr = /^\d{12}$/.test(utr), okRzp = !!c.razorpayUrl && /^pay_[A-Za-z0-9]{14}$/.test(utr);
        if (!okUtr && !okRzp) {
          err.textContent = c.razorpayUrl ? "Enter the 12-digit UPI reference, or the Razorpay Payment ID that starts with pay_." : "Enter the 12-digit UPI reference number from your payment (numbers only).";
          input.focus(); return;
        }
        close({ utr: utr, method: okRzp ? "razorpay" : "upi", amount: c.amount, item: item, at: new Date().toISOString() });
      }
      document.addEventListener("keydown", onKey);
      back.addEventListener("click", function (e) {
        var b = e.target.closest("[data-act]");
        if (e.target === back) { close(null); return; }
        if (!b) return;
        var act = b.getAttribute("data-act");
        if (act === "cancel") close(null);
        if (act === "ok") submit();
        if (act === "copy") copyText(c.upiId, b);
      });
      if (input) input.addEventListener("input", function () { err.textContent = ""; input.value = input.value.replace(/[^A-Za-z0-9_\s]/g, ""); });
    });
  }

  window.RLLPay = { request: request, config: cfg };
})();
