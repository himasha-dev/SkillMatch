import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models.js";
import { auth } from "../middleware.js";

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

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, organization } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email and password are required" });
    if (!["student", "company"].includes(role))
      return res.status(400).json({ message: "Choose candidate or company" });
    if (await User.findOne({ email: String(email).toLowerCase() }))
      return res.status(409).json({ message: "Email already registered" });
    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role,
      organization: role === "company" ? organization : undefined,
    });
    res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").toLowerCase();
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(String(req.body.password || ""), user.password)))
      return res.status(401).json({ message: "Invalid email or password" });
    res.json({ token: tokenFor(user), user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Login failed" });
  }
});

router.get("/me", auth, (req, res) => res.json(publicUser(req.user)));

export default router;
