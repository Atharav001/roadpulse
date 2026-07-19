require('dotenv').config();
const fs = require('fs');
const path = require('path');
const createPool = require('../models/db');

/**
 * Executes database migrations
 * Reads schema.sql and executes it against the database
 */
async function migrate() {
  const pool = createPool();

  try {
    // Read schema.sql
    const schemaPath = path.join(__dirname, '../models/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    console.log('Running migrations...');

    // Execute schema
    await pool.query(schema);

    console.log('Migrations completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

// Run migration if this is the main module
if (require.main === module) {
  migrate().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = migrate;
