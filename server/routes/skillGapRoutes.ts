import { Router } from "express";
import db from "../database/db";
import fs from "fs";
import path from "path";

const router = Router();

// ============================================================
// TYPES
// ============================================================

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

// ============================================================
// LOAD ESCO JOB REQUIREMENTS
// ============================================================

// Prefer the curated MVP requirements used by the student UI.
// Fall back to the full ESCO export only if the MVP file is missing.
const mvpDataPath = path.join(
  __dirname,
  "../data/job_requirements_mvp.json"
);

const fullDataPath = path.join(
  __dirname,
  "../data/job_requirements.json"
);

const dataPath = fs.existsSync(mvpDataPath)
  ? mvpDataPath
  : fullDataPath;

const jobData: JobRequirementsData = JSON.parse(
  fs.readFileSync(dataPath, "utf-8")
);

console.log(
  `Skill Gap: loaded ${
    fs.existsSync(mvpDataPath)
      ? "job_requirements_mvp.json"
      : "job_requirements.json"
  }`
);

// ============================================================
// HELPER: NORMALIZE RELATION TYPE
// ============================================================

function normalizeRelationType(
  relationType: string | null | undefined
): string {
  return String(relationType || "")
    .toLowerCase()
    .trim();
}

// ============================================================
// HELPER: NORMALIZE SKILL TYPE
// ============================================================

function normalizeSkillType(
  skillType: string | null | undefined
): string {
  return String(skillType || "")
    .toLowerCase()
    .trim();
}

// ============================================================
// GET SKILL RELEVANCE SCORE
//
// This does NOT invent ESCO relationships.
// It uses the relation_type already present in
// the selected job-requirements dataset.
//
// Essential skills are treated as core requirements.
// Optional skills are treated as supporting skills.
//
// Technical/knowledge skills receive slightly higher
// relevance than very broad/general skills.
//
// ============================================================

function getSkillRelevanceScore(
  skill: JobSkill
): number {

  const relation =
    normalizeRelationType(
      skill.relation_type
    );

  const type =
    normalizeSkillType(
      skill.skill_type
    );

  let score = 0;

  // ----------------------------------------------------------
  // ESSENTIAL = CORE
  // ----------------------------------------------------------

  if (relation === "essential") {
    score += 100;
  }

  // ----------------------------------------------------------
  // OPTIONAL = SUPPORTING
  // ----------------------------------------------------------

  else if (relation === "optional") {
    score += 40;
  }

  // ----------------------------------------------------------
  // TECHNICAL / KNOWLEDGE SKILLS
  // ----------------------------------------------------------

  if (
    type.includes("technical") ||
    type.includes("knowledge")
  ) {
    score += 20;
  }

  // ----------------------------------------------------------
  // DIGITAL / TECHNOLOGY RELATED SKILLS
  // ----------------------------------------------------------

  if (
    type.includes("digital") ||
    type.includes("technology")
  ) {
    score += 15;
  }

  // ----------------------------------------------------------
  // SOFT / TRANSVERSAL SKILLS
  // ----------------------------------------------------------

  if (
    type.includes("transversal") ||
    type.includes("soft")
  ) {
    score += 5;
  }

  return score;
}

// ============================================================
// SELECT CORE JOB SKILLS
//
// We do NOT treat every ESCO association as a core requirement.
//
// Priority:
//   1. Essential skills
//   2. Technical / knowledge relevance
//   3. Supporting skills only when necessary
//
// Maximum core requirements used for the readiness score:
// 15
//
// This keeps the score focused on the most meaningful
// job-related skills instead of hundreds of ESCO associations.
// ============================================================

