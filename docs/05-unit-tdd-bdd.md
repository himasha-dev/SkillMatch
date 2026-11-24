# Phase 5 – Unit Testing, TDD and BDD

## 5.1 Framework choice and set-up

| Need | Choice | Reason |
|---|---|---|
| Unit and API test framework | **Node.js built-in test runner** (`node:test`, `node:assert/strict`) | The project is JavaScript on Node 22. Zero new dependencies (the lockfile is untouched). It provides `describe/it`, hooks, **mocking** (`mock.method`, `mock.fn`), **coverage** and **lcov/JUnit reporters** for SonarQube and CI. It is the JS counterpart of JUnit or PyTest. |
| HTTP-level tests | Real Express app started on a random port + native `fetch` | Exercises routing, JSON parsing, middleware and error handling exactly as in production. |
| Persistence in unit/API tests | Test doubles for the Mongoose models (`tests/helpers/fakes.js`) | Deterministic and fast (≈ 3.5 s for 213 tests); no database needed. A real MongoDB is used in `tests/integration`. |
| BDD | **Cucumber.js** (`@cucumber/cucumber`) | The standard Gherkin runner for JavaScript. |

**Testability change to production code:** the original `index.js` created the app, connected to MongoDB and started listening, all in one module. It was split into `src/app.js` (`createApp()`, no side effects) and `src/index.js` (environment checks, DB connection, `listen`). Runtime behaviour is unchanged.

Test layout and commands (in `server/`):

| Folder | Tests | Command |
|---|---|---|
| `tests/unit/` | 116 (validators, middleware, limiter, rules, TDD) | `npm run test:unit` |
| `tests/api/` | 97 (auth, students, internships, applications, security) | `npm run test:api` |
| both + coverage | 213 | `npm run test:coverage` |
| `tests/integration/` | 12 (real MongoDB) | `npm run test:integration` |

Final result: **213 tests, 213 passed, 0 failed**; coverage 100 % lines, branches and functions (`evidence/03-final-test-run-with-coverage.txt`).

## 5.2 TDD – Red → Green → Refactor

Two genuine defects were fixed test-first. Each step's real console output is saved in `docs/evidence/tdd/`.

### TDD cycle 1 – the server must reject a listing deadline in the past (BUG-08)

The client blocked past deadlines but the API accepted them, so any direct API call could publish an already-expired listing.

| Step | What was done | Result (saved output) |
|---|---|---|
| **RED** | Wrote `tests/unit/tdd.deadline.test.js`: yesterday ✗, a year ago ✗, today ✓, tomorrow ✓, unparseable date still reported as invalid, no deadline allowed. | `TDD-1-step1-RED.txt`: **2 failed** (TDD-1a, TDD-1b: expected "Deadline cannot be in the past", got `undefined`), 4 passed |
| **GREEN** | Minimum code: inside `validateInternship`, after the "invalid date" check, compare with the start of today (UTC). | `TDD-1-step2-GREEN.txt`: **6/6 passed** |
| **REFACTOR** | Extracted `checkDeadline(value, now = new Date())` and `startOfTodayUTC()`, so the validator body is one line and the clock can be injected. Added 3 tests with a fixed clock (TDD-1g … i) so the boundary no longer depends on when the suite runs. | `TDD-1-step3-REFACTOR.txt`: **all 94 unit tests passed** |

### TDD cycle 2 – a decided application cannot be withdrawn (BUG-09)

The UI hides "Withdraw" for offered, rejected and withdrawn applications, but `PATCH /api/applications/:id/withdraw` accepted it for any status. A candidate could therefore turn an offer into "withdrawn" by calling the API directly.

| Step | What was done | Result |
|---|---|---|
| **RED** | `tests/unit/tdd.rules.test.js` imports `canWithdraw` from `src/rules.js`, a module that did not exist yet. Added API test API-WDR-03 (offered, rejected or withdrawn → 400, nothing saved). | `TDD-2-step1-RED.txt`: module not found; API-WDR-03 **expected 400, actual 200** |
| **GREEN** | Created `rules.js` with a hard-coded list of open statuses; the withdraw route returns 400 when `!canWithdraw(status)`. | `TDD-2-step2-GREEN.txt`: 8/8 rule tests and 30/30 application API tests passed |
| **REFACTOR** | Status lists were duplicated in `models.js`, the status route and `rules.js`. They are now derived from the model in one place: `FINAL_STATUSES`, `OPEN_STATUSES`, `COMPANY_SETTABLE_STATUSES`, `isCompanySettable()`. The status route uses the shared rule too. Added tests proving open + final statuses partition the model's list exactly. | `TDD-2-step3-REFACTOR.txt`: all TDD tests pass. The 7 failures in that run are the *other* known defects (BUG-03/04/07/10/11), still open at that point and fixed afterwards. |

**What TDD gave us:**

- The tests define the rule before the code exists, and the RED output proves the test can fail. A test that never fails proves nothing.
- The refactor step was safe because the whole suite stayed green.
- The extracted `checkDeadline(now)` and `rules.js` are smaller, reusable and easier to test than the original inline code.

## 5.3 BDD with Gherkin and Cucumber

Feature files (`qa/features/`), written from the candidate's point of view:

```gherkin
Feature: Apply for an internship
  Background:
    Given I am a logged-in candidate with a completed profile

  Scenario: Candidate applies before the deadline
    Given an active internship "QA Automation Intern" that closes in 5 days
    When I apply to "QA Automation Intern" with the cover note "I enjoy breaking things safely"
    Then my application is accepted
    And the application status is "submitted"
    And the application history starts with "Application submitted"

  Scenario: Candidate cannot apply after the deadline
    Given an active internship "Data Intern" that closed 1 day ago
    When I apply to "Data Intern" with the cover note "Better late than never"
    Then my application is refused with status 400 and message "The application deadline has passed"

  Scenario Outline: Cover note length limit
    Given an active internship "Backend Intern" that closes in 5 days
    When I apply to "Backend Intern" with a cover note of <length> characters
    Then the response status is <status>
    Examples:
      | length | status |
      | 999    | 201    |
      | 1000   | 201    |
      | 1001   | 400    |
```

A second feature, `withdraw_application.feature`, covers withdrawing a "reviewing" application (allowed) and an "offered" one (refused). It is the BDD view of TDD cycle 2.

**Implementation:**

- `qa/features/step_definitions/steps.js` maps each step to the real API using Cucumber expressions (`{string}`, `{int}`, optional `day(s)`).
- `qa/features/support/world.js` starts the real Express app for each scenario and restores the test doubles afterwards.
- `qa/cucumber.js` writes HTML, JSON and JUnit reports to `qa/reports/`.

Run with:

```bash
cd server && npm ci          # the steps import the server code
cd ../qa && npm install && npx cucumber-js
```

**Execution status:**

| Run | Result | Status |
|---|---|---|
| Pre-check in the analysis sandbox (`evidence/bdd/bdd-precheck-run.txt`) | **7 scenarios, 32 steps, all passed** | Verified, with a caveat: Cucumber.js could not be installed offline, so the pre-check used a minimal Gherkin runner that executes the **same** `.feature` files and step definitions. This proves the step code works, but it is not a Cucumber run. |
| Official Cucumber.js run | GitHub Actions job `integration-bdd`; report artifact `cucumber-report` | **Pending:** runs on your first push. Download the artifact, or run locally, and capture a screenshot. |
