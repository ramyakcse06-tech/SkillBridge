import React, { useEffect, useState } from "react";
import AptitudeTest from "./AptitudeTest";
import TechnicalTest from "./TechnicalTest";
import CodingTest from "./CodingTest";
import AIInterview from "./AIInterview";
import PlacementReadiness from "./PlacementReadiness";


/* =========================================================
   TYPES
========================================================= */

interface Skill {
  skill_id: string;
  skill: string;
  relation_type: string;
  skill_type: string;
}

interface SkillGapData {
  success: boolean;

  student: {
    id: number;
    name: string;
    skill_count: number;
  };

  target_job: {
    occupation_id: string;
    occupation_label: string;
    description: string;
  };

  analysis: {
    required_skill_count: number;
    matched_skill_count: number;
    missing_skill_count: number;
    match_percentage: number;
    gap_percentage: number;
  };

  matched_skills: Skill[];
  missing_skills: Skill[];
}

interface Props {
  studentId: number;
  occupationId: string;
  onBack: () => void;
}

/* =========================================================
   COMPONENT
========================================================= */

function AssessmentCenter({
  studentId,
  occupationId,
  onBack,
}: Props) {
  const [data, setData] =
    useState<SkillGapData | null>(null);

  const [selectedSkills, setSelectedSkills] =
    useState<string[]>([]);

  const [assessmentType, setAssessmentType] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  

  /* =========================================================
     LOAD SKILL GAP DATA
  ========================================================= */

  useEffect(() => {
    const loadSkillGaps = async () => {
      try {
        setLoading(true);
        setError("");

        // Load the student's skill-gap data.
        // Backend route:
        // GET /api/students/:studentId/skill-gap?occupationId=...
        const response = await fetch(
          `/api/students/${studentId}/skill-gap?occupationId=${encodeURIComponent(
            occupationId
          )}`,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        // Prevent HTML responses from causing:
        // Unexpected token '<', "<!DOCTYPE "... is not valid JSON
        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          const text = await response.text();

          console.error(
            "Skill Gap API returned non-JSON response:",
            response.status,
            text.slice(0, 200)
          );

          throw new Error(
            `Skill Gap API returned ${response.status} instead of JSON.`
          );
        }

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "Failed to load skill gaps."
          );
        }

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load skill gaps."
        );
      } finally {
        setLoading(false);
      }
    };

    loadSkillGaps();
  }, [studentId, occupationId]);

  /* =========================================================
     TOGGLE SKILL
  ========================================================= */

  const toggleSkill = (skillId: string) => {
    setSelectedSkills((current) => {
      if (current.includes(skillId)) {
        return current.filter(
          (id) => id !== skillId
        );
      }

      return [...current, skillId];
    });
  };

  /* =========================================================
     APTITUDE TEST
  ========================================================= */

  if (assessmentType === "aptitude") {
    return (
      <AptitudeTest
        studentId={studentId}
        occupationId={occupationId}
        selectedSkills={selectedSkills}
        onBack={() =>
          setAssessmentType(null)
        }
      />
    );
  }

  /* =========================================================
     TECHNICAL TEST
  ========================================================= */

  if (assessmentType === "technical") {
    return (
      <TechnicalTest
        studentId={studentId}
        occupationId={occupationId}
        selectedSkills={selectedSkills}
        onBack={() =>
          setAssessmentType(null)
        }
      />
    );
  }

  /* =========================================================
     CODING TEST
  ========================================================= */

  if (assessmentType === "coding") {
    return (
      <CodingTest
        studentId={studentId}
        occupationId={occupationId}
        selectedSkills={selectedSkills}
        onBack={() =>
          setAssessmentType(null)
        }
      />
    );
  }

  /* =========================================================
     AI MOCK INTERVIEW
  ========================================================= */

  if (assessmentType === "interview") {
    return (
      <AIInterview
        studentId={studentId}
        occupationId={occupationId}
        selectedSkills={selectedSkills}
        targetRole={
          data?.target_job?.occupation_label ||
          "Target Role"
        }
        onBack={() =>
          setAssessmentType(null)
        }
      />
    );
  }

  if (assessmentType === "readiness") {
  return (
    <PlacementReadiness
      studentId={studentId}
      occupationId={occupationId}
      onBack={() => setAssessmentType(null)}
    />
  );
}

  <div
  style={styles.assessmentCard}
  onClick={() =>
    setAssessmentType("readiness")
  }
