import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { User } from "./models.js";

export async function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "Authentication required" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) return res.status(401).json({ message: "User no longer exists" });
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export const allow =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user.role)
      ? next()
      : res.status(403).json({ message: "You do not have permission" });

export function validId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ message: "Invalid id" });
  next();
}

// Wrap async handlers so rejected promises reach the error handler.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  // Errors raised by express.json(): malformed JSON (400) or body over the size limit (413).
  if (err.type === "entity.parse.failed")
    return res.status(400).json({ message: "Request body is not valid JSON" });
  if (err.type === "entity.too.large")
    return res.status(413).json({ message: "Request body is too large" });
  if (err.name === "ValidationError") {
    const errors = Object.fromEntries(
      Object.entries(err.errors).map(([k, v]) => [k, v.message]),
    );
    return res
      .status(400)
      .json({ message: Object.values(errors)[0] || "Validation failed", errors });
  }
  if (err.name === "CastError")
    return res.status(400).json({ message: `Invalid value for ${err.path}` });
  if (err.code === 11000)
    return res.status(409).json({ message: "A record with these details already exists" });
  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server" });
}

// Basic hardening headers (OWASP A05). Kept dependency-free; `helmet` is the fuller option.
export function securityHeaders(req, res, next) {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "same-site",
  });
  next();
}

// Throttles repeated failed logins per IP + email (OWASP A07 brute-force protection).
// In-memory, so it resets on restart and is per-process; use a shared store if scaled out.
export function createLoginLimiter({ max = 10, windowMs = 15 * 60 * 1000, now = Date.now } = {}) {
  const failures = new Map();
  const keyOf = (req) => `${req.ip}|${String(req.body?.email || "").trim().toLowerCase()}`;
  const fresh = (key) => {
    const entry = failures.get(key);
    if (entry && now() - entry.first >= windowMs) failures.delete(key);
    return failures.get(key);
  };
  return {
    guard(req, res, next) {
      const entry = fresh(keyOf(req));
      if (entry && entry.count >= max) {
        const retry = Math.ceil((entry.first + windowMs - now()) / 1000);
        res.set("Retry-After", String(retry));
        return res.status(429).json({ message: "Too many failed login attempts. Try again later." });
      }
      next();
    },
    fail(req) {
      const key = keyOf(req);
      const entry = fresh(key) || { count: 0, first: now() };
      entry.count += 1;
      failures.set(key, entry);
    },
    succeed(req) {
      failures.delete(keyOf(req));
    },
  };
}
