import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = path.join(__dirname, "skillbridge.db");

const db: Database.Database = new Database(dbPath);

db.pragma("foreign_keys = ON");

// Load and execute database schema
const schemaPath = path.join(__dirname, "schema.sql");
const schema = fs.readFileSync(schemaPath, "utf-8");

db.exec(schema);


// ============================================================
// DATABASE MIGRATIONS
// ============================================================

// Add password_hash to existing students table if it does not exist
const studentColumns = db
  .prepare("PRAGMA table_info(students)")
  .all() as { name: string }[];

const hasStudentPassword = studentColumns.some(
  (column) => column.name === "password_hash"
);

if (!hasStudentPassword) {
  db.exec(`
    ALTER TABLE students
    ADD COLUMN password_hash TEXT
  `);

  console.log("Migration: added password_hash to students");
}

console.log("SkillBridge SQLite database connected");
console.log("Database schema initialized");


console.log("SkillBridge SQLite database connected");
console.log("Database schema initialized");

export default db;