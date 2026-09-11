import { useEffect, useState } from "react";

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

type Applicant = {
  id?: number;
  application_id?: number;
  student_id?: number;
  studentId?: number;
  name?: string;
  email?: string;
  status?: string;
  applied_at?: string;
  readiness_score?: number;
  match_score?: number;
  overall_score?: number;
  skill_match_score?: number;
  assessment_score?: number | null;
  matched_skills?: string[];
  missing_skills?: string[];
  recommendation?: string;
};

type Props = {
  onBack: () => void;
};

function parseSkills(value: any): string[] {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  return [];
}

export default function IndustryPortal({
  onBack,
}: Props) {
  const [tab, setTab] = useState<
    "dashboard" | "post" | "opportunities" | "applicants"
  >("dashboard");

  const [stats, setStats] = useState({
    opportunities: 0,
    applications: 0,
    shortlisted: 0,
    selected: 0,
  });

  const [opportunities, setOpportunities] =
    useState<Opportunity[]>([]);

  const [selectedOpportunity, setSelectedOpportunity] =
    useState<Opportunity | null>(null);

  const [applicants, setApplicants] =
    useState<Applicant[]>([]);

  const [message, setMessage] = useState("");

  const [feedbackCandidate, setFeedbackCandidate] =
    useState<Applicant | null>(null);

  const [feedbackForm, setFeedbackForm] = useState({
    technicalScore: "",
    communicationScore: "",
    problemSolvingScore: "",
    strengths: "",
    improvementAreas: "",
    feedback: "",
    rating: ""
  });

  const [feedbackSubmitting, setFeedbackSubmitting] =
    useState(false);

  const [form, setForm] = useState({
    company_name: "SkillBridge Demo Company",
    title: "",
    type: "Internship",
    description: "",
    eligibility: "",
    experience: "0-2 years",
    location: "",
    work_mode: "Hybrid",
    required_skills: "",
  });

  useEffect(() => {
    loadDashboard();
    loadOpportunities();
  }, []);

  async function loadDashboard() {
    try {
      const response = await fetch(
        "/api/recruiter/dashboard"
      );

      if (!response.ok) return;

      const data = await response.json();

      if (data.statistics) {
        setStats(data.statistics);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function loadOpportunities() {
    try {
      const response = await fetch(
        "/api/opportunities"
      );

      if (!response.ok) return;

      const data = await response.json();

      setOpportunities(
        Array.isArray(data)
          ? data
          : data.opportunities || []
      );
    } catch (error) {
      console.error(error);
    }
  }

  async function loadApplicants(
    opportunity: Opportunity
  ) {
    try {
      setSelectedOpportunity(opportunity);

      const response = await fetch(
        `/api/recruiter/opportunities/${opportunity.id}/candidates`
      );

      if (!response.ok) {
        setApplicants([]);
        return;
      }

      const data = await response.json();

      const list =
        Array.isArray(data)
          ? data
          : data.candidates ||
            data.applicants ||
            [];

      setApplicants(
        list.sort(
          (a: Applicant, b: Applicant) =>
            (b.overall_score ??
              b.match_score ??
              b.readiness_score ??
              0) -
            (a.overall_score ??
              a.match_score ??
              a.readiness_score ??
              0)
        )
      );

      setTab("applicants");
    } catch (error) {
      console.error(error);
      setApplicants([]);
      setTab("applicants");
    }
  }

  async function createOpportunity(
  event: React.FormEvent
) {
  event.preventDefault();

  try {
    setMessage("");

    // Convert comma-separated skills into an array
    const requiredSkills = form.required_skills
      .split(",")
      .map((skill: string) => skill.trim())
      .filter(Boolean);

    // Validate frontend fields
    if (
      !form.company_name.trim() ||
      !form.title.trim() ||
      !form.type.trim()
    ) {
      setMessage(
        "Company name, opportunity title and type are required"
      );
      return;
    }

    // IMPORTANT:
    // Backend expects camelCase field names:
    // companyName, title, type, etc.
    const payload = {
      companyName: form.company_name.trim(),
      title: form.title.trim(),
      type: form.type.trim(),

      description: form.description.trim(),
      eligibility: form.eligibility.trim(),

      // Keep these values for the opportunity UI.
      experience: form.experience.trim(),
      location: form.location.trim(),
      work_mode: form.work_mode,

      requiredSkills,
    };

    console.log(
      "POSTING OPPORTUNITY:",
      payload
    );

    const response = await fetch(
      "/api/opportunities",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    console.log(
      "CREATE OPPORTUNITY RESPONSE:",
      data
    );

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Unable to create opportunity"
      );
    }

    setMessage(
      "🎉 Opportunity posted successfully!"
    );

    // Reset form
    setForm({
      company_name: "SkillBridge Demo Company",
      title: "",
      type: "Internship",
      description: "",
      eligibility: "",
      experience: "0-2 years",
      location: "",
      work_mode: "Hybrid",
      required_skills: "",
    });

    // Refresh dashboard and opportunity list
    await loadDashboard();
    await loadOpportunities();

    // Go to opportunities page
    setTab("opportunities");

  } catch (error: any) {
    console.error(
      "CREATE OPPORTUNITY ERROR:",
      error
    );

    setMessage(
      error.message ||
        "Unable to create opportunity."
    );
  }
}
  async function updateStatus(
    applicationId: number,
    status: string
  ) {
    try {
      const response = await fetch(
        `/api/recruiter/applications/${applicationId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to update status"
        );
      }

      setMessage(
        `Application moved to ${status}.`
      );

      if (selectedOpportunity) {
        await loadApplicants(
          selectedOpportunity
        );
      }

      await loadDashboard();
    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to update application status."
      );
    }
  }

  async function submitFeedback() {
    if (!feedbackCandidate?.application_id) {
      setMessage("Application ID is missing.");
      return;
    }

    const scoreFields = [
      ["Technical score", feedbackForm.technicalScore],
      ["Communication score", feedbackForm.communicationScore],
      ["Problem-solving score", feedbackForm.problemSolvingScore],
      ["Rating", feedbackForm.rating],
    ] as const;

    for (const [label, value] of scoreFields) {
      if (value !== "") {
        const number = Number(value);
        const max = label === "Rating" ? 5 : 100;
        if (!Number.isFinite(number) || number < 0 || number > max) {
          setMessage(`${label} must be between 0 and ${max}.`);
          return;
        }
      }
    }

    if (!feedbackForm.feedback.trim() && !feedbackForm.improvementAreas.trim()) {
      setMessage("Please provide feedback or improvement areas.");
      return;
    }

    try {
      setFeedbackSubmitting(true);
      setMessage("");

      const response = await fetch(
        "/api/recruiter/feedback/detailed",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            applicationId: feedbackCandidate.application_id,
            technicalScore: feedbackForm.technicalScore === "" ? null : Number(feedbackForm.technicalScore),
            communicationScore: feedbackForm.communicationScore === "" ? null : Number(feedbackForm.communicationScore),
            problemSolvingScore: feedbackForm.problemSolvingScore === "" ? null : Number(feedbackForm.problemSolvingScore),
            strengths: feedbackForm.strengths.trim(),
            improvementAreas: feedbackForm.improvementAreas.trim(),
            feedback: feedbackForm.feedback.trim(),
            rating: feedbackForm.rating === "" ? null : Number(feedbackForm.rating),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to save feedback");
      }

      setMessage("✅ Industry feedback saved successfully.");
      setFeedbackCandidate(null);
      setFeedbackForm({
        technicalScore: "",
        communicationScore: "",
        problemSolvingScore: "",
        strengths: "",
        improvementAreas: "",
        feedback: "",
        rating: "",
      });
    } catch (error: any) {
      console.error("FEEDBACK ERROR:", error);
      setMessage(error.message || "Unable to save industry feedback.");
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <button
            style={styles.backButton}
            onClick={onBack}
          >
            ← Main Portal
          </button>

          <div style={styles.brand}>
            SkillBridge
          </div>

          <div style={styles.role}>
            INDUSTRY / RECRUITER PORTAL
          </div>
        </div>

        <nav style={styles.nav}>
          <button
            style={
              tab === "dashboard"
                ? styles.activeNav
                : styles.navButton
            }
            onClick={() =>
              setTab("dashboard")
            }
          >
            📊 Dashboard
          </button>

          <button
            style={
              tab === "post"
                ? styles.activeNav
                : styles.navButton
            }
            onClick={() =>
              setTab("post")
            }
          >
            📢 Post Opportunity
          </button>

          <button
            style={
              tab === "opportunities"
                ? styles.activeNav
                : styles.navButton
            }
            onClick={() =>
              setTab("opportunities")
            }
          >
            💼 Opportunities
          </button>
        </nav>
      </header>

      <main style={styles.content}>
        {message && (
          <div style={styles.message}>
            {message}
          </div>
        )}

        {tab === "dashboard" && (
          <Dashboard
            stats={stats}
            opportunities={opportunities}
            onPost={() => setTab("post")}
            onViewOpportunities={() =>
              setTab("opportunities")
            }
            onApplicants={loadApplicants}
          />
        )}

        {tab === "post" && (
          <PostOpportunity
            form={form}
            setForm={setForm}
            onSubmit={createOpportunity}
            onCancel={() =>
              setTab("dashboard")
            }
          />
        )}

        {tab === "opportunities" && (
          <OpportunityList
            opportunities={opportunities}
            onApplicants={loadApplicants}
            onPost={() => setTab("post")}
          />
        )}

        {tab === "applicants" && (
          <Applicants
            opportunity={selectedOpportunity}
            applicants={applicants}
            onBack={() =>
              setTab("opportunities")
            }
            onStatus={updateStatus}
            onFeedback={(candidate) => {
              setFeedbackCandidate(candidate);
              setMessage("");
            }}
          />
        )}
      </main>

      {feedbackCandidate && (
        <FeedbackModal
          candidate={feedbackCandidate}
          form={feedbackForm}
          setForm={setFeedbackForm}
          submitting={feedbackSubmitting}
          onClose={() => setFeedbackCandidate(null)}
          onSubmit={submitFeedback}
        />
      )}
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  stats,
  opportunities,
  onPost,
  onViewOpportunities,
  onApplicants,
}: {
  stats: any;
  opportunities: Opportunity[];
  onPost: () => void;
  onViewOpportunities: () => void;
  onApplicants: (
    opportunity: Opportunity
  ) => void;
}) {
  return (
    <>
      <div style={styles.hero}>
        <div>
          <div style={styles.heroLabel}>
            INDUSTRY RECRUITMENT CENTRE
          </div>

          <h1 style={styles.heading}>
            Find the right talent 🎯
          </h1>

          <p style={styles.subtitle}>
            Define your opportunity requirements,
            discover suitable students and use
            skill and placement-readiness evidence
            to support recruitment decisions.
          </p>
        </div>

        <div style={styles.heroIcon}>
          🏢
        </div>
      </div>

      <div style={styles.statsGrid}>
        <Stat
          icon="💼"
          label="Opportunities"
          value={stats.opportunities}
        />

        <Stat
          icon="👥"
          label="Applications"
          value={stats.applications}
        />

        <Stat
          icon="⭐"
          label="Shortlisted"
          value={stats.shortlisted}
        />

        <Stat
          icon="🎉"
          label="Selected"
          value={stats.selected}
        />
      </div>

      <div style={styles.quickGrid}>
        <ActionCard
          icon="📢"
          title="Post Opportunity"
          description="Create a job or internship with required skills."
          button="Create Opportunity"
          onClick={onPost}
        />

        <ActionCard
          icon="👥"
          title="Candidate Matching"
          description="Review students who applied to your opportunities."
          button="View Applicants"
          onClick={onViewOpportunities}
        />

        <ActionCard
          icon="🤖"
          title="AI Candidate Ranking"
          description="Use readiness and skill evidence to prioritize candidates."
          button="Open Opportunities"
          onClick={onViewOpportunities}
        />
      </div>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2>Recent Opportunities</h2>
            <p>
              Open your opportunity to inspect applicants.
            </p>
          </div>
        </div>

        {opportunities.length === 0 ? (
          <div style={styles.empty}>
            No opportunities posted yet.
          </div>
        ) : (
          <div style={styles.table}>
            {opportunities
              .slice(0, 5)
              .map((opportunity) => (
                <div
                  key={opportunity.id}
                  style={styles.tableRow}
                >
                  <div>
                    <strong>
                      {opportunity.title}
                    </strong>

                    <div style={styles.smallText}>
                      {opportunity.company_name} •{" "}
                      {opportunity.type}
                    </div>
                  </div>

                  <button
                    style={styles.smallButton}
                    onClick={() =>
                      onApplicants(
                        opportunity
                      )
                    }
                  >
                    View Applicants →
                  </button>
                </div>
              ))}
          </div>
        )}
      </section>
    </>
  );
}

/* =========================================================
   POST OPPORTUNITY
========================================================= */

function PostOpportunity({
  form,
  setForm,
  onSubmit,
  onCancel,
}: {
  form: any;
  setForm: React.Dispatch<
    React.SetStateAction<any>
  >;
  onSubmit: (
    event: React.FormEvent
  ) => void;
  onCancel: () => void;
}) {
  return (
    <div>
      <button
        style={styles.backLink}
        onClick={onCancel}
      >
        ← Back
      </button>

      <div style={styles.formCard}>
        <div>
          <div style={styles.heroLabel}>
            CREATE OPPORTUNITY
          </div>

          <h1 style={styles.heading}>
            Post a Job or Internship 📢
          </h1>

          <p style={styles.subtitle}>
            Define the skills and requirements
            candidates should have.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          style={styles.form}
        >
          <div style={styles.twoColumns}>
            <Field
              label="Company Name"
              value={form.company_name}
              onChange={(value) =>
                setForm({
                  ...form,
                  company_name: value,
                })
              }
            />

            <Field
              label="Opportunity Title"
              placeholder="e.g. Java Backend Developer Intern"
              value={form.title}
              onChange={(value) =>
                setForm({
                  ...form,
                  title: value,
                })
              }
            />
          </div>

          <div style={styles.twoColumns}>
            <SelectField
              label="Type"
              value={form.type}
              options={[
                "Internship",
                "Full Time",
                "Part Time",
              ]}
              onChange={(value) =>
                setForm({
                  ...form,
                  type: value,
                })
              }
            />

            <Field
              label="Experience"
              value={form.experience}
              onChange={(value) =>
                setForm({
                  ...form,
                  experience: value,
                })
              }
            />
          </div>

          <div style={styles.twoColumns}>
            <Field
              label="Location"
              placeholder="e.g. Chennai"
              value={form.location}
              onChange={(value) =>
                setForm({
                  ...form,
                  location: value,
                })
              }
            />

            <SelectField
              label="Work Mode"
              value={form.work_mode}
              options={[
                "On-site",
                "Hybrid",
                "Remote",
              ]}
              onChange={(value) =>
                setForm({
                  ...form,
                  work_mode: value,
                })
              }
            />
          </div>

          <Field
            label="Required Skills"
            placeholder="Java, Spring Boot, SQL, REST API"
            value={form.required_skills}
            onChange={(value) =>
              setForm({
                ...form,
                required_skills: value,
              })
            }
          />

          <label style={styles.label}>
            Description
          </label>

          <textarea
            style={styles.textarea}
            rows={6}
            placeholder="Describe the role, responsibilities and expectations..."
            value={form.description}
            onChange={(e) =>
              setForm({
                ...form,
                description:
                  e.target.value,
              })
            }
            required
          />

          <label style={styles.label}>
            Eligibility
          </label>

          <textarea
            style={styles.textarea}
            rows={3}
            placeholder="e.g. BE/B.Tech CSE/IT students, 60% minimum"
            value={form.eligibility}
            onChange={(e) =>
              setForm({
                ...form,
                eligibility:
                  e.target.value,
              })
            }
          />

          <div style={styles.formActions}>
            <button
              type="button"
              style={styles.cancelButton}
              onClick={onCancel}
            >
              Cancel
            </button>

            <button
              type="submit"
              style={styles.primaryButton}
            >
              📢 Publish Opportunity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   OPPORTUNITY LIST
========================================================= */

function OpportunityList({
  opportunities,
  onApplicants,
  onPost,
}: {
  opportunities: Opportunity[];
  onApplicants: (
    opportunity: Opportunity
  ) => void;
  onPost: () => void;
}) {
  return (
    <div>
      <div style={styles.sectionHeader}>
        <div>
          <h1 style={styles.heading}>
            Your Opportunities 💼
          </h1>

          <p style={styles.subtitle}>
            Manage posted opportunities and review
            applicants.
          </p>
        </div>

        <button
          style={styles.primaryButtonSmall}
          onClick={onPost}
        >
          + Post Opportunity
        </button>
      </div>

      {opportunities.length === 0 ? (
        <div style={styles.empty}>
          <h2>No opportunities posted</h2>

          <button
            style={styles.primaryButton}
            onClick={onPost}
          >
            Create Your First Opportunity
          </button>
        </div>
      ) : (
        <div style={styles.opportunityList}>
          {opportunities.map(
            (opportunity) => (
              <div
                key={opportunity.id}
                style={styles.opportunityRow}
              >
                <div style={styles.companyIcon}>
                  🏢
                </div>

                <div style={{ flex: 1 }}>
                  <h2
                    style={{
                      margin: "0 0 5px",
                    }}
                  >
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
                        📍{" "}
                        {opportunity.location}
                      </span>
                    )}

                    {opportunity.work_mode && (
                      <span>
                        🏠{" "}
                        {opportunity.work_mode}
                      </span>
                    )}
                  </div>

                  <div style={styles.skills}>
                    {parseSkills(
                      opportunity.required_skills
                    ).map((skill) => (
                      <span
                        key={skill}
                        style={styles.skillChip}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  style={styles.smallButton}
                  onClick={() =>
                    onApplicants(
                      opportunity
                    )
                  }
                >
                  👥 Applicants
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   APPLICANTS / AI RANKING
========================================================= */

function Applicants({
  opportunity,
  applicants,
  onBack,
  onStatus,
  onFeedback,
}: {
  opportunity: Opportunity | null;
  applicants: Applicant[];
  onBack: () => void;
  onStatus: (
    applicationId: number,
    status: string
  ) => void;
  onFeedback: (candidate: Applicant) => void;
}) {
  return (
    <div>
      <button
        style={styles.backLink}
        onClick={onBack}
      >
        ← Back to opportunities
      </button>

      <div style={styles.hero}>
        <div>
          <div style={styles.heroLabel}>
            AI-ASSISTED CANDIDATE REVIEW
          </div>

          <h1 style={styles.heading}>
            {opportunity?.title ||
              "Applicants"}
          </h1>

          <p style={styles.subtitle}>
            Candidates are presented using available
            application and readiness evidence.
            The recruiter remains the final decision-maker.
          </p>
        </div>

        <div style={styles.heroIcon}>
          🤖
        </div>
      </div>

      {applicants.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: 50 }}>
            👥
          </div>

          <h2>No applicants yet</h2>

          <p>
            Applications will appear here when students
            apply to this opportunity.
          </p>
        </div>
      ) : (
        <div style={styles.candidateList}>
          {applicants.map(
            (candidate, index) => {
              const readiness =
                candidate.readiness_score ??
                candidate.match_score ??
                0;

              return (
                <div
                  key={
                    candidate.application_id ??
                    candidate.id ??
                    index
                  }
                  style={styles.candidateCard}
                >
                  <div style={styles.rank}>
                    #{index + 1}
                  </div>

                  <div style={styles.avatar}>
                    👤
                  </div>

                  <div style={{ flex: 1 }}>
                    <h2
                      style={{
                        margin: "0 0 5px",
                      }}
                    >
                      {candidate.name ||
                        `Student #${
                          candidate.student_id ||
                          candidate.studentId ||
                          "—"
                        }`}
                    </h2>

                    <p style={styles.smallText}>
                      {candidate.email ||
                        "Student applicant"}
                    </p>

                    <div style={styles.evidenceRow}>
                      <span style={styles.evidence}>
                        🎯 Overall{" "}
                        {candidate.overall_score ??
                          candidate.match_score ??
                          readiness}%
                      </span>

                      {candidate.skill_match_score !==
                        undefined && (
                        <span style={styles.evidence}>
                          🧩 Skills{" "}
                          {candidate.skill_match_score}%
                        </span>
                      )}

                      {candidate.assessment_score !==
                        undefined &&
                        candidate.assessment_score !==
                          null && (
                          <span style={styles.evidence}>
                            📝 Assessment{" "}
                            {candidate.assessment_score}%
                          </span>
                        )}

                      <span style={styles.evidence}>
                        📋{" "}
                        {candidate.status ||
                          "Applied"}
                      </span>
                    </div>

                    {candidate.recommendation && (
                      <div
                        style={{
                          ...styles.recommendation,
                          marginTop: "9px",
                        }}
                      >
                        🤖 {candidate.recommendation}
                      </div>
                    )}

                    {(candidate.matched_skills?.length ||
                      candidate.missing_skills?.length) ? (
                      <div style={styles.skillEvidence}>
                        {candidate.matched_skills?.length ? (
                          <div>
                            <strong>Matched:</strong>{" "}
                            {candidate.matched_skills.join(", ")}
                          </div>
                        ) : null}

                        {candidate.missing_skills?.length ? (
                          <div>
                            <strong>Skill gaps:</strong>{" "}
                            {candidate.missing_skills.join(", ")}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div style={styles.candidateActions}>
                    <button
                      style={styles.shortlistButton}
                      onClick={() => {
                        if (
                          candidate.application_id
                        ) {
                          onStatus(
                            candidate.application_id,
                            "Shortlisted"
                          );
                        }
                      }}
                    >
                      ⭐ Shortlist
                    </button>

                    <button
                      style={styles.feedbackButton}
                      onClick={() => onFeedback(candidate)}
                    >
                      📝 Feedback
                    </button>

                    <button
                      style={styles.rejectButton}
                      onClick={() => {
                        if (
                          candidate.application_id
                        ) {
                          onStatus(
                            candidate.application_id,
                            "Rejected"
                          );
                        }
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   INDUSTRY FEEDBACK MODAL
========================================================= */

function FeedbackModal({
  candidate,
  form,
  setForm,
  submitting,
  onClose,
  onSubmit,
}: {
  candidate: Applicant;
  form: {
    technicalScore: string;
    communicationScore: string;
    problemSolvingScore: string;
    strengths: string;
    improvementAreas: string;
    feedback: string;
    rating: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      technicalScore: string;
      communicationScore: string;
      problemSolvingScore: string;
      strengths: string;
      improvementAreas: string;
      feedback: string;
      rating: string;
    }>
  >;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const update = (key: keyof typeof form, value: string) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.feedbackModal}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.heroLabel}>INDUSTRY FEEDBACK</div>
            <h2 style={{ margin: "5px 0 4px" }}>
              Review {candidate.name || "Candidate"}
            </h2>
            <div style={styles.smallText}>
              Application #{candidate.application_id ?? "—"}
            </div>
          </div>

          <button
            type="button"
            style={styles.modalClose}
            onClick={onClose}
            disabled={submitting}
          >
            ✕
          </button>
        </div>

        <p style={styles.modalIntro}>
          Share structured feedback after an assessment or interview.
          This feedback can help the student understand strengths and
          areas that need improvement.
        </p>

        <div style={styles.scoreGrid}>
          <ScoreField
            label="Technical"
            value={form.technicalScore}
            onChange={(value) => update("technicalScore", value)}
          />
          <ScoreField
            label="Communication"
            value={form.communicationScore}
            onChange={(value) => update("communicationScore", value)}
          />
          <ScoreField
            label="Problem Solving"
            value={form.problemSolvingScore}
            onChange={(value) => update("problemSolvingScore", value)}
          />
          <ScoreField
            label="Overall Rating"
            value={form.rating}
            max={5}
            onChange={(value) => update("rating", value)}
          />
        </div>

        <label style={styles.label}>Strengths</label>
        <textarea
          style={styles.textarea}
          rows={3}
          placeholder="e.g. Strong Java fundamentals, clear explanation..."
          value={form.strengths}
          onChange={(event) => update("strengths", event.target.value)}
        />

        <label style={styles.label}>Improvement Areas</label>
        <textarea
          style={styles.textarea}
          rows={3}
          placeholder="e.g. Improve Spring Boot, SQL joins and problem-solving speed..."
          value={form.improvementAreas}
          onChange={(event) =>
            update("improvementAreas", event.target.value)
          }
        />

        <label style={styles.label}>Overall Feedback</label>
        <textarea
          style={styles.textarea}
          rows={4}
          placeholder="Write constructive recruiter feedback..."
          value={form.feedback}
          onChange={(event) => update("feedback", event.target.value)}
        />

        <div style={styles.feedbackNote}>
          💡 Keep feedback specific and actionable so the student can use
          it to improve future applications.
        </div>

        <div style={styles.formActions}>
          <button
            type="button"
            style={styles.cancelButton}
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            style={styles.primaryButton}
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? "Saving..." : "💾 Submit Feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreField({
  label,
  value,
  onChange,
  max = 100,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: number;
}) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <input
        style={styles.input}
        type="number"
        min={0}
        max={max}
        step="1"
        placeholder={`0-${max}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function Stat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>
        {icon}
      </div>

      <div>
        <div style={styles.statValue}>
          {value}
        </div>

        <div style={styles.statLabel}>
          {label}
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  button,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  button: string;
  onClick: () => void;
}) {
  return (
    <div style={styles.actionCard}>
      <div style={styles.actionIcon}>
        {icon}
      </div>

      <h2>{title}</h2>

      <p>{description}</p>

      <button
        style={styles.smallButton}
        onClick={onClick}
      >
        {button} →
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={styles.label}>
        {label}
      </label>

      <input
        style={styles.input}
        value={value}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(e.target.value)
        }
        required
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label style={styles.label}>
        {label}
      </label>

      <select
        style={styles.input}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
      >
        {options.map((option) => (
          <option key={option}>
            {option}
          </option>
        ))}
      </select>
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
    padding: "18px 35px",
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
    color: "#4f46e5",
    fontSize: "11px",
    fontWeight: 900,
    letterSpacing: "1px",
  },

  backButton: {
    border: "none",
    background: "transparent",
    color: "#4f46e5",
    fontWeight: 800,
    cursor: "pointer",
    padding: 0,
  },

  nav: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  navButton: {
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#475467",
    padding: "10px 14px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 700,
  },

  activeNav: {
    border: "1px solid #4f46e5",
    background: "#eef2ff",
    color: "#4338ca",
    padding: "10px 14px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 900,
  },

  content: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "35px 25px 70px",
  },

  message: {
    background: "#ecfdf3",
    color: "#065f46",
    border: "1px solid #a7f3d0",
    padding: "14px 18px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontWeight: 700,
  },

  hero: {
    background:
      "linear-gradient(135deg,#eef2ff,#ffffff)",
    border: "1px solid #c7d2fe",
    borderRadius: "24px",
    padding: "35px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
  },

  heroLabel: {
    color: "#4f46e5",
    fontSize: "11px",
    fontWeight: 900,
    letterSpacing: "1px",
  },

  heroIcon: {
    fontSize: "65px",
  },

  heading: {
    fontSize: "32px",
    margin: "8px 0",
  },

  subtitle: {
    color: "#475467",
    lineHeight: 1.6,
    maxWidth: "750px",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4,minmax(0,1fr))",
    gap: "15px",
    marginBottom: "25px",
  },

  statCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },

  statIcon: {
    fontSize: "30px",
  },

  statValue: {
    fontSize: "27px",
    fontWeight: 900,
  },

  statLabel: {
    color: "#667085",
    fontSize: "13px",
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3,minmax(0,1fr))",
    gap: "18px",
    marginBottom: "25px",
  },

  actionCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "23px",
  },

  actionIcon: {
    fontSize: "32px",
  },

  section: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "25px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "20px",
  },

  table: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    overflow: "hidden",
  },

  tableRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "17px",
    borderBottom: "1px solid #f1f5f9",
    gap: "15px",
  },

  smallText: {
    color: "#667085",
    fontSize: "13px",
    marginTop: "4px",
  },

  smallButton: {
    border: "none",
    background: "#eef2ff",
    color: "#4338ca",
    padding: "10px 14px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  primaryButton: {
    border: "none",
    background: "#4f46e5",
    color: "#ffffff",
    padding: "13px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 900,
  },

  primaryButtonSmall: {
    border: "none",
    background: "#4f46e5",
    color: "#ffffff",
    padding: "11px 16px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 800,
  },

  backLink: {
    border: "none",
    background: "transparent",
    color: "#4f46e5",
    fontWeight: 800,
    cursor: "pointer",
    marginBottom: "18px",
  },

  formCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "22px",
    padding: "30px",
  },

  form: {
    marginTop: "30px",
  },

  twoColumns: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2,minmax(0,1fr))",
    gap: "18px",
    marginBottom: "18px",
  },

  label: {
    display: "block",
    color: "#344054",
    fontWeight: 800,
    fontSize: "13px",
    marginBottom: "7px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d0d5dd",
    background: "#ffffff",
    color: "#111827",
    padding: "13px",
    borderRadius: "9px",
    fontSize: "14px",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d0d5dd",
    background: "#ffffff",
    color: "#111827",
    padding: "13px",
    borderRadius: "9px",
    fontSize: "14px",
    marginBottom: "18px",
    resize: "vertical",
  },

  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "10px",
  },

  cancelButton: {
    border: "1px solid #d0d5dd",
    background: "#ffffff",
    color: "#344054",
    padding: "12px 18px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 800,
  },

  empty: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "55px",
    textAlign: "center",
    color: "#667085",
  },

  opportunityList: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },

  opportunityRow: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "17px",
    padding: "20px",
    display: "flex",
    alignItems: "flex-start",
    gap: "17px",
  },

  companyIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "#eef2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    flexShrink: 0,
  },

  company: {
    color: "#4f46e5",
    fontWeight: 800,
    margin: "4px 0 10px",
  },

  meta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "9px",
    color: "#667085",
    fontSize: "13px",
  },

  skills: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: "12px",
  },

  skillChip: {
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    color: "#334155",
    padding: "5px 8px",
    borderRadius: "7px",
    fontSize: "11px",
    fontWeight: 700,
  },

  candidateList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  candidateCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "17px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },

  rank: {
    fontWeight: 900,
    color: "#4f46e5",
    width: "30px",
  },

  avatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: "#eef2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
  },

  evidenceRow: {
    display: "flex",
    gap: "8px",
    marginTop: "10px",
    flexWrap: "wrap",
  },

  evidence: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#475467",
    padding: "6px 9px",
    borderRadius: "7px",
    fontSize: "11px",
    fontWeight: 700,
  },

  recommendation: {
    display: "inline-block",
    background: "#eef2ff",
    border: "1px solid #c7d2fe",
    color: "#3730a3",
    padding: "6px 9px",
    borderRadius: "7px",
    fontSize: "11px",
    fontWeight: 800,
  },

  skillEvidence: {
    marginTop: "9px",
    color: "#667085",
    fontSize: "12px",
    lineHeight: 1.6,
  },

  candidateActions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  feedbackButton: {
    border: "none",
    background: "#e0e7ff",
    color: "#3730a3",
    padding: "10px 13px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 800,
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000,
  },

  feedbackModal: {
    width: "min(760px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "white",
    borderRadius: "18px",
    padding: "26px",
    boxShadow: "0 24px 70px rgba(15, 23, 42, 0.25)",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
  },

  modalClose: {
    border: "none",
    background: "#f1f5f9",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    cursor: "pointer",
    fontWeight: 800,
  },

  modalIntro: {
    color: "#667085",
    lineHeight: 1.6,
    margin: "14px 0 20px",
  },

  scoreGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "12px",
    marginBottom: "16px",
  },

  feedbackNote: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "11px 13px",
    color: "#475467",
    fontSize: "12px",
    lineHeight: 1.5,
    marginTop: "12px",
  },

  shortlistButton: {
    border: "none",
    background: "#dcfce7",
    color: "#166534",
    padding: "10px 13px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 800,
  },

  rejectButton: {
    border: "none",
    background: "#fee2e2",
    color: "#991b1b",
    padding: "10px 13px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 800,
  },
};