function normalizeSkillName(
  skillName: string | null | undefined
): string {
  let value = String(skillName || "")
    .toLowerCase()
    .trim();

  // Remove ESCO parenthetical qualifiers.
  value = value.replace(/\([^)]*\)/g, " ");

  // Common abbreviations / equivalent labels.
  const aliases: Record<string, string> = {
    "java (computer programming)": "java",
    "python (computer programming)": "python",
    "javascript (computer programming)": "javascript",
    "object oriented programming": "object oriented programming",
    "object-oriented programming": "object oriented programming",
    "oop": "object oriented programming",
    "dbms": "database management systems",
    "database management system": "database management systems",
    "data structure": "data structures",
    "dsa": "data structures and algorithms",
    "data structures and algorithms": "data structures and algorithms",
    "machine learning": "machine learning",
    "ml": "machine learning",
    "artificial intelligence": "artificial intelligence",
    "ai": "artificial intelligence",
    "natural language processing": "natural language processing",
    "nlp": "natural language processing",
    "computer networks": "computer networks",
    "networking": "computer networks",
    "operating system": "operating systems",
    "os": "operating systems",
    "database": "databases",
    "sql database": "sql",
    "structured query language": "sql",
    "c plus plus": "c++",
    "cplusplus": "c++",
    "c sharp": "c#",
    "reactjs": "react",
    "nodejs": "node.js",
    "node js": "node.js",
    "typescript": "typescript",
    "version control": "version control systems",
    "version control system": "version control systems",
    "git version control": "git"
  };

  value = value
    .replace(/\+/g, " plus ")
    .replace(/#/g, " sharp ")
    .replace(/[._/-]+/g, " ")
    .replace(/[^a-z0-9+ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return aliases[value] || value;
}

// ============================================================
// ROLE-AWARE CORE SKILL SELECTION
//
// For a generic "Software Developer" occupation we do NOT treat
// every optional ESCO programming language as a separate core
// requirement.
//
// Instead:
//   1. Keep the generic ESCO "computer programming" concept as
//      ONE programming requirement.
//   2. Match any concrete programming language (Java/Python/C++/
//      JavaScript/etc.) against that programming requirement.
//   3. Prioritize essential development skills.
//   4. Keep optional languages/frameworks as supporting skills.
//   5. Select at most 15 meaningful core requirements.
//
// This is a project-level scoring policy, not an ESCO ranking.
// ============================================================

function getRoleKeywordScore(
  occupationLabel: string,
  skillName: string
): number {
  const role = normalizeSkillName(occupationLabel);
  const skill = normalizeSkillName(skillName);

  const isSoftwareRole =
    role.includes("software developer") ||
    role.includes("software development") ||
    role.includes("software engineer") ||
    role.includes("application developer");

  if (!isSoftwareRole) return 0;

  const priorityGroups: Array<{
    score: number;
    terms: string[];
  }> = [
    {
      score: 1000,
      terms: [
        "computer programming",
        "object oriented programming",
        "use object oriented programming",
        "data structures",
        "algorithms",
        "algorithm",
      ],
    },
    {
      score: 950,
      terms: [
        "software testing",
        "debug software",
        "software debugging",
        "debugging",
        "software design patterns",
      ],
    },
    {
      score: 900,
      terms: [
        "sql",
        "database",
        "database management",
        "data management",
        "query languages",
        "nosql",
      ],
    },
    {
      score: 850,
      terms: [
        "version control",
        "source code management",
        "software configuration management",
        "tools for software configuration management",
      ],
    },
    {
      score: 800,
      terms: [
        "integrated development environment",
        "integrated development environment software",
        "software frameworks",
        "software framework",
        "web services",
        "web development",
        "web application",
        "rest",
        "api",
      ],
    },
    {
      score: 750,
      terms: [
        "software architecture",
        "software design",
        "analyse software specifications",
        "analyze software specifications",
        "define technical requirements",
        "technical requirements",
        "software requirements",
        "technical documentation",
      ],
    },
  ];

  for (const group of priorityGroups) {
    if (
      group.terms.some((term) =>
        skill.includes(normalizeSkillName(term))
      )
    ) {
      return group.score;
    }
  }

  return 0;
}

function selectCoreJobSkills(
  skills: JobSkill[],
  occupationLabel = ""
): JobSkill[] {
  if (!skills.length) return [];

  const role = normalizeSkillName(occupationLabel);

  const isSoftwareRole =
    role.includes("software developer") ||
    role.includes("software development") ||
    role.includes("software engineer") ||
    role.includes("application developer");

  // ----------------------------------------------------------
  // Generic/non-software role:
  // use ESCO essential skills first, then optional skills.
  // ----------------------------------------------------------

  if (!isSoftwareRole) {
    return [...skills]
      .sort((a, b) => {
        const aEssential =
          normalizeRelationType(a.relation_type) === "essential";
        const bEssential =
          normalizeRelationType(b.relation_type) === "essential";

        if (aEssential !== bEssential) {
          return aEssential ? -1 : 1;
        }

        return a.skill.localeCompare(b.skill);
      })
      .slice(0, 15);
  }

  // ----------------------------------------------------------
  // Generic "computer programming" is ONE requirement.
  // Concrete languages are supporting evidence for it.
  // ----------------------------------------------------------

  const isConcreteLanguage = (
    skillName: string
  ): boolean => {
    const s = normalizeSkillName(skillName);

    const languages = [
      "java",
      "python",
      "c++",
      "c#",
      "javascript",
      "typescript",
      "kotlin",
      "php",
      "ruby",
      "scala",
      "swift",
      "perl",
      "cobol",
      "assembly",
      "visual basic",
      "matlab",
      "groovy",
      "objective c",
    ];

    return languages.some((language) => {
      const l = normalizeSkillName(language);

      return (
        s === l ||
        s.includes(`${l} programming`) ||
        s.includes(`${l} computer programming`)
      );
    });
  };

  const isGenericProgramming = (
    skillName: string
  ): boolean =>
    normalizeSkillName(skillName) ===
    normalizeSkillName("computer programming");

  // ----------------------------------------------------------
  // Category classification.
  // ----------------------------------------------------------

  const category = (
    skillName: string
  ): string => {
    const s = normalizeSkillName(skillName);

    if (isGenericProgramming(skillName)) {
      return "programming";
    }

    // Concrete languages are NOT individual core requirements
    // for a generic Software Developer role.
    if (isConcreteLanguage(skillName)) {
      return "language_support";
    }

    if (
      s.includes("object oriented") ||
      s.includes("data structure") ||
      s.includes("algorithm") ||
      s.includes("software testing") ||
      s.includes("debug") ||
      s.includes("design pattern")
    ) {
      return "fundamentals";
    }

    if (
      s === "sql" ||
      s.includes("database") ||
      s.includes("data management") ||
      s.includes("query language") ||
      s.includes("nosql")
    ) {
      return "database";
    }

    if (
      s.includes("version control") ||
      s.includes("source code management") ||
      s.includes("software configuration management") ||
      s.includes("integrated development environment")
    ) {
      return "tools";
    }

    if (
      s.includes("software framework") ||
      s.includes("web service") ||
      s.includes("web development") ||
      s.includes("web application") ||
      s.includes("rest") ||
      s.includes("api") ||
      s.includes("software architecture") ||
      s.includes("software design")
    ) {
      return "application";
    }

    if (
      s.includes("technical requirement") ||
      s.includes("software requirement") ||
      s.includes("software specification") ||
      s.includes("technical documentation")
    ) {
      return "requirements";
    }

    return "general";
  };

  // ----------------------------------------------------------
  // Score only meaningful core candidates.
  //
  // Concrete languages are excluded from the core list.
  // They will appear under supporting skills.
  // ----------------------------------------------------------

  const candidates = skills
    .filter(
      (skill) =>
        !isConcreteLanguage(skill.skill)
    )
    .map((skill) => {
      const relation =
        normalizeRelationType(
          skill.relation_type
        );

      const relationScore =
        relation === "essential"
          ? 100
          : relation === "optional"
          ? 40
          : 0;

      const roleScore =
        getRoleKeywordScore(
          occupationLabel,
          skill.skill
        );

      return {
        skill,
        category: category(skill.skill),
        score:
          roleScore * 1000 +
          relationScore * 10,
      };
    });

  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.skill.skill.localeCompare(
      b.skill.skill
    );
  });

  // ----------------------------------------------------------
  // Category limits prevent one ESCO category from dominating.
  // ----------------------------------------------------------

  const limits: Record<string, number> = {
    programming: 1,
    fundamentals: 4,
    database: 2,
    tools: 2,
    application: 3,
    requirements: 2,
    general: 1,
  };

  const counts: Record<string, number> = {};
  const selected: JobSkill[] = [];

  for (const item of candidates) {
    if (selected.length >= 15) break;

    const count =
      counts[item.category] || 0;

    const limit =
      limits[item.category] || 0;

    if (count >= limit) continue;

    selected.push(item.skill);

    counts[item.category] =
      count + 1;
  }

  // Fill any remaining slots from the highest-ranked
  // non-language candidates.
  if (selected.length < 15) {
    const selectedIds = new Set(
      selected.map(
        (skill) => skill.skill_id
      )
    );

    for (const item of candidates) {
      if (selected.length >= 15) break;

      if (
        selectedIds.has(
          item.skill.skill_id
        )
      ) {
        continue;
      }

      selected.push(item.skill);
      selectedIds.add(
        item.skill.skill_id
      );
    }
  }

  return selected.slice(0, 15);
}

