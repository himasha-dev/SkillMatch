import { Router } from "express";
import { User, Student, Internship, Match, Application } from "../models.js";
import { auth, allow, wrap } from "../middleware.js";

const router = Router();

router.get(
  "/stats",
  auth,
  allow("admin"),
  wrap(async (req, res) => {
    const [students, companies, internships, applications, pending, approved] = await Promise.all([
      Student.countDocuments(),
      User.countDocuments({ role: "company" }),
      Internship.countDocuments({ active: true }),
      Application.countDocuments(),
      Match.countDocuments({ status: "pending" }),
      Match.countDocuments({ status: "approved" }),
    ]);
    res.json({ students, companies, internships, applications, pending, approved });
  }),
);

export default router;
