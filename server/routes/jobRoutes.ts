import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

// ==========================================
// Types
// ==========================================

interface JobSkill {
  skill_id: string;
  skill: string;
  relation_type: string;
  skill_type: string;
}

interface Occupation {
  occupation_id: string;
  occupation_label: string;
  description: string;
  isco_group: number;
  skills: JobSkill[];
}

interface JobRequirementsData {
  source: string;
  source_files: string[];
  occupations: Occupation[];
}

// ==========================================
// Load ESCO job requirements
// ==========================================

const dataPath = path.join(
  __dirname,
  "../data/job_requirements.json"
);

const jobData: JobRequirementsData = JSON.parse(
  fs.readFileSync(dataPath, "utf-8")
);

// ==========================================
// GET ALL JOBS
// GET /api/jobs
// ==========================================

router.get("/", (_req, res) => {
  try {
    const jobs = jobData.occupations.map((occupation) => ({
      occupation_id: occupation.occupation_id,
      occupation_label: occupation.occupation_label,
      description: occupation.description,
      isco_group: occupation.isco_group,
      skill_count: occupation.skills.length,
    }));

    res.json({
      success: true,
      job_count: jobs.length,
      jobs,
    });

  } catch (error) {
    console.error("GET JOBS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load jobs",
    });
  }
});

// ==========================================
// SEARCH JOBS
// GET /api/jobs/search?q=software
// ==========================================

router.get("/search", (req, res) => {
  try {
    const query = String(req.query.q || "")
      .trim()
      .toLowerCase();

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const jobs = jobData.occupations
      .filter((occupation) =>
        occupation.occupation_label
          .toLowerCase()
          .includes(query)
      )
      .map((occupation) => ({
        occupation_id: occupation.occupation_id,
        occupation_label: occupation.occupation_label,
        description: occupation.description,
        isco_group: occupation.isco_group,
        skill_count: occupation.skills.length,
      }));

    res.json({
      success: true,
      query,
      job_count: jobs.length,
      jobs,
    });

  } catch (error) {
    console.error("SEARCH JOBS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to search jobs",
    });
  }
});

// ==========================================
// GET ONE JOB + REQUIRED SKILLS
// GET /api/jobs/:occupationId
// ==========================================

router.get("/:occupationId", (req, res) => {
  try {
    const occupationId = req.params.occupationId;

    const occupation = jobData.occupations.find(
      (job) => job.occupation_id === occupationId
    );

    if (!occupation) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    res.json({
      success: true,
      job: occupation,
    });

  } catch (error) {
    console.error("GET JOB ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load job",
    });
  }
});

export default router;