>
  <div style={styles.icon}>
    🎯
  </div>

  <h3>
    Placement Readiness
  </h3>

  <p>
    See your job-specific readiness score,
    skill coverage, critical gaps and
    improvement recommendations.
  </p>

  <span style={styles.startText}>
    View Readiness →
  </span>
</div>

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.loadingIcon}>
          ⏳
        </div>

        <h2 style={styles.loadingTitle}>
          Preparing Assessment Center...
        </h2>

        <p style={styles.loadingText}>
          Loading your skill gaps and assessment
          options.
        </p>
      </div>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <div style={styles.center}>
        <div style={styles.errorIcon}>
          ⚠️
        </div>

        <h2 style={styles.errorTitle}>
          Unable to load assessment
        </h2>

        <p style={styles.errorText}>
          {error}
        </p>

        <button
          type="button"
          onClick={onBack}
          style={styles.backButton}
        >
          ← Back
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  /* =========================================================
     MAIN PAGE
  ========================================================= */

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* =================================================
            BACK BUTTON
        ================================================= */}

        <button
          type="button"
          onClick={onBack}
          style={styles.backButton}
        >
          ← Back to Skill Gap
        </button>

        {/* =================================================
            HEADER
        ================================================= */}

        <div style={styles.header}>

          <p style={styles.eyebrow}>
            SKILLBRIDGE · MODULE 4
          </p>

          <h1 style={styles.title}>
            Assessment Center
          </h1>

          <p style={styles.subtitle}>
            Test your knowledge and performance
            on the skills required for your
            target role.
          </p>

          {/* TARGET ROLE */}

          <div style={styles.jobBox}>

            <span style={styles.jobLabel}>
              TARGET ROLE
            </span>

            <strong style={styles.jobName}>
              {data.target_job.occupation_label}
            </strong>

          </div>

        </div>

        {/* =================================================
            STEP 1 — SELECT SKILLS
        ================================================= */}

        <div style={styles.section}>

          <div style={styles.stepNumber}>
            01
          </div>

          <div style={styles.sectionContent}>

            <h2 style={styles.sectionTitle}>
              Select the skills you want to
              assess
            </h2>

            <p style={styles.sectionDescription}>
              These skills are taken directly
              from your current skill gaps for
              the selected target role.
            </p>

            {/* ============================================
                STATISTICS
            ============================================ */}

            <div style={styles.stats}>

              <div style={styles.stat}>
                <strong
                  style={styles.statNumber}
                >
                  {
                    data.analysis
                      .missing_skill_count
                  }
                </strong>

                <span style={styles.statLabel}>
                  Skill Gaps
                </span>
              </div>

              <div style={styles.stat}>
                <strong
                  style={styles.statNumber}
                >
                  {selectedSkills.length}
                </strong>

                <span style={styles.statLabel}>
                  Selected
                </span>
              </div>

              <div style={styles.stat}>
                <strong
                  style={styles.statNumber}
                >
                  {Math.round(
                    data.analysis
                      .match_percentage
                  )}
                  %
                </strong>

                <span style={styles.statLabel}>
                  Current Match
                </span>
              </div>

            </div>

            {/* ============================================
                NO SKILLS
            ============================================ */}

            {data.missing_skills.length ===
            0 ? (
              <div style={styles.noSkills}>
                <strong
                  style={styles.noSkillsTitle}
                >
                  🎉 No missing skills found
                </strong>

                <p
                  style={styles.noSkillsText}
                >
                  Your current profile covers
                  the required skills for this
                  role.
                </p>
              </div>
            ) : (

              /* ==========================================
                 SKILL GRID
              ========================================== */

              <div style={styles.skillGrid}>

                {data.missing_skills.map(
                  (skill) => {

                    const selected =
                      selectedSkills.includes(
                        skill.skill_id
                      );

                    return (
                      <button
                        key={skill.skill_id}
                        type="button"
                        onClick={() =>
                          toggleSkill(
                            skill.skill_id
                          )
                        }
                        style={{
                          ...styles.skillCard,

                          ...(selected
                            ? styles.selectedSkill
                            : {}),
                        }}
                      >

                        {/* CHECKBOX */}

                        <div
                          style={{
                            ...styles.checkbox,

                            ...(selected
                              ? styles.selectedCheckbox
                              : {}),
                          }}
                        >
                          {selected
                            ? "✓"
                            : ""}
                        </div>

                        {/* SKILL INFORMATION */}

                        <div
                          style={
                            styles.skillInfo
                          }
                        >

                          <strong
                            style={
                              styles.skillName
                            }
                          >
                            {skill.skill}
                          </strong>

                          <span
                            style={
                              styles.skillType
                            }
                          >
                            {skill.skill_type}
                          </span>

                        </div>

                        {/* ESSENTIAL / OPTIONAL */}

                        <span
                          style={
                            skill.relation_type ===
                            "essential"
                              ? styles.essential
                              : styles.optional
                          }
                        >
                          {skill.relation_type}
                        </span>

                      </button>
                    );
                  }
                )}

              </div>
            )}

          </div>
        </div>

        {/* =================================================
            STEP 2 — ASSESSMENT TYPE
        ================================================= */}

        <div style={styles.section}>

          <div style={styles.stepNumber}>
            02
          </div>

          <div style={styles.sectionContent}>

            <h2 style={styles.sectionTitle}>
              Choose an assessment type
            </h2>

            <p style={styles.sectionDescription}>
              Your assessment will focus on
              the skill gaps you selected above.
            </p>

            {/* ============================================
                FOCUS INFORMATION
            ============================================ */}

            {selectedSkills.length > 0 && (
              <div style={styles.focusBox}>

                <div style={styles.focusIcon}>
                  🎯
                </div>

                <div>
                  <strong
                    style={styles.focusTitle}
                  >
                    Assessment Focus
                  </strong>

                  <p style={styles.focusText}>
                    {selectedSkills.length} skill
                    {selectedSkills.length > 1
                      ? "s"
                      : ""} selected. Your
                    assessment will target
                    these skill gaps.
                  </p>
                </div>

              </div>
            )}

            {/* ============================================
                ASSESSMENT CARDS
            ============================================ */}

            <div
              style={styles.assessmentGrid}
            >

              {/* ==========================================
                  APTITUDE
              ========================================== */}

              <button
                type="button"
                disabled={
                  selectedSkills.length === 0
                }
                onClick={() => {
                  if (
                    selectedSkills.length > 0
                  ) {
                    setAssessmentType(
                      "aptitude"
                    );
                  }
                }}
                style={{
                  ...styles.assessmentCard,

                  ...(selectedSkills.length ===
                  0
                    ? styles.disabledCard
                    : styles.clickableCard),
                }}
              >

                <div style={styles.icon}>
                  🧠
                </div>

                <h3 style={styles.cardTitle}>
                  Aptitude Test
                </h3>

                <p style={styles.cardText}>
                  Measure reasoning,
                  quantitative ability,
                  logical thinking and
                  problem-solving skills.
                </p>

                <span style={styles.available}>
                  Start Assessment →
                </span>

              </button>

              {/* ==========================================
                  TECHNICAL MCQ
              ========================================== */}

              <button
                type="button"
                disabled={
                  selectedSkills.length === 0
                }
                onClick={() => {
                  if (
                    selectedSkills.length > 0
                  ) {
                    setAssessmentType(
                      "technical"
                    );
                  }
                }}
                style={{
                  ...styles.assessmentCard,

                  ...(selectedSkills.length ===
                  0
                    ? styles.disabledCard
                    : styles.clickableCard),
                }}
              >

                <div style={styles.icon}>
                  💻
                </div>

                <h3 style={styles.cardTitle}>
                  Technical MCQ
                </h3>

                <p style={styles.cardText}>
                  Test your technical knowledge
                  using the verified technical
                  question bank.
                </p>

                <span style={styles.available}>
                  Start Assessment →
                </span>

              </button>

              {/* ==========================================
                  CODING
              ========================================== */}

              <button
                type="button"
                disabled={
                  selectedSkills.length === 0
                }
                onClick={() => {
                  if (
                    selectedSkills.length > 0
                  ) {
                    setAssessmentType(
                      "coding"
                    );
                  }
                }}
                style={{
                  ...styles.assessmentCard,

                  ...(selectedSkills.length ===
                  0
                    ? styles.disabledCard
                    : styles.clickableCard),
                }}
              >

                <div style={styles.icon}>
                  👨‍💻
                </div>

                <h3 style={styles.cardTitle}>
                  Coding Assessment
                </h3>

                <p style={styles.cardText}>
                  Solve programming problems
                  and demonstrate practical
                  coding ability.
                </p>

                <span style={styles.available}>
                  Start Assessment →
                </span>

              </button>

              {/* ==========================================
                  AI MOCK INTERVIEW
              ========================================== */}

              <button
                type="button"
                disabled={
                  selectedSkills.length === 0
                }
                onClick={() => {
                  if (
                    selectedSkills.length > 0
                  ) {
                    setAssessmentType(
                      "interview"
                    );
                  }
                }}
                style={{
                  ...styles.assessmentCard,
                  ...styles.interviewCard,

                  ...(selectedSkills.length ===
                  0
                    ? styles.disabledCard
                    : styles.clickableCard),
                }}
              >

                <div style={styles.icon}>
                  🎤
                </div>

                <h3 style={styles.cardTitle}>
                  AI Mock Interview
                </h3>

                <p style={styles.cardText}>
                  Practice with an adaptive
                  voice-based AI interviewer
                  focused on your selected
                  skill gaps and target role.
                </p>

                <div
                  style={
                    styles.interviewBadge
                  }
                >
                  🤖 AI POWERED
                </div>

                <span style={styles.available}>
                  Start Interview →
                </span>

              </button>

            </div>

            <div
  style={{
    ...styles.assessmentCard,
    cursor: "pointer",
  }}
  onClick={() => setAssessmentType("readiness")}
