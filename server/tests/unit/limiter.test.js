// White-box tests for createLoginLimiter (middleware.js) using an injected clock.
import "../helpers/env.js";
import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { createLoginLimiter, securityHeaders } from "../../src/middleware.js";

const req = (email = "a@b.lk", ip = "1.1.1.1") => ({ ip, body: { email } });
function res() {
  const r = { statusCode: 200, headers: {} };
  r.status = (c) => ((r.statusCode = c), r);
  r.json = (b) => ((r.body = b), r);
  r.set = (k, v) => (typeof k === "object" ? Object.assign(r.headers, k) : (r.headers[k] = v), r);
  return r;
}
const guard = (l, rq) => {
  const r = res();
  const next = mock.fn();
  l.guard(rq, r, next);
  return { r, passed: next.mock.callCount() === 1 };
};

describe("createLoginLimiter", () => {
  it("WB-LIM-01 allows up to `max` failures, blocks the next attempt with 429 + Retry-After", () => {
    let t = 0;
    const l = createLoginLimiter({ max: 3, windowMs: 60_000, now: () => t });
    for (let i = 0; i < 3; i++) {
      assert.equal(guard(l, req()).passed, true);
      l.fail(req());
    }
    t = 15_000;
    const { r, passed } = guard(l, req());
    assert.equal(passed, false);
    assert.equal(r.statusCode, 429);
    assert.equal(r.headers["Retry-After"], "45");
  });
  it("WB-LIM-02 the block expires after the window", () => {
    let t = 0;
    const l = createLoginLimiter({ max: 1, windowMs: 1000, now: () => t });
    l.fail(req());
    assert.equal(guard(l, req()).passed, false);
    t = 1000;
    assert.equal(guard(l, req()).passed, true);
  });
  it("WB-LIM-03 a successful login clears the counter", () => {
    const l = createLoginLimiter({ max: 2 });
    l.fail(req());
    l.fail(req());
    assert.equal(guard(l, req()).passed, false);
    l.succeed(req());
    assert.equal(guard(l, req()).passed, true);
  });
  it("WB-LIM-04 counters are per IP and per (case-insensitive) email", () => {
    const l = createLoginLimiter({ max: 1 });
    l.fail(req("Victim@X.lk", "9.9.9.9"));
    assert.equal(guard(l, req("victim@x.lk ", "9.9.9.9")).passed, false);
    assert.equal(guard(l, req("victim@x.lk", "8.8.8.8")).passed, true);
    assert.equal(guard(l, req("other@x.lk", "9.9.9.9")).passed, true);
  });
  it("WB-LIM-05 missing body/email does not crash", () => {
    const l = createLoginLimiter({ max: 1 });
    l.fail({ ip: "1.1.1.1" });
    assert.equal(guard(l, { ip: "1.1.1.1" }).passed, false);
  });
});

describe("securityHeaders", () => {
  it("WB-HDR-01 sets hardening headers and calls next()", () => {
    const r = res();
    const next = mock.fn();
    securityHeaders({}, r, next);
    assert.equal(r.headers["X-Content-Type-Options"], "nosniff");
    assert.equal(r.headers["X-Frame-Options"], "DENY");
    assert.equal(next.mock.callCount(), 1);
  });
});
