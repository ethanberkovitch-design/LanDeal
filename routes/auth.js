const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, saveDatabase } = require('../database');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { full_name, email, phone, password, user_type } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'נא למלא את כל השדות הנדרשים' });
    }
    const db = getDb();
    const existing = db.exec("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.status(400).json({ error: 'כתובת האימייל כבר רשומה במערכת' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      "INSERT INTO users (full_name, email, phone, password, user_type) VALUES (?, ?, ?, ?, ?)",
      [full_name, email, phone || '', hashedPassword, user_type || 'buyer']
    );
    const result = db.exec("SELECT last_insert_rowid()");
    const userId = result[0].values[0][0];
    saveDatabase();
    const token = jwt.sign({ id: userId, email, full_name, user_type: user_type || 'buyer' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: userId, full_name, email, user_type: user_type || 'buyer' } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'שגיאה בהרשמה' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'נא למלא אימייל וסיסמה' });
    }
    const db = getDb();
    const result = db.exec("SELECT * FROM users WHERE email = ?", [email]);
    if (!result.length || !result[0].values.length) {
      return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    }
    const cols = result[0].columns;
    const row = result[0].values[0];
    const user = {};
    cols.forEach((col, i) => user[col] = row[i]);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, full_name: user.full_name, user_type: user.user_type }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, full_name: user.full_name, email: user.email, user_type: user.user_type } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'שגיאה בהתחברות' });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const result = db.exec("SELECT id, full_name, email, phone, user_type, created_at FROM users WHERE id = ?", [req.user.id]);
  if (!result.length || !result[0].values.length) {
    return res.status(404).json({ error: 'משתמש לא נמצא' });
  }
  const cols = result[0].columns;
  const row = result[0].values[0];
  const user = {};
  cols.forEach((col, i) => user[col] = row[i]);
  res.json(user);
});

module.exports = router;
