# Phase 7 – Performance, Security and Usability

## 7.1 Performance testing with Apache JMeter

**Test plan:** `performance/skillmatch-load-test.jmx` (JMeter 5.6.3).

| Element | Configuration |
|---|---|
| Thread group "Candidates browsing jobs" | `${__P(users,50)}` users, ramp-up `${__P(rampup,30)}` s, duration `${__P(duration,120)}` s, loop forever |
| Once Only Controller | `POST /api/auth/login` (seed candidate); JSON Extractor `token` ← `$.token` |
| Header Manager | `Content-Type: application/json`, `Authorization: Bearer ${token}` |
| Samplers per iteration | `GET /api/health` · `GET /api/internships?page=1&limit=12` (extracts `jobId`) · `GET /api/internships?search=Intern&location=Remote&sort=deadline` · `GET /api/internships/${jobId}` · `GET /api/applications` |
| Assertions | Response code = 200; Duration Assertion < 2000 ms |
| Timer | Uniform random think time 300–700 ms |
| Defaults | host/port from `-Jhost` / `-Jport` (default `localhost:5000`) |

**Run (non-GUI):**

```bash
cd server && npm run seed && npm start     # API with seed data
jmeter -n -t performance/skillmatch-load-test.jmx -Jusers=50 -Jrampup=30 -Jduration=120 \
       -l performance/results/results.jtl -e -o performance/results/html-report
python3 performance/summarize_jtl.py performance/results/results.jtl
```

The CI job `performance-jmeter` does exactly this against MongoDB 7 and publishes the summary table and the HTML dashboard. **JMeter status: pending.** JMeter could not be downloaded in the offline analysis sandbox, so the JMeter results must come from the CI artifact or a local run. Paste that table into §7.1 of the final report.

### JMeter results (fill in from the CI run summary / HTML dashboard)

| Endpoint | Samples | Avg (ms) | p90 | p95 | Max | Throughput (req/s) | Errors |
|---|---:|---:|---:|---:|---:|---:|---:|
| POST /api/auth/login | | | | | | | |
| GET /api/health | | | | | | | |
| GET /api/internships (page 1) | | | | | | | |
| GET /api/internships (search+filter+sort) | | | | | | | |
| GET /api/internships/:id | | | | | | | |
| GET /api/applications | | | | | | | |
| **Total** | | | | | | | |

### Preliminary load test (measured, not JMeter)

To get real numbers in advance, the **real Express app** was run with the database stubbed in memory. A separate Node load generator sent the same request mix with **50 concurrent users and no think time for 30 s**, writing a JMeter-format JTL that was analysed with the same `summarize_jtl.py` (`performance/results/local-baseline/`):

| Endpoint | Samples | Avg (ms) | p90 | p95 | Max | Throughput (req/s) | Errors* |
|---|---:|---:|---:|---:|---:|---:|---:|
| GET /api/health | 12 838 | 13.1 | 21 | 25 | 3 145 | 427.4 | 0.01 % |
| GET /api/internships (page 1) | 12 838 | 13.0 | 21 | 26 | 96 | 427.4 | 0.00 % |
| GET /api/internships (search+filter+sort) | 12 838 | 12.9 | 21 | 25 | 80 | 427.4 | 0.00 % |
| GET /api/internships/:id | 12 838 | 12.9 | 21 | 25 | 96 | 427.4 | 0.00 % |
| GET /api/applications | 12 838 | 13.0 | 21 | 26 | 96 | 427.4 | 0.00 % |
| **POST /api/auth/login** | 50 | **13 302** | 13 375 | 13 376 | 13 377 | 1.7 | **100 %** |
| **Total** | 64 240 | 23.3 | 21 | 26 | 13 377 | 2 138.9 | 0.08 % |

\* An "error" means not HTTP 200 **or** slower than 2 s, the same rule as the JMeter assertions. All 50 logins returned **HTTP 200**; they failed only the 2-second limit.

**Analysis:**

- **Response time.** The read endpoints average about 13 ms with p95 ≈ 26 ms at about 2 100 req/s in total on 2 vCPU, so the Express, JSON, JWT and validation layers are not a bottleneck. These numbers exclude MongoDB time, so the JMeter run with a real database will be slower. The paginated, indexed queries should keep it modest.
- **Login does not scale (BUG-06).** Fifty simultaneous logins each took about 13.3 s. One bcrypt comparison at cost factor 12 takes 266 ms with the pure-JavaScript `bcryptjs` on this machine (cost 10: 68 ms). 50 × 266 ms ≈ 13.3 s, which equals the observed average. The logins were therefore processed **one after another on Node's single event loop**.
- **Side effect.** While the logins ran, an unrelated `/api/health` request waited **3.1 s**. CPU-bound hashing blocks every other request.
- **Throughput and error rate.** Apart from the login burst, there were 0 functional errors in 64 190 read requests.

**Recommendations:**

1. Use the native `bcrypt` package, which hashes on libuv's thread pool in parallel, or `argon2`.
2. Keep cost 12 but add capacity: Node cluster or PM2 with one worker per core.
3. Rate-limit logins. This is now done per IP and account (BUG-04).
4. Re-run JMeter with a "login storm" thread group to set an SLA, e.g. p95 login < 1 s at 10 logins/s.

## 7.2 Security testing – OWASP Top 10 (2021)

Automated in `server/tests/api/security.api.test.js` (15 tests), with additional manual review.

