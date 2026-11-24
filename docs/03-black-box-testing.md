# Phase 3 – Black-Box Testing

All tables below are implemented as automated tests. The test IDs appear in the test names, so they can be found with `npm test` output or `grep`. Results are from the final run (213/213 passing). Where the *first* run failed, the defect is noted.

## 3.1 Equivalence Partitioning

### EP-1 Registration password (`validateRegistration`, rule: ≥ 8 characters, contains letters AND digits)

| Class | Partition | Representative | Expected | Test | Result |
|---|---|---|---|---|---|
| V1 | ≥ 8 chars, letters + digits | `abcd1234` | accepted | EP-PW-01 | Pass |
| I1 | < 8 chars | `ab12` | "Password must be at least 8 characters" | EP-PW-02 | Pass |
| I2 | ≥ 8, letters only | `abcdefgh` | "Password must contain letters and numbers" | EP-PW-03 | Pass |
| I3 | ≥ 8, digits only | `12345678` | "Password must contain letters and numbers" | EP-PW-04 | Pass |
| I4 | not a string | `12345678` (number) | length error | EP-PW-05 | Pass |
| I5 | missing | `undefined` | length error | EP-PW-06 | Pass |

### EP-2 Account role and organization (registration)

| Class | Partition | Representative | Expected | Test | Result |
|---|---|---|---|---|---|
| V1 | role = student, no organization | `student` | accepted | EP-RL-01 | Pass |
| V2 | role = company + non-blank organization | `company`, `Acme` | accepted | EP-RL-02 | Pass |
| I1 | role = company + blank organization | `"   "` | "Organization is required for companies" | EP-RL-03 | Pass |
| I2 | privileged role | `admin` | "Choose candidate or company" | EP-RL-04 | Pass |
| I3 | missing role | – | "Choose candidate or company" | EP-RL-05 | Pass |

### EP-3 GPA on the candidate profile (`validateProfile`, valid range 0–4)

| Class | Partition | Representative | Expected | Test | Result |
|---|---|---|---|---|---|
| V1 | number in [0, 4] | `2.75` | accepted | EP-GPA-01 | Pass |
| V2 | numeric string in [0, 4] | `"3.5"` | accepted | EP-GPA-02 | Pass |
| I1 | number < 0 | `-1` | GPA error | EP-GPA-03 | Pass |
| I2 | number > 4 | `5` | GPA error | EP-GPA-04 | Pass |
| I3 | non-numeric text | `"abc"` | GPA error | EP-GPA-05 | Pass |
| I4 | empty string | `""` | GPA error | EP-GPA-06 | Pass |
| I5 | null | `null` | GPA error | EP-GPA-07 | Pass |
| I6 | boolean | `true` | GPA error | EP-GPA-08 | **Failed on first run → BUG-14**, Pass after fix |
| I7 | array | `[3]` | GPA error | EP-GPA-09 | **Failed on first run → BUG-14**, Pass after fix |

The I6/I7 classes found a real defect. `Number(true) === 1` and `Number([3]) === 3`, so the original check `Number(gpa) >= 0 && Number(gpa) <= 4` accepted a boolean or an array as a GPA. The same flaw affected `openings` and `minimumGpa` on listings (EP-OPN-01, EP-OPN-02). Fix: a strict `toNumber()` helper that accepts only real numbers or non-blank numeric strings.

Additional EP for email (EP-EM-01 … EP-EM-06) covers: a valid address with surrounding spaces, no `@`, no domain dot, an embedded space, empty, and an object such as `{ "$gt": "" }`. All pass.

## 3.2 Boundary Value Analysis

Two-value plus inner-point boundaries (min−, min, min+, max−, max, max+) on numeric, length and date fields:

