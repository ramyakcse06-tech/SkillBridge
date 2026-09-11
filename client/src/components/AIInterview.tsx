import React, {
  useEffect,
  useRef,
  useState,
} from "react";

interface Question {
  id: string;
  skill: string;
  subskill: string;
  difficulty: string;
  questionType: string;
  question: string;
}

interface Evaluation {
  score: number;
  technicalScore: number;
  relevance: number;
  completeness: number;
  communication: number;
  strengths: string[];
  weaknesses: string[];
}

interface Report {
  targetRole: string;
  selectedSkills: string[];
  overallScore: number;
  questionsAnswered: number;
  technicalPerformance: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

interface Props {
  studentId: number;
  occupationId: string;
  selectedSkills: string[];
  targetRole: string;
  onBack: () => void;
}

interface SpeechRecognitionResultEvent {
  results: {
    length: number;
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;

  start: () => void;
  stop: () => void;

  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  onresult:
    | ((event: SpeechRecognitionResultEvent) => void)
    | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const API =
  "/api/assessments/interview";

function AIInterview({
  studentId,
  occupationId,
  selectedSkills,
  targetRole,
  onBack,
}: Props) {
  /* =====================================================
     STATE
  ===================================================== */

  const [stage, setStage] = useState<
    "intro" | "selfintro" | "technical" | "report"
  >("intro");

  const [sessionId, setSessionId] =
    useState("");

  const [question, setQuestion] =
    useState<Question | null>(null);

  const [questionNumber, setQuestionNumber] =
    useState(0);

  const [totalQuestions, setTotalQuestions] =
    useState(6);

  const [answer, setAnswer] =
    useState("");

  const [selfIntroduction, setSelfIntroduction] =
    useState("");

  const [isListening, setIsListening] =
    useState(false);

  const [speechSupported, setSpeechSupported] =
    useState(true);

  const [starting, setStarting] =
    useState(false);

  const [evaluating, setEvaluating] =
    useState(false);

  const [error, setError] =
    useState("");

  const [lastEvaluation, setLastEvaluation] =
    useState<Evaluation | null>(null);

  const [report, setReport] =
    useState<Report | null>(null);

  const [cameraStatus, setCameraStatus] =
    useState<
      "loading" | "active" | "denied" | "error"
    >("loading");

  /* =====================================================
     REFS
  ===================================================== */

  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const recognitionRef =
    useRef<SpeechRecognitionInstance | null>(null);

  /*
   * TRUE = user wants microphone to remain ON.
   * FALSE = user intentionally pressed Stop.
   */
  const shouldKeepListeningRef =
    useRef(false);

  /*
   * Stores whether we're recording:
   * intro OR technical answer
   */
  const listeningTypeRef =
    useRef<"intro" | "answer" | null>(null);

  /*
   * Prevents multiple automatic restarts.
   */
  const restartTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  /*
   * Prevents multiple recognition instances
   * from being created at the same time.
   */
  const restartingRef =
    useRef(false);

  /* =====================================================
     CAMERA
  ===================================================== */

  const startCamera = async () => {
    try {
      setCameraStatus("loading");

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: {
              ideal: 1280,
              min: 640,
            },
            height: {
              ideal: 720,
              min: 480,
            },
            frameRate: {
              ideal: 30,
              min: 24,
            },
            facingMode: "user",
          },
          audio: false,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        try {
          await videoRef.current.play();
        } catch {}
      }

      setCameraStatus("active");
    } catch (err) {
      console.error("Camera error:", err);
      setCameraStatus("denied");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }
  };

  /* =====================================================
     INITIALIZE CAMERA + SPEECH
  ===================================================== */

  useEffect(() => {
    startCamera();

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }

    return () => {
      stopCamera();

      shouldKeepListeningRef.current = false;
      listeningTypeRef.current = null;
      restartingRef.current = false;

      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.stop();
        } catch {}
      }

      recognitionRef.current = null;

