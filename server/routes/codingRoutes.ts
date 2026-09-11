import { Router } from "express";
import fs from "fs";
import path from "path";

import { executeCpp } from "../services/codingExecutor";

const router = Router();

interface CodingProblem {
  id: string;
  question: string;
  difficulty: string;
  name: string | null;
  source: string;
  url: string | null;
  tags: string[];
  skill_types: string[];
  starter_code: string | null;
}

interface ExecutionProblem {
  id: string;
  question: string;
  difficulty: string;
  source: string;
  url: string | null;
  input_output: any;
  solutions: any;
  time_limit: number | null;
  memory_limit: number | null;
  execution_format: string;
}

// ---------------------------------------------------------
// STUDENT-FACING CODING PROBLEMS
// ---------------------------------------------------------

const codingPath = path.join(
  __dirname,
  "../data/coding_mvp.json"
);

const codingData = JSON.parse(
  fs.readFileSync(
    codingPath,
    "utf-8"
  )
);

const codingProblems: CodingProblem[] =
  codingData.problems;

// ---------------------------------------------------------
// SERVER-SIDE EXECUTION BANK
// ---------------------------------------------------------

const executionPath = path.join(
  __dirname,
  "../data/coding_execution_bank.json"
);

const executionData = JSON.parse(
  fs.readFileSync(
    executionPath,
    "utf-8"
  )
);

const executionProblems: ExecutionProblem[] =
  executionData.problems;

// ---------------------------------------------------------
// GET CODING PROBLEMS
// ---------------------------------------------------------

router.get(
  "/coding/problems",
  (req, res) => {

    try {

      const requestedCount =
        Number(
          req.query.count || 5
        );

      const count =
        Math.min(
          Math.max(
            requestedCount,
            1
          ),
          10
        );

      const shuffled =
        [...codingProblems].sort(
          () =>
            Math.random() - 0.5
        );

      const selected =
        shuffled
          .slice(0, count)
          .map(
            (problem) => ({
              id: problem.id,
              question:
                problem.question,
              difficulty:
                problem.difficulty,
              name:
                problem.name,
              source:
                problem.source,
              url:
                problem.url,
              tags:
                problem.tags,
              skill_types:
                problem.skill_types,
              starter_code:
                problem.starter_code
            })
          );

      res.json({
        success: true,
        assessment: "coding",
        question_count:
          selected.length,
        problems:
          selected
      });

    } catch (error) {

      console.error(
        "CODING QUESTIONS ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to load coding problems"
      });

    }

  }
);

// ---------------------------------------------------------
// RUN CODE
// ---------------------------------------------------------

router.post(
  "/coding/run",
  async (req, res) => {

    try {

      const {
        problemId,
        code
      } = req.body;

      // ---------------------------------------------------
      // VALIDATE REQUEST
      // ---------------------------------------------------

      if (
        !problemId ||
        typeof problemId !==
          "string"
      ) {

        return res.status(400).json({
          success: false,
          message:
            "problemId is required"
        });

      }

      if (
        !code ||
        typeof code !== "string"
      ) {

        return res.status(400).json({
          success: false,
          message:
            "C++ code is required"
        });

      }

      // Prevent accidentally huge submissions.
      if (
        code.length > 100_000
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Code submission is too large"
        });

      }

      // ---------------------------------------------------
      // FIND HIDDEN PROBLEM
      // ---------------------------------------------------

      const problem =
        executionProblems.find(
          (item) =>
            item.id === problemId
        );

      if (!problem) {

        return res.status(404).json({
          success: false,
          message:
            "Coding problem not found"
        });

      }

      // ---------------------------------------------------
      // ONLY STDIN/STDOUT PROBLEMS
      // ---------------------------------------------------

      if (
        problem.execution_format !==
        "stdin_stdout"
      ) {

        return res.status(400).json({
          success: false,
          message:
            "This problem format is not supported by the current coding runner."
        });

      }

      // ---------------------------------------------------
      // EXECUTE
      // ---------------------------------------------------

      const result =
        await executeCpp(
          code,
          problem.input_output
        );

      // ---------------------------------------------------
      // IMPORTANT:
      //
      // We DO NOT return:
      // - input_output
      // - solutions
      // - reference solution
      //
      // Only execution result is returned.
      // ---------------------------------------------------

      return res.json({
        success:
          result.success,

        passed:
          result.passed,

        status:
          result.status,

        message:
          result.message,

        passedTests:
          result.passedTests,

        totalTests:
          result.totalTests,

        executionTimeMs:
          result.executionTimeMs,

        output:
          result.output
      });

    } catch (error) {

      console.error(
        "CODING EXECUTION ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Coding execution failed"
      });

    }

  }
);

export default router;