const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const JWT_SECRET = process.env.JWT_SECRET || 'roadpulse-hackathon-secret-key-do-not-use-in-production';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '7d';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';

function parseExpiration(exp) {
  const match = exp.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { d: 86400, h: 3600, m: 60, s: 1 };
  return val * (multipliers[unit] || 86400);
}

async function verifyGoogleCredential(credential) {
  if (!credential || typeof credential !== 'string') {
    throw new Error('Google credential is required');
  }

  // Verify ID token with Google
  const { data } = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
    params: { id_token: credential },
    timeout: 12000,
  });

  if (GOOGLE_CLIENT_ID && data.aud !== GOOGLE_CLIENT_ID) {
    throw new Error('Google token audience mismatch. Check GOOGLE_CLIENT_ID.');
  }

  const verified = data.email_verified === true || data.email_verified === 'true';
  if (!data.email || !verified) {
    throw new Error('Google account email is not verified');
  }

  return {
    email: String(data.email).toLowerCase(),
    name: data.name || data.email.split('@')[0],
    google_id: data.sub,
  };
}

async function upsertGoogleUser(pool, { email, name, google_id }) {
  const findResult = await pool.query(
    'SELECT id, email, role, department FROM users WHERE email = $1',
    [email]
  );

  if (findResult.rows.length > 0) {
    return { ...findResult.rows[0], name };
  }

  const passwordHash = hashPassword(`google:${google_id}:${Date.now()}`);
  const createResult = await pool.query(
    'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role, department',
    [email, passwordHash, 'citizen']
  );
  return { ...createResult.rows[0], name };
}

function createAuthRouter(pool) {
  const router = express.Router();

  router.get('/config', (_req, res) => {
    res.status(200).json({
      google_enabled: Boolean(GOOGLE_CLIENT_ID),
      google_client_id: GOOGLE_CLIENT_ID || null,
    });
  });

  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const userResult = await pool.query(
        'SELECT id, email, password_hash, role, department FROM users WHERE LOWER(email) = LOWER($1)',
        [email.trim()]
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
      if (String(password).length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const normalized = String(email).trim().toLowerCase();
      const checkResult = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [normalized]);
      if (checkResult.rows.length > 0) {
        return res.status(409).json({ error: 'User with this email already exists. Sign in instead.' });
      }

      const createResult = await pool.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
        [normalized, hashPassword(password), 'citizen']
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

  /**
   * Google Sign-In
   * Preferred body: { credential } — GIS ID token from account picker
   * Legacy/demo body: { email, name, google_id } — only if ALLOW_DEMO_GOOGLE=true
   */
  router.post('/google', async (req, res) => {
    try {
      let profile;

      if (req.body.credential) {
        profile = await verifyGoogleCredential(req.body.credential);
      } else if (process.env.ALLOW_DEMO_GOOGLE === 'true' && req.body.email) {
        profile = {
          email: String(req.body.email).trim().toLowerCase(),
          name: req.body.name || String(req.body.email).split('@')[0],
          google_id: req.body.google_id || `demo-${req.body.email}`,
        };
      } else {
        return res.status(400).json({
          error: 'Google Sign-In requires a credential from the Google account picker. Set VITE_GOOGLE_CLIENT_ID / GOOGLE_CLIENT_ID.',
        });
      }

      const user = await upsertGoogleUser(pool, profile);

      return res.status(200).json({
        user_id: user.id,
        email: user.email,
        role: user.role,
        department: user.department || null,
        name: user.name || profile.name,
        provider: 'google',
        token: generateJWT({ user_id: user.id, role: user.role, department: user.department }),
      });
    } catch (error) {
      console.error('Error in google login:', error.message);
      const status = error.response?.status === 400 ? 401 : 500;
      return res.status(status).json({
        error: error.message || 'Google sign-in failed',
        message: error.message,
      });
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
