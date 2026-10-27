import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, Student, Internship, Match, Application } from "./models.js";

await mongoose.connect(process.env.MONGO_URI);
await Promise.all([
  User.deleteMany({}),
  Student.deleteMany({}),
  Internship.deleteMany({}),
  Match.deleteMany({}),
  Application.deleteMany({}),
]);
const password = await bcrypt.hash("Password123!", 12);
const [admin, student, company, company2] = await User.create([
  { name: "System Admin", email: "admin@skillmatch.test", password, role: "admin" },
  { name: "Ayesha Perera", email: "student@skillmatch.test", password, role: "student" },
  { name: "Nimal Fernando", email: "company@skillmatch.test", password, role: "company", organization: "Nova Digital" },
  { name: "Kavindi Silva", email: "company2@skillmatch.test", password, role: "company", organization: "Lanka Analytics" },
]);
await Student.create({
  user: student._id,
  degree: "Bachelor",
  field: "Computer Science",
  gpa: 3.6,
  skills: ["React", "JavaScript", "Node.js", "MongoDB"],
  experienceMonths: 6,
  location: "Colombo",
  bio: "Final-year student interested in full-stack engineering.",
});
const day = 86400000;
await Internship.create([
  {
    company: company._id,
    title: "Full-Stack Developer Intern",
    description: "Build customer-facing web features with our product team.",
    requiredSkills: ["React", "JavaScript", "Node.js", "MongoDB"],
    minimumDegree: "Bachelor",
    preferredField: "Computer Science",
    minimumGpa: 3,
    location: "Colombo",
    openings: 2,
    deadline: new Date(Date.now() + 30 * day),
  },
  {
    company: company._id,
    title: "UI/UX Design Intern",
    description: "Design polished interfaces and user flows.",
    requiredSkills: ["Figma", "Research", "Prototyping"],
    minimumDegree: "Diploma",
    preferredField: "Any",
    minimumGpa: 2.5,
    location: "Remote",
    openings: 1,
    deadline: new Date(Date.now() + 45 * day),
  },
  {
    company: company2._id,
    title: "Data Analyst Intern",
    description: "Clean datasets, build dashboards and report insights to clients.",
    requiredSkills: ["Python", "SQL", "Excel"],
    minimumDegree: "Bachelor",
    preferredField: "Any",
    minimumGpa: 3.2,
    location: "Kandy",
    openings: 3,
    deadline: new Date(Date.now() + 20 * day),
  },
  {
    company: company2._id,
    title: "QA Automation Intern",
    description: "Write automated tests and help the team ship reliable releases.",
    requiredSkills: ["JavaScript", "Testing", "Git"],
    minimumDegree: "Diploma",
    preferredField: "Computer Science",
    minimumGpa: 2.8,
    location: "Colombo",
    openings: 2,
    deadline: new Date(Date.now() + 14 * day),
  },
]);
console.log("Seeded. All demo passwords: Password123!");
await mongoose.disconnect();
