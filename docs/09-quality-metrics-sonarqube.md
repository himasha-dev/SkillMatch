# Phase 9 – SonarQube and Quality Metrics

## 9.1 SonarQube configuration

| File | Purpose |
|---|---|
| `sonar-project.properties` | Project key `himasha-dev_SkillMatch`, organization `himasha-dev`, sources `server/src` + `client/src`, tests `server/tests` + `qa`, coverage from `server/coverage/lcov.info`, exclusions for `node_modules`, `dist`, `coverage`, `reports` |
| `.github/workflows/ci.yml` → job `sonar` | Generates coverage, then runs `SonarSource/sonarqube-scan-action@v5` when the `SONAR_TOKEN` secret exists |

**Option A – SonarCloud (free for public repositories):**

1. Sign in at sonarcloud.io with GitHub.
2. Choose **+ → Analyze new project** and pick `himasha-dev/SkillMatch`.
3. Under *Administration → Analysis Method*, turn **off** Automatic Analysis, because the CI scan is used instead.
4. Copy the token into GitHub: *Settings → Secrets and variables → Actions → New secret* `SONAR_TOKEN`.
5. Check that the project key and organization in `sonar-project.properties` match the ones SonarCloud shows.
6. Push. The `sonar` job then uploads the analysis.

**Option B – local SonarQube in Docker (works for private repos):**

```bash
docker run -d --name sonarqube -p 9000:9000 sonarqube:community
# open http://localhost:9000 (admin/admin), create project "SkillMatch" manually, generate a token
cd server && npm run test:coverage && cd ..
docker run --rm --network host -v "${PWD}:/usr/src" sonarsource/sonar-scanner-cli \
  -Dsonar.host.url=http://localhost:9000 -Dsonar.token=<your token>
```

On Windows PowerShell, use `-v "${PWD}:/usr/src"` as written. For a self-hosted server in CI, also add the secret `SONAR_HOST_URL`.

**Status: pending.** The SonarQube scan needs a SonarQube server or a SonarCloud account and token, and neither was available in the analysis environment. After the scan, copy the dashboard numbers (Bugs, Vulnerabilities, Security Hotspots, Code Smells, Technical Debt, Coverage, Duplications) into the table in §9.3 and take a screenshot.

## 9.2 Metrics measured (without SonarQube)

| Metric | Original code | After this work | How measured |
|---|---|---|---|
| Size (non-comment, non-blank lines of code) | server 532 + client 1 006 = **1 538 NCLOC** | server 623 + client 1 019 = 1 642 | line count script over `src/**/*.js(x)` |
| Automated tests | 0 | 213 unit/API (+ 12 integration, 7 BDD scenarios, 10 Selenium) | test runner output |
| Server line / branch / function coverage | 0 % (no tests) → 100 / 98.35 / 100 % with the new suite | **100 / 100 / 100 %** | Node V8 coverage, `coverage/lcov.info` |
| Client unit coverage | 0 % | 0 % unit; 10 E2E flows + 13 UI checks | (the client is excluded from Sonar coverage; see R4) |
| Functions (server) | – | 58, average V(G) 3.43, max 21 (`validateInternship`) | ESLint `complexity` |
| Code smells (ESLint core-rule scan, a SonarQube stand-in) | **23** | **22** | `evidence/04-static-analysis-eslint-*.txt` |
| Defects found | – | **19** (1 Critical, 5 Major, 11 Minor, 2 Trivial) | defect register |
| **Defect density** | **19 / 1.538 KLOC = 12.4 defects/KLOC** (Critical + Major only: 6 / 1.538 = 3.9 /KLOC) | open defects after fixes: 6 / 1.642 = 3.7 /KLOC | defects ÷ KLOC of the original code |

**Code smells by rule (original → after):**

| Rule | Before | After | Examples |
|---|---|---|---|
| `complexity` > 10 | 8 | 8 | `validateInternship` 21–22, `JobBrowser` 15, `Student` 14, list handler 14 → 12; the apply handler rose 7 → 12 because of the security and re-apply fixes |
| `max-lines-per-function` > 80 | 6 | 6 | `Student` 151 lines, `JobBrowser` 139, `JobForm` 111, `Auth` 107 |
| `no-nested-ternary` | 3 | 3 | `main.jsx` `RoleIcon`, `JobBrowser` empty-state text, `JobForm` button label |
| `no-unused-vars` | 2 | 1 | **`'Student' is defined but never used` (main.jsx), which was exactly BUG-01** (fixed). The remaining one is the 4th `next` argument Express needs to recognise an error handler: a false positive. |
| `no-console` | 4 | 4 | Startup and error logging in `index.js` and `middleware.js` (acceptable for a server; a logger is recommended) |

Defect density context: industry figures often quoted for released code are roughly 1–25 defects/KLOC depending on process maturity. 12.4/KLOC in an untested student project is plausible, and most of it came from security and validation gaps that the testing techniques were designed to find.

## 9.3 SonarQube results (fill in after the scan)

| SonarQube measure | Value | Rating |
|---|---|---|
| Bugs | _from dashboard_ | |
| Vulnerabilities | _from dashboard_ | |
| Security hotspots | _from dashboard_ | |
| Code smells | _from dashboard_ | |
| Technical debt | _from dashboard_ | |
| Coverage | expected ≈ 100 % on `server/src` (client excluded) | |
| Duplications | _from dashboard_ | |
| Quality gate | _from dashboard_ | |

## 9.4 Technical debt and recommended improvements

Ordered by value:

| # | Improvement | Addresses | Effort (team estimate) |
|---|---|---|---|
| **R1** | **Split the large React components.** Extract `ApplicationTracker`, `JobCard`, `JobFilters` and `ApplyModal` from `Student.jsx` (151-line function, CC 14) and `JobBrowser.jsx` (139 lines, CC 15). | 6 `max-lines-per-function` + 3 complexity smells; also makes BUG-18 easy to fix | ~1 day |
| **R2** | **Share one validation module between client and server.** For example `shared/rules.js` with the GPA range, password policy, deadline rule and cover-note limit, used by both the forms and `validators.js`. A table-driven design would also cut `validateInternship` from CC 21 to under 10. | Root cause of BUG-08 and BUG-19 (client/server rule drift); complexity smells | ~1 day |
| **R3** | **Move the apply / re-apply logic into a service function** (`applicationService.apply()`), with a nested `if (previous)`. This removes the infeasible basis path found in §4.4 and brings the route handler under CC 10. | Complexity 12 → ~6 in the route; testability | ~2 h |
| R4 | Add client unit tests (Vitest + React Testing Library) for the form validators and components, then include `client/` in Sonar coverage. | Client unit coverage 0 % | ~2 days |
| R5 | Enable a SonarQube **quality gate** in CI: new-code coverage ≥ 80 %, no new bugs or vulnerabilities, no unused imports. | Prevents BUG-01-type regressions | ~1 h |
| R6 | Replace `bcryptjs` with native `bcrypt` (or `argon2`) and run the API in cluster mode. | BUG-06 | ~2 h + re-test |
