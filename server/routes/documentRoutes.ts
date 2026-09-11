import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";

import db from "../database/db";

const router = Router();

// ============================================================
// SECURE DOCUMENT STORAGE
// ============================================================

const documentDir = path.join(
  __dirname,
  "../secure_documents"
);

if (!fs.existsSync(documentDir)) {
  fs.mkdirSync(documentDir, {
    recursive: true,
  });
}

// ============================================================
// VAULT PASSWORD / SESSION SECURITY
// ============================================================

/*
 * Passwords are NEVER stored as plain text.
 * Node's built-in scrypt is used so no extra password package is required.
 */

const PASSWORD_KEY_LENGTH = 64;
const VAULT_SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface VaultSession {
  studentId: number;
  expiresAt: number;
}

const vaultSessions = new Map<string, VaultSession>();

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .scryptSync(
      password,
      salt,
      PASSWORD_KEY_LENGTH
    )
    .toString("hex");

  return `${salt}:${hash}`;
}

function verifyPassword(
  password: string,
  storedValue: string
): boolean {
  const [salt, storedHash] =
    storedValue.split(":");

  if (!salt || !storedHash) {
    return false;
  }

  try {
    const derivedHash =
      crypto
        .scryptSync(
          password,
          salt,
          PASSWORD_KEY_LENGTH
        )
        .toString("hex");

    const a = Buffer.from(
      storedHash,
      "hex"
    );

    const b = Buffer.from(
      derivedHash,
      "hex"
    );

    return (
      a.length === b.length &&
      crypto.timingSafeEqual(a, b)
    );
  } catch {
    return false;
  }
}

function createVaultSession(
  studentId: number
): string {
  const token =
    crypto.randomBytes(32).toString("hex");

  vaultSessions.set(token, {
    studentId,
    expiresAt:
      Date.now() +
      VAULT_SESSION_TTL_MS,
  });

  return token;
}

function getVaultSession(
  token: string | undefined
): VaultSession | null {
  if (!token) {
    return null;
  }

  const session =
    vaultSessions.get(token);

  if (!session) {
    return null;
  }

  if (
    Date.now() >
    session.expiresAt
  ) {
    vaultSessions.delete(token);
    return null;
  }

  return session;
}

/*
 * Every protected vault operation must carry:
 *
 * X-Vault-Token: <token returned by /unlock>
 *
 * This prevents someone from directly opening a document URL
 * without first unlocking the vault.
 */
function requireVaultAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token =
    req.header("X-Vault-Token");

  const session =
    getVaultSession(token);

  if (!session) {
    return res.status(401).json({
      success: false,
      vaultLocked: true,
      message:
        "Vault is locked. Please unlock the vault first.",
    });
  }

  // Make the verified student ID available to the route.
  res.locals.vaultStudentId =
    session.studentId;

  next();
}

// ============================================================
// MULTER STORAGE
// ============================================================

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, documentDir);
  },

  filename: (_req, file, cb) => {
    const extension =
      path.extname(file.originalname)
        .toLowerCase();

    /*
     * Do NOT use the original filename as the
     * actual stored filename.
     */

    const secureFilename =
      `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 12)}${extension}`;

    cb(null, secureFilename);
  },
});

// ============================================================
// ALLOWED FILE TYPES
// ============================================================

const allowedMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const upload = multer({
  storage,

  limits: {
    fileSize:
      5 * 1024 * 1024,
  },

  fileFilter: (_req, file, cb) => {
    if (
      allowedMimeTypes.includes(
        file.mimetype
      )
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only PDF, JPG, PNG, DOC and DOCX files are allowed."
        )
      );
    }
  },
});

// ============================================================
// HELPER
// ============================================================

function getDocumentForStudent(
  documentId: number,
  studentId: number
) {
  return db
    .prepare(
      `
      SELECT
        id,
        student_id,
        document_name,
        document_type,
        original_filename,
        mime_type,
        file_size,
        verification_status,
        access_level,
        uploaded_at,
        updated_at
      FROM documents
      WHERE id = ?
        AND student_id = ?
      `
    )
    .get(
      documentId,
      studentId
    );
}

// ============================================================
// 0. CHECK VAULT STATUS
// ============================================================

router.get(
  "/status/:studentId",
  (
    req: Request,
    res: Response
  ) => {
    try {
      const studentId =
        Number(req.params.studentId);

      if (!studentId) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student ID.",
        });
      }

      const credential =
        db
          .prepare(
            `
            SELECT id
            FROM vault_credentials
            WHERE student_id = ?
            `
          )
          .get(studentId) as
          | { id: number }
          | undefined;

      return res.json({
        success: true,
        passwordConfigured:
          Boolean(credential),
      });
    } catch (error) {
      console.error(
        "VAULT STATUS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to check vault status.",
      });
    }
  }
);

// ============================================================
// 1. SET VAULT PASSWORD
// ============================================================

