# EC4206 Submission Checklist – SkillMatch

Legend:

- ✅ **Done and verified**: executed, with saved evidence.
- 🟡 **Done, pending your run**: complete and configured, but it needs MongoDB, the network, a GitHub push or an account, which weren't available when this was prepared.
- ⬜ **Your action**: something only you can do.

## Task list coverage

| Task-list item | Deliverable | Status |
|---|---|---|
| 3.1 Scope, test plan, ISO 25010, V&V | `docs/01-test-plan.md` | ✅ |
| 3.2 STLC mapping | `docs/02-stlc-test-cases.md` | ✅ |
| 3.2 Test cases (ID, description, preconditions, steps, expected, actual, status) | `SkillMatch_Test_Cases.xlsx` (40 functional + 213 automated + 55 black-box) | ✅ results imported from real runs |
| 3.2 Test environment / data | `docs/02-…` §2.3–2.4, `server/scripts/seed.js` | ✅ |
| 3.3 EP on 2–3 fields | password, role/organization, GPA (+ email) – `docs/03-…` | ✅ 28 EP tests pass |
| 3.3 BVA on numeric/date fields | GPA, lengths, openings, cover note, deadlines, pagination | ✅ 45 BVA tests pass |
| 3.3 Decision table | DT-1 "submit application", 9 rules | ✅ all rules tested |
| 3.4 Cyclomatic complexity | V(G) = 12 by three methods – `docs/04-…` | ✅ |
| 3.4 CFG | `docs/white-box/cfg-submit-application.png/.dot/.svg` | ✅ |
| 3.4 Statement and branch coverage tests | basis paths + coverage 100 % lines/branches/functions | ✅ |
| 3.5 Unit tests (JUnit/PyTest equivalent) | Node built-in test runner, 213 tests | ✅ 213/213 |
| 3.5 TDD | 2 Red-Green-Refactor cycles, outputs in `docs/evidence/tdd/` | ✅ |
| 3.5 BDD Gherkin + Cucumber | `qa/features/*.feature`, step definitions | ✅ pre-checked 7/7 · 🟡 official Cucumber run in CI |
| 3.6 Selenium automation | `qa/e2e/` 10 tests | ✅ locators pre-checked 10/10 · 🟡 Selenium run in CI |
| 3.6 GitHub Actions on push | `.github/workflows/ci.yml` (6 jobs) | 🟡 runs after you push |
| 3.6 Screenshot of passing pipeline | – | ⬜ |
| 3.7 JMeter load test | `performance/skillmatch-load-test.jmx`, `summarize_jtl.py` | 🟡 JMeter run in CI · ✅ preliminary load test measured |
| 3.7 OWASP Top 10 (1–2 issues) | A01, A03, A05, A07 – 15 tests, 4 real vulnerabilities fixed | ✅ |
| 3.7 Usability | heuristic evaluation + 13 browser checks | ✅ (SUS survey with users recommended, not done) |
| 3.8 Bugs logged | 19 defects in `docs/defects/defects.json` + sheet | ✅ · ⬜ push to GitHub Issues (script ready) |
| 3.8 RCA on 1–2 bugs | RCA-1 (BUG-01), RCA-2 (BUG-05) with git evidence | ✅ |
| 3.8 Full bug lifecycle | BUG-01 New → Assigned → Fixed → Verified → Closed | ✅ up to Verified · ⬜ close the issue after CI |
| 3.9 SonarQube run | `sonar-project.properties`, CI job `sonar` | 🟡 needs token/server · ✅ ESLint-based pre-scan |
| 3.9 Coverage %, defect density, smells, debt | `docs/09-…` | ✅ measured (Sonar dashboard values ⬜) |
| 3.9 2–3 improvements | R1–R6 in `docs/09-…` | ✅ |
| 3.10 Agile/DevOps reflection | `docs/10-…` | ✅ |

## Steps for you (in order)

1. **Unzip** the updated project over a copy of your repo, or into a fresh folder, and copy your own `server/.env` back in (the ZIP does not include it).
2. **Run locally:** `cd server && npm ci && npm run test:coverage`. Expect **213 passing** and 100 % coverage. Screenshot it.
3. **Commit and push to a branch:**
   ```bash
   git checkout -b qa/ec4206-testing
   git add .
   git commit -m "Add EC4206 test suites, CI pipeline, JMeter plan and QA docs"
   git push -u origin qa/ec4206-testing
   ```
4. **GitHub → Actions → CI:** wait for all jobs. Screenshot the green run graph, the coverage summary and the JMeter summary. Download the artifacts `cucumber-report`, `selenium-evidence` and `jmeter-results`.
   - If a job fails, open its log. The likely first-run issues are network downloads (JMeter mirror) or the Sonar step, which skips without a token.
5. **Copy the JMeter numbers** from the run summary into report §7.1 (a "JMeter results" table is reserved there).
6. **SonarQube:** follow `docs/09-…` §9.1, add the `SONAR_TOKEN` secret, re-run CI, then fill in table §9.3 and screenshot the dashboard.
7. **GitHub Issues:** `gh auth login`, then `node docs/defects/create-github-issues.mjs --create`. Screenshot the Issues list, and one closed issue showing its history (BUG-01).
8. **Open a pull request** into `main` so the checks show on the PR, then merge.
9. Put the **group members' names and registration numbers** on the report cover page.

## Files changed in the application (for the viva)

| File | Change | Why |
|---|---|---|
| `server/src/app.js` (new), `server/src/index.js` | App creation split from DB connect/listen; `x-powered-by` off; security headers | testability; BUG-10 |
| `server/src/middleware.js` | body-parser errors → 400/413; `securityHeaders`; `createLoginLimiter` | BUG-07, BUG-10, BUG-04 |
| `server/src/validators.js` | strict `toNumber`; `checkDeadline` | BUG-14, BUG-08 (TDD-1) |
| `server/src/rules.js` (new) | status rules (`canWithdraw`, `isCompanySettable`) | BUG-09 (TDD-2) |
| `server/src/routes/applications.js` | ObjectId check; re-apply / duplicate handling; withdraw rule | BUG-03, BUG-05, BUG-09 |
| `server/src/routes/auth.js` | login limiter | BUG-04 |
| `server/src/routes/internships.js` | `intOr` pagination fix | BUG-11 |
| `server/package.json` | test scripts, `engines` (no new dependencies) | – |
| `client/src/main.jsx` | render the candidate dashboard | BUG-01 |
| `client/src/pages/Company.jsx` | `mode="company"` | BUG-02 |
| `client/src/pages/Auth.jsx` | keyboard-accessible switch | BUG-13 |
| `client/src/components/ui.jsx` | Escape closes dialogs | BUG-12 |
