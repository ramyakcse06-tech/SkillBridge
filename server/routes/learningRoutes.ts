import { Router } from "express";
import db from "../database/db";
import fs from "fs";
import path from "path";

const router = Router();

interface LearningResource {
  id: number;
  skill: string;
  aliases: string[];
  title: string;
  type: string;
  difficulty: string;
  estimated_hours: number;
  url: string;
}

const resourcePath = path.join(
  __dirname,
  "../data/learning_resources.json"
);

const resources: LearningResource[] = JSON.parse(
  fs.readFileSync(resourcePath, "utf-8")
);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findResource(skillName: string): LearningResource | null {
  const normalizedSkill = normalize(skillName);

  // Exact skill match
  let resource = resources.find(
    (item) => normalize(item.skill) === normalizedSkill
  );

  if (resource) return resource;

  // Alias match
  resource = resources.find((item) =>
    item.aliases.some(
      (alias) => normalize(alias) === normalizedSkill
    )
  );

  if (resource) return resource;

  // Partial match
  resource = resources.find((item) => {
    const resourceSkill = normalize(item.skill);

    return (
      normalizedSkill.includes(resourceSkill) ||
      resourceSkill.includes(normalizedSkill)
    );
  });

  return resource || null;
}

/*
 * GET LEARNING RECOMMENDATIONS
 *
 * GET /api/students/:studentId/learning/:occupationId
 */
router.get(
  "/:studentId/learning/:occupationId",
  (req, res) => {
    try {
      const studentId = Number(req.params.studentId);
      const occupationId = req.params.occupationId;

      // Check student
      const student = db
        .prepare(`
          SELECT id, name
          FROM students
          WHERE id = ?
        `)
        .get(studentId) as
        | { id: number; name: string }
        | undefined;

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      // Load job requirements
      const jobDataPath = path.join(
        __dirname,
        "../data/job_requirements.json"
      );

      const jobData = JSON.parse(
        fs.readFileSync(jobDataPath, "utf-8")
      );

      const occupation = jobData.occupations.find(
        (job: any) =>
          job.occupation_id === occupationId
      );

      if (!occupation) {
        return res.status(404).json({
          success: false,
          message: "Target job not found",
        });
      }

      // Get student's ESCO skills
      const studentSkills = db
        .prepare(`
          SELECT s.esco_skill_id
          FROM student_skills ss
          JOIN skills s
            ON ss.skill_id = s.id
          WHERE ss.student_id = ?
        `)
        .all(studentId) as Array<{
          esco_skill_id: string | null;
        }>;

      const studentSkillIds = new Set(
        studentSkills
          .map((skill) => skill.esco_skill_id)
          .filter(Boolean)
      );

      // Find missing skills
      const missingSkills = occupation.skills.filter(
        (requiredSkill: any) =>
          !studentSkillIds.has(requiredSkill.skill_id)
      );

      // Find learning resources
      const recommendations = missingSkills
        .map((skill: any) => {
          const resource = findResource(skill.skill);

          if (!resource) return null;

          return {
            skill_id: skill.skill_id,
            skill: skill.skill,
            relation_type: skill.relation_type,
            skill_type: skill.skill_type,

            resource: {
              id: resource.id,
              title: resource.title,
              type: resource.type,
              difficulty: resource.difficulty,
              estimated_hours: resource.estimated_hours,
              url: resource.url,
            },
          };
        })
        .filter(Boolean);

      res.json({
        success: true,

        student: {
          id: student.id,
          name: student.name,
        },

        target_job: {
          occupation_id: occupation.occupation_id,
          occupation_label: occupation.occupation_label,
        },

        summary: {
          missing_skill_count: missingSkills.length,
          recommended_skill_count:
            recommendations.length,
        },

        recommendations,
      });

    } catch (error) {
      console.error(
        "LEARNING RECOMMENDATION ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to generate learning recommendations",
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }
);

export default router;