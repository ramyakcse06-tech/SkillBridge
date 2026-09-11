import React, { useEffect, useState } from "react";

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

interface Props {
  studentId: number;
  occupationId: string;
  selectedSkills: string[];
  onBack: () => void;
}

interface RunResult {
  success: boolean;
  passed: boolean;
  status: string;
  message: string;
  passedTests?: number;
  totalTests?: number;
  executionTimeMs?: number;
  output?: string;
}

interface ProblemResult {
  passedTests: number;
  totalTests: number;
  executionTimeMs: number;
  passed: boolean;
  status: string;
}

function CodingTest({
  studentId,
  occupationId,
  selectedSkills,
  onBack,
}: Props) {
  const [problems, setProblems] = useState<CodingProblem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [submitted, setSubmitted] = useState(false);

  /* =====================================================
     EXECUTION STATE
  ===================================================== */

  const [running, setRunning] = useState(false);

  const [runResult, setRunResult] =
    useState<RunResult | null>(null);

  /*
   * Store the best execution result
   * separately for every problem.
   */
  const [problemResults, setProblemResults] =
    useState<Record<string, ProblemResult>>({});

  const [codingScore, setCodingScore] =
    useState(0);

  /* =====================================================
     LOAD PROBLEMS
  ===================================================== */

  useEffect(() => {
    const loadProblems = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/assessments/coding/problems?count=5"
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "Failed to load coding problems"
          );
        }

        setProblems(result.problems);

        if (result.problems.length > 0) {
          setCode(
            result.problems[0].starter_code || ""
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load coding problems"
        );
      } finally {
        setLoading(false);
      }
    };

    loadProblems();
  }, [studentId, occupationId]);

  /* =====================================================
     TIMER
  ===================================================== */

  useEffect(() => {
    if (
      loading ||
      submitted ||
      problems.length === 0
    ) {
      return;
    }

    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(
        (current) => current - 1
      );
    }, 1000);

    return () =>
      clearInterval(timer);
  }, [
    timeLeft,
    loading,
    submitted,
    problems.length,
  ]);

  /* =====================================================
     FORMAT TIMER
  ===================================================== */

  const formatTime = (
    seconds: number
  ) => {
    const minutes =
      Math.floor(seconds / 60);

    const remainingSeconds =
      seconds % 60;

    return `${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  /* =====================================================
     CHANGE PROBLEM
  ===================================================== */

  const handleProblemChange = (
    index: number
  ) => {
    setCurrentIndex(index);

    setCode(
      problems[index]?.starter_code || ""
    );

    /*
     * Show previous execution result
     * if this problem was already run.
     */
    const previousResult =
      problemResults[
        problems[index]?.id
      ];

    if (previousResult) {
      setRunResult({
        success: true,
        passed: previousResult.passed,
        status: previousResult.status,
        message: previousResult.passed
          ? "Solution accepted."
          : "Solution did not pass all hidden test cases.",
        passedTests:
          previousResult.passedTests,
        totalTests:
          previousResult.totalTests,
        executionTimeMs:
          previousResult.executionTimeMs,
      });
    } else {
      setRunResult(null);
    }
  };

  /* =====================================================
     RUN CODE
  ===================================================== */

  const handleRunCode = async () => {
    const problem =
      problems[currentIndex];

    if (!problem) {
      return;
    }

    if (!code.trim()) {
      setRunResult({
        success: false,
        passed: false,
        status: "EMPTY_CODE",
        message:
          "Please write some C++ code before running.",
      });

      return;
    }

    try {
      setRunning(true);
      setRunResult(null);

      const response = await fetch(
        "/api/assessments/coding/run",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            problemId: problem.id,
            code: code,
          }),
        }
      );

      const result: RunResult =
        await response.json();

      setRunResult(result);

      /*
       * Save execution result for
       * THIS problem.
       */
      if (
        typeof result.passedTests ===
          "number" &&
        typeof result.totalTests ===
          "number"
      ) {
        const newResult: ProblemResult = {
          passedTests:
            result.passedTests,

          totalTests:
            result.totalTests,

          executionTimeMs:
            result.executionTimeMs || 0,

          passed:
            result.passed,

          status:
            result.status,
        };

        setProblemResults(
          (current) => {

            const previous =
              current[problem.id];

            /*
             * Keep the best attempt.
             *
             * Example:
             * first run 5/10
             * second run 8/10
             * keep 8/10
             */
            if (
              previous &&
              previous.passedTests >
                newResult.passedTests
            ) {
              return current;
            }

            return {
              ...current,
              [problem.id]:
                newResult,
            };
          }
        );
      }

    } catch (err) {
      console.error(
        "Coding execution error:",
        err
      );

      setRunResult({
        success: false,
        passed: false,
        status: "NETWORK_ERROR",
        message:
          "Unable to connect to the coding execution server.",
      });

    } finally {
      setRunning(false);
    }
  };

  /* =====================================================
     CALCULATE CODING SCORE
  ===================================================== */

  const calculateCodingScore = () => {
    const results =
      Object.values(problemResults);

    if (results.length === 0) {
      return {
        score: 0,
        passedTests: 0,
        totalTests: 0,
        attemptedProblems: 0,
      };
    }

    const passedTests =
      results.reduce(
        (sum, result) =>
          sum + result.passedTests,
        0
      );

    const totalTests =
      results.reduce(
        (sum, result) =>
          sum + result.totalTests,
        0
      );

    const attemptedProblems =
      results.length;

    const score =
      totalTests > 0
        ? (passedTests / totalTests) *
          100
        : 0;

    return {
      score,
      passedTests,
      totalTests,
      attemptedProblems,
    };
  };

  /* =====================================================
     SUBMIT ASSESSMENT
  ===================================================== */

  const handleSubmit = async () => {
    if (running) {
      return;
    }

    const calculated =
      calculateCodingScore();

    /*
     * Don't allow an empty assessment
     * to be accidentally submitted.
     */
    if (
      calculated.attemptedProblems === 0
    ) {
      alert(
        "Please run your solution for at least one problem before submitting."
      );

      return;
    }

    try {
      const response =
        await fetch(
          "/api/assessment-results/coding",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              studentId,
              occupationId,

              passedTests:
                calculated.passedTests,

              totalTests:
                calculated.totalTests,
            }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Unable to save coding score."
        );
      }

      setCodingScore(
        result.score
      );

      setSubmitted(true);

    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to submit coding assessment."
      );
    }
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div style={styles.center}>
        <h2>
          Preparing Coding Assessment...
        </h2>

        <p>
          Loading coding problems from
          the verified TACO problem bank.
        </p>
      </div>
    );
  }

  /* =====================================================
     ERROR
  ===================================================== */

  if (error) {
    return (
      <div style={styles.center}>
        <h2>
          Unable to load coding assessment
        </h2>

        <p>{error}</p>

        <button
          onClick={onBack}
          style={styles.primaryButton}
        >
          ← Back
        </button>
      </div>
    );
  }

  /* =====================================================
     NO PROBLEMS
  ===================================================== */

  if (problems.length === 0) {
    return (
      <div style={styles.center}>
        <h2>
          No coding problems available
        </h2>

        <button
          onClick={onBack}
          style={styles.primaryButton}
        >
          ← Back
        </button>
      </div>
    );
  }

  /* =====================================================
     SUBMITTED RESULT
  ===================================================== */

  if (submitted) {
    const calculated =
      calculateCodingScore();

    return (
      <div style={styles.page}>
        <div style={styles.container}>

          <div style={styles.resultCard}>

            <p style={styles.eyebrow}>
              SKILLBRIDGE · MODULE 4
            </p>

            <h1>
              Coding Assessment Complete
            </h1>

            {/* SCORE */}

            <div style={styles.scoreCircle}>

              <strong>
                {Math.round(
                  codingScore
                )}%
              </strong>

              <span>
                Coding Score
              </span>

            </div>

            <h2>
              Your coding performance
              has been recorded.
            </h2>

            <p style={styles.resultText}>
              Your execution-based coding
              performance will contribute to
              your Placement Readiness Score.
            </p>

            {/* OVERALL STATS */}

            <div style={styles.resultStats}>

              <div>
                <strong>
                  {
                    calculated.attemptedProblems
                  }
                </strong>

                <span>
                  Problems Attempted
                </span>
              </div>

              <div>
                <strong>
                  {
                    calculated.passedTests
                  }
                </strong>

                <span>
                  Tests Passed
                </span>
              </div>

              <div>
                <strong>
                  {
                    calculated.totalTests
                  }
                </strong>

                <span>
                  Total Tests
                </span>
              </div>

            </div>

            {/* PERFORMANCE */}

            <div
              style={styles.performanceBox}
            >

              <h3>
                Problem Performance
              </h3>

              <div
                style={
                  styles.performanceList
                }
              >

                {problems.map(
                  (problem, index) => {

                    const result =
                      problemResults[
                        problem.id
                      ];

                    return (
                      <div
                        key={problem.id}
                        style={
                          styles.performanceRow
                        }
                      >

                        <div>
                          <strong>
                            Problem{" "}
                            {index + 1}
                          </strong>

                          <span
                            style={
                              styles.performanceTitle
                            }
                          >
                            {problem.name ||
                              "Coding Problem"}
                          </span>
                        </div>

                        {result ? (
                          <div
                            style={
                              styles.performanceScore
                            }
                          >
                            <strong>
                              {
                                result.passedTests
                              }
                              /
                              {
                                result.totalTests
                              }
                            </strong>

                            <span>
                              {result.passed
                                ? "Accepted"
                                : "Needs Improvement"}
                            </span>
                          </div>
                        ) : (
                          <div
                            style={
                              styles.notAttempted
                            }
                          >
                            Not Attempted
                          </div>
                        )}

                      </div>
                    );
                  }
                )}

              </div>
            </div>

            {/* SKILL CONTEXT */}

            <div
              style={styles.skillContext}
            >

              <strong>
                Skill Gap Context
              </strong>

              <p>
                This coding assessment was
                started from your selected
                skill gaps.
              </p>

              <div
                style={styles.skillTags}
              >

                {selectedSkills.map(
                  (skill) => (
                    <span
                      key={skill}
                      style={
                        styles.skillTag
                      }
                    >
                      {skill}
                    </span>
                  )
                )}

              </div>

            </div>

            <button
              onClick={onBack}
              style={styles.primaryButton}
            >
              ← Back to Assessment Center
            </button>

          </div>

        </div>
      </div>
    );
  }

  /* =====================================================
     CURRENT PROBLEM
  ===================================================== */

  const problem =
    problems[currentIndex];

  const currentSavedResult =
    problemResults[problem.id];

  /* =====================================================
     MAIN PAGE
  ===================================================== */

  return (
    <div style={styles.page}>

      <div style={styles.container}>

        {/* HEADER */}

        <div style={styles.header}>

          <div>

            <p style={styles.eyebrow}>
              SKILLBRIDGE · MODULE 4
            </p>

            <h1 style={styles.title}>
              Coding Assessment
            </h1>

            <p style={styles.subtitle}>
              Solve coding problems related
              to your selected skill gaps.
            </p>

          </div>

          <div style={styles.timer}>
            ⏱ {formatTime(timeLeft)}
          </div>

        </div>

        {/* SKILL CONTEXT */}

        <div style={styles.contextBox}>

          <strong>
            Selected Skill Gaps
          </strong>

          <div style={styles.skillTags}>

            {selectedSkills.map(
              (skill) => (
                <span
                  key={skill}
                  style={styles.skillTag}
                >
                  {skill}
                </span>
              )
            )}

          </div>

        </div>

        {/* PROBLEM NAVIGATION */}

        <div style={styles.problemTabs}>

          {problems.map(
            (p, index) => {

              const result =
                problemResults[p.id];

              return (
                <button
                  key={p.id}
                  onClick={() =>
                    handleProblemChange(
                      index
                    )
                  }
                  style={{
                    ...styles.problemTab,

                    ...(index ===
                    currentIndex
                      ? styles.activeProblemTab
                      : {}),

                    ...(result
                      ? styles.completedProblemTab
                      : {}),
                  }}
                >

                  Problem {index + 1}

                  {result && (
                    <span
                      style={
                        styles.tabCheck
                      }
                    >
                      {result.passed
                        ? " ✓"
                        : " •"}
                    </span>
                  )}

                </button>
              );
            }
          )}

        </div>

        {/* WORKSPACE */}

        <div style={styles.workspace}>

          {/* LEFT */}

          <div style={styles.problemPanel}>

            <div
              style={
                styles.problemHeader
              }
            >

              <span
                style={
                  styles.questionNumber
                }
              >
                Problem{" "}
                {currentIndex + 1}
              </span>

              <span
                style={{
                  ...styles.difficulty,

                  ...(problem.difficulty ===
                  "EASY"
                    ? styles.easy
                    : problem.difficulty ===
                      "MEDIUM"
                    ? styles.medium
                    : styles.hard),
                }}
              >
                {problem.difficulty}
              </span>

            </div>

            <h2
              style={
                styles.problemTitle
              }
            >
              {problem.name ||
                `Coding Problem ${
                  currentIndex + 1
                }`}
            </h2>

            <div
              style={styles.question}
            >
              {problem.question}
            </div>

            {/* SKILL TYPES */}

            {problem.skill_types?.length >
              0 && (
              <div
                style={styles.metadata}
              >

                <strong>
                  Skill Types
                </strong>

                <div
                  style={
                    styles.skillTags
                  }
                >

                  {problem.skill_types.map(
                    (skill) => (
                      <span
                        key={skill}
                        style={
                          styles.skillTag
                        }
                      >
                        {skill}
                      </span>
                    )
                  )}

                </div>

              </div>
            )}

            {/* TAGS */}

            {problem.tags?.length >
              0 && (
              <div
                style={styles.metadata}
              >

                <strong>
                  Topics
                </strong>

                <div
                  style={styles.tagList}
                >

                  {problem.tags.map(
                    (tag) => (
                      <span
                        key={tag}
                        style={styles.tag}
                      >
                        {tag}
                      </span>
                    )
                  )}

                </div>

              </div>
            )}

            <div
              style={styles.source}
            >
              Source: {problem.source}
            </div>

            {/* SAVED RESULT */}

            {currentSavedResult && (
              <div
                style={
                  styles.savedResult
                }
              >

                <strong>
                  Previous Run
                </strong>

                <p>
                  Tests Passed:{" "}
                  <b>
                    {
                      currentSavedResult.passedTests
                    }
                    /
                    {
                      currentSavedResult.totalTests
                    }
                  </b>
                </p>

              </div>
            )}

          </div>

          {/* RIGHT */}

          <div
            style={styles.editorPanel}
          >

            {/* EDITOR HEADER */}

            <div
              style={
                styles.editorHeader
              }
            >

              <strong>
                Code Editor
              </strong>

              <span>
                C++17
              </span>

            </div>

            {/* EDITOR */}

            <textarea
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value
                )
              }
              placeholder={
                "// Write your C++17 solution here..."
              }
              spellCheck={false}
              style={styles.editor}
            />

            {/* ACTIONS */}

            <div
              style={
                styles.editorActions
              }
            >

              <button
                onClick={
                  handleRunCode
                }
                disabled={running}
                style={{
                  ...styles.runButton,

                  ...(running
                    ? styles.disabled
                    : {}),
                }}
              >
                {running
                  ? "⏳ Running..."
                  : "▶ Run Code"}
              </button>

              <button
                onClick={
                  handleSubmit
                }
                disabled={running}
                style={{
                  ...styles.submitButton,

                  ...(running
                    ? styles.disabled
                    : {}),
                }}
              >
                Submit Assessment ✓
              </button>

            </div>

            {/* EXECUTION RESULT */}

            {runResult && (
              <div
                style={{
                  ...styles.runResult,

                  ...(runResult.passed
                    ? styles.passedResult
                    : styles.failedResult),
                }}
              >

                <div
                  style={
                    styles.resultHeader
                  }
                >

                  <strong>
                    {runResult.passed
                      ? "✓ Accepted"
                      : `✕ ${runResult.status}`}
                  </strong>

                  {runResult.executionTimeMs !==
                    undefined && (
                    <span>
                      {
                        runResult.executionTimeMs
                      }{" "}
                      ms
                    </span>
                  )}

                </div>

                <p
                  style={
                    styles.resultMessage
                  }
                >
                  {runResult.message}
                </p>

                {runResult.totalTests !==
                  undefined && (
                  <p
                    style={
                      styles.testStats
                    }
                  >
                    Test Cases:{" "}
                    <strong>
                      {runResult.passedTests ||
                        0}{" "}
                      /{" "}
                      {
                        runResult.totalTests
                      }
                    </strong>
                  </p>
                )}

                {runResult.output && (
                  <div
                    style={
                      styles.outputBox
                    }
                  >

                    <div
                      style={
                        styles.outputTitle
                      }
                    >
                      Program Output
                    </div>

                    <pre
                      style={
                        styles.output
                      }
                    >
                      {runResult.output}
                    </pre>

                  </div>
                )}

              </div>
            )}

            {/* NOTICE */}

            <div
              style={
                styles.executionNotice
              }
            >

              <strong>
                Secure Execution Environment
              </strong>

              <p>
                Your C++17 code is executed
                against hidden TACO test cases.
                Test cases and reference
                solutions are never exposed
                to the student.
              </p>

            </div>

          </div>

        </div>

        {/* NAVIGATION */}

        <div
          style={styles.navigation}
        >

          <button
            disabled={
              currentIndex === 0
            }
            onClick={() =>
              handleProblemChange(
                currentIndex - 1
              )
            }
            style={{
              ...styles.navButton,

              ...(currentIndex === 0
                ? styles.disabled
                : {}),
            }}
          >
            ← Previous
          </button>

          {currentIndex <
          problems.length - 1 ? (

            <button
              onClick={() =>
                handleProblemChange(
                  currentIndex + 1
                )
              }
              style={
                styles.primaryButton
              }
            >
              Next Problem →
            </button>

          ) : (

            <button
              onClick={
                handleSubmit
              }
              disabled={running}
              style={{
                ...styles.submitButton,

                ...(running
                  ? styles.disabled
                  : {}),
              }}
            >
              Submit Assessment ✓
            </button>

          )}

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles: Record<
  string,
  React.CSSProperties
> = {

  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "30px 20px",
    fontFamily:
      "Arial, sans-serif",
    color: "#101828",
  },

  container: {
    maxWidth: "1400px",
    margin: "0 auto",
  },

  center: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontFamily:
      "Arial, sans-serif",
    color: "#101828",
    textAlign: "center",
    padding: "20px",
  },

  header: {
    background: "white",
    borderRadius: "18px",
    padding: "25px 30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "15px",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.05)",
  },

  eyebrow: {
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "1.5px",
    color: "#2563eb",
    margin: "0 0 8px",
  },

  title: {
    margin: "0",
    fontSize: "28px",
    color: "#101828",
  },

  subtitle: {
    color: "#475467",
    lineHeight: "1.5",
    marginBottom: "0",
  },

  timer: {
    background: "#fff7ed",
    color: "#c2410c",
    padding: "14px 20px",
    borderRadius: "10px",
    fontWeight: "700",
    fontSize: "18px",
    whiteSpace: "nowrap",
  },

  contextBox: {
    background: "#eff6ff",
    borderRadius: "14px",
    padding: "18px",
    marginBottom: "15px",
    color: "#101828",
  },

  skillTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "10px",
  },

  skillTag: {
    background: "#dbeafe",
    color: "#1e40af",
    padding: "5px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },

  problemTabs: {
    display: "flex",
    gap: "8px",
    marginBottom: "15px",
    flexWrap: "wrap",
  },

  problemTab: {
    border:
      "1px solid #d0d5dd",
    background: "white",
    color: "#344054",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  activeProblemTab: {
    background: "#2563eb",
    color: "white",
    borderColor: "#2563eb",
  },

  completedProblemTab: {
    borderColor: "#16a34a",
  },

  tabCheck: {
    fontWeight: "800",
  },

  workspace: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "15px",
  },

  problemPanel: {
    background: "white",
    borderRadius: "18px",
    padding: "25px",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.05)",
    minHeight: "600px",
  },

  editorPanel: {
    background: "#111827",
    borderRadius: "18px",
    overflow: "hidden",
    minHeight: "600px",
    display: "flex",
    flexDirection: "column",
  },

  problemHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },

  questionNumber: {
    color: "#2563eb",
    fontWeight: "700",
    fontSize: "14px",
  },

  difficulty: {
    padding: "5px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "700",
  },

  easy: {
    background: "#dcfce7",
    color: "#166534",
  },

  medium: {
    background: "#fef3c7",
    color: "#92400e",
  },

  hard: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  problemTitle: {
    color: "#101828",
    fontSize: "22px",
    marginBottom: "20px",
  },

  question: {
    color: "#344054",
    lineHeight: "1.7",
    fontSize: "15px",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  },

  metadata: {
    marginTop: "25px",
    color: "#344054",
  },

  tagList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "7px",
    marginTop: "8px",
  },

  tag: {
    background: "#f2f4f7",
    color: "#344054",
    padding: "5px 9px",
    borderRadius: "6px",
    fontSize: "12px",
  },

  source: {
    marginTop: "30px",
    paddingTop: "15px",
    borderTop:
      "1px solid #eaecf0",
    color: "#667085",
    fontSize: "12px",
  },

  savedResult: {
    marginTop: "20px",
    background: "#ecfdf3",
    color: "#166534",
    padding: "14px",
    borderRadius: "10px",
    border:
      "1px solid #bbf7d0",
  },

  editorHeader: {
    padding: "15px 18px",
    background: "#1f2937",
    color: "white",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  editor: {
    flex: 1,
    width: "100%",
    minHeight: "430px",
    resize: "none",
    border: "none",
    outline: "none",
    background: "#111827",
    color: "#f9fafb",
    padding: "20px",
    fontFamily:
      "'Courier New', monospace",
    fontSize: "14px",
    lineHeight: "1.6",
    boxSizing: "border-box",
  },

  editorActions: {
    padding: "15px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    background: "#1f2937",
  },

  runButton: {
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  submitButton: {
    border: "none",
    background: "#16a34a",
    color: "white",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  disabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },

  runResult: {
    padding: "18px",
    borderTop:
      "1px solid #e5e7eb",
  },

  passedResult: {
    background: "#ecfdf3",
    color: "#101828",
  },

  failedResult: {
    background: "#fef2f2",
    color: "#101828",
  },

  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "15px",
  },

  resultMessage: {
    margin: "8px 0",
    lineHeight: "1.5",
  },

  testStats: {
    margin: "8px 0",
  },

  outputBox: {
    marginTop: "12px",
  },

  outputTitle: {
    fontSize: "12px",
    fontWeight: "700",
    marginBottom: "6px",
  },

  output: {
    background: "#111827",
    color: "#f9fafb",
    padding: "12px",
    borderRadius: "8px",
    overflowX: "auto",
    margin: "0",
    whiteSpace: "pre-wrap",
    fontFamily:
      "'Courier New', monospace",
    fontSize: "13px",
  },

  executionNotice: {
    background: "#1f2937",
    color: "#d1d5db",
    padding: "12px 18px",
    fontSize: "12px",
  },

  navigation: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "18px",
  },

  navButton: {
    border:
      "1px solid #d0d5dd",
    background: "white",
    color: "#344054",
    padding: "12px 20px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "600",
  },

  primaryButton: {
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "13px 22px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "600",
  },

  resultCard: {
    background: "white",
    borderRadius: "20px",
    padding: "40px",
    textAlign: "center",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.05)",
  },

  scoreCircle: {
    width: "150px",
    height: "150px",
    borderRadius: "50%",
    background: "#eff6ff",
    margin: "30px auto 20px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "#101828",
  },

  resultText: {
    color: "#475467",
    lineHeight: "1.6",
  },

  resultStats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: "15px",
    margin: "30px 0",
  },

  performanceBox: {
    background: "#f8fafc",
    borderRadius: "14px",
    padding: "20px",
    margin: "20px 0",
    textAlign: "left",
  },

  performanceList: {
    marginTop: "12px",
  },

  performanceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    padding: "14px 0",
    borderBottom:
      "1px solid #e5e7eb",
  },

  performanceTitle: {
    display: "block",
    color: "#667085",
    fontSize: "12px",
    marginTop: "4px",
  },

  performanceScore: {
    textAlign: "right",
    color: "#166534",
  },

  notAttempted: {
    color: "#98a2b3",
    fontSize: "13px",
  },

  skillContext: {
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "18px",
    margin: "25px 0",
  },
};

export default CodingTest;