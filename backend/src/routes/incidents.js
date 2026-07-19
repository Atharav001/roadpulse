const express = require('express');

/**
 * Creates incidents routes
 * @param {Pool} pool - Database connection pool
 * @returns {Router} Express router with incidents endpoints
 */
function createIncidentsRouter(pool) {
  const router = express.Router();

  /**
   * GET /incidents
   * List all incidents with optional filtering
   * Query params: status, ward_id, department
   */
  router.get('/', async (req, res) => {
    try {
      const { status, ward_id, department, limit = 50, offset = 0 } = req.query;

      // Build dynamic query with filters
      let query = `
        SELECT
          i.id,
          i.issue_type,
          i.severity,
          i.status,
          i.landmark_description,
          i.ward_id,
          i.department,
          i.report_count,
          i.first_reported_at,
          i.created_at,
          i.updated_at,
          COUNT(DISTINCT ir.report_id) AS linked_reports_count
        FROM incidents i
        LEFT JOIN incident_reports ir ON i.id = ir.incident_id
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      // Apply filters
      if (status) {
        query += ` AND i.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (ward_id) {
        query += ` AND i.ward_id = $${paramIndex}`;
        params.push(ward_id);
        paramIndex++;
      }

      if (department) {
        query += ` AND i.department = $${paramIndex}`;
        params.push(department);
        paramIndex++;
      }

      query += `
        GROUP BY i.id
        ORDER BY i.updated_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(parseInt(limit, 10) || 50);
      params.push(parseInt(offset, 10) || 0);

      const result = await pool.query(query, params);

      return res.status(200).json({
        incidents: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      console.error('Error fetching incidents:', error.message);
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * GET /incidents/:id
   * Fetch incident details including all linked reports and draft email
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Fetch incident details
      const incidentQuery = `
        SELECT
          i.id,
          i.issue_type,
          i.severity,
          i.status,
          i.landmark_description,
          i.ward_id,
          i.department,
          i.report_count,
          i.first_reported_at,
          i.created_at,
          i.updated_at
        FROM incidents
        WHERE id = $1
      `;

      const incidentResult = await pool.query(incidentQuery, [id]);

      if (incidentResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Incident not found'
        });
      }

      const incident = incidentResult.rows[0];

      // Fetch linked reports
      const reportsQuery = `
        SELECT
          r.id,
          r.user_id,
          r.photos,
          r.latitude,
          r.longitude,
          r.text,
          r.issue_type,
          r.severity,
          r.landmark_description,
          r.created_at
        FROM reports r
        JOIN incident_reports ir ON r.id = ir.report_id
        WHERE ir.incident_id = $1
        ORDER BY r.created_at DESC
      `;

      const reportsResult = await pool.query(reportsQuery, [id]);
      incident.linked_reports = reportsResult.rows;

      // Generate draft email based on incident data
      try {
        const { draftEmail } = require('../agents/emailDraft');
        const emailDraft = await draftEmail(
          {
            issue_type: incident.issue_type,
            severity: incident.severity,
            landmark_description: incident.landmark_description,
            department: incident.department
          },
          'system@roadpulse.local'
        );
        incident.draft_email = emailDraft;
      } catch (error) {
        console.error('Failed to generate email draft:', error.message);
        incident.draft_email = {
          subject: `Road Issue Report: ${incident.issue_type}`,
          body: 'Thank you for your report. Our team will review and take action.'
        };
      }

      return res.status(200).json(incident);
    } catch (error) {
      console.error('Error fetching incident:', error.message);
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  return router;
}

module.exports = createIncidentsRouter;
