import { useEffect, useState } from "react";

interface Question {
  id: number;
  subject: string;
  level: string;
  category: string;
  question: string;
  answer: string;
}

interface Props {
  studentId: number;
  occupationId: string;
  selectedSkills: string[];
  onBack: () => void;
}

function AptitudeTest({
  studentId,
  occupationId,
  selectedSkills,
  onBack,
}: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [timeLeft, setTimeLeft] = useState(10 * 60);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          "http://localhost:5000/api/assessments/aptitude/questions?count=10"
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to load questions"
          );
        }

        setQuestions(result.questions);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load aptitude questions"
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
    if (loading || submitted || questions.length === 0) {
      return;
    }

    if (timeLeft <= 0) {
      setSubmitted(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((current) => current - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, loading, submitted, questions.length]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const handleAnswer = (value: string) => {
    const question = questions[currentIndex];

    setAnswers((current) => ({
      ...current,
      [question.id]: value,
    }));
  };

  const calculateScore = () => {
    let correct = 0;

    questions.forEach((question) => {
      const userAnswer =
        answers[question.id]?.trim().toLowerCase();

      const correctAnswer =
        question.answer.trim().toLowerCase();

      if (userAnswer === correctAnswer) {
        correct++;
      }
    });

    return correct;
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <h2>Preparing your aptitude test...</h2>
        <p>Loading questions from the assessment bank.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.center}>
        <h2>Unable to load aptitude test</h2>
        <p>{error}</p>

        <button
          onClick={onBack}
          style={styles.backButton}
        >
          ← Back
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={styles.center}>
        <h2>No questions available</h2>

        <button
          onClick={onBack}
          style={styles.backButton}
        >
          ← Back
        </button>
      </div>
    );
  }

  /*
   * RESULT SCREEN
   */
  if (submitted) {
    const score = calculateScore();

    const percentage = Math.round(
      (score / questions.length) * 100
    );

    return (
      <div style={styles.page}>
        <div style={styles.container}>

          <div style={styles.resultCard}>
            <p style={styles.eyebrow}>
              APTITUDE ASSESSMENT COMPLETE
            </p>

            <h1>Assessment Result</h1>

            <div style={styles.scoreCircle}>
              <strong>{percentage}%</strong>
              <span>Score</span>
            </div>

            <h2>
              {score} / {questions.length} correct
            </h2>

            <p style={styles.resultText}>
              Your aptitude performance has been
              recorded for analysis.
            </p>

            <div style={styles.resultStats}>

              <div>
                <strong>
                  {questions.length}
                </strong>
                <span>Total Questions</span>
              </div>

              <div>
                <strong>{score}</strong>
                <span>Correct</span>
              </div>

              <div>
                <strong>
                  {questions.length - score}
                </strong>
                <span>Incorrect</span>
              </div>

            </div>

            <div style={styles.skillContext}>
              <strong>
                Assessment Skill Context
              </strong>

              <p>
                This assessment was started from
                your selected skill gaps.
              </p>

              <div style={styles.skillTags}>
                {selectedSkills.map((skill) => (
                  <span key={skill}>
                    {skill}
                  </span>
                ))}
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

  const question = questions[currentIndex];

  const answeredCount = Object.keys(answers).length;

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <div style={styles.header}>

          <div>
            <p style={styles.eyebrow}>
              SKILLBRIDGE · MODULE 4
            </p>

            <h1>Aptitude Assessment</h1>

            <p style={styles.subtitle}>
              Evaluate your reasoning and
              problem-solving ability.
            </p>
          </div>

          <div style={styles.timer}>
            ⏱ {formatTime(timeLeft)}
          </div>

        </div>

        {/* SELECTED SKILLS */}

        <div style={styles.contextBox}>

          <strong>
            Selected Skill Gaps
          </strong>

          <div style={styles.skillTags}>
            {selectedSkills.map((skill) => (
              <span key={skill}>
                {skill}
              </span>
            ))}
          </div>

        </div>

        {/* PROGRESS */}

        <div style={styles.progressSection}>

          <div style={styles.progressTop}>
            <span>
              Question {currentIndex + 1} of{" "}
              {questions.length}
            </span>

            <span>
              {answeredCount} answered
            </span>
          </div>

          <div style={styles.progressBar}>
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

        <div style={styles.questionCard}>

          <div style={styles.questionMeta}>

            <span style={styles.level}>
              {question.level}
            </span>

            <span>
              {question.category}
            </span>

          </div>

          <h2 style={styles.question}>
            {question.question}
          </h2>

          <textarea
            value={answers[question.id] || ""}
            onChange={(e) =>
              handleAnswer(e.target.value)
            }
            placeholder="Type your answer here..."
            style={styles.answerBox}
          />

          <p style={styles.hint}>
            Enter your answer exactly as you
            understand it. This assessment uses
            the answer provided by the question bank.
          </p>

        </div>

        {/* NAVIGATION */}

        <div style={styles.navigation}>

          <button
            disabled={currentIndex === 0}
            onClick={() =>
              setCurrentIndex(
                (current) => current - 1
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
                  (current) => current + 1
                )
              }
              style={styles.primaryButton}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => setSubmitted(true)}
              style={styles.submitButton}
            >
              Submit Assessment ✓
            </button>
          )}

        </div>

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {

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
    color: "#667085",
    lineHeight: "1.5",
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
    transition: "width 0.2s ease",
  },

  questionCard: {
    background: "white",
    borderRadius: "20px",
    padding: "35px",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.05)",
  },

  questionMeta: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    color: "#667085",
    fontSize: "13px",
  },

  level: {
    background: "#eef2ff",
    color: "#3730a3",
    padding: "6px 10px",
    borderRadius: "7px",
    fontWeight: "600",
  },

  question: {
    fontSize: "21px",
    lineHeight: "1.6",
    marginTop: "25px",
    color: "#101828",
  },

  answerBox: {
    width: "100%",
    minHeight: "130px",
    marginTop: "20px",
    padding: "15px",
    border:
      "1px solid #d0d5dd",
    borderRadius: "10px",
    fontSize: "15px",
    resize: "vertical",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
  },

  hint: {
    fontSize: "12px",
    color: "#98a2b3",
  },

  navigation: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "18px",
  },

  navButton: {
    border: "1px solid #d0d5dd",
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

  backButton: {
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "12px 20px",
    borderRadius: "9px",
    cursor: "pointer",
  },

  skillTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "10px",
  },

  skillTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "10px",
  },

  skillTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginTop: "10px",
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
  },

  resultText: {
    color: "#667085",
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

export default AptitudeTest;