// ============================================================
// SELECT SUPPORTING SKILLS
//
// Supporting skills are optional extras. They are NOT treated as
// mandatory learning gaps. Keep the list small and useful so the
// UI does not tell students they need to learn dozens of unrelated
// ESCO technologies.
// ============================================================

function selectSupportingSkills(
  skills: JobSkill[],
  coreSkills: JobSkill[]
): JobSkill[] {
  const coreIds = new Set(
    coreSkills.map(
      (skill) => skill.skill_id
    )
  );

  const usefulTerms = [
    "javascript",
    "typescript",
    "c#",
    "c++",
    "java",
    "python",
    "php",
    "ruby",
    "kotlin",
    "scala",
    "swift",
    "git",
    "version control",
    "maven",
    "jenkins",
    "eclipse",
    "web development",
    "rest",
    "api",
    "software framework",
    "cloud",
    "machine learning",
  ];

  return skills
    .filter(
      (skill) =>
        !coreIds.has(skill.skill_id)
    )
    .filter(
      (skill) =>
        normalizeRelationType(
          skill.relation_type
        ) === "optional"
    )
    .filter((skill) => {
      const s =
        normalizeSkillName(skill.skill);

      return usefulTerms.some((term) =>
        s.includes(
          normalizeSkillName(term)
        )
      );
    })
    .sort(
      (a, b) =>
        getSkillRelevanceScore(b) -
        getSkillRelevanceScore(a)
    )
    .slice(0, 10);
}

