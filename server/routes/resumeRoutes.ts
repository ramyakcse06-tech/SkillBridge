import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";
import { createWorker } from "tesseract.js";

import db from "../database/db";
import { extractSkillsFromResume } from "../services/skillExtractor";

const router = Router();

// ============================================================
// UPLOAD DIRECTORY
// ============================================================

const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ============================================================
// MULTER
// ============================================================

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );

    const uniqueName = `${Date.now()}-${safeName}`;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF resumes are allowed"));
    }
  },
});

// ============================================================
// NORMALIZE TEXT
// ============================================================

function cleanText(text: string): string {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ============================================================
// NORMAL PDF TEXT EXTRACTION
// ============================================================

async function extractPdfText(
  pdfBuffer: Buffer
): Promise<string> {
  const parser = new PDFParse({
    data: pdfBuffer,
  });

  try {
    const result = await parser.getText();

    const text = cleanText(
      result.text || ""
    );

    console.log(
      "NORMAL PDF TEXT LENGTH:",
      text.length
    );

    console.log(
      "NORMAL PDF TEXT PREVIEW:",
      text.substring(0, 500)
    );

    return text;
  } finally {
    await parser.destroy();
  }
}

// ============================================================
// OCR FALLBACK
// ============================================================

async function extractTextUsingOCR(
  pdfBuffer: Buffer
): Promise<string> {

  console.log(
    "=========================================="
  );

  console.log(
    "NO TEXT LAYER FOUND."
  );

  console.log(
    "STARTING OCR FALLBACK..."
  );

  console.log(
    "=========================================="
  );

  const parser = new PDFParse({
    data: pdfBuffer,
  });

  let worker: any = null;

  try {

    // --------------------------------------------------------
    // GET NUMBER OF PAGES
    // --------------------------------------------------------

    const textResult =
      await parser.getText();

    const totalPages =
      textResult.total || 1;

    console.log(
      "PDF PAGES:",
      totalPages
    );

    // --------------------------------------------------------
    // START TESSERACT
    // --------------------------------------------------------

    worker = await createWorker(
      "eng"
    );

    let completeText = "";

    // --------------------------------------------------------
    // OCR EVERY PAGE
    // --------------------------------------------------------

    for (
      let page = 1;
      page <= totalPages;
      page++
    ) {

      console.log(
        `OCR processing page ${page}/${totalPages}...`
      );

      const screenshot =
        await parser.getScreenshot({
          partial: [page],
          scale: 2,
          imageBuffer: true,
          imageDataUrl: false,
        });

      if (
        !screenshot.pages ||
        screenshot.pages.length === 0
      ) {
        console.warn(
          `Could not render page ${page}`
        );

        continue;
      }

      const imageBuffer =
        screenshot.pages[0].data;

      const result =
        await worker.recognize(
          imageBuffer
        );

      const pageText =
        result.data.text || "";

      console.log(
        `OCR page ${page} text length:`,
        pageText.length
      );

      completeText +=
        "\n" +
        pageText;
    }

    const finalText =
      cleanText(completeText);

    console.log(
      "=========================================="
    );

    console.log(
      "OCR FINAL TEXT LENGTH:",
      finalText.length
    );

    console.log(
      "OCR TEXT PREVIEW:",
      finalText.substring(0, 500)
    );

    console.log(
      "=========================================="
    );

    return finalText;

  } finally {

    if (worker) {
      await worker.terminate();
    }

    await parser.destroy();
  }
}

// ============================================================
// RESUME CONTENT VALIDATION
// ============================================================
//
// IMPORTANT:
// This checks the CONTENT of the PDF.
//
// A PDF extension alone is NOT enough.
//
// Examples that should be rejected:
// - Class notes
// - Study material
// - Assignment PDFs
// - Textbook pages
// - Question papers
// - Random documents
//
// Examples that should be accepted:
// - Student resume
// - CV
// - Internship resume
// - Fresher resume
// ============================================================

interface ResumeValidationResult {
  isResume: boolean;
  score: number;
  reasons: string[];
  detectedSections: string[];
}

function validateResumeContent(
  text: string
): ResumeValidationResult {

  const normalized = text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const reasons: string[] = [];
  const detectedSections: string[] = [];

  let score = 0;

  // ----------------------------------------------------------
  // BASIC TEXT CHECK
  // ----------------------------------------------------------

  if (normalized.length < 150) {
    return {
      isResume: false,
      score: 0,
      reasons: [
        "The document contains too little readable text to be a resume.",
      ],
      detectedSections: [],
    };
  }

  // ----------------------------------------------------------
  // CONTACT INFORMATION
  // ----------------------------------------------------------

  const emailRegex =
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

  const phoneRegex =
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3,5}\)?[\s.-]?)?\d{5,10}/;

  const hasEmail =
    emailRegex.test(text);

  const hasPhone =
    phoneRegex.test(text);

  if (hasEmail) {
    score += 2;
    reasons.push("Email address detected");
  }

  if (hasPhone) {
    score += 2;
    reasons.push("Phone number detected");
  }

  // ----------------------------------------------------------
  // RESUME SECTIONS
  // ----------------------------------------------------------

  const sectionPatterns: {
    name: string;
    patterns: RegExp[];
    points: number;
  }[] = [

    {
      name: "Education",
      patterns: [
        /\beducation\b/i,
        /\bacademic background\b/i,
        /\bacademic qualification\b/i,
        /\bqualifications\b/i,
      ],
      points: 2,
    },

    {
      name: "Skills",
      patterns: [
        /\bskills\b/i,
        /\btechnical skills\b/i,
        /\btechnical expertise\b/i,
        /\bcore skills\b/i,
        /\btechnologies\b/i,
      ],
      points: 2,
    },

    {
      name: "Projects",
      patterns: [
        /\bprojects\b/i,
        /\bacademic projects\b/i,
        /\bpersonal projects\b/i,
        /\bproject experience\b/i,
      ],
      points: 2,
    },

    {
      name: "Experience",
      patterns: [
        /\bexperience\b/i,
        /\bwork experience\b/i,
        /\bprofessional experience\b/i,
        /\binternship\b/i,
        /\binternships\b/i,
      ],
      points: 2,
    },

    {
      name: "Certifications",
      patterns: [
        /\bcertifications\b/i,
        /\bcertificates\b/i,
        /\bprofessional certifications\b/i,
      ],
      points: 1,
    },

    {
      name: "Achievements",
      patterns: [
        /\bachievements\b/i,
        /\bawards\b/i,
        /\bhonors\b/i,
        /\baccomplishments\b/i,
      ],
      points: 1,
    },

    {
      name: "Career Objective",
      patterns: [
        /\bcareer objective\b/i,
        /\bobjective\b/i,
        /\bcareer summary\b/i,
        /\bprofessional summary\b/i,
        /\bprofile summary\b/i,
        /\bsummary\b/i,
      ],
      points: 1,
    },

    {
      name: "Languages",
      patterns: [
        /\blanguages\b/i,
        /\blanguage proficiency\b/i,
      ],
      points: 1,
    },

  ];

  for (const section of sectionPatterns) {

    const found =
      section.patterns.some(
        (pattern) =>
          pattern.test(normalized)
      );

    if (found) {

      score += section.points;

      detectedSections.push(
        section.name
      );
    }
  }

  // ----------------------------------------------------------
  // PROFESSIONAL / RESUME KEYWORDS
  // ----------------------------------------------------------

  const resumeKeywords = [
    "resume",
    "curriculum vitae",
    "cv",
    "linkedin",
    "github",
    "portfolio",
    "objective",
    "education",
    "skills",
    "projects",
    "experience",
    "internship",
    "certification",
    "certifications",
    "achievement",
    "achievements",
    "technical skills",
    "profile",
    "summary",
    "contact",
  ];

  let keywordMatches = 0;

  for (const keyword of resumeKeywords) {
    if (normalized.includes(keyword)) {
      keywordMatches++;
    }
  }

  // Give additional evidence, but don't let keywords alone
  // make a document pass.
  if (keywordMatches >= 5) {
    score += 2;
  } else if (keywordMatches >= 3) {
    score += 1;
  }

  // ----------------------------------------------------------
  // EDUCATION DETAILS
  // ----------------------------------------------------------

  const educationEvidence = [
    /\bbachelor\b/i,
    /\bmaster\b/i,
    /\bengineering\b/i,
    /\bb\.?e\.?\b/i,
    /\bb\.?tech\b/i,
    /\bm\.?e\.?\b/i,
    /\bm\.?tech\b/i,
    /\bdegree\b/i,
    /\bcollege\b/i,
    /\buniversity\b/i,
    /\bschool\b/i,
    /\bgpa\b/i,
    /\bcgpa\b/i,
    /\bpercentage\b/i,
    /\bgraduation\b/i,
  ];

  const educationEvidenceCount =
    educationEvidence.filter(
      (pattern) =>
        pattern.test(normalized)
    ).length;

  if (educationEvidenceCount >= 2) {
    score += 2;
  }

  // ----------------------------------------------------------
  // WORK / INTERNSHIP EVIDENCE
  // ----------------------------------------------------------

  const experienceEvidence = [
    /\bworked\b/i,
    /\bdeveloper\b/i,
    /\bsoftware engineer\b/i,
    /\bintern\b/i,
    /\binternship\b/i,
    /\bcompany\b/i,
    /\brole\b/i,
    /\bresponsibilities\b/i,
    /\bemployed\b/i,
    /\bexperience\b/i,
  ];

  const experienceEvidenceCount =
    experienceEvidence.filter(
      (pattern) =>
        pattern.test(normalized)
    ).length;

  if (experienceEvidenceCount >= 2) {
    score += 1;
  }

  // ----------------------------------------------------------
  // PROJECT EVIDENCE
  // ----------------------------------------------------------

  const projectEvidence = [
    /\bproject\b/i,
    /\bdeveloped\b/i,
    /\bbuilt\b/i,
    /\bimplemented\b/i,
    /\bdesigned\b/i,
    /\bcreated\b/i,
    /\bapplication\b/i,
    /\bsystem\b/i,
    /\bwebsite\b/i,
    /\bsoftware\b/i,
  ];

  const projectEvidenceCount =
    projectEvidence.filter(
      (pattern) =>
        pattern.test(normalized)
    ).length;

  if (projectEvidenceCount >= 3) {
    score += 2;
  }

  // ----------------------------------------------------------
  // TECHNICAL SKILL EVIDENCE
  // ----------------------------------------------------------

  const technicalKeywords = [
    "java",
    "python",
    "c++",
    "c programming",
    "javascript",
    "typescript",
    "react",
    "node.js",
    "nodejs",
    "sql",
    "mysql",
    "oracle",
    "mongodb",
    "html",
    "css",
    "git",
    "github",
    "docker",
    "aws",
    "azure",
    "machine learning",
    "artificial intelligence",
    "data structures",
    "algorithms",
    "spring boot",
    "django",
    "flask",
    "express",
    "angular",
    "power bi",
    "tableau",
    "excel",
  ];

  let technicalMatchCount = 0;

  for (const keyword of technicalKeywords) {
    if (normalized.includes(keyword)) {
      technicalMatchCount++;
    }
  }

  if (technicalMatchCount >= 3) {
    score += 2;
  } else if (technicalMatchCount >= 1) {
    score += 1;
  }

  // ----------------------------------------------------------
  // PERSONAL PROFILE EVIDENCE
  // ----------------------------------------------------------

  const personalEvidence = [
    /\bemail\b/i,
    /\bphone\b/i,
    /\bmobile\b/i,
    /\baddress\b/i,
    /\blinkedin\b/i,
    /\bgithub\b/i,
    /\bportfolio\b/i,
  ];

  const personalEvidenceCount =
    personalEvidence.filter(
      (pattern) =>
        pattern.test(normalized)
    ).length;

  if (personalEvidenceCount >= 2) {
    score += 1;
  }

  // ----------------------------------------------------------
  // QUESTION PAPER / CLASS NOTES DETECTION
  // ----------------------------------------------------------

  const documentIndicators = [
    "question paper",
    "question bank",
    "unit i",
    "unit ii",
    "unit iii",
    "unit iv",
    "unit v",
    "multiple choice questions",
    "mcq",
    "choose the correct answer",
    "fill in the blanks",
    "short answer questions",
    "long answer questions",
    "assignment",
    "laboratory manual",
    "lab manual",
    "lecture notes",
    "course notes",
    "study material",
    "study notes",
    "chapter",
    "contents",
    "table of contents",
    "references",
    "bibliography",
  ];

  let documentIndicatorCount = 0;

  for (const indicator of documentIndicators) {
    if (normalized.includes(indicator)) {
      documentIndicatorCount++;
    }
  }

  // Strong document evidence reduces score.
  if (documentIndicatorCount >= 3) {
    score -= 5;
  } else if (documentIndicatorCount >= 2) {
    score -= 3;
  } else if (documentIndicatorCount === 1) {
    score -= 1;
  }

  // ----------------------------------------------------------
  // REPETITIVE / EDUCATIONAL MATERIAL CHECK
  // ----------------------------------------------------------

  const academicMaterialIndicators = [
    "learning objectives",
    "course objectives",
    "course outcomes",
    "unit objectives",
    "definition:",
    "introduction:",
    "advantages:",
    "disadvantages:",
    "applications:",
    "example:",
    "examples:",
    "theory",
    "algorithm",
    "syntax",
    "output:",
  ];

  let academicIndicatorCount = 0;

  for (const indicator of academicMaterialIndicators) {
    if (normalized.includes(indicator)) {
      academicIndicatorCount++;
    }
  }

  if (academicIndicatorCount >= 5) {
    score -= 4;
  } else if (academicIndicatorCount >= 3) {
    score -= 2;
  }

  // ----------------------------------------------------------
  // PAGE / TEXT LENGTH SANITY
  // ----------------------------------------------------------

  // Extremely long educational documents are unlikely to be
  // normal resumes.
  if (normalized.length > 50000) {
    score -= 3;
  }

  // ----------------------------------------------------------
  // REQUIRED RESUME STRUCTURE
  // ----------------------------------------------------------

  const hasContact =
    hasEmail || hasPhone;

  const hasCoreSection =
    detectedSections.includes("Education") ||
    detectedSections.includes("Skills") ||
    detectedSections.includes("Projects") ||
    detectedSections.includes("Experience");

  const hasMultipleCoreSections =
    [
      "Education",
      "Skills",
      "Projects",
      "Experience",
      "Certifications",
      "Achievements",
    ].filter(
      (section) =>
        detectedSections.includes(section)
    ).length >= 2;

  // ----------------------------------------------------------
  // FINAL DECISION
  // ----------------------------------------------------------

  let isResume = false;

  /*
   * A good resume should have:
   *
   * 1. Contact information
   * 2. At least one meaningful resume section
   * 3. Evidence of education / skills / projects / experience
   *
   * AND should not strongly resemble study material.
   */

  if (
    hasContact &&
    hasCoreSection &&
    hasMultipleCoreSections &&
    score >= 8 &&
    documentIndicatorCount < 3
  ) {
    isResume = true;
  }

  // ----------------------------------------------------------
  // EXTRA SAFETY RULE
  // ----------------------------------------------------------

  // If there are no contact details AND very little resume
  // structure, reject the document.
  if (
    !hasContact &&
    detectedSections.length < 3
  ) {
    isResume = false;
  }

  if (!isResume) {

    if (!hasContact) {
      reasons.push(
        "No clear email address or phone number was detected."
      );
    }

    if (!hasCoreSection) {
      reasons.push(
        "No major resume section such as Education, Skills, Projects, or Experience was detected."
      );
    }

    if (!hasMultipleCoreSections) {
      reasons.push(
        "The document does not contain enough resume sections."
      );
    }

    if (documentIndicatorCount >= 2) {
      reasons.push(
        "The document contains strong indicators of study material, notes, assignments, or question papers."
      );
    }

    reasons.push(
      "The uploaded PDF does not appear to contain a valid resume/CV."
    );
  }

  return {
    isResume,
    score: Math.max(score, 0),
    reasons,
    detectedSections,
  };
}

