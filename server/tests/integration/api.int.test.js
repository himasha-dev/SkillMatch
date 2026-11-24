// End-to-end API tests against a REAL MongoDB (no stubs).
// Runs when MONGO_URI_TEST is set, e.g.
//   MONGO_URI_TEST=mongodb://127.0.0.1:27017/skillmatch_it npm run test:integration
// The database named in MONGO_URI_TEST is DROPPED at the start - never point it at real data.
import "../helpers/env.js";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { startServer } from "../helpers/http.js";

const URI = process.env.MONGO_URI_TEST;
const skip = URI ? false : "MONGO_URI_TEST not set - real-database tests skipped";

describe("Integration: full hiring flow on a real MongoDB", { skip }, () => {
  let api;
  const ctx = {};
  const pw = "Passw0rd1";

  before(async () => {
    await mongoose.connect(URI);
    await mongoose.connection.dropDatabase();
    await mongoose.connection.syncIndexes();
    api = await startServer();
  });
  after(async () => {
    await api?.close();
    await mongoose.disconnect();
  });

  it("IT-01 registers a company and a student", async () => {
    const c = await api.request("POST", "/api/auth/register", {
      body: { name: "Acme HR", email: "hr@acme.it", password: pw, role: "company", organization: "Acme" },
    });
    const s = await api.request("POST", "/api/auth/register", {
      body: { name: "Sam Student", email: "sam@uni.it", password: pw, role: "student" },
    });
    assert.equal(c.status, 201);
    assert.equal(s.status, 201);
    ctx.company = c.body.token;
    ctx.student = s.body.token;
  });

  it("IT-02 duplicate email is refused by the API and by the unique index", async () => {
    const r = await api.request("POST", "/api/auth/register", {
      body: { name: "Again", email: "SAM@uni.it", password: pw, role: "student" },
    });
    assert.equal(r.status, 409);
  });

  it("IT-03 login works with the stored bcrypt hash; wrong password is 401", async () => {
    const ok = await api.request("POST", "/api/auth/login", { body: { email: "sam@uni.it", password: pw } });
    const bad = await api.request("POST", "/api/auth/login", { body: { email: "sam@uni.it", password: "nope12345" } });
    assert.equal(ok.status, 200);
    assert.equal(bad.status, 401);
  });

  it("IT-04 company creates two listings; one is then closed", async () => {
    const mk = (title) =>
      api.request("POST", "/api/internships", {
        token: ctx.company,
        body: { title, description: "Integration test listing body", requiredSkills: ["JavaScript"], minimumGpa: 2.5, location: "Colombo" },
      });
    const a = await mk("Integration QA Intern");
    const b = await mk("Closed Intern");
    assert.equal(a.status, 201);
    ctx.job = a.body._id;
    ctx.closed = b.body._id;
    const close = await api.request("PUT", `/api/internships/${ctx.closed}`, { token: ctx.company, body: { active: false } });
    assert.equal(close.status, 200);
    assert.equal(close.body.active, false);
  });

  it("IT-05 schema validators run on update (openings above the 1000 max -> 400)", async () => {
    const r = await api.request("PUT", `/api/internships/${ctx.job}`, { token: ctx.company, body: { openings: 1001 } });
    assert.equal(r.status, 400);
  });

  it("IT-06 student sees only the active listing, and search finds it", async () => {
    const all = await api.request("GET", "/api/internships", { token: ctx.student });
    assert.equal(all.body.total, 1);
    const found = await api.request("GET", "/api/internships?search=qa%20intern", { token: ctx.student });
    assert.equal(found.body.items[0]._id, ctx.job);
  });

  it("IT-07 applying before creating a profile is refused", async () => {
    const r = await api.request("POST", "/api/applications", { token: ctx.student, body: { internship: ctx.job } });
    assert.equal(r.status, 400);
  });

  it("IT-08 profile upsert, then schema max on experienceMonths (601 -> 400)", async () => {
    const body = { degree: "Bachelor", field: "Computer Engineering", gpa: 3.4, skills: ["JavaScript"], experienceMonths: 6 };
    const ok = await api.request("PUT", "/api/students/profile", { token: ctx.student, body });
    assert.equal(ok.status, 200);
    const tooMuch = await api.request("PUT", "/api/students/profile", { token: ctx.student, body: { ...body, experienceMonths: 601 } });
    assert.equal(tooMuch.status, 400);
  });

  it("IT-09 student applies; a second application is 409; a closed listing is 404", async () => {
    const r = await api.request("POST", "/api/applications", { token: ctx.student, body: { internship: ctx.job, coverNote: "Hi" } });
    assert.equal(r.status, 201);
    ctx.app = r.body._id;
    const again = await api.request("POST", "/api/applications", { token: ctx.student, body: { internship: ctx.job } });
    assert.equal(again.status, 409);
    const closed = await api.request("POST", "/api/applications", { token: ctx.student, body: { internship: ctx.closed } });
    assert.equal(closed.status, 404);
  });

  it("IT-10 company sees the application and shortlists it", async () => {
    const list = await api.request("GET", "/api/applications", { token: ctx.company });
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].student.user.email, "sam@uni.it");
    const r = await api.request("PATCH", `/api/applications/${ctx.app}/status`, { token: ctx.company, body: { status: "shortlisted" } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.timeline.map((t) => t.status), ["submitted", "shortlisted"]);
  });

  it("IT-11 student withdraws, then re-applies (same record reopened)", async () => {
    const w = await api.request("PATCH", `/api/applications/${ctx.app}/withdraw`, { token: ctx.student });
    assert.equal(w.body.status, "withdrawn");
    const again = await api.request("PATCH", `/api/applications/${ctx.app}/withdraw`, { token: ctx.student });
    assert.equal(again.status, 400);
    const re = await api.request("POST", "/api/applications", { token: ctx.student, body: { internship: ctx.job } });
    assert.equal(re.status, 201);
    assert.equal(re.body._id, ctx.app);
    assert.equal(re.body.status, "submitted");
  });

  it("IT-12 deleting a listing cascades to its applications", async () => {
    const del = await api.request("DELETE", `/api/internships/${ctx.job}`, { token: ctx.company });
    assert.equal(del.status, 200);
    const mine = await api.request("GET", "/api/applications", { token: ctx.student });
    assert.equal(mine.body.length, 0);
  });
});
