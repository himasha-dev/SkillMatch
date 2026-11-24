// Cucumber World: boots the real SkillMatch Express app on a random port for each scenario.
// Persistence is replaced by in-memory test doubles (same helpers as the server API tests),
// so the scenarios exercise the real routes, validation and business rules deterministically
// without needing MongoDB. Full-stack runs on a real database are covered by
// server/tests/integration and the Selenium suite.
import { setWorldConstructor, Before, After } from "@cucumber/cucumber";
import { startServer } from "../../../server/tests/helpers/http.js";
import { restore } from "../../../server/tests/helpers/fakes.js";

class SkillMatchWorld {
  constructor() {
    this.jobs = new Map(); // title -> internship document
    this.applications = new Map(); // title -> application document
    this.response = null;
  }
}
setWorldConstructor(SkillMatchWorld);

Before(async function () {
  this.api = await startServer();
});

After(async function () {
  restore();
  await this.api.close();
});
