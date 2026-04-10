const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'landeal_secret_key_2024';

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'נדרשת התחברות' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'טוקן לא תקין' });
  }
}

function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {}
  }
  next();
}

module.exports = { authMiddleware, optionalAuth, JWT_SECRET };
