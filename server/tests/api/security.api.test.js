// OWASP Top 10 (2021) checks against the running API. See docs/07-security-usability.md.
// A01 Broken Access Control, A03 Injection, A05 Security Misconfiguration,
// A07 Identification and Authentication Failures.
import { describe, it, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { startServer } from "../helpers/http.js";
import { users, tokenFor, stubAuthUsers, stub, restore, oid } from "../helpers/fakes.js";
import { User, Student, Internship, Application } from "../../src/models.js";

let api;
before(async () => (api = await startServer()));
after(() => api.close());
afterEach(restore);

const T = { student: tokenFor(users.student), company: tokenFor(users.company), other: tokenFor(users.company2) };

describe("A01 Broken Access Control", () => {
  const protectedRoutes = [
    ["GET", "/api/auth/me"],
    ["GET", "/api/students/profile"],
    ["PUT", "/api/students/profile"],
    ["GET", "/api/internships"],
    ["POST", "/api/internships"],
    ["GET", `/api/internships/${oid()}`],
    ["PUT", `/api/internships/${oid()}`],
    ["DELETE", `/api/internships/${oid()}`],
    ["GET", "/api/applications"],
    ["POST", "/api/applications"],
    ["PATCH", `/api/applications/${oid()}/status`],
    ["PATCH", `/api/applications/${oid()}/withdraw`],
    ["DELETE", `/api/applications/${oid()}`],
  ];
  it("SEC-A01-01 every protected endpoint rejects anonymous requests with 401", async () => {
    for (const [m, p] of protectedRoutes) {
      const r = await api.request(m, p, { body: m === "GET" ? undefined : {} });
      assert.equal(r.status, 401, `${m} ${p}`);
    }
  });
  it("SEC-A01-02 vertical escalation: a student cannot create, edit or delete listings or change statuses", async () => {
    stubAuthUsers();
    const id = oid();
    for (const [m, p] of [
      ["POST", "/api/internships"],
      ["PUT", `/api/internships/${id}`],
      ["DELETE", `/api/internships/${id}`],
      ["PATCH", `/api/applications/${id}/status`],
    ]) {
      const r = await api.request(m, p, { token: T.student, body: { status: "offered" } });
      assert.equal(r.status, 403, `${m} ${p}`);
    }
  });
  it("SEC-A01-03 horizontal escalation: company B cannot read, edit, delete or decide on company A's data", async () => {
    stubAuthUsers();
    stub(Internship, "findById", { _id: oid(), company: { _id: users.company._id }, active: true });
    stub(Internship, "findOneAndUpdate", null);
    stub(Internship, "findOneAndDelete", null);
    stub(Application, "findById", { _id: oid(), status: "submitted", internship: { company: users.company._id }, timeline: [] });
    const id = oid();
    assert.equal((await api.request("GET", `/api/internships/${id}`, { token: T.other })).status, 403);
    assert.equal((await api.request("PUT", `/api/internships/${id}`, { token: T.other, body: { openings: 9 } })).status, 404);
    assert.equal((await api.request("DELETE", `/api/internships/${id}`, { token: T.other })).status, 404);
    assert.equal((await api.request("PATCH", `/api/applications/${id}/status`, { token: T.other, body: { status: "offered" } })).status, 403);
  });
  it("SEC-A01-04 a user cannot self-register as admin", async () => {
    const r = await api.request("POST", "/api/auth/register", {
      body: { name: "Mallory", email: "m@evil.com", password: "pass1234", role: "admin" },
    });
    assert.equal(r.status, 400);
    assert.equal(r.body.errors.role, "Choose candidate or company");
  });
  it("SEC-A01-05 forged JWTs are rejected: alg=none, tampered role, wrong secret", async () => {
    stubAuthUsers();
    const none = jwt.sign({ id: users.student._id, role: "admin" }, null, { algorithm: "none" });
    const [h, , s] = T.student.split(".");
    const tamperedBody = Buffer.from(JSON.stringify({ id: users.admin._id, role: "admin" })).toString("base64url");
    const wrongSecret = jwt.sign({ id: users.admin._id, role: "admin" }, "guess");
    for (const t of [none, `${h}.${tamperedBody}.${s}`, wrongSecret]) {
      const r = await api.request("GET", "/api/auth/me", { token: t });
      assert.equal(r.status, 401);
    }
  });
});

describe("A03 Injection", () => {
  it("SEC-A03-01 login: NoSQL operator in email is neutralised (coerced to string)", async () => {
    const find = stub(User, "findOne", null);
    const r = await api.request("POST", "/api/auth/login", { body: { email: { $ne: null }, password: { $ne: null } } });
    assert.equal(r.status, 401);
    assert.deepEqual(find.mock.calls[0].arguments[0], { email: "[object object]" });
  });
  it("SEC-A03-02 search: regex metacharacters cannot build a catastrophic pattern (ReDoS)", async () => {
    stubAuthUsers();
    const find = stub(Internship, "find", () => ({ populate() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, then: (r) => r([]) }));
    stub(Internship, "countDocuments", async () => 0);
    await api.request("GET", "/api/internships?search=" + encodeURIComponent("(a+)+$"), { token: T.student });
    const rx = find.mock.calls[0].arguments[0].$or[0].title;
    const t0 = Date.now();
    rx.test("a".repeat(5000) + "!");
    assert.ok(Date.now() - t0 < 50);
    assert.equal(rx.source, "\\(a\\+\\)\\+\\$");
  });
  it("SEC-A03-03 Mongoose passes a query operator through when it is used as an _id (risk confirmed)", () => {
    const filter = Internship.findOne({ _id: { $ne: null }, active: true }).cast(Internship);
    assert.deepEqual(filter._id, { $ne: null });
  });
  it("SEC-A03-04 apply: an operator object as the internship id is rejected before querying", async () => {
    stubAuthUsers();
    stub(Student, "findOne", { _id: oid() });
    const jobFind = stub(Internship, "findOne", { _id: oid(), active: true });
    stub(Application, "create", async (d) => ({ _id: oid(), ...d }));
    const r = await api.request("POST", "/api/applications", { token: T.student, body: { internship: { $ne: null } } });
    assert.equal(r.status, 400, "operator object must not reach Internship.findOne");
    assert.equal(jobFind.mock.callCount(), 0);
  });
});

describe("A05 Security Misconfiguration", () => {
  it("SEC-A05-01 framework fingerprint header X-Powered-By is not sent", async () => {
    const r = await api.request("GET", "/api/health");
    assert.equal(r.headers.get("x-powered-by"), null);
  });
  it("SEC-A05-02 basic hardening headers are present", async () => {
    const r = await api.request("GET", "/api/health");
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
    assert.equal(r.headers.get("x-frame-options"), "DENY");
  });
  it("SEC-A05-03 CORS only allows the configured client origin", async () => {
    const ok = await api.request("GET", "/api/health", { headers: { Origin: "http://localhost:5173" } });
    const bad = await api.request("GET", "/api/health", { headers: { Origin: "https://evil.example" } });
    assert.equal(ok.headers.get("access-control-allow-origin"), "http://localhost:5173");
    assert.notEqual(bad.headers.get("access-control-allow-origin"), "https://evil.example");
  });
  it("SEC-A05-04 server errors do not leak stack traces", async () => {
    stubAuthUsers();
    stub(Student, "findOne", async () => {
      throw new Error("connection string mongodb://admin:pw@db");
    });
    const orig = console.error;
    console.error = () => {};
    try {
      const r = await api.request("GET", "/api/students/profile", { token: T.student });
      assert.equal(r.status, 500);
      assert.doesNotMatch(r.text, /mongodb:|at .*\.js/);
    } finally {
      console.error = orig;
    }
  });
});

describe("A07 Identification and Authentication Failures", () => {
  it("SEC-A07-01 weak passwords are refused at registration", async () => {
    for (const password of ["password", "12345678", "abc123"]) {
      const r = await api.request("POST", "/api/auth/register", {
        body: { name: "Test User", email: "t@test.lk", password, role: "student" },
      });
      assert.equal(r.status, 400, password);
    }
  });
  it("SEC-A07-02 repeated failed logins are throttled (brute-force protection)", async () => {
    stub(User, "findOne", null);
    const statuses = [];
    for (let i = 0; i < 30; i++) {
      const r = await api.request("POST", "/api/auth/login", { body: { email: "victim@test.lk", password: `guess${i}xx` } });
      statuses.push(r.status);
    }
    assert.ok(statuses.includes(429), `expected a 429 within 30 attempts, got ${[...new Set(statuses)]}`);
  });
});
