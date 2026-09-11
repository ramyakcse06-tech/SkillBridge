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

console.log("SkillBridge SQLite database connected");
console.log("Database schema initialized");

export default db;