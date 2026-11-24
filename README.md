# SkillMatch

Job matching and application tracking system: a React 19 + Vite client and a Node.js 22 / Express 5 / MongoDB (Mongoose 8) API.
Candidates build a qualification profile, search internships, apply and track their applications. Companies publish and manage listings.

## Run the app

```bash
# API (needs MongoDB running locally)
cd server && cp .env.example .env && npm install && npm run dev      # http://localhost:5000
npm run seed        # optional demo/test data: hr@acme.test, student@uni.test / Passw0rd1

# Client
cd client && cp .env.example .env && npm install && npm run dev      # http://localhost:5173
```

## Quality assurance (EC4206)

| What | Where | Command |
|---|---|---|
| Unit + API tests (213) with coverage | `server/tests/unit`, `server/tests/api` | `cd server && npm test` / `npm run test:coverage` |
| Integration tests on a real MongoDB (12) | `server/tests/integration` | `MONGO_URI_TEST=mongodb://127.0.0.1:27017/skillmatch_it npm run test:integration` |
| BDD – Gherkin + Cucumber | `qa/features` | `cd qa && npm install && npx cucumber-js` |
| UI automation – Selenium WebDriver | `qa/e2e` | `cd qa && BASE_URL=http://localhost:5173 npm run e2e` |
| Load test – JMeter | `performance/skillmatch-load-test.jmx` | see `docs/07-performance-security-usability.md` |
| CI/CD – GitHub Actions | `.github/workflows/ci.yml` | runs on every push |
| SonarQube | `sonar-project.properties` | see `docs/09-quality-metrics-sonarqube.md` |
| Test documentation | `docs/` (start with `docs/SUBMISSION-CHECKLIST.md`) | – |

Node.js **22 or newer** is required for the test scripts.
