import { useEffect, useState } from "react";
import Learning from "./Learning";
import AssessmentCenter from "./AssessmentCenter";

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
  onBack?: () => void;
}

function SkillGap({ studentId, occupationId, onBack }: Props) {
  const [data, setData] = useState<SkillGapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLearning, setShowLearning] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);

  useEffect(() => {
    const loadSkillGap = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/students/${studentId}/skill-gap/${encodeURIComponent(
            occupationId
          )}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load skill gap");
        }

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    };

    loadSkillGap();
  }, [studentId, occupationId]);

  if (loading) {
    return (
      <div style={styles.center}>
        <h2>Analyzing your skill gap...</h2>
        <p>Comparing your skills with the target job.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.center}>
        <h2>Unable to load skill gap</h2>
        <p>{error}</p>
        {onBack && <button onClick={onBack}>Back</button>}
      </div>
    );
  }

  if (!data) return null;

  const {
    analysis,
    target_job,
    matched_skills,
    missing_skills,
  } = data;

  if (showLearning) {
  return (
    <Learning
      studentId={studentId}
      occupationId={occupationId}
      onBack={() => setShowLearning(false)}
    />
  );
}

if (showAssessment) {
  return (
    <AssessmentCenter
      studentId={studentId}
      occupationId={occupationId}
      onBack={() => setShowAssessment(false)}
    />
  );
}

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {onBack && (
          <button style={styles.backButton} onClick={onBack}>
            ← Back to Jobs
          </button>
        )}

        <div style={styles.header}>
          <div>
            <p style={styles.label}>TARGET ROLE</p>
            <h1>{target_job.occupation_label}</h1>
            <p style={styles.description}>
              {target_job.description}
            </p>
          </div>

          <div style={styles.scoreBox}>
            <div style={styles.score}>
              {analysis.match_percentage}%
            </div>
            <div style={styles.scoreLabel}>Skill Match</div>
          </div>
        </div>

        <div style={styles.stats}>
          <div style={styles.statCard}>
            <span>Required</span>
            <strong>{analysis.required_skill_count}</strong>
          </div>

          <div style={styles.statCard}>
            <span>Matched</span>
            <strong>{analysis.matched_skill_count}</strong>
          </div>

          <div style={styles.statCard}>
            <span>Missing</span>
            <strong>{analysis.missing_skill_count}</strong>
          </div>

          <div style={styles.statCard}>
            <span>Skill Gap</span>
            <strong>{analysis.gap_percentage}%</strong>
          </div>
        </div>

        <div style={styles.progressSection}>
          <div style={styles.progressHeader}>
            <strong>Job Skill Coverage</strong>
            <span>{analysis.match_percentage}%</span>
          </div>

          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${analysis.match_percentage}%`,
              }}
            />
          </div>
        </div>

        <div style={styles.grid}>

          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2>✓ Matched Skills</h2>
              <span>{matched_skills.length}</span>
            </div>

            {matched_skills.length === 0 ? (
              <p style={styles.empty}>
                No matching skills found yet.
              </p>
            ) : (
              matched_skills.map((skill) => (
                <div key={skill.skill_id} style={styles.skillCard}>
                  <div>
                    <strong>{skill.skill}</strong>
                    <small>
                      {skill.skill_type}
                    </small>
                  </div>

                  <span style={styles.matchedBadge}>
                    {skill.relation_type}
                  </span>
                </div>
              ))
            )}
          </div>

          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2>⚠ Missing Skills</h2>
              <span>{missing_skills.length}</span>
            </div>

            {missing_skills.map((skill) => (
              <div key={skill.skill_id} style={styles.skillCard}>
                <div>
                  <strong>{skill.skill}</strong>
                  <small>
                    {skill.skill_type}
                  </small>
                </div>

                <button style={styles.learnButton}>
                  Learn
                </button>
              </div>
            ))}
          </div>

        </div>

        <div style={styles.nextStep}>
          <h2>What should you do next?</h2>

          <p>
            Focus on your missing skills to improve your
            readiness for <strong>{target_job.occupation_label}</strong>.
          </p>

          <div style={styles.actions}>
            <button
  style={styles.primaryButton}
  onClick={() => setShowLearning(true)}
>
  Start Learning →
</button>

            <button
  style={styles.secondaryButton}
  onClick={() => setShowAssessment(true)}
>
  Take Skill Assessment →
</button>
          </div>
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
    maxWidth: "1200px",
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

  backButton: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "15px",
    marginBottom: "20px",
  },

  header: {
    background: "white",
    borderRadius: "18px",
    padding: "30px",
    display: "flex",
    justifyContent: "space-between",
    gap: "30px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
  },

  label: {
    fontSize: "12px",
    fontWeight: "bold",
    color: "#667085",
    letterSpacing: "1px",
  },

  headerTitle: {},

  description: {
    maxWidth: "750px",
    color: "#667085",
    lineHeight: 1.6,
  },

  scoreBox: {
    minWidth: "150px",
    textAlign: "center",
    padding: "20px",
    borderRadius: "15px",
    background: "#eef6ff",
  },

  score: {
    fontSize: "42px",
    fontWeight: "bold",
    color: "#2563eb",
  },

  scoreLabel: {
    color: "#667085",
    fontSize: "14px",
  },

  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "15px",
    margin: "20px 0",
  },

  statCard: {
    background: "white",
    padding: "22px",
    borderRadius: "15px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    boxShadow: "0 3px 15px rgba(0,0,0,0.04)",
  },

  progressSection: {
    background: "white",
    padding: "22px",
    borderRadius: "15px",
    marginBottom: "20px",
  },

  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
  },

  progressBar: {
    height: "12px",
    background: "#e5e7eb",
    borderRadius: "10px",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    background: "#2563eb",
    borderRadius: "10px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  },

  section: {
    background: "white",
    borderRadius: "18px",
    padding: "25px",
    boxShadow: "0 3px 15px rgba(0,0,0,0.04)",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },

  skillCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },

  matchedBadge: {
    fontSize: "11px",
    background: "#dcfce7",
    padding: "5px 8px",
    borderRadius: "6px",
  },

  learnButton: {
    border: "none",
    background: "#eef2ff",
    color: "#3730a3",
    padding: "7px 12px",
    borderRadius: "7px",
    cursor: "pointer",
  },

  nextStep: {
    background: "white",
    padding: "25px",
    borderRadius: "18px",
    marginTop: "20px",
  },

  actions: {
    display: "flex",
    gap: "12px",
    marginTop: "15px",
  },

  primaryButton: {
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "12px 20px",
    borderRadius: "9px",
    cursor: "pointer",
  },

  secondaryButton: {
    border: "1px solid #2563eb",
    background: "white",
    color: "#2563eb",
    padding: "12px 20px",
    borderRadius: "9px",
    cursor: "pointer",
  },

  empty: {
    color: "#667085",
  },
};

export default SkillGap;