// ============================================================
// MATCH STUDENT SKILL TO JOB SKILL
//
// 1. Exact ESCO skill ID
// 2. Canonical normalized name
// 3. Safe token equality
// ============================================================

interface SkillMatch {
  matched: boolean;
  method:
    | "esco_id"
    | "normalized_name"
    | "token_match"
    | "none";
  studentSkill?: {
    esco_skill_id: string | null;
    skill_name: string;
    proficiency_level: string | null;
    source: string | null;
    confidence_score: number | null;
  };
}

function tokenMatch(
  requiredName: string,
  studentName: string
): boolean {
  const requiredTokens = new Set(
    normalizeSkillName(requiredName)
      .split(" ")
      .filter(Boolean)
  );

  const studentTokens = new Set(
    normalizeSkillName(studentName)
      .split(" ")
      .filter(Boolean)
  );

  if (
    requiredTokens.size === 0 ||
    studentTokens.size === 0
  ) {
    return false;
  }

  return (
    requiredTokens.size === studentTokens.size &&
    [...requiredTokens].every((token) =>
      studentTokens.has(token)
    )
  );
}

function findStudentSkillMatch(
  requiredSkill: JobSkill,
  studentSkills: ReturnType<typeof getStudentSkills>
): SkillMatch {
  // "computer programming" is a generic ESCO parent skill.
  // For the project readiness score, any concrete programming
  // language in the student's profile can satisfy this one
  // programming requirement.
  if (
    normalizeSkillName(requiredSkill.skill) ===
    normalizeSkillName("computer programming")
  ) {
    const programmingNames = [
      "java",
      "python",
      "c++",
      "c#",
      "javascript",
      "typescript",
      "kotlin",
      "php",
      "ruby",
      "scala",
      "swift",
      "perl",
      "cobol",
      "assembly",
      "visual basic",
      "matlab",
      "groovy",
      "objective c",
    ];

    const programmingMatch =
      studentSkills.find((studentSkill) => {
        const s =
          normalizeSkillName(
            studentSkill.skill_name
          );

        return programmingNames.some(
          (language) => {
            const l =
              normalizeSkillName(language);

            return (
              s === l ||
              s.includes(
                `${l} programming`
              ) ||
              s.includes(
                `${l} computer programming`
              )
            );
          }
        );
      });

    if (programmingMatch) {
      return {
        matched: true,
        method: "normalized_name",
        studentSkill: programmingMatch,
      };
    }
  }

  if (requiredSkill.skill_id) {
    const idMatch = studentSkills.find(
      (studentSkill) =>
        studentSkill.esco_skill_id ===
        requiredSkill.skill_id
    );

    if (idMatch) {
      return {
        matched: true,
        method: "esco_id",
        studentSkill: idMatch,
      };
    }
  }

  const requiredNormalized =
    normalizeSkillName(requiredSkill.skill);

  const nameMatch = studentSkills.find(
    (studentSkill) =>
      normalizeSkillName(
        studentSkill.skill_name
      ) === requiredNormalized
  );

  if (nameMatch) {
    return {
      matched: true,
      method: "normalized_name",
      studentSkill: nameMatch,
    };
  }

  const tokenNameMatch = studentSkills.find(
    (studentSkill) =>
      tokenMatch(
        requiredSkill.skill,
        studentSkill.skill_name
      )
  );

  if (tokenNameMatch) {
    return {
      matched: true,
      method: "token_match",
      studentSkill: tokenNameMatch,
    };
  }

  return {
    matched: false,
    method: "none",
  };
}