// ============================================================
// UPLOAD + EXTRACT + VALIDATE + SAVE
// ============================================================

router.post(
  "/upload",
  upload.single("resume"),
  async (req, res) => {

    let uploadedFilePath: string | null = null;

    try {

      // ======================================================
      // 1. STUDENT ID
      // ======================================================

      const studentId =
        Number(req.body.studentId);

      if (!studentId) {

        return res.status(400).json({
          success: false,
          message:
            "studentId is required",
        });
      }

      // ======================================================
      // 2. CHECK STUDENT
      // ======================================================

      const student =
        db
          .prepare(
            `
            SELECT id, name
            FROM students
            WHERE id = ?
            `
          )
          .get(studentId) as
          | {
              id: number;
              name: string;
            }
          | undefined;

      if (!student) {

        return res.status(404).json({
          success: false,
          message:
            "Student not found",
        });
      }

      // ======================================================
      // 3. CHECK FILE
      // ======================================================

      if (!req.file) {

        return res.status(400).json({
          success: false,
          message:
            "Please upload a PDF resume",
        });
      }

      uploadedFilePath =
        req.file.path;

      // ======================================================
      // 4. READ PDF
      // ======================================================

      const filePath =
        req.file.path;

      const pdfBuffer =
        fs.readFileSync(filePath);

      console.log(
        "=========================================="
      );

      console.log(
        "PROCESSING RESUME:",
        req.file.originalname
      );

      console.log(
        "FILE SIZE:",
        req.file.size
      );

      console.log(
        "=========================================="
      );

      // ======================================================
      // 5. NORMAL TEXT EXTRACTION
      // ======================================================

      let resumeText =
        await extractPdfText(
          pdfBuffer
        );

      // ======================================================
      // 6. OCR FALLBACK
      // ======================================================

      if (
        resumeText.length < 50
      ) {

        console.log(
          "Normal extraction returned very little text."
        );

        console.log(
          "Trying OCR..."
        );

        resumeText =
          await extractTextUsingOCR(
            pdfBuffer
          );
      }

      // ======================================================
      // 7. CHECK FINAL TEXT
      // ======================================================

      if (!resumeText.trim()) {

        return res.status(422).json({

          success: false,

          isResume: false,

          message:
            "Could not extract readable text from this PDF. Please upload a clearer resume.",

          text_length: 0,

          skill_count: 0,

          skills: [],
        });
      }

      console.log(
        "FINAL RESUME TEXT LENGTH:",
        resumeText.length
      );

      // ======================================================
      // 8. VALIDATE ACTUAL RESUME CONTENT
      // ======================================================

      console.log(
        "=========================================="
      );

      console.log(
        "VALIDATING RESUME CONTENT..."
      );

      const validation =
        validateResumeContent(
          resumeText
        );

      console.log(
        "RESUME VALIDATION SCORE:",
        validation.score
      );

      console.log(
        "DETECTED SECTIONS:",
        validation.detectedSections
      );

      console.log(
        "IS VALID RESUME:",
        validation.isResume
      );

      console.log(
        "=========================================="
      );

      // ======================================================
      // 9. REJECT NON-RESUME PDF
      // ======================================================

      if (!validation.isResume) {

        console.log(
          "REJECTED: PDF does not appear to be a resume."
        );

        // Delete invalid uploaded file
        try {
          if (
            uploadedFilePath &&
            fs.existsSync(uploadedFilePath)
          ) {
            fs.unlinkSync(
              uploadedFilePath
            );
          }
        } catch (deleteError) {
          console.warn(
            "Could not delete rejected file:",
            deleteError
          );
        }

        return res.status(422).json({

          success: false,

          isResume: false,

          message:
            "This PDF does not appear to be a valid resume. Please upload your resume/CV containing your education, skills, projects, experience, and contact details.",

          text_length:
            resumeText.length,

          validation_score:
            validation.score,

          detected_sections:
            validation.detectedSections,

          validation_reasons:
            validation.reasons,

          skill_count: 0,

          skills: [],
        });
      }

      // ======================================================
      // 10. EXTRACT + CATEGORIZE ESCO SKILLS
      // ======================================================

      const extractedSkills =
        extractSkillsFromResume(
          resumeText
        );

      const allSkills = [
        ...extractedSkills.technical,
        ...extractedSkills.soft,
        ...extractedSkills.languages,
      ];

      console.log(
        "TECHNICAL SKILL COUNT:",
        extractedSkills.technical.length
      );

      console.log(
        "SOFT SKILL COUNT:",
        extractedSkills.soft.length
      );

      console.log(
        "LANGUAGE COUNT:",
        extractedSkills.languages.length
      );

      console.log(
        "FINAL SKILL COUNT:",
        allSkills.length
      );

      // ======================================================
      // 11. OPTIONAL SKILL SAFETY CHECK
      // ======================================================

      /*
       * A document that passed resume validation should normally
       * contain some recognizable skills.
       *
       * However, don't reject every valid resume just because
       * the ESCO extractor found zero skills.
       *
       * We therefore only report the condition.
       */

      if (allSkills.length === 0) {

        console.warn(
          "WARNING: Resume passed content validation but no ESCO skills were extracted."
        );
      }

      // ======================================================
      // 12. DATABASE STATEMENTS
      // ======================================================

      const insertSkill =
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
            esco_skill_id =
              COALESCE(
                excluded.esco_skill_id,
                skills.esco_skill_id
              ),

            skill_type =
              excluded.skill_type,

            description =
              COALESCE(
                excluded.description,
                skills.description
              )
        `);

      const getSkill =
        db.prepare(`
          SELECT id
          FROM skills
          WHERE skill_name = ?
        `);

      const linkStudentSkill =
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
            source =
              excluded.source,

            confidence_score =
              excluded.confidence_score
        `);

      // ======================================================
      // 13. SAVE SKILLS
      // ======================================================

      const saveSkills =
        db.transaction(() => {

          for (const skill of allSkills) {

            // ------------------------------------------------
            // Determine project category
            // ------------------------------------------------

            let category = "technical";

            if (
              extractedSkills.languages.some(
                (item) =>
                  item.skill_id === skill.skill_id
              )
            ) {
              category = "language";
            }

            else if (
              extractedSkills.soft.some(
                (item) =>
                  item.skill_id === skill.skill_id
              )
            ) {
              category = "soft";
            }

            // ------------------------------------------------
            // SAVE ESCO SKILL + PROJECT CATEGORY
            // ------------------------------------------------

            insertSkill.run(
              skill.skill_id,
              skill.preferred_label,
              category,
              skill.description || null
            );

            // ------------------------------------------------
            // GET DATABASE SKILL ID
            // ------------------------------------------------

            const dbSkill =
              getSkill.get(
                skill.preferred_label
              ) as
                | { id: number }
                | undefined;

            if (!dbSkill) {

              throw new Error(
                `Could not find saved skill: ${skill.preferred_label}`
              );
            }

            // ------------------------------------------------
            // LINK STUDENT → SKILL
            // ------------------------------------------------

            linkStudentSkill.run(
              studentId,
              dbSkill.id,
              null,
              "resume",
              1.0
            );
          }
        });

      saveSkills();

      // ======================================================
      // 14. SUCCESS RESPONSE
      // ======================================================

      return res.json({

        success: true,

        isResume: true,

        message:
          "Valid resume detected and processed successfully",

        student_id:
          studentId,

        student_name:
          student.name,

        filename:
          req.file.filename,

        original_name:
          req.file.originalname,

        file_size:
          req.file.size,

        text_length:
          resumeText.length,

        validation_score:
          validation.score,

        detected_sections:
          validation.detectedSections,

        skill_count:
          allSkills.length,

        skills: {
          technical:
            extractedSkills.technical,

          soft:
            extractedSkills.soft,

          languages:
            extractedSkills.languages,
        },

        skillCounts: {
          technical:
            extractedSkills.technical.length,

          soft:
            extractedSkills.soft.length,

          languages:
            extractedSkills.languages.length,

          total:
            allSkills.length,
        },
      });

    } catch (error) {

      console.error(
        "=========================================="
      );

      console.error(
        "RESUME PROCESSING ERROR:"
      );

      console.error(error);

      console.error(
        "=========================================="
      );

      // ======================================================
      // DELETE FILE ON UNEXPECTED ERROR
      // ======================================================

      try {

        if (
          uploadedFilePath &&
          fs.existsSync(uploadedFilePath)
        ) {
          fs.unlinkSync(
            uploadedFilePath
          );
        }

      } catch (deleteError) {

        console.warn(
          "Could not delete uploaded file after error:",
          deleteError
        );
      }

      return res.status(500).json({

        success: false,

        isResume: false,

        message:
          "Failed to process resume",

        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }
);

// ============================================================
// MULTER ERROR HANDLER
// ============================================================

router.use(
  (
    error: any,
    _req: any,
    res: any,
    _next: any
  ) => {

    console.error(
      "UPLOAD ERROR:",
      error
    );

    if (
      error instanceof multer.MulterError
    ) {

      if (
        error.code === "LIMIT_FILE_SIZE"
      ) {

        return res.status(400).json({
          success: false,
          isResume: false,
          message:
            "File is too large. Maximum resume size is 5 MB.",
        });
      }

      return res.status(400).json({
        success: false,
        isResume: false,
        message:
          error.message,
      });
    }

    return res.status(400).json({
      success: false,
      isResume: false,
      message:
        error instanceof Error
          ? error.message
          : "Invalid file upload",
    });
  }
);

export default router;