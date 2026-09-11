import { Router } from "express";
import db from "../database/db";

const router = Router();

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

function parseSkills(value: any): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((s) => String(s).trim())
      .filter(Boolean);
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed
        .map((s) => String(s).trim())
        .filter(Boolean);
    }
  } catch {
    // Continue with comma-separated parsing
  }

  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}


/* =========================================================
   NORMALIZE SKILL
========================================================= */

function normalizeSkill(skill: string): string {
  return String(skill)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9+#.\- ]/g, "")
    .replace(/\s+/g, " ");
}


/* =========================================================
   CALCULATE SKILL MATCH
========================================================= */

function calculateSkillMatch(
  studentSkills: string[],
  requiredSkills: string[]
) {
  if (requiredSkills.length === 0) {
    return {
      score: 0,
      matchedSkills: [],
      missingSkills: [],
    };
  }

  const normalizedStudentSkills = studentSkills.map(normalizeSkill);

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const required of requiredSkills) {
    const normalizedRequired = normalizeSkill(required);

    const matched = normalizedStudentSkills.some((studentSkill) => {
      if (studentSkill === normalizedRequired) {
        return true;
      }

      // Basic semantic-ish matching for names such as:
      // Java ↔ Java Programming
      // SQL ↔ SQL Database
      // Python ↔ Python Programming
      return (
        studentSkill.includes(normalizedRequired) ||
        normalizedRequired.includes(studentSkill)
      );
    });

    if (matched) {
      matchedSkills.push(required);
    } else {
      missingSkills.push(required);
    }
  }

  const score =
    requiredSkills.length > 0
      ? Math.round(
          (matchedSkills.length / requiredSkills.length) * 100
        )
      : 0;

  return {
    score,
    matchedSkills,
    missingSkills,
  };
}


/* =========================================================
   GET RECRUITER DASHBOARD
   GET /api/recruiter/dashboard
========================================================= */

