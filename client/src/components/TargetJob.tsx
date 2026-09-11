import { useState } from "react";
import SkillGap from "./SkillGap";

interface Job {
  occupation_id: string;
  occupation_label: string;
  description: string;
  isco_group: number;
  skill_count: number;
}

interface JobDetails extends Job {
  skills: {
    skill_id: string;
    skill: string;
    relation_type: string;
    skill_type: string;
  }[];
}

function TargetJob() {
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] =
    useState<JobDetails | null>(null);

  const [showSkillGap, setShowSkillGap] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [error, setError] = useState("");

  // --------------------------------------------------
  // KEEP ONLY 10 KEY SKILLS
  // --------------------------------------------------

  const getTopSkills = (
    skills: JobDetails["skills"]
  ) => {
    if (!skills || skills.length === 0) {
      return [];
    }

    /*
     * First prioritize ESSENTIAL skills.
     * Then add OPTIONAL skills until we have 10.
     *
     * We are NOT changing the ESCO data.
     * We are only limiting what is displayed.
     */

    const essentialSkills = skills.filter(
      (skill) =>
        skill.relation_type?.toLowerCase() ===
        "essential"
    );

    const optionalSkills = skills.filter(
      (skill) =>
        skill.relation_type?.toLowerCase() !==
        "essential"
    );

    /*
     * Remove duplicate skill names.
     */
    const uniqueSkills: JobDetails["skills"] = [];

    const seen = new Set<string>();

    [
      ...essentialSkills,
      ...optionalSkills,
    ].forEach((skill) => {
      const normalized =
        skill.skill.trim().toLowerCase();

      if (
        normalized &&
        !seen.has(normalized)
      ) {
        seen.add(normalized);
        uniqueSkills.push(skill);
      }
    });

    return uniqueSkills.slice(0, 10);
  };

  // --------------------------------------------------
  // SEARCH JOBS
  // --------------------------------------------------

  const searchJobs = async () => {
    if (!query.trim()) {
      setError("Please enter a job title.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSelectedJob(null);
      setShowSkillGap(false);

      const response = await fetch(
        `/api/jobs/search?q=${encodeURIComponent(
          query.trim()
        )}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to search jobs"
        );
      }

      setJobs(data.jobs);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to search jobs"
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // GET JOB DETAILS
  // --------------------------------------------------

  const selectJob = async (job: Job) => {
    try {
      setDetailsLoading(true);
      setError("");
      setShowSkillGap(false);

      const response = await fetch(
        `/api/jobs/${encodeURIComponent(
          job.occupation_id
        )}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to load job"
        );
      }

      setSelectedJob(data.job);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load job details"
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  // --------------------------------------------------
  // SHOW SKILL GAP PAGE
  // --------------------------------------------------

  if (showSkillGap && selectedJob) {
    return (
      <SkillGap
        studentId={1}
        occupationId={
          selectedJob.occupation_id
        }
        onBack={() =>
          setShowSkillGap(false)
        }
      />
    );
  }

  // --------------------------------------------------
  // MAIN PAGE
  // --------------------------------------------------

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <div style={styles.header}>
          <div>
            <p style={styles.eyebrow}>
              SKILLBRIDGE
            </p>

            <h1 style={styles.title}>
              Find Your Target Job
            </h1>

            <p style={styles.subtitle}>
              Choose a target role and analyze
              how your current skills match its
              requirements.
            </p>
          </div>
        </div>

        {/* SEARCH */}

        <div style={styles.searchBox}>
          <input
            type="text"
            value={query}
            placeholder="Search job title e.g. Software Developer"
            onChange={(e) =>
              setQuery(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                searchJobs();
              }
            }}
            style={styles.input}
          />

          <button
            type="button"
            onClick={searchJobs}
            disabled={loading}
            style={styles.searchButton}
          >
            {loading
              ? "Searching..."
              : "Search"}
          </button>
        </div>

        {/* ERROR */}

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {/* JOB RESULTS */}

        {jobs.length > 0 && (
          <div style={styles.resultsSection}>

            <div style={styles.resultsHeader}>
              <h2>
                Available Jobs
              </h2>

              <span style={styles.countBadge}>
                {jobs.length} found
              </span>
            </div>

            <div style={styles.jobGrid}>

              {jobs.map((job) => (
                <div
                  key={job.occupation_id}
                  style={{
                    ...styles.jobCard,
                    ...(selectedJob?.occupation_id ===
                    job.occupation_id
                      ? styles.selectedCard
                      : {}),
                  }}
                >

                  <div>

                    <p style={styles.jobType}>
                      ESCO OCCUPATION
                    </p>

                    <h3 style={styles.jobTitle}>
                      {job.occupation_label}
                    </h3>

                    <p
                      style={
                        styles.jobDescription
                      }
                    >
                      {job.description}
                    </p>

                  </div>

                  <div style={styles.jobFooter}>

                    <span
                      style={
                        styles.skillCount
                      }
                    >
                      10 key skills
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        selectJob(job)
                      }
                      style={styles.viewButton}
                    >
                      View Details →
                    </button>

                  </div>

                </div>
              ))}

            </div>
          </div>
        )}

        {/* JOB DETAILS */}

        {detailsLoading && (
          <div style={styles.loadingBox}>
            Loading job details...
          </div>
        )}

        {selectedJob &&
          !detailsLoading && (
            <div
              style={styles.detailsSection}
            >

              {/* DETAILS HEADER */}

              <div
                style={styles.detailsHeader}
              >

                <div>

                  <p style={styles.eyebrow}>
                    SELECTED TARGET ROLE
                  </p>

                  <h2
                    style={
                      styles.detailsTitle
                    }
                  >
                    {
                      selectedJob.occupation_label
                    }
                  </h2>

                  <p
                    style={
                      styles.detailsDescription
                    }
                  >
                    {selectedJob.description}
                  </p>

                </div>

                <div
                  style={styles.skillSummary}
                >

                  <strong>
                    10
                  </strong>

                  <span>
                    Key Skills
                  </span>

                </div>

              </div>

              {/* REQUIRED SKILLS */}

              <div
                style={styles.requiredSection}
              >

                <div
                  style={
                    styles.skillsHeadingRow
                  }
                >

                  <div>
                    <h3>
                      Key Skills Needed
                    </h3>

                    <p
                      style={
                        styles.skillsHint
                      }
                    >
                      Top 10 skills relevant to
                      this target role
                    </p>
                  </div>

                  <span
                    style={
                      styles.sourceBadge
                    }
                  >
                    ESCO Mapped
                  </span>

                </div>

                <div
                  style={styles.skillList}
                >

                  {getTopSkills(
                    selectedJob.skills
                  ).map((skill, index) => (
                    <div
                      key={skill.skill_id}
                      style={
                        styles.skillItem
                      }
                    >

                      <div
                        style={
                          styles.skillLeft
                        }
                      >

                        <div
                          style={
                            styles.skillNumber
                          }
                        >
                          {index + 1}
                        </div>

                        <div>

                          <strong
                            style={
                              styles.skillName
                            }
                          >
                            {skill.skill}
                          </strong>

                          <div
                            style={
                              styles.skillMeta
                            }
                          >
                            {skill.skill_type}
                          </div>

                        </div>

                      </div>

                      <span
                        style={
                          skill.relation_type
                            ?.toLowerCase() ===
                          "essential"
                            ? styles.essentialBadge
                            : styles.optionalBadge
                        }
                      >
                        {
                          skill.relation_type
                        }
                      </span>

                    </div>
                  ))}

                </div>

              </div>

              {/* ANALYZE */}

              <div
                style={styles.analyzeBox}
              >

                <div>

                  <h3>
                    Ready to see your
                    skill gap?
                  </h3>

                  <p>
                    SkillBridge will compare
                    your saved resume skills
                    with this target role.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowSkillGap(true)
                  }
                  style={
                    styles.analyzeButton
                  }
                >
                  Analyze My Skill Gap →
                </button>

              </div>

            </div>
          )}

        {/* EMPTY STATE */}

        {!loading &&
          jobs.length === 0 &&
          !error && (
            <div
              style={styles.emptyState}
            >

              <div
                style={styles.emptyIcon}
              >
                🔎
              </div>

              <h2>
                Search for your target role
              </h2>

              <p>
                Try searching for Software
                Developer, Data Scientist,
                Web Developer, or another
                career you're interested in.
              </p>

            </div>
          )}

      </div>
    </div>
  );
}

