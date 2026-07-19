/**
 * Integration Example: Complete Report Processing Pipeline
 * 
 * This file demonstrates how the five agents work together sequentially
 * to process an incoming road/traffic report. This should be called from
 * the POST /reports route handler.
 */

const { classify } = require('./classification');
const { getLandmark } = require('./landmark');
const { clusterOrCreate } = require('./clustering');
const { routeDepartment } = require('./routing');
const { draftEmail } = require('./emailDraft');

/**
 * Processes a complete road/traffic report through all five agents
 * @param {Object} reportData - Raw report data
 * @param {string[]} reportData.photoUrls - Photo URLs from user
 * @param {string} reportData.text - User description text
 * @param {number} reportData.latitude - Report latitude
 * @param {number} reportData.longitude - Report longitude
 * @param {string} reportData.wardId - Ward ID
 * @param {string} reportData.userId - User ID
 * @param {string} reportData.reportId - Report ID
 * @param {string} reportData.userEmail - User email
 * @param {Pool} pool - Database connection pool
 * @returns {Promise<Object>} Complete processing result
 */
async function processReportThroughAgents(reportData, pool) {
  const {
    photoUrls,
    text,
    latitude,
    longitude,
    wardId,
    userId,
    reportId,
    userEmail
  } = reportData;

  console.log('🔄 Starting report processing pipeline for report:', reportId);

  try {
    // STAGE 1: CLASSIFICATION
    console.log('1️⃣  Classifying issue...');
    const classification = await classify(photoUrls, text);
    console.log('   ✓ Classification:', classification);

    // STAGE 2: LANDMARK LOOKUP
    console.log('2️⃣  Getting landmark description...');
    const landmark = await getLandmark(latitude, longitude, wardId);
    console.log('   ✓ Landmark:', landmark);

    // STAGE 3: CLUSTERING
    console.log('3️⃣  Clustering or creating incident...');
    const clusterResult = await clusterOrCreate({
      issue_type: classification.issue_type,
      severity: classification.severity,
      latitude,
      longitude,
      landmark_description: landmark.landmark_description,
      ward_id: landmark.ward_id,
      department: routeDepartment(classification.issue_type), // Compute early for clustering context
      user_id: userId,
      report_id: reportId
    }, pool);
    console.log('   ✓ Incident Result:', clusterResult);

    // STAGE 4: ROUTING (lightweight, included here for completeness)
    console.log('4️⃣  Routing to department...');
    const department = routeDepartment(classification.issue_type);
    console.log('   ✓ Department:', department);

    // STAGE 5: EMAIL DRAFTING
    console.log('5️⃣  Drafting formal email...');
    const email = await draftEmail({
      issue_type: classification.issue_type,
      severity: classification.severity,
      landmark_description: landmark.landmark_description,
      department
    }, userEmail);
    console.log('   ✓ Email drafted');

    // FINAL RESULT
    const result = {
      success: true,
      reportId,
      incidentId: clusterResult.incident_id,
      isNewIncident: clusterResult.created,
      classification,
      landmark,
      department,
      email,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Report processing complete');
    return result;
  } catch (error) {
    console.error('❌ Report processing failed:', error.message);
    throw error;
  }
}

module.exports = {
  processReportThroughAgents
};

// Example usage (for testing):
/*
const createPool = require('../models/db');

const reportData = {
  photoUrls: ['https://example.com/photo1.jpg'],
  text: 'Large pothole on main street',
  latitude: 40.7128,
  longitude: -74.0060,
  wardId: 'W001',
  userId: 'user-123',
  reportId: 'report-456',
  userEmail: 'citizen@example.com'
};

const pool = createPool();
processReportThroughAgents(reportData, pool)
  .then(result => console.log(JSON.stringify(result, null, 2)))
  .catch(err => console.error(err))
  .finally(() => pool.end());
*/
