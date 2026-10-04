// Full API test against a real MongoDB. Uses the database "Restaurant_test" (dropped before and after).
// If MongoDB is not reachable the tests are skipped (set TEST_MONGO_URI to use another server).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";

const URI = process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27017/Restaurant_test";
Object.assign(process.env, { MONGO_URI: URI, JWT_SECRET: "test-secret-test-secret-test-secret", ADMIN_EMAIL: "admin@gmail.com", ADMIN_PASSWORD: "admin123", MONGO_SELECT_TIMEOUT_MS: "2500", NODE_ENV: "test" });
delete process.env.SKIP_DB;

let ready = false, server, base, mongoose;
before(async () => {
  try {
    mongoose = (await import("mongoose")).default;
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 2500 });
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  } catch { return; }
  const { default: app } = await import("../app.js");
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
  ready = true;
});
after(async () => {
  if (server) await new Promise((r) => server.close(r));
  if (ready) { await mongoose.connection.dropDatabase().catch(() => {}); await mongoose.disconnect(); }
});

const api = async (path, { method = "GET", token, body } = {}) => {
  const res = await fetch(base + path, { method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const buf = Buffer.from(await res.arrayBuffer());
  let data = null; try { data = JSON.parse(buf.toString()); } catch { /* binary */ }
  return { status: res.status, data, headers: res.headers, buf };
};
const itest = (name, fn) => test(name, async (t) => { if (!ready) return t.skip("MongoDB not reachable"); await fn(t); });

const S = {};
const PNG = "data:image/png;base64," + Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), Buffer.alloc(64, 1)]).toString("base64");
const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();

itest("the database holds no menu data (menu is served by the frontend)", async () => {
  assert.equal((await api("/api/menu")).status, 404);
  const names = (await mongoose.connection.db.listCollections().toArray()).map((c) => c.name);
  assert.ok(!names.some((n) => /dish|categor|menu/i.test(n)), `unexpected collections: ${names}`);
});

itest("customer registers, duplicate is blocked, login works", async () => {
  const reg = await api("/api/auth/register", { method: "POST", body: { name: "Asha Rao", email: "Asha@Example.com", phone: "98765 43210", password: "secret123" } });
  assert.equal(reg.status, 201); assert.equal(reg.data.user.role, "customer"); assert.equal(reg.data.user.email, "asha@example.com");
  S.user = reg.data.token;
  assert.equal((await api("/api/auth/register", { method: "POST", body: { name: "Asha Rao", email: "asha@example.com", phone: "9876543210", password: "secret123" } })).status, 409);
  assert.equal((await api("/api/auth/login", { method: "POST", body: { email: "asha@example.com", password: "wrong" } })).status, 401);
  const ok = await api("/api/auth/login", { method: "POST", body: { email: "asha@example.com", password: "secret123" } });
  assert.equal(ok.status, 200); S.user = ok.data.token;
  assert.equal((await api("/api/auth/me", { token: S.user })).data.user.name, "Asha Rao");
});

itest("two separate logins: admin and customer accounts cannot use each other's page", async () => {
  assert.equal((await api("/api/auth/login", { method: "POST", body: { email: "admin@gmail.com", password: "admin123" } })).status, 403);
  assert.equal((await api("/api/auth/admin/login", { method: "POST", body: { email: "asha@example.com", password: "secret123" } })).status, 401);
  const a = await api("/api/auth/admin/login", { method: "POST", body: { email: "admin@gmail.com", password: "admin123" } });
  assert.equal(a.status, 200); assert.equal(a.data.user.role, "admin"); S.admin = a.data.token;
  assert.equal((await api("/api/auth/admin/login", { method: "POST", body: { email: "admin@gmail.com", password: "nope" } })).status, 401);
});

itest("customers are forbidden from every admin route; admins cannot place orders", async () => {
  for (const [m, p] of [["GET", "/api/admin/reservations"], ["GET", "/api/admin/orders"], ["PATCH", "/api/admin/orders/X/status"]]) {
    assert.equal((await api(p, { method: m, token: S.user, body: m === "GET" ? undefined : {} })).status, 403, p);
  }
  assert.equal((await api("/api/orders", { method: "POST", token: S.admin, body: { items: [{ menuId: "1", qty: 1 }] } })).status, 403);
});

