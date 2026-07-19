const express = require('express');

function createDashboardRouter(pool) {
  const router = express.Router();

  router.get('/overview', async (_req, res) => {
    try {
      const totals = await pool.query(`
        SELECT
          COUNT(*)::int AS total_incidents,
          COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved_count,
          COUNT(*) FILTER (WHERE status != 'resolved')::int AS open_count
        FROM incidents
      `);

      const byStatus = await pool.query(`
        SELECT status, COUNT(*)::int AS count
        FROM incidents GROUP BY status ORDER BY status
      `);

      const bySeverity = await pool.query(`
        SELECT severity, COUNT(*)::int AS count
        FROM incidents WHERE status != 'resolved'
        GROUP BY severity ORDER BY severity
      `);

      const byWard = await pool.query(`
        SELECT COALESCE(w.id, 'unknown') AS ward_id,
               COALESCE(w.name, 'Unknown ward') AS ward_name,
               COUNT(i.id)::int AS total,
               COUNT(i.id) FILTER (WHERE i.status = 'resolved')::int AS resolved
        FROM wards w
        LEFT JOIN incidents i ON i.ward_id = w.id
        GROUP BY w.id, w.name
        ORDER BY w.id
      `);

      const t = totals.rows[0];
      const resolutionRate = t.total_incidents > 0
        ? Number(((t.resolved_count / t.total_incidents) * 100).toFixed(1))
        : 0;

      return res.status(200).json({
        total_incidents: t.total_incidents,
        resolved_count: t.resolved_count,
        open_count: t.open_count,
        resolution_rate_percent: resolutionRate,
        by_status: byStatus.rows,
        by_severity: bySeverity.rows,
        by_ward: byWard.rows,
      });
    } catch (error) {
      console.error('Error fetching overview:', error.message);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  router.get('/ward/:ward_id', async (req, res) => {
    try {
      const { ward_id } = req.params;

      const statsQuery = `
        SELECT
          COUNT(*)::int AS total_incidents,
          COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved_count,
          COUNT(*) FILTER (WHERE status != 'resolved')::int AS open_count,
          COALESCE(
            AVG(EXTRACT(EPOCH FROM (resolved_at - first_reported_at)) / 3600)
              FILTER (WHERE status = 'resolved' AND resolved_at IS NOT NULL),
            0
          ) AS avg_hours
        FROM incidents WHERE ward_id = $1
      `;
      const stats = (await pool.query(statsQuery, [ward_id])).rows[0];
      const totalIncidents = stats.total_incidents || 0;
      const resolvedCount = stats.resolved_count || 0;
      const openCount = stats.open_count || 0;
      const resolutionRate = totalIncidents > 0
        ? Number(((resolvedCount / totalIncidents) * 100).toFixed(2))
        : 0;

      const byStatusResult = await pool.query(
        `SELECT status, COUNT(*)::int AS count
         FROM incidents WHERE ward_id = $1
         GROUP BY status ORDER BY status`,
        [ward_id]
      );

      const byTypeResult = await pool.query(
        `SELECT issue_type, COUNT(*)::int AS count
         FROM incidents WHERE ward_id = $1 AND status != 'resolved'
         GROUP BY issue_type ORDER BY count DESC`,
        [ward_id]
      );

      const pendingResult = await pool.query(
        `SELECT id, issue_type, severity, status, landmark_description,
                report_count, first_reported_at, department, ward_id
         FROM incidents
         WHERE ward_id = $1 AND status != 'resolved'
         ORDER BY
           CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
           first_reported_at ASC
         LIMIT 20`,
        [ward_id]
      );

      const wardMeta = await pool.query('SELECT id, name FROM wards WHERE id = $1', [ward_id]);

      return res.status(200).json({
        ward_id,
        ward_name: wardMeta.rows[0]?.name || ward_id,
        total_incidents: totalIncidents,
        resolved_count: resolvedCount,
        open_count: openCount,
        resolution_rate_percent: resolutionRate,
        avg_response_time_hours: Number(parseFloat(stats.avg_hours || 0).toFixed(2)),
        by_status: byStatusResult.rows,
        by_issue_type: byTypeResult.rows,
        pending_incidents_list: pendingResult.rows,
      });
    } catch (error) {
      console.error('Error fetching ward dashboard:', error.message);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  router.get('/pending', async (req, res) => {
    try {
      const thresholdDays = parseInt(req.query.days, 10) || 60;
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

      const query = `
        SELECT id, issue_type, severity, status, landmark_description,
               ward_id, department, report_count, first_reported_at,
               EXTRACT(DAY FROM (CURRENT_TIMESTAMP - first_reported_at))::int AS days_pending,
               true AS is_escalated
        FROM incidents
        WHERE status != 'resolved'
          AND first_reported_at < $1
        ORDER BY first_reported_at ASC
      `;

      const result = await pool.query(query, [thresholdDate.toISOString()]);

      return res.status(200).json({
        pending_count: result.rows.length,
        threshold_days: thresholdDays,
        pending_incidents: result.rows,
      });
    } catch (error) {
      console.error('Error fetching pending incidents:', error.message);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  return router;
}

module.exports = createDashboardRouter;
