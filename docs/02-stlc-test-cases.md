# Phase 2 – STLC, Test Cases and Test Environment

## 2.1 STLC applied to SkillMatch

| STLC phase | What we did in this project | Entry → exit | Deliverables |
|---|---|---|---|
| **1. Requirement analysis** | No written SRS existed, so requirements were recovered from the code: validation rules in `validators.js` and the client forms, the Mongoose schema constraints, route-level business rules (deadline, profile, ownership, statuses), and UI behaviour. Ambiguities were recorded (e.g. may a withdrawn candidate re-apply? The client says yes, the server said no → BUG-05). | Source code available → testable requirement list F1–F7 | Scope table (§1.3), requirement-to-test traceability (test case sheet) |
| **2. Test planning** | Objectives, scope, levels, tools, entry/exit criteria, risks, schedule, ISO 25010 mapping. | Requirements → approved plan | `01-test-plan.md` |
| **3. Test case design** | EP, BVA and a decision table for black-box; CFG and basis paths for white-box; Gherkin scenarios; Selenium flows; JMeter plan. | Plan → reviewed test cases and test data | Test case sheet (`SkillMatch_Test_Cases.xlsx`), `.feature` files, `.jmx` |
| **4. Environment set-up** | Split `index.js` into `app.js` + `index.js` so the API can be tested without a live server; seed script; test doubles; MongoDB service in CI; Chrome for Selenium. | Design → runnable environment | `server/tests/helpers/`, `server/scripts/seed.js`, `ci.yml` |
| **5. Test execution** | Ran every suite; recorded the baseline run (177 tests, 7 failures = defects), fixed the defects, re-ran (213 tests, 0 failures). | Environment → results and defect reports | `docs/evidence/*.txt`, JUnit XML, coverage, screenshots |
| **6. Test closure** | Coverage and metrics, defect density, root-cause analysis, lessons learned, open items. | All planned runs complete → closure report | `08-defects-rca.md`, `09-quality-metrics.md`, final report |

## 2.2 Test case format

Every test case in the spreadsheet `SkillMatch_Test_Cases.xlsx` has: **ID, feature, title, preconditions, steps, test data, expected result, actual result, status, automated test(s), evidence**. The *actual result* and *status* columns are filled from the real JUnit output and run logs, never typed by hand. The workbook has these sheets:

| Sheet | Content |
|---|---|
| `Functional test cases` | 40 requirement-level test cases (TC-01 … TC-40) with traceability to automated tests |
| `Automated test results` | All 213 unit and API tests, with their actual pass/fail result from `coverage/junit.xml` |
| `Black-box (EP-BVA-DT)` | Equivalence classes, boundary values and decision table rules with results |
| `Other suites` | Integration, BDD, Selenium, UI checks, JMeter: what ran where, and its status |
| `Defects` | BUG-01 … BUG-18 |

A sample of the functional test cases:

| ID | Title | Preconditions | Steps (summary) | Expected | Status |
|---|---|---|---|---|---|
| TC-24 | Candidate applies to an open job | Profile exists; job active; deadline in future | Apply now → cover note → Submit | 201, toast "Application submitted", tracker updated, button shows "Applied" | Pass |
| TC-26 | Apply after the deadline | Deadline passed | Apply | 400 "The application deadline has passed" | Pass |
| TC-29 | Re-apply after withdrawing | Application withdrawn | Apply now | 201, same record reopened | Pass after fix (BUG-05) |
| TC-35 | Candidate dashboard renders | Candidate account | Log in | Candidate dashboard shown | Pass after fix (BUG-01) |

## 2.3 Test data

| Data set | Source | Used by |
|---|---|---|
| In-code fixtures (users, listings, profiles, applications) | `server/tests/helpers/fakes.js` and each test file | Unit, API, BDD |
| Seed database: `hr@acme.test` (company), `student@uni.test` (candidate), password `Passw0rd1`, 30 listings | `server/scripts/seed.js` (`npm run seed`; safe to re-run) | Selenium, JMeter, manual testing |
| Integration database (dropped at the start of each run) | `MONGO_URI_TEST` (e.g. `mongodb://127.0.0.1:27017/skillmatch_it`) | Integration tests |

## 2.4 Test environment and configuration

| Item | Local (developer) | CI (GitHub Actions) | Analysis sandbox (used to prepare this report) |
|---|---|---|---|
| OS | Windows 11 | Ubuntu 24.04 (`ubuntu-latest`) | Linux, 2 vCPU |
| Node.js | 22 LTS | 22 | 22.23.5 |
| Database | MongoDB 7 Community | `mongo:7` service container | none (persistence stubbed) |
| Browser | Chrome (current stable) | Chrome preinstalled on runner; driver via Selenium Manager | Chrome for Testing 153 (driven by Playwright for pre-checks) |
| Client | `npm run dev` (Vite, port 5173) | `vite build` + `vite preview` (port 4173) | esbuild bundle of the same sources |
| API | `npm run dev` (port 5000) | `npm start` with seed data | in-process on a random port |
| Config | `server/.env` (copy from `.env.example`) | Job-level `env:`; `JWT_SECRET` is a CI-only value | test values in `tests/helpers/env.js` |

**How to run each suite locally (Windows PowerShell or bash):**

```bash
# server unit + API tests (no database needed)
cd server && npm ci && npm test
npm run test:coverage            # coverage table + coverage/lcov.info + coverage/junit.xml

# real-database integration tests (MongoDB running locally)
#   PowerShell:  $env:MONGO_URI_TEST="mongodb://127.0.0.1:27017/skillmatch_it"; npm run test:integration
MONGO_URI_TEST=mongodb://127.0.0.1:27017/skillmatch_it npm run test:integration

# BDD (Cucumber) – from the qa folder, after `cd server && npm ci`
cd qa && npm install && npx cucumber-js

# Selenium – start the API (with seed data) and the client dev server first
cd server && npm run seed && npm start            # terminal 1 (uses MONGO_URI from server/.env)
cd client && npm run dev                          # terminal 2 (http://localhost:5173)
#   terminal 3, PowerShell:  cd qa; $env:BASE_URL="http://localhost:5173"; npm run e2e
cd qa && BASE_URL=http://localhost:5173 npm run e2e   # terminal 3, bash
```
