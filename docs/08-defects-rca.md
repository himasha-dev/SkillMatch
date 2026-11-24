# Phase 8 – Defect Tracking and Root Cause Analysis

## 8.1 Defect register

Full details for each defect (steps, expected and actual results, root cause, fix) are in `docs/defects/defects.json` and on the `Defects` sheet of the test case workbook. Each one was found by a test that failed on the original code, or by a documented review.

| ID | Title | Severity | Found by | Status |
|---|---|---|---|---|
| BUG-01 | Candidate dashboard never rendered ("coming soon") | Critical | UI-06 (browser) | Fixed, verified |
| BUG-02 | Company cards lack Edit/Delete and status filter | Major | UI-10/11 | Fixed, verified |
| BUG-03 | NoSQL operator injection in `internship` id (A03) | Major | SEC-A03-04, decision table | Fixed, verified |
| BUG-04 | No brute-force protection on login (A07) | Major | SEC-A07-02 | Fixed, verified |
| BUG-05 | Re-apply after withdrawing → generic 409 | Major | Decision table, code review | Fixed, verified |
| BUG-06 | Login CPU-bound (≈ 13 s at 50 concurrent logins) | Major | Load test | **Open** (recommendation) |
| BUG-07 | Malformed or oversized JSON → 500 | Minor | API-REG-05/06 | Fixed, verified |
| BUG-08 | Server accepts past listing deadline | Minor | TDD-1 (BVA) | Fixed, verified |
| BUG-09 | API allows withdrawing decided applications | Minor | TDD-2 | Fixed, verified |
| BUG-10 | `X-Powered-By` and no hardening headers (A05) | Minor | SEC-A05-01/02 | Fixed, verified |
| BUG-11 | `limit=0` returns 12 instead of 1 | Minor | BVA-LIM-06 | Fixed, verified |
| BUG-12 | Dialogs don't close with Escape | Minor | UI-09 | Fixed, verified |
| BUG-13 | Sign-in/Create-account switch not keyboard-reachable | Minor | UI-04 | Fixed, verified |
| BUG-14 | Booleans/arrays accepted as numbers | Minor | EP-GPA-08/09, EP-OPN-01/02 | Fixed, verified |
| BUG-15 | Unrestricted status transitions | Minor | API-STS review | **Open** (needs product decision) |
| BUG-16 | "Matched against N" wording, no matching engine | Trivial | Heuristic review | **Open** |
| BUG-17 | No company UI to manage applicants | Minor | Scope review | **Open** (feature gap) |
| BUG-18 | Stage bar unlabelled | Trivial | Heuristic review | **Open** |
| BUG-19 | Expired listing cannot be edited/closed | Minor | Usability code review | **Open** |

**Totals:** 19 defects (1 Critical, 5 Major, 11 Minor, 2 Trivial). 13 fixed and verified by automated regression tests; 6 open with recommendations.

**Logging in GitHub Issues:** from the repository root, with the GitHub CLI logged in (`gh auth login`):

```bash
node docs/defects/create-github-issues.mjs            # dry run - prints the gh commands
node docs/defects/create-github-issues.mjs --create   # creates labels + 19 issues; closes the 13 fixed ones with a verification comment
```

Each issue gets labels for severity (`severity:critical` …), area (`security`, `performance`, `usability`) and, when verified, `status:verified`. Bugzilla or Jira can be used instead with the same fields. **Status: pending.** The issues have not been created because the analysis environment had no GitHub access. Screenshot the Issues list after running the script.

## 8.2 Defect lifecycle – BUG-01 (New → Assigned → Fixed → Verified → Closed)

| State | Date (2026) | Who / action | Evidence |
|---|---|---|---|
| **New** | 23 Nov | Tester: automated browser check UI-06 failed. Logging in as `student` showed "This dashboard is coming soon." Logged with steps and a screenshot; severity Critical, priority P1. | `evidence/ui/before-04-student-dashboard.png`, `before-results.json` |
| **Assigned** | 23 Nov | Test lead triaged it (blocks all candidate UI tests: TC-24…TC-32 cannot run in the UI) and assigned it to the client developer. | GitHub: assignee set, label `severity:critical` |
| **Open / In progress** | 23 Nov | Developer analysed the cause: `main.jsx` never renders `Student.jsx` (see the RCA below). | `git log -p client/src/main.jsx` |
| **Fixed** | 23 Nov | `main.jsx` renders `<Student/>` for candidates via a `Dashboard` component; the admin message is clarified. A regression test was added (Selenium E2E-08). | commit on branch `qa/ec4206-testing` |
| **Verified** | 23 Nov | Tester re-ran the browser checks: UI-06, UI-07 and UI-08 pass; the candidate dashboard screenshot shows the tracker and job list. Server suite still 213/213. | `evidence/ui/after-04-student-dashboard.png`, `after-results.json` (13/13) |
| **Closed** | after the CI run | Closed once the `e2e-selenium` job passes E2E-08 on GitHub, with a comment linking the run. | GitHub Actions run link, issue comment |

