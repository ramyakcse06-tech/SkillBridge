import {
  useEffect,
  useRef,
  useState,
} from "react";

interface DocumentItem {
  id: number;
  student_id: number;
  document_name: string;
  document_type: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  verification_status: string;
  access_level: string;
  uploaded_at: string;
  updated_at: string;
}

interface DocumentVaultProps {
  studentId: number;
  onBack: () => void;
}

const API =
  "/api/documents";

const documentTypes = [
  "Resume",
  "Academic Record",
  "Certificate",
  "Internship Certificate",
  "Internship Report",
  "Other",
];

export default function DocumentVault({
  studentId,
  onBack,
}: DocumentVaultProps) {
  const [documents, setDocuments] =
    useState<DocumentItem[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [selectedType, setSelectedType] =
    useState("Certificate");

  const [documentName, setDocumentName] =
    useState("");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [vaultUnlocked, setVaultUnlocked] =
    useState(false);

  const [passwordConfigured, setPasswordConfigured] =
    useState<boolean | null>(null);

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [unlocking, setUnlocking] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [isSettingPassword, setIsSettingPassword] =
    useState(false);

  const [vaultToken, setVaultToken] =
    useState("");

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  // ==========================================================
  // CHECK WHETHER PASSWORD EXISTS
  // ==========================================================

  const checkVaultStatus =
    async () => {
      try {
        setError("");

        const response =
          await fetch(
            `${API}/status/${studentId}`
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to check vault status."
          );
        }

        setPasswordConfigured(
          Boolean(
            data.passwordConfigured
          )
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to check vault status."
        );
      }
    };

  useEffect(() => {
    checkVaultStatus();
  }, [studentId]);

  // ==========================================================
  // UNLOCK
  // ==========================================================

  const handleUnlock =
    async () => {
      if (!password) {
        setError(
          "Please enter your vault password."
        );
        return;
      }

      try {
        setUnlocking(true);
        setError("");
        setSuccess("");

        const response =
          await fetch(
            `${API}/unlock`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                studentId,
                password,
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Unable to unlock vault."
          );
        }

        setVaultToken(
          data.token
        );

        setVaultUnlocked(true);
        setPassword("");
        setConfirmPassword("");

        setSuccess(
          "Vault unlocked successfully."
        );
      } catch (err) {
        setVaultUnlocked(false);
        setVaultToken("");

        setError(
          err instanceof Error
            ? err.message
            : "Incorrect vault password."
        );
      } finally {
        setUnlocking(false);
      }
    };

  // ==========================================================
  // SET FIRST PASSWORD
  // ==========================================================

  const handleSetPassword =
    async () => {
      if (password.length < 6) {
        setError(
          "Vault password must contain at least 6 characters."
        );
        return;
      }

      if (
        password !==
        confirmPassword
      ) {
        setError(
          "Passwords do not match."
        );
        return;
      }

      try {
        setUnlocking(true);
        setError("");
        setSuccess("");

        const response =
          await fetch(
            `${API}/setup-password`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                studentId,
                password,
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to create vault password."
          );
        }

        setPasswordConfigured(true);
        setIsSettingPassword(false);

        setPassword("");
        setConfirmPassword("");

        setSuccess(
          "Vault password created. Enter it to unlock your vault."
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to create vault password."
        );
      } finally {
        setUnlocking(false);
      }
    };

  // ==========================================================
  // LOAD DOCUMENTS
  // ==========================================================

  const loadDocuments =
    async () => {
      if (
        !vaultUnlocked ||
        !vaultToken
      ) {
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            `${API}/student/${studentId}`,
            {
              headers: {
                "X-Vault-Token":
                  vaultToken,
              },
            }
          );

        const data =
          await response.json();

        if (
          response.status === 401 ||
          data.vaultLocked
        ) {
          setVaultUnlocked(false);
          setVaultToken("");

          throw new Error(
            "Vault session expired. Please unlock the vault again."
          );
        }

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to load documents."
          );
        }

        setDocuments(
          data.documents || []
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load documents."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    if (vaultUnlocked) {
      loadDocuments();
    }
  }, [
    vaultUnlocked,
    vaultToken,
    studentId,
  ]);

  // ==========================================================
  // SELECT FILE
  // ==========================================================

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    setError("");
    setSuccess("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "File size must be 5 MB or less."
      );

      setSelectedFile(null);
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setError(
        "Only PDF, JPG, PNG, DOC and DOCX files are allowed."
      );

      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);

    if (!documentName.trim()) {
      setDocumentName(
        file.name.replace(
          /\.[^/.]+$/,
          ""
        )
      );
    }
  };

  // ==========================================================
  // UPLOAD
  // ==========================================================

  const handleUpload =
    async () => {
      if (!vaultUnlocked) {
        setError(
          "Please unlock the vault first."
        );
        return;
      }

      if (!selectedFile) {
        setError(
          "Please select a document."
        );
        return;
      }

      if (!documentName.trim()) {
        setError(
          "Please enter a document name."
        );
        return;
      }

      try {
        setUploading(true);
        setError("");
        setSuccess("");

        const formData =
          new FormData();

        formData.append(
          "document",
          selectedFile
        );

        formData.append(
          "documentName",
          documentName.trim()
        );

        formData.append(
          "documentType",
          selectedType
        );

        const response =
          await fetch(
            `${API}/upload`,
            {
              method: "POST",
              headers: {
                "X-Vault-Token":
                  vaultToken,
              },
              body: formData,
            }
          );

        const data =
          await response.json();

        if (
          response.status === 401 ||
          data.vaultLocked
        ) {
          setVaultUnlocked(false);
          setVaultToken("");

          throw new Error(
            "Vault session expired. Please unlock the vault again."
          );
        }

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Document upload failed."
          );
        }

        setSuccess(
          "Document uploaded securely."
        );

        setDocumentName("");
        setSelectedFile(null);

        if (fileInputRef.current) {
          fileInputRef.current.value =
            "";
        }

        await loadDocuments();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Document upload failed."
        );
      } finally {
        setUploading(false);
      }
    };

  // ==========================================================
  // VIEW DOCUMENT
  // ==========================================================

  const handleView = async (
    documentId: number
  ) => {
    if (!vaultUnlocked) {
      setError(
        "Please unlock the vault first."
      );
      return;
    }

    /*
     * The browser cannot add custom headers to window.open().
     * Therefore fetch the protected document using the vault token,
     * create a temporary Blob URL, and open that URL.
     */
    try {
      setError("");
      setSuccess("");

      const response =
        await fetch(
          `${API}/${documentId}/view`,
          {
            headers: {
              "X-Vault-Token":
                vaultToken,
            },
          }
        );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      if (
        response.status === 401
      ) {
        setVaultUnlocked(false);
        setVaultToken("");

        throw new Error(
          "Vault session expired. Please unlock the vault again."
        );
      }

      if (!response.ok) {
        let message =
          "Unable to open document.";

        if (
          contentType.includes(
            "application/json"
          )
        ) {
          const data =
            await response.json();

          message =
            data.message ||
            message;
        }

        throw new Error(
          message
        );
      }

      const blob =
        await response.blob();

      const blobUrl =
        URL.createObjectURL(blob);

      const newWindow =
        window.open(
          blobUrl,
          "_blank",
          "noopener,noreferrer"
        );

      if (!newWindow) {
        URL.revokeObjectURL(
          blobUrl
        );

        throw new Error(
          "Please allow pop-ups to view the document."
        );
      }

      /*
       * Give the new tab time to load before
       * releasing the temporary Blob URL.
       */
      window.setTimeout(() => {
        URL.revokeObjectURL(
          blobUrl
        );
      }, 60_000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to open document."
      );
    }
  };

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete =
    async (
      documentId: number
    ) => {
      if (!vaultUnlocked) {
        setError(
          "Please unlock the vault first."
        );
        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to permanently delete this document?"
        );

      if (!confirmed) {
        return;
      }

      try {
        setError("");
        setSuccess("");

        const response =
          await fetch(
            `${API}/${documentId}`,
            {
              method: "DELETE",
              headers: {
                "X-Vault-Token":
                  vaultToken,
              },
            }
          );

        const data =
          await response.json();

        if (
          response.status === 401 ||
          data.vaultLocked
        ) {
          setVaultUnlocked(false);
          setVaultToken("");

          throw new Error(
            "Vault session expired. Please unlock the vault again."
          );
        }

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to delete document."
          );
        }

        setSuccess(
          "Document deleted successfully."
        );

        await loadDocuments();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to delete document."
        );
      }
    };

  // ==========================================================
  // LOCK
  // ==========================================================

  const lockVault =
    async () => {
      try {
        if (vaultToken) {
          await fetch(
            `${API}/lock`,
            {
              method: "POST",
              headers: {
                "X-Vault-Token":
                  vaultToken,
              },
            }
          );
        }
      } catch {
        // The server-side token will simply expire
        // if the lock request cannot be sent.
      } finally {
        setVaultUnlocked(false);
        setVaultToken("");
        setDocuments([]);
        setPassword("");
        setConfirmPassword("");
      }
    };

  const handleBack =
    async () => {
      await lockVault();
      onBack();
    };

  // ==========================================================
  // FORMAT FILE SIZE
  // ==========================================================

  const formatFileSize =
    (bytes: number) => {
      if (bytes < 1024) {
        return `${bytes} B`;
      }

      if (
        bytes <
        1024 * 1024
      ) {
        return `${(
          bytes / 1024
        ).toFixed(1)} KB`;
      }

      return `${(
        bytes /
        (1024 * 1024)
      ).toFixed(1)} MB`;
    };

  // ==========================================================
  // ICON
  // ==========================================================

  const getIcon =
    (type: string) => {
      switch (type) {
        case "Resume":
          return "📄";

        case "Academic Record":
          return "🎓";

        case "Certificate":
          return "🏆";

        case "Internship Certificate":
          return "💼";

        case "Internship Report":
          return "📋";

        default:
          return "📁";
      }
    };

  // ==========================================================
  // UI - LOCKED
  // ==========================================================

  if (!vaultUnlocked) {
    return (
      <div style={styles.page}>
        <div style={styles.lockPage}>
          <button
            type="button"
            onClick={onBack}
            style={styles.backButton}
          >
            ← Back
          </button>

          <div style={styles.lockCard}>
            <div style={styles.bigLock}>
              🔐
            </div>

            <div style={styles.lockTitle}>
              Secure Document Vault
            </div>

            <div style={styles.lockSubtitle}>
              Your important academic and career
              documents are protected.
            </div>

            {error && (
              <div style={styles.error}>
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div style={styles.success}>
                ✓ {success}
              </div>
            )}

            {passwordConfigured === null ? (
              <div style={styles.loading}>
                Checking vault security...
              </div>
            ) : passwordConfigured ? (
              <>
                <div style={styles.lockBadge}>
                  🔒 Vault Locked
                </div>

                <label style={styles.label}>
                  Vault Password
                </label>

                <div style={styles.passwordRow}>
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key ===
                        "Enter"
                      ) {
                        handleUnlock();
                      }
                    }}
                    placeholder="Enter your vault password"
                    style={
                      styles.passwordInput
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    style={
                      styles.showPasswordButton
                    }
                  >
                    {showPassword
                      ? "Hide"
                      : "Show"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={
                    handleUnlock
                  }
                  disabled={unlocking}
                  style={
                    styles.unlockButton
                  }
                >
                  {unlocking
                    ? "Unlocking..."
                    : "🔓 Unlock Vault"}
                </button>

                <div style={styles.securityNote}>
                  Your password is verified securely.
                  The vault contents are not loaded
                  until authentication succeeds.
                </div>
              </>
            ) : isSettingPassword ? (
              <>
                <div style={styles.lockBadge}>
                  🛡️ Create Vault Password
                </div>

                <label style={styles.label}>
                  New Vault Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  placeholder="Minimum 6 characters"
                  style={
                    styles.passwordInputFull
                  }
                />

                <label style={styles.label}>
                  Confirm Password
                </label>

                <input
                  type="password"
                  value={
                    confirmPassword
                  }
                  onChange={(e) =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  placeholder="Re-enter password"
                  style={
                    styles.passwordInputFull
                  }
                />

                <button
                  type="button"
                  onClick={
                    handleSetPassword
                  }
                  disabled={unlocking}
                  style={
                    styles.unlockButton
                  }
                >
                  {unlocking
                    ? "Creating..."
                    : "🔐 Create Vault Password"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSettingPassword(
                      false
                    );
                    setPassword("");
                    setConfirmPassword("");
                    setError("");
                  }}
                  style={
                    styles.secondaryButton
                  }
                >
                  Back to Unlock
                </button>
              </>
            ) : (
              <>
                <div style={styles.firstTimeBox}>
                  <div style={styles.firstTimeTitle}>
                    First-time setup
                  </div>

                  <div style={styles.firstTimeText}>
                    Your vault does not have a
                    password yet. Create one to
                    protect your documents.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setIsSettingPassword(
                      true
                    )
                  }
                  style={
                    styles.unlockButton
                  }
                >
                  🔐 Set Vault Password
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // UI - UNLOCKED
  // ==========================================================

  return (
    <div style={styles.page}>
      {/* HEADER */}

      <div style={styles.header}>
        <button
          type="button"
          onClick={
            handleBack
          }
          style={styles.backButton}
        >
          ← Back
        </button>

        <div style={{ flex: 1 }}>
          <div style={styles.title}>
            🔐 Secure Document Vault
          </div>

          <div style={styles.subtitle}>
            Store and manage your academic
            and career documents securely
          </div>
        </div>

        <button
          type="button"
          onClick={
            lockVault
          }
          style={styles.lockButton}
        >
          🔒 Lock Vault
        </button>
      </div>

      {/* SECURITY BANNER */}

      <div
        style={styles.securityBanner}
      >
        <div style={styles.lockIcon}>
          🟢
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={styles.securityTitle}
          >
            Vault Unlocked
          </div>

          <div
            style={styles.securityText}
          >
            You have authenticated access to
            your private documents. The vault
            automatically expires after 30 minutes.
          </div>
        </div>

        <div style={styles.privateBadge}>
          🔒 Private
        </div>
      </div>

      {/* MESSAGES */}

      {error && (
        <div style={styles.error}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={styles.success}>
          ✓ {success}
        </div>
      )}

      {/* UPLOAD CARD */}

      <div style={styles.uploadCard}>
        <div style={styles.cardTitle}>
          📤 Upload Document
        </div>

        <div style={styles.cardSubtitle}>
          Keep your important career documents
          in one secure place.
        </div>

        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>
              Document Type
            </label>

            <select
              value={selectedType}
              onChange={(e) =>
                setSelectedType(
                  e.target.value
                )
              }
              style={styles.input}
            >
              {documentTypes.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label style={styles.label}>
              Document Name
            </label>

            <input
              type="text"
              value={documentName}
              onChange={(e) =>
                setDocumentName(
                  e.target.value
                )
              }
              placeholder="e.g. Java Certificate"
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.fileArea}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={
              handleFileChange
            }
            style={styles.fileInput}
          />

          {selectedFile ? (
            <div
              style={
                styles.selectedFile
              }
            >
              📎{" "}
              {selectedFile.name}
              <span>
                {" "}
                (
                {formatFileSize(
                  selectedFile.size
                )}
                )
              </span>
            </div>
          ) : (
            <div
              style={styles.fileHint}
            >
              Choose PDF, JPG, PNG, DOC or
              DOCX · Maximum 5 MB
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={
            handleUpload
          }
          disabled={uploading}
          style={{
            ...styles.uploadButton,
            opacity: uploading
              ? 0.6
              : 1,
          }}
        >
          {uploading
            ? "Uploading..."
            : "🔐 Upload Securely"}
        </button>
      </div>

      {/* DOCUMENTS */}

      <div
        style={styles.documentsCard}
      >
        <div
          style={
            styles.documentsHeader
          }
        >
          <div>
            <div
              style={styles.cardTitle}
            >
              📁 My Documents
            </div>

            <div
              style={styles.cardSubtitle}
            >
              {documents.length} document
              {documents.length !== 1
                ? "s"
                : ""}{" "}
              stored
            </div>
          </div>

          <div
            style={styles.privateBadge}
          >
            🔓 Unlocked
          </div>
        </div>

        {loading && (
          <div style={styles.empty}>
            Loading your secure documents...
          </div>
        )}

        {!loading &&
          documents.length === 0 && (
            <div style={styles.empty}>
              <div
                style={
                  styles.emptyIcon
                }
              >
                📂
              </div>

              <div
                style={
                  styles.emptyTitle
                }
              >
                Your vault is empty
              </div>

              <div
                style={styles.emptyText}
              >
                Upload your resume,
                certificates and academic
                documents above.
              </div>
            </div>
          )}

        {!loading &&
          documents.length > 0 && (
            <div>
              {documents.map(
                (document) => (
                  <div
                    key={document.id}
                    style={
                      styles.documentRow
                    }
                  >
                    <div
                      style={
                        styles.documentIcon
                      }
                    >
                      {getIcon(
                        document.document_type
                      )}
                    </div>

                    <div
                      style={
                        styles.documentInfo
                      }
                    >
                      <div
                        style={
                          styles.documentName
                        }
                      >
                        {
                          document.document_name
                        }
                      </div>

                      <div
                        style={
                          styles.documentMeta
                        }
                      >
                        {
                          document.document_type
                        }
                        {" · "}
                        {formatFileSize(
                          document.file_size
                        )}
                        {" · "}
                        {
                          document.original_filename
                        }
                      </div>
                    </div>

                    <div
                      style={
                        styles.statusBadge
                      }
                    >
                      {document.verification_status ===
                      "Verified"
                        ? "✓ Verified"
                        : "⏳ Pending"}
                    </div>

                    <div
                      style={
                        styles.actions
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleView(
                            document.id
                          )
                        }
                        style={
                          styles.viewButton
                        }
                      >
                        👁 View
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            document.id
                          )
                        }
                        style={
                          styles.deleteButton
                        }
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
      </div>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f5f7ff 0%, #eef2ff 100%)",
    padding: "32px",
    fontFamily:
      "Inter, Arial, sans-serif",
    color: "#172033",
  },

  lockPage: {
    minHeight: "calc(100vh - 64px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  lockCard: {
    width: "min(460px, 100%)",
    background: "#ffffff",
    borderRadius: "24px",
    padding: "40px",
    marginTop: "55px",
    boxShadow:
      "0 18px 55px rgba(31,41,55,0.12)",
    textAlign: "center",
    boxSizing: "border-box",
  },

  bigLock: {
    fontSize: "58px",
    marginBottom: "15px",
  },

  lockTitle: {
    fontSize: "28px",
    fontWeight: 800,
    marginBottom: "8px",
  },

  lockSubtitle: {
    color: "#667085",
    fontSize: "14px",
    lineHeight: 1.55,
    marginBottom: "25px",
  },

  lockBadge: {
    display: "inline-block",
    background: "#fff7df",
    color: "#9a6700",
    borderRadius: "20px",
    padding: "8px 14px",
    fontSize: "12px",
    fontWeight: 750,
    marginBottom: "24px",
  },

  passwordRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
  },

  passwordInput: {
    flex: 1,
    minWidth: 0,
    boxSizing: "border-box",
    border:
      "1px solid #d7dce5",
    borderRadius: "10px",
    padding: "13px",
    fontSize: "14px",
    outline: "none",
  },

  passwordInputFull: {
    width: "100%",
    boxSizing: "border-box",
    border:
      "1px solid #d7dce5",
    borderRadius: "10px",
    padding: "13px",
    fontSize: "14px",
    marginBottom: "15px",
  },

  showPasswordButton: {
    border:
      "1px solid #d9def0",
    background: "#f7f8ff",
    color: "#4338ca",
    borderRadius: "10px",
    padding: "0 13px",
    cursor: "pointer",
    fontWeight: 650,
  },

  unlockButton: {
    width: "100%",
    border: "none",
    background:
      "linear-gradient(135deg, #4f46e5, #7c3aed)",
    color: "#fff",
    padding: "14px 20px",
    borderRadius: "11px",
    fontWeight: 750,
    cursor: "pointer",
    fontSize: "14px",
  },

  secondaryButton: {
    width: "100%",
    border:
      "1px solid #d9def0",
    background: "#ffffff",
    color: "#4338ca",
    padding: "13px 20px",
    borderRadius: "11px",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "10px",
  },

  securityNote: {
    color: "#667085",
    fontSize: "12px",
    lineHeight: 1.5,
    marginTop: "18px",
  },

  firstTimeBox: {
    background: "#f5f7ff",
    border:
      "1px solid #dfe3ff",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "18px",
    textAlign: "left",
  },

  firstTimeTitle: {
    fontWeight: 750,
    marginBottom: "5px",
  },

  firstTimeText: {
    color: "#667085",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  loading: {
    color: "#667085",
    padding: "20px",
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    marginBottom: "28px",
  },

  backButton: {
    border: "none",
    background: "#ffffff",
    padding: "11px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
    boxShadow:
      "0 3px 12px rgba(0,0,0,0.07)",
  },

  title: {
    fontSize: "28px",
    fontWeight: 800,
  },

  subtitle: {
    marginTop: "5px",
    color: "#667085",
    fontSize: "14px",
  },

  lockButton: {
    border:
      "1px solid #ddd6fe",
    background: "#ffffff",
    color: "#5b21b6",
    padding: "10px 15px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },

  securityBanner: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    background: "#eefbf3",
    border:
      "1px solid #ccebd8",
    borderRadius: "16px",
    padding: "18px 22px",
    marginBottom: "24px",
  },

  lockIcon: {
    fontSize: "28px",
  },

  securityTitle: {
    fontWeight: 750,
    color: "#146c43",
    marginBottom: "4px",
  },

  securityText: {
    color: "#47705a",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  error: {
    background: "#fff0f0",
    border:
      "1px solid #ffcaca",
    color: "#b42318",
    padding: "13px 16px",
    borderRadius: "10px",
    marginBottom: "18px",
    textAlign: "left",
  },

  success: {
    background: "#edfff3",
    border:
      "1px solid #b9ebcb",
    color: "#137333",
    padding: "13px 16px",
    borderRadius: "10px",
    marginBottom: "18px",
    textAlign: "left",
  },

  uploadCard: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "26px",
    marginBottom: "26px",
    boxShadow:
      "0 8px 30px rgba(31,41,55,0.07)",
  },

  cardTitle: {
    fontSize: "19px",
    fontWeight: 750,
  },

  cardSubtitle: {
    color: "#667085",
    fontSize: "13px",
    marginTop: "5px",
    marginBottom: "20px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "18px",
    marginBottom: "18px",
  },

  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 650,
    marginBottom: "7px",
    textAlign: "left",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border:
      "1px solid #d7dce5",
    borderRadius: "10px",
    padding: "12px",
    fontSize: "14px",
    background: "#fff",
  },

  fileArea: {
    border:
      "2px dashed #cbd5e1",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "18px",
    background: "#fafbff",
  },

  fileInput: {
    width: "100%",
  },

  selectedFile: {
    marginTop: "10px",
    fontSize: "14px",
    fontWeight: 600,
  },

  fileHint: {
    marginTop: "10px",
    color: "#667085",
    fontSize: "12px",
  },

  uploadButton: {
    border: "none",
    background:
      "linear-gradient(135deg, #4f46e5, #7c3aed)",
    color: "#fff",
    padding: "13px 22px",
    borderRadius: "11px",
    fontWeight: 700,
    cursor: "pointer",
  },

  documentsCard: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "26px",
    boxShadow:
      "0 8px 30px rgba(31,41,55,0.07)",
  },

  documentsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
  },

  privateBadge: {
    background: "#f0f1ff",
    color: "#4338ca",
    borderRadius: "20px",
    padding: "7px 12px",
    fontSize: "12px",
    fontWeight: 700,
  },

  documentRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "17px 4px",
    borderTop:
      "1px solid #edf0f5",
  },

  documentIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "#f3f4ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
    flexShrink: 0,
  },

  documentInfo: {
    flex: 1,
    minWidth: 0,
  },

  documentName: {
    fontWeight: 700,
    marginBottom: "5px",
  },

  documentMeta: {
    color: "#7b8494",
    fontSize: "12px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  statusBadge: {
    fontSize: "12px",
    fontWeight: 650,
    background: "#fff7df",
    color: "#9a6700",
    padding: "6px 10px",
    borderRadius: "20px",
    whiteSpace: "nowrap",
  },

  actions: {
    display: "flex",
    gap: "8px",
  },

  viewButton: {
    border:
      "1px solid #d9def0",
    background: "#f7f8ff",
    color: "#4338ca",
    padding: "8px 11px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 650,
  },

  deleteButton: {
    border:
      "1px solid #ffd4d4",
    background: "#fff5f5",
    color: "#c62828",
    padding: "8px 11px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  empty: {
    textAlign: "center",
    padding: "55px 20px",
    color: "#667085",
  },

  emptyIcon: {
    fontSize: "42px",
    marginBottom: "10px",
  },

  emptyTitle: {
    fontWeight: 750,
    color: "#344054",
    marginBottom: "6px",
  },

  emptyText: {
    fontSize: "13px",
  },
};
