/**
 * RaghusLogicLab payment worker (Cloudflare Workers, free plan)
 * 1) Paid PDF downloads (Aadhaar tools) — unchanged:
 *   POST /order    {tool, item}                      -> creates a ₹10 Razorpay order
 *   POST /verify   {orderId, paymentId, signature}   -> checks the payment (signature + Razorpay API)
 *   GET  /status?order=order_xxx                     -> paid yet? (used when the customer comes back from PhonePe / GPay)
 *   POST /consume  {orderId}                        -> marks the order's one PDF as delivered
 *   POST /webhook  (Razorpay -> worker)              -> backup confirmation straight from Razorpay
 *
 * 2) AP DSC 2026 Exam Hall membership (Google sign-in + paid access for N days):
 *   GET  /dsc/config                                 -> public: price (₹) and validity days
 *   POST /dsc/login   {credential, profile?}         -> Google ID token -> session token (+ creates the account)
 *   GET  /dsc/me                                     -> account, access, and the content key while access is active
 *   POST /dsc/profile {name, phone, district, post}  -> sign-up details
 *   POST /dsc/order                                  -> Razorpay order at the admin's price
 *   POST /dsc/verify  {orderId, paymentId, signature}-> confirms payment, adds the validity days
 *   GET  /dsc/status?order=order_xxx                 -> paid yet? (UPI app round trip)
 *   GET  /dsc/admin                                  -> admin: settings + members
 *   POST /dsc/admin/config {price, days}             -> admin: set price (₹) and validity (days)
 *   POST /dsc/admin/grant  {email, days}             -> admin: add days by hand (0 or negative = remove access)
 *   POST /dsc/admin/login  {password}                -> admin sign-in with the admin password (5 wrong tries = 15 min lock)
 *   GET  /dsc/admin/logs?kind=login|trial            -> admin: sign-in / payment log, free-trial visitor log
 *   POST /dsc/trial  {vid, ev, post, kind, src}      -> free-trial page reports a visit (no login; text/plain body)
 *   (/dsc/* calls send "Authorization: Bearer <session token>")
 *
 * Settings (Worker > Settings > Variables and Secrets):
 *   RZP_KEY_ID          text    rzp_live_xxxxxxxx
 *   RZP_KEY_SECRET      secret  (from Razorpay > Account & Settings > API Keys)
 *   RZP_WEBHOOK_SECRET  secret  (the secret you type when creating the webhook)
 *   PRICE_PAISE         text    1000            (= ₹10, PDF downloads)
 *   ALLOWED_ORIGINS     text    https://raghuslogiclab.com,https://www.raghuslogiclab.com
 *   GOOGLE_CLIENT_ID    text    xxxxxxxx.apps.googleusercontent.com
 *   ADMIN_EMAILS        text    admin Gmail address(es), comma separated
 *   SESSION_SECRET      secret  long random text (signs the login sessions)
 *   DSC_CONTENT_KEY     secret  the content key printed when the site was built
 *   ADMIN_PASSWORD      secret  password for "Admin login" on the sign-in page
 * Binding: KV namespace bound as ORDERS.
 */
const RZP = "https://api.razorpay.com/v1";
const TTL = 60 * 60 * 24 * 30; // keep order records 30 days
const SESSION_DAYS = 30;
const DAY = 86400000;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = corsHeaders(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      const p = url.pathname;
      if (p === "/webhook" && req.method === "POST") return await webhook(req, env);
      if (p === "/order" && req.method === "POST") return json(await createOrder(await body(req), env), cors);
      if (p === "/verify" && req.method === "POST") return json(await verify(await body(req), env), cors);
      if (p === "/status" && req.method === "GET") return json(await status(url.searchParams.get("order"), env), cors);
      if (p === "/consume" && req.method === "POST") return json(await consume(await body(req), env), cors);
      if (p.startsWith("/dsc/")) return json(await dsc(p, req, url, env), cors);
      return json({ ok: false, error: "not_found" }, cors, 404);
    } catch (e) {
      return json({ ok: false, error: "server_error" }, cors, 500);
    }
  },
};

