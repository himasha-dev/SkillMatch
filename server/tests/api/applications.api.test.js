// API tests for /api/applications, including the decision table for "submit application"
// (docs/03-black-box-testing.md, Table DT-1) and boundary tests for cover note and deadline.
import { describe, it, before, after, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "../helpers/http.js";
import { users, tokenFor, stubAuthUsers, stub, restore, oid } from "../helpers/fakes.js";
import { Student, Internship, Application } from "../../src/models.js";

let api;
before(async () => (api = await startServer()));
after(() => api.close());
afterEach(restore);

const T = { student: tokenFor(users.student), company: tokenFor(users.company), other: tokenFor(users.company2), admin: tokenFor(users.admin) };
const studentDoc = { _id: oid(), user: users.student._id };
const activeJob = (over = {}) => ({ _id: oid(), active: true, company: users.company._id, ...over });
const apply = (body) => api.request("POST", "/api/applications", { token: T.student, body });

// Arrange the four decision-table conditions.
function arrange({ profile = true, job = activeJob(), createImpl } = {}) {
  stubAuthUsers();
  stub(Student, "findOne", profile ? studentDoc : null);
  const jobFind = stub(Internship, "findOne", job);
  stub(Application, "findOne", null);
  const create = stub(Application, "create", createImpl || (async (d) => ({ _id: oid(), status: "submitted", ...d })));
  return { jobFind, create };
}

describe("Decision table DT-1: POST /api/applications", () => {
  // C1 profile exists | C2 note <= 1000 | C3 job exists & active | C4 deadline not passed -> outcome
  it("DT-APP-R1 no profile -> 400 'Complete your qualification profile first'", async () => {
    const { create } = arrange({ profile: false });
    const r = await apply({ internship: String(oid()) });
    assert.deepEqual([r.status, r.body.message], [400, "Complete your qualification profile first"]);
    assert.equal(create.mock.callCount(), 0);
  });
  it("DT-APP-R2 profile, note too long -> 400", async () => {
    const { create } = arrange();
    const r = await apply({ internship: String(oid()), coverNote: "x".repeat(1001) });
    assert.deepEqual([r.status, r.body.message], [400, "Cover note must be 1000 characters or fewer"]);
    assert.equal(create.mock.callCount(), 0);
  });
  it("DT-APP-R3 profile, note ok, job missing or closed -> 404 'Job is unavailable'", async () => {
    const { jobFind } = arrange({ job: null });
    const id = String(oid());
    const r = await apply({ internship: id });
    assert.deepEqual([r.status, r.body.message], [404, "Job is unavailable"]);
    assert.deepEqual(jobFind.mock.calls[0].arguments[0], { _id: id, active: true });
  });
  it("DT-APP-R4 profile, note ok, job active, deadline passed -> 400", async () => {
    arrange({ job: activeJob({ deadline: new Date(Date.now() - 60_000) }) });
    const r = await apply({ internship: String(oid()) });
    assert.deepEqual([r.status, r.body.message], [400, "The application deadline has passed"]);
  });
  it("DT-APP-R5 all conditions true -> 201 with initial timeline entry", async () => {
    const { create } = arrange({ job: activeJob({ deadline: new Date(Date.now() + 86_400_000) }) });
    const r = await apply({ internship: String(oid()), coverNote: "  I love testing  " });
    assert.equal(r.status, 201);
    const doc = create.mock.calls[0].arguments[0];
    assert.equal(doc.coverNote, "I love testing");
    assert.equal(String(doc.student), String(studentDoc._id));
    assert.deepEqual(doc.timeline, [{ status: "submitted", note: "Application submitted" }]);
  });
  it("DT-APP-R5b job with no deadline -> 201", async () => {
    arrange();
    const r = await apply({ internship: String(oid()) });
    assert.equal(r.status, 201);
  });
  it("DT-APP-R6 already applied (unique index) -> 409", async () => {
    arrange({
      createImpl: async () => {
        throw Object.assign(new Error("E11000 duplicate key"), { code: 11000 });
      },
    });
    const r = await apply({ internship: String(oid()) });
    assert.equal(r.status, 409);
  });
  it("DT-APP-R8 internship id that is not a valid ObjectId -> 400 'Choose a valid job'", async () => {
    const { jobFind } = arrange();
    const r = await apply({ internship: "not-an-id" });
    assert.deepEqual([r.status, r.body.message], [400, "Choose a valid job"]);
    assert.equal(jobFind.mock.callCount(), 0);
  });
  it("DT-APP-R7 only students may apply -> 403", async () => {
    stubAuthUsers();
    const r = await api.request("POST", "/api/applications", { token: T.company, body: { internship: String(oid()) } });
    assert.equal(r.status, 403);
  });
});

describe("Re-applying to a job (client shows 'Apply now' again after a withdrawal)", () => {
  it("API-RAP-01 re-applying after withdrawing reopens the same application -> 201", async () => {
    arrange();
    const existing = appDoc({ status: "withdrawn", timeline: [{ status: "submitted" }, { status: "withdrawn" }] });
    stub(Application, "findOne", existing);
    const create = stub(Application, "create", async () => assert.fail("must reuse the record"));
    const r = await apply({ internship: String(oid()), coverNote: "Trying again" });
    assert.equal(r.status, 201);
    assert.equal(existing.status, "submitted");
    assert.equal(existing.coverNote, "Trying again");
    assert.equal(existing.timeline.at(-1).status, "submitted");
    assert.equal(existing.save.mock.callCount(), 1);
    assert.equal(create.mock.callCount(), 0);
  });
  it("API-RAP-02 applying twice while the first is still open -> 409 with a clear message", async () => {
    arrange();
    stub(Application, "findOne", appDoc({ status: "reviewing" }));
    const r = await apply({ internship: String(oid()) });
    assert.equal(r.status, 409);
    assert.equal(r.body.message, "You have already applied to this job");
  });
});

describe("Boundary Value Analysis - cover note length (max 1000)", () => {
  for (const [len, status] of [
    [999, 201],
    [1000, 201],
    [1001, 400],
  ])
    it(`BVA-NOTE length ${len} -> ${status}`, async () => {
      arrange();
      const r = await apply({ internship: String(oid()), coverNote: "n".repeat(len) });
      assert.equal(r.status, status);
    });
  it("BVA-NOTE 1001 chars of which 1 is surrounding whitespace -> accepted (trimmed first)", async () => {
    arrange();
    const r = await apply({ internship: String(oid()), coverNote: " " + "n".repeat(1000) });
    assert.equal(r.status, 201);
  });
});

describe("Boundary Value Analysis - application deadline", () => {
  it("BVA-DL-01 deadline 1 second in the past -> rejected", async () => {
    arrange({ job: activeJob({ deadline: new Date(Date.now() - 1000) }) });
    assert.equal((await apply({ internship: String(oid()) })).status, 400);
  });
  it("BVA-DL-02 deadline 1 minute in the future -> accepted", async () => {
    arrange({ job: activeJob({ deadline: new Date(Date.now() + 60_000) }) });
    assert.equal((await apply({ internship: String(oid()) })).status, 201);
  });
});

describe("GET /api/applications", () => {
  it("API-APL-01 student sees only their own applications", async () => {
    stubAuthUsers();
    stub(Student, "findOne", studentDoc);
    const find = stub(Application, "find", () => fakeChain([]));
    const r = await api.request("GET", "/api/applications", { token: T.student });
    assert.equal(r.status, 200);
    assert.deepEqual(find.mock.calls[0].arguments[0], { student: studentDoc._id });
  });
  it("API-APL-02 student without profile gets an empty list (student: null)", async () => {
    stubAuthUsers();
    stub(Student, "findOne", null);
    const find = stub(Application, "find", () => fakeChain([]));
    await api.request("GET", "/api/applications", { token: T.student });
    assert.deepEqual(find.mock.calls[0].arguments[0], { student: null });
  });
  it("API-APL-03 company sees applications for its own listings only", async () => {
    stubAuthUsers();
    const ids = [oid(), oid()];
    const owned = stub(Internship, "find", () => ({ distinct: async () => ids }));
    const find = stub(Application, "find", () => fakeChain([]));
    await api.request("GET", "/api/applications", { token: T.company });
    assert.equal(String(owned.mock.calls[0].arguments[0].company), String(users.company._id));
    assert.deepEqual(find.mock.calls[0].arguments[0], { internship: { $in: ids } });
  });
  it("API-APL-04 admin sees all applications", async () => {
    stubAuthUsers();
    const find = stub(Application, "find", () => fakeChain([]));
    await api.request("GET", "/api/applications", { token: T.admin });
    assert.deepEqual(find.mock.calls[0].arguments[0], {});
  });
});

function fakeChain(value) {
  const q = { sort: () => q, populate: () => q, then: (res, rej) => Promise.resolve(value).then(res, rej) };
  return q;
}

// A saved application document as returned by Mongoose.
const appDoc = (over = {}) => {
  const d = { _id: oid(), status: "submitted", timeline: [{ status: "submitted" }], internship: { company: users.company._id }, ...over };
  d.save = mock.fn(async () => d);
  return d;
};

describe("PATCH /api/applications/:id/status", () => {
  const patch = (token, body, id = oid()) => api.request("PATCH", `/api/applications/${id}/status`, { token, body });
  it("API-STS-01 owner company moves application to interview -> 200 and timeline entry", async () => {
    stubAuthUsers();
    const d = appDoc();
    stub(Application, "findById", d);
    const r = await patch(T.company, { status: "interview", note: "Tuesday 10am" });
    assert.equal(r.status, 200);
    assert.equal(d.status, "interview");
    assert.deepEqual(d.timeline.at(-1), { status: "interview", note: "Tuesday 10am" });
    assert.equal(d.save.mock.callCount(), 1);
  });
  it("API-STS-02 default note is generated", async () => {
    stubAuthUsers();
    const d = appDoc();
    stub(Application, "findById", d);
    await patch(T.admin, { status: "reviewing" });
    assert.equal(d.timeline.at(-1).note, "Status changed to reviewing");
  });
  it("API-STS-03 invalid status (including 'withdrawn') -> 400", async () => {
    stubAuthUsers();
    for (const status of ["hired", "withdrawn", undefined]) {
      const r = await patch(T.company, { status });
      assert.equal(r.status, 400, String(status));
    }
  });
  it("API-STS-04 another company -> 403", async () => {
    stubAuthUsers();
    stub(Application, "findById", appDoc());
    assert.equal((await patch(T.other, { status: "rejected" })).status, 403);
  });
  it("API-STS-05 withdrawn application cannot be changed -> 400", async () => {
    stubAuthUsers();
    stub(Application, "findById", appDoc({ status: "withdrawn" }));
    const r = await patch(T.company, { status: "reviewing" });
    assert.deepEqual([r.status, r.body.message], [400, "This application was withdrawn by the candidate"]);
  });
  it("API-STS-06 missing application -> 404; student role -> 403", async () => {
    stubAuthUsers();
    stub(Application, "findById", null);
    assert.equal((await patch(T.company, { status: "reviewing" })).status, 404);
    assert.equal((await patch(T.student, { status: "reviewing" })).status, 403);
  });
});

describe("PATCH /api/applications/:id/withdraw and DELETE /api/applications/:id", () => {
  it("API-WDR-01 student withdraws own submitted application -> 200", async () => {
    stubAuthUsers();
    stub(Student, "findOne", studentDoc);
    const d = appDoc();
    const find = stub(Application, "findOne", d);
    const r = await api.request("PATCH", `/api/applications/${d._id}/withdraw`, { token: T.student });
    assert.equal(r.status, 200);
    assert.equal(d.status, "withdrawn");
    assert.equal(String(find.mock.calls[0].arguments[0].student), String(studentDoc._id));
  });
  it("API-WDR-03 (TDD-2) offered / rejected / withdrawn applications cannot be withdrawn -> 400, nothing saved", async () => {
    for (const status of ["offered", "rejected", "withdrawn"]) {
      stubAuthUsers();
      stub(Student, "findOne", studentDoc);
      const d = appDoc({ status });
      stub(Application, "findOne", d);
      const r = await api.request("PATCH", `/api/applications/${d._id}/withdraw`, { token: T.student });
      assert.equal(r.status, 400, status);
      assert.equal(d.status, status);
      assert.equal(d.save.mock.callCount(), 0);
      restore();
    }
  });
  it("API-WDR-02 someone else's application -> 404", async () => {
    stubAuthUsers();
    stub(Student, "findOne", studentDoc);
    stub(Application, "findOne", null);
    const r = await api.request("PATCH", `/api/applications/${oid()}/withdraw`, { token: T.student });
    assert.equal(r.status, 404);
  });
  it("API-DLA-01 student deletes own application -> 200", async () => {
    stubAuthUsers();
    stub(Student, "findOne", studentDoc);
    const del = stub(Application, "findOneAndDelete", { _id: oid() });
    const r = await api.request("DELETE", `/api/applications/${oid()}`, { token: T.student });
    assert.equal(r.status, 200);
    assert.equal(String(del.mock.calls[0].arguments[0].student), String(studentDoc._id));
  });
  it("API-DLA-02 deleting someone else's application -> 404", async () => {
    stubAuthUsers();
    stub(Student, "findOne", studentDoc);
    stub(Application, "findOneAndDelete", null);
    assert.equal((await api.request("DELETE", `/api/applications/${oid()}`, { token: T.student })).status, 404);
  });
  it("API-DLA-03 company cannot delete applications -> 403", async () => {
    stubAuthUsers();
    assert.equal((await api.request("DELETE", `/api/applications/${oid()}`, { token: T.company })).status, 403);
  });
});
