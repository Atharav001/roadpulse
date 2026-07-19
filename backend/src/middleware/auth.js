const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'roadpulse-hackathon-secret-key-do-not-use-in-production';

/** Normalize base64 / base64url so verify matches tokens signed either way */
function normalizeB64(s) {
  return String(s || '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function verifyJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const message = `${header}.${payload}`;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(message).digest('base64url');

    if (normalizeB64(signature) !== normalizeB64(expected)) return null;

    // base64url decode payload
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    const decoded = JSON.parse(Buffer.from(padded + pad, 'base64').toString('utf8'));

    if (decoded.exp && Date.now() >= decoded.exp * 1000) return null;

    return decoded;
  } catch {
    return null;
  }
}

function extractToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const decoded = verifyJWT(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.user = decoded;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (token) {
    const decoded = verifyJWT(token);
    if (decoded) req.user = decoded;
  }
  next();
}

module.exports = { verifyJWT, requireAuth, requireRole, optionalAuth };
