require('dotenv').config();
const createPool = require('../models/db');
const crypto = require('crypto');

/**
 * Seeds the database with initial data
 */
async function seed() {
  const pool = createPool();

  try {
    console.log('Seeding database...');

    // Seed wards (real areas near Manipal demo location)
    const wardIds = ['Ward-A', 'Ward-B', 'Ward-C', 'Ward-D', 'Ward-E'];
    const wardNames = [
      'Tiger Circle & MIT Campus, Manipal',
      'End Point Road, Manipal',
      'KMC Hospital & Madhav Nagar, Manipal',
      'Udupi-Manipal Highway (NH-169A)',
      'Malpe Beach Road, Udupi',
    ];

    for (let i = 0; i < wardIds.length; i++) {
      await pool.query(
        'INSERT INTO wards (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
        [wardIds[i], wardNames[i]]
      );
    }
    console.log('✓ Seeded 5 wards');

    // Seed departments
    const departmentIds = ['traffic-police', 'municipal-roads', 'drainage-dept'];
    const departmentNames = ['Traffic Police', 'Municipal Road Dept', 'Drainage Dept'];
    const departmentTypes = [
      ['signal_failure', 'accident', 'blocked_road'],
      ['pothole', 'blocked_road'],
      ['waterlogging', 'pothole'],
    ];

    for (let i = 0; i < departmentIds.length; i++) {
      await pool.query(
        'INSERT INTO departments (id, name, issue_types_handled) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET issue_types_handled = $3',
        [departmentIds[i], departmentNames[i], departmentTypes[i]]
      );
    }
    console.log('✓ Seeded 3 departments with issue_types_handled');

    // Hash password for users (must match auth.js hashPassword function)
    const hashPassword = (password) => crypto.createHash('sha256').update(password + 'roadpulse-salt').digest('hex');

    // Seed authority user
    const authorityPasswordHash = hashPassword('password123');
    const authorityResult = await pool.query(
      'INSERT INTO users (email, password_hash, role, department) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET department = $4 RETURNING id',
      ['authority@roadpulse.local', authorityPasswordHash, 'authority', 'municipal-roads']
    );
    const authorityUserId = authorityResult.rows.length > 0 ? authorityResult.rows[0].id : null;
    console.log('✓ Seeded authority user (department: municipal-roads)');

    // Seed citizen user
    const citizenPasswordHash = hashPassword('password123');
    const citizenResult = await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id',
      ['citizen@roadpulse.local', citizenPasswordHash, 'citizen']
    );
    const citizenUserId = citizenResult.rows.length > 0 ? citizenResult.rows[0].id : null;
    console.log('✓ Seeded citizen user');

    // Seed one old incident (created 90 days ago) for escalation flag demo
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const incidentResult = await pool.query(
      `INSERT INTO incidents (
        first_reported_at,
        status,
        issue_type,
        severity,
        department,
        ward_id,
        landmark_description,
        report_count,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        ninetyDaysAgo,
        'reported',
        'pothole',
        'high',
        'municipal-roads',
        'Ward-A',
        'Near Main Street and 5th Avenue intersection',
        2,
        ninetyDaysAgo,
        ninetyDaysAgo,
      ]
    );
    const incidentId = incidentResult.rows[0].id;
    console.log('✓ Seeded old incident (90 days ago) for escalation demo');

    // Seed a recent report linked to the old incident
    if (citizenUserId) {
      const reportResult = await pool.query(
        `INSERT INTO reports (
          user_id,
          photos,
          latitude,
          longitude,
          text,
          issue_type,
          severity,
          landmark_description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          citizenUserId,
          JSON.stringify([
            { url: 'https://example.com/pothole-1.jpg', timestamp: new Date().toISOString() },
          ]),
          40.7128,
          -74.006,
          'Large pothole causing traffic congestion',
          'pothole',
          'high',
          'Near Main Street and 5th Avenue intersection',
        ]
      );
      const reportId = reportResult.rows[0].id;

      // Link report to incident
      await pool.query(
        'INSERT INTO incident_reports (incident_id, report_id) VALUES ($1, $2)',
        [incidentId, reportId]
      );
      console.log('✓ Seeded report and linked to incident');
    }

    console.log('\n✅ Database seeding completed successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

// Run seed if this is the main module
if (require.main === module) {
  seed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = seed;
