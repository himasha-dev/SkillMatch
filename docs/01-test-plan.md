# Phase 1 – Test Planning

## 1.1 System under test

**SkillMatch** is a job-matching and application-tracking web application (Option A in the task list: an existing project reused from another module). It has three tiers:

| Tier | Technology | Location in repo |
|---|---|---|
| Frontend | React 19 single-page app, built with Vite 8, icons from lucide-react | `client/` |
| Backend API | Node.js 22, Express 5 REST API, JWT authentication (jsonwebtoken), bcryptjs password hashing | `server/src/` |
| Database | MongoDB accessed through Mongoose 8 (models: User, Student, Internship, Match, Application) | `server/src/models.js` |

Two roles use the system: **candidates** (role `student`) build a qualification profile, search open internships, apply, and track or withdraw applications. **Companies** publish, edit, close and delete internship listings and decide on applications. An `admin` role exists in the data model, but it cannot be self-registered and has no UI.

## 1.2 Test objectives

1. Verify that every implemented user flow (register, log in, profile, listing CRUD, search, filter, sort and pagination, apply, withdraw, delete, status updates) behaves as specified by the code, the validation rules and the UI.
2. Validate that a candidate and a company can complete their end-to-end tasks in a real browser.
3. Achieve ≥ 90 % statement and branch coverage of the server code, using automated tests that run on every push.
4. Apply the module's techniques to real features: EP, BVA, decision tables, cyclomatic complexity and CFG, TDD, BDD, Selenium, CI/CD, JMeter, OWASP checks and SonarQube.
5. Find, log, fix and verify genuine defects, and record their root causes.

## 1.3 Scope

**In scope**

| ID | Feature / module | Main code |
|---|---|---|
| F1 | Registration and login (validation, JWT, bcrypt, role rules) | `routes/auth.js`, `validators.js`, `Auth.jsx` |
| F2 | Authentication and authorization middleware (token checks, role guard, id checks, error handling) | `middleware.js` |
| F3 | Candidate qualification profile (create/update) | `routes/students.js`, `Profile.jsx` |
| F4 | Internship listing CRUD for companies | `routes/internships.js`, `JobForm.jsx`, `Company.jsx` |
| F5 | Search, filter, sort and pagination of listings | `routes/internships.js`, `JobBrowser.jsx` |
| F6 | Apply, withdraw, delete and track applications; company status updates | `routes/applications.js`, `Student.jsx` |
| F7 | Non-functional: performance of key endpoints, OWASP Top 10 checks, usability and accessibility of the main screens | whole system |

**Out of scope**

| Item | Reason |
|---|---|
| Matching / scoring engine (`Match` model) | The model exists but no code creates or reads matches, so there is no behaviour to test. Logged as a requirement gap (BUG-16). |
| Admin user interface | Not implemented; admins cannot be created through the API. |
| Company "view applicants" UI | Not implemented in the client (the API exists and is tested). Logged as BUG-17. |
| Email delivery, payments, file uploads | Not part of the system. |
| Cross-browser and mobile matrix | Time-boxed; Chrome only (see §2.4). |
| Production infrastructure, backups, load balancing | No deployment target exists for this project. |

## 1.4 Test approach (levels and types)

| Level / type | Technique | Tool | Where |
|---|---|---|---|
| Unit | EP, BVA, statement/branch coverage, TDD | Node.js built-in test runner (`node:test`) and `node:assert` | `server/tests/unit/` |
| Component / API | Decision table, BVA, role-based access, OWASP checks; persistence replaced by test doubles | `node:test` + `fetch` against the real Express app | `server/tests/api/` |
| Integration | Full API on a real MongoDB | `node:test` + MongoDB 7 | `server/tests/integration/` |
| Acceptance (BDD) | Gherkin scenarios | Cucumber.js | `qa/features/` |
| System / UI | End-to-end flows in Chrome | Selenium WebDriver | `qa/e2e/` |
| Performance | Load test, 50 virtual users | Apache JMeter 5.6 | `performance/` |
| Security | OWASP Top 10 A01, A03, A05, A07 | Automated API tests + manual review | `server/tests/api/security.api.test.js` |
| Usability | Nielsen heuristic evaluation + keyboard checks | Manual review + browser automation | `docs/07-…` |
| Static analysis | Complexity, code smells, coverage | SonarQube/SonarCloud, ESLint complexity | `sonar-project.properties` |
| Regression | Every suite on every push | GitHub Actions | `.github/workflows/ci.yml` |

**Why `node:test` rather than Jest or Mocha?** The project is plain JavaScript on Node 22. The built-in runner needs no extra dependencies, so `npm ci` and the existing `package-lock.json` stay unchanged. It also supports mocking, coverage, and lcov/JUnit reporters, which SonarQube and CI need. It is the Node.js equivalent of JUnit or PyTest, which is what the task list asks for.

