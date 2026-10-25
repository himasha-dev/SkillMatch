import { Router } from "express";
import { Student } from "../models.js";
import { auth, allow, wrap } from "../middleware.js";
import { validateProfile, cleanSkills, sendInvalid } from "../validators.js";

const router = Router();
router.use(auth, allow("student"));

router.get(
  "/profile",
  wrap(async (req, res) => res.json((await Student.findOne({ user: req.user._id })) || null)),
);

// Create or update the candidate's qualification profile
router.put(
  "/profile",
  wrap(async (req, res) => {
    const errors = validateProfile(req.body);
    if (Object.keys(errors).length) return sendInvalid(res, errors);
    const { degree, field, gpa, experienceMonths, location, bio } = req.body;
    const data = {
      degree,
      field: field.trim(),
      gpa: Number(gpa),
      skills: cleanSkills(req.body.skills),
      experienceMonths: Number(experienceMonths || 0),
      location: String(location || "Remote").trim(),
      bio,
      user: req.user._id,
    };
    res.json(
      await Student.findOneAndUpdate({ user: req.user._id }, data, {
        new: true,
        upsert: true,
        runValidators: true,
      }),
    );
  }),
);

export default router;
