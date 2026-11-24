import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";

for (const key of ["MONGO_URI", "JWT_SECRET"]) {
  if (!process.env[key]) {
    console.error(`Missing ${key}. Copy server/.env.example to server/.env first.`);
    process.exit(1);
  }
}

const app = createApp();
const port = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => app.listen(port, () => console.log(`SkillMatch API on ${port}`)))
  .catch((e) => {
    console.error("Could not connect to MongoDB:", e.message);
    process.exit(1);
  });
