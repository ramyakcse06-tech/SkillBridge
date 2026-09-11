import { useEffect, useState } from "react";

interface Recommendation {
  skill_id: string;
  skill: string;
  relation_type: string;
  skill_type: string;
  resource: {
    id: number;
    title: string;
    type: string;
    difficulty: string;
    estimated_hours: number;
    url: string;
  };
}

interface LearningData {
  success: boolean;
  student: {
    id: number;
    name: string;
  };
  target_job: {
    occupation_id: string;
    occupation_label: string;
  };
  summary: {
    missing_skill_count: number;
    recommended_skill_count: number;
  };
  recommendations: Recommendation[];
}

interface Props {
  studentId: number;
  occupationId: string;
  onBack: () => void;
}

function Learning({
  studentId,
  occupationId,
  onBack,
}: Props) {
  const [data, setData] = useState<LearningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadLearning = async () => {
      try {
        const response = await fetch(
          `/api/students/${studentId}/learning/${encodeURIComponent(
            occupationId
          )}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to load learning resources"
          );
        }

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load learning resources"
        );
      } finally {
        setLoading(false);
      }
    };

    loadLearning();
  }, [studentId, occupationId]);

  if (loading) {
    return (
      <div style={styles.center}>
        <h2>Preparing your learning plan...</h2>
        <p>Finding resources for your skill gaps.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.center}>
        <h2>Unable to load learning plan</h2>
        <p>{error}</p>
        <button onClick={onBack}>← Back</button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <button
          onClick={onBack}
          style={styles.backButton}
        >
          ← Back to Skill Gap
        </button>

        <div style={styles.header}>
          <p style={styles.eyebrow}>
            PERSONALIZED LEARNING
          </p>

          <h1>
            Your Learning Plan
          </h1>

          <p style={styles.subtitle}>
            Hi {data.student.name}! These resources are
            selected based on your skill gaps for{" "}
            <strong>
              {data.target_job.occupation_label}
            </strong>.
          </p>

          <div style={styles.summary}>
            <div>
              <strong>
                {data.summary.missing_skill_count}
              </strong>
              <span>Missing Skills</span>
            </div>

            <div>
              <strong>
                {data.summary.recommended_skill_count}
              </strong>
              <span>Learning Paths</span>
            </div>
          </div>
        </div>

        <div style={styles.grid}>
          {data.recommendations.map((item) => (
            <div
              key={`${item.skill_id}-${item.resource.id}`}
              style={styles.card}
            >
              <div style={styles.skillHeader}>
                <span style={styles.skillBadge}>
                  Skill Gap
                </span>

                <span
                  style={
                    item.relation_type === "essential"
                      ? styles.essential
                      : styles.optional
                  }
                >
                  {item.relation_type}
                </span>
              </div>

              <h2 style={styles.skillName}>
                {item.skill}
              </h2>

              <h3 style={styles.resourceTitle}>
                {item.resource.title}
              </h3>

              <div style={styles.meta}>
                <span>
                  📚 {item.resource.type}
                </span>

                <span>
                  📊 {item.resource.difficulty}
                </span>

                <span>
                  ⏱ {item.resource.estimated_hours} hrs
                </span>
              </div>

              <a
                href={item.resource.url}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.learnButton}
              >
                Start Learning →
              </a>
            </div>
          ))}
        </div>

        {data.recommendations.length === 0 && (
          <div style={styles.empty}>
            <h2>No learning resources mapped yet</h2>
            <p>
              We don't currently have a curated resource
              for your missing skills.
            </p>
          </div>
        )}

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
    marginBottom: "20px",
    fontSize: "15px",
  },

  header: {
    background: "white",
    borderRadius: "20px",
    padding: "30px",
    marginBottom: "20px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
  },

  eyebrow: {
    color: "#2563eb",
    fontWeight: "bold",
    fontSize: "12px",
    letterSpacing: "1.5px",
  },

  subtitle: {
    color: "#667085",
    lineHeight: 1.6,
  },

  summary: {
    display: "flex",
    gap: "40px",
    marginTop: "25px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "18px",
  },

  card: {
    background: "white",
    borderRadius: "16px",
    padding: "22px",
    boxShadow: "0 3px 15px rgba(0,0,0,0.05)",
  },

  skillHeader: {
    display: "flex",
    justifyContent: "space-between",
  },

  skillBadge: {
    background: "#eef2ff",
    color: "#3730a3",
    padding: "5px 8px",
    borderRadius: "6px",
    fontSize: "11px",
  },

  essential: {
    background: "#fee4e2",
    color: "#b42318",
    padding: "5px 8px",
    borderRadius: "6px",
    fontSize: "11px",
  },

  optional: {
    background: "#f2f4f7",
    color: "#667085",
    padding: "5px 8px",
    borderRadius: "6px",
    fontSize: "11px",
  },

  skillName: {
    fontSize: "19px",
    margin: "15px 0 8px",
  },

  resourceTitle: {
    color: "#344054",
    fontSize: "16px",
  },

  meta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    color: "#667085",
    fontSize: "12px",
    margin: "18px 0",
  },

  learnButton: {
    display: "block",
    textAlign: "center",
    textDecoration: "none",
    background: "#2563eb",
    color: "white",
    padding: "11px",
    borderRadius: "8px",
    fontWeight: "600",
  },

  empty: {
    background: "white",
    padding: "40px",
    borderRadius: "16px",
    textAlign: "center",
  },
};

export default Learning;