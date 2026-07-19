const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const createPool = require('./models/db');
const { uploadDir } = require('./middleware/upload');

// Import route factories
const createReportsRouter = require('./routes/reports');
const createIncidentsRouter = require('./routes/incidents');
const createDashboardRouter = require('./routes/dashboard');
const createAuthRouter = require('./routes/auth');

/**
 * Initialize and start the Express server
 */
function startServer() {
  // Create database connection pool
  const pool = createPool();

  // Create Express app
  const app = express();

  // Middleware
  app.use(cors());
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
  });

  // Serve uploaded report photos
  app.use('/uploads', express.static(uploadDir));

  // Mount routes
  app.use('/auth', createAuthRouter(pool));
  app.use('/reports', createReportsRouter(pool));
  app.use('/incidents', createIncidentsRouter(pool));
  app.use('/dashboard', createDashboardRouter(pool));

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      path: req.path
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large', message: 'Each photo must be under 10MB' });
    }
    if (err.message === 'Only image files are allowed') {
      return res.status(400).json({ error: err.message });
    }
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  });

  // Start server
  const PORT = process.env.PORT || 5000;

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
      console.log('Server closed');
      pool.end();
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, closing server...');
    server.close(() => {
      console.log('Server closed');
      pool.end();
      process.exit(0);
    });
  });

  return server;
}

// Start server if this is the main module
if (require.main === module) {
  startServer();
}

module.exports = startServer;
