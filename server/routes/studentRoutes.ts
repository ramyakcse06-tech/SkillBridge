import { Router } from "express";
import db from "../database/db";

const router = Router();

// Create student
router.post("/", (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      education,
      college,
      graduation_year,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    const result = db
      .prepare(`
        INSERT INTO students
        (name, email, phone, education, college, graduation_year)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        name,
        email,
        phone || null,
        education || null,
        college || null,
        graduation_year || null
      );

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      student_id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to create student",
    });
  }
});

// Get all students
router.get("/", (_req, res) => {
  try {
    const students = db
      .prepare("SELECT * FROM students ORDER BY id DESC")
      .all();

    res.json({
      success: true,
      students,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch students",
    });
  }
});

export default router;