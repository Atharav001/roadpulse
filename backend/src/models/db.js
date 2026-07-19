const { Pool } = require('pg');

/**
 * Creates and returns a PostgreSQL connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
function createPool() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return pool;
}

module.exports = createPool;
