# Phase 6 – Test Automation and CI/CD

## 6.1 UI automation with Selenium WebDriver

Location: `qa/e2e/skillmatch.e2e.test.js`. Locators live in `qa/e2e/locators.js`.

| ID | Flow | Covers |
|---|---|---|
| E2E-01 | Login page loads with title "SkillMatch" | smoke |
| E2E-02 | Empty registration shows inline errors | client-side validation |
| E2E-03 | Wrong password shows the server's error alert | negative login |
| E2E-04 | Company dashboard shows Edit buttons on cards | regression for BUG-02 |
| E2E-05 | Company publishes a listing (CREATE) and finds it by search (READ) | listing CRUD |
| E2E-06 | Company edits openings to 5 (UPDATE) | listing CRUD |
| E2E-07 | Company deletes with confirmation dialog (DELETE) | listing CRUD |
| E2E-08 | Candidate sees the candidate dashboard | regression for BUG-01 |
| E2E-09 | Candidate searches, applies with a cover note, sees it in the tracker | core candidate flow |
| E2E-10 | Details dialog opens and closes with Escape | regression for BUG-12 |

**Design decisions:**

- Elements are found by **visible label text and ARIA labels** (`//label[contains(.,'Email')]//input`, `//button[@aria-label='Edit …']`), not by CSS classes. This tests what the user sees and survives restyling.
- Explicit waits (`until.elementLocated`, `elementIsVisible`) are used throughout, never `sleep`.
- Toast assertions wait for the *expected* text, because an earlier toast may still be on screen.
- Each test leaves a screenshot in `qa/reports/screenshots/`.
- Unique listing titles (`Date.now()`) make runs repeatable against the seeded database.

**Execution status:**

| Run | Result |
|---|---|
| Pre-check: the same 10 steps with the **same locator module**, driven by Playwright in Chrome against the real client build with a stateful fake API (`evidence/e2e-precheck/`) | **10/10 passed**. This verifies every locator and the flow against the real DOM. |
| Selenium run on the full stack (Chrome + API + MongoDB): GitHub Actions job `e2e-selenium` | **Pending your first push.** Screenshots are uploaded as artifact `selenium-evidence`. |

Why the pre-check: `selenium-webdriver` could not be installed in the offline analysis sandbox, and its chromedriver (v147) did not match its Chrome (v153). The pre-check removes the main risk, broken locators, before CI.

A wider browser check with the same Playwright harness (`evidence/ui/`) ran 13 UI checks before and after the fixes:

| Check | Before fixes | After fixes |
|---|---|---|
| UI-04 keyboard access to the Create account / Sign in switch | FAIL | PASS |
| UI-06 candidate dashboard renders | FAIL ("This dashboard is coming soon.") | PASS |
| UI-09 dialog closes with Escape | not reachable (blocked by BUG-01) → FAIL on the first post-fix run | PASS |
| UI-10/11 company Edit, Delete and status filter | FAIL (0 buttons) | PASS |
| All other checks | PASS | PASS |
| **Total** | **6/10 executable passed** | **13/13 passed** |

## 6.2 API automation

The 97 API tests (`server/tests/api/`) are the project's REST-level automation, the equivalent of REST Assured or Postman collections. They send real HTTP requests to the Express app. The 12 integration tests (`server/tests/integration/`) do the same against a real MongoDB.

## 6.3 GitHub Actions pipeline

File: `.github/workflows/ci.yml`. It triggers on **every push to any branch**, on pull requests, and manually (`workflow_dispatch`).

```
push ─► unit-api-tests ─┬─► integration-bdd   (mongo:7 service; integration tests + Cucumber)
        client-build ───┼─► e2e-selenium      (mongo:7; seeded API + vite preview + Selenium/Chrome)
                        ├─► performance-jmeter (mongo:7; seeded API + JMeter 5.6.3, 50 users)
                        └─► sonar             (coverage + SonarQube/SonarCloud scan)
```

| Job | What it proves | Artifacts |
|---|---|---|
| `unit-api-tests` | 213 tests pass; coverage table is written to the run summary | `server-coverage` (lcov, JUnit, output) |
| `client-build` | The React client compiles with `vite build` on Linux | – |
| `integration-bdd` | The API works on real MongoDB; Cucumber scenarios pass | `cucumber-report` |
| `e2e-selenium` | The UI works end-to-end in Chrome | `selenium-evidence` (screenshots, server and preview logs) |
| `performance-jmeter` | The load test runs; response-time, throughput and error table in the summary | `jmeter-results` (JTL, HTML dashboard) |
| `sonar` | Code quality analysis (runs when the `SONAR_TOKEN` secret exists, otherwise skips with a notice) | SonarQube dashboard |

Design notes:

- `npm ci` with lockfiles gives reproducible installs.
- Secrets are not in the repo. `JWT_SECRET` in CI is a throw-away value; the `.env` files stay git-ignored.
- `shell: bash` gives `pipefail`, so `npm test | tee` still fails the job when tests fail.
- `needs:` makes the slow jobs wait for the fast unit tests to pass (fail fast).

## 6.4 Connecting the pipeline to the GitHub repository

The repository's remote is `https://github.com/himasha-dev/SkillMatch.git`. Committing `.github/workflows/ci.yml` is all that is needed: GitHub Actions starts automatically on the next push.

```bash
git checkout -b qa/ec4206-testing
git add .
git commit -m "Add EC4206 test suites, CI pipeline, JMeter plan and QA docs"
git push -u origin qa/ec4206-testing
```

Then on GitHub: **Actions** tab → "CI" run → wait until all jobs are green → take the evidence screenshots listed in `SUBMISSION-CHECKLIST.md`. Open a pull request into `main` to show the checks on the PR page too.

**Verification status: pending.** Nothing has been pushed yet, and the pipeline has not run. The YAML was validated by parsing it, and the `npm test` / `npm run test:coverage` commands it uses were run successfully in the analysis sandbox. The steps that need MongoDB, network downloads (npm, JMeter), `vite build` on Linux or Selenium were not run.