The other fixed defects follow the same path. Their "before" evidence is `evidence/02-defect-tests-failing-before-fix.txt` (13 failing tests), and their "after" evidence is the final 213/213 run.

## 8.3 Root Cause Analysis

### RCA-1: BUG-01, candidate dashboard never rendered (Critical)

**Problem statement.** After login, every candidate saw "This dashboard is coming soon." The fully built candidate dashboard (`Student.jsx`, 206 lines: profile, tracker, search, apply, withdraw, delete) was unreachable. This made about half the product unusable.

**5 Whys:**

1. *Why did candidates see a placeholder?* `main.jsx` renders `<Company/>` when the role is company and a placeholder `<p>` otherwise.
2. *Why was the placeholder still there?* It was added in commit `90c2855` (20 Oct, "add company dashboard…") as a temporary stub before the candidate UI existed.
3. *Why wasn't it replaced when the candidate UI was built?* Commit `2cf8825` (25 Oct, "add candidate profile form and dashboard") added `import Student from "./pages/Student.jsx"` to `main.jsx` but did not change the render expression. The integration step was half-done.
4. *Why wasn't that noticed?* There were no automated UI tests, and manual checks were apparently done as a company user, the flow being built at the time. Nobody logged in as a candidate after the last commit (`4051fe2`, apply flow).
5. *Why didn't any tool flag it?* No linter or static analysis ran on the project. The scan we ran on the original code reports exactly this: `main.jsx:7 no-unused-vars 'Student' is defined but never used`. No CI existed to run it.

**Fishbone (Ishikawa) summary:**

| Category | Contributing cause |
|---|---|
| Process | Feature work merged without a "definition of done" that includes end-to-end checks for each role |
| Tools | No linter, no static analysis, no CI |
| Testing | No UI or E2E tests; manual testing limited to one role |
| Code | A temporary placeholder with no `TODO` or tracking issue |

**Corrective action:** render `<Student/>` (done). **Preventive actions:**

- Selenium E2E-08 now logs in as a candidate on every push.
- The ESLint/SonarQube scan in CI flags unused imports.
- The definition of done now says "verified as every affected role".
- Placeholders must link to an issue.

### RCA-2: BUG-05, re-applying after withdrawing fails (Major)

**Problem statement.** After withdrawing, the job card shows "Apply now" again. Clicking it showed the toast "A record with these details already exists", and the candidate could never apply to that job again.

**5 Whys:**

1. *Why the error?* `Application.create()` violated the unique index `{ student, internship }` (MongoDB error 11000). The generic error handler maps that to "A record with these details already exists".
2. *Why did the UI offer "Apply now"?* `Student.jsx` builds `appliedIds` from applications whose status is **not** `withdrawn`. The client developer intended withdrawn jobs to be re-appliable.
3. *Why did the server not support it?* The server assumed one application per student and job forever (unique index), and never looked for an existing withdrawn record before inserting.
4. *Why did the two sides disagree?* The rule "may a candidate re-apply after withdrawing?" was never written down. Client and server were built in separate commits (`f3ebc5f` server, `4051fe2` client), each with its own assumption.
5. *Why wasn't the mismatch caught?* There were no API contract tests and no end-to-end test of the withdraw → re-apply sequence. The decision table built in Phase 3 exposed the missing conditions C7/C8 immediately.

**Root cause:** an unspecified business rule, implemented inconsistently across the client–server boundary, plus a generic error message that hid the real cause.

**Corrective action:** the server checks for a previous application. An open one returns 409 "You have already applied to this job". A withdrawn one is reopened as "submitted", with a timeline entry "Application re-submitted". This keeps the unique index and preserves history.

**Preventive actions:**

- Business rules are recorded as decision tables and Gherkin scenarios before coding.
- API contract tests (API-RAP-01/02) and integration test IT-11 cover the sequence.
- Duplicate-key errors get specific messages at the point where they can occur.
