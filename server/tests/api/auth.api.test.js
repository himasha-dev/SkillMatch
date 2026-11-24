// API tests for /api/auth (register, login, me) with the database stubbed.
import { describe, it, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { startServer } from "../helpers/http.js";
import { users, tokenFor, stubAuthUsers, stub, restore, oid } from "../helpers/fakes.js";
import { User } from "../../src/models.js";

let api;
before(async () => (api = await startServer()));
after(() => api.close());
afterEach(restore);

const newUser = { name: "Kasuni Silva", email: "Kasuni@Example.com ", password: "pass1234", role: "student" };

describe("POST /api/auth/register", () => {
  it("API-REG-01 valid student registration -> 201, token, normalised email, hashed password", async () => {
    stub(User, "findOne", null);
    const create = stub(User, "create", async (doc) => ({ _id: oid(), ...doc }));
    const r = await api.request("POST", "/api/auth/register", { body: newUser });
    assert.equal(r.status, 201);
    assert.equal(r.body.user.email, "kasuni@example.com");
    assert.equal(r.body.user.password, undefined, "password must not be returned");
    const saved = create.mock.calls[0].arguments[0];
    assert.notEqual(saved.password, newUser.password);
    assert.ok(await bcrypt.compare(newUser.password, saved.password));
    assert.equal(saved.organization, undefined);
    assert.equal(jwt.verify(r.body.token, process.env.JWT_SECRET).role, "student");
  });
  it("API-REG-02 company registration stores trimmed organization", async () => {
    stub(User, "findOne", null);
    const create = stub(User, "create", async (doc) => ({ _id: oid(), ...doc }));
    const r = await api.request("POST", "/api/auth/register", {
      body: { ...newUser, role: "company", organization: "  Acme Labs " },
    });
    assert.equal(r.status, 201);
    assert.equal(create.mock.calls[0].arguments[0].organization, "Acme Labs");
  });
  it("API-REG-03 invalid input -> 400 with per-field errors, nothing saved", async () => {
    const create = stub(User, "create", async () => assert.fail("must not save"));
    const r = await api.request("POST", "/api/auth/register", { body: { name: "A", email: "bad", password: "short" } });
    assert.equal(r.status, 400);
    assert.deepEqual(Object.keys(r.body.errors).sort(), ["email", "name", "password", "role"]);
    assert.equal(create.mock.callCount(), 0);
  });
  it("API-REG-04 duplicate email -> 409", async () => {
    stub(User, "findOne", { _id: oid() });
    const r = await api.request("POST", "/api/auth/register", { body: newUser });
    assert.equal(r.status, 409);
    assert.equal(r.body.errors.email, "Email already registered");
  });
  it("API-REG-05 malformed JSON body -> 400 (not 500)", async () => {
    const r = await api.request("POST", "/api/auth/register", { body: "{bad json" });
    assert.equal(r.status, 400);
  });
  it("API-REG-06 body larger than the 100kb limit -> 413 (not 500)", async () => {
    const r = await api.request("POST", "/api/auth/register", { body: { ...newUser, name: "x".repeat(120_000) } });
    assert.equal(r.status, 413);
  });
});

describe("POST /api/auth/login", () => {
  let hash;
  before(async () => (hash = await bcrypt.hash("pass1234", 4)));
  const account = () => ({ _id: oid(), name: "Kasuni", email: "kasuni@example.com", role: "student", password: hash });

  it("API-LOG-01 correct credentials -> 200 with token and public user", async () => {
    const find = stub(User, "findOne", account());
    const r = await api.request("POST", "/api/auth/login", { body: { email: " KASUNI@example.com", password: "pass1234" } });
    assert.equal(r.status, 200);
    assert.ok(r.body.token);
    assert.equal(r.body.user.password, undefined);
    assert.deepEqual(find.mock.calls[0].arguments[0], { email: "kasuni@example.com" });
  });
  it("API-LOG-02 wrong password -> 401 generic message", async () => {
    stub(User, "findOne", account());
    const r = await api.request("POST", "/api/auth/login", { body: { email: "kasuni@example.com", password: "wrong999" } });
    assert.equal(r.status, 401);
    assert.equal(r.body.message, "Invalid email or password");
  });
  it("API-LOG-03 unknown email -> same 401 message (no user enumeration)", async () => {
    stub(User, "findOne", null);
    const r = await api.request("POST", "/api/auth/login", { body: { email: "nobody@example.com", password: "pass1234" } });
    assert.equal(r.status, 401);
    assert.equal(r.body.message, "Invalid email or password");
  });
  it("API-LOG-04 missing email or password -> 400", async () => {
    for (const body of [{}, { email: "a@b.co" }, { password: "x" }]) {
      const r = await api.request("POST", "/api/auth/login", { body });
      assert.equal(r.status, 400, JSON.stringify(body));
    }
  });
});

describe("GET /api/auth/me", () => {
  it("API-ME-01 returns the logged-in user", async () => {
    stubAuthUsers();
    const r = await api.request("GET", "/api/auth/me", { token: tokenFor(users.company) });
    assert.equal(r.status, 200);
    assert.equal(r.body.organization, "Acme");
  });
  it("API-ME-02 no token -> 401", async () => {
    const r = await api.request("GET", "/api/auth/me");
    assert.equal(r.status, 401);
  });
});

describe("general", () => {
  it("API-GEN-01 health check", async () => {
    const r = await api.request("GET", "/api/health");
    assert.deepEqual([r.status, r.body], [200, { status: "ok" }]);
  });
  it("API-GEN-02 unknown route -> 404 JSON", async () => {
    const r = await api.request("GET", "/api/does-not-exist");
    assert.equal(r.status, 404);
    assert.match(r.body.message, /Route not found/);
  });
});
