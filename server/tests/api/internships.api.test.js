// API tests for /api/internships (CRUD, search/filter/sort/pagination) with the database stubbed.
import { describe, it, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "../helpers/http.js";
import { users, tokenFor, stubAuthUsers, stub, restore, query, oid } from "../helpers/fakes.js";
import { Internship, Match, Application } from "../../src/models.js";

let api;
before(async () => (api = await startServer()));
after(() => api.close());
afterEach(restore);

const T = { student: tokenFor(users.student), company: tokenFor(users.company), admin: tokenFor(users.admin) };
const listing = (over = {}) => ({
  _id: oid(),
  title: "QA Intern",
  description: "Write automated tests for web apps",
  requiredSkills: ["JavaScript"],
  company: { _id: users.company._id, name: users.company.name, organization: "Acme" },
  active: true,
  ...over,
});
const valid = { title: "QA Intern", description: "Write automated tests", requiredSkills: [" Selenium", "Selenium", "JS"], openings: 2 };

// Stubs Internship.find/countDocuments and returns the recorded find() chain.
function stubList(items = [], total = items.length) {
  const find = stub(Internship, "find", () => query(items));
  const count = stub(Internship, "countDocuments", async () => total);
  return { find, count, chain: () => find.mock.calls[0].result.calls, filter: () => find.mock.calls[0].arguments[0] };
}
const callArg = (chain, name) => chain.find((c) => c[0] === name)?.[1];

describe("GET /api/internships (list)", () => {
  it("API-LST-01 student only sees active listings", async () => {
    stubAuthUsers();
    const s = stubList([listing()]);
    const r = await api.request("GET", "/api/internships", { token: T.student });
    assert.equal(r.status, 200);
    assert.deepEqual(s.filter(), { active: true });
    assert.deepEqual([r.body.total, r.body.page, r.body.pages], [1, 1, 1]);
  });
  it("API-LST-02 company only sees its own listings, and can filter closed ones", async () => {
    stubAuthUsers();
    const s = stubList();
    await api.request("GET", "/api/internships?status=closed", { token: T.company });
    assert.equal(String(s.filter().company), String(users.company._id));
    assert.equal(s.filter().active, false);
  });
  it("API-LST-03 student cannot use status=closed to see closed listings", async () => {
    stubAuthUsers();
    const s = stubList();
    await api.request("GET", "/api/internships?status=closed", { token: T.student });
    assert.equal(s.filter().active, true);
  });
  it("API-LST-04 search is case-insensitive and regex characters are escaped", async () => {
    stubAuthUsers();
    const s = stubList();
    await api.request("GET", "/api/internships?search=" + encodeURIComponent(" c++ "), { token: T.admin });
    const rx = s.filter().$or[0].title;
    assert.ok(rx instanceof RegExp);
    assert.equal(rx.source, "c\\+\\+");
    assert.equal(rx.flags, "i");
  });
  it("API-LST-05 location is an exact, case-insensitive match; degree filter passed through", async () => {
    stubAuthUsers();
    const s = stubList();
    await api.request("GET", "/api/internships?location=colombo&degree=Master", { token: T.admin });
    assert.ok(s.filter().location.test("Colombo"));
    assert.ok(!s.filter().location.test("Colombo 07"));
    assert.equal(s.filter().minimumDegree, "Master");
  });
  it("API-LST-06 unknown sort falls back to newest", async () => {
    stubAuthUsers();
    const s = stubList();
    await api.request("GET", "/api/internships?sort=hacker", { token: T.admin });
    assert.deepEqual(callArg(s.chain(), "sort"), { createdAt: -1 });
  });
  it("API-LST-07 sort=gpa sorts by lowest minimum GPA", async () => {
    stubAuthUsers();
    const s = stubList();
    await api.request("GET", "/api/internships?sort=gpa", { token: T.admin });
    assert.deepEqual(callArg(s.chain(), "sort"), { minimumGpa: 1 });
  });

  // Boundary Value Analysis on the pagination parameters (limit 1..50, page >= 1)
  const pagingCases = [
    ["BVA-LIM-01", "limit=-5", "limit=-5", 1],
    ["BVA-LIM-02", "limit=1", "limit=1", 1],
    ["BVA-LIM-03", "limit=50", "limit=50", 50],
    ["BVA-LIM-04", "limit=51", "limit=51", 50],
    ["BVA-LIM-05", "no limit -> default 12", "", 12],
  ];
  for (const [id, label, qs, expected] of pagingCases)
    it(`${id} ${label} -> limit ${expected}`, async () => {
      stubAuthUsers();
      const s = stubList();
      await api.request("GET", `/api/internships?${qs}`, { token: T.admin });
      assert.equal(callArg(s.chain(), "limit"), expected);
    });
  it("BVA-LIM-06 limit=0 is clamped to the minimum of 1", async () => {
    stubAuthUsers();
    const s = stubList();
    await api.request("GET", "/api/internships?limit=0", { token: T.admin });
    assert.equal(callArg(s.chain(), "limit"), 1);
  });
  it("BVA-PG-01 page=0 and page=-1 are treated as page 1 (skip 0)", async () => {
    for (const p of [0, -1]) {
      stubAuthUsers();
      const s = stubList();
      const r = await api.request("GET", `/api/internships?page=${p}`, { token: T.admin });
      assert.equal(callArg(s.chain(), "skip"), 0);
      assert.equal(r.body.page, 1);
      restore();
    }
  });
  it("BVA-PG-02 page=3, limit=5 skips 10 and reports total pages", async () => {
    stubAuthUsers();
    const s = stubList([], 11);
    const r = await api.request("GET", "/api/internships?page=3&limit=5", { token: T.admin });
    assert.equal(callArg(s.chain(), "skip"), 10);
    assert.equal(r.body.pages, 3);
  });
  it("API-LST-08 unauthenticated -> 401", async () => {
    const r = await api.request("GET", "/api/internships");
    assert.equal(r.status, 401);
  });
});

describe("GET /api/internships/:id", () => {
  it("API-GET-01 invalid id -> 400", async () => {
    stubAuthUsers();
    const r = await api.request("GET", "/api/internships/xyz", { token: T.student });
    assert.equal(r.status, 400);
  });
  it("API-GET-02 missing -> 404", async () => {
    stubAuthUsers();
    stub(Internship, "findById", null);
    const r = await api.request("GET", `/api/internships/${oid()}`, { token: T.student });
    assert.equal(r.status, 404);
  });
  it("API-GET-03 company viewing another company's listing -> 403", async () => {
    stubAuthUsers();
    stub(Internship, "findById", listing());
    const r = await api.request("GET", `/api/internships/${oid()}`, { token: tokenFor(users.company2) });
    assert.equal(r.status, 403);
  });
  it("API-GET-04 student viewing a closed listing -> 404", async () => {
    stubAuthUsers();
    stub(Internship, "findById", listing({ active: false }));
    const r = await api.request("GET", `/api/internships/${oid()}`, { token: T.student });
    assert.equal(r.status, 404);
  });
  it("API-GET-05 student viewing an active listing -> 200", async () => {
    stubAuthUsers();
    const l = listing();
    stub(Internship, "findById", l);
    const r = await api.request("GET", `/api/internships/${l._id}`, { token: T.student });
    assert.equal(r.status, 200);
    assert.equal(r.body.title, "QA Intern");
  });
  it("API-GET-06 owner company viewing its closed listing -> 200", async () => {
    stubAuthUsers();
    stub(Internship, "findById", listing({ active: false }));
    const r = await api.request("GET", `/api/internships/${oid()}`, { token: T.company });
    assert.equal(r.status, 200);
  });
});

describe("POST /api/internships (create)", () => {
  it("API-CRT-01 company creates listing -> 201, skills cleaned, owner forced to caller", async () => {
    stubAuthUsers();
    const create = stub(Internship, "create", async (d) => ({ _id: oid(), ...d }));
    const r = await api.request("POST", "/api/internships", {
      token: T.company,
      body: { ...valid, company: String(users.company2._id), deadline: "" },
    });
    assert.equal(r.status, 201);
    const doc = create.mock.calls[0].arguments[0];
    assert.deepEqual(doc.requiredSkills, ["Selenium", "JS"]);
    assert.equal(String(doc.company), String(users.company._id), "mass-assigned company must be ignored");
    assert.equal(doc.deadline, undefined, "empty string becomes undefined");
  });
  it("API-CRT-02 student cannot create listings -> 403", async () => {
    stubAuthUsers();
    const r = await api.request("POST", "/api/internships", { token: T.student, body: valid });
    assert.equal(r.status, 403);
  });
  it("API-CRT-03 invalid listing -> 400 with field errors", async () => {
    stubAuthUsers();
    const r = await api.request("POST", "/api/internships", {
      token: T.company,
      body: { title: "QA", description: "short", requiredSkills: [], minimumGpa: 9, openings: 0 },
    });
    assert.equal(r.status, 400);
    assert.deepEqual(Object.keys(r.body.errors).sort(), ["description", "minimumGpa", "openings", "requiredSkills", "title"]);
  });
});

describe("PUT /api/internships/:id (update)", () => {
  it("API-UPD-01 owner updates -> 200, query scoped to owner, validators on", async () => {
    stubAuthUsers();
    const upd = stub(Internship, "findOneAndUpdate", (f, d) => Promise.resolve({ ...d }));
    const id = oid();
    const r = await api.request("PUT", `/api/internships/${id}`, { token: T.company, body: { openings: 5, active: false } });
    assert.equal(r.status, 200);
    const [filter, , opts] = upd.mock.calls[0].arguments;
    assert.equal(String(filter._id), String(id));
    assert.equal(String(filter.company), String(users.company._id));
    assert.equal(opts.runValidators, true);
  });
  it("API-UPD-02 not owner / missing -> 404", async () => {
    stubAuthUsers();
    stub(Internship, "findOneAndUpdate", null);
    const r = await api.request("PUT", `/api/internships/${oid()}`, { token: tokenFor(users.company2), body: { openings: 5 } });
    assert.equal(r.status, 404);
  });
  it("API-UPD-03 invalid partial update -> 400", async () => {
    stubAuthUsers();
    const r = await api.request("PUT", `/api/internships/${oid()}`, { token: T.company, body: { title: "x" } });
    assert.equal(r.status, 400);
  });
});

describe("DELETE /api/internships/:id", () => {
  it("API-DEL-01 owner deletes -> listing, matches and applications removed", async () => {
    stubAuthUsers();
    const id = oid();
    stub(Internship, "findOneAndDelete", { _id: id });
    const m = stub(Match, "deleteMany", async () => ({}));
    const a = stub(Application, "deleteMany", async () => ({}));
    const r = await api.request("DELETE", `/api/internships/${id}`, { token: T.company });
    assert.equal(r.status, 200);
    assert.deepEqual(m.mock.calls[0].arguments[0], { internship: id });
    assert.deepEqual(a.mock.calls[0].arguments[0], { internship: id });
  });
  it("API-DEL-02 not owner -> 404 and nothing cascaded", async () => {
    stubAuthUsers();
    stub(Internship, "findOneAndDelete", null);
    const a = stub(Application, "deleteMany", async () => ({}));
    const r = await api.request("DELETE", `/api/internships/${oid()}`, { token: tokenFor(users.company2) });
    assert.equal(r.status, 404);
    assert.equal(a.mock.callCount(), 0);
  });
});