router.get("/dashboard", (_req, res) => {
  try {
    const opportunityCount = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM opportunities
      `)
      .get() as { count: number };

    const applicationCount = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM applications
      `)
      .get() as { count: number };

    const shortlistedCount = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM applications
        WHERE status = 'Shortlisted'
      `)
      .get() as { count: number };

    const selectedCount = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM applications
        WHERE status = 'Selected'
      `)
      .get() as { count: number };

    const interviewCount = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM applications
        WHERE status = 'Interview'
      `)
      .get() as { count: number };

    const rejectedCount = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM applications
        WHERE status = 'Rejected'
      `)
      .get() as { count: number };

    const reviewCount = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM applications
        WHERE status = 'Under Review'
      `)
      .get() as { count: number };


    /* -------------------------------------------------------
       RECENT OPPORTUNITIES
    ------------------------------------------------------- */

    const recentOpportunities = db
      .prepare(`
        SELECT
          o.id,
          o.recruiter_name,
          o.company_name,
          o.title,
          o.type,
          o.location,
          o.salary,
          o.eligibility,
          o.required_skills,
          o.deadline,
          o.created_at,

          (
            SELECT COUNT(*)
            FROM applications a
            WHERE a.opportunity_id = o.id
          ) AS applicant_count

        FROM opportunities o
        ORDER BY o.id DESC
        LIMIT 10
      `)
      .all() as any[];


    const formattedOpportunities = recentOpportunities.map(
      (opportunity) => ({
        ...opportunity,
        required_skills: parseSkills(
          opportunity.required_skills
        ),
        applicant_count: Number(
          opportunity.applicant_count || 0
        ),
      })
    );


    /* -------------------------------------------------------
       RECENT APPLICATIONS
    ------------------------------------------------------- */

    const recentApplications = db
      .prepare(`
        SELECT
          a.id AS application_id,
          a.status,
          a.applied_at,

          o.id AS opportunity_id,
          o.title,
          o.company_name,

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

        LIMIT 10
      `)
      .all() as any[];


    res.json({
      success: true,

      statistics: {
        opportunities: Number(
          opportunityCount.count || 0
        ),

        applications: Number(
          applicationCount.count || 0
        ),

        shortlisted: Number(
          shortlistedCount.count || 0
        ),

        selected: Number(
          selectedCount.count || 0
        ),

        interviews: Number(
          interviewCount.count || 0
        ),

        underReview: Number(
          reviewCount.count || 0
        ),

        rejected: Number(
          rejectedCount.count || 0
        ),
      },

      recentOpportunities:
        formattedOpportunities,

      recentApplications,
    });

  } catch (error) {
    console.error(
      "RECRUITER DASHBOARD ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to load recruiter dashboard",
    });
  }
});


/* =========================================================
   GET RECRUITER OPPORTUNITIES
   GET /api/recruiter/opportunities
========================================================= */

router.get("/opportunities", (_req, res) => {
  try {
    const opportunities = db
      .prepare(`
        SELECT
          o.*,

          (
            SELECT COUNT(*)
            FROM applications a
            WHERE a.opportunity_id = o.id
          ) AS applicant_count

        FROM opportunities o
        ORDER BY o.id DESC
      `)
      .all() as any[];

    const formatted = opportunities.map(
      (opportunity) => ({
        ...opportunity,

        required_skills: parseSkills(
          opportunity.required_skills
        ),

        applicant_count: Number(
          opportunity.applicant_count || 0
        ),
      })
    );

    res.json({
      success: true,
      opportunities: formatted,
    });

  } catch (error) {
    console.error(
      "RECRUITER OPPORTUNITIES ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to load recruiter opportunities",
    });
  }
});


/* =========================================================
   GET CANDIDATES FOR AN OPPORTUNITY

   GET
   /api/recruiter/opportunities/:id/candidates
========================================================= */

router.get(
  "/opportunities/:id/candidates",
  (req, res) => {
    try {
      const opportunityId =
        Number(req.params.id);

      if (!opportunityId) {
        return res.status(400).json({
          success: false,
          message: "Invalid opportunity ID",
        });
      }


      /* -----------------------------------------------------
         GET OPPORTUNITY
      ----------------------------------------------------- */

      const opportunity = db
        .prepare(`
          SELECT *
          FROM opportunities
          WHERE id = ?
        `)
        .get(opportunityId) as any;


      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: "Opportunity not found",
        });
      }


      const requiredSkills = parseSkills(
        opportunity.required_skills
      );


      /* -----------------------------------------------------
         GET APPLICANTS
      ----------------------------------------------------- */

      const applicants = db
        .prepare(`
          SELECT
            a.id AS application_id,
            a.status,
            a.applied_at,

            s.id AS student_id,
            s.name,
            s.email,
            s.phone,
            s.education,
            s.college,
            s.graduation_year

          FROM applications a

          JOIN students s
            ON a.student_id = s.id

          WHERE a.opportunity_id = ?

          ORDER BY a.id DESC
        `)
        .all(opportunityId) as any[];


      /* -----------------------------------------------------
         BUILD CANDIDATE PROFILES
      ----------------------------------------------------- */

      const candidates = applicants.map(
        (applicant) => {

          const skills = db
            .prepare(`
              SELECT
                s.id,
                s.esco_skill_id,
                s.skill_name,
                s.skill_type,
                ss.proficiency_level,
                ss.source,
                ss.confidence_score

              FROM student_skills ss

              JOIN skills s
                ON ss.skill_id = s.id

              WHERE ss.student_id = ?

              ORDER BY s.skill_name
            `)
            .all(applicant.student_id) as any[];


          const studentSkillNames =
            skills.map(
              (skill) => skill.skill_name
            );


          const skillMatch =
            calculateSkillMatch(
              studentSkillNames,
              requiredSkills
            );


          /* ---------------------------------------------------
             ASSESSMENT RESULTS
          --------------------------------------------------- */

          let assessmentScores = {
            technical: null as number | null,
            coding: null as number | null,
            interview: null as number | null,
            aptitude: null as number | null,
          };


          try {
            const results = db
              .prepare(`
                SELECT
                  assessment_type,
                  score

                FROM assessment_results

                WHERE student_id = ?

                ORDER BY created_at DESC
              `)
              .all(applicant.student_id) as any[];


            const seen = new Set<string>();

            for (const result of results) {

              if (
                seen.has(
                  result.assessment_type
                )
              ) {
                continue;
              }

              seen.add(
                result.assessment_type
              );

              if (
                result.assessment_type ===
                "technical_assessment"
              ) {
                assessmentScores.technical =
                  Number(result.score);
              }

              if (
                result.assessment_type ===
                "coding_assessment"
              ) {
                assessmentScores.coding =
                  Number(result.score);
              }

              if (
                result.assessment_type ===
                "adaptive_interview"
              ) {
                assessmentScores.interview =
                  Number(result.score);
              }

              if (
                result.assessment_type ===
                "aptitude_assessment"
              ) {
                assessmentScores.aptitude =
                  Number(result.score);
              }
            }

          } catch {
            // assessment_results may not exist yet
          }


          /* ---------------------------------------------------
             CALCULATE PERFORMANCE SCORE
          --------------------------------------------------- */

          const assessmentValues = [
            assessmentScores.technical,
            assessmentScores.coding,
            assessmentScores.interview,
            assessmentScores.aptitude,
          ].filter(
            (value): value is number =>
              value !== null &&
              !Number.isNaN(value)
          );


          const assessmentAverage =
            assessmentValues.length > 0
              ? Math.round(
                  assessmentValues.reduce(
                    (sum, value) =>
                      sum + value,
                    0
                  ) /
                    assessmentValues.length
                )
              : null;


          /* ---------------------------------------------------
             FINAL MATCH SCORE
             
             70% skill match
             30% assessment performance
             
             If assessments are unavailable,
             use skill match only.
          --------------------------------------------------- */

          let matchScore =
            skillMatch.score;


          if (assessmentAverage !== null) {
            matchScore = Math.round(
              skillMatch.score * 0.7 +
              assessmentAverage * 0.3
            );
          }


          /* ---------------------------------------------------
             RECRUITER EXPLANATION
          --------------------------------------------------- */

          let recommendation =
            "Needs improvement";

          if (matchScore >= 80) {
            recommendation =
              "Strong candidate";
          } else if (matchScore >= 65) {
            recommendation =
              "Good potential";
          } else if (matchScore >= 50) {
            recommendation =
              "Moderate match";
          }


          return {
            application_id:
              applicant.application_id,

            student_id:
              applicant.student_id,

            name:
              applicant.name,

            email:
              applicant.email,

            phone:
              applicant.phone,

            education:
              applicant.education,

            college:
              applicant.college,

            graduation_year:
              applicant.graduation_year,

            status:
              applicant.status,

            applied_at:
              applicant.applied_at,

            match_score:
              matchScore,

            skill_match_score:
              skillMatch.score,

            assessment_score:
              assessmentAverage,

            matched_skills:
              skillMatch.matchedSkills,

            missing_skills:
              skillMatch.missingSkills,

            skills,

            assessment_scores:
              assessmentScores,

            recommendation,
          };
        }
      );


      /* -----------------------------------------------------
         SORT BEST MATCH FIRST
      ----------------------------------------------------- */

      candidates.sort(
        (a, b) =>
          b.match_score -
          a.match_score
      );


      res.json({
        success: true,

        opportunity: {
          id: opportunity.id,
          company_name:
            opportunity.company_name,
          title:
            opportunity.title,
          type:
            opportunity.type,
          required_skills:
            requiredSkills,
        },

        candidates,
      });

    } catch (error) {
      console.error(
        "RECRUITER CANDIDATES ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to load candidates",
      });
    }
  }
);


/* =========================================================
   GET STUDENT PROFILE FOR RECRUITER

   GET
   /api/recruiter/students/:studentId
========================================================= */

router.get(
  "/students/:studentId",
  (req, res) => {
    try {
      const studentId =
        Number(req.params.studentId);


      const student = db
        .prepare(`
          SELECT
            id,
            name,
            email,
            phone,
            education,
            college,
            graduation_year,
            created_at

          FROM students

          WHERE id = ?
        `)
        .get(studentId) as any;


      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }


      const skills = db
        .prepare(`
          SELECT
            s.id,
            s.esco_skill_id,
            s.skill_name,
            s.skill_type,
            s.description,

            ss.proficiency_level,
            ss.source,
            ss.confidence_score

          FROM student_skills ss

          JOIN skills s
            ON ss.skill_id = s.id

          WHERE ss.student_id = ?

          ORDER BY s.skill_name
        `)
        .all(studentId) as any[];


      /* -----------------------------------------------------
         ASSESSMENTS
      ----------------------------------------------------- */

      let assessments: any[] = [];

      try {
        assessments = db
          .prepare(`
            SELECT
              assessment_type,
              score,
              details,
              created_at

            FROM assessment_results

            WHERE student_id = ?

            ORDER BY created_at DESC
          `)
          .all(studentId) as any[];
      } catch {
        assessments = [];
      }


      res.json({
        success: true,

        student,

        skills,

        assessments,
      });

    } catch (error) {
      console.error(
        "RECRUITER STUDENT PROFILE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to load student profile",
      });
    }
  }
);


/* =========================================================
   UPDATE APPLICATION STATUS
   PATCH /api/recruiter/applications/:id/status
========================================================= */

router.patch(
  "/applications/:id/status",
  (req, res) => {
    try {
      const applicationId = Number(req.params.id);
      const { status } = req.body;

      if (!Number.isInteger(applicationId) || applicationId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid application ID",
        });
      }

      const allowedStatuses = [
        "Applied",
        "Under Review",
        "Shortlisted",
        "Assessment",
        "Interview",
        "Selected",
        "Rejected",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid application status",
          allowedStatuses,
        });
      }

      const application = db
        .prepare(`
          SELECT id, student_id, opportunity_id
          FROM applications
          WHERE id = ?
        `)
        .get(applicationId) as any;

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found",
        });
      }

      db.prepare(`
        UPDATE applications
        SET status = ?
        WHERE id = ?
      `).run(status, applicationId);

      res.json({
        success: true,
        message: `Application status updated to ${status}`,
        applicationId,
        studentId: application.student_id,
        opportunityId: application.opportunity_id,
        status,
      });
    } catch (error) {
      console.error("UPDATE APPLICATION STATUS ERROR:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update application status",
      });
    }
  }
);


/* =========================================================
   SHORTLIST CANDIDATE
   POST /api/recruiter/applications/:id/shortlist
========================================================= */

router.post(
  "/applications/:id/shortlist",
  (req, res) => {
    try {
      const applicationId = Number(req.params.id);

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

      db.prepare(`
        UPDATE applications
        SET status = 'Shortlisted'
        WHERE id = ?
      `).run(applicationId);

      res.json({
        success: true,
        message: "Candidate shortlisted successfully",
        applicationId,
        status: "Shortlisted",
      });
    } catch (error) {
      console.error("SHORTLIST ERROR:", error);

      res.status(500).json({
        success: false,
        message: "Unable to shortlist candidate",
      });
    }
  }
);


/* =========================================================
   REJECT CANDIDATE
   POST /api/recruiter/applications/:id/reject
========================================================= */

router.post(
  "/applications/:id/reject",
  (req, res) => {
    try {
      const applicationId = Number(req.params.id);

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

      db.prepare(`
        UPDATE applications
        SET status = 'Rejected'
        WHERE id = ?
      `).run(applicationId);

      res.json({
        success: true,
        message: "Candidate rejected successfully",
        applicationId,
        status: "Rejected",
      });
    } catch (error) {
      console.error("REJECT CANDIDATE ERROR:", error);

      res.status(500).json({
        success: false,
        message: "Unable to reject candidate",
      });
    }
  }
);


/* =========================================================
   GET ALL APPLICATIONS FOR AN OPPORTUNITY
   GET /api/recruiter/opportunities/:id/applications
========================================================= */

router.get(
  "/opportunities/:id/applications",
  (req, res) => {
    try {
      const opportunityId = Number(req.params.id);

      const opportunity = db
        .prepare(`
          SELECT id, company_name, title, type, required_skills
          FROM opportunities
          WHERE id = ?
        `)
        .get(opportunityId) as any;

      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: "Opportunity not found",
        });
      }

      const applications = db
        .prepare(`
          SELECT
            a.id AS application_id,
            a.student_id,
            a.opportunity_id,
            a.status,
            a.applied_at,

            s.name AS student_name,
            s.email AS student_email,
            s.phone,
            s.education,
            s.college,
            s.graduation_year

          FROM applications a
          JOIN students s
            ON a.student_id = s.id

          WHERE a.opportunity_id = ?

          ORDER BY a.id DESC
        `)
        .all(opportunityId) as any[];

      const requiredSkills = parseSkills(
        opportunity.required_skills
      );

      const enrichedApplications = applications.map(
        (application) => {
          const skills = db
            .prepare(`
              SELECT
                s.skill_name,
                ss.proficiency_level,
                ss.source,
                ss.confidence_score
              FROM student_skills ss
              JOIN skills s
                ON ss.skill_id = s.id
              WHERE ss.student_id = ?
              ORDER BY s.skill_name
            `)
            .all(application.student_id) as any[];

          const studentSkillNames = skills.map(
            (skill) => skill.skill_name
          );

          const skillMatch = calculateSkillMatch(
            studentSkillNames,
            requiredSkills
          );

          return {
            ...application,
            match_score: skillMatch.score,
            skill_match_score: skillMatch.score,
            matched_skills: skillMatch.matchedSkills,
            missing_skills: skillMatch.missingSkills,
            skills,
          };
        }
      );

      enrichedApplications.sort(
        (a, b) => b.match_score - a.match_score
      );

      res.json({
        success: true,

        opportunity: {
          id: opportunity.id,
          company_name: opportunity.company_name,
          title: opportunity.title,
          type: opportunity.type,
          required_skills: requiredSkills,
        },

        applications: enrichedApplications,
      });
    } catch (error) {
      console.error(
        "RECRUITER OPPORTUNITY APPLICATIONS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Unable to load opportunity applications",
      });
    }
  }
);


/* =========================================================
   AI-STYLE CANDIDATE RANKING
   GET /api/recruiter/opportunities/:id/ranking

   Ranking uses:
   - 70% skill compatibility
   - 30% latest assessment performance

   This reuses the same assessment results already used
   by the candidate-matching endpoint.
========================================================= */

router.get(
  "/opportunities/:id/ranking",
  (req, res) => {
    try {
      const opportunityId = Number(req.params.id);

      const opportunity = db
        .prepare(`
          SELECT *
          FROM opportunities
          WHERE id = ?
        `)
        .get(opportunityId) as any;

      if (!opportunity) {
        return res.status(404).json({
          success: false,
          message: "Opportunity not found",
        });
      }

      const requiredSkills = parseSkills(
        opportunity.required_skills
      );

      const applicants = db
        .prepare(`
          SELECT
            a.id AS application_id,
            a.student_id,
            a.status,
            a.applied_at,
            s.name,
            s.email,
            s.college,
            s.education
          FROM applications a
          JOIN students s
            ON a.student_id = s.id
          WHERE a.opportunity_id = ?
        `)
        .all(opportunityId) as any[];

      const ranked = applicants.map((applicant) => {
        const skills = db
          .prepare(`
            SELECT
              s.skill_name,
              ss.proficiency_level,
              ss.source,
              ss.confidence_score
            FROM student_skills ss
            JOIN skills s
              ON ss.skill_id = s.id
            WHERE ss.student_id = ?
          `)
          .all(applicant.student_id) as any[];

        const skillMatch = calculateSkillMatch(
          skills.map((s) => s.skill_name),
          requiredSkills
        );

        let assessmentAverage: number | null = null;

        try {
          const assessmentRows = db
            .prepare(`
              SELECT assessment_type, score
              FROM assessment_results
              WHERE student_id = ?
              ORDER BY created_at DESC
            `)
            .all(applicant.student_id) as any[];

          const latestByType = new Map<string, number>();

          for (const row of assessmentRows) {
            if (!latestByType.has(row.assessment_type)) {
              const score = Number(row.score);
              if (!Number.isNaN(score)) {
                latestByType.set(
                  row.assessment_type,
                  score
                );
              }
            }
          }

          const values = Array.from(
            latestByType.values()
          );

          if (values.length > 0) {
            assessmentAverage = Math.round(
              values.reduce((sum, value) => sum + value, 0) /
                values.length
            );
          }
        } catch {
          assessmentAverage = null;
        }

        let finalScore = skillMatch.score;

        if (assessmentAverage !== null) {
          finalScore = Math.round(
            skillMatch.score * 0.7 +
              assessmentAverage * 0.3
          );
        }

        let recommendation = "Needs improvement";

        if (finalScore >= 85) {
          recommendation = "Excellent candidate";
        } else if (finalScore >= 75) {
          recommendation = "Strong candidate";
        } else if (finalScore >= 65) {
          recommendation = "Good potential";
        } else if (finalScore >= 50) {
          recommendation = "Moderate match";
        }

        return {
          application_id: applicant.application_id,
          student_id: applicant.student_id,
          name: applicant.name,
          email: applicant.email,
          college: applicant.college,
          education: applicant.education,
          status: applicant.status,
          applied_at: applicant.applied_at,

          overall_score: finalScore,
          skill_match_score: skillMatch.score,
          assessment_score: assessmentAverage,

          matched_skills: skillMatch.matchedSkills,
          missing_skills: skillMatch.missingSkills,

          recommendation,
        };
      });

      ranked.sort(
        (a, b) => b.overall_score - a.overall_score
      );

      res.json({
        success: true,

        opportunity: {
          id: opportunity.id,
          company_name: opportunity.company_name,
          title: opportunity.title,
          required_skills: requiredSkills,
        },

        ranking_method: {
          skill_match_weight: 70,
          assessment_weight: 30,
        },

        candidates: ranked,
      });
    } catch (error) {
      console.error(
        "AI CANDIDATE RANKING ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Unable to generate candidate ranking",
      });
    }
  }
);


/* =========================================================
   ADD INDUSTRY FEEDBACK WITH DETAILED SCORES
   POST /api/recruiter/feedback/detailed
========================================================= */

router.post("/feedback/detailed", (req, res) => {
  try {
    const {
      applicationId,
      technicalScore,
      communicationScore,
      problemSolvingScore,
      strengths,
      improvementAreas,
      feedback,
    } = req.body;

    const id = Number(applicationId);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Application ID is required",
      });
    }

    const application = db
      .prepare(`
        SELECT id, student_id
        FROM applications
        WHERE id = ?
      `)
      .get(id) as any;

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const result = db
      .prepare(`
        INSERT INTO industry_feedback (
          application_id,
          student_id,
          recruiter_id,
          technical_score,
          communication_score,
          problem_solving_score,
          strengths,
          improvement_areas,
          feedback
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        id,
        application.student_id,
        null,
        technicalScore === null || technicalScore === undefined || technicalScore === ""
          ? null
          : Number(technicalScore),
        communicationScore === null || communicationScore === undefined || communicationScore === ""
          ? null
          : Number(communicationScore),
        problemSolvingScore === null || problemSolvingScore === undefined || problemSolvingScore === ""
          ? null
          : Number(problemSolvingScore),
        String(strengths || "").trim(),
        String(improvementAreas || "").trim(),
        String(feedback || "").trim()
      );

    res.json({
      success: true,
      message: "Detailed industry feedback saved successfully",
      feedbackId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("DETAILED INDUSTRY FEEDBACK ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to save detailed industry feedback",
    });
  }
});


