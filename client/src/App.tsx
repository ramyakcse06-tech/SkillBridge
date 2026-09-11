import { useState } from "react";

import TargetJob from "./components/TargetJob";
import ResumeUpload from "./components/ResumeUpload";
import OpportunityPortal from "./components/OpportunityPortal";
import IndustryPortal from "./components/IndustryPortal";
import DocumentVault from "./components/DocumentVault";

type Portal =
  | "landing"
  | "student"
  | "industry";

// ============================================================
// APP
// ============================================================

function App() {

  const [portal, setPortal] =
    useState<Portal>("landing");

  const [studentLoggedIn, setStudentLoggedIn] =
    useState(false);

  const [studentUser, setStudentUser] = useState<any>(null);

  const [industryLoggedIn, setIndustryLoggedIn] =
    useState(false);

  

  // ==========================================================
  // LANDING PAGE
  // ==========================================================

  if (portal === "landing") {

    return (
      <div style={styles.page}>

        <div style={styles.hero}>

          <div style={styles.logo}>
            SB
          </div>

          <h1 style={styles.title}>
            SkillBridge
          </h1>

          <p style={styles.subtitle}>
            AI-powered Academia–Industry Skill & Placement Platform
          </p>

          <p style={styles.description}>
            Build your skills, assess your readiness,
            and connect with the right opportunities.
          </p>

          <div style={styles.cards}>

            {/* =================================================
                STUDENT PORTAL
            ================================================= */}

            <div
              style={styles.portalCard}
              onClick={() =>
                setPortal("student")
              }
            >

              <div style={styles.icon}>
                🎓
              </div>

              <h2 style={styles.portalTitle}>
                Student Portal
              </h2>

              <p style={styles.portalDescription}>
                Upload your resume, discover skill gaps,
                learn, assess yourself and become
                placement-ready.
              </p>

              <button
                type="button"
                style={styles.primaryButton}
              >
                Enter Student Portal →
              </button>

            </div>

            {/* =================================================
                INDUSTRY PORTAL
            ================================================= */}

            <div
              style={styles.portalCard}
              onClick={() =>
                setPortal("industry")
              }
            >

              <div style={styles.icon}>
                🏢
              </div>

              <h2 style={styles.portalTitle}>
                Industry Portal
              </h2>

              <p style={styles.portalDescription}>
                Post opportunities, define required
                skills and discover suitable candidates.
              </p>

              <button
                type="button"
                style={styles.secondaryButton}
              >
                Enter Industry Portal →
              </button>

            </div>

          </div>

        </div>

      </div>
    );
  }

  // ==========================================================
  // STUDENT PORTAL
  // ==========================================================

  if (portal === "student") {

    if (!studentLoggedIn) {

      return (
        <StudentLogin
          onLogin={(user) => {
  setStudentUser(user);
  setStudentLoggedIn(true);
}}
          onBack={() =>
            setPortal("landing")
          }
        />
      );
    }

    return (
      <StudentDashboard
        studentUser={studentUser}
        onBack={() => {

          setStudentLoggedIn(false);

          setPortal("landing");

        }}
      />
    );
  }

  // ==========================================================
  // INDUSTRY PORTAL
  // ==========================================================

  if (portal === "industry") {

    if (!industryLoggedIn) {

      return (
        <IndustryLogin
          onLogin={() =>
            setIndustryLoggedIn(true)
          }
          onBack={() =>
            setPortal("landing")
          }
        />
      );
    }

    return (
      <IndustryDashboard
        onBack={() => {

          setIndustryLoggedIn(false);

          setPortal("landing");

        }}
      />
    );
  }

  return null;
}

// ============================================================
// STUDENT LOGIN
// ============================================================

function StudentLogin({
  onLogin,
  onBack,
}: {
  onLogin: (user: any) => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/auth/student/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Invalid email or password");
        return;
      }

      // Store authentication details
      localStorage.setItem("skillbridge_token", data.token);
      localStorage.setItem(
        "skillbridge_user",
        JSON.stringify(data.user)
      );

      // Send real user details to App
      onLogin(data.user);
    } catch (err) {
      console.error("Student login error:", err);
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.authPage}>
      <div style={styles.authBox}>

        <button
          type="button"
          style={styles.backButton}
          onClick={onBack}
        >
          ← Back
        </button>

        <div style={styles.logo}>
          SB
        </div>

        <h1 style={styles.authTitle}>
          Student Login
        </h1>

        <p style={styles.muted}>
          Continue your journey toward
          placement readiness
        </p>

        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p style={{ color: "red", marginTop: "10px" }}>
            {error}
          </p>
        )}

        <button
          type="button"
          style={styles.primaryButtonFull}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login as Student"}
        </button>

      </div>
    </div>
  );
}

