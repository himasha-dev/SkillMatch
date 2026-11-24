// Cucumber configuration (cucumber-js reads this file automatically).
export default {
  paths: ["features/**/*.feature"],
  import: ["features/support/**/*.js", "features/step_definitions/**/*.js"],
  format: [
    "progress-bar",
    "html:reports/cucumber-report.html",
    "json:reports/cucumber-report.json",
    "junit:reports/cucumber-junit.xml",
  ],
};
