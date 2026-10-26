import { Router } from "express";
import { Student, Internship, Match } from "../models.js";
import { auth, allow, validId, wrap } from "../middleware.js";
import { calculateMatch } from "../matcher.js";

const router = Router();
router.use(auth);

router.post(
  "/generate",
  allow("admin"),
  wrap(async (req, res) => {
    const minimum = Number(req.body.minimumScore ?? 50);
    if (!(minimum >= 0 && minimum <= 100))
      return res.status(400).json({ message: "Minimum score must be between 0 and 100" });
    const [students, jobs] = await Promise.all([Student.find(), Internship.find({ active: true })]);
    let count = 0;
    for (const student of students)
      for (const job of jobs) {
        const result = calculateMatch(student, job);
        if (result.score >= minimum) {
          await Match.findOneAndUpdate(
            { student: student._id, internship: job._id },
            { $set: result },
            { upsert: true, new: true },
          );
          count++;
        }
      }
    res.json({ message: `Generated ${count} qualified matches`, count });
  }),
);

router.get(
  "/",
  wrap(async (req, res) => {
    let q = {};
    if (req.user.role === "student") {
      const s = await Student.findOne({ user: req.user._id });
      q = { student: s?._id || null, status: "approved" };
    } else if (req.user.role === "company") {
      const ids = await Internship.find({ company: req.user._id }).distinct("_id");
      q = { internship: { $in: ids }, status: "approved" };
    }
    const rows = await Match.find(q)
      .populate({ path: "student", populate: { path: "user", select: "name email" } })
      .populate({ path: "internship", populate: { path: "company", select: "name organization" } })
      .sort({ score: -1 });
    res.json(rows);
  }),
);

router.patch(
  "/:id/status",
  allow("admin"),
  validId,
  wrap(async (req, res) => {
    if (!["approved", "rejected", "pending"].includes(req.body.status))
      return res.status(400).json({ message: "Invalid status" });
    const row = await Match.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, adminNote: req.body.adminNote || "" },
      { new: true },
    );
    if (!row) return res.status(404).json({ message: "Match not found" });
    res.json(row);
  }),
);

export default router;
