/**
 * RaghusLogicLab payment worker (Cloudflare Workers, free plan)
 * Confirms a Razorpay payment on the server, so the website can download the PDF automatically.
 *
 *   POST /order    {tool, item}                      -> creates a ₹10 Razorpay order
 *   POST /verify   {orderId, paymentId, signature}   -> checks the payment (signature + Razorpay API)
 *   GET  /status?order=order_xxx                     -> paid yet? (used when the customer comes back from PhonePe / GPay)
 *   POST /consume  {orderId}                        -> marks the order's one PDF as delivered
 *   POST /webhook  (Razorpay -> worker)              -> backup confirmation straight from Razorpay
 *
 * Settings (Worker > Settings > Variables and Secrets):
 *   RZP_KEY_ID          text    rzp_live_xxxxxxxx
 *   RZP_KEY_SECRET      secret  (from Razorpay > Account & Settings > API Keys)
 *   RZP_WEBHOOK_SECRET  secret  (the secret you type when creating the webhook)
 *   PRICE_PAISE         text    1000            (= ₹10)
 *   ALLOWED_ORIGINS     text    https://raghuslogiclab.com,https://www.raghuslogiclab.com
 * Binding: KV namespace bound as ORDERS.
 */
const RZP = "https://api.razorpay.com/v1";
const TTL = 60 * 60 * 24 * 30; // keep order records 30 days

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = corsHeaders(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      if (url.pathname === "/webhook" && req.method === "POST") return await webhook(req, env);
      if (url.pathname === "/order" && req.method === "POST") return json(await createOrder(await body(req), env), cors);
      if (url.pathname === "/verify" && req.method === "POST") return json(await verify(await body(req), env), cors);
      if (url.pathname === "/status" && req.method === "GET") return json(await status(url.searchParams.get("order"), env), cors);
      if (url.pathname === "/consume" && req.method === "POST") return json(await consume(await body(req), env), cors);
      return json({ ok: false, error: "not_found" }, cors, 404);
    } catch (e) {
      return json({ ok: false, error: "server_error" }, cors, 500);
    }
  },
};

async function createOrder(b, env) {
  const amount = Number(env.PRICE_PAISE || 1000);
  const tool = clip(b.tool, 40), item = clip(b.item, 40);
  const r = await rzp(env, "/orders", {
    method: "POST",
    body: JSON.stringify({ amount, currency: "INR", receipt: "rll_" + Date.now(), notes: { tool, item } }),
  });
  if (!r.id) return { ok: false, error: "order_failed" };
  await save(env, r.id, { status: "created", amount, tool, item, created: now() });
  return { ok: true, orderId: r.id, amount, currency: "INR", keyId: env.RZP_KEY_ID };
}

async function verify(b, env) {
  const rec = await load(env, b.orderId);
  if (!rec) return { ok: false, error: "unknown_order" };
  if (rec.status !== "created") return { ok: true, status: rec.status };
  const expected = await hmacHex(env.RZP_KEY_SECRET, b.orderId + "|" + b.paymentId);
  if (!b.signature || !safeEqual(expected, String(b.signature))) return { ok: false, error: "bad_signature" };
  const p = await rzp(env, "/payments/" + encodeURIComponent(b.paymentId));
  return await markIfPaid(env, b.orderId, rec, p);
}

async function status(orderId, env) {
  const rec = await load(env, orderId);
  if (!rec) return { ok: false, error: "unknown_order" };
  if (rec.status !== "created") return { ok: true, status: rec.status };
  // Webhook not here yet? Ask Razorpay directly.
  const list = await rzp(env, "/orders/" + encodeURIComponent(orderId) + "/payments");
  const p = (list.items || []).find((x) => x.status === "captured");
  return p ? await markIfPaid(env, orderId, rec, p) : { ok: true, status: "created" };
}

async function consume(b, env) {
  const rec = await load(env, b.orderId);
  if (!rec) return { ok: false, error: "unknown_order" };
  if (rec.status === "delivered") return { ok: false, error: "already_used", deliveredAt: rec.delivered };
  if (rec.status !== "paid") return { ok: false, error: "not_paid" };
  rec.status = "delivered"; rec.delivered = now();
  await save(env, b.orderId, rec);
  return { ok: true, status: "delivered" };
}

async function webhook(req, env) {
  const raw = await req.text(); // verify the raw body before parsing
  const sig = req.headers.get("X-Razorpay-Signature") || "";
  const expected = await hmacHex(env.RZP_WEBHOOK_SECRET, raw);
  if (!safeEqual(expected, sig)) return new Response("bad signature", { status: 400 });
  const ev = JSON.parse(raw);
  if (ev.event === "payment.captured" || ev.event === "order.paid") {
    const p = ev.payload && ev.payload.payment && ev.payload.payment.entity;
    if (p && p.order_id) {
      const rec = await load(env, p.order_id);
      if (rec && rec.status === "created") await markIfPaid(env, p.order_id, rec, p);
    }
  }
  return new Response("ok", { status: 200 });
}

async function markIfPaid(env, orderId, rec, p) {
  if (!p || p.order_id !== orderId) return { ok: false, error: "payment_mismatch" };
  if (Number(p.amount) !== Number(rec.amount) || p.currency !== "INR") return { ok: false, error: "wrong_amount" };
  if (p.status === "authorized") return { ok: true, status: "created", note: "capturing" };
  if (p.status !== "captured") return { ok: false, error: "not_captured", paymentStatus: p.status };
  rec.status = "paid"; rec.paymentId = p.id; rec.method = p.method || ""; rec.paid = now();
  await save(env, orderId, rec);
  return { ok: true, status: "paid" };
}

/* ---------- helpers ---------- */
async function rzp(env, path, init = {}) {
  const r = await fetch(RZP + path, {
    ...init,
    headers: { Authorization: "Basic " + btoa(env.RZP_KEY_ID + ":" + env.RZP_KEY_SECRET), "Content-Type": "application/json" },
  });
  return r.json();
}
async function hmacHex(secret, msg) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret || ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
async function load(env, id) {
  if (!/^order_[A-Za-z0-9]{6,30}$/.test(String(id || ""))) return null;
  return env.ORDERS.get(id, "json");
}
const save = (env, id, rec) => env.ORDERS.put(id, JSON.stringify(rec), { expirationTtl: TTL });
async function body(req) { try { return await req.json(); } catch (e) { return {}; } }
const clip = (v, n) => String(v == null ? "" : v).slice(0, n);
const now = () => new Date().toISOString();
function corsHeaders(req, env) {
  const allowed = String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim());
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0] || "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}
function json(obj, headers, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, "Content-Type": "application/json" } });
}
