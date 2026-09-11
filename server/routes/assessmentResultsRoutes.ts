import { Router } from "express";
import fs from "fs";
import path from "path";
import db from "../database/db";

const router = Router();

/* =========================================================
   DATABASE TABLE
========================================================= */

db.prepare(`
  CREATE TABLE IF NOT EXISTS assessment_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    occupation_id TEXT NOT NULL,
    assessment_type TEXT NOT NULL,
    score REAL NOT NULL,
    details TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();

/* =========================================================
   HELPERS
========================================================= */

function dataPath(fileName: string) {
  return path.join(
    process.cwd(),
    "data",
    fileName
  );
}

function safeJsonRead(fileName: string) {
  const file = dataPath(fileName);

  return JSON.parse(
    fs.readFileSync(file, "utf-8")
  );
}

/* =========================================================
   SAVE RESULT
========================================================= */

function saveResult(
  studentId: number,
  occupationId: string,
  assessmentType: string,
  score: number,
  details: any = {}
) {

  const existing = db
    .prepare(`
      SELECT id
      FROM assessment_results
      WHERE student_id = ?
        AND occupation_id = ?
        AND assessment_type = ?
      ORDER BY id DESC
      LIMIT 1
    `)
    .get(
      studentId,
      occupationId,
      assessmentType
    ) as { id: number } | undefined;

  if (existing) {

    db.prepare(`
      UPDATE assessment_results
      SET score = ?,
          details = ?,
          created_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      score,
      JSON.stringify(details),
      existing.id
    );

  } else {

    db.prepare(`
      INSERT INTO assessment_results
      (
        student_id,
        occupation_id,
        assessment_type,
        score,
        details
      )
      VALUES (?, ?, ?, ?, ?)
    `).run(
      studentId,
      occupationId,
      assessmentType,
      score,
      JSON.stringify(details)
    );
  }
}

/* =========================================================
   TECHNICAL MCQ
========================================================= */

router.post(
  "/technical",
  (req, res) => {

    try {

      const {
        studentId,
        occupationId,
        answers,
      } = req.body;

      if (
        !studentId ||
        !occupationId ||
        !answers
      ) {
        return res.status(400).json({
          success: false,
          message:
            "studentId, occupationId and answers are required.",
        });
      }

      const dataset =
        safeJsonRead(
          "technical_mcqs.json"
        );

      const questions =
        Array.isArray(dataset)
          ? dataset
          : dataset.questions || [];

      let total = 0;
      let correct = 0;

      for (
        const question of questions
      ) {

        const submitted =
          answers[String(question.id)] ??
          answers[question.id];

        if (
          submitted === undefined ||
          submitted === null ||
          submitted === ""
        ) {
          continue;
        }

        total++;

        const correctOption =
          String(
            question.correct_option ||
            question.answer ||
            ""
          ).toUpperCase();

        if (
          String(submitted)
            .toUpperCase() ===
          correctOption
        ) {
          correct++;
        }
      }

      const score =
        total === 0
          ? 0
          : (correct / total) * 100;

      saveResult(
        Number(studentId),
        String(occupationId),
        "technical_assessment",
        score,
        {
          totalAnswered: total,
          correct,
          incorrect:
            total - correct,
        }
      );

      return res.json({
        success: true,
        score:
          Math.round(score * 100) / 100,
        totalAnswered: total,
        correct,
        incorrect:
          total - correct,
      });

    } catch (error) {

      console.error(
        "Technical scoring error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to score technical assessment.",
      });
    }
  }
);

/* =========================================================
   APTITUDE
========================================================= */

router.post(
  "/aptitude",
  (req, res) => {

    try {

      const {
        studentId,
        occupationId,
        answers,
      } = req.body;

      if (
        !studentId ||
        !occupationId ||
        !answers
      ) {
        return res.status(400).json({
          success: false,
          message:
            "studentId, occupationId and answers are required.",
        });
      }

      const dataset =
        safeJsonRead(
          "aptitude_questions.json"
        );

      const questions =
        Array.isArray(dataset)
          ? dataset
          : dataset.questions || [];

      let total = 0;
      let correct = 0;

      for (
        const question of questions
      ) {

        const submitted =
          answers[String(question.id)] ??
          answers[question.id];

        if (
          submitted === undefined ||
          submitted === null ||
          submitted === ""
        ) {
          continue;
        }

        total++;

        const expected =
          String(
            question.answer ?? ""
          )
            .trim()
            .toLowerCase();

        const actual =
          String(submitted)
            .trim()
            .toLowerCase();

        if (
          expected &&
          actual === expected
        ) {
          correct++;
        }
      }

      const score =
        total === 0
          ? 0
          : (correct / total) * 100;

      saveResult(
        Number(studentId),
        String(occupationId),
        "aptitude_assessment",
        score,
        {
          totalAnswered: total,
          correct,
        }
      );

      return res.json({
        success: true,
        score:
          Math.round(score * 100) / 100,
        totalAnswered: total,
        correct,
      });

    } catch (error) {

      console.error(
        "Aptitude scoring error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to score aptitude assessment.",
      });
    }
  }
);

/* =========================================================
   CODING
========================================================= */

router.post(
  "/coding",
  (req, res) => {

    try {

      const {
        studentId,
        occupationId,
        passedTests,
        totalTests,
      } = req.body;

      if (
        !studentId ||
        !occupationId ||
        typeof passedTests !==
          "number" ||
        typeof totalTests !==
          "number"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "studentId, occupationId, passedTests and totalTests are required.",
        });
      }

      const score =
        totalTests > 0
          ? (
              passedTests /
              totalTests
            ) *
            100
          : 0;

      saveResult(
        Number(studentId),
        String(occupationId),
        "coding_assessment",
        score,
        {
          passedTests,
          totalTests,
        }
      );

      return res.json({
        success: true,
        score:
          Math.round(score * 100) / 100,
        passedTests,
        totalTests,
      });

    } catch (error) {

      console.error(
        "Coding scoring error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to save coding assessment.",
      });
    }
  }
);

/* =========================================================
   AI INTERVIEW
========================================================= */

router.post(
  "/interview",
  (req, res) => {

    try {

      const {
        studentId,
        occupationId,
        overallScore,
        technicalScore,
        communicationScore,
      } = req.body;

      if (
        !studentId ||
        !occupationId ||
        typeof overallScore !==
          "number"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "studentId, occupationId and overallScore are required.",
        });
      }

      saveResult(
        Number(studentId),
        String(occupationId),
        "adaptive_interview",
        overallScore,
        {
          technicalScore:
            technicalScore ?? null,

          communicationScore:
            communicationScore ?? null,
        }
      );

      return res.json({
        success: true,
        score:
          Math.round(
            overallScore * 100
          ) / 100,
      });

    } catch (error) {

      console.error(
        "Interview result error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to save interview result.",
      });
    }
  }
);

/* =========================================================
   GET ALL RESULTS
========================================================= */

router.get(
  "/:studentId/:occupationId",
  (req, res) => {

    try {

      const studentId =
        Number(req.params.studentId);

      const occupationId =
        decodeURIComponent(
          req.params.occupationId
        );

      const results =
        db.prepare(`
          SELECT
            assessment_type,
            score,
            details,
            created_at
          FROM assessment_results
          WHERE student_id = ?
            AND occupation_id = ?
          ORDER BY created_at DESC
        `).all(
          studentId,
          occupationId
        );

      return res.json({
        success: true,
        results,
      });

    } catch (error) {

      console.error(
        "Assessment result fetch error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load assessment results.",
      });
    }
  }
);

export default router;