      window.speechSynthesis.cancel();
    };
  }, []);

  /* =====================================================
     SPEAK - AI VOICE
  ===================================================== */

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const speech =
      new SpeechSynthesisUtterance(text);

    speech.rate = 0.9;
    speech.pitch = 1;
    speech.volume = 1;

    window.speechSynthesis.speak(speech);
  };

  /* =====================================================
     CREATE SPEECH RECOGNITION
  ===================================================== */

  const createRecognition = (
    type: "intro" | "answer"
  ): SpeechRecognitionInstance | null => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return null;
    }

    const recognition =
      new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    /* ---------------------------------------------
       START
    --------------------------------------------- */

    recognition.onstart = () => {
      console.log(
        "🎤 Speech recognition started"
      );

      restartingRef.current = false;

      setIsListening(true);
      setError("");
    };

    /* ---------------------------------------------
       RESULT
    --------------------------------------------- */

    recognition.onresult = (
      event: SpeechRecognitionResultEvent
    ) => {
      let transcript = "";

      /*
       * IMPORTANT:
       * Use event.results.length.
       *
       * Do NOT use Object.keys(event.results).length
       */
      for (
        let i = 0;
        i < event.results.length;
        i++
      ) {
        transcript +=
          event.results[i][0].transcript + " ";
      }

      transcript = transcript.trim();

      if (type === "intro") {
        setSelfIntroduction(transcript);
      } else {
        setAnswer(transcript);
      }
    };

    /* ---------------------------------------------
       ERROR
    --------------------------------------------- */

    recognition.onerror = (event: any) => {
      console.error(
        "🎤 Speech recognition error:",
        event.error
      );

      /*
       * Chrome commonly produces these errors
       * temporarily.
       *
       * Do NOT immediately switch the mic OFF.
       */
      if (
        event.error === "no-speech" ||
        event.error === "audio-capture" ||
        event.error === "network"
      ) {
        return;
      }

      /*
       * Permission-related errors are different.
       */
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        shouldKeepListeningRef.current = false;

        listeningTypeRef.current = null;

        setIsListening(false);

        setError(
          "Microphone permission was denied. Please allow microphone access in Chrome."
        );

        return;
      }

      /*
       * Other errors are logged but the
       * auto-restart mechanism can recover.
       */
    };

    /* ---------------------------------------------
       END
    --------------------------------------------- */

    recognition.onend = () => {
      console.log(
        "🎤 Speech recognition ended"
      );

      /*
       * If the user pressed Stop,
       * DO NOT restart.
       */
      if (
        !shouldKeepListeningRef.current ||
        listeningTypeRef.current !== type
      ) {
        console.log(
          "🎤 Recording intentionally stopped"
        );

        restartingRef.current = false;
        setIsListening(false);

        return;
      }

      /*
       * Prevent duplicate restart timers.
       */
      if (restartingRef.current) {
        return;
      }

      restartingRef.current = true;

      console.log(
        "🔄 Browser ended recognition automatically."
      );

      console.log(
        "🔄 Restarting microphone..."
      );

      /*
       * Small delay prevents Chrome from rejecting
       * an immediate restart.
       */
      restartTimerRef.current =
        setTimeout(() => {
          restartTimerRef.current = null;

          /*
           * Check again because the user might
           * have pressed Stop during the delay.
           */
          if (
            !shouldKeepListeningRef.current ||
            listeningTypeRef.current !== type
          ) {
            restartingRef.current = false;
            setIsListening(false);
            return;
          }

          try {
            /*
             * Remove old reference before
             * creating a fresh recognition instance.
             */
            recognitionRef.current = null;

            const newRecognition =
              createRecognition(type);

            if (!newRecognition) {
              restartingRef.current = false;
              setIsListening(false);
              return;
            }

            recognitionRef.current =
              newRecognition;

            newRecognition.start();

            console.log(
              "🎤 Microphone restarted"
            );
          } catch (err) {
            console.error(
              "❌ Restart failed:",
              err
            );

            restartingRef.current = false;

            /*
             * Try again while the user still
             * wants to speak.
             */
            if (
              shouldKeepListeningRef.current &&
              listeningTypeRef.current === type
            ) {
              restartTimerRef.current =
                setTimeout(() => {
                  restartingRef.current = false;

                  if (
                    shouldKeepListeningRef.current &&
                    listeningTypeRef.current === type
                  ) {
                    startListening(type);
                  }
                }, 700);
            } else {
              setIsListening(false);
            }
          }
        }, 400);
    };

    return recognition;
  };

  /* =====================================================
     START LISTENING
  ===================================================== */

  const startListening = (
    type: "intro" | "answer"
  ) => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);

      setError(
        "Speech recognition is not supported in this browser. Please use Google Chrome."
      );

      return;
    }

    console.log(
      "🎤 User requested microphone:",
      type
    );

    /*
     * User wants microphone ON.
     */
    shouldKeepListeningRef.current = true;

    listeningTypeRef.current = type;

    setError("");

    /*
     * Cancel pending restart.
     */
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);

      restartTimerRef.current = null;
    }

    restartingRef.current = false;

    /*
     * Stop existing recognition instance.
     */
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch {}
    }

    recognitionRef.current = null;

    try {
      const recognition =
        createRecognition(type);

      if (!recognition) {
        return;
      }

      recognitionRef.current =
        recognition;

      recognition.start();

      console.log(
        "🎤 Starting microphone..."
      );
    } catch (err) {
      console.error(
        "❌ Unable to start speech recognition:",
        err
      );

      setIsListening(false);

      /*
       * Sometimes Chrome needs a tiny delay.
       */
      setTimeout(() => {
        if (
          shouldKeepListeningRef.current &&
          listeningTypeRef.current === type
        ) {
          try {
            const retryRecognition =
              createRecognition(type);

            if (!retryRecognition) {
              return;
            }

            recognitionRef.current =
              retryRecognition;

            retryRecognition.start();

            console.log(
              "🎤 Microphone started after retry"
            );
          } catch (retryError) {
            console.error(
              "❌ Speech retry failed:",
              retryError
            );

            setIsListening(false);
          }
        }
      }, 500);
    }
  };

  /* =====================================================
     STOP LISTENING
  ===================================================== */

  const stopListening = () => {
    console.log(
      "🛑 USER PRESSED STOP"
    );

    /*
     * CRITICAL:
     *
     * Set this FALSE BEFORE stopping recognition.
     * Otherwise onend would restart it.
     */
    shouldKeepListeningRef.current = false;

    listeningTypeRef.current = null;

    restartingRef.current = false;

    /*
     * Cancel pending restart.
     */
    if (restartTimerRef.current) {
      clearTimeout(
        restartTimerRef.current
      );

      restartTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch {}
    }

    recognitionRef.current = null;

    setIsListening(false);
  };

  /* =====================================================
     STEP 1
     START BUTTON
  ===================================================== */

  const beginInterview = () => {
    setStage("selfintro");

    speak(
      `Hello! Welcome to your SkillBridge AI mock interview for the ${targetRole} role. Let's begin. Please introduce yourself and briefly tell me about your background, education, projects and interests.`
    );
  };

  /* =====================================================
     STEP 2
     START TECHNICAL QUESTIONS
  ===================================================== */

  const startTechnicalInterview =
    async () => {
      if (!selfIntroduction.trim()) {
        alert(
          "Please introduce yourself first."
        );

        return;
      }

      /*
       * Make absolutely sure the microphone
       * is stopped before technical interview.
       */
      stopListening();

      try {
        setStarting(true);
        setError("");

        const response =
          await fetch(`${API}/start`, {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              studentId,
              occupationId,
              targetRole,
              selectedSkills,
            }),
          });

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Unable to start technical interview."
          );
        }

        setSessionId(
          data.sessionId
        );

        setQuestion(
          data.question
        );

        setQuestionNumber(
          data.questionNumber || 1
        );

        setTotalQuestions(
          data.totalQuestions || 6
        );

        setAnswer("");

        setLastEvaluation(null);

        setStage("technical");

        setTimeout(() => {
          if (data.question?.question) {
            speak(
              data.question.question
            );
          }
        }, 400);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to start interview."
        );
      } finally {
        setStarting(false);
      }
    };

  /* =====================================================
     EVALUATE TECHNICAL ANSWER
  ===================================================== */

  const evaluateAnswer = async () => {
    if (!sessionId) {
      setError(
        "Interview session is not available."
      );

      return;
    }

    if (!question) {
      return;
    }

    if (!answer.trim()) {
      alert(
        "Please provide an answer first."
      );

      return;
    }

    try {
      setEvaluating(true);
      setError("");

      /*
       * Stop microphone BEFORE evaluation.
       */
      stopListening();

      /*
       * Stop AI speech.
       */
      window.speechSynthesis.cancel();

      const response =
        await fetch(`${API}/answer`, {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            sessionId,
            questionId: question.id,
            answer: answer.trim(),
          }),
        });

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to evaluate answer."
        );
      }

      if (data.evaluation) {
        setLastEvaluation(
          data.evaluation
        );
      }

      if (data.completed) {
        await finishInterview();

        return;
      }

      if (data.nextQuestion) {
        setQuestion(
          data.nextQuestion
        );

        setQuestionNumber(
          data.questionNumber ||
            questionNumber + 1
        );

        setTotalQuestions(
          data.totalQuestions ||
            totalQuestions
        );

        setAnswer("");

        setLastEvaluation(null);

        setTimeout(() => {
          if (
            data.nextQuestion?.question
          ) {
            speak(
              data.nextQuestion.question
            );
          }
        }, 700);
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to evaluate answer."
      );
    } finally {
      setEvaluating(false);
    }
  };

  /* =====================================================
     FINISH
  ===================================================== */

  const finishInterview =
    async () => {
      try {
        /*
         * Make sure microphone is OFF.
         */
        stopListening();

        window.speechSynthesis.cancel();

        const response =
          await fetch(`${API}/finish`, {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              sessionId,
            }),
          });

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Unable to generate report."
          );
        }

        setReport(data.report);

        setStage("report");

        stopCamera();

        stopListening();

        window.speechSynthesis.cancel();
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to generate report."
        );
      }
    };

  /* =====================================================
     REPORT
  ===================================================== */

  if (
    stage === "report" &&
    report
  ) {
    return (
      <div style={styles.page}>
        <div style={styles.reportContainer}>

          <div style={styles.reportHeader}>
            <div style={styles.reportIcon}>
              🎯
            </div>

            <div style={styles.eyebrow}>
              SKILLBRIDGE · MODULE 4
            </div>

            <h1 style={styles.title}>
              AI Interview Report
            </h1>

            <p style={styles.subtitle}>
              Your adaptive interview performance
              for {report.targetRole}.
            </p>
          </div>

          <div style={styles.scoreCard}>
            <div>
              <div style={styles.scoreLabel}>
                OVERALL INTERVIEW SCORE
              </div>

              <div style={styles.bigScore}>
                {Math.round(
                  report.overallScore
                )}

                <span style={styles.outOf}>
                  /100
                </span>
              </div>
            </div>

            <div style={styles.scoreCircle}>
              {Math.round(
                report.overallScore
              )}
              %
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              📊 Performance
            </h2>

            <div style={styles.performanceGrid}>
              <div style={styles.performanceItem}>
                <span>
                  Technical Performance
                </span>

                <strong>
                  {Math.round(
                    report.technicalPerformance
                  )}
                  %
                </strong>
              </div>

              <div style={styles.performanceItem}>
                <span>
                  Questions Answered
                </span>

                <strong>
                  {report.questionsAnswered}
                </strong>
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              🎯 Assessed Skills
            </h2>

            <div style={styles.skills}>
              {report.selectedSkills.map(
                (skill) => (
                  <span
                    key={skill}
                    style={styles.skill}
                  >
                    {skill}
                  </span>
                )
              )}
            </div>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              💪 Strengths
            </h2>

            {report.strengths.length > 0 ? (
              <ul style={styles.list}>
                {report.strengths.map(
                  (item, index) => (
                    <li key={index}>
                      {item}
                    </li>
                  )
                )}
              </ul>
            ) : (
              <p style={styles.normalText}>
                No major strengths identified yet.
              </p>
            )}
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              ⚠️ Areas to Improve
            </h2>

            {report.weaknesses.length > 0 ? (
              <ul style={styles.list}>
                {report.weaknesses.map(
                  (item, index) => (
                    <li key={index}>
                      {item}
                    </li>
                  )
                )}
              </ul>
            ) : (
              <p style={styles.normalText}>
                No major weaknesses identified.
              </p>
            )}
          </div>

          <div style={styles.recommendation}>
            <h2>
              🚀 Recommended Next Step
            </h2>

            <p>
              {report.recommendation}
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            style={styles.primaryButton}
          >
            ← Back to Assessment Center
          </button>

        </div>
      </div>
    );
  }

  /* =====================================================
     MAIN PAGE
  ===================================================== */

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* TOP */}

        <div style={styles.topBar}>
          <button
            type="button"
            onClick={() => {
              stopListening();
              onBack();
            }}
            style={styles.backButton}
          >
            ← Exit Interview
          </button>

          {stage === "technical" && (
            <strong style={styles.progress}>
              Question {questionNumber} of{" "}
              {totalQuestions}
            </strong>
          )}
        </div>

        {/* HEADER */}

        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>
              SKILLBRIDGE · MODULE 4
            </div>

            <h1 style={styles.title}>
              AI Mock Interview
            </h1>

            <p style={styles.subtitle}>
              Adaptive interview based on your
              target role and selected skill gaps.
            </p>
          </div>

          <div style={styles.activeBadge}>
            ● AI INTERVIEWER
          </div>
        </div>

        {/* ROLE */}

        <div style={styles.infoRow}>

          <div style={styles.infoCard}>
            <span style={styles.label}>
              TARGET ROLE
            </span>

            <strong style={styles.infoValue}>
              {targetRole}
            </strong>
          </div>

          <div style={styles.infoCard}>
            <span style={styles.label}>
              FOCUS SKILLS
            </span>

            <div style={styles.skills}>
              {selectedSkills.map(
                (skill) => (
                  <span
                    key={skill}
                    style={styles.skill}
                  >
                    {skill}
                  </span>
                )
              )}
            </div>
          </div>

        </div>

        {/* MAIN */}

        <div style={styles.mainGrid}>

          {/* CAMERA */}

          <div style={styles.cameraCard}>

            <div style={styles.cameraHeader}>
              <div>
                <h2 style={styles.cameraTitle}>
                  🎥 Interview Camera
                </h2>

                <p style={styles.cameraText}>
                  Your live interview preview
                </p>
              </div>

              <span
                style={
                  cameraStatus === "active"
                    ? styles.live
                    : styles.offline
                }
              >
                {cameraStatus === "active"
                  ? "● LIVE"
                  : "● OFFLINE"}
              </span>
            </div>

            <div style={styles.videoBox}>

              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={styles.video}
              />

              {cameraStatus !== "active" && (
                <div style={styles.cameraOverlay}>

                  <div style={styles.cameraIcon}>
                    🎥
                  </div>

                  <strong>
                    {cameraStatus === "denied"
                      ? "Camera Access Required"
                      : "Starting Camera..."}
                  </strong>

                  <p>
                    {cameraStatus === "denied"
                      ? "Allow camera access in your browser."
                      : "Please wait..."}
                  </p>

                  {cameraStatus === "denied" && (
                    <button
                      type="button"
                      onClick={startCamera}
                      style={styles.smallButton}
                    >
                      Enable Camera
                    </button>
                  )}

                </div>
              )}

            </div>

            <div style={styles.cameraFooter}>
              🔒 Camera is used for the interview
              experience only.
            </div>

          </div>

          {/* INTERVIEW */}

          <div style={styles.interviewCard}>

            {/* =================================================
               INTRO SCREEN
            ================================================= */}

            {stage === "intro" && (
              <div style={styles.startScreen}>

                <div style={styles.bigAvatar}>
                  🤖
                </div>

                <h2 style={styles.startTitle}>
                  Ready for Your AI Interview?
                </h2>

                <p style={styles.startText}>
                  The AI interviewer will first
                  ask you to introduce yourself.
                  After that, it will ask adaptive
                  technical questions based on your
                  selected skill gaps.
                </p>

                <div style={styles.flowBox}>

                  <div>
                    🎤 Self Introduction
                  </div>

                  <div>
                    ↓
                  </div>

                  <div>
                    🧠 Adaptive Technical Questions
                  </div>

                  <div>
                    ↓
                  </div>

                  <div>
                    📊 Performance Report
                  </div>

                </div>

                <button
                  type="button"
                  onClick={beginInterview}
                  style={styles.startButton}
                >
                  🎙️ Start AI Interview
                </button>

                <p style={styles.clickHint}>
                  Click once to allow the AI
                  interviewer to speak.
                </p>

              </div>
            )}

            {/* =================================================
               SELF INTRODUCTION
            ================================================= */}

            {stage === "selfintro" && (
              <div>

                <div style={styles.aiHeader}>

                  <div style={styles.avatar}>
                    🤖
                  </div>

                  <div>
                    <strong style={styles.aiName}>
                      SkillBridge AI Interviewer
                    </strong>

                    <span style={styles.aiRole}>
                      Opening Question
                    </span>
                  </div>

                </div>

                <div style={styles.questionBox}>

                  <span style={styles.questionLabel}>
                    AI INTERVIEWER
                  </span>

                  <p style={styles.questionText}>
                    Hello! Please introduce
                    yourself and briefly tell me
                    about your background, education,
                    projects and interests.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    speak(
                      "Please introduce yourself and briefly tell me about your background, education, projects and interests."
                    )
                  }
                  style={styles.readButton}
                >
                  🔊 Ask Again
                </button>

                <div style={styles.answerSection}>

                  <div style={styles.answerHeader}>

                    <strong>
                      YOUR INTRODUCTION
                    </strong>

                    {isListening && (
                      <span style={styles.recording}>
                        ● RECORDING
                      </span>
                    )}

                  </div>

                  <textarea
                    value={selfIntroduction}
                    onChange={(e) =>
                      setSelfIntroduction(
                        e.target.value
                      )
                    }
                    placeholder="Speak your introduction or type it here..."
                    style={styles.textarea}
                  />

                  <div style={styles.buttonRow}>

                    {!isListening ? (
                      <button
                        type="button"
                        onClick={() =>
                          startListening("intro")
                        }
                        style={styles.speakButton}
                        disabled={!speechSupported}
                      >
                        🎙️ Start Speaking
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopListening}
                        style={styles.stopButton}
                      >
                        ⏹ Stop Recording
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setSelfIntroduction("")
                      }
                      style={styles.clearButton}
                    >
                      Clear
                    </button>

                  </div>

                  {!speechSupported && (
                    <div style={styles.error}>
                      Speech recognition is not supported
                      in this browser. Please use Google
                      Chrome.
                    </div>
                  )}

                  {error && (
                    <div style={styles.error}>
                      {error}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={
                      startTechnicalInterview
                    }
                    disabled={
                      starting ||
                      !selfIntroduction.trim()
                    }
                    style={{
                      ...styles.continueButton,
                      ...(starting ||
                      !selfIntroduction.trim()
                        ? styles.disabled
                        : {}),
                    }}
                  >
                    {starting
                      ? "Preparing Questions..."
                      : "Continue to Technical Questions →"}
                  </button>

                </div>

              </div>
            )}

            {/* =================================================
               TECHNICAL INTERVIEW
            ================================================= */}

            {stage === "technical" &&
              question && (
                <div>

                  <div style={styles.aiHeader}>

                    <div style={styles.avatar}>
                      🤖
                    </div>

                    <div>
                      <strong style={styles.aiName}>
                        SkillBridge AI Interviewer
                      </strong>

                      <span style={styles.aiRole}>
                        Adaptive Technical Interviewer
                      </span>
                    </div>

                  </div>

                  <div style={styles.metaRow}>

                    <span style={styles.metaSkill}>
                      {question.skill}
                    </span>

                    <span style={styles.metaSubskill}>
                      {question.subskill}
                    </span>

                    <span style={styles.metaDifficulty}>
                      {question.difficulty}
                    </span>

                  </div>

                  <div style={styles.questionBox}>

                    <span style={styles.questionLabel}>
                      AI QUESTION
                    </span>

                    <p style={styles.questionText}>
                      {question.question}
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      speak(question.question)
                    }
                    style={styles.readButton}
                  >
                    🔊 Ask Question Again
                  </button>

                  <div style={styles.answerSection}>

                    <div style={styles.answerHeader}>

                      <div>
                        <strong>
                          YOUR ANSWER
                        </strong>

                        <span style={styles.hint}>
                          Speak naturally or type
                          your answer.
                        </span>
                      </div>

                      {isListening && (
                        <span style={styles.recording}>
                          ● RECORDING
                        </span>
                      )}

                    </div>

                    <textarea
                      value={answer}
                      onChange={(e) =>
                        setAnswer(
                          e.target.value
                        )
                      }
                      placeholder="Your spoken answer will appear here..."
                      style={styles.textarea}
                    />

                    <div style={styles.buttonRow}>

                      {!isListening ? (
                        <button
                          type="button"
                          onClick={() =>
                            startListening("answer")
                          }
                          style={styles.speakButton}
                          disabled={!speechSupported}
                        >
                          🎙️ Start Speaking
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopListening}
                          style={styles.stopButton}
                        >
                          ⏹ Stop Recording
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setAnswer("")
                        }
                        style={styles.clearButton}
                      >
                        Clear
                      </button>

                    </div>

                    {lastEvaluation && (
                      <div style={styles.evaluation}>
                        <strong>
                          Previous Answer Score:{" "}
                          {lastEvaluation.score}/5
                        </strong>
                      </div>
                    )}

                    {error && (
                      <div style={styles.error}>
                        {error}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={
                        evaluateAnswer
                      }
                      disabled={
                        evaluating ||
                        !answer.trim()
                      }
                      style={{
                        ...styles.continueButton,
                        ...(evaluating ||
                        !answer.trim()
                          ? styles.disabled
                          : {}),
                      }}
                    >
                      {evaluating
                        ? "AI Evaluating Your Answer..."
                        : questionNumber >=
                          totalQuestions
                        ? "Finish Interview →"
                        : "Evaluate Answer & Continue →"}
                    </button>

                  </div>

                </div>
              )}

          </div>

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
    background: "#f1f5f9",
    padding: "30px 20px",
    color: "#101828",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  container: {
    maxWidth: "1300px",
    margin: "0 auto",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "15px",
  },

  backButton: {
    background: "#ffffff",
    color: "#1d4ed8",
    border: "1px solid #d0d5dd",
    borderRadius: "8px",
    padding: "10px 14px",
    fontWeight: "800",
    cursor: "pointer",
  },

  progress: {
    color: "#344054",
    padding: "10px",
  },

  header: {
    background: "#ffffff",
    border: "1px solid #dfe3e8",
    borderRadius: "18px",
    padding: "28px",
    marginBottom: "15px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  eyebrow: {
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "1.5px",
    marginBottom: "7px",
  },

  title: {
    color: "#101828",
    fontSize: "30px",
    fontWeight: "900",
    margin: "0 0 7px",
  },

  subtitle: {
    color: "#344054",
    fontSize: "15px",
    lineHeight: "1.6",
  },

  activeBadge: {
    background: "#ecfdf3",
    color: "#067647",
    border: "1px solid #abefc6",
    padding: "9px 12px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "900",
  },

  infoRow: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr",
    gap: "15px",
    marginBottom: "15px",
  },

  infoCard: {
    background: "#ffffff",
    border: "1px solid #dfe3e8",
    borderRadius: "14px",
    padding: "16px",
  },

  label: {
    display: "block",
    color: "#667085",
    fontSize: "10px",
    fontWeight: "900",
    marginBottom: "6px",
  },

  infoValue: {
    color: "#101828",
    fontSize: "16px",
  },

  skills: {
    display: "flex",
    flexWrap: "wrap",
    gap: "7px",
  },

  skill: {
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    padding: "6px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "800",
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "0.95fr 1.35fr",
    gap: "18px",
    alignItems: "start",
  },

  cameraCard: {
    background: "#111827",
    borderRadius: "18px",
    overflow: "hidden",
  },

  cameraHeader: {
    padding: "17px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cameraTitle: {
    color: "#ffffff",
    fontSize: "17px",
    margin: "0",
  },

  cameraText: {
    color: "#d1d5db",
    fontSize: "12px",
    marginTop: "4px",
  },

  live: {
    color: "#bbf7d0",
    background: "#14532d",
    padding: "6px 9px",
    borderRadius: "6px",
    fontSize: "10px",
    fontWeight: "900",
  },

  offline: {
    color: "#fecaca",
    background: "#7f1d1d",
    padding: "6px 9px",
    borderRadius: "6px",
    fontSize: "10px",
    fontWeight: "900",
  },

  videoBox: {
    position: "relative",
    width: "100%",
    aspectRatio: "16 / 10",
    background: "#030712",
  },

  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    transform: "scaleX(-1)",
  },

  cameraOverlay: {
    position: "absolute",
    inset: "0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    background: "rgba(3,7,18,0.9)",
    color: "#ffffff",
    textAlign: "center",
    padding: "20px",
  },

  cameraIcon: {
    fontSize: "40px",
    marginBottom: "10px",
  },

  smallButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "9px 14px",
    borderRadius: "8px",
    fontWeight: "800",
    cursor: "pointer",
  },

  cameraFooter: {
    color: "#d1d5db",
    padding: "12px 18px",
    fontSize: "11px",
  },

  interviewCard: {
    background: "#ffffff",
    border: "1px solid #dfe3e8",
    borderRadius: "18px",
    padding: "25px",
  },

  startScreen: {
    textAlign: "center",
    padding: "30px 15px",
  },

  bigAvatar: {
    fontSize: "60px",
    marginBottom: "12px",
  },

  startTitle: {
    color: "#101828",
    fontSize: "25px",
    fontWeight: "900",
  },

  startText: {
    color: "#344054",
    lineHeight: "1.7",
    maxWidth: "600px",
    margin: "0 auto 20px",
  },

  flowBox: {
    background: "#f8fafc",
    border: "1px solid #d0d5dd",
    borderRadius: "12px",
    padding: "18px",
    lineHeight: "2",
    color: "#101828",
    fontWeight: "700",
    marginBottom: "20px",
  },

  startButton: {
    width: "100%",
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "15px",
    fontSize: "15px",
    fontWeight: "900",
    cursor: "pointer",
  },

  clickHint: {
    color: "#667085",
    fontSize: "11px",
    marginTop: "9px",
  },

  aiHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "18px",
  },

  avatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: "#ede9fe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
  },

  aiName: {
    display: "block",
    color: "#101828",
    fontSize: "15px",
  },

  aiRole: {
    display: "block",
    color: "#475467",
    fontSize: "12px",
    marginTop: "3px",
  },

  questionBox: {
    background: "#f8fafc",
    border: "1px solid #d0d5dd",
    borderRadius: "13px",
    padding: "20px",
    marginBottom: "12px",
  },

  questionLabel: {
    display: "block",
    color: "#2563eb",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1px",
    marginBottom: "9px",
  },

  questionText: {
    color: "#101828",
    fontSize: "19px",
    lineHeight: "1.65",
    fontWeight: "700",
    margin: "0",
  },

  readButton: {
    background: "#eef2ff",
    color: "#3730a3",
    border: "1px solid #c7d2fe",
    borderRadius: "8px",
    padding: "9px 13px",
    fontWeight: "800",
    cursor: "pointer",
    marginBottom: "18px",
  },

  answerSection: {
    borderTop: "1px solid #eaecf0",
    paddingTop: "18px",
  },

  answerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#101828",
    marginBottom: "8px",
  },

  hint: {
    display: "block",
    color: "#475467",
    fontSize: "11px",
    marginTop: "3px",
    fontWeight: "500",
  },

  recording: {
    background: "#fee4e2",
    color: "#b42318",
    padding: "6px 9px",
    borderRadius: "6px",
    fontSize: "10px",
    fontWeight: "900",
  },

  textarea: {
    width: "100%",
    minHeight: "145px",
    boxSizing: "border-box",
    resize: "vertical",
    background: "#ffffff",
    color: "#101828",
    border: "2px solid #cbd5e1",
    borderRadius: "12px",
    padding: "15px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    fontSize: "16px",
    lineHeight: "1.6",
    outline: "none",
  },

  buttonRow: {
    display: "flex",
    gap: "9px",
    marginTop: "10px",
  },

  speakButton: {
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 15px",
    fontWeight: "800",
    cursor: "pointer",
  },

  stopButton: {
    background: "#dc2626",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 15px",
    fontWeight: "800",
    cursor: "pointer",
  },

  clearButton: {
    background: "#ffffff",
    color: "#344054",
    border: "1px solid #d0d5dd",
    borderRadius: "8px",
    padding: "10px 15px",
    fontWeight: "700",
    cursor: "pointer",
  },

  continueButton: {
    width: "100%",
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    padding: "14px",
    marginTop: "15px",
    fontWeight: "900",
    fontSize: "14px",
    cursor: "pointer",
  },

  disabled: {
    background: "#98a2b3",
    cursor: "not-allowed",
  },

  metaRow: {
    display: "flex",
    gap: "7px",
    marginBottom: "14px",
  },

  metaSkill: {
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "6px 9px",
    borderRadius: "6px",
    fontWeight: "800",
    fontSize: "11px",
  },

  metaSubskill: {
    background: "#f2f4f7",
    color: "#344054",
    padding: "6px 9px",
    borderRadius: "6px",
    fontWeight: "700",
    fontSize: "11px",
  },

  metaDifficulty: {
    background: "#fff7ed",
    color: "#c2410c",
    padding: "6px 9px",
    borderRadius: "6px",
    fontWeight: "800",
    fontSize: "11px",
  },

  evaluation: {
    background: "#ecfdf3",
    color: "#166534",
    border: "1px solid #bbf7d0",
    borderRadius: "8px",
    padding: "10px",
    marginTop: "12px",
  },

  error: {
    background: "#fef3f2",
    color: "#b42318",
    border: "1px solid #fecdca",
    borderRadius: "8px",
    padding: "10px",
    marginTop: "12px",
    fontWeight: "600",
  },

  reportContainer: {
    maxWidth: "950px",
    margin: "0 auto",
  },

  reportHeader: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "35px",
    textAlign: "center",
    marginBottom: "18px",
  },

  reportIcon: {
    fontSize: "45px",
  },

  scoreCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "25px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
  },

  scoreLabel: {
    color: "#667085",
    fontSize: "11px",
    fontWeight: "900",
  },

  bigScore: {
    color: "#101828",
    fontSize: "48px",
    fontWeight: "900",
  },

  outOf: {
    color: "#667085",
    fontSize: "20px",
  },

  scoreCircle: {
    width: "90px",
    height: "90px",
    borderRadius: "50%",
    background: "#eff6ff",
    border: "8px solid #2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#1d4ed8",
    fontWeight: "900",
  },

  card: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "22px",
    marginBottom: "15px",
  },

  cardTitle: {
    color: "#101828",
    fontSize: "17px",
    fontWeight: "900",
  },

  performanceGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },

  performanceItem: {
    background: "#f8fafc",
    padding: "15px",
    borderRadius: "10px",
    display: "flex",
    justifyContent: "space-between",
    color: "#344054",
  },

  list: {
    color: "#344054",
    lineHeight: "1.8",
  },

  normalText: {
    color: "#344054",
  },

  recommendation: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "15px",
    padding: "22px",
    marginBottom: "18px",
    color: "#344054",
  },

  primaryButton: {
    display: "block",
    margin: "0 auto",
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "9px",
    padding: "13px 20px",
    fontWeight: "900",
    cursor: "pointer",
  },
};

export default AIInterview;