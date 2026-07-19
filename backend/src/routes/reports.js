const express = require('express');
const path = require('path');
const { classify } = require('../agents/classification');
const { getLandmark } = require('../agents/landmark');
const { clusterOrCreate, normalizeSeverity } = require('../agents/clustering');
const { routeDepartment } = require('../agents/routing');
const { draftEmail } = require('../agents/emailDraft');
const { requireAuth } = require('../middleware/auth');
const { savePhotosFromRequest } = require('../utils/photos');
const { uploadDir } = require('../middleware/upload');

/**
 * Agent pipeline (synchronous, plan order):
 * Classification → Landmark → Clustering → Routing → Email
 * External failures never block submission.
 */
function createReportsRouter(pool) {
  const router = express.Router();

  router.post('/preview-landmark', async (req, res) => {
    try {
      const { latitude, longitude, ward_id } = req.body;
      const lat = latitude != null ? parseFloat(latitude) : null;
      const lng = longitude != null ? parseFloat(longitude) : null;
      if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
        return res.status(400).json({ error: 'latitude and longitude are required' });
      }
      const result = await getLandmark(lat, lng, ward_id, pool);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in preview-landmark:', error.message);
      return res.status(500).json({ error: 'Failed to preview landmark', message: error.message });
    }
  });

  router.post('/', requireAuth, async (req, res) => {
    try {
      const {
        photos,
        latitude,
        longitude,
        text,
        text_description,
        timestamp,
        captured_at,
        user_id,
        ward_id,
        landmark_description,
      } = req.body;

      if (req.user.user_id !== user_id) {
        return res.status(403).json({ error: 'Cannot submit reports for another user' });
      }

      if (!photos || !Array.isArray(photos) || photos.length < 2) {
        return res.status(400).json({ error: 'Exactly 2 photos are required (closeup + context)' });
      }

      const lat = latitude != null ? parseFloat(latitude) : null;
      const lng = longitude != null ? parseFloat(longitude) : null;

      if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
        return res.status(400).json({ error: 'latitude and longitude are required' });
      }

      const description = text_description || text || null;
      const capturedAt = captured_at || timestamp || new Date().toISOString();
      const photoData = savePhotosFromRequest(photos);
      const closeupUrl = photoData.find(p => p.label === 'closeup')?.url || photoData[0]?.url || null;
      const contextUrl = photoData.find(p => p.label === 'context')?.url || photoData[1]?.url || null;

      let reportId;
      try {
        const reportResult = await pool.query(
          `INSERT INTO reports (
            user_id, photos, photo_closeup_url, photo_context_url,
            latitude, longitude, captured_at, text, text_description,
            issue_type, severity, landmark_description, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, NULL, NULL, $9, CURRENT_TIMESTAMP)
          RETURNING id`,
          [
            user_id,
            JSON.stringify(photoData),
            closeupUrl,
            contextUrl,
            lat,
            lng,
            capturedAt,
            description,
            landmark_description || null,
          ]
        );
        reportId = reportResult.rows[0].id;
      } catch (dbError) {
        console.error('Database error creating report:', dbError.message);
        return res.status(500).json({ error: 'Failed to create report', message: dbError.message });
      }

      // 1. Classification Agent
      let classification = { issue_type: 'unclassified', severity: 'unknown', raw_result: null };
      try {
        const photoPaths = photoData
          .map(p => (p.url?.startsWith('/uploads/') ? path.join(uploadDir, path.basename(p.url)) : null))
          .filter(Boolean);
        const sources = photoPaths.length >= 1 ? photoPaths : photos.map(p => p.data).filter(Boolean);
        classification = await classify(sources, description);
        await pool.query(
          'UPDATE reports SET issue_type = $1, severity = $2, raw_classification_result = $3 WHERE id = $4',
          [
            classification.issue_type,
            normalizeSeverity(classification.severity),
            classification.raw_result ? JSON.stringify({ raw_text: classification.raw_result }) : null,
            reportId,
          ]
        );
      } catch (error) {
        console.error('Classification agent failed:', error.message);
      }

      // 2. Landmark Agent
      let landmark = {
        landmark_description: 'Unknown ward',
        ward_id: ward_id || 'unknown',
        nearby_landmarks: [],
      };
      try {
        landmark = await getLandmark(lat, lng, ward_id, pool);
        await pool.query(
          'UPDATE reports SET landmark_description = $1, nearby_landmarks = $2 WHERE id = $3',
          [
            landmark_description || landmark.landmark_description,
            JSON.stringify(landmark.nearby_landmarks || []),
            reportId,
          ]
        );
      } catch (error) {
        console.error('Landmark agent failed:', error.message);
      }

      const finalLandmark = landmark_description || landmark.landmark_description;
      const finalWard = landmark.ward_id && landmark.ward_id !== 'unknown' ? landmark.ward_id : null;

      // 3. Clustering Agent
      let incidentId = null;
      let merged = false;
      try {
        const clusterResult = await clusterOrCreate(
          {
            issue_type: classification.issue_type,
            severity: classification.severity,
            latitude: lat,
            longitude: lng,
            landmark_description: finalLandmark,
            ward_id: finalWard,
            report_id: reportId,
          },
          pool
        );
        incidentId = clusterResult.incident_id;
        merged = !!clusterResult.merged;
      } catch (error) {
        console.error('Clustering agent failed:', error.message);
        return res.status(201).json({
          incident_id: null,
          report_id: reportId,
          issue_type: classification.issue_type,
          severity: normalizeSeverity(classification.severity),
          landmark_description: finalLandmark,
          ward_id: landmark.ward_id,
          department: null,
          draft_email: null,
          status: 'reported',
          merged: false,
          warning: 'Clustering failed; report saved',
        });
      }

      // 4. Routing Agent
      const department = routeDepartment(classification.issue_type);
      let finalStatus = 'reported';
      try {
        if (department) {
          await pool.query(
            `UPDATE incidents
             SET department = COALESCE(department, $1),
                 status = CASE WHEN status = 'reported' THEN 'routed' ELSE status END,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [department, incidentId]
          );
          finalStatus = 'routed';
        }
      } catch (error) {
        console.error('Routing agent failed:', error.message);
      }

      // 5. Email Agent (draft stored on incident; only overwrite when newly created)
      let draftEmailResult = {
        subject: `Road Issue Report: ${classification.issue_type}`,
        body: 'Thank you for your report. Our team will review and take action.',
      };

      try {
        const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [user_id]);
        const userEmail = userResult.rows[0]?.email || 'citizen@roadpulse.local';

        draftEmailResult = await draftEmail(
          {
            issue_type: classification.issue_type,
            severity: classification.severity,
            landmark_description: finalLandmark,
            department,
          },
          userEmail
        );

        if (!merged) {
          await pool.query(
            'UPDATE incidents SET draft_email_subject = $1, draft_email_body = $2 WHERE id = $3',
            [draftEmailResult.subject, draftEmailResult.body, incidentId]
          );
        } else {
          const existing = await pool.query(
            'SELECT draft_email_subject, draft_email_body FROM incidents WHERE id = $1',
            [incidentId]
          );
          if (!existing.rows[0]?.draft_email_subject) {
            await pool.query(
              'UPDATE incidents SET draft_email_subject = $1, draft_email_body = $2 WHERE id = $3',
              [draftEmailResult.subject, draftEmailResult.body, incidentId]
            );
          } else {
            draftEmailResult = {
              subject: existing.rows[0].draft_email_subject,
              body: existing.rows[0].draft_email_body,
            };
          }
        }
      } catch (error) {
        console.error('Email draft agent failed:', error.message);
      }

      const countResult = await pool.query('SELECT report_count, status FROM incidents WHERE id = $1', [
        incidentId,
      ]);

      return res.status(201).json({
        incident_id: incidentId,
        report_id: reportId,
        issue_type: classification.issue_type,
        severity: normalizeSeverity(classification.severity),
        landmark_description: finalLandmark,
        ward_id: landmark.ward_id,
        department,
        draft_email: draftEmailResult,
        status: countResult.rows[0]?.status || finalStatus,
        report_count: countResult.rows[0]?.report_count || 1,
        merged,
      });
    } catch (error) {
      console.error('Unexpected error in POST /reports:', error.message);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  router.get('/user/:userId', requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      if (req.user.user_id !== userId && req.user.role !== 'authority') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const limit = parseInt(req.query.limit, 10) || 50;
      const offset = parseInt(req.query.offset, 10) || 0;

      const result = await pool.query(
        `SELECT r.id, r.photos, r.photo_closeup_url, r.photo_context_url,
                r.issue_type, r.severity, r.latitude, r.longitude,
                COALESCE(r.landmark_description, '') AS landmark_description,
                COALESCE(r.text_description, r.text) AS text,
                r.captured_at, r.created_at,
                i.status, i.id AS incident_id, i.department, i.ward_id, i.report_count
         FROM reports r
         LEFT JOIN incident_reports ir ON r.id = ir.report_id
         LEFT JOIN incidents i ON ir.incident_id = i.id
         WHERE r.user_id = $1
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return res.status(200).json({ reports: result.rows, count: result.rows.length });
    } catch (error) {
      console.error('Error fetching user reports:', error.message);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  router.get('/:id', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT id, user_id, photos, photo_closeup_url, photo_context_url,
                latitude, longitude, captured_at,
                COALESCE(text_description, text) AS text,
                issue_type, severity, landmark_description,
                raw_classification_result, nearby_landmarks, created_at
         FROM reports WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Report not found' });
      }
      const report = result.rows[0];
      if (req.user.user_id !== report.user_id && req.user.role !== 'authority') {
        return res.status(403).json({ error: 'Access denied' });
      }
      report.photos = report.photos || [];
      return res.status(200).json(report);
    } catch (error) {
      console.error('Error fetching report:', error.message);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  return router;
}

module.exports = createReportsRouter;
