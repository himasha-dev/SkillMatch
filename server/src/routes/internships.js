import { Router } from "express";
import { Internship, Match, Application } from "../models.js";
import { auth, allow, validId, wrap } from "../middleware.js";
import { validateInternship, cleanSkills, escapeRegex, sendInvalid } from "../validators.js";

const router = Router();
router.use(auth);

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  title: { title: 1 },
  deadline: { deadline: 1 },
  openings: { openings: -1 },
  gpa: { minimumGpa: 1 },
};

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
  if (b.requiredSkills !== undefined) out.requiredSkills = cleanSkills(b.requiredSkills);
  return out;
};

// READ (list) with search, filter, sort and pagination
router.get(
  "/",
  wrap(async (req, res) => {
    const { search, location, degree, status, sort = "newest" } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
    const q = {};
    if (req.user.role === "company") q.company = req.user._id;
    if (req.user.role === "student") q.active = true;
    if (req.user.role !== "student" && ["active", "closed"].includes(status))
      q.active = status === "active";
    if (search?.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), "i");
      q.$or = [{ title: rx }, { description: rx }, { requiredSkills: rx }];
    }
    if (location?.trim()) q.location = new RegExp(`^${escapeRegex(location.trim())}$`, "i");
    if (degree) q.minimumDegree = String(degree);
    const [items, total] = await Promise.all([
      Internship.find(q)
        .populate("company", "name organization email")
        .sort(SORTS[sort] || SORTS.newest)
        .skip((page - 1) * limit)
        .limit(limit),
      Internship.countDocuments(q),
    ]);
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
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
    const errors = validateInternship(req.body);
    if (Object.keys(errors).length) return sendInvalid(res, errors);
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
    const errors = validateInternship(req.body, { partial: true });
    if (Object.keys(errors).length) return sendInvalid(res, errors);
    const item = await Internship.findOneAndUpdate(
      { _id: req.params.id, company: req.user._id },
      pick(req.body),
      { new: true, runValidators: true },
    );
    if (!item) return res.status(404).json({ message: "Listing not found" });
    res.json(item);
  }),
);

// DELETE (also removes dependent matches and applications)
router.delete(
  "/:id",
  allow("company"),
  validId,
  wrap(async (req, res) => {
    const item = await Internship.findOneAndDelete({ _id: req.params.id, company: req.user._id });
    if (!item) return res.status(404).json({ message: "Listing not found" });
    await Promise.all([
      Match.deleteMany({ internship: item._id }),
      Application.deleteMany({ internship: item._id }),
    ]);
    res.json({ message: "Listing deleted" });
  }),
);

export default router;
