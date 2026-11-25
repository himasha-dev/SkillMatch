// Selenium WebDriver UI tests for SkillMatch (real browser, real API, real MongoDB).
// Prerequisites (GitHub Actions job "e2e" does all of this automatically):
//   1. MongoDB running and the API started:  cd server && npm run seed && npm start
//   2. Client built and served:              cd client && npm run build && npm run preview -- --port 4173
//   3. Run:                                  cd qa && BASE_URL=http://localhost:4173 npm run e2e
// Set HEADLESS=false to watch the browser. Screenshots are written to qa/reports/screenshots.
import { describe, it, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Builder, By, until, Key } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import { L } from "./locators.js";

const BASE = process.env.BASE_URL || "http://localhost:4173";
const PASSWORD = "Passw0rd1"; // matches server/scripts/seed.js
const COMPANY = "hr@acme.test";
const STUDENT = "student@uni.test";
const SHOTS = new URL("../reports/screenshots/", import.meta.url);
const TIMEOUT = 30_000;

let driver;
const $ = (xpath) => driver.wait(until.elementLocated(By.xpath(xpath)), TIMEOUT);
const $$ = (xpath) => driver.findElements(By.xpath(xpath));
const visible = async (xpath) => driver.wait(until.elementIsVisible(await $(xpath)), TIMEOUT);
const type = async (xpath, text) => {
  const el = await visible(xpath);
  await el.clear();
  await el.sendKeys(text);
};
// Real mouse click; falls back to a DOM click if an overlay (e.g. a fading toast) intercepts it.
const click = async (xpath) => {
  const el = await visible(xpath);
  await driver.wait(until.elementIsEnabled(el), TIMEOUT);
  await driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", el);
  try {
    await el.click();
  } catch (e) {
    if (!/intercepted|not interactable/i.test(e.message)) throw e;
    await driver.executeScript("arguments[0].click();", el);
  }
};
// Wait for a toast with this exact text (an older toast may still be on screen).
const expectToast = (text) => visible(`${L.toast}[normalize-space(.)='${text}']`);

async function login(email) {
  await driver.get(BASE);
  await localStorageClear();
  await driver.navigate().refresh();
  await type(L.field("Email"), email);
  await type(L.field("Password"), PASSWORD);
  await click(L.button("Continue"));
}
const localStorageClear = () => driver.executeScript("window.localStorage.clear()");
async function shot(name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.writeFileSync(new URL(`${name}.png`, SHOTS), await driver.takeScreenshot(), "base64");
}

before(async () => {
  const options = new chrome.Options().addArguments(
    "--window-size=1280,900",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    // The seed password is a known-breached one, so Chrome would open its "Change your password"
    // dialog after login. That browser dialog swallows clicks and keystrokes and made CI flaky.
    "--disable-features=PasswordLeakDetection,PasswordCheck,PasswordManagerOnboarding",
    "--disable-save-password-bubble",
  );
  options.setUserPreferences({
    credentials_enable_service: false,
    "profile.password_manager_enabled": false,
    "profile.password_manager_leak_detection": false,
  });
  if (process.env.HEADLESS !== "false") options.addArguments("--headless=new");
  driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
});
after(async () => driver && (await driver.quit()));
afterEach(async (t) => driver && shot(t.name.split(" ")[0]));

describe("Authentication UI", () => {
  it("E2E-01 login page loads with the SkillMatch branding", async () => {
    await driver.get(BASE);
    assert.equal(await driver.getTitle(), "SkillMatch");
    await visible(L.heading("Welcome back"));
  });

  it("E2E-02 registration form shows inline validation errors without calling the API", async () => {
    await driver.get(BASE);
    await click(L.link("Create account"));
    await click(L.button("Continue"));
    await visible(L.fieldErrors);
    const errors = await Promise.all((await $$(L.fieldErrors)).map((e) => e.getText()));
    assert.ok(errors.includes("Name must be at least 2 characters"), errors.join(" | "));
    assert.ok(errors.includes("Enter a valid email address"));
  });

  it("E2E-03 wrong password shows the server's error message", async () => {
    await driver.get(BASE);
    await type(L.field("Email"), STUDENT);
    await type(L.field("Password"), "WrongPass99");
    await click(L.button("Continue"));
    const alert = await visible(L.alert);
    assert.match(await alert.getText(), /Invalid email or password/);
  });
});