/* =========================================================
   STUDENT FEEDBACK SUMMARY
   GET /api/recruiter/students/:studentId/feedback
========================================================= */

router.get(
  "/students/:studentId/feedback",
  (req, res) => {
    try {
      const studentId = Number(req.params.studentId);

      const feedback = db
        .prepare(`
          SELECT
            f.id,
            f.application_id,
            f.feedback,
            f.technical_score,
            f.communication_score,
            f.problem_solving_score,
            f.strengths,
            f.improvement_areas,
            f.created_at,

            o.title AS opportunity_title,
            o.company_name

          FROM industry_feedback f

          JOIN applications a
            ON f.application_id = a.id

          JOIN opportunities o
            ON a.opportunity_id = o.id

          WHERE a.student_id = ?

          ORDER BY f.id DESC
        `)
        .all(studentId);

      res.json({
        success: true,
        feedback,
      });
    } catch (error) {
      console.error(
        "STUDENT FEEDBACK SUMMARY ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message: "Unable to load student feedback",
      });
    }
  }
);


/* =========================================================
   GET APPLICATION DETAILS
   GET /api/recruiter/applications/:id
========================================================= */

router.get(
  "/applications/:id",
  (req, res) => {
    try {
      const applicationId =
        Number(req.params.id);


      const application = db
        .prepare(`
          SELECT

            a.id AS application_id,
            a.status,
            a.applied_at,

            o.id AS opportunity_id,
            o.company_name,
            o.title,
            o.type,
            o.description,
            o.location,
            o.salary,
            o.eligibility,
            o.required_skills,
            o.deadline,

            s.id AS student_id,
            s.name AS student_name,
            s.email AS student_email,
            s.phone,
            s.education,
            s.college,
            s.graduation_year

          FROM applications a

          JOIN opportunities o
            ON a.opportunity_id = o.id

          JOIN students s
            ON a.student_id = s.id

          WHERE a.id = ?
        `)
        .get(applicationId) as any;


      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found",
        });
      }


      const skills = db
        .prepare(`
          SELECT
            s.id,
            s.esco_skill_id,
            s.skill_name,
            s.skill_type,
            ss.proficiency_level,
            ss.source,
            ss.confidence_score

          FROM student_skills ss

          JOIN skills s
            ON ss.skill_id = s.id

          WHERE ss.student_id = ?

          ORDER BY s.skill_name
        `)
        .all(application.student_id);


      let feedback: any[] = [];

      try {
        feedback = db
          .prepare(`
            SELECT
              id,
              feedback,
              technical_score,
              communication_score,
              problem_solving_score,
              strengths,
              improvement_areas,
              created_at

            FROM industry_feedback

            WHERE application_id = ?

            ORDER BY id DESC
          `)
          .all(applicationId) as any[];
      } catch {
        feedback = [];
      }


      res.json({
        success: true,

        application: {
          ...application,

          required_skills:
            parseSkills(
              application.required_skills
            ),

          skills,

          feedback,
        },
      });

    } catch (error) {
      console.error(
        "APPLICATION DETAILS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to load application details",
      });
    }
  }
);


