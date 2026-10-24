import { Router } from "express";
import { Internship } from "../models.js";
import { auth, allow, validId, wrap } from "../middleware.js";

const router = Router();
router.use(auth);

const pick = (b) => {
  const out = {};
  for (const k of [
    "title",
    "description",
    "minimumDegree",
    "preferredField",
    "minimumGpa",
    "location",
    "openings",
    "deadline",
    "active",
  ])
    if (b[k] !== undefined) out[k] = b[k] === "" ? undefined : b[k];
  if (b.requiredSkills !== undefined)
    out.requiredSkills = b.requiredSkills.map((s) => String(s).trim()).filter(Boolean);
  return out;
};

// READ (list)
router.get(
  "/",
  wrap(async (req, res) => {
    const q = {};
    if (req.user.role === "company") q.company = req.user._id;
    if (req.user.role === "student") q.active = true;
    const items = await Internship.find(q)
      .populate("company", "name organization email")
      .sort({ createdAt: -1 });
    res.json({ items, total: items.length, page: 1, pages: 1 });
  }),
);

// READ (single record)
router.get(
  "/:id",
  validId,
  wrap(async (req, res) => {
    const item = await Internship.findById(req.params.id).populate("company", "name organization email");
    if (!item) return res.status(404).json({ message: "Listing not found" });
    if (req.user.role === "company" && String(item.company._id) !== String(req.user._id))
      return res.status(403).json({ message: "Not your job listing" });
    if (req.user.role === "student" && !item.active)
      return res.status(404).json({ message: "Listing not found" });
    res.json(item);
  }),
);

// CREATE
router.post(
  "/",
  allow("company"),
  wrap(async (req, res) => {
    if (!req.body.title?.trim() || !req.body.description?.trim())
      return res.status(400).json({ message: "Title and description are required" });
    const item = await Internship.create({ ...pick(req.body), company: req.user._id });
    res.status(201).json(item);
  }),
);

// UPDATE
router.put(
  "/:id",
  allow("company"),
  validId,
  wrap(async (req, res) => {
    const item = await Internship.findOneAndUpdate(
      { _id: req.params.id, company: req.user._id },
      pick(req.body),
      { new: true, runValidators: true },
    );
    if (!item) return res.status(404).json({ message: "Listing not found" });
    res.json(item);
  }),
);

export default router;
