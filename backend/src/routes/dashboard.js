const express = require('express');

/**
 * Creates dashboard routes
 * @param {Pool} pool - Database connection pool
 * @returns {Router} Express router with dashboard endpoints
 */
function createDashboardRouter(pool) {
  const router = express.Router();

  /**
   * GET /dashboard/ward/:ward_id
   * Return stats for a single ward
   */
  router.get('/ward/:ward_id', async (req, res) => {
    try {
      const { ward_id } = req.params;

      // Get total incidents for ward
      const totalQuery = `
        SELECT COUNT(*) AS count
        FROM incidents
        WHERE ward_id = $1
      `;

      const totalResult = await pool.query(totalQuery, [ward_id]);
      const totalIncidents = parseInt(totalResult.rows[0].count, 10) || 0;

      // Get resolved incidents count
      const resolvedQuery = `
        SELECT COUNT(*) AS count
        FROM incidents
        WHERE ward_id = $1 AND status = 'resolved'
      `;

      const resolvedResult = await pool.query(resolvedQuery, [ward_id]);
      const resolvedCount = parseInt(resolvedResult.rows[0].count, 10) || 0;

      // Get open incidents count (not resolved)
      const openQuery = `
        SELECT COUNT(*) AS count
        FROM incidents
        WHERE ward_id = $1 AND status != 'resolved'
      `;

      const openResult = await pool.query(openQuery, [ward_id]);
      const openCount = parseInt(openResult.rows[0].count, 10) || 0;

      // Calculate resolution rate
      const resolutionRate = totalIncidents > 0
        ? ((resolvedCount / totalIncidents) * 100).toFixed(2)
        : 0;

      // Get average response time (in hours) - using first_reported_at to updated_at for resolved incidents
      const avgResponseQuery = `
        SELECT AVG(EXTRACT(EPOCH FROM (updated_at - first_reported_at)) / 3600) AS avg_hours
        FROM incidents
        WHERE ward_id = $1 AND status = 'resolved'
      `;

      const avgResponseResult = await pool.query(avgResponseQuery, [ward_id]);
      const avgResponseTimeHours = avgResponseResult.rows[0].avg_hours
        ? parseFloat(avgResponseResult.rows[0].avg_hours).toFixed(2)
        : 0;

      // Get pending incidents (status='reported' AND first_reported_at < 60 days ago)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const pendingQuery = `
        SELECT
          id,
          issue_type,
          severity,
          landmark_description,
          report_count,
          first_reported_at
        FROM incidents
        WHERE ward_id = $1
          AND status = 'reported'
          AND first_reported_at >= $2
        ORDER BY first_reported_at DESC
      `;

      const pendingResult = await pool.query(pendingQuery, [
        ward_id,
        sixtyDaysAgo.toISOString()
      ]);

      return res.status(200).json({
        ward_id: ward_id,
        total_incidents: totalIncidents,
        resolved_count: resolvedCount,
        open_count: openCount,
        resolution_rate_percent: parseFloat(resolutionRate),
        avg_response_time_hours: parseFloat(avgResponseTimeHours),
        pending_incidents_list: pendingResult.rows
      });
    } catch (error) {
      console.error('Error fetching ward dashboard:', error.message);
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * GET /dashboard/pending
   * Return all incidents with status='reported' AND first_reported_at > 60 days ago globally
   */
  router.get('/pending', async (req, res) => {
    try {
      // Incidents that are reported but OLDER than 60 days
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const query = `
        SELECT
          id,
          issue_type,
          severity,
          landmark_description,
          ward_id,
          department,
          report_count,
          first_reported_at,
          created_at,
          updated_at,
          EXTRACT(DAY FROM (CURRENT_TIMESTAMP - first_reported_at)) AS days_pending
        FROM incidents
        WHERE status = 'reported'
          AND first_reported_at < $1
        ORDER BY first_reported_at ASC
      `;

      const result = await pool.query(query, [sixtyDaysAgo.toISOString()]);

      return res.status(200).json({
        pending_count: result.rows.length,
        threshold_days: 60,
        pending_incidents: result.rows
      });
    } catch (error) {
      console.error('Error fetching pending incidents:', error.message);
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  return router;
}

module.exports = createDashboardRouter;
