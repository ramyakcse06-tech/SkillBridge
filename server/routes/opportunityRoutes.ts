import { Router } from "express";
import db from "../database/db";

const router = Router();

/* =========================================================
   DATABASE TABLES
========================================================= */

db.exec(`
  CREATE TABLE IF NOT EXISTS opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recruiter_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    location TEXT,
    salary TEXT,
    eligibility TEXT,
    required_skills TEXT,
    deadline TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    status TEXT DEFAULT 'Applied',
    applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(opportunity_id, student_id)
  );

  CREATE TABLE IF NOT EXISTS industry_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    feedback TEXT,
    rating REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

/* =========================================================
   HELPER
========================================================= */

function parseSkills(value: string | null): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
  }
}

/* =========================================================
   GET ALL OPPORTUNITIES

   GET /api/opportunities
========================================================= */

router.get("/", (_req, res) => {
  try {
    const rows = db
      .prepare(`
        SELECT *
        FROM opportunities
        ORDER BY id DESC
      `)
      .all() as any[];

    const opportunities = rows.map((row) => ({
      ...row,
      required_skills: parseSkills(row.required_skills),
    }));

    res.json({
      success: true,
      opportunities,
    });
  } catch (error) {
    console.error("GET OPPORTUNITIES ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load opportunities",
    });
  }
});

/* =========================================================
   GET ONE OPPORTUNITY

   GET /api/opportunities/:id
========================================================= */

router.get("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    const opportunity = db
      .prepare(`
        SELECT *
        FROM opportunities
        WHERE id = ?
      `)
      .get(id) as any;

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: "Opportunity not found",
      });
    }

    opportunity.required_skills =
      parseSkills(opportunity.required_skills);

    res.json({
      success: true,
      opportunity,
    });
  } catch (error) {
    console.error("GET OPPORTUNITY ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load opportunity",
    });
  }
});

/* =========================================================
   CREATE OPPORTUNITY

   POST /api/opportunities

   Recruiter name is automatically handled.
   Frontend DOES NOT need to provide recruiterName.
========================================================= */

router.post("/", (req, res) => {
  try {
    const {
      recruiterName,
      companyName,
      title,
      type,
      description,
      location,
      salary,
      eligibility,
      requiredSkills,
      deadline,
    } = req.body;

    /* ---------------------------------------------
       AUTOMATIC DEMO RECRUITER
    --------------------------------------------- */

    const finalRecruiterName =
      typeof recruiterName === "string" &&
      recruiterName.trim().length > 0
        ? recruiterName.trim()
        : "Demo Recruiter";

    /* ---------------------------------------------
       REQUIRED FRONTEND FIELDS
    --------------------------------------------- */

    if (
      !companyName ||
      !String(companyName).trim() ||
      !title ||
      !String(title).trim() ||
      !type ||
      !String(type).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Company name, opportunity title and type are required",
      });
    }

    /* ---------------------------------------------
       REQUIRED SKILLS
    --------------------------------------------- */

    const skills = Array.isArray(requiredSkills)
      ? requiredSkills
          .map((skill: any) => String(skill).trim())
          .filter(Boolean)
      : [];

    /* ---------------------------------------------
       INSERT OPPORTUNITY
    --------------------------------------------- */

    const result = db
      .prepare(`
        INSERT INTO opportunities (
          recruiter_name,
          company_name,
          title,
          type,
          description,
          location,
          salary,
          eligibility,
          required_skills,
          deadline
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        finalRecruiterName,
        String(companyName).trim(),
        String(title).trim(),
        String(type).trim(),
        description ? String(description).trim() : "",
        location ? String(location).trim() : "",
        salary ? String(salary).trim() : "",
        eligibility ? String(eligibility).trim() : "",
        JSON.stringify(skills),
        deadline ? String(deadline).trim() : ""
      );

    console.log(
      `Opportunity created successfully. ID: ${result.lastInsertRowid}`
    );

    res.json({
      success: true,
      message: "Opportunity created successfully",
      opportunityId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("CREATE OPPORTUNITY ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create opportunity",
    });
  }
});

/* =========================================================
   DELETE OPPORTUNITY

   DELETE /api/opportunities/:id
========================================================= */

router.delete("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    const result = db
      .prepare(`
        DELETE FROM opportunities
        WHERE id = ?
      `)
      .run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Opportunity not found",
      });
    }

    res.json({
      success: true,
      message: "Opportunity deleted",
    });
  } catch (error) {
    console.error("DELETE OPPORTUNITY ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete opportunity",
    });
  }
});

/* =========================================================
   APPLY FOR OPPORTUNITY

   POST /api/opportunities/:id/apply
========================================================= */

router.post("/:id/apply", (req, res) => {
  try {
    const opportunityId = Number(req.params.id);
    const studentId = Number(req.body.studentId);

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    /* ---------------------------------------------
       CHECK OPPORTUNITY
    --------------------------------------------- */

    const opportunity = db
      .prepare(`
        SELECT id
        FROM opportunities
        WHERE id = ?
      `)
      .get(opportunityId);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: "Opportunity not found",
      });
    }

    /* ---------------------------------------------
       PREVENT DUPLICATE APPLICATION
    --------------------------------------------- */

    const existing = db
      .prepare(`
        SELECT id
        FROM applications
        WHERE opportunity_id = ?
          AND student_id = ?
      `)
      .get(opportunityId, studentId);

    if (existing) {
      return res.status(400).json({
        success: false,
        message:
          "You have already applied for this opportunity",
      });
    }

    /* ---------------------------------------------
       INSERT APPLICATION
    --------------------------------------------- */

    const result = db
      .prepare(`
        INSERT INTO applications (
          opportunity_id,
          student_id,
          status
        )
        VALUES (?, ?, 'Applied')
      `)
      .run(opportunityId, studentId);

    res.json({
      success: true,
      message: "Application submitted successfully",
      applicationId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("APPLICATION ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to submit application",
    });
  }
});

