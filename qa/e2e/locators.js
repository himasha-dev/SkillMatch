// XPath locators for the SkillMatch UI, shared by the Selenium suite.
// The app wraps each input in its <label>, so fields are found by their visible label text.
const q = (s) => (s.includes("'") ? `concat('${s.split("'").join(`', "'", '`)}')` : `'${s}'`);

export const L = {
  field: (label) => `//label[contains(normalize-space(.), ${q(label)})]//*[self::input or self::textarea or self::select]`,
  button: (text) => `//button[contains(normalize-space(.), ${q(text)})]`,
  buttonLabel: (aria) => `//button[@aria-label=${q(aria)}]`,
  link: (text) => `//a[normalize-space(.)=${q(text)}]`,
  heading: (text) => `//*[self::h1 or self::h2 or self::h3][contains(normalize-space(.), ${q(text)})]`,
  text: (text) => `//*[contains(normalize-space(text()), ${q(text)})]`,
  alert: `//*[@role='alert']`,
  toast: `//*[@role='status' and contains(@class,'toast')]`,
  fieldErrors: `//span[@class='fielderror']`,
  dialog: `//*[@role='dialog']`,
  dialogButton: (text) => `//*[@role='dialog']//button[contains(normalize-space(.), ${q(text)})]`,
  searchBox: `//input[@aria-label='Search jobs']`,
  jobCards: `//div[contains(@class,'job') and contains(@class,'card')]`,
  jobCardTitle: `(//div[contains(@class,'job') and contains(@class,'card')])[1]//h3`,
  firstApply: `(//div[contains(@class,'job') and contains(@class,'card')]//button[normalize-space(.)='Apply now'])[1]`,
  cardByTitle: (title) => `//div[contains(@class,'job') and contains(@class,'card')][.//h3[normalize-space(.)=${q(title)}]]`,
  trackerTitles: `//div[contains(@class,'application')]//h3`,
};