/* ================= PDF downloads (unchanged) ================= */
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
  if (rec.kind === "dsc") return { ok: false, error: "not_a_pdf_order" };
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
  if (rec.kind === "dsc") await grantPaid(env, orderId, rec);
  return { ok: true, status: "paid" };
}

/* ================= AP DSC 2026 membership ================= */
async function dsc(p, req, url, env) {
  if (p === "/dsc/config") { const c = await dscCfg(env); return { ok: true, price: c.pricePaise / 100, days: c.days }; }
  if (p === "/dsc/login" && req.method === "POST") return await dscLogin(await body(req), env, req);
  if (p === "/dsc/admin/login" && req.method === "POST") return await adminLogin(await body(req), req, env);
  if (p === "/dsc/trial" && req.method === "POST") return await trialPing(req, env);

  const email = await sessionEmail(req, env);
  if (!email) return { ok: false, error: "signed_out" };
  const admin = isAdmin(email, env);

  if (p === "/dsc/me") return await dscMe(email, env);
  if (p === "/dsc/profile" && req.method === "POST") {
    const u = await getUser(env, email);
    if (!u) return { ok: false, error: "no_account" };
    applyProfile(u, await body(req));
    await putUser(env, u);
    return { ok: true, user: publicUser(u, admin) };
  }
  if (p === "/dsc/order" && req.method === "POST") return await dscOrder(email, env);
  if (p === "/dsc/verify" && req.method === "POST") {
    const b = await body(req);
    const rec = await load(env, b.orderId);
    if (!rec || rec.kind !== "dsc" || rec.email !== email) return { ok: false, error: "unknown_order" };
    const r = await verify(b, env);
    return r.ok && (r.status === "paid") ? await dscMe(email, env) : r;
  }
  if (p === "/dsc/status") {
    const id = url.searchParams.get("order");
    const rec = await load(env, id);
    if (!rec || rec.kind !== "dsc" || rec.email !== email) return { ok: false, error: "unknown_order" };
    const r = await status(id, env);
    return r.ok && r.status === "paid" ? await dscMe(email, env) : r;
  }

  if (!admin) return { ok: false, error: "not_admin" };
  if (p === "/dsc/admin") {
    const users = [];
    let cursor;
    do {
      const l = await env.ORDERS.list({ prefix: "dsc:u:", cursor });
      for (const k of l.keys) users.push({ email: k.name.slice(6), ...(k.metadata || {}) });
      cursor = l.list_complete ? null : l.cursor;
    } while (cursor && users.length < 5000);
    users.sort((a, b) => String(b.created || "").localeCompare(String(a.created || "")));
    const c = await dscCfg(env);
    return { ok: true, price: c.pricePaise / 100, days: c.days, updated: c.updated || "", users };
  }
  if (p === "/dsc/admin/logs") {
    const kind = url.searchParams.get("kind") === "trial" ? "dsc:t:" : "dsc:l:";
    const out = [];
    let cursor;
    do {
      const l = await env.ORDERS.list({ prefix: kind, cursor, limit: 1000 });
      for (const k of l.keys) out.push(k.metadata || {});
      cursor = l.list_complete ? null : l.cursor;
    } while (cursor && out.length < 3000);
    return { ok: true, kind: url.searchParams.get("kind") || "login", items: out };
  }
  if (p === "/dsc/admin/user") {
    const u = await getUser(env, String(url.searchParams.get("email") || "").toLowerCase());
    return u ? { ok: true, user: u } : { ok: false, error: "no_account" };
  }
  if (p === "/dsc/admin/config" && req.method === "POST") {
    const b = await body(req);
    const price = Math.round(Number(b.price) * 100), days = Math.round(Number(b.days));
    if (!(price >= 100 && price <= 10000000)) return { ok: false, error: "bad_price" };
    if (!(days >= 1 && days <= 3650)) return { ok: false, error: "bad_days" };
    const c = { pricePaise: price, days, updated: now(), by: email };
    await env.ORDERS.put("dsc:cfg", JSON.stringify(c));
    return { ok: true, price: price / 100, days };
  }
  if (p === "/dsc/admin/grant" && req.method === "POST") {
    const b = await body(req);
    const who = String(b.email || "").trim().toLowerCase();
    const days = Math.round(Number(b.days));
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(who)) return { ok: false, error: "bad_email" };
    if (!Number.isFinite(days) || Math.abs(days) > 3650) return { ok: false, error: "bad_days" };
    const u = (await getUser(env, who)) || newUser(who, {});
    if (days > 0) u.until = extend(u.until, days);
    else u.until = days === 0 ? now() : new Date(Math.max(Date.now(), Date.parse(u.until || 0) + days * DAY)).toISOString();
    (u.log = u.log || []).push({ at: now(), by: email, days, kind: "admin" });
    await putUser(env, u);
    return { ok: true, user: publicUser(u, false) };
  }
  return { ok: false, error: "not_found" };
}

