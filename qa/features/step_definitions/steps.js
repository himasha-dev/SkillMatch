import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { users, tokenFor, stubAuthUsers, stub, oid } from "../../../server/tests/helpers/fakes.js";
import { Student, Internship, Application } from "../../../server/src/models.js";

const DAY = 86_400_000;

// Wire the stubs so the API "database" is the World's in-memory maps.
function installRepository(world) {
  stubAuthUsers();
  stub(Student, "findOne", () => Promise.resolve(world.studentDoc));
  stub(Internship, "findOne", (filter) => {
    const job = [...world.jobs.values()].find((j) => String(j._id) === String(filter._id) && j.active === filter.active);
    return Promise.resolve(job || null);
  });
  stub(Application, "findOne", (filter) => {
    const found = [...world.applications.values()].find(
      (a) =>
        String(a._id) === String(filter._id ?? a._id) &&
        String(a.student) === String(filter.student) &&
        String(a.internship) === String(filter.internship ?? a.internship),
    );
    return Promise.resolve(found || null);
  });
  stub(Application, "create", async (doc) => {
    const row = { _id: oid(), status: "submitted", ...doc };
    const title = [...world.jobs.entries()].find(([, j]) => String(j._id) === String(doc.internship))?.[0];
    world.applications.set(title, row);
    return row;
  });
}

const makeApplication = (world, title, status) => {
  const row = {
    _id: oid(),
    student: world.studentDoc._id,
    internship: world.jobs.get(title)._id,
    status,
    timeline: [{ status: "submitted", note: "Application submitted" }],
  };
  row.save = async () => row;
  world.applications.set(title, row);
  return row;
};

Given("I am a logged-in candidate with a completed profile", function () {
  this.token = tokenFor(users.student);
  this.studentDoc = { _id: oid(), user: users.student._id };
  installRepository(this);
});

Given("an active internship {string} that closes in {int} days", function (title, days) {
  this.jobs.set(title, { _id: oid(), title, active: true, deadline: new Date(Date.now() + days * DAY) });
});

Given("an active internship {string} that closed {int} day(s) ago", function (title, days) {
  this.jobs.set(title, { _id: oid(), title, active: true, deadline: new Date(Date.now() - days * DAY) });
});

Given("I have an application for {string} with status {string}", function (title, status) {
  this.jobs.set(title, { _id: oid(), title, active: true });
  makeApplication(this, title, status);
});

When("I apply to {string} with the cover note {string}", async function (title, coverNote) {
  this.current = title;
  this.response = await this.api.request("POST", "/api/applications", {
    token: this.token,
    body: { internship: String(this.jobs.get(title)._id), coverNote },
  });
});

When("I apply to {string} with a cover note of {int} characters", async function (title, length) {
  this.current = title;
  this.response = await this.api.request("POST", "/api/applications", {
    token: this.token,
    body: { internship: String(this.jobs.get(title)._id), coverNote: "x".repeat(length) },
  });
});

When("I withdraw my application for {string}", async function (title) {
  this.current = title;
  const row = this.applications.get(title);
  this.response = await this.api.request("PATCH", `/api/applications/${row._id}/withdraw`, { token: this.token });
});

Then("my application is accepted", function () {
  assert.equal(this.response.status, 201, JSON.stringify(this.response.body));
});

Then("my application is refused with status {int} and message {string}", function (status, message) {
  assert.equal(this.response.status, status);
  assert.equal(this.response.body.message, message);
});

Then("the response status is {int}", function (status) {
  assert.equal(this.response.status, status, JSON.stringify(this.response.body));
});

Then("the application status is {string}", function (status) {
  assert.equal(this.applications.get(this.current).status, status);
});

Then("the application history starts with {string}", function (note) {
  assert.equal(this.applications.get(this.current).timeline[0].note, note);
});
