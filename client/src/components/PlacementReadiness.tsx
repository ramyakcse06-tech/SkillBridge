import React, { useEffect, useMemo, useState } from "react";

interface Skill {
  skill_id: string;
  skill: string;
  relation_type: string;
  status: string;
  mastery_score: number;
}

interface ComponentScore {
  key: string;
  label: string;
  weight: number;
  score: number | null;
  available: boolean;
}

interface ReadinessData {
  success: boolean;
  targetRole: string;
  occupationId: string;
  score: number;
  readinessBand: string;
  confidence: string;

  coverage: {
    required: number;
    matched: number;
    missing: number;
    percentage: number;
  };

  components: ComponentScore[];

  skills: Skill[];
  matchedSkills: Skill[];
  missingSkills: Skill[];
  criticalBlockers: Skill[];

  strengths: string[];
  weaknesses: string[];

  incompleteComponents: string[];

  knowledgeGaps: string[];
  performanceGaps: string[];

  recommendation: string;
}

interface WhatIfResult {
  success: boolean;

  current: {
    readiness: number;
    readinessBand: string;
    skillCoverage: number;
  };

  projected: {
    readiness: number;
    readinessBand: string;
    skillCoverage: number;
  };

  improvement: number;

  skillsAdded: string[];

  assessmentScores: {
    technical: number | null;
    coding: number | null;
    interview: number | null;
  };

  message: string;
}

interface Props {
  studentId: number;
  occupationId: string;
  onBack: () => void;
}