async function dscLogin(b, env, req) {
  const g = await verifyGoogle(String(b.credential || ""), env);
  if (!g) return { ok: false, error: "bad_google_token" };
  const email = g.email.toLowerCase();
  let u = await getUser(env, email);
  const isNew = !u;
  if (!u) u = newUser(email, g);
  u.name = u.name || g.name || ""; u.picture = g.picture || u.picture || ""; u.lastLogin = now();
  if (b.profile) applyProfile(u, b.profile);
  if (b.vid && /^[a-z0-9]{6,20}$/.test(String(b.vid))) u.vid = String(b.vid);
  await putUser(env, u);
  await logEvent(env, req, { t: isNew ? "signup" : "login", e: email, n: u.name, m: "google", v: u.vid || "" });
  const token = await makeSession(email, env);
  const me = await dscMe(email, env, u);
  return { ...me, token, isNew, needsProfile: !u.phone };
}

async function dscMe(email, env, u) {
  u = u || (await getUser(env, email));
  if (!u) return { ok: false, error: "no_account" };
  const admin = isAdmin(email, env);
  const c = await dscCfg(env);
  const active = admin || Date.parse(u.until || 0) > Date.now();
  const out = { ok: true, user: publicUser(u, admin), active, price: c.pricePaise / 100, days: c.days };
  if (active) out.key = env.DSC_CONTENT_KEY || "";
  return out;
}

async function dscOrder(email, env) {
  const u = await getUser(env, email);
  if (!u) return { ok: false, error: "no_account" };
  const c = await dscCfg(env);
  const r = await rzp(env, "/orders", {
    method: "POST",
    body: JSON.stringify({ amount: c.pricePaise, currency: "INR", receipt: "dsc_" + Date.now(), notes: { tool: "ap-dsc-2026", email, days: String(c.days) } }),
  });
  if (!r.id) return { ok: false, error: "order_failed" };
  await save(env, r.id, { kind: "dsc", status: "created", amount: c.pricePaise, days: c.days, email, created: now() });
  return { ok: true, orderId: r.id, amount: c.pricePaise, currency: "INR", keyId: env.RZP_KEY_ID, days: c.days,
    prefill: { name: u.name || "", email, contact: u.phone || "" } };
}

async function grantPaid(env, orderId, rec) {
  if (rec.granted) return;
  const u = (await getUser(env, rec.email)) || newUser(rec.email, {});
  u.payments = u.payments || [];
  if (!u.payments.some((x) => x.orderId === orderId)) {
    u.until = extend(u.until, rec.days || 365);
    u.paidTotal = (u.paidTotal || 0) + rec.amount / 100;
    u.payments.push({ orderId, paymentId: rec.paymentId || "", amount: rec.amount / 100, days: rec.days, at: now() });
    await putUser(env, u);
    await logEvent(env, null, { t: "paid", e: u.email, n: u.name, a: rec.amount / 100, dy: rec.days });
  }
  rec.granted = now();
  await save(env, orderId, rec);
}

