import { DEGREES } from "./models.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Strict number parsing: only real numbers or non-blank numeric strings count.
// (Number(true) === 1 and Number([]) === 0, which previously let booleans/arrays through.)
export function toNumber(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return Number.NaN;
}
const inRange = (v, min, max) => toNumber(v) >= min && toNumber(v) <= max;

// Each validator returns an object of { field: message }. Empty object = valid.
export function validateRegistration({ name, email, password, role, organization }) {
  const e = {};
  if (typeof name !== "string" || name.trim().length < 2) e.name = "Name must be at least 2 characters";
  if (typeof email !== "string" || !EMAIL.test(email.trim())) e.email = "Enter a valid email address";
  if (typeof password !== "string" || password.length < 8)
    e.password = "Password must be at least 8 characters";
  else if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
    e.password = "Password must contain letters and numbers";
  if (!["student", "company"].includes(role)) e.role = "Choose candidate or company";
  if (role === "company" && !String(organization || "").trim())
    e.organization = "Organization is required for companies";
  return e;
}

export function validateInternship(b, { partial = false } = {}) {
  const e = {};
  const has = (k) => !partial || b[k] !== undefined;
  if (has("title") && String(b.title || "").trim().length < 3)
    e.title = "Title must be at least 3 characters";
  if (has("description") && String(b.description || "").trim().length < 10)
    e.description = "Description must be at least 10 characters";
  if (has("requiredSkills") && (!Array.isArray(b.requiredSkills) || b.requiredSkills.length === 0))
    e.requiredSkills = "Add at least one required skill";
  if (b.minimumDegree !== undefined && !DEGREES.includes(b.minimumDegree))
    e.minimumDegree = "Invalid degree level";
  if (b.minimumGpa !== undefined && b.minimumGpa !== "" && !inRange(b.minimumGpa, 0, 4))
    e.minimumGpa = "GPA must be between 0 and 4";
  if (b.openings !== undefined && !(Number.isInteger(toNumber(b.openings)) && toNumber(b.openings) >= 1))
    e.openings = "Openings must be a whole number of at least 1";
  const deadlineError = checkDeadline(b.deadline);
  if (deadlineError) e.deadline = deadlineError;
  return e;
}

const startOfTodayUTC = (now = new Date()) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

// Returns an error message for a bad deadline, or null. An empty deadline means "open-ended".
export function checkDeadline(value, now = new Date()) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Deadline is not a valid date";
  if (d < startOfTodayUTC(now)) return "Deadline cannot be in the past";
  return null;
}

export function validateProfile(b) {
  const e = {};
  if (!DEGREES.includes(b.degree)) e.degree = "Choose a valid degree";
  if (String(b.field || "").trim().length < 2) e.field = "Field of study is required";
  if (!inRange(b.gpa, 0, 4)) e.gpa = "GPA must be between 0 and 4";
  if (b.experienceMonths != null && b.experienceMonths !== "" && !(toNumber(b.experienceMonths) >= 0))
    e.experienceMonths = "Experience cannot be negative";
  if (!Array.isArray(b.skills) || b.skills.length === 0) e.skills = "Add at least one skill";
  return e;
}

export const cleanSkills = (arr) =>
  [...new Set((Array.isArray(arr) ? arr : []).map((s) => String(s).trim()).filter(Boolean))];

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function sendInvalid(res, errors) {
  return res.status(400).json({ message: Object.values(errors)[0], errors });
}
