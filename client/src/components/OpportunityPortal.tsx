import { useEffect, useMemo, useState } from "react";

type Opportunity = {
  id: number;
  company_name: string;
  title: string;
  type: string;
  description: string;
  eligibility?: string;
  experience?: string;
  location?: string;
  work_mode?: string;
  required_skills?: string[] | string;
};

type Application = {
  application_id: number;
  opportunity_id: number;
  company_name: string;
  title: string;
  type: string;
  location?: string;
  status: string;
  applied_at: string;
  required_skills?: string[] | string;
};

type Props = {
  studentId: number;
  onBack: () => void;
};

function parseSkills(value: any): string[] {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.]/g, "")
    .trim();
}

export default function OpportunityPortal({
  studentId,
  onBack,
}: Props) {
  const [tab, setTab] = useState<"opportunities" | "applications">(
    "opportunities"
  );

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selected, setSelected] = useState<Opportunity | null>(null);

  const [studentSkills, setStudentSkills] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    loadOpportunities();
    loadApplications();
    loadStudentSkills();
  }, []);

  async function loadOpportunities() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/opportunities"
      );

      if (!response.ok) {
        throw new Error("Failed to load opportunities");
      }

      const data = await response.json();

      setOpportunities(
        Array.isArray(data)
          ? data
          : data.opportunities || []
      );
    } catch (error) {
      console.error(error);
      setMessage("Unable to load opportunities.");
    } finally {
      setLoading(false);
    }
  }

  async function loadApplications() {
    try {
      const response = await fetch(
        `/api/opportunities/student/${studentId}/applications`
      );

      if (!response.ok) return;

      const data = await response.json();

      setApplications(
        Array.isArray(data)
          ? data
          : data.applications || []
      );
    } catch (error) {
      console.error(error);
    }
  }

  async function loadStudentSkills() {
    try {
      const response = await fetch(
        `/api/students/${studentId}/skills`
      );

      if (!response.ok) return;

      const data = await response.json();

      const skills =
        data.skills ||
        data.studentSkills ||
        data ||
        [];

      if (Array.isArray(skills)) {
        setStudentSkills(
          skills.map((skill: any) =>
            typeof skill === "string"
              ? skill
              : skill.name ||
                skill.skill ||
                skill.skill_name ||
                ""
          ).filter(Boolean)
        );
      }
    } catch (error) {
      console.error(error);
    }
  }

  function calculateMatch(opportunity: Opportunity) {
    const required = parseSkills(
      opportunity.required_skills
    );

    if (required.length === 0) {
      return 50;
    }

    if (studentSkills.length === 0) {
      return 50;
    }

    const studentNormalized = studentSkills.map(normalize);

    let matched = 0;

    required.forEach((requiredSkill) => {
      const requiredNormalized = normalize(requiredSkill);

      const found = studentNormalized.some(
        (studentSkill) =>
          studentSkill === requiredNormalized ||
          studentSkill.includes(requiredNormalized) ||
          requiredNormalized.includes(studentSkill)
      );

      if (found) matched++;
    });

    return Math.round(
      (matched / required.length) * 100
    );
  }

  function getMatchedSkills(opportunity: Opportunity) {
    const required = parseSkills(
      opportunity.required_skills
    );

    return required.filter((requiredSkill) =>
      studentSkills.some((studentSkill) => {
        const a = normalize(requiredSkill);
        const b = normalize(studentSkill);

        return (
          a === b ||
          a.includes(b) ||
          b.includes(a)
        );
      })
    );
  }

  function getMissingSkills(opportunity: Opportunity) {
    const required = parseSkills(
      opportunity.required_skills
    );

    const matched = getMatchedSkills(opportunity);

    return required.filter(
      (skill) => !matched.includes(skill)
    );
  }

  function hasApplied(opportunityId: number) {
    return applications.some(
      (application) =>
        Number(application.opportunity_id) ===
        Number(opportunityId)
    );
  }

  async function applyToOpportunity(
    opportunityId: number
  ) {
    try {
      setApplying(true);
      setMessage("");

      const response = await fetch(
        `/api/opportunities/${opportunityId}/apply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Application failed"
        );
      }

      setMessage(
        "🎉 Application submitted successfully!"
      );

      await loadApplications();
    } catch (error: any) {
      setMessage(
        error.message ||
          "Unable to submit application."
      );
    } finally {
      setApplying(false);
    }
  }

  const sortedOpportunities = useMemo(() => {
    return [...opportunities].sort(
      (a, b) =>
        calculateMatch(b) -
        calculateMatch(a)
    );
  }, [opportunities, studentSkills]);

  return (
    <div style={styles.page}>
      {/* HEADER */}

      <header style={styles.header}>
        <div>
          <button
            style={styles.backButton}
            onClick={onBack}
          >
            ← Student Dashboard
          </button>

          <div style={styles.brand}>
            SkillBridge
          </div>

          <div style={styles.role}>
            OPPORTUNITY MATCHING
          </div>
        </div>

        <div style={styles.headerActions}>
          <button
            style={
              tab === "opportunities"
                ? styles.activeTab
                : styles.tab
            }
            onClick={() => {
              setTab("opportunities");
              setSelected(null);
            }}
          >
            💼 Opportunities
          </button>

          <button
            style={
              tab === "applications"
                ? styles.activeTab
                : styles.tab
            }
            onClick={() => {
              setTab("applications");
              setSelected(null);
            }}
          >
            📋 My Applications
          </button>
        </div>
      </header>

      <main style={styles.content}>
        {message && (
          <div style={styles.message}>
            {message}
          </div>
        )}

        {tab === "opportunities" && !selected && (
          <>
            <div style={styles.hero}>
              <div>
                <div style={styles.heroLabel}>
                  AI-POWERED OPPORTUNITY MATCHING
                </div>

                <h1 style={styles.heading}>
                  Find opportunities that fit your skills 🎯
                </h1>

                <p style={styles.subtitle}>
                  SkillBridge compares your current skills
                  with opportunity requirements and explains
                  where you match and where you need improvement.
                </p>
              </div>

              <div style={styles.heroIcon}>
                🎯
              </div>
            </div>

            <div style={styles.sectionHeader}>
              <div>
                <h2>Recommended Opportunities</h2>
                <p>
                  Ranked according to your current skill profile.
                </p>
              </div>

              <span style={styles.countBadge}>
                {opportunities.length} opportunities
              </span>
            </div>

            {loading ? (
              <div style={styles.empty}>
                Loading opportunities...
              </div>
            ) : sortedOpportunities.length === 0 ? (
              <div style={styles.empty}>
                <div style={{ fontSize: 50 }}>
                  💼
                </div>

                <h2>No opportunities yet</h2>

                <p>
                  Industry opportunities will appear here
                  once recruiters post them.
                </p>
              </div>
            ) : (
              <div style={styles.grid}>
                {sortedOpportunities.map(
                  (opportunity) => {
                    const match =
                      calculateMatch(opportunity);

                    return (
                      <div
                        key={opportunity.id}
                        style={styles.card}
                      >
                        <div style={styles.cardTop}>
                          <div style={styles.companyIcon}>
                            🏢
                          </div>

                          <div
                            style={{
                              ...styles.matchBadge,
                              background:
                                match >= 80
                                  ? "#dcfce7"
                                  : match >= 60
                                  ? "#fef3c7"
                                  : "#fee2e2",
                              color:
                                match >= 80
                                  ? "#166534"
                                  : match >= 60
                                  ? "#92400e"
                                  : "#991b1b",
                            }}
                          >
                            {match}% Match
                          </div>
                        </div>

                        <h2 style={styles.cardTitle}>
                          {opportunity.title}
                        </h2>

                        <p style={styles.company}>
                          {opportunity.company_name}
                        </p>

                        <div style={styles.meta}>
                          <span>
                            💼 {opportunity.type}
                          </span>

                          {opportunity.location && (
                            <span>
                              📍 {opportunity.location}
                            </span>
                          )}

                          {opportunity.work_mode && (
                            <span>
                              🏠 {opportunity.work_mode}
                            </span>
                          )}
                        </div>

                        <p style={styles.cardDescription}>
                          {opportunity.description}
                        </p>

                        <div style={styles.skills}>
                          {parseSkills(
                            opportunity.required_skills
                          )
                            .slice(0, 5)
                            .map((skill) => (
                              <span
                                key={skill}
                                style={styles.skillChip}
                              >
                                {skill}
                              </span>
                            ))}
                        </div>

                        <button
                          style={styles.primaryButton}
                          onClick={() =>
                            setSelected(opportunity)
                          }
                        >
                          View Opportunity →
                        </button>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </>
        )}

        {tab === "opportunities" &&
          selected && (
            <OpportunityDetails
              opportunity={selected}
              studentSkills={studentSkills}
              matchedSkills={getMatchedSkills(selected)}
              missingSkills={getMissingSkills(selected)}
              match={calculateMatch(selected)}
              applied={hasApplied(selected.id)}
              applying={applying}
              onApply={() =>
                applyToOpportunity(selected.id)
              }
              onBack={() => setSelected(null)}
            />
          )}

        {tab === "applications" && (
          <Applications
            applications={applications}
            onBack={() => setTab("opportunities")}
          />
        )}
      </main>
    </div>
  );
}

/* =========================================================
   OPPORTUNITY DETAILS
========================================================= */

function OpportunityDetails({
  opportunity,
  studentSkills,
  matchedSkills,
  missingSkills,
  match,
  applied,
  applying,
  onApply,
  onBack,
}: {
  opportunity: Opportunity;
  studentSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  match: number;
  applied: boolean;
  applying: boolean;
  onApply: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <button
        style={styles.backLink}
        onClick={onBack}
      >
        ← Back to opportunities
      </button>

      <div style={styles.detailHero}>
        <div>
          <div style={styles.companyIconLarge}>
            🏢
          </div>

          <p style={styles.company}>
            {opportunity.company_name}
          </p>

          <h1 style={styles.detailTitle}>
            {opportunity.title}
          </h1>

          <div style={styles.meta}>
            <span>💼 {opportunity.type}</span>

            {opportunity.location && (
              <span>
                📍 {opportunity.location}
              </span>
            )}

            {opportunity.work_mode && (
              <span>
                🏠 {opportunity.work_mode}
              </span>
            )}
          </div>
        </div>

        <div style={styles.readinessBox}>
          <div style={styles.readinessNumber}>
            {match}%
          </div>

          <div style={styles.readinessLabel}>
            JOB MATCH
          </div>
        </div>
      </div>

      <div style={styles.detailGrid}>
        <div style={styles.mainColumn}>
          <section style={styles.section}>
            <h2>About the Opportunity</h2>

            <p style={styles.longText}>
              {opportunity.description}
            </p>
          </section>

          <section style={styles.section}>
            <h2>Why this match? 🤖</h2>

            <div style={styles.matchExplanation}>
              <div style={styles.explanationBox}>
                <div style={styles.explanationTitle}>
                  ✅ Skills You Meet
                </div>

                {matchedSkills.length > 0 ? (
                  matchedSkills.map((skill) => (
                    <div
                      key={skill}
                      style={styles.checkSkill}
                    >
                      ✓ {skill}
                    </div>
                  ))
                ) : (
                  <p>
                    No matching skills detected yet.
                  </p>
                )}
              </div>

              <div
                style={{
                  ...styles.explanationBox,
                  background: "#fff7ed",
                  borderColor: "#fed7aa",
                }}
              >
                <div
                  style={{
                    ...styles.explanationTitle,
                    color: "#c2410c",
                  }}
                >
                  ⚠️ Skills to Improve
                </div>

                {missingSkills.length > 0 ? (
                  missingSkills.map((skill) => (
                    <div
                      key={skill}
                      style={styles.missingSkill}
                    >
                      + {skill}
                    </div>
                  ))
                ) : (
                  <p>
                    🎉 You meet all listed skills!
                  </p>
                )}
              </div>
            </div>
          </section>

          <section style={styles.section}>
            <h2>Required Skills</h2>

            <div style={styles.largeSkills}>
              {parseSkills(
                opportunity.required_skills
              ).map((skill) => (
                <span
                  key={skill}
                  style={styles.largeSkillChip}
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>

          {opportunity.eligibility && (
            <section style={styles.section}>
              <h2>Eligibility</h2>
              <p style={styles.longText}>
                {opportunity.eligibility}
              </p>
            </section>
          )}

          {opportunity.experience && (
            <section style={styles.section}>
              <h2>Experience</h2>
              <p style={styles.longText}>
                {opportunity.experience}
              </p>
            </section>
          )}
        </div>

        <aside style={styles.sideColumn}>
          <div style={styles.applyCard}>
            <h2>
              {applied
                ? "Application Submitted"
                : "Ready to apply?"}
            </h2>

            <p>
              {applied
                ? "You have already applied to this opportunity. Track your application from My Applications."
                : "Apply now and track your recruitment progress through SkillBridge."}
            </p>

            <button
              style={
                applied
                  ? styles.disabledButton
                  : styles.applyButton
              }
              disabled={applied || applying}
              onClick={onApply}
            >
              {applied
                ? "✓ Applied"
                : applying
                ? "Submitting..."
                : "🚀 Apply Now"}
            </button>
          </div>

          <div style={styles.profileCard}>
            <h3>Your Skill Profile</h3>

            {studentSkills.length === 0 ? (
              <p>
                Upload your resume to build your
                skill profile.
              </p>
            ) : (
              <div style={styles.skills}>
                {studentSkills
                  .slice(0, 12)
                  .map((skill) => (
                    <span
                      key={skill}
                      style={styles.skillChip}
                    >
                      {skill}
                    </span>
                  ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* =========================================================
   APPLICATIONS
========================================================= */

function Applications({
  applications,
  onBack,
}: {
  applications: Application[];
  onBack: () => void;
}) {
  const stages = [
    "Applied",
    "Under Review",
    "Shortlisted",
    "Assessment",
    "Interview",
    "Selected",
  ];

  return (
    <div>
      <div style={styles.sectionHeader}>
        <div>
          <h1 style={styles.heading}>
            My Applications 📋
          </h1>

          <p style={styles.subtitle}>
            Track every opportunity you have applied for.
          </p>
        </div>
      </div>

      {applications.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: 50 }}>
            📋
          </div>

          <h2>No applications yet</h2>

          <p>
            Explore opportunities and apply to roles
            that match your skills.
          </p>

          <button
            style={styles.primaryButton}
            onClick={onBack}
          >
            Explore Opportunities
          </button>
        </div>
      ) : (
        <div style={styles.applicationList}>
          {applications.map((application) => {
            const currentIndex =
              stages.indexOf(application.status);

            return (
              <div
                key={application.application_id}
                style={styles.applicationCard}
              >
                <div style={styles.applicationHeader}>
                  <div>
                    <p style={styles.company}>
                      {application.company_name}
                    </p>

                    <h2>
                      {application.title}
                    </h2>

                    <p style={styles.metaText}>
                      {application.type}
                      {application.location
                        ? ` • ${application.location}`
                        : ""}
                    </p>
                  </div>

                  <span style={styles.statusBadge}>
                    {application.status}
                  </span>
                </div>

                <div style={styles.timeline}>
                  {stages.map((stage, index) => (
                    <div
                      key={stage}
                      style={styles.timelineItem}
                    >
                      <div
                        style={{
                          ...styles.timelineDot,
                          background:
                            index <= currentIndex
                              ? "#4f46e5"
                              : "#d1d5db",
                        }}
                      >
                        {index <= currentIndex
                          ? "✓"
                          : ""}
                      </div>

                      <span
                        style={{
                          color:
                            index <= currentIndex
                              ? "#111827"
                              : "#9ca3af",
                          fontWeight:
                            index <= currentIndex
                              ? 700
                              : 500,
                        }}
                      >
                        {stage}
                      </span>
                    </div>
                  ))}
                </div>

                <p style={styles.appliedDate}>
                  Applied:{" "}
                  {application.applied_at
                    ? new Date(
                        application.applied_at
                      ).toLocaleDateString()
                    : "Recently"}
                </p>
              </div>
            );
          })}
        </div>
      )}
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
    background: "#f7f8fc",
    color: "#111827",
  },

  header: {
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    padding: "18px 40px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
  },

  brand: {
    fontSize: "24px",
    fontWeight: 900,
    marginTop: "8px",
  },

  role: {
    fontSize: "11px",
    color: "#4f46e5",
    fontWeight: 800,
    letterSpacing: "1px",
  },

  backButton: {
    border: "none",
    background: "transparent",
    color: "#4f46e5",
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
  },

  headerActions: {
    display: "flex",
    gap: "8px",
  },

  tab: {
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#475467",
    padding: "11px 17px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
  },

  activeTab: {
    border: "1px solid #4f46e5",
    background: "#eef2ff",
    color: "#4338ca",
    padding: "11px 17px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 800,
  },

  content: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "35px 25px 70px",
  },

  message: {
    background: "#ecfdf3",
    border: "1px solid #a7f3d0",
    color: "#065f46",
    padding: "14px 18px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontWeight: 700,
  },

  hero: {
    background:
      "linear-gradient(135deg, #eef2ff, #ffffff)",
    border: "1px solid #c7d2fe",
    borderRadius: "24px",
    padding: "35px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "35px",
  },

  heroLabel: {
    color: "#4f46e5",
    fontWeight: 900,
    fontSize: "11px",
    letterSpacing: "1px",
  },

  heading: {
    fontSize: "32px",
    margin: "8px 0",
  },

  subtitle: {
    color: "#475467",
    lineHeight: 1.6,
    maxWidth: "720px",
  },

  heroIcon: {
    fontSize: "70px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  countBadge: {
    background: "#eef2ff",
    color: "#4338ca",
    padding: "8px 14px",
    borderRadius: "20px",
    fontWeight: 800,
    fontSize: "13px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: "20px",
  },

  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "20px",
    padding: "23px",
    boxShadow:
      "0 6px 22px rgba(15,23,42,0.05)",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  companyIcon: {
    width: "45px",
    height: "45px",
    borderRadius: "12px",
    background: "#eef2ff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "23px",
  },

  matchBadge: {
    padding: "7px 11px",
    borderRadius: "20px",
    fontWeight: 900,
    fontSize: "12px",
  },

  cardTitle: {
    fontSize: "20px",
    margin: "18px 0 5px",
  },

  company: {
    color: "#4f46e5",
    fontWeight: 800,
    margin: "0 0 12px",
  },

  meta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    color: "#667085",
    fontSize: "13px",
    marginBottom: "14px",
  },

  metaText: {
    color: "#667085",
    fontSize: "13px",
  },

  cardDescription: {
    color: "#475467",
    lineHeight: 1.55,
    minHeight: "72px",
  },

  skills: {
    display: "flex",
    flexWrap: "wrap",
    gap: "7px",
    margin: "15px 0",
  },

  skillChip: {
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    color: "#334155",
    padding: "6px 9px",
    borderRadius: "7px",
    fontSize: "12px",
    fontWeight: 700,
  },

  primaryButton: {
    width: "100%",
    border: "none",
    background: "#4f46e5",
    color: "#ffffff",
    padding: "13px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 800,
  },

  empty: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "20px",
    padding: "70px 30px",
    textAlign: "center",
    color: "#667085",
  },

  backLink: {
    border: "none",
    background: "transparent",
    color: "#4f46e5",
    fontWeight: 800,
    cursor: "pointer",
    marginBottom: "20px",
  },

  detailHero: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "22px",
    padding: "30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "22px",
  },

  companyIconLarge: {
    fontSize: "42px",
  },

  detailTitle: {
    fontSize: "34px",
    margin: "5px 0 15px",
  },

  readinessBox: {
    minWidth: "150px",
    textAlign: "center",
    background: "#eef2ff",
    borderRadius: "18px",
    padding: "22px",
  },

  readinessNumber: {
    fontSize: "40px",
    fontWeight: 900,
    color: "#4f46e5",
  },

  readinessLabel: {
    fontSize: "11px",
    fontWeight: 900,
    color: "#4338ca",
  },

  detailGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)",
    gap: "22px",
  },

  mainColumn: {
    minWidth: 0,
  },

  sideColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },

  section: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "25px",
    marginBottom: "18px",
  },

  longText: {
    color: "#475467",
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
  },

  matchExplanation: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "15px",
  },

  explanationBox: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "14px",
    padding: "18px",
  },

  explanationTitle: {
    color: "#166534",
    fontWeight: 900,
    marginBottom: "12px",
  },

  checkSkill: {
    color: "#166534",
    padding: "5px 0",
    fontWeight: 600,
  },

  missingSkill: {
    color: "#c2410c",
    padding: "5px 0",
    fontWeight: 600,
  },

  largeSkills: {
    display: "flex",
    flexWrap: "wrap",
    gap: "9px",
  },

  largeSkillChip: {
    background: "#eef2ff",
    border: "1px solid #c7d2fe",
    color: "#3730a3",
    padding: "8px 12px",
    borderRadius: "9px",
    fontWeight: 700,
    fontSize: "13px",
  },

  applyCard: {
    background: "#111827",
    color: "#ffffff",
    borderRadius: "18px",
    padding: "25px",
  },

  profileCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "22px",
  },

  applyButton: {
    width: "100%",
    border: "none",
    background: "#4f46e5",
    color: "#ffffff",
    padding: "14px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 900,
  },

  disabledButton: {
    width: "100%",
    border: "none",
    background: "#475467",
    color: "#ffffff",
    padding: "14px",
    borderRadius: "10px",
    fontWeight: 800,
  },

  applicationList: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },

  applicationCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "25px",
  },

  applicationHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    alignItems: "flex-start",
  },

  statusBadge: {
    background: "#eef2ff",
    color: "#4338ca",
    padding: "8px 13px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 900,
  },

  timeline: {
    display: "flex",
    justifyContent: "space-between",
    margin: "28px 0 18px",
    gap: "8px",
  },

  timelineItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    textAlign: "center",
    fontSize: "11px",
    flex: 1,
  },

  timelineDot: {
    width: "27px",
    height: "27px",
    borderRadius: "50%",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: 900,
  },

  appliedDate: {
    color: "#98a2b3",
    fontSize: "12px",
  },
};