import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

interface AptitudeQuestion {
  id: number;
  subject: string;
  level: string;
  category: string;
  question: string;
  answer: string;
  solution: string;
}

const aptitudePath = path.join(
  __dirname,
  "../data/aptitude_questions.json"
);

const aptitudeQuestions: AptitudeQuestion[] = JSON.parse(
  fs.readFileSync(aptitudePath, "utf-8")
);

/*
 * GET APTITUDE QUESTIONS
 *
 * Example:
 * /api/assessments/aptitude/questions?count=10
 */
router.get("/aptitude/questions", (req, res) => {
  try {
    const requestedCount = Number(req.query.count || 10);

    const count = Math.min(
      Math.max(requestedCount, 1),
      20
    );

    /*
     * Shuffle questions so every assessment
     * does not always use the same order.
     */
    const shuffled = [...aptitudeQuestions].sort(
      () => Math.random() - 0.5
    );

    const selected = shuffled
      .slice(0, count)
      .map((question) => ({
        id: question.id,
        subject: question.subject,
        level: question.level,
        category: question.category,
        question: question.question,
        answer: question.answer,
      }));

    res.json({
      success: true,
      assessment: "aptitude",
      question_count: selected.length,
      questions: selected,
    });
  } catch (error) {
    console.error(
      "APTITUDE QUESTIONS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to load aptitude questions",
    });
  }
});

export default router;