import { Router } from "express";
import db from "../database/db";

const router = Router();

/*
 * ============================================================
 * ADD / UPDATE ONE SKILL FOR A STUDENT
 * POST /api/students/:studentId/skills
 * ============================================================
 */
router.post("/:studentId/skills", (req, res) => {
  try {
    const studentId = Number(req.params.studentId);

    const {
      skill_id,
      preferred_label,
      skill_type,
      description,
      source = "resume",
      confidence_score = null,
    } = req.body;

    // Validate required fields
    if (!studentId || !skill_id || !preferred_label) {
      return res.status(400).json({
        success: false,
        message:
          "studentId, skill_id and preferred_label are required",
      });
    }

    // Check whether student exists
    const student = db
      .prepare("SELECT id FROM students WHERE id = ?")
      .get(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Insert skill into skills table
    // If the skill already exists, update its ESCO information.
    db.prepare(`
      INSERT INTO skills
      (
        esco_skill_id,
        skill_name,
        skill_type,
        description
      )
      VALUES (?, ?, ?, ?)

      ON CONFLICT(skill_name)
      DO UPDATE SET
        esco_skill_id = COALESCE(
          excluded.esco_skill_id,
          skills.esco_skill_id
        ),
        skill_type = COALESCE(
          excluded.skill_type,
          skills.skill_type
        ),
        description = COALESCE(
          excluded.description,
          skills.description
        )
    `).run(
      skill_id,
      preferred_label,
      skill_type || null,
      description || null
    );

    // Find the database ID of the skill
    const skill = db
      .prepare(`
        SELECT id
        FROM skills
        WHERE skill_name = ?
      `)
      .get(preferred_label) as
      | { id: number }
      | undefined;

    if (!skill) {
      return res.status(500).json({
        success: false,
        message: "Failed to create/find skill",
      });
    }

    // Connect skill to student
    db.prepare(`
      INSERT INTO student_skills
      (
        student_id,
        skill_id,
        proficiency_level,
        source,
        confidence_score
      )
      VALUES (?, ?, ?, ?, ?)

      ON CONFLICT(student_id, skill_id)
      DO UPDATE SET
        source = excluded.source,
        confidence_score = excluded.confidence_score
    `).run(
      studentId,
      skill.id,
      null,
      source,
      confidence_score
    );

    res.status(201).json({
      success: true,
      message: "Skill added successfully",
      student_id: studentId,
      skill_id: skill.id,
      esco_skill_id: skill_id,
      skill_name: preferred_label,
    });

  } catch (error) {
    console.error("ADD SKILL ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add skill",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
});


/*
 * ============================================================
 * GET ALL SKILLS FOR A STUDENT
 * GET /api/students/:studentId/skills
 * ============================================================
 */
router.get("/:studentId/skills", (req, res) => {
  try {
    const studentId = Number(req.params.studentId);

    // Check whether student exists
    const student = db
      .prepare("SELECT id FROM students WHERE id = ?")
      .get(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Get student's skills
    const skills = db
      .prepare(`
        SELECT
          ss.id,
          ss.student_id,
          s.id AS skill_id,
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
      .all(studentId);

    res.json({
      success: true,
      student_id: studentId,
      skill_count: skills.length,
      skills,
    });

  } catch (error) {
    console.error("GET SKILLS ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch student skills",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
});


/*
 * ============================================================
 * DELETE ONE SKILL FROM A STUDENT
 * DELETE /api/students/:studentId/skills/:skillId
 * ============================================================
 */
router.delete("/:studentId/skills/:skillId", (req, res) => {
  try {
    const studentId = Number(req.params.studentId);
    const skillId = Number(req.params.skillId);

    if (!studentId || !skillId) {
      return res.status(400).json({
        success: false,
        message: "Valid studentId and skillId are required",
      });
    }

    const result = db
      .prepare(`
        DELETE FROM student_skills
        WHERE student_id = ?
        AND skill_id = ?
      `)
      .run(studentId, skillId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Student skill not found",
      });
    }

    res.json({
      success: true,
      message: "Skill removed successfully",
      student_id: studentId,
      skill_id: skillId,
    });

  } catch (error) {
    console.error("DELETE SKILL ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete skill",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
});


export default router;