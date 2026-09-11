import { Router } from "express";
import fs from "fs";
import path from "path";
import db from "../database/db";

const router = Router();

/* =========================================================
   LOAD JOB REQUIREMENTS
========================================================= */

const jobRequirementsPath = path.join(
  process.cwd(),
  "data",
  "job_requirements.json"
);

const jobRequirements = JSON.parse(
  fs.readFileSync(jobRequirementsPath, "utf-8")
);

/* =========================================================
   TYPES
========================================================= */

interface RequiredSkill {
  skill_id: string;
  skill: string;
  relation_type: string;
  skill_type: string;
}

interface StudentSkill {
  skill_id: string;
  preferred_label?: string;
}

interface SavedAssessment {
  assessment_type: string;
  score: number;
}

/* =========================================================
   FIND OCCUPATION
========================================================= */

function getOccupation(
  occupationId: string
) {
  return jobRequirements.occupations.find(
    (occupation: any) =>
      occupation.occupation_id === occupationId
  );
}

/* =========================================================
   GET STUDENT SKILLS
========================================================= */

function getStudentSkills(
  studentId: number
): StudentSkill[] {

  try {

    const rows = db
      .prepare(
        `
        SELECT
          s.esco_skill_id AS skill_id,
          s.name AS preferred_label
        FROM student_skills ss
        JOIN skills s
          ON ss.skill_id = s.id
        WHERE ss.student_id = ?
        `
      )
      .all(studentId) as StudentSkill[];

    return rows || [];

  } catch (error) {

    console.error(
      "Student skill query error:",
      error
    );

    return [];
  }
}

/* =========================================================
   NORMALIZE
========================================================= */

