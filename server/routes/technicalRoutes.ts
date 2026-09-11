import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

interface TechnicalQuestion {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_option: string;
  correct_answer: string;
  source: string;
}

const technicalPath = path.join(
  __dirname,
  "../data/technical_mcqs.json"
);

const technicalQuestions: TechnicalQuestion[] =
  JSON.parse(
    fs.readFileSync(technicalPath, "utf-8")
  );

/*
 * GET TECHNICAL MCQ QUESTIONS
 *
 * Example:
 * /api/assessments/technical/questions?count=10
 */
router.get("/technical/questions", (req, res) => {
  try {
    const requestedCount = Number(
      req.query.count || 10
    );

    const count = Math.min(
      Math.max(requestedCount, 1),
      20
    );

    /*
     * Randomize the question order.
     */
    const shuffled = [
      ...technicalQuestions,
    ].sort(() => Math.random() - 0.5);

    /*
     * IMPORTANT:
     * Do NOT send correct_option or
     * correct_answer to the frontend.
     */
    const selected = shuffled
      .slice(0, count)
      .map((question) => ({
        id: question.id,
        question: question.question,
        options: question.options,
        source: question.source,
      }));

    res.json({
      success: true,
      assessment: "technical_mcq",
      question_count: selected.length,
      questions: selected,
    });
  } catch (error) {
    console.error(
      "TECHNICAL QUESTIONS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to load technical MCQ questions",
    });
  }
});

export default router;