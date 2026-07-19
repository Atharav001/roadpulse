const express = require('express');

function createWardsRouter(pool) {
  const router = express.Router();

  router.get('/', async (_req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, name, center_lat, center_lng FROM wards ORDER BY id'
      );
      return res.status(200).json({ wards: result.rows });
    } catch (error) {
      console.error('Error fetching wards:', error.message);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  return router;
}

module.exports = createWardsRouter;
