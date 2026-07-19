const express = require('express');
const path = require('path');
const { classify } = require('../agents/classification');
const { getLandmark } = require('../agents/landmark');
const { clusterOrCreate } = require('../agents/clustering');
const { routeDepartment } = require('../agents/routing');
const { draftEmail } = require('../agents/emailDraft');
const { upload, uploadDir } = require('../middleware/upload');

function createReportsRouter(pool) {
  const router = express.Router();

  /**
   * POST /reports/preview-landmark
   * Preview landmark description without creating a report
   * Body: { latitude, longitude, ward_id? }
   */
  router.post('/preview-landmark', async (req, res) => {
    try {
      const { latitude, longitude, ward_id } = req.body;
      const lat = latitude != null ? parseFloat(latitude) : null;
      const lng = longitude != null ? parseFloat(longitude) : null;
      if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
        return res.status(400).json({ error: 'latitude and longitude are required' });
      }
      const result = await getLandmark(lat, lng, ward_id);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in preview-landmark:', error.message);
      return res.status(500).json({ error: 'Failed to preview landmark', message: error.message });
    }
  });

  /**
   * POST /reports
   * Main submit-a-report endpoint
   * Accepts JSON: { photos, latitude, longitude, timestamp, text, user_id, ward_id, landmark_description }
   * Returns: {incident_id, report_id, issue_type, severity, landmark_description, draft_email, status}
   */
  router.post('/', async (req, res) => {
    try {
      const { photos, latitude, longitude, text, timestamp, user_id, ward_id, landmark_description } = req.body;

      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
      }

      if (!photos || !Array.isArray(photos) || photos.length === 0) {
        return res.status(400).json({ error: 'At least 1 photo is required' });
      }

      const lat = latitude != null ? parseFloat(latitude) : null;
      const lng = longitude != null ? parseFloat(longitude) : null;

      if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
        return res.status(400).json({ error: 'latitude and longitude are required' });
      }

      const captureTimestamp = timestamp || new Date().toISOString();
      const photoData = photos.map(p => ({
        url: p.previewUrl || p.url || `/uploads/placeholder-${Date.now()}.jpg`,
        timestamp: p.timestamp || captureTimestamp,
      }));

      // Step 1: Create report row first (no classification yet)
      let reportId;
      try {
        const reportQuery = `
          INSERT INTO reports (
            user_id, photos, latitude, longitude, text,
            issue_type, severity, landmark_description, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
          RETURNING id
        `;
        const reportResult = await pool.query(reportQuery, [
          user_id,
          JSON.stringify(photoData),
          lat,
          lng,
          text || null,
          null,
          null,
          landmark_description || null,
        ]);
        reportId = reportResult.rows[0].id;
      } catch (dbError) {
        console.error('Database error creating report:', dbError.message);
        return res.status(500).json({ error: 'Failed to create report', message: dbError.message });
      }

      // Step 2: Classify issue (updates report row)
      let classification = { issue_type: 'unclassified', severity: 'unknown' };
      try {
        classification = await classify(photoData.map(p => p.url), text);
        await pool.query(
          'UPDATE reports SET issue_type = $1, severity = $2 WHERE id = $3',
          [classification.issue_type, normalizeSeverity(classification.severity), reportId]
        );
      } catch (error) {
        console.error('Classification agent failed:', error.message);
      }

      // Step 3: Get landmark
      let landmark = { landmark_description: 'Unknown location', ward_id: ward_id || 'unknown' };
      try {
        landmark = await getLandmark(lat, lng, ward_id);
      } catch (error) {
        console.error('Landmark agent failed:', error.message);
      }

      // Step 4: Route to department
      let department = 'unknown';
      try {
        department = routeDepartment(classification.issue_type);
      } catch (error) {
        console.error('Routing agent failed:', error.message);
      }

      // Step 5: Cluster or create incident
      let incidentId;
      try {
        const clusterResult = await clusterOrCreate(
          {
            issue_type: classification.issue_type,
            severity: classification.severity,
            latitude: lat,
            longitude: lng,
            landmark_description: landmark_description || landmark.landmark_description,
            ward_id: landmark.ward_id,
            department: department,
            user_id: user_id,
            report_id: reportId,
          },
          pool
        );
        incidentId = clusterResult.incident_id;
      } catch (error) {
        console.error('Clustering agent failed:', error.message);
        incidentId = null;
      }

      // Step 6: Draft email
      let draftEmailResult = {
        subject: `Road Issue Report: ${classification.issue_type}`,
        body: 'Thank you for your report. Our team will review and take action.',
      };
      try {
        draftEmailResult = await draftEmail(
          {
            issue_type: classification.issue_type,
            severity: classification.severity,
            landmark_description: landmark_description || landmark.landmark_description,
            department: department,
          },
          user_id
        );
      } catch (error) {
        console.error('Email draft agent failed:', error.message);
      }

      return res.status(201).json({
        incident_id: incidentId || reportId,
        report_id: reportId,
        issue_type: classification.issue_type,
        severity: classification.severity,
        landmark_description: landmark_description || landmark.landmark_description,
        draft_email: draftEmailResult,
        status: 'reported',
      });
    } catch (error) {
      console.error('Unexpected error in POST /reports:', error.message);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  /**
   * GET /reports/user/:userId
   * Fetch all reports for a specific user
   */
  router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const query = `
        SELECT r.id, r.issue_type, r.severity, r.latitude, r.longitude,
               r.landmark_description, r.created_at, r.text,
               i.status, i.id as incident_id
        FROM reports r
        LEFT JOIN incident_reports ir ON r.id = ir.report_id
        LEFT JOIN incidents i ON ir.incident_id = i.id
        WHERE r.user_id = $1
        ORDER BY r.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(query, [userId, limit, offset]);
      return res.status(200).json({ reports: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('Error fetching user reports:', error.message);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  /**
   * GET /reports/:id
   * Fetch a specific report's details
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const query = `
        SELECT id, user_id, photos, latitude, longitude, text,
               issue_type, severity, landmark_description, created_at
        FROM reports WHERE id = $1
      `;
      const result = await pool.query(query, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }
      const report = result.rows[0];
      report.photos = report.photos || [];
      return res.status(200).json(report);
    } catch (error) {
      console.error('Error fetching report:', error.message);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  return router;
}

function normalizeSeverity(severity) {
  const map = { low: 'low', med: 'medium', high: 'high', unknown: 'low' };
  return map[severity] || 'low';
}

module.exports = createReportsRouter;