| OWASP category | Test | Before fix | After fix |
|---|---|---|---|
| **A01 Broken Access Control** | SEC-A01-01: all 13 protected endpoints without a token → 401 | Pass | Pass |
| | SEC-A01-02: candidate creates, edits or deletes listings or changes statuses → 403 (vertical) | Pass | Pass |
| | SEC-A01-03: company B reads, edits, deletes or decides on company A's data → 403/404 (horizontal / IDOR) | Pass | Pass |
| | SEC-A01-04: self-register as admin → 400 | Pass | Pass |
| | SEC-A01-05: forged JWTs (`alg: none`, tampered payload, wrong secret) → 401 | Pass | Pass |
| | API-CRT-01: mass assignment of `company` on create is ignored | Pass | Pass |
| **A03 Injection** | SEC-A03-01: login with `{"$ne": null}` as email or password → coerced to a string, 401 | Pass | Pass |
| | SEC-A03-02: search with a ReDoS pattern `(a+)+$` → escaped, matches literally, < 50 ms | Pass | Pass |
| | SEC-A03-03: proof that Mongoose passes `{"$ne": null}` through as a query operator when used as `_id` | (risk confirmed) | – |
| | **SEC-A03-04: apply with `internship: {"$ne": null}`** | **FAIL → 201**: applied to an arbitrary active job (**BUG-03**) | Pass: 400, DB not queried |
| **A05 Security Misconfiguration** | **SEC-A05-01: `X-Powered-By: Express` header** | **FAIL** (**BUG-10**) | Pass |
| | **SEC-A05-02: `X-Content-Type-Options` and `X-Frame-Options` present** | **FAIL** (**BUG-10**) | Pass |
| | SEC-A05-03: CORS allows only the configured client origin | Pass | Pass |
| | SEC-A05-04: a 500 error leaks no stack trace or connection string | Pass | Pass |
| | API-REG-05/06: malformed or oversized JSON returns 500 (**BUG-07**) | FAIL | Pass (400 / 413) |
| **A07 Identification & Authentication Failures** | SEC-A07-01: weak passwords refused | Pass | Pass |
| | **SEC-A07-02: 30 rapid wrong passwords → throttled** | **FAIL**: 30 × 401, never 429 (**BUG-04**) | Pass: 429 after 10 failures in 15 min per IP + email, with `Retry-After` |

**Manual review notes (no automated test):**

- **Secrets.** `server/.env` is git-ignored and its `JWT_SECRET` differs from the example placeholder, which is good. However, `.env` *was* inside the submitted ZIP, so it should be rotated if that ZIP was shared. The updated ZIP excludes it.
- **Tokens.** JWTs are valid for 7 days, are stored in `localStorage`, and cannot be revoked server-side. There are no XSS sinks in the client (no `dangerouslySetInnerHTML`, `innerHTML` or `eval`; React escapes output), which reduces but does not remove the risk. Recommendation: shorter expiry with refresh, or an httpOnly cookie.
- **Status workflow (BUG-15).** Any status can follow any other (e.g. `rejected` → `interview`). This is a business-logic gap rather than a vulnerability.

## 7.3 Usability evaluation

**Method:** a heuristic evaluation against Nielsen's 10 heuristics by the test team, plus keyboard-only and dialog behaviour checks automated in Chrome (UI-01 … UI-13; screenshots in `evidence/ui/`). No external participants were recruited, so a **System Usability Scale (SUS) survey with 5 users is recommended** as follow-up and is not claimed here.

| Heuristic | Finding | Severity (0–4) | Status |
|---|---|---|---|
| H1 Visibility of system status | Loading text, busy buttons ("Saving…", "Sending…"), toasts for every action, "N jobs found" count. However, the application **stage bar has 5 unlabelled segments**, so users cannot tell which stage is which. | 2 | Open (BUG-18) |
| H2 Match with the real world | "Your profile is **matched** against N active opportunities" is shown, but no matching is implemented; N is just the number of open jobs. | 2 | Open (BUG-16) |
| H3 User control and freedom | Cancel on every form; delete needs confirmation; withdraw is available. Dialogs could **not be closed with Escape**. | 2 | Fixed (BUG-12) |
| H4 Consistency and standards | Edit and Delete appeared in the details dialog but **not on the job cards**, and the status filter was missing for companies. | 3 | Fixed (BUG-02) |
| H5 Error prevention | Client-side validation mirrors the server; "Applied" button is disabled; delete is confirmed. However, **editing an expired listing is impossible without changing its deadline**, so a company cannot simply close it. | 2 | Open (BUG-19) |
| H6 Recognition rather than recall | Icons have text labels or `aria-label`; filters are visible; skills shown as tags. | – | OK |
| H7 Flexibility and efficiency | Debounced search, filters, sort and pagination; Enter adds a skill. | – | OK |
| H8 Aesthetic and minimalist design | Clean, consistent card layout (see screenshots). | – | OK |
| H9 Help users recover from errors | Field-level messages and the server message in an alert. Re-applying after a withdrawal showed the cryptic "A record with these details already exists". | 3 | Fixed (BUG-05) |
| H10 Help and documentation | Only the three-step hint on the login page; no help for statuses. | 1 | Recommendation |
| Accessibility (WCAG 2.1.1 Keyboard) | The "Create account" / "Sign in" switch was an `<a>` without `href`, so it was unreachable by Tab. | 3 | Fixed (BUG-13) |
| Critical task completion | Candidates **could not reach their dashboard at all**: "This dashboard is coming soon." | 4 | Fixed (BUG-01) |
