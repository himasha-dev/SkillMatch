# CI evidence – GitHub Actions run 45540382861

All six jobs passed on `qa/combined-testing` (commit `8040cb4`, 25 Nov 2026):
https://github.com/himasha-dev/SkillMatch/actions/runs/45540382861

| File | Job | Result |
|---|---|---|
| `01-unit-api-tests-coverage.txt` | Unit + API tests (coverage) | 213/213 passed, 100 % line/branch/function coverage |
| `02-integration-real-mongodb.txt` | Integration (real MongoDB 7) | 12/12 passed |
| `03-bdd-cucumber.txt` | BDD (Cucumber) | 7 scenarios, 32 steps passed |
| `04-selenium-ui-tests.txt` | UI automation (Selenium + Chrome) | 10/10 passed (E2E-01 … E2E-10) |
| `05-jmeter-load-test.txt` | Load test (JMeter) | 10,208 requests, 50 users, 0.00 % errors |
| `06-jmeter-summary.txt` | Load test (JMeter) | per-endpoint avg / p90 / p95 / throughput |

Each file is the unedited output of that step, copied from the job log.
Screenshots, the Cucumber HTML report and the JMeter HTML dashboard are in the run's
downloadable artifacts (`selenium-evidence`, `cucumber-report`, `jmeter-results`, `server-coverage`).
