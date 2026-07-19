/**
 * Clusters similar incidents together or creates a new incident
 * @param {Object} incidentData - Incident data
 * @param {string} incidentData.issue_type - Type of issue
 * @param {string} incidentData.severity - Severity level
 * @param {number} incidentData.latitude - Latitude
 * @param {number} incidentData.longitude - Longitude
 * @param {string} incidentData.landmark_description - Landmark description
 * @param {string} incidentData.ward_id - Ward ID
 * @param {string} incidentData.department - Department name
 * @param {string} incidentData.user_id - User ID
 * @param {string} incidentData.report_id - Report ID
 * @param {Pool} pool - Database connection pool
 * @returns {Promise<{incident_id: string, created: boolean}>}
 */
async function clusterOrCreate(incidentData, pool) {
  const {
    issue_type,
    severity,
    latitude,
    longitude,
    landmark_description,
    ward_id,
    department,
    user_id,
    report_id
  } = incidentData;

  try {
    // Query for open incidents within 30 meters of the same issue type
    const existingIncident = await findNearbyIncident(
      pool,
      issue_type,
      latitude,
      longitude
    );

    if (existingIncident) {
      // Update existing incident
      await updateIncident(pool, existingIncident.id, report_id);
      return {
        incident_id: existingIncident.id,
        created: false
      };
    }

    // Create new incident
    const newIncidentId = await createIncident(
      pool,
      {
        issue_type,
        severity,
        latitude,
        longitude,
        landmark_description,
        ward_id,
        department,
        report_id
      }
    );

    return {
      incident_id: newIncidentId,
      created: true
    };
  } catch (error) {
    console.error('Error in clusterOrCreate:', error.message);
    throw error;
  }
}

/**
 * Finds an open incident within 30 meters of the given location
 * Queries incidents with their associated reports to find nearby incidents
 * @param {Pool} pool - Database pool
 * @param {string} issue_type - Issue type to match
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<Object|null>} Incident if found, null otherwise
 */
async function findNearbyIncident(pool, issue_type, latitude, longitude) {
  const query = `
    SELECT DISTINCT i.id
    FROM incidents i
    JOIN incident_reports ir ON i.id = ir.incident_id
    JOIN reports r ON ir.report_id = r.id
    WHERE i.issue_type = $1
      AND i.status != 'resolved'
      AND r.latitude IS NOT NULL
      AND r.longitude IS NOT NULL
      AND (
        6371000 * ACOS(
          LEAST(1.0, COS(RADIANS(90.0 - r.latitude)) * COS(RADIANS(90.0 - $2::numeric))
          + SIN(RADIANS(90.0 - r.latitude)) * SIN(RADIANS(90.0 - $2::numeric))
            * COS(RADIANS(r.longitude - $3::numeric)))
        ) <= 30
      )
    LIMIT 1
  `;

  const result = await pool.query(query, [issue_type, latitude, longitude]);
  return result.rows[0] || null;
}

/**
 * Updates an existing incident with a new report
 * @param {Pool} pool - Database pool
 * @param {string} incident_id - Incident ID
 * @param {string} report_id - Report ID to add
 * @returns {Promise<void>}
 */
async function updateIncident(pool, incident_id, report_id) {
  const query = `
    UPDATE incidents
    SET 
      report_count = report_count + 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `;

  await pool.query(query, [incident_id]);

  // Add the report to incident_reports join table
  const insertQuery = `
    INSERT INTO incident_reports (incident_id, report_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
  `;

  await pool.query(insertQuery, [incident_id, report_id]);
}

/**
 * Normalizes severity from classification format to database format
 * @param {string} severity - Severity from classification (low/med/high)
 * @returns {string} Database severity (low/medium/high/critical)
 */
function normalizeSeverity(severity) {
  const severityMap = {
    low: 'low',
    med: 'medium',
    high: 'high'
  };
  return severityMap[severity] || 'low';
}

/**
 * Creates a new incident
 * @param {Pool} pool - Database pool
 * @param {Object} incidentData - Incident data
 * @returns {Promise<string>} New incident ID
 */
async function createIncident(pool, incidentData) {
  const {
    issue_type,
    severity,
    latitude,
    longitude,
    landmark_description,
    ward_id,
    department,
    report_id
  } = incidentData;

  const normalizedSeverity = normalizeSeverity(severity);

  const query = `
    INSERT INTO incidents (
      issue_type,
      severity,
      landmark_description,
      ward_id,
      department,
      first_reported_at,
      status,
      report_count
    )
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, 'reported', 1)
    RETURNING id
  `;

  const result = await pool.query(query, [
    issue_type,
    normalizedSeverity,
    landmark_description,
    ward_id,
    department
  ]);

  const incidentId = result.rows[0].id;

  // Add the report to incident_reports join table
  const joinQuery = `
    INSERT INTO incident_reports (incident_id, report_id)
    VALUES ($1, $2)
  `;

  await pool.query(joinQuery, [incidentId, report_id]);

  return incidentId;
}

module.exports = {
  clusterOrCreate
};
