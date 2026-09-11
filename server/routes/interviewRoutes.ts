import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

interface InterviewQuestion {
  id: string;
  target_roles: string[];
  skill: string;
  subskill: string;
  difficulty: string;
  question_type: string;
  question: string;
  expected_concepts: string[];
  adaptive_follow_up: {
    if_strong: string;
    if_weak: string;
  };
  evaluation_focus: string[];
}

interface InterviewSession {
  sessionId: string;
  targetRole: string;
  selectedSkills: string[];
  askedQuestionIds: string[];
  currentQuestionId: string | null;
  questionCount: number;
  answers: {
    questionId: string;
    answer: string;
    score: number;
    evaluation: string;
  }[];
}

const questionPath = path.join(
  __dirname,
  "../data/interview_question_bank.json"
);

const rubricPath = path.join(
  __dirname,
  "../data/interview_rubrics.json"
);

const questionData = JSON.parse(
  fs.readFileSync(questionPath, "utf-8")
);

const rubricData = JSON.parse(
  fs.readFileSync(rubricPath, "utf-8")
);

const questions: InterviewQuestion[] =
  questionData.questions || [];

const sessions = new Map<
  string,
  InterviewSession
>();

/*
=========================================================
HELPERS
=========================================================
*/

function normalize(value: string) {
  return value
    .toLowerCase()
    .trim();
}

function roleMatches(
  question: InterviewQuestion,
  targetRole: string
) {
  const role = normalize(targetRole);

  return question.target_roles.some(
    (target) => {
      const normalizedTarget =
        normalize(target);

      return (
        normalizedTarget.includes(role) ||
        role.includes(normalizedTarget) ||
        normalizedTarget
          .split(" ")
          .some((word) =>
            role.includes(word)
          )
      );
    }
  );
}

function skillMatches(
  question: InterviewQuestion,
  selectedSkills: string[]
) {
  const questionSkill =
    normalize(question.skill);

  return selectedSkills.some((skill) => {
    const normalizedSkill =
      normalize(skill);

    return (
      questionSkill === normalizedSkill ||
      questionSkill.includes(
        normalizedSkill
      ) ||
      normalizedSkill.includes(
        questionSkill
      )
    );
  });
}

function selectFirstQuestion(
  targetRole: string,
  selectedSkills: string[]
) {
  /*
   * PRIORITY:
   *
   * 1. Target role + selected skill
   * 2. Selected skill
   * 3. Target role
   * 4. Any available question
   */

  let candidates =
    questions.filter(
      (question) =>
        roleMatches(
          question,
          targetRole
        ) &&
        skillMatches(
          question,
          selectedSkills
        )
    );

  if (candidates.length === 0) {
    candidates =
      questions.filter((question) =>
        skillMatches(
          question,
          selectedSkills
        )
      );
  }

  if (candidates.length === 0) {
    candidates =
      questions.filter((question) =>
        roleMatches(
          question,
          targetRole
        )
      );
  }

  if (candidates.length === 0) {
    candidates = questions;
  }

  /*
   * Prefer EASY for the first question.
   */

  const easyQuestion =
    candidates.find(
      (question) =>
        question.difficulty === "EASY"
    );

  return easyQuestion || candidates[0];
}

function selectNextQuestion(
  session: InterviewSession,
  previousScore: number
) {
  const unused =
    questions.filter(
      (question) =>
        !session.askedQuestionIds.includes(
          question.id
        )
    );

  if (unused.length === 0) {
    return null;
  }

  /*
   * Determine desired difficulty.
   */

  let desiredDifficulty =
    "MEDIUM";

  if (previousScore >= 4) {
    desiredDifficulty = "HARD";
  } else if (previousScore <= 2) {
    desiredDifficulty = "EASY";
  }

  /*
   * First prioritize selected skills.
   */

  let candidates =
    unused.filter(
      (question) =>
        skillMatches(
          question,
          session.selectedSkills
        )
    );

  /*
   * Then prioritize target role.
   */

  const roleCandidates =
    candidates.filter((question) =>
      roleMatches(
        question,
        session.targetRole
      )
    );

  if (roleCandidates.length > 0) {
    candidates = roleCandidates;
  }

  /*
   * Prefer adaptive difficulty.
   */

  const difficultyCandidates =
    candidates.filter(
      (question) =>
        question.difficulty ===
        desiredDifficulty
    );

  if (difficultyCandidates.length > 0) {
    candidates =
      difficultyCandidates;
  }

  /*
   * Fallback.
   */

  if (candidates.length === 0) {
    candidates = unused;
  }

  return candidates[0];
}

