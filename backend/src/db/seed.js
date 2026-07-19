require('dotenv').config();
const createPool = require('../models/db');
const crypto = require('crypto');

async function seed() {
  const pool = createPool();

  try {
    console.log('Seeding database...');

    const wards = [
      { id: 'Ward-A', name: 'Tiger Circle & MIT Campus, Manipal', lat: 13.3520, lng: 74.7869 },
      { id: 'Ward-B', name: 'End Point Road, Manipal', lat: 13.3400, lng: 74.7800 },
      { id: 'Ward-C', name: 'KMC Hospital & Madhav Nagar, Manipal', lat: 13.3550, lng: 74.7920 },
      { id: 'Ward-D', name: 'Udupi-Manipal Highway (NH-169A)', lat: 13.3600, lng: 74.8000 },
      { id: 'Ward-E', name: 'Malpe Beach Road, Udupi', lat: 13.3300, lng: 74.7500 },
    ];

    for (const w of wards) {
      await pool.query(
        `INSERT INTO wards (id, name, center_lat, center_lng)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = $2, center_lat = $3, center_lng = $4`,
        [w.id, w.name, w.lat, w.lng]
      );
    }
    console.log('✓ Seeded 5 wards with centers');

    const departments = [
      { id: 'traffic-police', name: 'Traffic Police', types: ['signal_failure', 'accident'] },
      { id: 'municipal-roads', name: 'Municipal Road Dept', types: ['pothole', 'blocked_road'] },
      { id: 'drainage-dept', name: 'Drainage Dept', types: ['waterlogging'] },
    ];

    for (const d of departments) {
      await pool.query(
        `INSERT INTO departments (id, name, issue_types_handled)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET name = $2, issue_types_handled = $3`,
        [d.id, d.name, d.types]
      );
    }
    console.log('✓ Seeded 3 departments');

    const hashPassword = (password) =>
      crypto.createHash('sha256').update(password + 'roadpulse-salt').digest('hex');

    await pool.query(
      `INSERT INTO users (email, password_hash, role, department)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET department = $4, password_hash = $2
       RETURNING id`,
      ['authority@roadpulse.local', hashPassword('password123'), 'authority', 'municipal-roads']
    );
    console.log('✓ Seeded authority user');

    const citizenResult = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2
       RETURNING id`,
      ['citizen@roadpulse.local', hashPassword('password123'), 'citizen']
    );
    const citizenUserId = citizenResult.rows[0].id;
    console.log('✓ Seeded citizen user');

    // Avoid duplicate demo incidents on re-seed
    const existingDemo = await pool.query(
      `SELECT id FROM incidents
       WHERE landmark_description = $1 AND ward_id = 'Ward-A'
       LIMIT 1`,
      ['Near Tiger Circle, opposite MIT Main Gate']
    );

    if (existingDemo.rows.length === 0) {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const incidentResult = await pool.query(
        `INSERT INTO incidents (
          first_reported_at, last_reported_at, status, issue_type, severity,
          latitude, longitude, department, ward_id, landmark_description,
          report_count, draft_email_subject, draft_email_body, created_at, updated_at
        ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $1, $1)
        RETURNING id`,
        [
          ninetyDaysAgo,
          'reported',
          'pothole',
          'high',
          13.3521,
          74.7868,
          'municipal-roads',
          'Ward-A',
          'Near Tiger Circle, opposite MIT Main Gate',
          2,
          '[RoadPulse] Pothole - Near Tiger Circle',
          'Dear Municipal Road Dept,\n\nA high-severity pothole has been reported near Tiger Circle, Manipal.\n\nPlease inspect and remediate at the earliest.\n\n— RoadPulse',
        ]
      );
      const incidentId = incidentResult.rows[0].id;

      const reportResult = await pool.query(
        `INSERT INTO reports (
          user_id, photos, photo_closeup_url, photo_context_url,
          latitude, longitude, captured_at, text, text_description,
          issue_type, severity, landmark_description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11)
        RETURNING id`,
        [
          citizenUserId,
          JSON.stringify([
            { url: '/uploads/demo-closeup.jpg', timestamp: ninetyDaysAgo.toISOString(), label: 'closeup' },
            { url: '/uploads/demo-context.jpg', timestamp: ninetyDaysAgo.toISOString(), label: 'context' },
          ]),
          '/uploads/demo-closeup.jpg',
          '/uploads/demo-context.jpg',
          13.3521,
          74.7868,
          ninetyDaysAgo,
          'Large pothole near Tiger Circle causing two-wheeler hazard',
          'pothole',
          'high',
          'Near Tiger Circle, opposite MIT Main Gate',
        ]
      );

      await pool.query('INSERT INTO incident_reports (incident_id, report_id) VALUES ($1, $2)', [
        incidentId,
        reportResult.rows[0].id,
      ]);
      console.log('✓ Seeded escalated demo incident (90 days)');
    } else {
      console.log('✓ Demo incident already present, skipped');
    }

    // Recent open incident for dashboard variety
    const recentCheck = await pool.query(
      `SELECT id FROM incidents WHERE landmark_description = $1 LIMIT 1`,
      ['Near End Point Road junction']
    );
    if (recentCheck.rows.length === 0) {
      const recent = new Date();
      recent.setDate(recent.getDate() - 3);
      await pool.query(
        `INSERT INTO incidents (
          first_reported_at, last_reported_at, status, issue_type, severity,
          latitude, longitude, department, ward_id, landmark_description, report_count
        ) VALUES ($1, $1, 'routed', 'waterlogging', 'medium', 13.3401, 74.7801, 'drainage-dept', 'Ward-B',
                  'Near End Point Road junction', 1)`,
        [recent]
      );
      console.log('✓ Seeded recent waterlogging incident');
    }

    console.log('\n✅ Database seeding completed successfully!');
  } catch (err) {
    console.error('Seed failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = seed;
