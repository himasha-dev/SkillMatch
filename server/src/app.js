import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import studentRoutes from "./routes/students.js";
import internshipRoutes from "./routes/internships.js";
import applicationRoutes from "./routes/applications.js";
import { notFound, errorHandler, securityHeaders } from "./middleware.js";

// Builds the Express application without connecting to MongoDB or listening on a port.
// index.js uses it for the real server; the automated tests import it directly.
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", authRoutes);
  app.use("/api/students", studentRoutes);
  app.use("/api/internships", internshipRoutes);
  app.use("/api/applications", applicationRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