/*
=========================================================
SIMPLE MVP ANSWER EVALUATION
=========================================================
*/

function evaluateAnswer(
  question: InterviewQuestion,
  answer: string
) {
  const normalizedAnswer =
    normalize(answer);

  if (!normalizedAnswer) {
    return {
      score: 0,
      technicalScore: 0,
      relevanceScore: 0,
      completenessScore: 0,
      communicationScore: 0,
      evaluation:
        "No meaningful answer was provided.",
      strengths: [],
      weaknesses: [
        "No answer provided",
      ],
    };
  }

  /*
   * MVP evaluation:
   * compare expected concepts with
   * concepts appearing in the answer.
   */

  const matchedConcepts =
    question.expected_concepts.filter(
      (concept) =>
        normalizedAnswer.includes(
          normalize(concept)
        )
    );

  const conceptCoverage =
    question.expected_concepts.length === 0
      ? 0
      : matchedConcepts.length /
        question.expected_concepts.length;

  const wordCount =
    normalizedAnswer.split(/\s+/).length;

  /*
   * Score 0–5.
   */

  let score = Math.round(
    conceptCoverage * 5
  );

  if (
    wordCount >= 25 &&
    score < 5
  ) {
    score += 1;
  }

  score = Math.min(
    Math.max(score, 0),
    5
  );

  const technicalScore =
    Math.min(
      5,
      Math.round(
        conceptCoverage * 5
      )
    );

  const relevanceScore =
    wordCount >= 10 ? 4 : 2;

  const completenessScore =
    conceptCoverage >= 0.75
      ? 4
      : conceptCoverage >= 0.4
      ? 3
      : 2;

  const communicationScore =
    wordCount >= 15 ? 4 : 3;

  const strengths =
    matchedConcepts.map(
      (concept) =>
        `Demonstrated ${concept}`
    );

  const weaknesses =
    question.expected_concepts
      .filter(
        (concept) =>
          !matchedConcepts.includes(
            concept
          )
      )
      .map(
        (concept) =>
          `Needs stronger understanding of ${concept}`
      );

  let evaluation =
    "The answer demonstrates limited understanding.";

  if (score >= 4) {
    evaluation =
      "Strong answer with good coverage of the expected concepts.";
  } else if (score === 3) {
    evaluation =
      "Acceptable answer but some important concepts need more depth.";
  } else if (score === 2) {
    evaluation =
      "Partially correct answer with significant knowledge gaps.";
  }

  return {
    score,
    technicalScore,
    relevanceScore,
    completenessScore,
    communicationScore,
    evaluation,
    strengths,
    weaknesses,
  };
}

/*
=========================================================
START INTERVIEW
=========================================================
*/

router.post(
  "/interview/start",
  (req, res) => {
    try {
      const {
        targetRole,
        selectedSkills,
      } = req.body;

      if (
        typeof targetRole !== "string" ||
        !Array.isArray(selectedSkills) ||
        selectedSkills.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "targetRole and selectedSkills are required.",
        });
      }

      const firstQuestion =
        selectFirstQuestion(
          targetRole,
          selectedSkills
        );

      if (!firstQuestion) {
        return res.status(404).json({
          success: false,
          message:
            "No interview questions available.",
        });
      }

      const sessionId =
        `interview_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 8)}`;

      const session: InterviewSession = {
        sessionId,
        targetRole,
        selectedSkills,
        askedQuestionIds: [
          firstQuestion.id,
        ],
        currentQuestionId:
          firstQuestion.id,
        questionCount: 1,
        answers: [],
      };

      sessions.set(
        sessionId,
        session
      );

      return res.json({
        success: true,
        sessionId,
        targetRole,
        selectedSkills,
        questionNumber: 1,
        totalQuestions: 6,
        question: {
          id: firstQuestion.id,
          skill: firstQuestion.skill,
          subskill:
            firstQuestion.subskill,
          difficulty:
            firstQuestion.difficulty,
          questionType:
            firstQuestion.question_type,
          question:
            firstQuestion.question,
        },
      });
    } catch (error) {
      console.error(
        "INTERVIEW START ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to start interview.",
      });
    }
  }
);

/*
=========================================================
EVALUATE ANSWER + GET NEXT QUESTION
=========================================================
*/

