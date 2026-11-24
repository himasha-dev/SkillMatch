// TDD cycle 1 - "A company cannot publish a listing whose deadline is already in the past".
// Written BEFORE the production code (see docs/05-unit-tdd-bdd.md for the red/green/refactor log).
import "../helpers/env.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateInternship, checkDeadline } from "../../src/validators.js";

const base = { title: "Data Intern", description: "Clean and model datasets", requiredSkills: ["SQL"] };
const isoDay = (offsetDays) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

describe("TDD-1 listing deadline must not be in the past (server side)", () => {
  it("TDD-1a rejects yesterday's date", () =>
    assert.equal(validateInternship({ ...base, deadline: isoDay(-1) }).deadline, "Deadline cannot be in the past"));
  it("TDD-1b rejects a date a year ago", () =>
    assert.equal(validateInternship({ ...base, deadline: isoDay(-365) }).deadline, "Deadline cannot be in the past"));
  it("TDD-1c accepts today's date (boundary)", () =>
    assert.equal(validateInternship({ ...base, deadline: isoDay(0) }).deadline, undefined));
  it("TDD-1d accepts tomorrow", () =>
    assert.equal(validateInternship({ ...base, deadline: isoDay(1) }).deadline, undefined));
  it("TDD-1e still reports an unparseable date as invalid, not as past", () =>
    assert.equal(validateInternship({ ...base, deadline: "not-a-date" }).deadline, "Deadline is not a valid date"));
  it("TDD-1f no deadline (open-ended listing) is allowed", () =>
    assert.equal(validateInternship({ ...base, deadline: null }).deadline, undefined));
});

// Added in the REFACTOR step: the extracted helper is now testable with an injected clock,
// so the "today" boundary no longer depends on when the suite runs.
describe("TDD-1 refactor: checkDeadline with a fixed clock", () => {
  const now = new Date("2026-11-23T15:30:00Z");
  it("TDD-1g 2026-11-22T23:59:59Z is past", () => assert.equal(checkDeadline("2026-11-22T23:59:59Z", now), "Deadline cannot be in the past"));
  it("TDD-1h 2026-11-23 (start of today) is allowed", () => assert.equal(checkDeadline("2026-11-23", now), null));
  it("TDD-1i empty value is allowed", () => assert.equal(checkDeadline("", now), null));
});
