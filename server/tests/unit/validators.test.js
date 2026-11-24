// Unit + black-box tests for server/src/validators.js
// Test IDs (EP-*, BVA-*, UT-*) match docs/03-black-box-testing.md and the test case sheet.
import "../helpers/env.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateRegistration,
  validateInternship,
  validateProfile,
  cleanSkills,
  escapeRegex,
} from "../../src/validators.js";

const reg = (over = {}) => ({
  name: "Nimal Perera",
  email: "nimal@example.com",
  password: "secret123",
  role: "student",
  ...over,
});
const job = (over = {}) => ({
  title: "Backend Intern",
  description: "Build REST APIs with Node.js",
  requiredSkills: ["Node.js"],
  ...over,
});
const profile = (over = {}) => ({
  degree: "Bachelor",
  field: "Computer Engineering",
  gpa: 3.2,
  skills: ["Java"],
  experienceMonths: 6,
  ...over,
});

describe("Equivalence Partitioning - registration password", () => {
  const cases = [
    ["EP-PW-01", "valid: >=8 chars with letters and digits", "abcd1234", undefined],
    ["EP-PW-02", "invalid: shorter than 8", "ab12", "Password must be at least 8 characters"],
    ["EP-PW-03", "invalid: letters only", "abcdefgh", "Password must contain letters and numbers"],
    ["EP-PW-04", "invalid: digits only", "12345678", "Password must contain letters and numbers"],
    ["EP-PW-05", "invalid: not a string", 12345678, "Password must be at least 8 characters"],
    ["EP-PW-06", "invalid: missing", undefined, "Password must be at least 8 characters"],
  ];
  for (const [id, label, password, expected] of cases)
    it(`${id} ${label}`, () => assert.equal(validateRegistration(reg({ password })).password, expected));
});

describe("Equivalence Partitioning - account role / organization", () => {
  it("EP-RL-01 valid: student without organization", () =>
    assert.deepEqual(validateRegistration(reg({ role: "student" })), {}));
  it("EP-RL-02 valid: company with organization", () =>
    assert.deepEqual(validateRegistration(reg({ role: "company", organization: "Acme" })), {}));
  it("EP-RL-03 invalid: company with blank organization", () =>
    assert.equal(
      validateRegistration(reg({ role: "company", organization: "   " })).organization,
      "Organization is required for companies",
    ));
  it("EP-RL-04 invalid: self-registering as admin is rejected", () =>
    assert.equal(validateRegistration(reg({ role: "admin" })).role, "Choose candidate or company"));
  it("EP-RL-05 invalid: missing role", () =>
    assert.equal(validateRegistration(reg({ role: undefined })).role, "Choose candidate or company"));
});

describe("Equivalence Partitioning - email", () => {
  it("EP-EM-01 valid address (surrounding spaces trimmed)", () =>
    assert.equal(validateRegistration(reg({ email: "  a.b@uni.ac.lk " })).email, undefined));
  for (const [id, email] of [
    ["EP-EM-02", "no-at-sign.com"],
    ["EP-EM-03", "a@b"],
    ["EP-EM-04", "a b@c.com"],
    ["EP-EM-05", ""],
  ])
    it(`${id} invalid: ${JSON.stringify(email)}`, () =>
      assert.equal(validateRegistration(reg({ email })).email, "Enter a valid email address"));
  it("EP-EM-06 invalid: non-string (object) is rejected, not coerced", () =>
    assert.equal(validateRegistration(reg({ email: { $gt: "" } })).email, "Enter a valid email address"));
});

describe("Equivalence Partitioning - profile GPA", () => {
  it("EP-GPA-01 valid: number inside 0..4", () => assert.equal(validateProfile(profile({ gpa: 2.75 })).gpa, undefined));
  it("EP-GPA-02 valid: numeric string inside 0..4", () => assert.equal(validateProfile(profile({ gpa: "3.5" })).gpa, undefined));
  for (const [id, label, gpa] of [
    ["EP-GPA-03", "below range", -1],
    ["EP-GPA-04", "above range", 5],
    ["EP-GPA-05", "non-numeric text", "abc"],
    ["EP-GPA-06", "empty string", ""],
    ["EP-GPA-07", "null", null],
  ])
    it(`${id} invalid: ${label}`, () => assert.equal(validateProfile(profile({ gpa })).gpa, "GPA must be between 0 and 4"));
});

describe("Equivalence Partitioning - non-numeric types for numeric fields", () => {
  it("EP-GPA-08 invalid: boolean true is not a GPA", () =>
    assert.equal(validateProfile(profile({ gpa: true })).gpa, "GPA must be between 0 and 4"));
  it("EP-GPA-09 invalid: array is not a GPA", () =>
    assert.equal(validateProfile(profile({ gpa: [3] })).gpa, "GPA must be between 0 and 4"));
  it("EP-OPN-01 invalid: boolean true is not a number of openings", () =>
    assert.ok("openings" in validateInternship(job({ openings: true }))));
  it("EP-OPN-02 invalid: empty array minimumGpa is rejected", () =>
    assert.ok("minimumGpa" in validateInternship(job({ minimumGpa: [] }))));
});

