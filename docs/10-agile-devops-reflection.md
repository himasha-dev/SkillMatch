# Phase 10 – Case Study: Agile, DevOps and Reflection

## 10.1 How Agile practices apply to SkillMatch

SkillMatch was already built incrementally. The git history shows 13 small, feature-sized commits between 18 and 26 October (scaffold → auth → listings → edit → delete → validation → search → profile → applications → tracker), which is effectively a sequence of thin vertical slices. Testing was missing from that rhythm, and both of our root-cause analyses trace back to that gap.

| Agile practice | How it applies to SkillMatch testing |
|---|---|
| **User stories with acceptance criteria** | "As a candidate I want to re-apply after withdrawing…" with Gherkin criteria would have exposed the client/server disagreement behind BUG-05 before any code was written. The `.feature` files are now the acceptance criteria. |
| **Definition of Done** | Proposed DoD: unit/API tests written, CI green, coverage ≥ 80 % on new code, verified as **every affected role**, no new SonarQube issues. The last two items would have stopped BUG-01 and BUG-02. |
| **Test-first (TDD)** | Used for BUG-08 and BUG-09. Small Red → Green → Refactor steps fit naturally into one-feature commits. |
| **Whole-team quality / three amigos** | Rules such as "may a decided application be withdrawn?" or "can an expired listing be closed?" (BUG-09, BUG-19) are product decisions. Developer, tester and product owner should agree on them before coding. |
| **Short feedback loops** | 213 tests run in about 3.5 s locally, so they can run on every save. The full pipeline gives feedback within minutes of a push. |
| **Testing quadrants** | Q1 unit/API (automated), Q2 BDD and Selenium (automated, business-facing), Q3 usability and exploratory review (manual), Q4 performance and security (tools). All four are now represented. |

## 10.2 How DevOps practices apply

| DevOps practice | Implementation in this project |
|---|---|
| **Continuous Integration** | `ci.yml` runs on every push and pull request: unit + API tests, client build, integration tests on MongoDB, Cucumber, Selenium, JMeter, SonarQube. |
| **Shift-left testing** | Static analysis, unit tests and security tests run first and fail fast (`needs:` gates the slower jobs). The OWASP checks are ordinary tests, not a separate late audit. |
| **Infrastructure as code** | MongoDB is a `services:` container. Seed data, the JMeter install and Chrome set-up are scripted, so the pipeline needs no hand-configured server. |
| **Reproducibility** | `npm ci` with lockfiles; Node version pinned; a deterministic seed script; tests that inject clocks instead of depending on the current date. |
| **Continuous feedback and monitoring** | Coverage tables and JMeter summaries are posted to the run summary; JUnit, lcov, screenshots and the JMeter HTML dashboard are kept as artifacts. In production, the same metrics (p95 latency, error rate) would feed monitoring. |
| **Security as code (DevSecOps)** | Access control, injection, headers and brute-force checks run on every push, so a regression (e.g. someone removing the id check) fails the build. |
| **Continuous Delivery (next step)** | Add a deploy job (e.g. Render or Railway for the API, Netlify for the client) that runs only on `main` after all jobs are green, plus a smoke test of `/api/health` after deploy. |

## 10.3 Benefits of automated testing and CI/CD, as seen on this project

- **Defects found that manual use missed.** 19 defects, including a critical one: half the application was unreachable. 7 failed tests on the first automated run, and every one of them was a real defect.
- **Safe change.** 13 fixes and two refactorings were made with the full suite green after each step. The re-apply fix touched the most complex handler, and the decision table and basis-path tests proved every branch still behaves correctly.
- **Regression protection.** Every fixed defect has a test (E2E-08 for BUG-01, SEC-A03-04 for BUG-03, and so on), so it cannot silently return.
- **Living documentation.** Test names such as "DT-APP-R4 … deadline passed → 400" and the Gherkin files describe the business rules better than the (non-existent) written specification.
- **Objective quality data.** Coverage, complexity, defect density and load-test numbers replace "it seems to work".
- **Faster feedback.** Seconds for unit and API tests, minutes for the whole pipeline, compared with a manual retest of every flow after each change.

**Costs and limits we saw:** test doubles must be kept in step with the real models, which is why the real-database integration suite exists. UI tests are slower and more brittle than API tests, which is why we use few of them and label-based locators. And 100 % coverage still missed the client defects and the performance problem.

## 10.4 Project-specific reflection

The most valuable lesson was that **the most serious defects were not where the code was complex but where two parts met**. BUG-01 was a missing line between the app shell and a finished page. BUG-02 was a prop that a refactor started to require but its caller never received. BUG-05 was a rule the client and server understood differently. BUG-08 and BUG-19 were a validation rule existing in one tier but not the other. Unit tests of each part could not see any of these. They appeared only with tests that cross a boundary: browser tests, decision tables over the whole request, and contract tests.

The second lesson was about **evidence**. Recording the failing run *before* each fix, and building the `git log` timeline for each RCA, turned opinions ("the dashboard is probably not wired") into facts that can be shown in a viva.

The third concerned **performance**. We assumed bcrypt cost 12 was simply "secure". The load test showed that, with a pure-JavaScript hash on Node's single thread, it becomes a denial-of-service lever: 50 logins stalled the whole API for 13 seconds. Security and performance requirements have to be tested together.

If we started the project again, we would write the CI workflow and one smoke E2E test per role on day one, agree each business rule as a Gherkin scenario before coding it, and share one validation module between client and server.