// --------------------------------------------------
// STYLES
// --------------------------------------------------

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
    maxWidth: "1200px",
    margin: "0 auto",
  },

  header: {
    background: "white",
    borderRadius: "20px",
    padding: "32px",
    marginBottom: "20px",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.05)",
  },

  eyebrow: {
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "1.5px",
    color: "#2563eb",
    marginBottom: "8px",
  },

  title: {
    margin: "0",
    fontSize: "32px",
    color: "#111827",
  },

  subtitle: {
    color: "#667085",
    fontSize: "16px",
    lineHeight: "1.6",
    maxWidth: "750px",
  },

  searchBox: {
    background: "white",
    padding: "18px",
    borderRadius: "16px",
    display: "flex",
    gap: "12px",
    marginBottom: "20px",
    boxShadow:
      "0 3px 15px rgba(0,0,0,0.04)",
  },

  input: {
    flex: 1,
    padding: "14px 16px",
    border: "1px solid #d0d5dd",
    borderRadius: "10px",
    fontSize: "15px",
    outline: "none",
  },

  searchButton: {
    padding: "14px 24px",
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "white",
    fontWeight: "600",
    cursor: "pointer",
  },

  error: {
    background: "#fef2f2",
    color: "#b42318",
    padding: "14px",
    borderRadius: "10px",
    marginBottom: "20px",
  },

  resultsSection: {
    marginBottom: "20px",
  },

  resultsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },

  countBadge: {
    background: "#eef2ff",
    color: "#3730a3",
    padding: "6px 10px",
    borderRadius: "8px",
    fontSize: "13px",
  },

  jobGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "16px",
  },

  jobCard: {
    background: "white",
    borderRadius: "16px",
    padding: "22px",
    border: "1px solid #eaecf0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: "230px",
    boxShadow:
      "0 3px 15px rgba(0,0,0,0.04)",
  },

  selectedCard: {
    border: "2px solid #2563eb",
  },

  jobType: {
    fontSize: "10px",
    fontWeight: "700",
    letterSpacing: "1px",
    color: "#98a2b3",
  },

  jobTitle: {
    fontSize: "21px",
    margin: "8px 0",
    color: "#101828",
  },

  jobDescription: {
    color: "#667085",
    lineHeight: "1.5",
    fontSize: "14px",
  },

  jobFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "18px",
  },

  skillCount: {
    fontSize: "13px",
    color: "#2563eb",
    fontWeight: "700",
  },

  viewButton: {
    border: "none",
    background: "#eff6ff",
    color: "#2563eb",
    padding: "9px 13px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  detailsSection: {
    background: "white",
    borderRadius: "20px",
    padding: "30px",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.05)",
  },

  detailsHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "30px",
    alignItems: "flex-start",
  },

  detailsTitle: {
    fontSize: "28px",
    margin: "5px 0 10px",
    color: "#101828",
  },

  detailsDescription: {
    color: "#667085",
    lineHeight: "1.6",
    maxWidth: "800px",
  },

  skillSummary: {
    minWidth: "140px",
    padding: "20px",
    background: "#eff6ff",
    borderRadius: "14px",
    display: "flex",
    flexDirection: "column",
    textAlign: "center",
    color: "#1d4ed8",
  },

  requiredSection: {
    marginTop: "30px",
  },

  skillsHeadingRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "15px",
  },

  skillsHint: {
    color: "#667085",
    fontSize: "13px",
    marginTop: "4px",
  },

  sourceBadge: {
    background: "#ecfdf3",
    color: "#067647",
    border:
      "1px solid #abefc6",
    padding: "7px 10px",
    borderRadius: "8px",
    fontSize: "11px",
    fontWeight: "700",
    whiteSpace: "nowrap",
  },

  skillList: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "10px",
    marginTop: "15px",
  },

  skillItem: {
    border:
      "1px solid #eaecf0",
    borderRadius: "10px",
    padding: "13px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    background: "#ffffff",
  },

  skillLeft: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    minWidth: 0,
  },

  skillNumber: {
    width: "28px",
    height: "28px",
    minWidth: "28px",
    borderRadius: "50%",
    background: "#eff6ff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "800",
  },

  skillName: {
    color: "#101828",
    fontSize: "14px",
  },

  skillMeta: {
    color: "#98a2b3",
    fontSize: "11px",
    marginTop: "4px",
  },

  essentialBadge: {
    background: "#fee4e2",
    color: "#b42318",
    padding: "5px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    whiteSpace: "nowrap",
    fontWeight: "700",
  },

  optionalBadge: {
    background: "#f2f4f7",
    color: "#667085",
    padding: "5px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    whiteSpace: "nowrap",
  },

  analyzeBox: {
    marginTop: "30px",
    padding: "22px",
    borderRadius: "14px",
    background: "#f8fafc",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
  },

  analyzeButton: {
    border: "none",
    background: "#2563eb",
    color: "white",
    padding: "13px 20px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },

  loadingBox: {
    background: "white",
    padding: "30px",
    borderRadius: "15px",
    textAlign: "center",
  },

  emptyState: {
    background: "white",
    padding: "60px 30px",
    borderRadius: "20px",
    textAlign: "center",
    boxShadow:
      "0 3px 15px rgba(0,0,0,0.04)",
  },

  emptyIcon: {
    fontSize: "40px",
    marginBottom: "10px",
  },
};

export default TargetJob;