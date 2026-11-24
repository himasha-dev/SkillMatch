// API tests for /api/students/profile with the database stubbed.
import { describe, it, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "../helpers/http.js";
import { users, tokenFor, stubAuthUsers, stub, restore } from "../helpers/fakes.js";
import { Student } from "../../src/models.js";

let api;
before(async () => (api = await startServer()));
after(() => api.close());
afterEach(restore);

const body = { degree: "Bachelor", field: " Computer Eng ", gpa: "3.4", skills: [" React", "React", "SQL"], location: " Galle " };

describe("/api/students/profile", () => {
  it("API-PRF-01 student with no profile yet gets null", async () => {
    stubAuthUsers();
    stub(Student, "findOne", null);
    const r = await api.request("GET", "/api/students/profile", { token: tokenFor(users.student) });
    assert.equal(r.status, 200);
    assert.equal(r.body, null);
  });
  it("API-PRF-02 PUT upserts a cleaned profile for the logged-in user only", async () => {
    stubAuthUsers();
    const upd = stub(Student, "findOneAndUpdate", (filter, data) => Promise.resolve({ ...data }));
    const r = await api.request("PUT", "/api/students/profile", { token: tokenFor(users.student), body });
    assert.equal(r.status, 200);
    const [filter, data, opts] = upd.mock.calls[0].arguments;
    assert.equal(String(filter.user), String(users.student._id));
    assert.equal(data.field, "Computer Eng");
    assert.equal(data.gpa, 3.4);
    assert.deepEqual(data.skills, ["React", "SQL"]);
    assert.equal(data.location, "Galle");
    assert.equal(data.experienceMonths, 0);
    assert.deepEqual(opts, { new: true, upsert: true, runValidators: true });
  });
  it("API-PRF-05 location omitted -> defaults to 'Remote'; experience kept as a number", async () => {
    stubAuthUsers();
    const upd = stub(Student, "findOneAndUpdate", (f, data) => Promise.resolve({ ...data }));
    const rest = { ...body };
    delete rest.location;
    const r = await api.request("PUT", "/api/students/profile", { token: tokenFor(users.student), body: { ...rest, experienceMonths: "12" } });
    assert.equal(r.status, 200);
    assert.equal(upd.mock.calls[0].arguments[1].location, "Remote");
    assert.equal(upd.mock.calls[0].arguments[1].experienceMonths, 12);
  });
  it("API-PRF-03 invalid profile -> 400 and no write", async () => {
    stubAuthUsers();
    const upd = stub(Student, "findOneAndUpdate", null);
    const r = await api.request("PUT", "/api/students/profile", { token: tokenFor(users.student), body: { ...body, gpa: 4.5 } });
    assert.equal(r.status, 400);
    assert.equal(r.body.errors.gpa, "GPA must be between 0 and 4");
    assert.equal(upd.mock.callCount(), 0);
  });
  it("API-PRF-04 company cannot use the student profile API -> 403", async () => {
    stubAuthUsers();
    const r = await api.request("GET", "/api/students/profile", { token: tokenFor(users.company) });
    assert.equal(r.status, 403);
  });
});
