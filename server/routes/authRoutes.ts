import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../database/db";

const router = Router();

const JWT_SECRET =
  process.env.JWT_SECRET || "skillbridge-demo-secret-change-later";

// ============================================================
// STUDENT REGISTER
// POST /api/auth/student/register
// ============================================================

router.post("/student/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      education,
      college,
      graduation_year,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters",
      });
    }

    const existingStudent = db
      .prepare("SELECT id FROM students WHERE email = ?")
      .get(email);

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: "Student with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = db
      .prepare(`
        INSERT INTO students
        (
          name,
          email,
          phone,
          education,
          college,
          graduation_year,
          password_hash
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        name,
        email,
        phone || null,
        education || null,
        college || null,
        graduation_year || null,
        passwordHash
      );

    const studentId = Number(result.lastInsertRowid);

    const token = jwt.sign(
      {
        id: studentId,
        role: "student",
        email,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "Student registered successfully",
      token,
      user: {
        id: studentId,
        name,
        email,
        role: "student",
      },
    });
  } catch (error) {
    console.error("STUDENT REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to register student",
    });
  }
});

// ============================================================
// STUDENT LOGIN
// POST /api/auth/student/login
// ============================================================

router.post("/student/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const student = db
      .prepare(`
        SELECT
          id,
          name,
          email,
          password_hash
        FROM students
        WHERE email = ?
      `)
      .get(email) as any;

    if (!student) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!student.password_hash) {
      return res.status(401).json({
        success: false,
        message:
          "This student account was created before authentication was enabled. Please register again with this email.",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      student.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: student.id,
        role: "student",
        email: student.email,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Student login successful",
      token,
      user: {
        id: student.id,
        name: student.name,
        email: student.email,
        role: "student",
      },
    });
  } catch (error) {
    console.error("STUDENT LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login",
    });
  }
});

// ============================================================
// INDUSTRY REGISTER
// POST /api/auth/industry/register
// ============================================================

router.post("/industry/register", async (req, res) => {
  try {
    const {
      company_name,
      email,
      password,
      phone,
      website,
    } = req.body;

    if (!company_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Company name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters",
      });
    }

    const existingIndustry = db
      .prepare("SELECT id FROM industries WHERE email = ?")
      .get(email);

    if (existingIndustry) {
      return res.status(409).json({
        success: false,
        message: "Industry account with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = db
      .prepare(`
        INSERT INTO industries
        (
          company_name,
          email,
          phone,
          website,
          password_hash
        )
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        company_name,
        email,
        phone || null,
        website || null,
        passwordHash
      );

    const industryId = Number(result.lastInsertRowid);

    const token = jwt.sign(
      {
        id: industryId,
        role: "industry",
        email,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "Industry account registered successfully",
      token,
      user: {
        id: industryId,
        company_name,
        email,
        role: "industry",
      },
    });
  } catch (error) {
    console.error("INDUSTRY REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to register industry account",
    });
  }
});

// ============================================================
// INDUSTRY LOGIN
// POST /api/auth/industry/login
// ============================================================

router.post("/industry/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const industry = db
      .prepare(`
        SELECT
          id,
          company_name,
          email,
          password_hash
        FROM industries
        WHERE email = ?
      `)
      .get(email) as any;

    if (!industry) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      industry.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: industry.id,
        role: "industry",
        email: industry.email,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      message: "Industry login successful",
      token,
      user: {
        id: industry.id,
        company_name: industry.company_name,
        email: industry.email,
        role: "industry",
      },
    });
  } catch (error) {
    console.error("INDUSTRY LOGIN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login",
    });
  }
});

export default router;