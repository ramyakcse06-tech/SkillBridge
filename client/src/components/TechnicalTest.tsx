import { useEffect, useState } from "react";

interface Question {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  source: string;
}

interface Props {
  studentId: number;
  occupationId: string;
  selectedSkills: string[];
  onBack: () => void;
}

function TechnicalTest({
  studentId,
  occupationId,
  selectedSkills,
  onBack,
}: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<
    Record<number, string>
  >({});

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [timeLeft, setTimeLeft] =
    useState(15 * 60);

  const [submitted, setSubmitted] =
    useState(false);

  const [score, setScore] =
    useState(0);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/assessments/technical/questions?count=10"
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "Failed to load technical questions"
          );
        }

        setQuestions(result.questions);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load technical questions"
        );
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [studentId, occupationId]);

  /*
   * TIMER
   */
  useEffect(() => {
    if (
      loading ||
      submitted ||
      questions.length === 0
    ) {
      return;
    }

    if (timeLeft <= 0) {
      submitTest();
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
    questions.length,
  ]);

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

  const selectAnswer = (
    option: string
  ) => {
    const question =
      questions[currentIndex];

    setAnswers((current) => ({
      ...current,
      [question.id]: option,
    }));
  };

  /*
   * IMPORTANT:
   *
   * We cannot calculate the real score
   * in the frontend because correct answers
   * are intentionally not sent to the browser.
   *
   * For this MVP screen we will show the
   * selected-answer count after submission.
   *
   * Real scoring will be moved to the
   * backend in the next step.
   */
  const submitTest = async () => {

  try {

    const response = await fetch(
      "/api/assessment-results/technical",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          studentId,
          occupationId,
          answers,
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
          "Unable to score technical assessment."
      );
    }

    setScore(result.score);

    setSubmitted(true);

  } catch (error) {

    console.error(error);

    alert(
      error instanceof Error
        ? error.message
        : "Unable to submit assessment."
    );
  }
};
  

  if (error) {
    return (
      <div style={styles.center}>
        <h2>
          Unable to load assessment
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

  if (questions.length === 0) {
    return (
      <div style={styles.center}>
        <h2>
          No technical questions available
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

  /*
   * RESULT
   */
  if (submitted) {
    const answered =
      Object.keys(answers).length;

    return (
      <div style={styles.page}>
        <div style={styles.container}>

          <div style={styles.resultCard}>

            <p style={styles.eyebrow}>
              TECHNICAL MCQ COMPLETE
            </p>

            <h1>
              Assessment Submitted
            </h1>

            <div style={styles.scoreCircle}>
              <strong>
  {Math.round(score)}%
</strong>

<span>
  Technical Score
</span>
<div style={styles.resultStats}>

  <div>
    <strong>
      {questions.length}
    </strong>
    <span>
      Total Questions
    </span>
  </div>

  <div>
    <strong>
      {Object.keys(answers).length}
    </strong>
    <span>
      Answered
    </span>
  </div>

  <div>
    <strong>
      {Math.round(score)}%
    </strong>
    <span>
      Score
    </span>
  </div>

</div>
            </div>

            <h2>
              Your responses have been
              recorded.
            </h2>

            <p style={styles.resultText}>
              The correct answers are kept
              securely on the server and will
              be used for final performance
              analysis.
            </p>

            <div style={styles.resultStats}>

              <div>
                <strong>
                  {questions.length}
                </strong>

                <span>
                  Total Questions
                </span>
              </div>

              <div>
                <strong>
                  {answered}
                </strong>

                <span>
                  Answered
                </span>
              </div>

              <div>
                <strong>
                  {questions.length -
                    answered}
                </strong>

                <span>
                  Unanswered
                </span>
              </div>

            </div>

            <div
              style={styles.skillContext}
            >
              <strong>
                Skill Gap Context
              </strong>

              <p>
                This technical assessment
                was started from your
                selected skill gaps.
              </p>

              <div
                style={styles.skillTags}
              >
                {selectedSkills.map(
                  (skill) => (
                    <span key={skill}>
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

  const question =
    questions[currentIndex];

  const answeredCount =
    Object.keys(answers).length;

  const selectedAnswer =
    answers[question.id];

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <div style={styles.header}>

          <div>
            <p style={styles.eyebrow}>
              SKILLBRIDGE · MODULE 4
            </p>

            <h1>
              Technical MCQ
            </h1>

            <p style={styles.subtitle}>
              Test your technical knowledge
              using the verified question bank.
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

          <div
            style={styles.skillTags}
          >
            {selectedSkills.map(
              (skill) => (
                <span key={skill}>
                  {skill}
                </span>
              )
            )}
          </div>

        </div>

        {/* PROGRESS */}

        <div
          style={styles.progressSection}
        >

          <div style={styles.progressTop}>

            <span>
              Question{" "}
              {currentIndex + 1} of{" "}
              {questions.length}
            </span>

            <span>
              {answeredCount} answered
            </span>

          </div>

          <div
            style={styles.progressBar}
          >
            <div
              style={{
                ...styles.progressFill,
                width: `${
                  ((currentIndex + 1) /
                    questions.length) *
                  100
                }%`,
              }}
            />
          </div>

        </div>

        {/* QUESTION */}

        <div
          style={styles.questionCard}
        >

          <div
            style={styles.questionNumber}
          >
            Question {currentIndex + 1}
          </div>

          <h2
            style={styles.question}
          >
            {question.question}
          </h2>

          {/* OPTIONS */}

          <div
            style={styles.options}
          >

            {(
              Object.entries(
                question.options
              ) as [
                string,
                string
              ][]
            ).map(
              ([letter, text]) => {

                const selected =
                  selectedAnswer ===
                  letter;

                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() =>
                      selectAnswer(
                        letter
                      )
                    }
                    style={{
                      ...styles.option,

                      ...(selected
                        ? styles.selectedOption
                        : {}),
                    }}
                  >

                    <span
                      style={{
                        ...styles.optionLetter,

                        ...(selected
                          ? styles.selectedLetter
                          : {}),
                      }}
                    >
                      {letter}
                    </span>

                    <span
                      style={
                        styles.optionText
                      }
                    >
                      {text}
                    </span>

                  </button>
                );
              }
            )}

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
              setCurrentIndex(
                (current) =>
                  current - 1
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
          questions.length - 1 ? (

            <button
              onClick={() =>
                setCurrentIndex(
                  (current) =>
                    current + 1
                )
              }
              style={
                styles.primaryButton
              }
            >
              Next →
            </button>

          ) : (

            <button
              onClick={submitTest}
              style={
                styles.submitButton
              }
            >
              Submit Assessment ✓
            </button>

          )}

        </div>

      </div>
    </div>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {

  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "40px 20px",
    fontFamily: "Arial, sans-serif",
  },

  container: {
    maxWidth: "1000px",
    margin: "0 auto",
  },

  center: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    background: "white",
    borderRadius: "20px",
    padding: "30px",
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
  },

  subtitle: {
  color: "#475467",
  lineHeight: "1.6",
  fontSize: "15px",
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
  },

  skillTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "10px",
  },

  progressSection: {
    background: "white",
    padding: "18px",
    borderRadius: "14px",
    marginBottom: "15px",
  },

  progressTop: {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "10px",
  fontSize: "13px",
  color: "#667085",
},

  progressBar: {
    height: "8px",
    background: "#eaecf0",
    borderRadius: "10px",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    background: "#2563eb",
    transition:
      "width 0.2s ease",
  },

  questionCard: {
    background: "white",
    borderRadius: "20px",
    padding: "35px",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.05)",
  },

  questionNumber: {
    color: "#2563eb",
    fontWeight: "700",
    fontSize: "13px",
  },

  question: {
    fontSize: "20px",
    lineHeight: "1.6",
    margin:
      "20px 0 25px",
    color: "#101828",
  },

  options: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  option: {
  width: "100%",
  border: "1px solid #d0d5dd",
  borderRadius: "12px",
  padding: "15px",
  background: "white",
  color: "#101828",
  display: "flex",
  alignItems: "center",
  gap: "15px",
  cursor: "pointer",
  textAlign: "left",
  fontSize: "15px",
  fontFamily: "Arial, sans-serif",
},

  selectedOption: {
    border:
      "2px solid #2563eb",
    background: "#eff6ff",
  },

  optionLetter: {
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  background: "#e4e7ec",
  color: "#101828",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "700",
  flexShrink: 0,
},

  selectedLetter: {
    background: "#2563eb",
    color: "white",
  },

  optionText: {
  flex: 1,
  lineHeight: "1.5",
  color: "#101828",
  fontSize: "15px",
  fontWeight: "500",
  display: "block",
  opacity: 1,
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

  submitButton: {
    border: "none",
    background: "#16a34a",
    color: "white",
    padding: "13px 22px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "600",
  },

  disabled: {
    opacity: 0.5,
    cursor: "not-allowed",
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
    margin:
      "30px auto 20px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },

  resultText: {
    color: "#667085",
    lineHeight: "1.6",
  },

  resultStats: {
    display: "flex",
    justifyContent: "center",
    gap: "50px",
    margin: "30px 0",
  },

  skillContext: {
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "18px",
    marginBottom: "25px",
  },
};

export default TechnicalTest;