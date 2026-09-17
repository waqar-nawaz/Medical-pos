const jwt = require('jsonwebtoken');
const { config } = require('../config/env');

function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      if (!required) return next();
      return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });
    }

    try {
      req.user = jwt.verify(token, config.jwtSecret);
      return next();
    } catch {
      return res.status(401).json({ ok: false, error: { message: 'Invalid token' } });
    }
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ ok: false, error: { message: 'Forbidden' } });
    }
    next();
  };
}

function requirePermission(perm) {
  return (req, res, next) => {
    const u = req.user;
    if (!u) return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });
    if (u.role === 'admin') return next();
    const perms = Array.isArray(u.permissions) ? u.permissions : [];
    const method = req.method || 'GET';

    // A POS cashier needs read-only access to the supporting data required to
    // bill a customer, even without the matching standalone permission.
    const posFallback =
      perms.includes('pos') &&
      (perm === 'sales' ||
        (perm === 'products' && method === 'GET') ||
        (perm === 'customers' && (method === 'GET' || method === 'POST')) ||
        (perm === 'settings' && method === 'GET'));

    if (perms.includes(perm) || posFallback) return next();
    return res.status(403).json({ ok: false, error: { message: 'Forbidden' } });
  };
}

module.exports = { auth, requireRole, requirePermission };
