const CLUSTER_THRESHOLD = parseFloat(process.env.CLUSTERING_DISTANCE_THRESHOLD) || 30;

const SEVERITY_RANK = { low: 1, medium: 2, high: 3, critical: 4 };

function normalizeSeverity(severity) {
  const map = { low: 'low', med: 'medium', medium: 'medium', high: 'high', critical: 'critical', unknown: 'low' };
  return map[severity] || 'low';
}

/**
 * Clustering Agent: merge into open incident within ~30m + same issue_type, else create.
 */
async function clusterOrCreate(incidentData, pool) {
  const {
    issue_type,
    severity,
    latitude,
    longitude,
    landmark_description,
    ward_id,
    report_id,
  } = incidentData;

  const existingIncident = await findNearbyIncident(pool, issue_type, latitude, longitude);

  if (existingIncident) {
    await mergeIntoIncident(pool, existingIncident, report_id, severity);
    return { incident_id: existingIncident.id, created: false, merged: true };
  }

  const newIncidentId = await createIncident(pool, {
    issue_type,
    severity,
    latitude,
    longitude,
    landmark_description,
    ward_id,
    report_id,
  });

  return { incident_id: newIncidentId, created: true, merged: false };
}

async function findNearbyIncident(pool, issue_type, latitude, longitude) {
  // Prefer incident coordinates; fall back to linked report coords for older rows
  const query = `
    SELECT i.id, i.severity, i.report_count
    FROM incidents i
    WHERE i.issue_type = $1
      AND i.status != 'resolved'
      AND (
        (
          i.latitude IS NOT NULL AND i.longitude IS NOT NULL
          AND (
            6371000 * ACOS(
              LEAST(1.0,
                COS(RADIANS($2::numeric)) * COS(RADIANS(i.latitude)) * COS(RADIANS(i.longitude) - RADIANS($3::numeric))
                + SIN(RADIANS($2::numeric)) * SIN(RADIANS(i.latitude))
              )
            )
          ) <= $4
        )
        OR EXISTS (
          SELECT 1 FROM incident_reports ir
          JOIN reports r ON ir.report_id = r.id
          WHERE ir.incident_id = i.id
            AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL
            AND (
              6371000 * ACOS(
                LEAST(1.0,
                  COS(RADIANS($2::numeric)) * COS(RADIANS(r.latitude)) * COS(RADIANS(r.longitude) - RADIANS($3::numeric))
                  + SIN(RADIANS($2::numeric)) * SIN(RADIANS(r.latitude))
                )
              )
            ) <= $4
        )
      )
    ORDER BY i.last_reported_at DESC NULLS LAST
    LIMIT 1
  `;

  const result = await pool.query(query, [issue_type, latitude, longitude, CLUSTER_THRESHOLD]);
  return result.rows[0] || null;
}

async function mergeIntoIncident(pool, existing, report_id, newSeverity) {
  const normalized = normalizeSeverity(newSeverity);
  const existingRank = SEVERITY_RANK[existing.severity] || 1;
  const newRank = SEVERITY_RANK[normalized] || 1;
  const severity = newRank > existingRank ? normalized : existing.severity;

  await pool.query(
    `UPDATE incidents
     SET report_count = report_count + 1,
         last_reported_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP,
         severity = $2
     WHERE id = $1`,
    [existing.id, severity]
  );

  await pool.query(
    'INSERT INTO incident_reports (incident_id, report_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [existing.id, report_id]
  );
}

async function createIncident(pool, incidentData) {
  const { issue_type, severity, latitude, longitude, landmark_description, ward_id, report_id } = incidentData;

  const result = await pool.query(
    `INSERT INTO incidents (
      issue_type, severity, latitude, longitude, landmark_description, ward_id,
      first_reported_at, last_reported_at, status, report_count
    ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'reported', 1)
    RETURNING id`,
    [issue_type, normalizeSeverity(severity), latitude, longitude, landmark_description, ward_id || null]
  );

  const incidentId = result.rows[0].id;
  await pool.query('INSERT INTO incident_reports (incident_id, report_id) VALUES ($1, $2)', [
    incidentId,
    report_id,
  ]);
  return incidentId;
}

module.exports = { clusterOrCreate, normalizeSeverity };
