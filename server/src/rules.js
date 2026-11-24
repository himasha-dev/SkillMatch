import { APPLICATION_STATUSES } from "./models.js";

// Single source of truth for application status rules (used by routes and tests).
export const FINAL_STATUSES = ["offered", "rejected", "withdrawn"];
export const OPEN_STATUSES = APPLICATION_STATUSES.filter((s) => !FINAL_STATUSES.includes(s));
// A company/admin may set any status except "withdrawn", which only the candidate can choose.
export const COMPANY_SETTABLE_STATUSES = APPLICATION_STATUSES.filter((s) => s !== "withdrawn");

export const canWithdraw = (status) => OPEN_STATUSES.includes(status);
export const isCompanySettable = (status) => COMPANY_SETTABLE_STATUSES.includes(status);
