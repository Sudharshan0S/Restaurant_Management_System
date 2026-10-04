// HTTP-level tests that do not need a database (validation, auth gating, error format).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";

process.env.SKIP_DB = "true";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret";
const { default: app } = await import("../app.js");

let server, base;
before(async () => { await new Promise((r) => { server = app.listen(0, r); }); base = `http://127.0.0.1:${server.address().port}`; });
after(() => new Promise((r) => server.close(r)));

const call = async (path, opts = {}) => {
  const res = await fetch(base + path, { ...opts, headers: { "content-type": "application/json", ...(opts.headers || {}) } });
  return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
};
const post = (path, body, headers) => call(path, { method: "POST", body: JSON.stringify(body), headers });

test("health check", async () => { const r = await call("/"); assert.equal(r.status, 200); assert.equal(r.data.success, true); });
test("registration validation messages", async () => {
  assert.equal((await post("/api/auth/register", { name: "A", email: "x", phone: "1", password: "a" })).status, 400);
  const r = await post("/api/auth/register", { name: "Asha Rao", email: "a@b.com", phone: "9876543210", password: "short" });
  assert.equal(r.status, 400); assert.match(r.data.message, /Password/);
});
test("protected routes need a login", async () => {
  for (const [m, p] of [["POST", "/api/orders"], ["POST", "/api/reservations/hold"], ["GET", "/api/reservations/mine"], ["GET", "/api/admin/orders"], ["GET", "/api/admin/reservations"], ["PATCH", "/api/admin/orders/X/status"]]) {
    const r = await call(p, { method: m, body: m === "GET" ? undefined : "{}" });
    assert.equal(r.status, 401, `${m} ${p}`);
  }
});
test("a forged token is rejected", async () => {
  const r = await call("/api/admin/orders", { headers: { authorization: "Bearer not.a.real.token" } });
  assert.equal(r.status, 401);
});
test("errors never leak internals", async () => {
  const bad = await call("/api/auth/login", { method: "POST", body: "{bad" });
  assert.equal(bad.status, 400); assert.equal(bad.data.message, "Malformed request.");
  const nf = await call("/nope"); assert.equal(nf.status, 404);
});
test("login with no body does not crash", async () => {
  const r = await call("/api/auth/admin/login", { method: "POST" });
  assert.ok([400, 401, 503].includes(r.status));
});
test("there is no menu API any more: the menu lives in the frontend", async () => {
  assert.equal((await call("/api/menu")).status, 404);
  assert.equal((await call("/api/menu/image/1")).status, 404);
  assert.equal((await call("/api/admin/dishes", { headers: { authorization: "Bearer x" } })).status, 401); // admin router: auth first, route does not exist
});