/* ---------- accounts ---------- */
async function dscCfg(env) {
  const c = (await env.ORDERS.get("dsc:cfg", "json")) || {};
  return { pricePaise: Number(c.pricePaise) || Number(env.DSC_PRICE_PAISE) || 19900, days: Number(c.days) || Number(env.DSC_DAYS) || 365, updated: c.updated };
}
function newUser(email, g) {
  return { email, name: g.name || "", picture: g.picture || "", phone: "", district: "", post: "", created: now(), until: "", payments: [], paidTotal: 0 };
}
function applyProfile(u, b) {
  if (b.name != null) u.name = clip(String(b.name).trim(), 80) || u.name;
  if (b.phone != null) u.phone = clip(String(b.phone).replace(/[^\d+]/g, ""), 15);
  if (b.district != null) u.district = clip(String(b.district).trim(), 40);
  if (b.post != null) u.post = clip(String(b.post).trim(), 40);
}
function publicUser(u, admin) {
  return { email: u.email, name: u.name, picture: u.picture, phone: u.phone, district: u.district, post: u.post,
    created: u.created, until: u.until || "", admin: !!admin, payments: (u.payments || []).length };
}
const getUser = (env, email) => (email ? env.ORDERS.get("dsc:u:" + email, "json") : null);
function putUser(env, u) {
  const metadata = { name: clip(u.name, 60), phone: u.phone || "", district: clip(u.district, 30), post: clip(u.post, 30),
    created: u.created, until: u.until || "", paid: u.paidTotal || 0, n: (u.payments || []).length, v: u.vid || "" };
  return env.ORDERS.put("dsc:u:" + u.email, JSON.stringify(u), { metadata });
}
function extend(until, days) {
  const base = Math.max(Date.now(), Date.parse(until || 0) || 0);
  return new Date(base + days * DAY).toISOString();
}
function adminEmails(env) {
  const l = String(env.ADMIN_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  return l.length ? l : ["admin@raghuslogiclab.com"];
}
function isAdmin(email, env) { return adminEmails(env).includes(email); }

/* ---------- admin password ---------- */
async function adminLogin(b, req, env) {
  if (!env.ADMIN_PASSWORD) return { ok: false, error: "not_set" };
  const ip = req.headers.get("CF-Connecting-IP") || "unknown";
  const lk = "dsc:lock:" + ip;
  const lock = (await env.ORDERS.get(lk, "json")) || { n: 0, at: 0 };
  const fresh = Date.now() - lock.at < 15 * 60000;
  if (fresh && lock.n >= 5) return { ok: false, error: "locked" };
  const good = safeEqual(await hmacHex("rll-admin", String(b.password || "")), await hmacHex("rll-admin", env.ADMIN_PASSWORD));
  if (!good) {
    await env.ORDERS.put(lk, JSON.stringify({ n: (fresh ? lock.n : 0) + 1, at: Date.now() }), { expirationTtl: 3600 });
    await logEvent(env, req, { t: "admin-fail", e: "", n: "", m: "password" });
    return { ok: false, error: "bad_password", left: Math.max(0, 4 - (fresh ? lock.n : 0)) };
  }
  if (lock.n) await env.ORDERS.delete(lk);
  const email = adminEmails(env)[0];
  const u = (await getUser(env, email)) || newUser(email, { name: "Admin" });
  u.lastLogin = now();
  await putUser(env, u);
  await logEvent(env, req, { t: "admin", e: email, n: u.name, m: "password" });
  const token = await makeSession(email, env, 7);
  return { ...(await dscMe(email, env, u)), token };
}

/* ---------- logs (kept 180 days) ---------- */
const LOG_TTL = 60 * 60 * 24 * 180;
function place(req) {
  const cf = (req && req.cf) || {};
  return { c: clip(cf.city || "", 40), r: clip(cf.region || "", 40), co: clip(cf.country || "", 4) };
}
function device(req) {
  const ua = (req && req.headers.get("User-Agent")) || "";
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iPod/i.test(ua) ? "iPhone/iPad" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "Mac" : /Linux/i.test(ua) ? "Linux" : "Other";
  const br = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return br ? os + " · " + br : os;
}
const rev = (n, w) => String(Math.pow(10, w) - 1 - n).padStart(w, "0");
async function logEvent(env, req, m) {
  try {
    const meta = { ...m, at: now(), ...place(req), d: req ? device(req) : "" };
    const key = "dsc:l:" + rev(Date.now(), 13) + ":" + Math.random().toString(36).slice(2, 6);
    await env.ORDERS.put(key, "1", { metadata: meta, expirationTtl: LOG_TTL });
  } catch (e) {}
}
function istDate() {
  const d = new Date(Date.now() + 5.5 * 3600000);
  return d.toISOString().slice(0, 10);
}
async function trialPing(req, env) {
  let b = {};
  try { b = JSON.parse(await req.text()); } catch (e) { return { ok: false }; }
  const vid = String(b.vid || "");
  if (!/^[a-z0-9]{6,20}$/.test(vid)) return { ok: false };
  const ev = ["open", "test", "unlock"].includes(b.ev) ? b.ev : "open";
  const date = istDate();
  const key = "dsc:t:" + rev(Number(date.replace(/-/g, "")), 8) + ":" + vid;
  const old = await env.ORDERS.getWithMetadata(key);
  const m = old && old.metadata ? old.metadata : { vid, date, first: now(), tests: 0, unlocks: 0, w: 0, ...place(req), d: device(req), src: b.src === "app" ? "app" : "web" };
  if (m.w >= 15) return { ok: true, capped: true }; // keep KV writes low
  if (ev === "test") m.tests++;
  if (ev === "unlock") m.unlocks++;
  if (b.post) m.post = clip(b.post, 32);
  if (ev === "test" && b.kind) m.k = clip(b.kind, 12);
  m.last = now(); m.w++;
  await env.ORDERS.put(key, "1", { metadata: m, expirationTtl: LOG_TTL });
  return { ok: true };
}

/* ---------- sessions (HMAC-signed, 30 days) ---------- */
async function makeSession(email, env, days) {
  const payload = b64u(new TextEncoder().encode(JSON.stringify({ e: email, x: Date.now() + (days || SESSION_DAYS) * DAY })));
  return payload + "." + (await hmacHex(env.SESSION_SECRET, payload));
}
async function sessionEmail(req, env) {
  const h = req.headers.get("Authorization") || "";
  const tok = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  const [payload, sig] = tok.split(".");
  if (!payload || !sig || !env.SESSION_SECRET) return null;
  if (!safeEqual(await hmacHex(env.SESSION_SECRET, payload), sig)) return null;
  try {
    const d = JSON.parse(new TextDecoder().decode(unb64u(payload)));
    return d.x > Date.now() ? String(d.e) : null;
  } catch (e) { return null; }
}

/* ---------- Google ID token check (RS256, Google's public keys) ---------- */
let gKeys = null, gKeysAt = 0;
async function googleKeys(force) {
  if (!force && gKeys && Date.now() - gKeysAt < 3600000) return gKeys;
  const r = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  gKeys = (await r.json()).keys || []; gKeysAt = Date.now();
  return gKeys;
}
async function verifyGoogle(cred, env) {
  const parts = cred.split(".");
  if (parts.length !== 3 || !env.GOOGLE_CLIENT_ID) return null;
  let header, claims;
  try {
    header = JSON.parse(new TextDecoder().decode(unb64u(parts[0])));
    claims = JSON.parse(new TextDecoder().decode(unb64u(parts[1])));
  } catch (e) { return null; }
  if (header.alg !== "RS256") return null;
  let jwk = (await googleKeys()).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await googleKeys(true)).find((k) => k.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, unb64u(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  if (!ok) return null;
  const nowS = Date.now() / 1000;
  if (!["accounts.google.com", "https://accounts.google.com"].includes(claims.iss)) return null;
  if (claims.aud !== env.GOOGLE_CLIENT_ID) return null;
  if (!(claims.exp > nowS - 60)) return null;
  if (!claims.email || claims.email_verified === false || claims.email_verified === "false") return null;
  return claims;
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
function b64u(bytes) {
  let s = ""; for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64u(s) {
  s = String(s).replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
  const bin = atob(s); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
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
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}
function json(obj, headers, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, "Content-Type": "application/json" } });
}