describe("Company: job listing CRUD", () => {
  const title = `Selenium QA Intern ${Date.now()}`;

  it("E2E-04 company logs in and sees its dashboard with Edit/Delete actions", async () => {
    await login(COMPANY);
    await visible(L.text("COMPANY DASHBOARD"));
    await visible(L.text("jobs found"));
    assert.ok((await $$(`//button[starts-with(@aria-label,'Edit ')]`)).length > 0, "Edit buttons visible on cards");
  });

  it("E2E-05 company publishes a new listing (CREATE) and it appears in the list (READ)", async () => {
    await click(L.button("New job"));
    await type(L.field("Job title"), title);
    await type(L.field("Description"), "Automate UI regression tests with Selenium WebDriver.");
    await type(L.field("Required skills"), "Selenium, JavaScript");
    await type(L.field("Openings"), "2");
    await click(L.button("Publish listing"));
    await expectToast("Listing published");
    await type(L.searchBox, title);
    await visible(L.cardByTitle(title));
  });

  it("E2E-06 company edits the listing (UPDATE)", async () => {
    await click(L.buttonLabel(`Edit ${title}`));
    const openings = await visible(L.field("Openings"));
    await openings.sendKeys(Key.chord(Key.CONTROL, "a"), "5");
    await click(L.button("Save changes"));
    await expectToast("Listing updated");
    await visible(`${L.cardByTitle(title)}//small[contains(.,'5 opening')]`);
  });

  it("E2E-07 company deletes the listing after confirming (DELETE)", async () => {
    await click(L.buttonLabel(`Delete ${title}`));
    await visible(L.dialog);
    await click(L.dialogButton("Delete"));
    await expectToast("Listing deleted");
    await driver.wait(async () => (await $$(L.cardByTitle(title))).length === 0, TIMEOUT);
  });
});

describe("Candidate: search and apply", () => {
  it("E2E-08 candidate sees the candidate dashboard (regression test for BUG-01)", async () => {
    await login(STUDENT);
    await visible(L.text("CANDIDATE DASHBOARD"));
    await visible(L.heading("Application tracker"));
  });

  it("E2E-09 candidate searches, applies with a cover note and sees it in the tracker", async () => {
    await type(L.searchBox, "Backend Intern");
    await driver.wait(async () => {
  try {
    const titles = await Promise.all(
      (await $$(`${L.jobCards}//h3`)).map((h) => h.getText())
    );

    return titles.length > 0 &&
      titles.every((t) => t.includes("Backend Intern"));
  } catch (error) {
    if (error.name === "StaleElementReferenceError") {
      return false;
    }
    throw error;
  }
}, TIMEOUT);
    const jobTitle = await (await visible(L.jobCardTitle)).getText();
    await click(L.firstApply);
    await visible(L.dialog);
    await type(L.field("Cover note"), "I have built REST APIs with Express in my coursework.");
    await click(L.dialogButton("Submit application"));
    await expectToast("Application submitted");
    await driver.wait(async () => {
      const tracked = await Promise.all((await $$(L.trackerTitles)).map((h) => h.getText()));
      return tracked.includes(jobTitle);
    }, TIMEOUT);
  });

  it("E2E-10 job details modal opens and closes with Escape (regression test for BUG-12)", async () => {
    await click(L.button("Details"));
    await visible(L.dialog);
    await driver.actions().sendKeys(Key.ESCAPE).perform();
    await driver.wait(async () => (await $$(L.dialog)).length === 0, TIMEOUT);
  });
});
