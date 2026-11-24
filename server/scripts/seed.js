// Seeds a database with known test data (used by Selenium, JMeter and manual testing).
// Usage: MONGO_URI=mongodb://127.0.0.1:27017/skillmatch_test node scripts/seed.js
// Safe to re-run: it removes only the seed accounts and their data first.
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, Student, Internship, Application, Match } from "../src/models.js";

export const SEED = {
  password: "Passw0rd1",
  company: { name: "Acme HR", email: "hr@acme.test", role: "company", organization: "Acme Labs" },
  student: { name: "Sam Student", email: "student@uni.test", role: "student" },
  jobCount: 30,
};

export async function seed() {
  const emails = [SEED.company.email, SEED.student.email];
  const old = await User.find({ email: { $in: emails } });
  const oldIds = old.map((u) => u._id);
  const oldJobs = await Internship.find({ company: { $in: oldIds } }).distinct("_id");
  const oldStudents = await Student.find({ user: { $in: oldIds } }).distinct("_id");
  await Promise.all([
    Application.deleteMany({ $or: [{ internship: { $in: oldJobs } }, { student: { $in: oldStudents } }] }),
    Match.deleteMany({ internship: { $in: oldJobs } }),
    Internship.deleteMany({ _id: { $in: oldJobs } }),
    Student.deleteMany({ _id: { $in: oldStudents } }),
    User.deleteMany({ _id: { $in: oldIds } }),
  ]);

  const password = await bcrypt.hash(SEED.password, 12);
  const company = await User.create({ ...SEED.company, password });
  const student = await User.create({ ...SEED.student, password });
  await Student.create({
    user: student._id, degree: "Bachelor", field: "Computer Engineering", gpa: 3.4,
    skills: ["JavaScript", "React", "SQL"], experienceMonths: 6, location: "Colombo",
  });
  const skills = [["JavaScript", "Selenium"], ["Node.js", "MongoDB"], ["Java", "Spring"], ["Python", "SQL"], ["React", "CSS"]];
  const places = ["Colombo", "Remote", "Galle", "Kandy"];
  const jobs = Array.from({ length: SEED.jobCount }, (_, i) => ({
    company: company._id,
    title: `${["QA", "Backend", "Java", "Data", "Frontend"][i % 5]} Intern ${i + 1}`,
    description: `Seeded internship number ${i + 1} for automated and performance testing.`,
    requiredSkills: skills[i % 5],
    minimumDegree: i % 3 === 0 ? "Diploma" : "Bachelor",
    minimumGpa: [2.5, 3, 3.2][i % 3],
    location: places[i % 4],
    openings: (i % 4) + 1,
    deadline: new Date(Date.now() + (i + 10) * 86_400_000),
  }));
  await Internship.insertMany(jobs);
  return { company, student };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("seed.js")) {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("Set MONGO_URI first");
    process.exit(1);
  }
  await mongoose.connect(uri);
  await seed();
  console.log(`Seeded ${SEED.jobCount} listings. Logins: ${SEED.company.email} / ${SEED.student.email} (password ${SEED.password})`);
  await mongoose.disconnect();
}
