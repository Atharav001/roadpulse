const express = require('express');
const crypto = require('crypto');

/**
 * Simple JWT token generation for hackathon
 * Uses HMAC-SHA256 with a secret
 */
const JWT_SECRET = process.env.JWT_SECRET || 'roadpulse-hackathon-secret-key-do-not-use-in-production';

/**
 * Creates auth routes
 * @param {Pool} pool - Database connection pool
 * @returns {Router} Express router with auth endpoints
 */
function createAuthRouter(pool) {
  const router = express.Router();

  /**
   * POST /auth/login
   * Accept {email, password}
   * Return {user_id, email, role, token}
   * Verify password against hashed password in users table
   * Return 401 if no match
   */
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required'
        });
      }

      // Query user by email
      const userQuery = `
        SELECT id, email, password_hash, role
        FROM users
        WHERE email = $1
      `;

      const userResult = await pool.query(userQuery, [email]);

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          error: 'Invalid email or password'
        });
      }

      const user = userResult.rows[0];

      // Compare password (simple hash comparison for hackathon)
      const passwordHash = hashPassword(password);
      if (passwordHash !== user.password_hash) {
        return res.status(401).json({
          error: 'Invalid email or password'
        });
      }

      // Generate JWT token
      const token = generateJWT({
        user_id: user.id,
        role: user.role
      });

      return res.status(200).json({
        user_id: user.id,
        email: user.email,
        role: user.role,
        token: token
      });
    } catch (error) {
      console.error('Error in login:', error.message);
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * POST /auth/register
   * Accept {email, password, role}
   * Create a new user
   * Return {user_id, email, role, token}
   */
  router.post('/register', async (req, res) => {
    try {
      const { email, password, role } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required'
        });
      }

      const userRole = role || 'citizen';

      // Check if user already exists
      const checkQuery = `
        SELECT id FROM users WHERE email = $1
      `;

      const checkResult = await pool.query(checkQuery, [email]);

      if (checkResult.rows.length > 0) {
        return res.status(409).json({
          error: 'User with this email already exists'
        });
      }

      // Hash password and create user
      const passwordHash = hashPassword(password);

      const createQuery = `
        INSERT INTO users (email, password_hash, role)
        VALUES ($1, $2, $3)
        RETURNING id, email, role
      `;

      const createResult = await pool.query(createQuery, [email, passwordHash, userRole]);

      const user = createResult.rows[0];

      // Generate JWT token
      const token = generateJWT({
        user_id: user.id,
        role: user.role
      });

      return res.status(201).json({
        user_id: user.id,
        email: user.email,
        role: user.role,
        token: token
      });
    } catch (error) {
      console.error('Error in register:', error.message);
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  return router;
}

/**
 * Simple hash function for passwords (NOT SECURE - for hackathon only)
 * In production, use bcrypt or argon2
 * @param {string} password - Plain text password
 * @returns {string} Hash of password
 */
function hashPassword(password) {
  return crypto
    .createHash('sha256')
    .update(password + 'roadpulse-salt')
    .digest('hex');
}

/**
 * Generates a simple JWT token using HMAC
 * @param {Object} payload - Payload to encode
 * @returns {string} JWT token
 */
function generateJWT(payload) {
  // Header.Payload.Signature format
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64');

  // Create signature
  const message = `${header}.${payloadEncoded}`;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(message)
    .digest('base64');

  return `${message}.${signature}`;
}

module.exports = createAuthRouter;
