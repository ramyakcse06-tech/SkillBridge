import fs from "fs";
import path from "path";

// ============================================================
// TYPES
// ============================================================

interface ESCOskill {
  skill_id: string;
  preferred_label?: string;
  skill?: string;
  skill_type?: string;
  description?: string;
}

export interface ExtractedSkill {
  skill_id: string;
  preferred_label: string;
  skill_type: string | null;
  description: string | null;
}

export interface CategorizedSkills {
  technical: ExtractedSkill[];
  soft: ExtractedSkill[];
  languages: ExtractedSkill[];
}

// ============================================================
// LOAD ESCO TAXONOMY
// ============================================================

function loadTaxonomy(): ESCOskill[] {
  const possibleFiles = [
    path.join(process.cwd(), "data", "skill_taxonomy.json"),
    path.join(process.cwd(), "data", "skill_taxonomy_mvp.json"),
  ];

  for (const filePath of possibleFiles) {
    try {
      if (!fs.existsSync(filePath)) {
        continue;
      }

      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);

      // Array
      if (Array.isArray(data)) {
        return data;
      }

      // { skills: [...] }
      if (Array.isArray(data.skills)) {
        return data.skills;
      }

      // { skill_taxonomy: [...] }
      if (Array.isArray(data.skill_taxonomy)) {
        return data.skill_taxonomy;
      }

      // { taxonomy: [...] }
      if (Array.isArray(data.taxonomy)) {
        return data.taxonomy;
      }

      // Object keyed by skill ID
      if (data && typeof data === "object") {
        const values = Object.values(data);

        if (
          values.length > 0 &&
          typeof values[0] === "object"
        ) {
          return values as ESCOskill[];
        }
      }
    } catch (error) {
      console.error(
        `Could not load taxonomy from ${filePath}:`,
        error
      );
    }
  }

  console.error("ESCO skill taxonomy could not be loaded.");

  return [];
}

