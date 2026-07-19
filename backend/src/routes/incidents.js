const express = require('express');

function createIncidentsRouter(pool) {
  const router = express.Router();

  function addEscalationFlag(incident) {
    if (!incident || incident.status === 'resolved') return incident;
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const firstReported = new Date(incident.first_reported_at);
    incident.is_escalated = firstReported < sixtyDaysAgo;
    incident.days_pending = Math.floor((Date.now() - firstReported.getTime()) / (1000 * 60 * 60 * 24));
    return incident;
  }

  router.get('/', async (req, res) => {
    try {
      const { status, ward_id, department, limit = 50, offset = 0 } = req.query;

      let query = `
        SELECT i.id, i.issue_type, i.severity, i.status,
               i.landmark_description, i.ward_id, i.department,
               i.report_count, i.first_reported_at, i.created_at, i.updated_at,
               i.draft_email_subject, i.draft_email_body,
               COUNT(DISTINCT ir.report_id) AS linked_reports_count
        FROM incidents i
        LEFT JOIN incident_reports ir ON i.id = ir.incident_id
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      if (status) {
        query += ' AND i.status = $' + paramIndex;
        params.push(status);
        paramIndex++;
      }
      if (ward_id) {
        query += ' AND i.ward_id = $' + paramIndex;
        params.push(ward_id);
        paramIndex++;
      }
      if (department) {
        query += ' AND i.department = $' + paramIndex;
        params.push(department);
        paramIndex++;
      }

      query += ' GROUP BY i.id ORDER BY i.updated_at DESC LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1);

      params.push(parseInt(limit, 10) || 50);
      params.push(parseInt(offset, 10) || 0);

      const result = await pool.query(query, params);
      result.rows.forEach(addEscalationFlag);

      return res.status(200).json({ incidents: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('Error fetching incidents:', error.message);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const incidentQuery = `
        SELECT i.id, i.issue_type, i.severity, i.status,
               i.landmark_description, i.ward_id, i.department,
               i.report_count, i.first_reported_at, i.created_at,
               i.updated_at, i.draft_email_subject, i.draft_email_body
        FROM incidents i WHERE i.id = $1
      `;

      const incidentResult = await pool.query(incidentQuery, [id]);
      if (incidentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Incident not found' });
      }

      const incident = incidentResult.rows[0];
      addEscalationFlag(incident);

      const reportsQuery = `
        SELECT r.id, r.user_id, r.photos, r.latitude, r.longitude,
               r.text, r.issue_type, r.severity, r.landmark_description, r.created_at
        FROM reports r
        JOIN incident_reports ir ON r.id = ir.report_id
        WHERE ir.incident_id = $1
        ORDER BY r.created_at DESC
      `;

      const reportsResult = await pool.query(reportsQuery, [id]);
      incident.linked_reports = reportsResult.rows;

      if (incident.draft_email_subject && incident.draft_email_body) {
        incident.draft_email = {
          subject: incident.draft_email_subject,
          body: incident.draft_email_body,
        };
      }

      return res.status(200).json(incident);
    } catch (error) {
      console.error('Error fetching incident:', error.message);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  router.put('/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['reported', 'routed', 'in_progress', 'resolved'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Invalid status',
          message: 'Status must be one of: ' + validStatuses.join(', '),
        });
      }

      let query;
      if (status === 'resolved') {
        query = 'UPDATE incidents SET status = $1, updated_at = CURRENT_TIMESTAMP, resolved_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, status, updated_at, resolved_at';
      } else {
        query = 'UPDATE incidents SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, status, updated_at';
      }

      const result = await pool.query(query, [status, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Incident not found' });
      }

      return res.status(200).json({
        message: 'Status updated',
        incident_id: id,
        status: result.rows[0].status,
        updated_at: result.rows[0].updated_at,
      });
    } catch (error) {
      console.error('Error updating incident status:', error.message);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  return router;
}

module.exports = createIncidentsRouter;