/* =========================================================
   ADD INDUSTRY FEEDBACK
   POST /api/recruiter/feedback
========================================================= */

router.post("/feedback", (req, res) => {
  try {
    const { applicationId, feedback } = req.body;
    const id = Number(applicationId);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Application ID is required",
      });
    }

    const application = db
      .prepare(`
        SELECT id, student_id
        FROM applications
        WHERE id = ?
      `)
      .get(id) as any;

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const result = db
      .prepare(`
        INSERT INTO industry_feedback (
          application_id,
          student_id,
          recruiter_id,
          feedback
        )
        VALUES (?, ?, ?, ?)
      `)
      .run(
        id,
        application.student_id,
        null,
        String(feedback || "").trim()
      );

    res.json({
      success: true,
      message: "Industry feedback saved successfully",
      feedbackId: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("INDUSTRY FEEDBACK ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to save industry feedback",
    });
  }
});


/* =========================================================
   GET INDUSTRY FEEDBACK
   GET /api/recruiter/feedback/:applicationId
========================================================= */

router.get("/feedback/:applicationId", (req, res) => {
  try {
    const applicationId = Number(req.params.applicationId);

    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID",
      });
    }

    const feedback = db
      .prepare(`
        SELECT
          id,
          application_id,
          student_id,
          technical_score,
          communication_score,
          problem_solving_score,
          strengths,
          improvement_areas,
          feedback,
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
    console.error("GET FEEDBACK ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load feedback",
    });
  }
});


/* =========================================================
   GET OVERALL RECRUITMENT STATISTICS
   GET /api/recruiter/statistics
========================================================= */

router.get("/statistics", (_req, res) => {
  try {

    const statuses = db
      .prepare(`
        SELECT
          status,
          COUNT(*) AS count

        FROM applications

        GROUP BY status
      `)
      .all() as any[];


    const statusCounts: Record<
      string,
      number
    > = {};

    statuses.forEach((row) => {
      statusCounts[row.status] =
        Number(row.count || 0);
    });


    const totalStudents = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM students
      `)
      .get() as { count: number };


    const totalSkills = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM student_skills
      `)
      .get() as { count: number };


    res.json({
      success: true,

      statistics: {
        totalStudents:
          Number(totalStudents.count || 0),

        totalStudentSkills:
          Number(totalSkills.count || 0),

        totalOpportunities:
          Number(
            (
              db
                .prepare(`
                  SELECT COUNT(*) AS count
                  FROM opportunities
                `)
                .get() as {
                count: number;
              }
            ).count || 0
          ),

        totalApplications:
          Number(
            (
              db
                .prepare(`
                  SELECT COUNT(*) AS count
                  FROM applications
                `)
                .get() as {
                count: number;
              }
            ).count || 0
          ),

        applied:
          statusCounts["Applied"] || 0,

        underReview:
          statusCounts["Under Review"] || 0,

        shortlisted:
          statusCounts["Shortlisted"] || 0,

        interview:
          statusCounts["Interview"] || 0,

        selected:
          statusCounts["Selected"] || 0,

        rejected:
          statusCounts["Rejected"] || 0,
      },
    });

  } catch (error) {
    console.error(
      "RECRUITER STATISTICS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to load recruitment statistics",
    });
  }
});


export default router;