itest("orders are re-priced on the server, are idempotent, and unknown dishes are refused", async () => {
  const body = { items: [{ menuId: "7", qty: 2, comboId: "C4", price: 1 }, { menuId: "1", qty: 1, price: 1 }], total: 1, requestId: "req-1", notes: "less spicy" };
  const r = await api("/api/orders", { method: "POST", token: S.user, body });
  assert.equal(r.status, 201);
  assert.equal(r.data.order.total, (220 + 50) * 2 + 80); // client price/total ignored
  assert.equal(r.data.order.status, "PLACED");
  assert.match(r.data.order.orderId, /^ORD[A-Z0-9]{6}$/);
  assert.equal(r.data.notifications.email.status, "not_configured");
  S.orderId = r.data.order.orderId;
  const again = await api("/api/orders", { method: "POST", token: S.user, body });
  assert.equal(again.data.duplicate, true); assert.equal(again.data.order.orderId, S.orderId);
  assert.equal((await api("/api/orders", { method: "POST", token: S.user, body: { items: [{ menuId: "1", qty: 1, comboId: "C4" }] } })).status, 400);
  assert.equal((await api("/api/orders", { method: "POST", token: S.user, body: { items: [{ menuId: "999", qty: 1 }] } })).status, 400);
  assert.equal((await api("/api/orders/mine", { token: S.user })).data.orders.length, 1);
});

itest("admin sees orders with customer emails and can change the status", async () => {
  const o = await api("/api/admin/orders", { token: S.admin });
  assert.equal(o.data.orders[0].customer.email, "asha@example.com");
  assert.equal((await api(`/api/admin/orders/${S.orderId}/status`, { method: "PATCH", token: S.admin, body: { status: "PREPARING" } })).status, 200);
  assert.equal((await api(`/api/admin/orders/${S.orderId}/status`, { method: "PATCH", token: S.admin, body: { status: "BOGUS" } })).status, 400);
});

itest("recommendations: predefined fallback is labelled, then real order data takes over", async () => {
  let r = (await api("/api/orders/recommendations")).data;
  assert.equal(r.byDish["7"].source, "predefined");
  for (let i = 2; i <= 3; i++) await api("/api/orders", { method: "POST", token: S.user, body: { items: [{ menuId: "7", qty: 1, comboId: "C4" }], requestId: `req-${i}` } });
  r = (await api("/api/orders/recommendations")).data;
  assert.equal(r.byDish["7"].source, "orders");
  assert.equal(r.byDish["7"].suggestions[0].id, "C4");
});

itest("reservations: validation, booking, double-booking, privacy", async () => {
  const slot = { seatId: "B3", date: tomorrow, startTime: "13:00", endTime: "14:00", name: "Asha Rao", phone: "9876543210", guests: 4, specialRequest: "Window seat" };
  const post = (b, token = S.user) => api("/api/reservations/bookSeatSlot", { method: "POST", token, body: b });
  assert.equal((await post({ ...slot, date: "2020-01-01" })).status, 400);
  assert.equal((await post({ ...slot, guests: 0 })).status, 400);
  assert.equal((await post({ ...slot, phone: "123" })).status, 400);
  assert.equal((await post({ ...slot, startTime: "03:00", endTime: "04:00" })).status, 400);
  assert.equal((await post({ ...slot, seatId: "Z9" })).status, 400);
  assert.equal((await api("/api/reservations/bookSeatSlot", { method: "POST", body: slot })).status, 401);
  const ok = await post(slot);
  assert.equal(ok.status, 201); assert.match(ok.data.reservation.reservationId, /^RES-[A-Z0-9]{6}$/);
  S.resId = ok.data.reservation.reservationId;
  assert.equal((await post(slot)).status, 409);
  const other = await api("/api/auth/register", { method: "POST", body: { name: "Ravi Kumar", email: "ravi@example.com", phone: "9123456780", password: "secret123" } });
  assert.equal((await post({ ...slot, name: "Ravi Kumar" }, other.data.token)).status, 409); // same table, same time
  const pub = await api(`/api/reservations/rawWeek?start=${tomorrow}&days=1`);
  assert.ok(pub.data.reservations.length >= 1);
  assert.ok(!JSON.stringify(pub.data).includes("asha@example.com") && !JSON.stringify(pub.data).includes("9876543210"));
  assert.equal((await api("/api/reservations/mine", { token: other.data.token })).data.reservations.length, 0);
  assert.equal((await api("/api/reservations/mine", { token: S.user })).data.reservations.length, 1);
});

itest("only the admin can see all reservations with email and phone", async () => {
  const r = await api("/api/admin/reservations", { token: S.admin });
  assert.equal(r.status, 200);
  const mine = r.data.reservations.find((x) => x.reservationId === S.resId);
  assert.equal(mine.email, "asha@example.com"); assert.equal(mine.phone, "9876543210"); assert.equal(mine.guests, 4);
  assert.equal((await api(`/api/admin/reservations/${S.resId}/cancel`, { method: "POST", token: S.admin })).status, 200);
  assert.equal((await api("/api/reservations/mine", { token: S.user })).data.reservations.length, 0);
});