// ============================================================
// STUDENT DASHBOARD
// ============================================================

function StudentDashboard({
  onBack,
  studentUser,
}: {
  onBack: () => void;
  studentUser: any;
}) {

  const [page, setPage] =
    useState<
      | "dashboard"
      | "resume"
      | "target"
      | "opportunities"
      | "documents"
    >("dashboard");

  // ==========================================================
  // RESUME PAGE
  // ==========================================================

  if (page === "resume") {

    return (
      <ResumeUpload
        studentId={studentUser?.id ?? 0}

        onBack={() => {
          setPage("dashboard");
        }}

        onSuccess={() => {
          setPage("dashboard");
        }}
      />
    );
  }

  // ==========================================================
  // TARGET JOB PAGE
  // ==========================================================

  if (page === "target") {

    return (
      <div>

        <div style={styles.topBar}>

          <button
            type="button"
            style={styles.backButton}
            onClick={() =>
              setPage("dashboard")
            }
          >
            ← Student Dashboard
          </button>

        </div>

        <TargetJob />

      </div>
    );
  }

  // ==========================================================
  // OPPORTUNITIES PAGE
  // ==========================================================

  if (page === "opportunities") {

    return (
      <OpportunityPortal
        studentId={studentUser?.id ?? 0}
        onBack={() =>
          setPage("dashboard")
        }
      />
    );
  }

  // ==========================================================
  // SECURE DOCUMENT VAULT
  // ==========================================================

  if (page === "documents") {

    return (
      <DocumentVault
        studentId={studentUser?.id ?? 0}
        onBack={() =>
          setPage("dashboard")
        }
      />
    );
  }

  // ==========================================================
  // MAIN DASHBOARD
  // ==========================================================

  return (
    <div style={styles.dashboardPage}>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header style={styles.dashboardHeader}>

        <div>

          <div style={styles.brand}>
            SkillBridge
          </div>

          <span style={styles.role}>
            STUDENT PORTAL
          </span>

        </div>

        <button
          type="button"
          style={styles.logoutButton}
          onClick={onBack}
        >
          Logout
        </button>

      </header>

      {/* ======================================================
          DASHBOARD CONTENT
      ====================================================== */}

      <main style={styles.dashboardContent}>

        <h1>
          Welcome back, Student 👋
        </h1>

        <p style={styles.dashboardSubtitle}>
          Your journey from skills to
          placement starts here.
        </p>

        {/* ====================================================
            RESUME HERO
        ==================================================== */}

        <div style={styles.resumeHero}>

          <div>

            <span style={styles.resumeBadge}>
              🚀 GET PLACEMENT READY
            </span>

            <h2 style={styles.resumeTitle}>
              Upload your Resume
            </h2>

            <p style={styles.resumeDescription}>
              Let SkillBridge analyze your resume,
              extract your skills and identify the
              skills you need for your target job.
            </p>

          </div>

          <button
            type="button"
            style={styles.uploadButton}
            onClick={() => {
              setPage("resume");
            }}
          >
            📄 Upload / Update Resume
          </button>

        </div>

        {/* ====================================================
            DASHBOARD CARDS
        ==================================================== */}

        <div style={styles.grid}>

          {/* TARGET JOB */}

          <DashboardCard
            icon="🎯"
            title="Target Job"
            description="Choose the job role you want to prepare for."
            button="Choose Target Job"
            onClick={() =>
              setPage("target")
            }
          />

          {/* SKILL GAP */}

          <DashboardCard
            icon="📊"
            title="Skill Gap"
            description="See which skills you have and which skills you need."
            button="View Skill Gap"
            onClick={() =>
              setPage("target")
            }
          />

          {/* LEARNING */}

          <DashboardCard
            icon="📚"
            title="Learning"
            description="Get personalized learning recommendations."
            button="Start Learning"
            onClick={() =>
              setPage("target")
            }
          />

          {/* ASSESSMENTS */}

          <DashboardCard
            icon="🧠"
            title="Assessments"
            description="Test your aptitude, technical and coding skills."
            button="Take Assessment"
            onClick={() =>
              setPage("target")
            }
          />

          {/* PLACEMENT READINESS */}

          <DashboardCard
            icon="🏆"
            title="Placement Readiness"
            description="Measure how ready you are for your target job."
            button="Check Readiness"
            onClick={() =>
              setPage("target")
            }
          />

          {/* OPPORTUNITIES */}

          <DashboardCard
            icon="💼"
            title="Opportunities"
            description="Find jobs and internships matching your profile."
            button="Explore Jobs"
            onClick={() =>
              setPage("opportunities")
            }
          />

          {/* ==================================================
              SECURE DOCUMENT VAULT
          ================================================== */}

          <DashboardCard
            icon="🔐"
            title="Secure Document Vault"
            description="Securely store your resume, certificates, academic records and internship documents."
            button="Open Document Vault"
            onClick={() =>
              setPage("documents")
            }
          />

        </div>

      </main>

    </div>
  );
}

