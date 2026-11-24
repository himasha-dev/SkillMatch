// White-box unit tests for server/src/middleware.js (statement + branch coverage).
import "../helpers/env.js";
import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { auth, allow, validId, wrap, notFound, errorHandler } from "../../src/middleware.js";
import { users, tokenFor, stubAuthUsers, restore, stub, oid } from "../helpers/fakes.js";
import { User } from "../../src/models.js";

function fakeRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => ((res.body = b), res);
  return res;
}
const run = async (mw, req) => {
  const res = fakeRes();
  const next = mock.fn();
  await mw(req, res, next);
  return { res, next };
};

afterEach(restore);

describe("auth middleware", () => {
  it("WB-AUTH-01 no Authorization header -> 401", async () => {
    const { res, next } = await run(auth, { headers: {} });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, "Authentication required");
    assert.equal(next.mock.callCount(), 0);
  });
  it("WB-AUTH-02 malformed token -> 401 Invalid or expired token", async () => {
    const { res } = await run(auth, { headers: { authorization: "Bearer not.a.jwt" } });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, "Invalid or expired token");
  });
  it("WB-AUTH-03 token signed with a different secret -> 401", async () => {
    const t = tokenFor(users.student, { secret: "attacker-secret" });
    const { res } = await run(auth, { headers: { authorization: `Bearer ${t}` } });
    assert.equal(res.statusCode, 401);
  });
  it("WB-AUTH-04 expired token -> 401", async () => {
    const t = tokenFor(users.student, { expiresIn: -10 });
    const { res } = await run(auth, { headers: { authorization: `Bearer ${t}` } });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, "Invalid or expired token");
  });
  it("WB-AUTH-05 valid token but user deleted -> 401 User no longer exists", async () => {
    stub(User, "findById", null);
    const t = tokenFor(users.student);
    const { res } = await run(auth, { headers: { authorization: `Bearer ${t}` } });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, "User no longer exists");
  });
  it("WB-AUTH-06 valid token -> req.user set (password excluded) and next() called", async () => {
    const find = stubAuthUsers();
    const req = { headers: { authorization: `Bearer ${tokenFor(users.company)}` } };
    const { next } = await run(auth, req);
    assert.equal(next.mock.callCount(), 1);
    assert.equal(req.user.email, users.company.email);
    const q = find.mock.calls[0].result;
    assert.deepEqual(q.calls[0], ["select", "-password"]);
  });
});

describe("allow (role guard)", () => {
  it("WB-ALW-01 permitted role calls next()", async () => {
    const { next, res } = await run(allow("company", "admin"), { user: { role: "admin" } });
    assert.equal(next.mock.callCount(), 1);
    assert.equal(res.statusCode, 200);
  });
  it("WB-ALW-02 other role -> 403", async () => {
    const { next, res } = await run(allow("company"), { user: { role: "student" } });
    assert.equal(next.mock.callCount(), 0);
    assert.equal(res.statusCode, 403);
  });
});

describe("validId", () => {
  it("WB-VID-01 valid ObjectId passes", async () => {
    const { next } = await run(validId, { params: { id: String(oid()) } });
    assert.equal(next.mock.callCount(), 1);
  });
  it("WB-VID-02 invalid id -> 400", async () => {
    const { res } = await run(validId, { params: { id: "123" } });
    assert.equal(res.statusCode, 400);
  });
});

describe("wrap + error handling", () => {
  it("WB-WRP-01 forwards a rejected promise to next(err)", async () => {
    const boom = new Error("db down");
    const { next } = await run(
      wrap(async () => {
        throw boom;
      }),
      {},
    );
    assert.equal(next.mock.calls[0].arguments[0], boom);
  });
  it("WB-ERR-01 Mongoose ValidationError -> 400 with field map", () => {
    const res = fakeRes();
    errorHandler({ name: "ValidationError", errors: { gpa: { message: "too high" } } }, {}, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { message: "too high", errors: { gpa: "too high" } });
  });
  it("WB-ERR-02 CastError -> 400", () => {
    const res = fakeRes();
    errorHandler({ name: "CastError", path: "internship" }, {}, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Invalid value for internship");
  });
  it("WB-ERR-03 duplicate key (11000) -> 409", () => {
    const res = fakeRes();
    errorHandler({ code: 11000 }, {}, res, () => {});
    assert.equal(res.statusCode, 409);
  });
  it("WB-ERR-04 unknown error -> 500 without leaking details", () => {
    const res = fakeRes();
    const log = mock.method(console, "error", () => {});
    errorHandler(new Error("secret stack"), {}, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, "Something went wrong on the server");
    assert.equal(log.mock.callCount(), 1);
  });
  it("WB-ERR-05 notFound -> 404 naming the route", () => {
    const res = fakeRes();
    notFound({ method: "GET", originalUrl: "/api/nope" }, res);
    assert.equal(res.statusCode, 404);
    assert.match(res.body.message, /GET \/api\/nope/);
  });
});

