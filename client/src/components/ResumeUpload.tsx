import { useState } from "react";

interface ResumeUploadProps {
  studentId: number;
  onBack: () => void;
  onSuccess: () => void;
}

interface ExtractedSkill {
  skill_id?: string;
  preferred_label?: string;
  skill_type?: string | null;
  description?: string | null;
}

interface CategorizedSkills {
  technical: ExtractedSkill[];
  soft: ExtractedSkill[];
  languages: ExtractedSkill[];
}

interface UploadResult {
  success: boolean;
  student_name?: string;
  skill_count?: number;
  skills?: CategorizedSkills;
  skillCounts?: {
    technical: number;
    soft: number;
    languages: number;
    total: number;
  };
  message?: string;
  isResume?: boolean;
}

export default function ResumeUpload({
  studentId,
  onBack,
  onSuccess,
}: ResumeUploadProps) {
  const [file, setFile] =
    useState<File | null>(null);

  const [uploading, setUploading] =
    useState(false);

  const [result, setResult] =
    useState<UploadResult | null>(null);

  const [error, setError] =
    useState("");

  // --------------------------------------------------
  // FILE VALIDATION
  // --------------------------------------------------

  const validateFile = (
    selectedFile: File
  ): boolean => {
    const fileName =
      selectedFile.name.toLowerCase();

    // Only PDF
    if (!fileName.endsWith(".pdf")) {
      setError(
        "❌ Only PDF resume files are allowed."
      );

      return false;
    }

    // MIME type validation
    if (
      selectedFile.type &&
      selectedFile.type !== "application/pdf"
    ) {
      setError(
        "❌ Invalid file type. Please upload a PDF resume."
      );

      return false;
    }

    // Maximum 5 MB
    const maxSize =
      5 * 1024 * 1024;

    if (selectedFile.size > maxSize) {
      setError(
        "❌ File size must be less than 5 MB."
      );

      return false;
    }

    // Empty file
    if (selectedFile.size === 0) {
      setError(
        "❌ The selected file is empty."
      );

      return false;
    }

    return true;
  };

  // --------------------------------------------------
  // FILE SELECT
  // --------------------------------------------------

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selected =
      e.target.files?.[0] || null;

    setResult(null);
    setError("");

    if (!selected) {
      setFile(null);
      return;
    }

    if (!validateFile(selected)) {
      e.target.value = "";
      setFile(null);
      return;
    }

    setFile(selected);
  };

  // --------------------------------------------------
  // UPLOAD
  // --------------------------------------------------

  const handleUpload = async () => {
    if (!file) {
      setError(
        "Please select your PDF resume."
      );

      return;
    }

    if (!validateFile(file)) {
      return;
    }

    setUploading(true);
    setError("");
    setResult(null);

    try {
      const formData =
        new FormData();

      formData.append(
        "resume",
        file
      );

      formData.append(
        "studentId",
        String(studentId)
      );

      const response =
        await fetch(
          "/api/resume/upload",
          {
            method: "POST",
            body: formData,
          }
        );

      let data: UploadResult;

      try {
        data =
          await response.json();
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      /*
       * IMPORTANT:
       *
       * The backend should return:
       *
       * isResume: false
       *
       * when the uploaded PDF is not actually
       * a resume.
       */

      if (
        data.isResume === false
      ) {
        setError(
          data.message ||
            "This document does not appear to be a resume. Please upload a valid resume containing information such as education, skills, projects, experience, or certifications."
        );

        setResult(null);

        return;
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Resume upload failed."
        );
      }

      /*
       * Only show success if the backend
       * confirmed that the document is a resume.
       */

      setResult(data);
    } catch (err) {
      console.error(
        "Resume upload error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while processing the resume."
      );

      setResult(null);
    } finally {
      setUploading(false);
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div style={styles.page}>

      {/* HEADER */}

      <header style={styles.header}>

        <button
          type="button"
          onClick={onBack}
          style={styles.back}
        >
          ← Student Dashboard
        </button>

        <strong>
          SkillBridge
        </strong>

      </header>

      {/* MAIN */}

      <main style={styles.container}>

        <div style={styles.card}>

          <div style={styles.icon}>
            📄
          </div>

          <h1>
            Upload Your Resume
          </h1>

          <p style={styles.subtitle}>
            Your resume is the starting
            point of your SkillBridge
            placement journey.
          </p>

          {/* FLOW */}

          <div style={styles.flow}>

            <span>
              Resume
            </span>

            <b>→</b>

            <span>
              Resume Validation
            </span>

            <b>→</b>

            <span>
              Skill Extraction
            </span>

            <b>→</b>

            <span>
              ESCO Mapping
            </span>

            <b>→</b>

            <span>
              Skill Gap
            </span>

          </div>

          {/* UPLOAD */}

          <label
            style={styles.dropZone}
          >

            <input
              type="file"
              accept=".pdf,application/pdf"
              style={{
                display: "none",
              }}
              onChange={
                handleFileChange
              }
            />

            <div
              style={{
                fontSize: "42px",
              }}
            >
              ☁️
            </div>

            {file ? (
              <>
                <strong>
                  {file.name}
                </strong>

                <p>
                  {(
                    file.size /
                    1024 /
                    1024
                  ).toFixed(2)}{" "}
                  MB
                </p>

                <span
                  style={
                    styles.validFile
                  }
                >
                  ✓ PDF format accepted
                </span>
              </>
            ) : (
              <>
                <strong>
                  Choose your resume PDF
                </strong>

                <p>
                  Only PDF files · Maximum
                  size: 5 MB
                </p>
              </>
            )}

          </label>

          {/* VALIDATION INFORMATION */}

          <div
            style={
              styles.validationInfo
            }
          >

            <strong>
              📋 Resume requirements
            </strong>

            <p>
              Upload a genuine resume
              containing information such
              as education, skills, projects,
              experience, internships or
              certifications.
            </p>

            <small>
              Class notes, textbooks,
              assignments, question papers
              and other non-resume documents
              will be rejected.
            </small>

          </div>

          {/* ERROR */}

          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          {/* UPLOAD BUTTON */}

          <button
            type="button"
            style={{
              ...styles.uploadButton,
              opacity:
                uploading || !file
                  ? 0.6
                  : 1,
              cursor:
                uploading || !file
                  ? "not-allowed"
                  : "pointer",
            }}
            disabled={
              uploading || !file
            }
            onClick={
              handleUpload
            }
          >

            {uploading
              ? "⏳ Validating & Processing..."
              : "🚀 Upload & Analyze Resume"}

          </button>

          {/* SUCCESS */}

          {result &&
            result.success && (
              <div
                style={
                  styles.success
                }
              >

                <h2>
                  ✅ Resume Processed
                  Successfully
                </h2>

                <p>
                  Welcome,{" "}
                  <strong>
                    {result.student_name}
                  </strong>
                  !
                </p>

                <div
                  style={styles.stat}
                >

                  <strong>
                    {result.skill_count ||
                      0}
                  </strong>

                  <span>
                    Skills Extracted
                  </span>

                </div>

                {result.skills && (
                  <div style={styles.categoryContainer}>

                    <div style={styles.categoryCard}>
                      <h3 style={styles.technicalTitle}>
                        💻 Technical Skills
                      </h3>

                      {result.skills.technical.length > 0 ? (
                        <div style={styles.skills}>
                          {result.skills.technical.map(
                            (skill, index) => (
                              <span
                                key={
                                  skill.skill_id ||
                                  `technical-${index}`
                                }
                                style={{
                                  ...styles.skill,
                                  ...styles.technicalSkill,
                                }}
                              >
                                {skill.preferred_label}
                              </span>
                            )
                          )}
                        </div>
                      ) : (
                        <p style={styles.emptySkills}>
                          No technical skills detected.
                        </p>
                      )}
                    </div>

                    <div style={styles.categoryCard}>
                      <h3 style={styles.softTitle}>
                        🤝 Soft Skills
                      </h3>

                      {result.skills.soft.length > 0 ? (
                        <div style={styles.skills}>
                          {result.skills.soft.map(
                            (skill, index) => (
                              <span
                                key={
                                  skill.skill_id ||
                                  `soft-${index}`
                                }
                                style={{
                                  ...styles.skill,
                                  ...styles.softSkill,
                                }}
                              >
                                {skill.preferred_label}
                              </span>
                            )
                          )}
                        </div>
                      ) : (
                        <p style={styles.emptySkills}>
                          No soft skills detected.
                        </p>
                      )}
                    </div>

                    <div style={styles.categoryCard}>
                      <h3 style={styles.languageTitle}>
                        🌐 Languages
                      </h3>

                      {result.skills.languages.length > 0 ? (
                        <div style={styles.skills}>
                          {result.skills.languages.map(
                            (skill, index) => (
                              <span
                                key={
                                  skill.skill_id ||
                                  `language-${index}`
                                }
                                style={{
                                  ...styles.skill,
                                  ...styles.languageSkill,
                                }}
                              >
                                {skill.preferred_label}
                              </span>
                            )
                          )}
                        </div>
                      ) : (
                        <p style={styles.emptySkills}>
                          No languages detected.
                        </p>
                      )}
                    </div>

                    {result.skillCounts && (
                      <div style={styles.categoryCounts}>
                        <span>
                          Technical: {result.skillCounts.technical}
                        </span>
                        <span>
                          Soft: {result.skillCounts.soft}
                        </span>
                        <span>
                          Languages: {result.skillCounts.languages}
                        </span>
                      </div>
                    )}

                  </div>
                )}

                <button
                  type="button"
                  style={
                    styles.continueButton
                  }
                  onClick={() => {
                    console.log(
                      "CONTINUE BUTTON CLICKED"
                    );

                    onSuccess();
                  }}
                >
                  Continue to Dashboard →
                </button>

              </div>
            )}

        </div>

      </main>

    </div>
  );
}