// ============================================================
// INDUSTRY LOGIN
// ============================================================

function IndustryLogin({
  onLogin,
  onBack,
}: {
  onLogin: () => void;
  onBack: () => void;
}) {

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  return (
    <div style={styles.authPage}>

      <div style={styles.authBox}>

        <button
          type="button"
          style={styles.backButton}
          onClick={onBack}
        >
          ← Back
        </button>

        <div style={styles.industryIcon}>
          🏢
        </div>

        <h1 style={styles.authTitle}>
          Industry Login
        </h1>

        <p style={styles.muted}>
          Access recruitment and candidate
          matching
        </p>

        <input
          style={styles.input}
          type="email"
          placeholder="Company Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <button
          type="button"
          style={styles.secondaryButtonFull}
          onClick={onLogin}
        >
          Login as Industry
        </button>

        <p style={styles.demoText}>
          Demo login — enter any email
          and password
        </p>

      </div>

    </div>
  );
}

// ============================================================
// INDUSTRY DASHBOARD
// ============================================================

function IndustryDashboard({
  onBack,
}: {
  onBack: () => void;
}) {

  return (
    <IndustryPortal
      onBack={onBack}
    />
  );
}

// ============================================================
// DASHBOARD CARD
// ============================================================

function DashboardCard({
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
    <div style={styles.card}>

      <div style={styles.cardIcon}>
        {icon}
      </div>

      <h2 style={styles.cardTitle}>
        {title}
      </h2>

      <p style={styles.cardDescription}>
        {description}
      </p>

      <button
        type="button"
        style={styles.cardButton}
        onClick={onClick}
      >
        {button} →
      </button>

    </div>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles: Record<
  string,
  React.CSSProperties
> = {

  // ==========================================================
  // LANDING
  // ==========================================================

  page: {
    minHeight: "100vh",
    background: "#f7f8fc",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px",
    color: "#111827",
  },

  hero: {
    width: "100%",
    maxWidth: "1100px",
    textAlign: "center",
  },

  logo: {
    width: "64px",
    height: "64px",
    borderRadius: "18px",
    background: "#4f46e5",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    fontWeight: 800,
    margin: "0 auto 20px",
  },

  title: {
    fontSize: "48px",
    margin: "0 0 10px",
    color: "#111827",
    fontWeight: 800,
  },

  subtitle: {
    fontSize: "20px",
    color: "#4f46e5",
    fontWeight: 600,
    margin: "0 0 12px",
  },

  description: {
    color: "#64748b",
    marginBottom: "45px",
    fontSize: "16px",
  },

  cards: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "25px",
  },

  portalCard: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "24px",
    padding: "40px",
    cursor: "pointer",
    boxShadow:
      "0 10px 30px rgba(15,23,42,0.07)",
    transition:
      "transform 0.2s ease",
  },

  portalTitle: {
    color: "#111827",
    fontSize: "25px",
    marginBottom: "12px",
  },

  portalDescription: {
    color: "#475569",
    lineHeight: 1.7,
    marginBottom: "25px",
  },

  icon: {
    fontSize: "48px",
  },

  primaryButton: {
    background: "#4f46e5",
    color: "white",
    border: "none",
    padding: "13px 22px",
    borderRadius: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },

  secondaryButton: {
    background: "#0f172a",
    color: "white",
    border: "none",
    padding: "13px 22px",
    borderRadius: "10px",
    fontWeight: 700,
    cursor: "pointer",
  },

  // ==========================================================
  // AUTH
  // ==========================================================

  authPage: {
    minHeight: "100vh",
    background: "#f7f8fc",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "30px",
    color: "#111827",
  },

  authBox: {
    width: "100%",
    maxWidth: "440px",
    background: "white",
    borderRadius: "24px",
    padding: "40px",
    boxShadow:
      "0 15px 45px rgba(15,23,42,0.10)",
    border: "1px solid #e5e7eb",
    textAlign: "center",
  },

  authTitle: {
    color: "#111827",
    marginBottom: "8px",
  },

  muted: {
    color: "#64748b",
    marginBottom: "25px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 15px",
    marginBottom: "15px",
    border:
      "1px solid #cbd5e1",
    borderRadius: "10px",
    fontSize: "15px",
    color: "#111827",
    background: "white",
    outline: "none",
  },

  primaryButtonFull: {
    width: "100%",
    background: "#4f46e5",
    color: "white",
    border: "none",
    padding: "14px",
    borderRadius: "10px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "15px",
  },

  secondaryButtonFull: {
    width: "100%",
    background: "#0f172a",
    color: "white",
    border: "none",
    padding: "14px",
    borderRadius: "10px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "15px",
  },

  backButton: {
    background: "transparent",
    border: "none",
    color: "#475569",
    cursor: "pointer",
    fontWeight: 600,
    marginBottom: "25px",
    display: "block",
  },

  demoText: {
    fontSize: "13px",
    color: "#94a3b8",
    marginTop: "18px",
  },

  industryIcon: {
    fontSize: "52px",
    marginBottom: "10px",
  },

  // ==========================================================
  // DASHBOARD
  // ==========================================================

  dashboardPage: {
    minHeight: "100vh",
    background: "#f7f8fc",
    color: "#111827",
  },

  dashboardHeader: {
    height: "76px",
    background: "white",
    borderBottom:
      "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 40px",
    boxSizing: "border-box",
  },

  brand: {
    fontSize: "24px",
    fontWeight: 800,
    color: "#111827",
  },

  role: {
    fontSize: "11px",
    color: "#4f46e5",
    fontWeight: 800,
    letterSpacing: "1px",
  },

  logoutButton: {
    background: "#f1f5f9",
    border:
      "1px solid #e2e8f0",
    color: "#334155",
    padding: "10px 18px",
    borderRadius: "9px",
    fontWeight: 700,
    cursor: "pointer",
  },

  dashboardContent: {
    maxWidth: "1150px",
    margin: "0 auto",
    padding: "45px 30px",
  },

  dashboardSubtitle: {
    color: "#64748b",
    marginBottom: "35px",
  },

  // ==========================================================
  // TARGET JOB TOP BAR
  // ==========================================================

  topBar: {
    background: "#ffffff",
    borderBottom:
      "1px solid #e5e7eb",
    padding: "18px 30px",
  },

  // ==========================================================
  // RESUME
  // ==========================================================

  resumeHero: {
    background: "white",
    border:
      "1px solid #e5e7eb",
    borderRadius: "20px",
    padding: "30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "25px",
    marginBottom: "30px",
    boxShadow:
      "0 8px 25px rgba(15,23,42,0.05)",
  },

  resumeBadge: {
    display: "inline-block",
    background: "#eef2ff",
    color: "#4338ca",
    padding: "7px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 800,
    marginBottom: "10px",
  },

  resumeTitle: {
    margin: "5px 0 8px",
    color: "#111827",
  },

  resumeDescription: {
    color: "#64748b",
    maxWidth: "650px",
    lineHeight: 1.6,
    margin: 0,
  },

  uploadButton: {
    background: "#4f46e5",
    color: "white",
    border: "none",
    padding: "14px 20px",
    borderRadius: "10px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  // ==========================================================
  // DASHBOARD CARDS
  // ==========================================================

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "22px",
  },

  card: {
    background: "white",
    border:
      "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "28px",
    boxShadow:
      "0 7px 22px rgba(15,23,42,0.05)",
  },

  cardIcon: {
    fontSize: "34px",
    marginBottom: "12px",
  },

  cardTitle: {
    color: "#111827",
    margin: "0 0 8px",
    fontSize: "20px",
  },

  cardDescription: {
    color: "#64748b",
    lineHeight: 1.6,
    minHeight: "50px",
  },

  cardButton: {
    marginTop: "15px",
    background: "#f1f5ff",
    color: "#4338ca",
    border:
      "1px solid #c7d2fe",
    padding: "11px 16px",
    borderRadius: "9px",
    fontWeight: 700,
    cursor: "pointer",
  },
};

export default App;