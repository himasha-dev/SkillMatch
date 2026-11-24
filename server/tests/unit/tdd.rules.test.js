// TDD cycle 2 - application status rules (written BEFORE src/rules.js existed).
// Defect: the API let a student "withdraw" an application that was already offered,
// rejected or withdrawn (the UI hides the button, but the endpoint allowed it).
import "../helpers/env.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canWithdraw, isCompanySettable, OPEN_STATUSES, FINAL_STATUSES } from "../../src/rules.js";
import { APPLICATION_STATUSES } from "../../src/models.js";

describe("TDD-2 canWithdraw(status)", () => {
  for (const s of ["submitted", "reviewing", "shortlisted", "interview"])
    it(`TDD-2 an application that is '${s}' can be withdrawn`, () => assert.equal(canWithdraw(s), true));
  for (const s of ["offered", "rejected", "withdrawn"])
    it(`TDD-2 an application that is '${s}' cannot be withdrawn`, () => assert.equal(canWithdraw(s), false));
  it("TDD-2 an unknown status cannot be withdrawn", () => assert.equal(canWithdraw("hired"), false));
});

describe("TDD-2 refactor: status lists derive from the model", () => {
  it("TDD-2r open + final statuses cover every model status exactly once", () =>
    assert.deepEqual([...OPEN_STATUSES, ...FINAL_STATUSES].sort(), [...APPLICATION_STATUSES].sort()));
  it("TDD-2r companies can set every status except 'withdrawn'", () => {
    assert.equal(isCompanySettable("withdrawn"), false);
    assert.equal(isCompanySettable("offered"), true);
    assert.equal(isCompanySettable(undefined), false);
  });
});
