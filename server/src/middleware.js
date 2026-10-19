import jwt from "jsonwebtoken";
import { User } from "./models.js";

export async function auth(req, res, next) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token)
      return res.status(401).json({ message: "Authentication required" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user)
      return res.status(401).json({ message: "User no longer exists" });
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
      
      export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
      
