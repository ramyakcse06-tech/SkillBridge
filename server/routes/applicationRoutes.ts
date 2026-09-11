import { Router } from "express";
import db from "../db";

const router = Router();

/*
 GET applications for an opportunity
*/
router.get("/opportunity/:opportunityId", (req, res) => {
  try {
    const opportunityId = Number(req.params.opportunityId);

    const applications = db.prepare(`
      SELECT
        a.id AS application_id,
        a.student_id,
        a.opportunity_id,
        a.status,
        a.applied_at,

        s.name AS student_name,
        s.email AS student_email,

        o.title AS opportunity_title

      FROM applications a
      JOIN students s
        ON s.id = a.student_id
      JOIN opportunities o
        ON o.id = a.opportunity_id

      WHERE a.opportunity_id = ?

      ORDER BY a.applied_at DESC
    `).all(opportunityId);

    res.json({
      success: true,
      applications
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to load applications"
    });
  }
});


/*
 UPDATE application status
*/
router.patch("/:applicationId/status", (req, res) => {
  try {
    const applicationId = Number(req.params.applicationId);
    const { status } = req.body;

    const allowedStatuses = [
      "Applied",
      "Under Review",
      "Shortlisted",
      "Assessment",
      "Interview",
      "Selected",
      "Rejected"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application status"
      });
    }

    const result = db.prepare(`
      UPDATE applications
      SET status = ?
      WHERE id = ?
    `).run(status, applicationId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    res.json({
      success: true,
      message: "Application status updated",
      status
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to update application"
    });
  }
});

export default router;