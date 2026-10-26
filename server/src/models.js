import mongoose from "mongoose";

const { Schema } = mongoose;
const ref = (model, extra = {}) => ({
  type: Schema.Types.ObjectId,
  ref: model,
  required: true,
  ...extra,
});

export const DEGREES = ["Certificate", "Diploma", "Bachelor", "Master", "PhD"];
export const APPLICATION_STATUSES = [
  "submitted",
  "reviewing",
  "shortlisted",
  "interview",
  "offered",
  "rejected",
  "withdrawn",
];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Email address is not valid"],
    },
    password: { type: String, required: true },
    role: { type: String, enum: ["student", "company", "admin"], required: true },
    organization: { type: String, trim: true, maxlength: 120 },
  },
  { timestamps: true },
);

const studentSchema = new Schema(
  {
    user: ref("User", { unique: true }),
    degree: { type: String, enum: DEGREES, required: true },
    field: { type: String, required: true, trim: true, maxlength: 80 },
    gpa: { type: Number, min: 0, max: 4, required: true },
    skills: { type: [String], default: [] },
    experienceMonths: { type: Number, default: 0, min: 0, max: 600 },
    location: { type: String, default: "Remote", trim: true, maxlength: 80 },
    bio: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

// MAIN ENTITY: Internship (job listing) - full CRUD
const internshipSchema = new Schema(
  {
    company: ref("User", { index: true }),
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    requiredSkills: { type: [String], default: [] },
    minimumDegree: { type: String, enum: DEGREES, default: "Diploma" },
    preferredField: { type: String, default: "Any", trim: true },
    minimumGpa: { type: Number, default: 0, min: 0, max: 4 },
    location: { type: String, default: "Remote", trim: true },
    openings: { type: Number, default: 1, min: 1, max: 1000 },
    deadline: Date,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
internshipSchema.index({ title: "text", description: "text", requiredSkills: "text" });

const matchSchema = new Schema(
  {
    student: ref("Student"),
    internship: ref("Internship"),
    score: { type: Number, required: true, min: 0, max: 100 },
    breakdown: {
      skills: Number,
      field: Number,
      degree: Number,
      gpa: Number,
      location: Number,
    },
    matchedSkills: [String],
    missingSkills: [String],
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    adminNote: { type: String, maxlength: 300 },
  },
  { timestamps: true },
);
matchSchema.index({ student: 1, internship: 1 }, { unique: true });

const applicationSchema = new Schema(
  {
    student: ref("Student"),
    internship: ref("Internship"),
    coverNote: { type: String, maxlength: 1000 },
    status: { type: String, enum: APPLICATION_STATUSES, default: "submitted" },
    timeline: [
      {
        status: String,
        note: String,
        changedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);
applicationSchema.index({ student: 1, internship: 1 }, { unique: true });

export const User = mongoose.model("User", userSchema);
export const Student = mongoose.model("Student", studentSchema);
export const Internship = mongoose.model("Internship", internshipSchema);
export const Match = mongoose.model("Match", matchSchema);
export const Application = mongoose.model("Application", applicationSchema);