## 1.5 Entry and exit criteria

| | Criteria |
|---|---|
| **Entry** | Code builds; `server/.env` configured; MongoDB reachable for integration, UI and performance runs; seed data loaded (`npm run seed`). |
| **Suspension** | The build fails in CI, or a Critical defect blocks a whole flow (e.g. BUG-01 blocked all candidate UI testing until fixed). |
| **Exit** | All planned automated tests are executed; 100 % of unit and API tests pass; server line and branch coverage ≥ 90 %; no open Critical defects; open Major or Minor defects are documented with a decision. |

## 1.6 Resources and environment

| Resource | Details |
|---|---|
| People / roles | Test manager (plan, report), test designers (black-box and white-box), automation engineer (Selenium, CI), performance and security tester. The group's names are entered on the report cover page. |
| Hardware / OS | Developer laptops (Windows 11) and GitHub-hosted Ubuntu runners (CI). The sandbox analysis machine was Linux with 2 vCPU. |
| Software | Node.js 22, MongoDB 7, Chrome (stable), Selenium WebDriver 4, Cucumber.js 11, JMeter 5.6.3, Java 17, SonarQube/SonarCloud, Git and GitHub |
| Test data | `server/scripts/seed.js`: 1 company, 1 candidate with a profile, and 30 listings with varied skills, locations, GPA limits and deadlines. Unit and API tests build their own data in code. |

## 1.7 Schedule

| Week (2026) | Activity |
|---|---|
| 1 (16–20 Nov) | Requirement analysis of the code; test plan; ISO 25010 mapping; environment set-up |
| 2 (21–25 Nov) | Test case design (EP, BVA, decision table, CFG); unit and API test implementation; TDD cycles |
| 3 (26 Nov–2 Dec) | BDD, Selenium, CI pipeline, JMeter and SonarQube runs; defect fixing and re-testing |
| 4 (3–7 Dec) | Usability review, metrics, test closure report, final report and viva preparation |

## 1.8 Risks

| Risk | Mitigation |
|---|---|
| MongoDB is not available on every machine | The API tests use test doubles, and the real-database tests run in CI with a `mongo:7` service container. |
| Brittle UI locators | Locators are kept in one shared file (`qa/e2e/locators.js`) and based on visible labels and ARIA labels. |
| Timing-dependent tests (deadlines) | The date logic was extracted into `checkDeadline(value, now)` with an injectable clock. |
| Tools needing credentials (SonarCloud token) | The pipeline skips that step with a notice until the secret is added. |

## 1.9 Quality model – ISO/IEC 25010

| ISO 25010 characteristic | Sub-characteristic | How it is tested in SkillMatch | Evidence |
|---|---|---|---|
| Functional suitability | Completeness, correctness | Test cases for F1–F6; decision table; BDD; Selenium flows | Test case sheet, 213 automated tests |
| Performance efficiency | Time behaviour, capacity | JMeter: 50 users on the main endpoints; response time, throughput, error rate | `performance/` |
| Security | Confidentiality, integrity, authenticity, accountability | OWASP A01/A03/A05/A07 tests; JWT forgery; brute force; NoSQL injection | `security.api.test.js` |
| Reliability | Fault tolerance, maturity | Malformed and oversized input, invalid ids, server errors that don't leak details | API-REG-05/06, WB-ERR-* |
| Usability | Operability, user-error protection, accessibility | Inline validation, confirmation dialogs, keyboard access, Escape to close dialogs | UI-01…UI-13, heuristic review |
| Maintainability | Testability, modularity, analysability | Cyclomatic complexity, code smells, coverage, app/server split for testability | SonarQube / ESLint metrics |
| Compatibility | Interoperability | JSON REST contract between client and API (CORS, error format) | API tests, SEC-A05-03 |

## 1.10 Verification vs validation

**Verification** ("are we building the product right?") checks work products against their specification, mostly without running the whole system as a user would:

- Static review of source code against the validation rules and data model (this is how BUG-05, BUG-08 and BUG-14 were first suspected).
- Static analysis: ESLint complexity and code smells, SonarQube quality gate, cyclomatic complexity and the CFG.
- Unit and API tests that check each function and endpoint against its contract (status codes, messages, data written).
- Reading the CI configuration and `git` history during root-cause analysis.

**Validation** ("are we building the right product?") checks that the running system meets user needs:

- BDD acceptance scenarios written from the candidate's point of view.
- Selenium end-to-end flows performed as a real company and a real candidate in Chrome.
- Usability heuristic evaluation and keyboard-only checks.
- Load test against realistic usage (users logging in, browsing and searching).

BUG-01 (the candidate dashboard never rendered) shows why both are needed. The server verified perfectly at 100 % coverage, yet the product failed validation: a candidate could not do anything in the UI.
