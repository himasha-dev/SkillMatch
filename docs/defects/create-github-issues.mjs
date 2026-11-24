// Creates one GitHub issue per defect in defects.json using the GitHub CLI (gh).
// Prerequisites: install gh (https://cli.github.com), run `gh auth login`, then from the repo root:
//   node docs/defects/create-github-issues.mjs            (dry run: prints what it would do)
//   node docs/defects/create-github-issues.mjs --create   (creates labels + issues)
// Fixed defects are created and then closed with a comment, so the lifecycle is visible.
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const create = process.argv.includes("--create");
const defects = JSON.parse(fs.readFileSync(new URL("./defects.json", import.meta.url), "utf8"));
const gh = (...args) => (create ? execFileSync("gh", args, { encoding: "utf8" }).trim() : console.log("gh", args.join(" ")));

const labels = [["bug", "d73a4a"], ["severity:critical", "b60205"], ["severity:major", "d93f0b"], ["severity:minor", "fbca04"], ["severity:trivial", "c2e0c6"], ["security", "5319e7"], ["performance", "0e8a16"], ["usability", "1d76db"], ["status:verified", "0e8a16"]];
for (const [name, color] of labels) {
  try { gh("label", "create", name, "--color", color, "--force"); } catch (e) { console.error(e.message); }
}

for (const d of defects) {
  const extra = /OWASP/.test(d.title) || /injection|brute/i.test(d.title) ? ["security"] : /CPU|load/i.test(d.title) ? ["performance"] : /UI/.test(d.component) ? ["usability"] : [];
  const body = [
    `**Defect ID:** ${d.id}  `, `**Severity / Priority:** ${d.severity} / ${d.priority}  `, `**Component:** ${d.component}  `, `**Detected by:** ${d.tests}`,
    "", "### Steps to reproduce", d.steps, "", "### Expected result", d.expected, "", "### Actual result", d.actual,
    "", "### Root cause", d.root_cause, "", "### Fix / recommendation", d.fix,
  ].join("\n");
  const url = gh("issue", "create", "--title", `[${d.id}] ${d.title}`, "--body", body, "--label", ["bug", `severity:${d.severity.toLowerCase()}`, ...extra].join(","));
  if (d.status === "Fixed" && create) {
    gh("issue", "comment", url, "--body", `Fixed on branch qa/ec4206-testing. Verified: regression tests ${d.tests} pass in CI.`);
    gh("issue", "edit", url, "--add-label", "status:verified");
    gh("issue", "close", url, "--reason", "completed");
  }
}