describe("Boundary Value Analysis - GPA (0..4)", () => {
  const expectations = [
    [-0.01, false],
    [0, true],
    [0.01, true],
    [3.99, true],
    [4, true],
    [4.01, false],
  ];
  for (const [gpa, ok] of expectations) {
    it(`BVA-GPA profile gpa=${gpa} -> ${ok ? "accepted" : "rejected"}`, () =>
      assert.equal("gpa" in validateProfile(profile({ gpa })), !ok));
    it(`BVA-GPA internship minimumGpa=${gpa} -> ${ok ? "accepted" : "rejected"}`, () =>
      assert.equal("minimumGpa" in validateInternship(job({ minimumGpa: gpa })), !ok));
  }
});

describe("Boundary Value Analysis - password length (min 8)", () => {
  for (const [len, ok] of [
    [7, false],
    [8, true],
    [9, true],
  ])
    it(`BVA-PW length ${len} -> ${ok ? "accepted" : "rejected"}`, () => {
      const password = "a1".padEnd(len, "x");
      assert.equal(password.length, len);
      assert.equal("password" in validateRegistration(reg({ password })), !ok);
    });
});

describe("Boundary Value Analysis - internship text and openings", () => {
  for (const [len, ok] of [
    [2, false],
    [3, true],
    [4, true],
  ])
    it(`BVA-TTL title length ${len} -> ${ok ? "accepted" : "rejected"}`, () =>
      assert.equal("title" in validateInternship(job({ title: "x".repeat(len) })), !ok));
  for (const [len, ok] of [
    [9, false],
    [10, true],
    [11, true],
  ])
    it(`BVA-DSC description length ${len} -> ${ok ? "accepted" : "rejected"}`, () =>
      assert.equal("description" in validateInternship(job({ description: "y".repeat(len) })), !ok));
  for (const [openings, ok] of [
    [0, false],
    [1, true],
    [2, true],
    [1.5, false],
  ])
    it(`BVA-OPN openings=${openings} -> ${ok ? "accepted" : "rejected"}`, () =>
      assert.equal("openings" in validateInternship(job({ openings })), !ok));
  for (const [name, ok] of [
    ["A", false],
    ["Al", true],
    ["Ali", true],
  ])
    it(`BVA-NAME name length ${name.length} -> ${ok ? "accepted" : "rejected"}`, () =>
      assert.equal("name" in validateRegistration(reg({ name })), !ok));
});

describe("Boundary Value Analysis - experience months", () => {
  it("BVA-EXP -1 rejected", () => assert.ok("experienceMonths" in validateProfile(profile({ experienceMonths: -1 }))));
  it("BVA-EXP 0 accepted", () => assert.ok(!("experienceMonths" in validateProfile(profile({ experienceMonths: 0 })))));
  it("BVA-EXP 600 accepted (schema maximum)", () =>
    assert.ok(!("experienceMonths" in validateProfile(profile({ experienceMonths: 600 })))));
});

describe("validateInternship - other rules", () => {
  it("UT-INT-01 a complete valid listing has no errors", () => assert.deepEqual(validateInternship(job()), {}));
  it("UT-INT-02 requires at least one skill", () =>
    assert.equal(validateInternship(job({ requiredSkills: [] })).requiredSkills, "Add at least one required skill"));
  it("UT-INT-03 rejects skills that are not an array", () =>
    assert.ok("requiredSkills" in validateInternship(job({ requiredSkills: "Node" }))));
  it("UT-INT-04 rejects an unknown degree", () =>
    assert.equal(validateInternship(job({ minimumDegree: "Diploma+" })).minimumDegree, "Invalid degree level"));
  it("UT-INT-05 rejects an unparseable deadline", () =>
    assert.equal(validateInternship(job({ deadline: "31/31/2026" })).deadline, "Deadline is not a valid date"));
  it("UT-INT-06 partial update only checks the fields sent", () =>
    assert.deepEqual(validateInternship({ openings: 3 }, { partial: true }), {}));
  it("UT-INT-07 partial update still validates a field that is sent", () =>
    assert.ok("title" in validateInternship({ title: "ab" }, { partial: true })));
});

describe("validateProfile - other rules", () => {
  it("UT-PRF-01 complete valid profile has no errors", () => assert.deepEqual(validateProfile(profile()), {}));
  it("UT-PRF-02 rejects unknown degree", () => assert.ok("degree" in validateProfile(profile({ degree: "BSc" }))));
  it("UT-PRF-03 requires field of study (min 2 chars)", () => assert.ok("field" in validateProfile(profile({ field: " E " }))));
  it("UT-PRF-04 requires at least one skill", () => assert.ok("skills" in validateProfile(profile({ skills: [] }))));
  it("UT-PRF-05 missing field of study is reported (not a crash)", () =>
    assert.equal(validateProfile(profile({ field: undefined })).field, "Field of study is required"));
});

describe("helpers", () => {
  it("UT-SKL-01 cleanSkills trims, drops blanks and removes duplicates", () =>
    assert.deepEqual(cleanSkills([" React", "React", "", "  ", "SQL ", 42]), ["React", "SQL", "42"]));
  it("UT-SKL-02 cleanSkills tolerates non-arrays", () => assert.deepEqual(cleanSkills("React"), []));
  it("UT-RGX-01 escapeRegex neutralises regex metacharacters", () => {
    const rx = new RegExp(escapeRegex("C++ (.NET)*"));
    assert.ok(rx.test("Senior C++ (.NET)* dev"));
    assert.ok(!rx.test("CCC .NET"));
  });
});