// ======================================================
// STYLES
// ======================================================

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
    height: "70px",
    background: "white",
    borderBottom:
      "1px solid #e5e7eb",
    padding: "0 35px",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  back: {
    border: "none",
    background:
      "transparent",
    color: "#4f46e5",
    fontWeight: 700,
    cursor: "pointer",
  },

  container: {
    maxWidth: "850px",
    margin: "0 auto",
    padding: "50px 25px",
  },

  card: {
    background: "white",
    borderRadius: "24px",
    padding: "45px",
    boxShadow:
      "0 10px 35px rgba(15,23,42,0.08)",
    textAlign: "center",
  },

  icon: {
    fontSize: "50px",
  },

  subtitle: {
    color: "#64748b",
    lineHeight: "1.6",
  },

  flow: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    flexWrap: "wrap",
    margin: "30px 0",
    color: "#4f46e5",
    fontSize: "12px",
    fontWeight: 700,
  },

  dropZone: {
    display: "block",
    border:
      "2px dashed #c7d2fe",
    borderRadius: "18px",
    padding: "45px",
    cursor: "pointer",
    background: "#f8faff",
  },

  validFile: {
    display: "inline-block",
    marginTop: "8px",
    color: "#15803d",
    fontSize: "12px",
    fontWeight: 700,
  },

  validationInfo: {
    marginTop: "20px",
    padding: "16px",
    background: "#f8fafc",
    border:
      "1px solid #e2e8f0",
    borderRadius: "12px",
    textAlign: "left",
    color: "#334155",
  },

  error: {
    marginTop: "20px",
    padding: "14px",
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: "10px",
    textAlign: "left",
    fontWeight: 600,
    lineHeight: "1.5",
  },

  uploadButton: {
    width: "100%",
    marginTop: "25px",
    padding: "16px",
    border: "none",
    borderRadius: "12px",
    background: "#4f46e5",
    color: "white",
    fontWeight: 800,
  },

  success: {
    marginTop: "30px",
    padding: "25px",
    background: "#f0fdf4",
    border:
      "1px solid #bbf7d0",
    borderRadius: "16px",
  },

  stat: {
    display: "flex",
    flexDirection: "column",
    margin: "20px auto",
    fontSize: "16px",
  },

  skills: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "center",
  },

  skill: {
    background: "white",
    border:
      "1px solid #dbeafe",
    padding: "7px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: 600,
  },

  categoryContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginTop: "20px",
    textAlign: "left",
  },

  categoryCard: {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "18px",
  },

  technicalTitle: {
    margin: "0 0 12px 0",
    color: "#0369a1",
    fontSize: "17px",
  },

  softTitle: {
    margin: "0 0 12px 0",
    color: "#7e22ce",
    fontSize: "17px",
  },

  languageTitle: {
    margin: "0 0 12px 0",
    color: "#15803d",
    fontSize: "17px",
  },

  technicalSkill: {
    background: "#e0f2fe",
    border: "1px solid #bae6fd",
    color: "#0369a1",
  },

  softSkill: {
    background: "#f3e8ff",
    border: "1px solid #e9d5ff",
    color: "#7e22ce",
  },

  languageSkill: {
    background: "#dcfce7",
    border: "1px solid #bbf7d0",
    color: "#15803d",
  },

  emptySkills: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "13px",
  },

  categoryCounts: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "12px",
    padding: "12px",
    background: "#f8fafc",
    borderRadius: "10px",
    color: "#475569",
    fontSize: "13px",
    fontWeight: 700,
  },

  continueButton: {
    marginTop: "25px",
    padding: "13px 20px",
    border: "none",
    borderRadius: "10px",
    background: "#16a34a",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },
};