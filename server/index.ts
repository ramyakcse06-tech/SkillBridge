import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./database/db";
import jobRoutes from "./routes/jobRoutes";
import skillGapRoutes from "./routes/skillGapRoutes";
import learningRoutes from "./routes/learningRoutes";
import assessmentRoutes from "./routes/assessmentRoutes";
import technicalRoutes from "./routes/technicalRoutes";
import codingRoutes from "./routes/codingRoutes";
import interviewRoutes from "./routes/interviewRoutes";
import readinessRoutes from "./routes/readinessRoutes";
import assessmentResultsRoutes from "./routes/assessmentResultsRoutes";
import opportunityRoutes from "./routes/opportunityRoutes";
import recruiterRoutes from "./routes/recruiterRoutes";
import documentRoutes from "./routes/documentRoutes";


import studentRoutes from "./routes/studentRoutes";
import resumeRoutes from "./routes/resumeRoutes";
import skillRoutes from "./routes/skillRoutes";

import path from "path";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());


app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "SkillBridge API is running",
  });
});

app.get("/api/db-test", (_req, res) => {
  try {
    const result = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all();

    res.json({
      success: true,
      tables: result,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Database test failed",
    });
  }
});

// API routes
app.use("/api/students", studentRoutes);
app.use("/api/students", skillRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/students", skillGapRoutes);
app.use("/api/students", learningRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/assessments", technicalRoutes);
app.use("/api/assessments", codingRoutes);
app.use("/api/assessments", interviewRoutes);
app.use("/api/opportunities", opportunityRoutes);
app.use("/api/recruiter", recruiterRoutes);
app.use(
  "/api/readiness",
  readinessRoutes
);
app.use(
  "/api/assessment-results",
  assessmentResultsRoutes
);
app.use("/api/documents", documentRoutes);

// Serve the React frontend
const clientDistPath = path.resolve(process.cwd(), "../client/dist");

app.use(express.static(clientDistPath));

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  res.sendFile(path.join(clientDistPath, "index.html"));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`SkillBridge server running on http://localhost:${PORT}`);
});