/* =========================================================
   GET STUDENT APPLICATIONS

   GET /api/opportunities/student/:studentId/applications
========================================================= */

router.get(
  "/student/:studentId/applications",
  (req, res) => {
    try {
      const studentId = Number(req.params.studentId);

      const applications = db
        .prepare(`
          SELECT
            a.id,
            a.status,
            a.applied_at,
            o.id AS opportunity_id,
            o.company_name,
            o.title,
            o.type,
            o.location,
            o.deadline
          FROM applications a
          JOIN opportunities o
            ON a.opportunity_id = o.id
          WHERE a.student_id = ?
          ORDER BY a.id DESC
        `)
        .all(studentId);

      res.json({
        success: true,
        applications,
      });
    } catch (error) {
      console.error(
        "STUDENT APPLICATIONS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Unable to load applications",
      });
    }
  }
);

/* =========================================================
   GET OPPORTUNITY APPLICANTS

   GET /api/opportunities/:id/applicants
========================================================= */

router.get("/:id/applicants", (req, res) => {
  try {
    const opportunityId = Number(req.params.id);

    const applicants = db
      .prepare(`
        SELECT
          a.id AS application_id,
          a.status,
          a.applied_at,

          s.id AS student_id,
          s.name,
          s.email,
          s.education,
          s.college

        FROM applications a

        JOIN students s
          ON a.student_id = s.id

        WHERE a.opportunity_id = ?

        ORDER BY a.id DESC
      `)
      .all(opportunityId);

    res.json({
      success: true,
      applicants,
    });
  } catch (error) {
    console.error("APPLICANTS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load applicants",
    });
  }
});

/* =========================================================
   UPDATE APPLICATION STATUS

   PUT /api/opportunities/applications/:applicationId/status
========================================================= */

router.put(
  "/applications/:applicationId/status",
  (req, res) => {
    try {
      const applicationId =
        Number(req.params.applicationId);

      const { status } = req.body;

      const allowedStatuses = [
        "Applied",
        "Under Review",
        "Shortlisted",
        "Interview",
        "Selected",
        "Rejected",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid application status",
        });
      }

      const result = db
        .prepare(`
          UPDATE applications
          SET status = ?
          WHERE id = ?
        `)
        .run(status, applicationId);

      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          message: "Application not found",
        });
      }

      res.json({
        success: true,
        message:
          `Application status updated to ${status}`,
      });
    } catch (error) {
      console.error(
        "UPDATE APPLICATION STATUS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to update application status",
      });
    }
  }
);

/* =========================================================
   GET ALL APPLICATIONS

   GET /api/opportunities/applications/all
========================================================= */

router.get(
  "/applications/all",
  (_req, res) => {
    try {
      const applications = db
        .prepare(`
          SELECT
            a.id AS application_id,
            a.status,
            a.applied_at,

            o.id AS opportunity_id,
            o.company_name,
            o.title,
            o.type,

            s.id AS student_id,
            s.name AS student_name,
            s.email AS student_email,
            s.education,
            s.college

          FROM applications a

          JOIN opportunities o
            ON a.opportunity_id = o.id

          JOIN students s
            ON a.student_id = s.id

          ORDER BY a.id DESC
        `)
        .all();

      res.json({
        success: true,
        applications,
      });
    } catch (error) {
      console.error(
        "GET ALL APPLICATIONS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Unable to load applications",
      });
    }
  }
);

/* =========================================================
   ADD INDUSTRY FEEDBACK

   POST /api/opportunities/applications/:applicationId/feedback
========================================================= */

router.post(
  "/applications/:applicationId/feedback",
  (req, res) => {
    try {
      const applicationId =
        Number(req.params.applicationId);

      const {
        feedback,
        rating,
      } = req.body;

      /* ---------------------------------------------
         CHECK APPLICATION
      --------------------------------------------- */

      const application = db
        .prepare(`
          SELECT id
          FROM applications
          WHERE id = ?
        `)
        .get(applicationId);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found",
        });
      }

      /* ---------------------------------------------
         INSERT FEEDBACK
      --------------------------------------------- */

      const result = db
        .prepare(`
          INSERT INTO industry_feedback (
            application_id,
            feedback,
            rating
          )
          VALUES (?, ?, ?)
        `)
        .run(
          applicationId,
          feedback ? String(feedback).trim() : "",
          rating !== undefined &&
          rating !== null &&
          rating !== ""
            ? Number(rating)
            : null
        );

      res.json({
        success: true,
        message: "Industry feedback saved successfully",
        feedbackId: result.lastInsertRowid,
      });
    } catch (error) {
      console.error(
        "INDUSTRY FEEDBACK ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to save industry feedback",
      });
    }
  }
);

/* =========================================================
   GET INDUSTRY FEEDBACK

   GET /api/opportunities/applications/:applicationId/feedback
========================================================= */

router.get(
  "/applications/:applicationId/feedback",
  (req, res) => {
    try {
      const applicationId =
        Number(req.params.applicationId);

      const feedback = db
        .prepare(`
          SELECT
            id,
            application_id,
            feedback,
            rating,
            created_at
          FROM industry_feedback
          WHERE application_id = ?
          ORDER BY id DESC
        `)
        .all(applicationId);

      res.json({
        success: true,
        feedback,
      });
    } catch (error) {
      console.error(
        "GET INDUSTRY FEEDBACK ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to load industry feedback",
      });
    }
  }
);

export default router;