// ============================================================
// NORMALIZE TEXT
// ============================================================

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[•●▪◦]/g, " ")
    .replace(/[|,;:()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// ESCAPE REGEX
// ============================================================

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================================
// ALIASES
// ============================================================

const aliases: Record<string, string[]> = {
  "Java (computer programming)": [
    "java",
    "java programming",
    "core java",
    "java language",
  ],

  "Python (computer programming)": [
    "python",
    "python programming",
    "python language",
  ],

  "C++": [
    "c++",
    "cpp",
    "c plus plus",
  ],

  "C#": [
    "c#",
    "c sharp",
    "csharp",
  ],

  "JavaScript": [
    "javascript",
    "java script",
    "js",
  ],

  "TypeScript": [
    "typescript",
    "type script",
    "ts",
  ],

  "SQL": [
    "sql",
    "structured query language",
  ],

  "HTML": [
    "html",
    "html5",
    "hypertext markup language",
  ],

  "CSS": [
    "css",
    "css3",
    "cascading style sheets",
  ],

  "React": [
    "react",
    "reactjs",
    "react.js",
  ],

  "Node.js": [
    "node",
    "nodejs",
    "node.js",
  ],

  "Git": [
    "git",
    "github",
    "gitlab",
    "version control",
  ],

  "MongoDB": [
    "mongodb",
    "mongo db",
    "mongo",
  ],

  "MySQL": [
    "mysql",
    "my sql",
  ],

  "Oracle": [
    "oracle",
    "oracle database",
    "oracle db",
  ],

  "Machine Learning": [
    "machine learning",
    "ml",
    "machine-learning",
  ],

  "Data Science": [
    "data science",
    "data sciences",
  ],

  "Data Analysis": [
    "data analysis",
    "data analytics",
    "data analyst",
    "data analysis tools",
  ],

  "Artificial Intelligence": [
    "artificial intelligence",
    "artificial intelligence ai",
    "ai",
  ],

  "Cloud Computing": [
    "cloud computing",
    "cloud",
    "cloud technology",
  ],

  "Amazon Web Services": [
    "aws",
    "amazon web services",
  ],

  "Microsoft Azure": [
    "azure",
    "microsoft azure",
  ],

  "Docker": [
    "docker",
    "docker containers",
    "containerization",
  ],

  "Kubernetes": [
    "kubernetes",
    "k8s",
  ],

  "Spring Boot": [
    "spring boot",
    "springboot",
  ],

  "Spring Framework": [
    "spring framework",
    "spring",
  ],

  "Object-oriented programming": [
    "oop",
    "object oriented programming",
    "object-oriented programming",
  ],

  "Data structures": [
    "data structures",
    "data structure",
    "dsa",
  ],

  "Algorithms": [
    "algorithms",
    "algorithm",
    "algorithm design",
  ],

  "Operating systems": [
    "operating systems",
    "operating system",
    "os",
  ],

  "Computer networks": [
    "computer networks",
    "computer network",
    "networking",
    "networks",
  ],

  "Database management systems": [
    "dbms",
    "database management system",
    "database management systems",
  ],

  "Communication": [
    "communication",
    "communication skills",
    "verbal communication",
    "written communication",
  ],

  "Teamwork": [
    "teamwork",
    "team work",
    "team player",
    "collaboration",
    "collaborative",
  ],

  "Leadership": [
    "leadership",
    "leadership skills",
    "team leadership",
  ],

  "Problem solving": [
    "problem solving",
    "problem-solving",
    "problem solving skills",
  ],

  "Time management": [
    "time management",
    "time-management",
  ],

  "Adaptability": [
    "adaptability",
    "adaptable",
    "flexibility",
    "flexible",
  ],

  "Creativity": [
    "creativity",
    "creative thinking",
    "creative",
  ],

  "Critical thinking": [
    "critical thinking",
    "critical-thinking",
  ],

  "English": [
    "english",
    "english language",
  ],

  "Tamil": [
    "tamil",
    "tamil language",
  ],

  "Hindi": [
    "hindi",
    "hindi language",
  ],

  "French": [
    "french",
    "french language",
  ],

  "German": [
    "german",
    "german language",
  ],

  "Spanish": [
    "spanish",
    "spanish language",
  ],

  "Japanese": [
    "japanese",
    "japanese language",
  ],

  "Malayalam": [
    "malayalam",
    "malayalam language",
  ],

  "Telugu": [
    "telugu",
    "telugu language",
  ],

  "Kannada": [
    "kannada",
    "kannada language",
  ],
};

// ============================================================
// PROJECT-LEVEL CLASSIFICATION
// ============================================================

const LANGUAGE_NAMES = new Set([
  "english",
  "tamil",
  "hindi",
  "french",
  "german",
  "spanish",
  "japanese",
  "malayalam",
  "telugu",
  "kannada",
  "marathi",
  "bengali",
  "gujarati",
  "punjabi",
  "urdu",
  "arabic",
  "chinese",
  "mandarin",
  "korean",
  "russian",
  "italian",
  "portuguese",
]);

const SOFT_SKILLS = new Set([
  "communication",
  "teamwork",
  "leadership",
  "problem solving",
  "time management",
  "adaptability",
  "creativity",
  "critical thinking",
  "decision making",
  "interpersonal skills",
  "team building",
  "conflict management",
  "negotiation",
  "presentation skills",
  "organizational skills",
  "work ethic",
  "attention to detail",
  "emotional intelligence",
  "active listening",
]);

function classifySkill(
  skill: ExtractedSkill
): "technical" | "soft" | "languages" {
  const label = normalizeText(skill.preferred_label);

  // ----------------------------------------------------------
  // 1. Languages have highest priority
  // ----------------------------------------------------------

  if (LANGUAGE_NAMES.has(label)) {
    return "languages";
  }

  // ----------------------------------------------------------
  // 2. Soft skills
  // ----------------------------------------------------------

  if (SOFT_SKILLS.has(label)) {
    return "soft";
  }

  // Check partial soft-skill matches
  for (const softSkill of SOFT_SKILLS) {
    if (
      label.includes(softSkill) ||
      softSkill.includes(label)
    ) {
      return "soft";
    }
  }

  // ----------------------------------------------------------
  // 3. Everything else is treated as technical
  // ----------------------------------------------------------

  return "technical";
}

// ============================================================
// FIND TAXONOMY SKILL LABEL
// ============================================================

function getSkillLabel(skill: ESCOskill): string {
  return (
    skill.preferred_label ||
    skill.skill ||
    ""
  ).trim();
}

// ============================================================
// MAIN EXTRACTION FUNCTION
// ============================================================

export function extractSkillsFromResume(
  resumeText: string
): CategorizedSkills {

  console.log(
    "=========================================="
  );

  console.log(
    "RESUME TEXT LENGTH:",
    resumeText.length
  );

  console.log(
    "RESUME TEXT PREVIEW:",
    resumeText.substring(0, 500)
  );

  console.log(
    "=========================================="
  );

  if (!resumeText || !resumeText.trim()) {
    console.warn(
      "Resume contains no extractable text."
    );

    return {
      technical: [],
      soft: [],
      languages: [],
    };
  }

  const normalizedResume =
    normalizeText(resumeText);

  const taxonomy = loadTaxonomy();

  console.log(
    "ESCO TAXONOMY SIZE:",
    taxonomy.length
  );

  const found = new Map<string, ExtractedSkill>();

  // ==========================================================
  // 1. MATCH USING ESCO TAXONOMY
  // ==========================================================

  for (const skill of taxonomy) {

    const label = getSkillLabel(skill);

    if (!label || !skill.skill_id) {
      continue;
    }

    const normalizedLabel =
      normalizeText(label);

    if (!normalizedLabel) {
      continue;
    }

    // Avoid matching extremely short labels
    if (normalizedLabel.length < 3) {
      continue;
    }

    const pattern = new RegExp(
      `(^|\\s)${escapeRegex(
        normalizedLabel
      )}(?=\\s|$)`,
      "i"
    );

    if (pattern.test(normalizedResume)) {

      found.set(skill.skill_id, {
        skill_id: skill.skill_id,
        preferred_label: label,
        skill_type:
          skill.skill_type || null,
        description:
          skill.description || null,
      });
    }
  }

  // ==========================================================
  // 2. MATCH COMMON RESUME ALIASES
  // ==========================================================

  for (
    const [escoLabel, skillAliases]
    of Object.entries(aliases)
  ) {

    let matchedAlias = false;

    for (const alias of skillAliases) {

      const normalizedAlias =
        normalizeText(alias);

      if (!normalizedAlias) {
        continue;
      }

      const pattern = new RegExp(
        `(^|\\s)${escapeRegex(
          normalizedAlias
        )}(?=\\s|$)`,
        "i"
      );

      if (
        pattern.test(normalizedResume)
      ) {
        matchedAlias = true;
        break;
      }
    }

    if (!matchedAlias) {
      continue;
    }

    // --------------------------------------------------------
    // Find corresponding ESCO skill
    // --------------------------------------------------------

    const taxonomySkill =
      taxonomy.find(
        (skill) =>
          normalizeText(
            getSkillLabel(skill)
          ) === normalizeText(escoLabel)
      );

    if (taxonomySkill) {

      found.set(
        taxonomySkill.skill_id,
        {
          skill_id:
            taxonomySkill.skill_id,

          preferred_label:
            getSkillLabel(
              taxonomySkill
            ),

          skill_type:
            taxonomySkill.skill_type ||
            null,

          description:
            taxonomySkill.description ||
            null,
        }
      );

    } else {

      // If taxonomy label is slightly different,
      // find using partial normalized matching.

      const lowerLabel =
        normalizeText(escoLabel);

      const alternative =
        taxonomy.find((skill) => {

          const label =
            normalizeText(
              getSkillLabel(skill)
            );

          return (
            label === lowerLabel ||
            label.includes(lowerLabel) ||
            lowerLabel.includes(label)
          );
        });

      if (alternative) {

        found.set(
          alternative.skill_id,
          {
            skill_id:
              alternative.skill_id,

            preferred_label:
              getSkillLabel(
                alternative
              ),

            skill_type:
              alternative.skill_type ||
              null,

            description:
              alternative.description ||
              null,
          }
        );
      }
    }
  }

  // ==========================================================
  // 3. CATEGORIZE
  // ==========================================================

  const technical: ExtractedSkill[] = [];
  const soft: ExtractedSkill[] = [];
  const languages: ExtractedSkill[] = [];

  for (const skill of found.values()) {

    const category =
      classifySkill(skill);

    if (category === "technical") {
      technical.push(skill);
    }

    else if (category === "soft") {
      soft.push(skill);
    }

    else if (category === "languages") {
      languages.push(skill);
    }
  }

  // ==========================================================
  // 4. SORT ALPHABETICALLY
  // ==========================================================

  technical.sort((a, b) =>
    a.preferred_label.localeCompare(
      b.preferred_label
    )
  );

  soft.sort((a, b) =>
    a.preferred_label.localeCompare(
      b.preferred_label
    )
  );

  languages.sort((a, b) =>
    a.preferred_label.localeCompare(
      b.preferred_label
    )
  );

  console.log(
    "TECHNICAL SKILLS:",
    technical.map(
      (skill) =>
        skill.preferred_label
    )
  );

  console.log(
    "SOFT SKILLS:",
    soft.map(
      (skill) =>
        skill.preferred_label
    )
  );

  console.log(
    "LANGUAGES:",
    languages.map(
      (skill) =>
        skill.preferred_label
    )
  );

  console.log(
    "TOTAL SKILLS:",
    technical.length +
      soft.length +
      languages.length
  );

  console.log(
    "=========================================="
  );

  return {
    technical,
    soft,
    languages,
  };
}