function normalize(
  value: string
): string {

  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/* =========================================================
   MATCH SKILLS
========================================================= */

function calculateSkillCoverage(
  requiredSkills: RequiredSkill[],
  studentSkills: StudentSkill[]
) {

  const studentIds =
    new Set(
      studentSkills
        .map(
          (skill) =>
            skill.skill_id
        )
        .filter(Boolean)
    );

  const studentNames =
    new Set(
      studentSkills
        .map(
          (skill) =>
            normalize(
              skill.preferred_label || ""
            )
        )
        .filter(Boolean)
    );

  const matched: RequiredSkill[] = [];
  const missing: RequiredSkill[] = [];

  for (
    const skill of requiredSkills
  ) {

    const idMatch =
      studentIds.has(
        skill.skill_id
      );

    const nameMatch =
      studentNames.has(
        normalize(skill.skill)
      );

    if (
      idMatch ||
      nameMatch
    ) {

      matched.push(skill);

    } else {

      missing.push(skill);
    }
  }

  const total =
    requiredSkills.length;

  const matchedCount =
    matched.length;

  const coverage =
    total === 0
      ? 0
      : (matchedCount / total) * 100;

  return {
    matched,
    missing,
    matchedCount,
    total,
    coverage,
  };
}

/* =========================================================
   READINESS BAND
========================================================= */

function getReadinessBand(
  score: number
): string {

  if (score >= 80) {
    return "Placement Ready";
  }

  if (score >= 65) {
    return "Nearly Ready";
  }

  if (score >= 50) {
    return "Developing";
  }

  return "Needs Improvement";
}

/* =========================================================
   CONFIDENCE
========================================================= */

function getConfidence(
  assessmentCount: number
): string {

  if (
    assessmentCount >= 3
  ) {
    return "High";
  }

  if (
    assessmentCount >= 1
  ) {
    return "Medium";
  }

  return "Low";
}

/* =========================================================
   GET SAVED ASSESSMENT RESULTS
========================================================= */

function getAssessmentScores(
  studentId: number,
  occupationId: string
) {

  const savedResults =
    db
      .prepare(
        `
        SELECT
          assessment_type,
          score
        FROM assessment_results
        WHERE student_id = ?
          AND occupation_id = ?
        `
      )
      .all(
        studentId,
        occupationId
      ) as SavedAssessment[];

  const resultMap =
    new Map(
      savedResults.map(
        (result) => [
          result.assessment_type,
          Number(result.score),
        ]
      )
    );

  return {
    technical:
      resultMap.get(
        "technical_assessment"
      ),

    coding:
      resultMap.get(
        "coding_assessment"
      ),

    interview:
      resultMap.get(
        "adaptive_interview"
      ),
  };
}

/* =========================================================
   BUILD READINESS
========================================================= */

function calculateReadiness(
  skillCoverage: number,
  technical?: number,
  coding?: number,
  interview?: number,
  evidence?: number,
  learning?: number
) {

  const components = [

    {
      name: "skill_coverage",
      label: "Skill Coverage",
      score: skillCoverage,
      weight: 35,
    },

    {
      name: "technical_assessment",
      label: "Technical Assessment",
      score: technical,
      weight: 15,
    },

    {
      name: "coding_assessment",
      label: "Coding Assessment",
      score: coding,
      weight: 15,
    },

    {
      name: "adaptive_interview",
      label: "Adaptive AI Interview",
      score: interview,
      weight: 20,
    },

    {
      name: "evidence_strength",
      label: "Evidence Strength",
      score: evidence,
      weight: 10,
    },

    {
      name: "learning_progress",
      label: "Learning Progress",
      score: learning,
      weight: 5,
    },
  ];

  /*
   * Only completed components
   * participate in the calculation.
   */

  const available =
    components.filter(
      (component) =>
        typeof component.score ===
        "number"
    );

  const totalWeight =
    available.reduce(
      (sum, component) =>
        sum + component.weight,
      0
    );

  if (
    totalWeight === 0
  ) {

    return {
      score: 0,
      components: [],
      availableWeight: 0,
    };
  }

  const weightedTotal =
    available.reduce(
      (sum, component) =>
        sum +
        (
          Number(component.score) *
          component.weight
        ),
      0
    );

  const score =
    weightedTotal /
    totalWeight;

  return {

    score:
      Math.round(
        score * 100
      ) / 100,

    components:
      available.map(
        (component) => ({
          key: component.name,
          label: component.label,
          weight: component.weight,
          score:
            Math.round(
              Number(component.score) *
              100
            ) / 100,
          available: true,
        })
      ),

    availableWeight:
      totalWeight,
  };
}

/* =========================================================
   GET READINESS
========================================================= */

router.get(
  "/:studentId/:occupationId",
  (req, res) => {

    try {

      const studentId =
        Number(
          req.params.studentId
        );

      const occupationId =
        decodeURIComponent(
          req.params.occupationId
        );

      if (
        !Number.isInteger(
          studentId
        )
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Invalid student ID",
        });
      }

      const occupation =
        getOccupation(
          occupationId
        );

      if (!occupation) {

        return res.status(404).json({
          success: false,
          message:
            "Target occupation not found",
        });
      }

      /* ===================================================
         STUDENT SKILLS
      =================================================== */

      const studentSkills =
        getStudentSkills(
          studentId
        );

      const requiredSkills =
        occupation.skills || [];

      const coverage =
        calculateSkillCoverage(
          requiredSkills,
          studentSkills
        );

      /* ===================================================
         ASSESSMENT SCORES
      =================================================== */

      const assessmentScores =
        getAssessmentScores(
          studentId,
          occupationId
        );

      const technicalScore =
        assessmentScores.technical;

      const codingScore =
        assessmentScores.coding;

      const interviewScore =
        assessmentScores.interview;

      /* ===================================================
         READINESS
      =================================================== */

      const readiness =
        calculateReadiness(
          coverage.coverage,
          technicalScore,
          codingScore,
          interviewScore
        );

      /* ===================================================
         SKILL ROWS
      =================================================== */

      const skillRows =
        coverage.missing.map(
          (skill) => ({

            skill_id:
              skill.skill_id,

            skill:
              skill.skill,

            relation_type:
              skill.relation_type,

            status:
              skill.relation_type ===
              "essential"
                ? "Critical Gap"
                : "Gap",

            mastery_score: 0,
          })
        );

      const matchedRows =
        coverage.matched.map(
          (skill) => ({

            skill_id:
              skill.skill_id,

            skill:
              skill.skill,

            relation_type:
              skill.relation_type,

            status:
              "Covered",

            mastery_score: 100,
          })
        );

      const allSkills = [
        ...matchedRows,
        ...skillRows,
      ];

      /* ===================================================
         CRITICAL BLOCKERS
      =================================================== */

      const criticalBlockers =
        skillRows.filter(
          (skill) =>
            skill.relation_type ===
            "essential"
        );

      /* ===================================================
         STRENGTHS
      =================================================== */

      const strengths: string[] = [];

      matchedRows
        .slice(0, 5)
        .forEach(
          (skill) => {
            strengths.push(
              `${skill.skill} is currently covered in your profile.`
            );
          }
        );

      if (
        typeof technicalScore ===
        "number" &&
        technicalScore >= 70
      ) {

        strengths.push(
          "Your technical assessment performance is strong."
        );
      }

      if (
        typeof codingScore ===
        "number" &&
        codingScore >= 70
      ) {

        strengths.push(
          "Your coding performance demonstrates good problem-solving ability."
        );
      }

      if (
        typeof interviewScore ===
        "number" &&
        interviewScore >= 70
      ) {

        strengths.push(
          "Your adaptive AI interview performance is strong."
        );
      }

      /* ===================================================
         WEAKNESSES
      =================================================== */

      const weaknesses: string[] = [];

      skillRows
        .slice(0, 5)
        .forEach(
          (skill) => {
            weaknesses.push(
              `${skill.skill} should be improved for the target role.`
            );
          }
        );

      if (
        typeof technicalScore ===
          "number" &&
        technicalScore < 60
      ) {

        weaknesses.push(
          "Technical assessment performance needs improvement."
        );
      }

      if (
        typeof codingScore ===
          "number" &&
        codingScore < 60
      ) {

        weaknesses.push(
          "Coding problem-solving performance needs improvement."
        );
      }

      if (
        typeof interviewScore ===
          "number" &&
        interviewScore < 60
      ) {

        weaknesses.push(
          "Adaptive AI interview performance needs improvement."
        );
      }

      /* ===================================================
         KNOWLEDGE GAPS
      =================================================== */

      const knowledgeGaps =
        skillRows.map(
          (skill) =>
            skill.skill
        );

      /* ===================================================
         PERFORMANCE GAPS
      =================================================== */

      const performanceGaps: string[] = [];

      if (
        typeof technicalScore ===
          "number" &&
        technicalScore < 70
      ) {

        performanceGaps.push(
          "Technical knowledge application"
        );
      }

      if (
        typeof codingScore ===
          "number" &&
        codingScore < 70
      ) {

        performanceGaps.push(
          "Coding problem solving"
        );
      }

      if (
        typeof interviewScore ===
          "number" &&
        interviewScore < 70
      ) {

        performanceGaps.push(
          "Interview performance and communication"
        );
      }

      /* ===================================================
         INCOMPLETE COMPONENTS
      =================================================== */

      const incompleteComponents: string[] = [];

      if (
        typeof technicalScore !==
        "number"
      ) {

        incompleteComponents.push(
          "Technical Assessment"
        );
      }

      if (
        typeof codingScore !==
        "number"
      ) {

        incompleteComponents.push(
          "Coding Assessment"
        );
      }

      if (
        typeof interviewScore !==
        "number"
      ) {

        incompleteComponents.push(
          "Adaptive AI Interview"
        );
      }

      incompleteComponents.push(
        "Evidence Strength"
      );

      incompleteComponents.push(
        "Learning Progress"
      );

      /* ===================================================
         CONFIDENCE
      =================================================== */

      const assessmentCount = [
        technicalScore,
        codingScore,
        interviewScore,
      ].filter(
        (score) =>
          typeof score ===
          "number"
      ).length;

      const confidence =
        getConfidence(
          assessmentCount
        );

      /* ===================================================
         RECOMMENDATION
      =================================================== */

      let recommendation =
        "";

      if (
        coverage.missing.length >
        0
      ) {

        recommendation =
          `Focus on your ${coverage.missing.length} missing job skills.`;

      } else {

        recommendation =
          "Your required skills are currently covered. Continue validating your readiness through the assessments.";
      }

      if (
        typeof technicalScore ===
          "number" &&
        technicalScore < 60
      ) {

        recommendation +=
          " Improve your technical assessment performance.";

      } else if (
        typeof codingScore ===
          "number" &&
        codingScore < 60
      ) {

        recommendation +=
          " Practice more coding problems.";

      } else if (
        typeof interviewScore ===
          "number" &&
        interviewScore < 60
      ) {

        recommendation +=
          " Practice the targeted AI interview again.";
      }

      /* ===================================================
         RESPONSE
      =================================================== */

      return res.json({

        success: true,

        targetRole:
          occupation.occupation_label,

        occupationId,

        score:
          readiness.score,

        readinessBand:
          getReadinessBand(
            readiness.score
          ),

        confidence,

        scoreRange:
          "0-100",

        availableWeight:
          readiness.availableWeight,

        coverage: {

          required:
            coverage.total,

          matched:
            coverage.matchedCount,

          missing:
            coverage.missing.length,

          percentage:
            Math.round(
              coverage.coverage *
              100
            ) / 100,
        },

        /* =================================================
           SCORE COMPONENTS
        ================================================= */

        components:
          [

            {
              key:
                "skill_coverage",

              label:
                "Skill Coverage",

              weight: 35,

              score:
                Math.round(
                  coverage.coverage *
                  100
                ) / 100,

              available:
                true,
            },

            {
              key:
                "technical_assessment",

              label:
                "Technical Assessment",

              weight: 15,

              score:
                technicalScore ??
                null,

              available:
                typeof technicalScore ===
                "number",
            },

            {
              key:
                "coding_assessment",

              label:
                "Coding Assessment",

              weight: 15,

              score:
                codingScore ??
                null,

              available:
                typeof codingScore ===
                "number",
            },

            {
              key:
                "adaptive_interview",

              label:
                "Adaptive AI Interview",

              weight: 20,

              score:
                interviewScore ??
                null,

              available:
                typeof interviewScore ===
                "number",
            },

            {
              key:
                "evidence_strength",

              label:
                "Evidence Strength",

              weight: 10,

              score: null,

              available:
                false,
            },

            {
              key:
                "learning_progress",

              label:
                "Learning Progress",

              weight: 5,

              score: null,

              available:
                false,
            },
          ],

        /* =================================================
           SKILLS
        ================================================= */

        skills:
          allSkills,

        matchedSkills:
          matchedRows,

        missingSkills:
          skillRows,

        criticalBlockers,

        /* =================================================
           ANALYSIS
        ================================================= */

        strengths,

        weaknesses,

        incompleteComponents,

        knowledgeGaps,

        performanceGaps,

        /* =================================================
           RECOMMENDATION
        ================================================= */

        recommendation,

        /* =================================================
           FORMULA
        ================================================= */

        formula: {

          skillCoverage:
            35,

          technicalAssessment:
            15,

          codingAssessment:
            15,

          adaptiveInterview:
            20,

          evidenceStrength:
            10,

          learningProgress:
            5,
        },

        scoringNote:
          "Unattempted components are not scored as zero. Available components are renormalized.",
      });

    } catch (error) {

      console.error(
        "Readiness error:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Unable to calculate placement readiness.",
      });
    }
  }
);

