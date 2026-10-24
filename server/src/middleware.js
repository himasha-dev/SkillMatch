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
