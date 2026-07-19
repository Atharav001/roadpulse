const express = require('express');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'roadpulse-hackathon-secret-key-do-not-use-in-production';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '7d';

function parseExpiration(exp) {
  const match = exp.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { d: 86400, h: 3600, m: 60, s: 1 };
  return val * (multipliers[unit] || 86400);
}

function createAuthRouter(pool) {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const userResult = await pool.query(
        'SELECT id, email, password_hash, role, department FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = userResult.rows[0];
      if (hashPassword(password) !== user.password_hash) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      return res.status(200).json({
        user_id: user.id,
        email: user.email,
        role: user.role,
        department: user.department || null,
        token: generateJWT({ user_id: user.id, role: user.role, department: user.department }),
      });
    } catch (error) {
      console.error('Error in login:', error.message);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  router.post('/register', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const checkResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (checkResult.rows.length > 0) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      const createResult = await pool.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
        [email, hashPassword(password), 'citizen']
      );

      const user = createResult.rows[0];
      return res.status(201).json({
        user_id: user.id,
        email: user.email,
        role: user.role,
        department: null,
        token: generateJWT({ user_id: user.id, role: user.role }),
      });
    } catch (error) {
      console.error('Error in register:', error.message);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  router.post('/device-login', async (req, res) => {
    try {
      const { device_id } = req.body;
      if (!device_id || typeof device_id !== 'string' || device_id.trim().length === 0) {
        return res.status(400).json({ error: 'device_id is required' });
      }

      const trimmedId = device_id.trim();
      const findResult = await pool.query('SELECT id, email, role FROM users WHERE email = $1', [trimmedId]);

      let user;
      if (findResult.rows.length > 0) {
        user = findResult.rows[0];
      } else {
        const createResult = await pool.query(
          'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
          [trimmedId, 'device-login-no-password', 'citizen']
        );
        user = createResult.rows[0];
      }

      return res.status(200).json({
        user_id: user.id,
        email: user.email,
        role: user.role,
        department: null,
        token: generateJWT({ user_id: user.id, role: user.role }),
      });
    } catch (error) {
      console.error('Error in device-login:', error.message);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  });

  return router;
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'roadpulse-salt').digest('hex');
}

function generateJWT(payload) {
  const expSeconds = parseExpiration(JWT_EXPIRATION);
  const fullPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + expSeconds };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadEncoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const message = `${header}.${payloadEncoded}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(message).digest('base64url');
  return `${message}.${signature}`;
}

module.exports = createAuthRouter;