// ============================================================
// GET STUDENT SKILLS
// ============================================================

function getStudentSkills(studentId: number) {
  return db
    .prepare(`
      SELECT
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
    `)
    .all(studentId) as Array<{
      esco_skill_id: string | null;
      skill_name: string;
      skill_type: string | null;
      proficiency_level: string | null;
      source: string | null;
      confidence_score: number | null;
    }>;
}

// ============================================================
// SKILL GAP ROUTE
//
// IMPORTANT:
// ESCO occupation IDs contain "/".
// Therefore occupationId is passed as a query parameter.
//
// GET
// /api/students/:studentId/skill-gap?occupationId=...
// ============================================================

router.get(
  "/:studentId/skill-gap",
  (req, res) => {
    try {
      const studentId =
        Number(req.params.studentId);

      const occupationId =
        String(
          req.query.occupationId || ""
        ).trim();

      // --------------------------------------------------------
      // 1. VALIDATE INPUT
      // --------------------------------------------------------

      if (
        !Number.isInteger(studentId) ||
        studentId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID",
        });
      }

      if (!occupationId) {
        return res.status(400).json({
          success: false,
          message:
            "occupationId query parameter is required",
        });
      }

      // --------------------------------------------------------
      // 2. CHECK STUDENT
      // --------------------------------------------------------

      const student =
        db
          .prepare(`
            SELECT
              id,
              name
            FROM students
            WHERE id = ?
          `)
          .get(studentId) as
          | {
              id: number;
              name: string;
            }
          | undefined;

      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      // --------------------------------------------------------
      // 3. FIND TARGET OCCUPATION
      // --------------------------------------------------------

      const occupation =
        jobData.occupations.find(
          (job) =>
            job.occupation_id ===
            occupationId
        );

      if (!occupation) {
        return res.status(404).json({
          success: false,
          message: "Target job not found",
          occupation_id: occupationId,
        });
      }

      // --------------------------------------------------------
      // 4. GET STUDENT SKILLS
      // --------------------------------------------------------

      const studentSkills =
        getStudentSkills(studentId);

      // --------------------------------------------------------
      // 5. SELECT CORE JOB SKILLS
      // --------------------------------------------------------

      const coreJobSkills =
        selectCoreJobSkills(
          occupation.skills,
          occupation.occupation_label
        );

      // --------------------------------------------------------
      // 6. SELECT SUPPORTING SKILLS
      // --------------------------------------------------------

      const supportingSkills =
        selectSupportingSkills(
          occupation.skills,
          coreJobSkills
        );

      // --------------------------------------------------------
      // 7. MATCH CORE SKILLS
      // --------------------------------------------------------

      const matchedCoreSkills: JobSkill[] = [];
      const missingCoreSkills: JobSkill[] = [];

      const coreMatchDetails: Array<{
        required_skill: JobSkill;
        method: SkillMatch["method"];
        student_skill: string | null;
      }> = [];

      for (const requiredSkill of coreJobSkills) {
        const match =
          findStudentSkillMatch(
            requiredSkill,
            studentSkills
          );

        if (match.matched) {
          matchedCoreSkills.push(
            requiredSkill
          );

          coreMatchDetails.push({
            required_skill: requiredSkill,
            method: match.method,
            student_skill:
              match.studentSkill?.skill_name ||
              null,
          });
        } else {
          missingCoreSkills.push(
            requiredSkill
          );

          coreMatchDetails.push({
            required_skill: requiredSkill,
            method: "none",
            student_skill: null,
          });
        }
      }

      // --------------------------------------------------------
      // 8. MATCH SUPPORTING SKILLS
      // --------------------------------------------------------

      const matchedSupportingSkills: JobSkill[] = [];
      const missingSupportingSkills: JobSkill[] = [];

      const supportingMatchDetails: Array<{
        required_skill: JobSkill;
        method: SkillMatch["method"];
        student_skill: string | null;
      }> = [];

      for (const supportingSkill of supportingSkills) {
        const match =
          findStudentSkillMatch(
            supportingSkill,
            studentSkills
          );

        if (match.matched) {
          matchedSupportingSkills.push(
            supportingSkill
          );

          supportingMatchDetails.push({
            required_skill: supportingSkill,
            method: match.method,
            student_skill:
              match.studentSkill?.skill_name ||
              null,
          });
        } else {
          missingSupportingSkills.push(
            supportingSkill
          );

          supportingMatchDetails.push({
            required_skill: supportingSkill,
            method: "none",
            student_skill: null,
          });
        }
      }

      // --------------------------------------------------------
      // 9. CORE COUNTS
      // --------------------------------------------------------

      const requiredCount =
        coreJobSkills.length;

      const matchedCount =
        matchedCoreSkills.length;

      const missingCount =
        missingCoreSkills.length;

      // --------------------------------------------------------
      // 10. CORE MATCH %
      // --------------------------------------------------------

      const matchPercentage =
        requiredCount > 0
          ? Number(
              (
                (matchedCount /
                  requiredCount) *
                100
              ).toFixed(2)
            )
          : 0;

      const gapPercentage =
        requiredCount > 0
          ? Number(
              (
                (missingCount /
                  requiredCount) *
                100
              ).toFixed(2)
            )
          : 0;

      // --------------------------------------------------------
      // 11. SUPPORTING %
      // --------------------------------------------------------

      const supportingRequiredCount =
        supportingSkills.length;

      const supportingMatchedCount =
        matchedSupportingSkills.length;

      const supportingMatchPercentage =
        supportingRequiredCount > 0
          ? Number(
              (
                (supportingMatchedCount /
                  supportingRequiredCount) *
                100
              ).toFixed(2)
            )
          : 0;

      // --------------------------------------------------------
      // 12. READINESS
      //
      // 85% core
      // 15% supporting
      // --------------------------------------------------------

      let readinessPercentage =
        matchPercentage;

      if (
        supportingRequiredCount > 0
      ) {
        readinessPercentage =
          Number(
            (
              (matchPercentage * 0.85) +
              (supportingMatchPercentage * 0.15)
            ).toFixed(2)
          );
      }

      // --------------------------------------------------------
      // 13. READINESS LEVEL
      // --------------------------------------------------------

      let readinessLevel =
        "Needs Improvement";

      if (
        readinessPercentage >= 85
      ) {
        readinessLevel =
          "Highly Ready";
      } else if (
        readinessPercentage >= 70
      ) {
        readinessLevel =
          "Mostly Ready";
      } else if (
        readinessPercentage >= 50
      ) {
        readinessLevel =
          "Partially Ready";
      }

      // --------------------------------------------------------
      // 14. RETURN RESULT
      // --------------------------------------------------------

      return res.json({
        success: true,

        student: {
          id: student.id,
          name: student.name,
          skill_count:
            studentSkills.length,
        },

        target_job: {
          occupation_id:
            occupation.occupation_id,

          occupation_label:
            occupation.occupation_label,

          description:
            occupation.description,
        },

        analysis: {
          required_skill_count:
            requiredCount,

          matched_skill_count:
            matchedCount,

          missing_skill_count:
            missingCount,

          match_percentage:
            matchPercentage,

          gap_percentage:
            gapPercentage,

          supporting_skill_count:
            supportingRequiredCount,

          supporting_matched_count:
            supportingMatchedCount,

          supporting_match_percentage:
            supportingMatchPercentage,

          readiness_percentage:
            readinessPercentage,

          readiness_level:
            readinessLevel,

          total_esco_skill_associations:
            occupation.skills.length,
        },

        core_skills:
          coreJobSkills,

        matched_skills:
          matchedCoreSkills,

        missing_skills:
          missingCoreSkills,

        supporting_skills:
          supportingSkills,

        matched_supporting_skills:
          matchedSupportingSkills,

        missing_supporting_skills:
          missingSupportingSkills,

        match_details:
          coreMatchDetails,

        supporting_match_details:
          supportingMatchDetails,

        matching_method:
          "ESCO skill ID + controlled skill-name normalization + safe token matching + role-aware core skill selection",

        data_source:
          fs.existsSync(mvpDataPath)
            ? "job_requirements_mvp.json"
            : "job_requirements.json",
      });

    } catch (error) {
      console.error(
        "SKILL GAP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to calculate skill gap",
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }
);

console.log(
  "Skill Gap routes loaded"
);

export default router;
