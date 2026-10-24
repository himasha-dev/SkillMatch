import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models.js";
import { auth, wrap } from "../middleware.js";
import { validateRegistration, sendInvalid } from "../validators.js";

const router = Router();
const tokenFor = (u) =>
  jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  organization: u.organization,
});

router.post(
  "/register",
  wrap(async (req, res) => {
    const errors = validateRegistration(req.body);
    if (Object.keys(errors).length) return sendInvalid(res, errors);
    const email = req.body.email.trim().toLowerCase();
    if (await User.findOne({ email }))
      return res.status(409).json({ message: "Email already registered", errors: { email: "Email already registered" } });
    const user = await User.create({
      name: req.body.name.trim(),
      email,
      password: await bcrypt.hash(req.body.password, 12),
      role: req.body.role,
      organization: req.body.role === "company" ? req.body.organization.trim() : undefined,
    });
    res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  }),
);

router.post(
  "/login",
  wrap(async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: "Invalid email or password" });
    res.json({ token: tokenFor(user), user: publicUser(user) });
  }),
);

router.get("/me", auth, (req, res) => res.json(publicUser(req.user)));

export default router;
