import { Router } from "express";
import { Student, Internship, Application } from "../models.js";
import { auth, allow, validId, wrap } from "../middleware.js";

const router = Router();
router.use(auth);

const populate = (q) =>
  q
    .populate({ path: "student", populate: { path: "user", select: "name email" } })
    .populate({ path: "internship", populate: { path: "company", select: "name organization" } });

router.post(
  "/",
  allow("student"),
  wrap(async (req, res) => {
    const student = await Student.findOne({ user: req.user._id });
    if (!student)
      return res.status(400).json({ message: "Complete your qualification profile first" });
    const note = String(req.body.coverNote || "").trim();
    if (note.length > 1000)
      return res.status(400).json({ message: "Cover note must be 1000 characters or fewer" });
    const job = await Internship.findOne({ _id: req.body.internship, active: true });
    if (!job) return res.status(404).json({ message: "Job is unavailable" });
    if (job.deadline && job.deadline < new Date())
      return res.status(400).json({ message: "The application deadline has passed" });
    const row = await Application.create({
      student: student._id,
      internship: job._id,
      coverNote: note,
      timeline: [{ status: "submitted", note: "Application submitted" }],
    });
    res.status(201).json(row);
  }),
);

router.get(
  "/",
  wrap(async (req, res) => {
    let q = {};
    if (req.user.role === "student") {
      const s = await Student.findOne({ user: req.user._id });
      q = { student: s?._id || null };
    } else if (req.user.role === "company") {
      const ids = await Internship.find({ company: req.user._id }).distinct("_id");
      q = { internship: { $in: ids } };
    }
    res.json(await populate(Application.find(q).sort({ updatedAt: -1 })));
  }),
);

router.patch(
  "/:id/status",
  allow("company", "admin"),
  validId,
  wrap(async (req, res) => {
    const valid = ["submitted", "reviewing", "shortlisted", "interview", "offered", "rejected"];
    if (!valid.includes(req.body.status))
      return res.status(400).json({ message: "Invalid application status" });
    const row = await Application.findById(req.params.id).populate("internship");
    if (!row) return res.status(404).json({ message: "Application not found" });
    if (req.user.role === "company" && String(row.internship.company) !== String(req.user._id))
      return res.status(403).json({ message: "Not your job listing" });
    if (row.status === "withdrawn")
      return res.status(400).json({ message: "This application was withdrawn by the candidate" });
    row.status = req.body.status;
    row.timeline.push({
      status: req.body.status,
      note: req.body.note || `Status changed to ${req.body.status}`,
    });
    await row.save();
    res.json(row);
  }),
);

router.patch(
  "/:id/withdraw",
  allow("student"),
  validId,
  wrap(async (req, res) => {
    const student = await Student.findOne({ user: req.user._id });
    const row = await Application.findOne({ _id: req.params.id, student: student?._id });
    if (!row) return res.status(404).json({ message: "Application not found" });
    row.status = "withdrawn";
    row.timeline.push({ status: "withdrawn", note: "Withdrawn by student" });
    await row.save();
    res.json(row);
  }),
);

// DELETE: a candidate may permanently remove their own application record
router.delete(
  "/:id",
  allow("student"),
  validId,
  wrap(async (req, res) => {
    const student = await Student.findOne({ user: req.user._id });
    const row = await Application.findOneAndDelete({ _id: req.params.id, student: student?._id });
    if (!row) return res.status(404).json({ message: "Application not found" });
    res.json({ message: "Application deleted" });
  }),
);

export default router;