function PlacementReadiness({
  studentId,
  occupationId,
  onBack,
}: Props) {
  const [data, setData] =
    useState<ReadinessData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    selectedWhatIfSkills,
    setSelectedWhatIfSkills,
  ] = useState<string[]>([]);

  const [whatIfResult, setWhatIfResult] =
    useState<WhatIfResult | null>(null);

  const [whatIfLoading, setWhatIfLoading] =
    useState(false);

  /* =====================================================
     LOAD READINESS
  ===================================================== */

  const loadReadiness = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `http://localhost:5000/api/readiness/${studentId}/${encodeURIComponent(
          occupationId
        )}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Unable to load placement readiness."
        );
      }

      setData(result);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load placement readiness."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReadiness();
  }, [studentId, occupationId]);

  /* =====================================================
     WHAT IF
  ===================================================== */

  const toggleWhatIfSkill = (
    skillId: string
  ) => {
    setSelectedWhatIfSkills((current) =>
      current.includes(skillId)
        ? current.filter(
            (id) => id !== skillId
          )
        : [...current, skillId]
    );

    setWhatIfResult(null);
  };

  const runWhatIf = async () => {
    if (
      selectedWhatIfSkills.length === 0
    ) {
      return;
    }

    try {
      setWhatIfLoading(true);

      const response = await fetch(
        `http://localhost:5000/api/readiness/${studentId}/${encodeURIComponent(
          occupationId
        )}/what-if`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            skillsToLearn:
              selectedWhatIfSkills,
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
            "Unable to calculate projected readiness."
        );
      }

      setWhatIfResult(result);
    } catch (err) {
      console.error(err);

      alert(
        err instanceof Error
          ? err.message
          : "Unable to calculate projected readiness."
      );
    } finally {
      setWhatIfLoading(false);
    }
  };

  /* =====================================================
     READINESS HELPERS
  ===================================================== */

  const scoreColor = useMemo(() => {
    if (!data) return "#2563eb";

    if (data.score >= 80) {
      return "#16a34a";
    }

    if (data.score >= 65) {
      return "#2563eb";
    }

    if (data.score >= 50) {
      return "#d97706";
    }

    return "#dc2626";
  }, [data]);

  const scoreDegrees = data
    ? Math.min(data.score, 100) * 3.6
    : 0;

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>
            🎯
          </div>

          <h2 style={styles.loadingTitle}>
            Calculating Placement Readiness
          </h2>

          <p style={styles.loadingText}>
            Analyzing your skills, assessments
            and target-role requirements...
          </p>

          <div style={styles.loadingBar}>
            <div
              style={styles.loadingBarFill}
            />
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     ERROR
  ===================================================== */

  if (error || !data) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>
            ⚠️
          </div>

          <h2 style={styles.loadingTitle}>
            Unable to Load Readiness
          </h2>

          <p style={styles.loadingText}>
            {error}
          </p>

          <div style={styles.buttonRow}>
            <button
              onClick={loadReadiness}
              style={styles.primaryButton}
            >
              Try Again
            </button>

            <button
              onClick={onBack}
              style={styles.secondaryButton}
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     MAIN
  ===================================================== */

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* =================================================
            TOP NAVIGATION
        ================================================= */}

        <div style={styles.topBar}>

          <button
            onClick={onBack}
            style={styles.backButton}
          >
            ← Assessment Center
          </button>

          <span style={styles.moduleBadge}>
            MODULE 5
          </span>

        </div>

        {/* =================================================
            HEADER
        ================================================= */}

        <div style={styles.hero}>

          <div style={styles.heroLeft}>

            <div style={styles.eyebrow}>
              SKILLBRIDGE · PLACEMENT INTELLIGENCE
            </div>

            <h1 style={styles.heroTitle}>
              Placement Readiness
            </h1>

            <p style={styles.heroDescription}>
              A job-specific view of how ready
              you are, what is holding you back,
              and what will have the highest
              impact on your readiness.
            </p>

            <div style={styles.targetRole}>
              <span style={styles.targetLabel}>
                TARGET ROLE
              </span>

              <strong style={styles.targetValue}>
                {data.targetRole}
              </strong>
            </div>

          </div>

          <div
            style={{
              ...styles.scoreRing,

              background: `conic-gradient(
                ${scoreColor} ${scoreDegrees}deg,
                #e5e7eb ${scoreDegrees}deg
              )`,
            }}
          >

            <div style={styles.scoreRingInner}>

              <span style={styles.scoreNumber}>
                {Math.round(data.score)}
              </span>

              <span style={styles.scoreOutOf}>
                /100
              </span>

              <span style={styles.scoreSmall}>
                READINESS
              </span>

            </div>

          </div>

        </div>

        {/* =================================================
            READINESS BAND
        ================================================= */}

        <div
          style={{
            ...styles.bandBanner,

            borderColor:
              scoreColor,

            background:
              data.score >= 80
                ? "#f0fdf4"
                : data.score >= 65
                ? "#eff6ff"
                : data.score >= 50
                ? "#fffbeb"
                : "#fef2f2",
          }}
        >

          <div>

            <span style={styles.bandLabel}>
              CURRENT READINESS
            </span>

            <h2
              style={{
                ...styles.bandTitle,
                color: scoreColor,
              }}
            >
              {data.readinessBand}
            </h2>

          </div>

          <div style={styles.confidenceBox}>

            <span>
              Evidence Confidence
            </span>

            <strong
              style={{
                color: scoreColor,
              }}
            >
              {data.confidence}
            </strong>

          </div>

        </div>

        {/* =================================================
            SCORE BREAKDOWN
        ================================================= */}

        <section style={styles.section}>

          <div style={styles.sectionHeader}>

            <div>
              <span style={styles.sectionEyebrow}>
                SCORE INTELLIGENCE
              </span>

              <h2 style={styles.sectionTitle}>
                Readiness Score Breakdown
              </h2>

              <p style={styles.sectionDescription}>
                Your score is calculated from the
                evidence currently available.
              </p>
            </div>

          </div>

          <div style={styles.componentGrid}>

            {data.components.map(
              (component) => {

                const score =
                  component.score;

                return (
                  <div
                    key={component.key}
                    style={
                      component.available
                        ? styles.componentCard
                        : styles.componentCardDisabled
                    }
                  >

                    <div
                      style={
                        styles.componentHeader
                      }
                    >

                      <div>
                        <strong
                          style={
                            styles.componentName
                          }
                        >
                          {component.label}
                        </strong>

                        <span
                          style={
                            styles.componentWeight
                          }
                        >
                          Weight:{" "}
                          {component.weight}%
                        </span>
                      </div>

                      {component.available ? (
                        <strong
                          style={{
                            ...styles.componentScore,
                            color:
                              scoreColor,
                          }}
                        >
                          {Math.round(
                            score || 0
                          )}%
                        </strong>
                      ) : (
                        <span
                          style={
                            styles.notAttemptedBadge
                          }
                        >
                          Not Attempted
                        </span>
                      )}

                    </div>

                    {component.available && (
                      <>
                        <div
                          style={
                            styles.componentTrack
                          }
                        >
                          <div
                            style={{
                              ...styles.componentFill,
                              width: `${Math.min(
                                score || 0,
                                100
                              )}%`,
                              background:
                                scoreColor,
                            }}
                          />
                        </div>

                        <span
                          style={
                            styles.componentStatus
                          }
                        >
                          Included in readiness
                          calculation
                        </span>
                      </>
                    )}

                    {!component.available && (
                      <span
                        style={
                          styles.componentStatusDisabled
                        }
                      >
                        Complete this assessment
                        to increase score confidence.
                      </span>
                    )}

                  </div>
                );
              }
            )}

          </div>

        </section>

        {/* =================================================
            SKILL COVERAGE
        ================================================= */}

        <section style={styles.section}>

          <div style={styles.coverageCard}>

            <div style={styles.coverageHeader}>

              <div>

                <span style={styles.sectionEyebrow}>
                  TARGET ROLE ANALYSIS
                </span>

                <h2 style={styles.sectionTitle}>
                  Required Skill Coverage
                </h2>

                <p
                  style={
                    styles.sectionDescription
                  }
                >
                  Skills identified from the
                  target occupation requirements.
                </p>

              </div>

              <div style={styles.coveragePercentage}>
                {Math.round(
                  data.coverage.percentage
                )}
                %
              </div>

            </div>

            <div style={styles.largeProgressTrack}>

              <div
                style={{
                  ...styles.largeProgressFill,
                  width: `${Math.min(
                    data.coverage.percentage,
                    100
                  )}%`,
                  background: scoreColor,
                }}
              />

            </div>

            <div style={styles.coverageStats}>

              <div style={styles.statBox}>
                <strong
                  style={styles.statNumber}
                >
                  {data.coverage.matched}
                </strong>

                <span>
                  Skills Covered
                </span>
              </div>

              <div style={styles.statBox}>
                <strong
                  style={{
                    ...styles.statNumber,
                    color: "#dc2626",
                  }}
                >
                  {data.coverage.missing}
                </strong>

                <span>
                  Skills Missing
                </span>
              </div>

              <div style={styles.statBox}>
                <strong
                  style={styles.statNumber}
                >
                  {data.coverage.required}
                </strong>

                <span>
                  Required Skills
                </span>
              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            CRITICAL BLOCKERS
        ================================================= */}

        {data.criticalBlockers.length >
          0 && (

          <section style={styles.section}>

            <div style={styles.blockerCard}>

              <div style={styles.blockerIcon}>
                ⚠️
              </div>

              <div style={styles.blockerContent}>

                <span
                  style={styles.blockerEyebrow}
                >
                  HIGHEST PRIORITY
                </span>

                <h2 style={styles.blockerTitle}>
                  Critical Skill Blockers
                </h2>

                <p
                  style={styles.blockerDescription}
                >
                  These essential skills are
                  currently missing from your
                  profile and may reduce your
                  suitability for this role.
                </p>

                <div
                  style={styles.blockerSkills}
                >

                  {data.criticalBlockers
                    .slice(0, 10)
                    .map((skill) => (

                      <span
                        key={skill.skill_id}
                        style={styles.blockerSkill}
                      >
                        {skill.skill}
                      </span>

                    ))}

                </div>

              </div>

            </div>

          </section>
        )}

        {/* =================================================
            KNOWLEDGE VS PERFORMANCE
        ================================================= */}

        <section style={styles.section}>

          <div style={styles.twoColumn}>

            {/* KNOWLEDGE */}

            <div style={styles.analysisCard}>

              <div style={styles.analysisIcon}>
                🧠
              </div>

              <span
                style={styles.analysisEyebrow}
              >
                KNOWLEDGE GAP
              </span>

              <h2 style={styles.analysisTitle}>
                Skills You Need to Learn
              </h2>

              <p
                style={
                  styles.analysisDescription
                }
              >
                Required skills that are not
                currently demonstrated in your
                profile.
              </p>

              <div
                style={styles.analysisList}
              >

                {data.knowledgeGaps.length >
                0 ? (

                  data.knowledgeGaps
                    .slice(0, 8)
                    .map((skill) => (

                      <div
                        key={skill}
                        style={
                          styles.knowledgeItem
                        }
                      >
                        <span>
                          +
                        </span>

                        <strong>
                          {skill}
                        </strong>
                      </div>

                    ))

                ) : (

                  <div
                    style={styles.emptyState}
                  >
                    No major knowledge gaps
                    detected.
                  </div>

                )}

              </div>

            </div>

            {/* PERFORMANCE */}

            <div style={styles.analysisCard}>

              <div style={styles.analysisIcon}>
                🎤
              </div>

              <span
                style={styles.analysisEyebrow}
              >
                PERFORMANCE GAP
              </span>

              <h2 style={styles.analysisTitle}>
                Skills You Need to Demonstrate
              </h2>

              <p
                style={
                  styles.analysisDescription
                }
              >
                Areas where assessment or
                interview performance indicates
                further improvement is needed.
              </p>

              <div
                style={styles.analysisList}
              >

                {data.performanceGaps.length >
                0 ? (

                  data.performanceGaps
                    .slice(0, 8)
                    .map((gap) => (

                      <div
                        key={gap}
                        style={
                          styles.performanceItem
                        }
                      >
                        <span>
                          !
                        </span>

                        <strong>
                          {gap}
                        </strong>
                      </div>

                    ))

                ) : (

                  <div
                    style={styles.emptyState}
                  >
                    Complete the assessments
                    to identify performance gaps.
                  </div>

                )}

              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            STRENGTHS + WEAKNESSES
        ================================================= */}

        <section style={styles.section}>

          <div style={styles.twoColumn}>

            <div style={styles.insightCard}>

              <div style={styles.insightHeader}>
                <span style={styles.insightIcon}>
                  💪
                </span>

                <div>
                  <span
                    style={
                      styles.insightEyebrow
                    }
                  >
                    POSITIVE SIGNALS
                  </span>

                  <h2
                    style={
                      styles.insightTitle
                    }
                  >
                    Your Strengths
                  </h2>
                </div>
              </div>

              {data.strengths.length >
              0 ? (

                data.strengths.map(
                  (strength, index) => (

                    <div
                      key={index}
                      style={
                        styles.strengthItem
                      }
                    >
                      <span>✓</span>

                      <p>
                        {strength}
                      </p>
                    </div>

                  )
                )

              ) : (

                <p
                  style={styles.emptyText}
                >
                  Complete more assessments
                  to identify stronger evidence.
                </p>

              )}

            </div>

            <div style={styles.insightCard}>

              <div style={styles.insightHeader}>
                <span style={styles.insightIcon}>
                  🚀
                </span>

                <div>
                  <span
                    style={
                      styles.insightEyebrow
                    }
                  >
                    ACTION REQUIRED
                  </span>

                  <h2
                    style={
                      styles.insightTitle
                    }
                  >
                    Areas to Improve
                  </h2>
                </div>
              </div>

              {data.weaknesses.length >
              0 ? (

                data.weaknesses.map(
                  (weakness, index) => (

                    <div
                      key={index}
                      style={
                        styles.weaknessItem
                      }
                    >

                      <span>
                        {index + 1}
                      </span>

                      <p>
                        {weakness}
                      </p>

                    </div>

                  )
                )

              ) : (

                <p
                  style={styles.emptyText}
                >
                  No major improvement areas
                  identified yet.
                </p>

              )}

            </div>

          </div>

        </section>

        {/* =================================================
            RECOMMENDATION
        ================================================= */}

        <section style={styles.section}>

          <div style={styles.recommendationCard}>

            <div style={styles.recommendationIcon}>
              🎯
            </div>

            <div>

              <span
                style={
                  styles.recommendationEyebrow
                }
              >
                AI RECOMMENDATION
              </span>

              <h2
                style={
                  styles.recommendationTitle
                }
              >
                Your Recommended Next Step
              </h2>

              <p
                style={
                  styles.recommendationText
                }
              >
                {data.recommendation}
              </p>

            </div>

          </div>

        </section>

        {/* =================================================
            WHAT IF
        ================================================= */}

        <section style={styles.section}>

          <div style={styles.whatIfCard}>

            <div style={styles.whatIfHeader}>

              <div>

                <span
                  style={
                    styles.whatIfEyebrow
                  }
                >
              
                </span>

                <h2 style={styles.whatIfTitle}>
                  What-If Readiness Simulator
                </h2>

                <p
                  style={styles.whatIfDescription}
                >
                  Select missing skills and see
                  how learning them could change
                  your estimated readiness for this
                  role.
                </p>

              </div>

            </div>

            <div style={styles.whatIfDivider} />

            <h3
              style={styles.selectSkillsTitle}
            >
              What would you like to learn?
            </h3>

            <div
              style={styles.whatIfSkillGrid}
            >

              {data.missingSkills
                .slice(0, 20)
                .map((skill) => {

                  const selected =
                    selectedWhatIfSkills.includes(
                      skill.skill_id
                    );

                  return (
                    <button
                      key={skill.skill_id}
                      type="button"
                      onClick={() =>
                        toggleWhatIfSkill(
                          skill.skill_id
                        )
                      }
                      style={{
                        ...styles.whatIfSkill,

                        ...(selected
                          ? styles.whatIfSkillSelected
                          : {}),
                      }}
                    >
                      {selected && "✓ "}
                      {skill.skill}
                    </button>
                  );
                })}

            </div>

            <button
              type="button"
              onClick={runWhatIf}
              disabled={
                whatIfLoading ||
                selectedWhatIfSkills.length ===
                  0
              }
              style={{
                ...styles.simulateButton,

                ...(selectedWhatIfSkills.length ===
                  0 ||
                whatIfLoading
                  ? styles.simulateDisabled
                  : {}),
              }}
            >
              {whatIfLoading
                ? "Calculating Projection..."
                : "Calculate Projected Readiness →"}
            </button>

            {/* RESULT */}

            {whatIfResult && (

              <div
                style={styles.whatIfResult}
              >

                <div style={styles.whatIfMetric}>
                  <span>
                    CURRENT
                  </span>

                  <strong>
                    {Math.round(
                      whatIfResult.current
                        .readiness
                    )}
                    %
                  </strong>

                  <small>
                    {
                      whatIfResult.current
                        .readinessBand
                    }
                  </small>
                </div>

                <div
                  style={
                    styles.whatIfArrow
                  }
                >
                  →
                </div>

                <div
                  style={styles.whatIfMetric}
                >
                  <span>
                    PROJECTED
                  </span>

                  <strong
                    style={{
                      color:
                        whatIfResult.improvement >
                        0
                          ? "#16a34a"
                          : "#101828",
                    }}
                  >
                    {Math.round(
                      whatIfResult.projected
                        .readiness
                    )}
                    %
                  </strong>

                  <small>
                    {
                      whatIfResult.projected
                        .readinessBand
                    }
                  </small>
                </div>

                <div
                  style={styles.improvementBox}
                >
                  <span>
                    ESTIMATED IMPROVEMENT
                  </span>

                  <strong>
                    {whatIfResult.improvement >=
                    0
                      ? "+"
                      : ""}
                    {
                      whatIfResult.improvement
                    }
                    %
                  </strong>
                </div>

              </div>

            )}

            {whatIfResult &&
              whatIfResult.skillsAdded.length >
                0 && (

                <div
                  style={
                    styles.simulatedSkills
                  }
                >

                  <strong>
                    Simulated learning:
                  </strong>

                  <div
                    style={
                      styles.simulatedTags
                    }
                  >

                    {whatIfResult.skillsAdded.map(
                      (skill) => (
                        <span
                          key={skill}
                          style={
                            styles.simulatedTag
                          }
                        >
                          {skill}
                        </span>
                      )
                    )}

                  </div>

                </div>

              )}

          </div>

        </section>

        {/* =================================================
            FOOTER NOTE
        ================================================= */}

        <div style={styles.footerNote}>

          <span>
            ℹ️
          </span>

          <p>
            Placement Readiness is an
            evidence-based estimate for the
            selected target role. It becomes more
            reliable as you complete assessments,
            demonstrate skills and build learning
            evidence.
          </p>

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
    background: "#f4f7fb",
    color: "#101828",
    fontFamily:
      "Inter, Arial, Helvetica, sans-serif",
    padding: "24px 18px 50px",
  },

  container: {
    maxWidth: "1220px",
    margin: "0 auto",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
  },

  backButton: {
    background: "#ffffff",
    color: "#344054",
    border: "1px solid #d0d5dd",
    borderRadius: "9px",
    padding: "9px 14px",
    fontWeight: "700",
    cursor: "pointer",
  },

  moduleBadge: {
    background: "#e0e7ff",
    color: "#3730a3",
    padding: "7px 12px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  hero: {
    background:
      "linear-gradient(135deg, #ffffff 0%, #eef5ff 100%)",
    border:
      "1px solid #dbe5f0",
    borderRadius: "22px",
    padding: "34px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "30px",
    marginBottom: "15px",
    boxShadow:
      "0 8px 30px rgba(16,24,40,0.06)",
  },

  heroLeft: {
    flex: 1,
  },

  eyebrow: {
    color: "#2563eb",
    fontSize: "11px",
    fontWeight: "900",
    letterSpacing: "1.5px",
    marginBottom: "8px",
  },

  heroTitle: {
    margin: "0",
    color: "#101828",
    fontSize: "38px",
    fontWeight: "900",
    letterSpacing: "-1px",
  },

  heroDescription: {
    color: "#475467",
    maxWidth: "700px",
    fontSize: "15px",
    lineHeight: "1.65",
    margin: "12px 0 20px",
  },

  targetRole: {
    display: "inline-flex",
    flexDirection: "column",
    background: "#ffffff",
    border:
      "1px solid #dbe5f0",
    borderRadius: "10px",
    padding: "11px 15px",
  },

  targetLabel: {
    color: "#667085",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  targetValue: {
    color: "#101828",
    marginTop: "3px",
    fontSize: "15px",
  },

  scoreRing: {
    width: "190px",
    height: "190px",
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },

  scoreRingInner: {
    width: "145px",
    height: "145px",
    borderRadius: "50%",
    background: "#ffffff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },

  scoreNumber: {
    color: "#101828",
    fontSize: "48px",
    fontWeight: "900",
    lineHeight: "1",
  },

  scoreOutOf: {
    color: "#667085",
    fontSize: "14px",
    fontWeight: "700",
  },

  scoreSmall: {
    color: "#667085",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1px",
    marginTop: "6px",
  },

  bandBanner: {
    border:
      "1px solid",
    borderRadius: "15px",
    padding: "18px 22px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "22px",
  },

  bandLabel: {
    color: "#667085",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  bandTitle: {
    margin: "4px 0 0",
    fontSize: "23px",
    fontWeight: "900",
  },

  confidenceBox: {
    display: "flex",
    flexDirection: "column",
    textAlign: "right",
    color: "#667085",
    fontSize: "11px",
    gap: "3px",
  },

  section: {
    marginBottom: "18px",
  },

  sectionHeader: {
    marginBottom: "12px",
  },

  sectionEyebrow: {
    color: "#2563eb",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1.2px",
  },

  sectionTitle: {
    margin: "4px 0",
    color: "#101828",
    fontSize: "21px",
    fontWeight: "900",
  },

  sectionDescription: {
    color: "#667085",
    fontSize: "13px",
    margin: "4px 0 0",
  },

  componentGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },

  componentCard: {
    background: "#ffffff",
    border:
      "1px solid #dbe5f0",
    borderRadius: "13px",
    padding: "17px",
    boxShadow:
      "0 3px 15px rgba(16,24,40,0.04)",
  },

  componentCardDisabled: {
    background: "#f8fafc",
    border:
      "1px solid #e4e7ec",
    borderRadius: "13px",
    padding: "17px",
  },

  componentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },

  componentName: {
    display: "block",
    color: "#101828",
    fontSize: "14px",
  },

  componentWeight: {
    display: "block",
    color: "#667085",
    fontSize: "10px",
    marginTop: "4px",
  },

  componentScore: {
    fontSize: "23px",
    fontWeight: "900",
  },

  notAttemptedBadge: {
    background: "#f2f4f7",
    color: "#667085",
    padding: "6px 9px",
    borderRadius: "15px",
    fontSize: "10px",
    fontWeight: "800",
  },

  componentTrack: {
    height: "8px",
    background: "#e5e7eb",
    borderRadius: "10px",
    marginTop: "14px",
    overflow: "hidden",
  },

  componentFill: {
    height: "100%",
    borderRadius: "10px",
    transition: "width 0.5s ease",
  },

  componentStatus: {
    display: "block",
    color: "#667085",
    fontSize: "10px",
    marginTop: "7px",
  },

  componentStatusDisabled: {
    display: "block",
    color: "#98a2b3",
    fontSize: "10px",
    marginTop: "13px",
  },

  coverageCard: {
    background: "#ffffff",
    border:
      "1px solid #dbe5f0",
    borderRadius: "16px",
    padding: "23px",
    boxShadow:
      "0 3px 15px rgba(16,24,40,0.04)",
  },

  coverageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  coveragePercentage: {
    color: "#2563eb",
    fontSize: "31px",
    fontWeight: "900",
  },

  largeProgressTrack: {
    height: "13px",
    background: "#e5e7eb",
    borderRadius: "10px",
    overflow: "hidden",
    marginTop: "20px",
  },

  largeProgressFill: {
    height: "100%",
    borderRadius: "10px",
    transition: "width 0.6s ease",
  },

  coverageStats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: "10px",
    marginTop: "18px",
  },

  statBox: {
    background: "#f8fafc",
    borderRadius: "10px",
    padding: "13px",
    display: "flex",
    flexDirection: "column",
    textAlign: "center",
    color: "#667085",
    fontSize: "11px",
    gap: "3px",
  },

  statNumber: {
    color: "#101828",
    fontSize: "21px",
    fontWeight: "900",
  },

  blockerCard: {
    background: "#fff7ed",
    border:
      "1px solid #fed7aa",
    borderRadius: "16px",
    padding: "22px",
    display: "flex",
    gap: "15px",
  },

  blockerIcon: {
    fontSize: "28px",
  },

  blockerContent: {
    flex: 1,
  },

  blockerEyebrow: {
    color: "#c2410c",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  blockerTitle: {
    color: "#7c2d12",
    fontSize: "19px",
    margin: "4px 0",
  },

  blockerDescription: {
    color: "#7c2d12",
    fontSize: "13px",
    lineHeight: "1.5",
  },

  blockerSkills: {
    display: "flex",
    flexWrap: "wrap",
    gap: "7px",
    marginTop: "12px",
  },

  blockerSkill: {
    background: "#ffffff",
    color: "#9a3412",
    border:
      "1px solid #fdba74",
    padding: "7px 10px",
    borderRadius: "18px",
    fontSize: "11px",
    fontWeight: "700",
  },

  twoColumn: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "15px",
  },

  analysisCard: {
    background: "#ffffff",
    border:
      "1px solid #dbe5f0",
    borderRadius: "16px",
    padding: "22px",
  },

  analysisIcon: {
    fontSize: "26px",
    marginBottom: "8px",
  },

  analysisEyebrow: {
    color: "#667085",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1.2px",
  },

  analysisTitle: {
    color: "#101828",
    fontSize: "18px",
    margin: "5px 0",
  },

  analysisDescription: {
    color: "#667085",
    fontSize: "12px",
    lineHeight: "1.55",
  },

  analysisList: {
    marginTop: "15px",
  },

  knowledgeItem: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    background: "#fef2f2",
    color: "#991b1b",
    borderRadius: "8px",
    padding: "9px 11px",
    marginBottom: "7px",
    fontSize: "12px",
  },

  performanceItem: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    background: "#fff7ed",
    color: "#9a3412",
    borderRadius: "8px",
    padding: "9px 11px",
    marginBottom: "7px",
    fontSize: "12px",
  },

  emptyState: {
    background: "#f8fafc",
    color: "#667085",
    borderRadius: "8px",
    padding: "13px",
    fontSize: "12px",
  },

  insightCard: {
    background: "#ffffff",
    border:
      "1px solid #dbe5f0",
    borderRadius: "16px",
    padding: "22px",
  },

  insightHeader: {
    display: "flex",
    gap: "11px",
    alignItems: "center",
    marginBottom: "13px",
  },

  insightIcon: {
    fontSize: "25px",
  },

  insightEyebrow: {
    color: "#667085",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1px",
  },

  insightTitle: {
    color: "#101828",
    fontSize: "18px",
    margin: "3px 0 0",
  },

  strengthItem: {
    display: "flex",
    gap: "10px",
    background: "#f0fdf4",
    border:
      "1px solid #bbf7d0",
    borderRadius: "8px",
    padding: "9px 11px",
    marginBottom: "7px",
    color: "#166534",
    fontSize: "12px",
  },

  strengthItemP: {
    margin: 0,
  },

  weaknessItem: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    background: "#fff7ed",
    border:
      "1px solid #fed7aa",
    borderRadius: "8px",
    padding: "9px 11px",
    marginBottom: "7px",
    color: "#9a3412",
    fontSize: "12px",
  },

  emptyText: {
    color: "#667085",
    fontSize: "12px",
  },

  recommendationCard: {
    background:
      "linear-gradient(135deg, #eff6ff, #eef2ff)",
    border:
      "1px solid #bfdbfe",
    borderRadius: "17px",
    padding: "23px",
    display: "flex",
    gap: "15px",
    alignItems: "flex-start",
  },

  recommendationIcon: {
    fontSize: "30px",
  },

  recommendationEyebrow: {
    color: "#2563eb",
    fontSize: "9px",
    fontWeight: "900",
    letterSpacing: "1.2px",
  },

  recommendationTitle: {
    color: "#101828",
    fontSize: "19px",
    margin: "4px 0 8px",
  },

  recommendationText: {
    color: "#344054",
    fontSize: "13px",
    lineHeight: "1.6",
    margin: 0,
  },

  whatIfCard: {
    background:
      "linear-gradient(135deg, #111827, #1e3a8a)",
    borderRadius: "20px",
    padding: "27px",
    color: "#ffffff",
    boxShadow:
      "0 10px 35px rgba(15,23,42,0.18)",
  },

  whatIfHeader: {
    display: "flex",
    justifyContent: "space-between",
  },

  whatIfEyebrow: {
    color: "#93c5fd",
    fontSize: "10px",
    fontWeight: "900",
    letterSpacing: "1.4px",
  },

  whatIfTitle: {
    color: "#ffffff",
    fontSize: "24px",
    margin: "5px 0 6px",
  },

  whatIfDescription: {
    color: "#dbeafe",
    fontSize: "13px",
    lineHeight: "1.6",
    maxWidth: "750px",
  },

  whatIfDivider: {
    height: "1px",
    background: "rgba(255,255,255,0.15)",
    margin: "20px 0",
  },

  selectSkillsTitle: {
    color: "#ffffff",
    fontSize: "14px",
    marginBottom: "12px",
  },

  whatIfSkillGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },

  whatIfSkill: {
    background:
      "rgba(255,255,255,0.08)",
    color: "#e0e7ff",
    border:
      "1px solid rgba(255,255,255,0.2)",
    borderRadius: "20px",
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "700",
  },

  whatIfSkillSelected: {
    background: "#2563eb",
    color: "#ffffff",
    borderColor: "#60a5fa",
  },

  simulateButton: {
    marginTop: "20px",
    width: "100%",
    background: "#ffffff",
    color: "#1d4ed8",
    border: "none",
    borderRadius: "10px",
    padding: "13px",
    fontWeight: "900",
    cursor: "pointer",
  },

  simulateDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },

  whatIfResult: {
    marginTop: "20px",
    background: "#ffffff",
    borderRadius: "14px",
    padding: "20px",
    display: "grid",
    gridTemplateColumns:
      "1fr auto 1fr auto",
    alignItems: "center",
    gap: "15px",
    color: "#101828",
  },

  whatIfMetric: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },

  whatIfArrow: {
    color: "#667085",
    fontSize: "25px",
  },

  improvementBox: {
    background: "#dcfce7",
    color: "#166534",
    padding: "11px 14px",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
    textAlign: "center",
  },

  simulatedSkills: {
    marginTop: "15px",
    color: "#dbeafe",
    fontSize: "11px",
  },

  simulatedTags: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: "7px",
  },

  simulatedTag: {
    background:
      "rgba(255,255,255,0.12)",
    color: "#ffffff",
    borderRadius: "15px",
    padding: "5px 9px",
  },

  footerNote: {
    display: "flex",
    gap: "9px",
    alignItems: "flex-start",
    background: "#ffffff",
    border:
      "1px solid #e4e7ec",
    borderRadius: "12px",
    padding: "13px 16px",
    color: "#667085",
    fontSize: "11px",
    lineHeight: "1.5",
  },

  footerNoteP: {
    margin: 0,
  },

  loadingCard: {
    minHeight: "70vh",
    background: "#ffffff",
    borderRadius: "20px",
    maxWidth: "600px",
    margin: "0 auto",
    padding: "50px 30px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    boxShadow:
      "0 8px 30px rgba(16,24,40,0.06)",
  },

  loadingIcon: {
    fontSize: "50px",
    marginBottom: "12px",
  },

  loadingTitle: {
    color: "#101828",
    fontSize: "22px",
  },

  loadingText: {
    color: "#475467",
    fontSize: "14px",
  },

  loadingBar: {
    width: "260px",
    height: "7px",
    background: "#e5e7eb",
    borderRadius: "10px",
    overflow: "hidden",
    marginTop: "15px",
  },

  loadingBarFill: {
    width: "65%",
    height: "100%",
    background: "#2563eb",
    borderRadius: "10px",
  },

  buttonRow: {
    display: "flex",
    gap: "10px",
    marginTop: "15px",
  },

  primaryButton: {
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "11px 17px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "800",
  },

  secondaryButton: {
    background: "#ffffff",
    color: "#344054",
    border:
      "1px solid #d0d5dd",
    padding: "11px 17px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "800",
  },
};

export default PlacementReadiness;