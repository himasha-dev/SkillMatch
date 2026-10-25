import mongoose from "mongoose";

const { Schema } = mongoose;
const ref = (model, extra = {}) => ({
  type: Schema.Types.ObjectId,
  ref: model,
  required: true,
  ...extra,
});

export const DEGREES = ["Certificate", "Diploma", "Bachelor", "Master", "PhD"];

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

export const User = mongoose.model("User", userSchema);
export const Student = mongoose.model("Student", studentSchema);
export const Internship = mongoose.model("Internship", internshipSchema);