router.post(
  "/setup-password",
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const studentId =
        Number(req.body.studentId);

      const password =
        String(
          req.body.password || ""
        );

      if (!studentId) {
        return res.status(400).json({
          success: false,
          message:
            "studentId is required.",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message:
            "Vault password must contain at least 6 characters.",
        });
      }

      const student =
        db
          .prepare(
            `
            SELECT id
            FROM students
            WHERE id = ?
            `
          )
          .get(studentId);

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      const existing =
        db
          .prepare(
            `
            SELECT id
            FROM vault_credentials
            WHERE student_id = ?
            `
          )
          .get(studentId) as
          | { id: number }
          | undefined;

      if (existing) {
        return res.status(409).json({
          success: false,
          message:
            "Vault password is already configured. Please unlock the vault instead.",
        });
      }

      const passwordHash =
        hashPassword(password);

      db
        .prepare(
          `
          INSERT INTO vault_credentials
          (
            student_id,
            password_hash
          )
          VALUES (?, ?)
          `
        )
        .run(
          studentId,
          passwordHash
        );

      return res.status(201).json({
        success: true,
        message:
          "Vault password created successfully.",
      });
    } catch (error) {
      console.error(
        "VAULT PASSWORD SETUP ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to create vault password.",
      });
    }
  }
);

// ============================================================
// 2. UNLOCK VAULT
// ============================================================

router.post(
  "/unlock",
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const studentId =
        Number(req.body.studentId);

      const password =
        String(
          req.body.password || ""
        );

      if (!studentId || !password) {
        return res.status(400).json({
          success: false,
          message:
            "Student ID and vault password are required.",
        });
      }

      const credential =
        db
          .prepare(
            `
            SELECT password_hash
            FROM vault_credentials
            WHERE student_id = ?
            `
          )
          .get(studentId) as
          | {
              password_hash: string;
            }
          | undefined;

      if (!credential) {
        return res.status(404).json({
          success: false,
          passwordConfigured: false,
          message:
            "Vault password has not been configured yet.",
        });
      }

      const valid =
        verifyPassword(
          password,
          credential.password_hash
        );

      if (!valid) {
        return res.status(401).json({
          success: false,
          vaultLocked: true,
          message:
            "Incorrect vault password.",
        });
      }

      const token =
        createVaultSession(
          studentId
        );

      return res.json({
        success: true,
        vaultUnlocked: true,
        token,
        expiresInMinutes: 30,
        message:
          "Vault unlocked successfully.",
      });
    } catch (error) {
      console.error(
        "VAULT UNLOCK ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to unlock vault.",
      });
    }
  }
);

// ============================================================
// 3. LOCK VAULT
// ============================================================

router.post(
  "/lock",
  (
    req: Request,
    res: Response
  ) => {
    const token =
      req.header("X-Vault-Token");

    if (token) {
      vaultSessions.delete(token);
    }

    return res.json({
      success: true,
      vaultUnlocked: false,
      message:
        "Vault locked.",
    });
  }
);

// ============================================================
// 4. UPLOAD DOCUMENT
// ============================================================

