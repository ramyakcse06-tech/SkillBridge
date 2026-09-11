CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    education TEXT,
    college TEXT,
    graduation_year INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    esco_skill_id TEXT UNIQUE,
    skill_name TEXT NOT NULL UNIQUE,
    skill_type TEXT,
    description TEXT
);


CREATE TABLE IF NOT EXISTS student_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    skill_id INTEGER NOT NULL,
    proficiency_level TEXT,
    source TEXT,
    confidence_score REAL,

    FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE,

    FOREIGN KEY (skill_id)
        REFERENCES skills(id)
        ON DELETE CASCADE,

    UNIQUE(student_id, skill_id)
);


-- ============================================================
-- SECURE DOCUMENT VAULT
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    student_id INTEGER NOT NULL,

    document_name TEXT NOT NULL,

    document_type TEXT NOT NULL,

    original_filename TEXT NOT NULL,

    stored_filename TEXT NOT NULL,

    file_path TEXT NOT NULL,

    mime_type TEXT NOT NULL,

    file_size INTEGER NOT NULL,

    verification_status TEXT DEFAULT 'Pending',

    access_level TEXT DEFAULT 'Private',

    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE
);

-- ============================================================
-- SECURE DOCUMENT VAULT PASSWORD
-- Run this once in the SkillBridge SQLite database.
-- ============================================================

CREATE TABLE IF NOT EXISTS vault_credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS industry_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    application_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    recruiter_id INTEGER,

    technical_score REAL,
    communication_score REAL,
    problem_solving_score REAL,

    strengths TEXT,
    improvement_areas TEXT,
    feedback TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (application_id)
        REFERENCES applications(id)
        ON DELETE CASCADE,

    FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE
);