router.post(
  "/interview/answer",
  (req, res) => {
    try {
      const {
        sessionId,
        questionId,
        answer,
      } = req.body;

      if (
        typeof sessionId !== "string" ||
        typeof questionId !== "string" ||
        typeof answer !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "sessionId, questionId and answer are required.",
        });
      }

      const session =
        sessions.get(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          message:
            "Interview session not found.",
        });
      }

      const question =
        questions.find(
          (item) =>
            item.id === questionId
        );

      if (!question) {
        return res.status(404).json({
          success: false,
          message:
            "Interview question not found.",
        });
      }

      const evaluation =
        evaluateAnswer(
          question,
          answer
        );

      session.answers.push({
        questionId,
        answer,
        score:
          evaluation.score,
        evaluation:
          evaluation.evaluation,
      });

      /*
       * Check whether interview is complete.
       */

      const totalQuestions = 6;

      if (
        session.questionCount >=
        totalQuestions
      ) {
        return res.json({
          success: true,
          completed: true,
          evaluation,
          message:
            "Interview completed.",
        });
      }

      /*
       * Adaptive next question.
       */

      const nextQuestion =
        selectNextQuestion(
          session,
          evaluation.score
        );

      if (!nextQuestion) {
        return res.json({
          success: true,
          completed: true,
          evaluation,
          message:
            "Interview completed.",
        });
      }

      session.askedQuestionIds.push(
        nextQuestion.id
      );

      session.currentQuestionId =
        nextQuestion.id;

      session.questionCount += 1;

      return res.json({
        success: true,
        completed: false,

        evaluation: {
          score:
            evaluation.score,
          technicalScore:
            evaluation.technicalScore,
          relevanceScore:
            evaluation.relevanceScore,
          completenessScore:
            evaluation.completenessScore,
          communicationScore:
            evaluation.communicationScore,
          evaluation:
            evaluation.evaluation,
          strengths:
            evaluation.strengths,
          weaknesses:
            evaluation.weaknesses,
        },

        nextQuestion: {
          id: nextQuestion.id,
          skill:
            nextQuestion.skill,
          subskill:
            nextQuestion.subskill,
          difficulty:
            nextQuestion.difficulty,
          questionType:
            nextQuestion.question_type,
          question:
            nextQuestion.question,
        },

        questionNumber:
          session.questionCount,

        totalQuestions,
      });
    } catch (error) {
      console.error(
        "INTERVIEW ANSWER ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to evaluate interview answer.",
      });
    }
  }
);

/*
=========================================================
FINISH INTERVIEW
=========================================================
*/

router.post(
  "/interview/finish",
  (req, res) => {
    try {
      const { sessionId } =
        req.body;

      const session =
        sessions.get(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          message:
            "Interview session not found.",
        });
      }

      const answers =
        session.answers;

      if (answers.length === 0) {
        return res.json({
          success: true,
          report: {
            overallScore: 0,
            questionsAnswered: 0,
            strengths: [],
            weaknesses: [
              "No answers recorded",
            ],
          },
        });
      }

      const averageScore =
        answers.reduce(
          (sum, item) =>
            sum + item.score,
          0
        ) / answers.length;

      const overallScore =
        Math.round(
          (averageScore / 5) * 100
        );

      const strengths: string[] = [];
      const weaknesses: string[] = [];

      answers.forEach((answer) => {
        const question =
          questions.find(
            (q) =>
              q.id ===
              answer.questionId
          );

        if (!question) return;

        const evaluation =
          evaluateAnswer(
            question,
            answer.answer
          );

        strengths.push(
          ...evaluation.strengths
        );

        weaknesses.push(
          ...evaluation.weaknesses
        );
      });

      const uniqueStrengths =
        [...new Set(strengths)];

      const uniqueWeaknesses =
        [...new Set(weaknesses)];

      return res.json({
        success: true,

        report: {
          targetRole:
            session.targetRole,

          selectedSkills:
            session.selectedSkills,

          overallScore,

          questionsAnswered:
            answers.length,

          technicalPerformance:
            Math.round(
              answers.reduce(
                (sum, answer) => {
                  const question =
                    questions.find(
                      (q) =>
                        q.id ===
                        answer.questionId
                    );

                  if (!question)
                    return sum;

                  return (
                    sum +
                    evaluateAnswer(
                      question,
                      answer.answer
                    ).technicalScore
                  );
                },
                0
              ) /
                answers.length /
                5 *
                100
            ),

          strengths:
            uniqueStrengths.slice(
              0,
              6
            ),

          weaknesses:
            uniqueWeaknesses.slice(
              0,
              6
            ),

          recommendation:
            overallScore >= 80
              ? "Strong interview performance. Focus on advanced role-specific practice."
              : overallScore >= 60
              ? "Good foundation. Improve depth and completeness in the identified skill gaps."
              : "Needs improvement. Focus on the identified knowledge and performance gaps before applying.",
        },
      });
    } catch (error) {
      console.error(
        "INTERVIEW FINISH ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to generate interview report.",
      });
    }
  }
);

export default router;