/* =========================================================
   WHAT-IF SIMULATOR
========================================================= */

router.post(
  "/:studentId/:occupationId/what-if",
  (req, res) => {

    try {

      const studentId =
        Number(
          req.params.studentId
        );

      const occupationId =
        decodeURIComponent(
          req.params.occupationId
        );

      const occupation =
        getOccupation(
          occupationId
        );

      if (!occupation) {

        return res.status(404).json({

          success: false,

          message:
            "Occupation not found",
        });
      }

      /* ===================================================
         CURRENT SKILLS
      =================================================== */

      const studentSkills =
        getStudentSkills(
          studentId
        );

      const current =
        calculateSkillCoverage(
          occupation.skills || [],
          studentSkills
        );

      /* ===================================================
         CURRENT ASSESSMENT SCORES
      =================================================== */

      const currentScores =
        getAssessmentScores(
          studentId,
          occupationId
        );

      /* ===================================================
         SIMULATED SKILLS
      =================================================== */

      const simulatedSkills =
        Array.isArray(
          req.body.skillsToLearn
        )
          ? req.body.skillsToLearn
          : [];

      const simulatedIds =
        new Set(
          simulatedSkills
        );

      const simulatedMatched =
        current.missing.filter(
          (skill) =>
            simulatedIds.has(
              skill.skill_id
            )
        );

      const simulatedCoverage =
        current.total === 0
          ? 0
          : (
              (
                current.matchedCount +
                simulatedMatched.length
              ) /
              current.total
            ) *
            100;

      /* ===================================================
         CURRENT READINESS
      =================================================== */

      const currentReadiness =
        calculateReadiness(

          current.coverage,

          currentScores.technical,

          currentScores.coding,

          currentScores.interview
        );

      /* ===================================================
         PROJECTED READINESS
      =================================================== */

      const projectedReadiness =
        calculateReadiness(

          simulatedCoverage,

          currentScores.technical,

          currentScores.coding,

          currentScores.interview
        );

      /* ===================================================
         RESPONSE
      =================================================== */

      return res.json({

        success: true,

        current: {

          readiness:
            currentReadiness.score,

          readinessBand:
            getReadinessBand(
              currentReadiness.score
            ),

          skillCoverage:
            Math.round(
              current.coverage *
              100
            ) / 100,
        },

        projected: {

          readiness:
            projectedReadiness.score,

          readinessBand:
            getReadinessBand(
              projectedReadiness.score
            ),

          skillCoverage:
            Math.round(
              simulatedCoverage *
              100
            ) / 100,
        },

        improvement:
          Math.round(
            (
              projectedReadiness.score -
              currentReadiness.score
            ) *
            100
          ) / 100,

        skillsAdded:
          simulatedMatched.map(
            (skill) =>
              skill.skill
          ),

        assessmentScores: {

          technical:
            currentScores.technical ??
            null,

          coding:
            currentScores.coding ??
            null,

          interview:
            currentScores.interview ??
            null,
        },

        message:
          simulatedMatched.length > 0
            ? `Learning ${simulatedMatched.length} additional skill(s) could improve your estimated readiness.`
            : "Select one or more missing skills to see their estimated impact.",
      });

    } catch (error) {

      console.error(
        "What-if error:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Unable to calculate what-if scenario.",
      });
    }
  }
);

export default router;