>
  <div style={styles.icon}>
    🎯
  </div>

  <h3>
    Placement Readiness
  </h3>

  <p>
    See your job-specific readiness score,
    skill coverage, critical gaps and
    improvement recommendations.
  </p>

  <button
    type="button"
    onClick={(event) => {
      event.stopPropagation();
      setAssessmentType("readiness");
    }}
    style={{
      ...styles.startButton,
      marginTop: "15px",
    }}
  >
    View Readiness →
  </button>
</div>

            {/* =================================================
                SELECTION FOOTER
            ================================================= */}

            <div
              style={styles.selectionFooter}
            >

              <div>

                <strong
                  style={
                    styles.selectionTitle
                  }
                >
                  {selectedSkills.length ===
                  0
                    ? "No skills selected"
                    : `${selectedSkills.length} skill${
                        selectedSkills.length >
                        1
                          ? "s"
                          : ""
                      } selected`}
                </strong>

                <p
                  style={
                    styles.selectionDescription
                  }
                >
                  {selectedSkills.length ===
                  0
                    ? "Select at least one skill to continue."
                    : "Choose an assessment above to begin."}
                </p>

              </div>

              <button
                type="button"
                disabled={
                  selectedSkills.length === 0
                }
                onClick={() => {
                  if (
                    selectedSkills.length > 0
                  ) {
                    setAssessmentType(
                      "aptitude"
                    );
                  }
                }}
                style={{
                  ...styles.continueButton,

                  ...(selectedSkills.length ===
                  0
                    ? styles.disabledButton
                    : {}),
                }}
              >
                Continue →
              </button>

            </div>

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

  /* =======================================================
     PAGE
  ======================================================= */

  page: {
    minHeight: "100vh",
    background: "#f3f6fb",
    padding: "40px 20px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#101828",
  },

  container: {
    maxWidth: "1200px",
    margin: "0 auto",
  },

  /* =======================================================
     CENTER / LOADING
  ======================================================= */

  center: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#101828",
    padding: "30px",
    textAlign: "center",
    background: "#f3f6fb",
  },

  loadingIcon: {
    fontSize: "42px",
    marginBottom: "15px",
  },

  loadingTitle: {
    color: "#101828",
    fontSize: "24px",
    fontWeight: "800",
    margin: "0 0 8px",
  },

  loadingText: {
    color: "#344054",
    fontSize: "15px",
    fontWeight: "500",
  },

  errorIcon: {
    fontSize: "42px",
    marginBottom: "15px",
  },

  errorTitle: {
    color: "#b42318",
    fontSize: "24px",
    fontWeight: "800",
    margin: "0 0 8px",
  },

  errorText: {
    color: "#344054",
    fontSize: "15px",
    fontWeight: "500",
    marginBottom: "20px",
  },

  /* =======================================================
     BACK BUTTON
  ======================================================= */

  backButton: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    marginBottom: "20px",
    fontSize: "15px",
    color: "#1d4ed8",
    fontWeight: "800",
    padding: "8px 0",
  },

  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "32px",
    marginBottom: "20px",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.06)",
    border:
      "1px solid #dfe3e8",
  },

  eyebrow: {
    fontSize: "12px",
    fontWeight: "800",
    letterSpacing: "1.5px",
    color: "#2563eb",
    margin: "0 0 8px",
  },

  title: {
    margin: "0",
    fontSize: "32px",
    color: "#101828",
    fontWeight: "800",
  },

  subtitle: {
    color: "#344054",
    fontSize: "16px",
    lineHeight: "1.6",
    maxWidth: "750px",
    marginTop: "10px",
    marginBottom: "0",
    fontWeight: "500",
  },

  /* =======================================================
     TARGET JOB
  ======================================================= */

  jobBox: {
    marginTop: "20px",
    padding: "16px 18px",
    background: "#eff6ff",
    border:
      "1px solid #bfdbfe",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  jobLabel: {
    fontSize: "10px",
    fontWeight: "800",
    color: "#475467",
    letterSpacing: "1px",
  },

  jobName: {
    color: "#1e3a8a",
    fontSize: "17px",
    fontWeight: "800",
  },

  /* =======================================================
     SECTION
  ======================================================= */

  section: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "30px",
    marginBottom: "20px",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.06)",
    border:
      "1px solid #dfe3e8",
    display: "flex",
    gap: "25px",
  },

  stepNumber: {
    minWidth: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "#2563eb",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    fontSize: "13px",
  },

  sectionContent: {
    flex: 1,
  },

  sectionTitle: {
    marginTop: "0",
    color: "#101828",
    fontSize: "21px",
    fontWeight: "800",
  },

  sectionDescription: {
    color: "#344054",
    lineHeight: "1.6",
    fontSize: "15px",
    fontWeight: "500",
  },

  /* =======================================================
     STATS
  ======================================================= */

  stats: {
    display: "flex",
    gap: "15px",
    margin: "20px 0",
    flexWrap: "wrap",
  },

  stat: {
    background: "#f8fafc",
    border:
      "1px solid #d0d5dd",
    borderRadius: "10px",
    padding: "13px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: "100px",
  },

  statNumber: {
    color: "#101828",
    fontSize: "21px",
    fontWeight: "800",
  },

  statLabel: {
    color: "#344054",
    fontSize: "13px",
    fontWeight: "700",
  },

  /* =======================================================
     SKILLS
  ======================================================= */

  skillGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "10px",
  },

  skillCard: {
    border:
      "1px solid #d0d5dd",
    borderRadius: "12px",
    padding: "14px",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    cursor: "pointer",
    textAlign: "left",
    color: "#101828",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  selectedSkill: {
    border:
      "2px solid #2563eb",
    background: "#eff6ff",
  },

  checkbox: {
    width: "24px",
    height: "24px",
    border:
      "1px solid #98a2b3",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#344054",
    fontWeight: "800",
    flexShrink: 0,
    background: "#ffffff",
  },

  selectedCheckbox: {
    background: "#2563eb",
    border:
      "1px solid #2563eb",
    color: "#ffffff",
  },

  skillInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  skillName: {
    color: "#101828",
    fontSize: "14px",
    fontWeight: "800",
  },

  skillType: {
    color: "#475467",
    fontSize: "12px",
    fontWeight: "600",
  },

  essential: {
    background: "#fee4e2",
    color: "#b42318",
    padding: "5px 8px",
    borderRadius: "6px",
    fontSize: "10px",
    whiteSpace: "nowrap",
    fontWeight: "800",
  },

  optional: {
    background: "#f2f4f7",
    color: "#344054",
    padding: "5px 8px",
    borderRadius: "6px",
    fontSize: "10px",
    whiteSpace: "nowrap",
    fontWeight: "800",
  },

  /* =======================================================
     NO SKILLS
  ======================================================= */

  noSkills: {
    background: "#ecfdf3",
    border:
      "1px solid #abefc6",
    borderRadius: "12px",
    padding: "18px",
  },

  noSkillsTitle: {
    color: "#067647",
    fontSize: "15px",
    fontWeight: "800",
  },

  noSkillsText: {
    margin:
      "7px 0 0",
    color: "#344054",
    fontSize: "14px",
    fontWeight: "500",
  },

  /* =======================================================
     FOCUS BOX
  ======================================================= */

  focusBox: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    background: "#f0fdf4",
    border:
      "1px solid #bbf7d0",
    borderRadius: "12px",
    padding: "15px 18px",
    marginTop: "18px",
    marginBottom: "5px",
  },

  focusIcon: {
    fontSize: "25px",
  },

  focusTitle: {
    color: "#166534",
    fontSize: "14px",
    fontWeight: "800",
  },

  focusText: {
    margin:
      "4px 0 0",
    color: "#344054",
    fontSize: "13px",
    fontWeight: "500",
  },

  /* =======================================================
     ASSESSMENT GRID
  ======================================================= */

  assessmentGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "15px",
    marginTop: "20px",
  },

  /* =======================================================
     ASSESSMENT CARD
  ======================================================= */

  assessmentCard: {
    border:
      "1px solid #d0d5dd",
    borderRadius: "14px",
    padding: "20px",
    background: "#ffffff",
    textAlign: "left",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#101828",
    minHeight: "240px",
    boxSizing: "border-box",
  },

  clickableCard: {
    cursor: "pointer",
  },

  disabledCard: {
    opacity: 0.55,
    cursor: "not-allowed",
    background: "#f8fafc",
  },

  /* =======================================================
     AI INTERVIEW CARD
  ======================================================= */

  interviewCard: {
    border:
      "2px solid #7c3aed",
    background: "#faf5ff",
  },

  icon: {
    fontSize: "30px",
    marginBottom: "10px",
  },

  cardTitle: {
    color: "#101828",
    margin:
      "8px 0",
    fontSize: "18px",
    fontWeight: "800",
  },

  cardText: {
    color: "#344054",
    lineHeight: "1.5",
    fontSize: "14px",
    minHeight: "70px",
    fontWeight: "500",
  },

  available: {
    display: "inline-block",
    marginTop: "10px",
    fontSize: "12px",
    color: "#1d4ed8",
    background: "#dbeafe",
    padding: "7px 10px",
    borderRadius: "6px",
    fontWeight: "800",
  },

  interviewBadge: {
    display: "inline-block",
    marginTop: "5px",
    marginRight: "8px",
    fontSize: "11px",
    color: "#6d28d9",
    background: "#ede9fe",
    padding: "7px 10px",
    borderRadius: "6px",
    fontWeight: "800",
  },

  /* =======================================================
     FOOTER
  ======================================================= */

  selectionFooter: {
    marginTop: "25px",
    padding: "20px",
    background: "#f8fafc",
    border:
      "1px solid #d0d5dd",
    borderRadius: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
  },

  selectionTitle: {
    color: "#101828",
    fontWeight: "800",
    fontSize: "15px",
  },

  selectionDescription: {
    color: "#344054",
    margin:
      "6px 0 0",
    fontSize: "13px",
    fontWeight: "500",
  },

  continueButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "13px 22px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "800",
    whiteSpace: "nowrap",
  },

  disabledButton: {
    background: "#98a2b3",
    color: "#ffffff",
    cursor: "not-allowed",
  },
};

export default AssessmentCenter;