router.post(
  "/upload",
  requireVaultAccess,
  upload.single("document"),
  async (
    req: Request,
    res: Response
  ) => {
    let uploadedPath:
      | string
      | null = null;

    try {
      /*
       * IMPORTANT:
       * Student identity comes from the unlocked vault session,
       * not from a client-provided studentId.
       */
      const studentId =
        Number(
          res.locals.vaultStudentId
        );

      const student =
        db
          .prepare(
            `
            SELECT id, name
            FROM students
            WHERE id = ?
            `
          )
          .get(studentId);

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "Please select a document.",
        });
      }

      uploadedPath =
        req.file.path;

      const documentName =
        String(
          req.body.documentName ||
            req.file.originalname
        ).trim();

      const documentType =
        String(
          req.body.documentType ||
            "Other"
        ).trim();

      if (!documentName) {
        if (
          uploadedPath &&
          fs.existsSync(uploadedPath)
        ) {
          fs.unlinkSync(
            uploadedPath
          );
        }

        return res.status(400).json({
          success: false,
          message:
            "Document name is required.",
        });
      }

      const result =
        db
          .prepare(
            `
            INSERT INTO documents
            (
              student_id,
              document_name,
              document_type,
              original_filename,
              stored_filename,
              file_path,
              mime_type,
              file_size,
              verification_status,
              access_level
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
          )
          .run(
            studentId,
            documentName,
            documentType,
            req.file.originalname,
            req.file.filename,
            req.file.path,
            req.file.mimetype,
            req.file.size,
            "Pending",
            "Private"
          );

      const savedDocument =
        db
          .prepare(
            `
            SELECT
              id,
              student_id,
              document_name,
              document_type,
              original_filename,
              mime_type,
              file_size,
              verification_status,
              access_level,
              uploaded_at,
              updated_at
            FROM documents
            WHERE id = ?
            `
          )
          .get(
            result.lastInsertRowid
          );

      return res.status(201).json({
        success: true,
        message:
          "Document uploaded securely.",
        document:
          savedDocument,
      });
    } catch (error) {
      console.error(
        "DOCUMENT UPLOAD ERROR:",
        error
      );

      try {
        if (
          uploadedPath &&
          fs.existsSync(uploadedPath)
        ) {
          fs.unlinkSync(
            uploadedPath
          );
        }
      } catch {}

      return res.status(500).json({
        success: false,
        message:
          "Failed to upload document.",
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });
    }
  }
);

// ============================================================
// 5. GET ALL DOCUMENTS FOR STUDENT
// ============================================================

router.get(
  "/student/:studentId",
  requireVaultAccess,
  (
    req: Request,
    res: Response
  ) => {
    try {
      const requestedStudentId =
        Number(
          req.params.studentId
        );

      const sessionStudentId =
        Number(
          res.locals.vaultStudentId
        );

      // Do not allow a student to use another student ID
      // after unlocking their own vault.
      if (
        !requestedStudentId ||
        requestedStudentId !==
          sessionStudentId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to access these documents.",
        });
      }

      const documents =
        db
          .prepare(
            `
            SELECT
              id,
              student_id,
              document_name,
              document_type,
              original_filename,
              mime_type,
              file_size,
              verification_status,
              access_level,
              uploaded_at,
              updated_at
            FROM documents
            WHERE student_id = ?
            ORDER BY uploaded_at DESC
            `
          )
          .all(
            sessionStudentId
          );

      return res.json({
        success: true,
        count:
          documents.length,
        documents,
      });
    } catch (error) {
      console.error(
        "GET DOCUMENTS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load documents.",
      });
    }
  }
);

// ============================================================
// 6. VIEW / DOWNLOAD DOCUMENT
// ============================================================

/*
 * The document is NOT publicly accessible.
 *
 * The request must contain the temporary vault token.
 * The token is created only after the correct vault password
 * is entered.
 */

router.get(
  "/:documentId/view",
  requireVaultAccess,
  (
    req: Request,
    res: Response
  ) => {
    try {
      const documentId =
        Number(
          req.params.documentId
        );

      const studentId =
        Number(
          res.locals.vaultStudentId
        );

      if (!documentId) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid document ID.",
        });
      }

      const document =
        db
          .prepare(
            `
            SELECT *
            FROM documents
            WHERE id = ?
              AND student_id = ?
            `
          )
          .get(
            documentId,
            studentId
          ) as
          | {
              id: number;
              student_id: number;
              document_name: string;
              original_filename: string;
              stored_filename: string;
              file_path: string;
              mime_type: string;
            }
          | undefined;

      if (!document) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to access this document.",
        });
      }

      if (
        !fs.existsSync(
          document.file_path
        )
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Document file not found.",
        });
      }

      res.setHeader(
        "Content-Type",
        document.mime_type
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${document.original_filename.replace(
          /"/g,
          ""
        )}"`
      );

      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private"
      );

      return res.sendFile(
        path.resolve(
          document.file_path
        )
      );
    } catch (error) {
      console.error(
        "VIEW DOCUMENT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to open document.",
      });
    }
  }
);

// ============================================================
// 7. DELETE DOCUMENT
// ============================================================

router.delete(
  "/:documentId",
  requireVaultAccess,
  (
    req: Request,
    res: Response
  ) => {
    try {
      const documentId =
        Number(
          req.params.documentId
        );

      const studentId =
        Number(
          res.locals.vaultStudentId
        );

      if (!documentId) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid document ID.",
        });
      }

      const document =
        getDocumentForStudent(
          documentId,
          studentId
        ) as
        | {
            id: number;
          }
        | undefined;

      if (!document) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to delete this document.",
        });
      }

      const file =
        db
          .prepare(
            `
            SELECT file_path
            FROM documents
            WHERE id = ?
              AND student_id = ?
            `
          )
          .get(
            documentId,
            studentId
          ) as
          | {
              file_path: string;
            }
          | undefined;

      if (
        file &&
        fs.existsSync(file.file_path)
      ) {
        fs.unlinkSync(
          file.file_path
        );
      }

      db
        .prepare(
          `
          DELETE FROM documents
          WHERE id = ?
            AND student_id = ?
          `
        )
        .run(
          documentId,
          studentId
        );

      return res.json({
        success: true,
        message:
          "Document deleted successfully.",
      });
    } catch (error) {
      console.error(
        "DELETE DOCUMENT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete document.",
      });
    }
  }
);

// ============================================================
// MULTER ERROR HANDLER
// ============================================================

router.use(
  (
    error: any,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error(
      "DOCUMENT ROUTE ERROR:",
      error
    );

    if (
      error instanceof
      multer.MulterError
    ) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "File is too large. Maximum size is 5 MB.",
        });
      }

      return res.status(400).json({
        success: false,
        message:
          error.message,
      });
    }

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Invalid document upload.",
    });
  }
);

export default router;