| Field (rule) | Values tested → expected | Tests | Result |
|---|---|---|---|
| Profile GPA and listing minimum GPA [0, 4] | −0.01 ✗, 0 ✓, 0.01 ✓, 3.99 ✓, 4 ✓, 4.01 ✗ | BVA-GPA (12 tests) | Pass |
| Password length ≥ 8 | 7 ✗, 8 ✓, 9 ✓ | BVA-PW | Pass |
| Listing title length ≥ 3 | 2 ✗, 3 ✓, 4 ✓ | BVA-TTL | Pass |
| Listing description ≥ 10 | 9 ✗, 10 ✓, 11 ✓ | BVA-DSC | Pass |
| Openings integer ≥ 1 | 0 ✗, 1 ✓, 2 ✓, 1.5 ✗ | BVA-OPN | Pass |
| Name length ≥ 2 | 1 ✗, 2 ✓, 3 ✓ | BVA-NAME | Pass |
| Experience months ≥ 0 (schema max 600) | −1 ✗, 0 ✓, 600 ✓; 601 → 400 from the Mongoose schema on a real DB | BVA-EXP, IT-08 | Pass / IT-08 runs in CI |
| Cover note ≤ 1000 chars (after trim) | 999 → 201, 1000 → 201, 1001 → 400, " " + 1000 → 201 | BVA-NOTE | Pass |
| Application deadline (date-time) | deadline = now − 1 s → 400; now + 60 s → 201 | BVA-DL-01/02 | Pass |
| Listing deadline (date, server) | yesterday ✗, today ✓, tomorrow ✓; with a fixed clock, 22 Nov 23:59:59Z ✗, 23 Nov 00:00 ✓ | TDD-1a … TDD-1i | **Failed on first run → BUG-08**, Pass after fix |
| Page size `limit` [1, 50], default 12 | −5 → 1, **0 → 1**, 1 → 1, 50 → 50, 51 → 50, none → 12 | BVA-LIM-01 … 06 | **`limit=0` returned 12 → BUG-11**, Pass after fix |
| Page number ≥ 1 | 0 → 1, −1 → 1; page 3 with limit 5 → skip 10 | BVA-PG-01/02 | Pass |

**BUG-11 explained:** `parseInt("0") || 12` evaluates to 12 because `0` is falsy, so the lower boundary was never applied. The fix uses an explicit `Number.isNaN` check (`intOr()` helper), so only a missing or non-numeric value falls back to the default.

## 3.3 Decision table – "Submit an application" (DT-1, `POST /api/applications`)

Conditions are evaluated in the order the code checks them, so later conditions are "–" (don't care) once an earlier one decides the outcome.

| Condition / Action | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 |
|---|---|---|---|---|---|---|---|---|---|
| C1 Caller is a candidate (role student) | N | Y | Y | Y | Y | Y | Y | Y | Y |
| C2 Candidate has a profile | – | N | Y | Y | Y | Y | Y | Y | Y |
| C3 Cover note ≤ 1000 chars | – | – | N | Y | Y | Y | Y | Y | Y |
| C4 Job id is a valid ObjectId string | – | – | – | N | Y | Y | Y | Y | Y |
| C5 Job exists and is active | – | – | – | – | N | Y | Y | Y | Y |
| C6 Deadline not passed (or none) | – | – | – | – | – | N | Y | Y | Y |
| C7 Previous application exists | – | – | – | – | – | – | N | Y | Y |
| C8 Previous application is withdrawn | – | – | – | – | – | – | – | N | Y |
| **Action / response** | 403 | 400 profile | 400 note | 400 invalid job | 404 | 400 deadline | **201 created** | 409 already applied | **201 reopened** |
| Test | DT-APP-R7 | DT-APP-R1 | DT-APP-R2 | DT-APP-R8, SEC-A03-04 | DT-APP-R3 | DT-APP-R4 | DT-APP-R5, R5b | API-RAP-02 (R6 for the DB-race path) | API-RAP-01 |
| Result | Pass | Pass | Pass | Pass (after BUG-03 fix) | Pass | Pass | Pass | Pass (after BUG-05 fix) | Pass (after BUG-05 fix) |

Building the table found two defects:

- **R4 (BUG-03):** the original code had no C4 at all. A JSON object such as `{"$ne": null}` was passed straight into the MongoDB query, which is NoSQL injection.
- **R8/R9 (BUG-05):** the original code had no C7 or C8. A second application hit the unique index and returned the generic "A record with these details already exists". Re-applying after a withdrawal, which the UI offers, was impossible.

The same table is expressed as a BDD scenario outline (`qa/features/apply_for_internship.feature`).
