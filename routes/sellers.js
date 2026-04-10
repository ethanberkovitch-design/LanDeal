const express = require('express');
const { getDb, saveDatabase } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function rowsToObjects(result) {
  if (!result.length || !result[0].values.length) return [];
  const cols = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    cols.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

router.post('/request', authMiddleware, (req, res) => {
  const db = getDb();
  const { seller_type, location, owner_name, total_area, sale_area, ownership_details } = req.body;

  if (!seller_type) {
    return res.status(400).json({ error: 'נא לבחור סוג מוכר' });
  }

  db.run(
    `INSERT INTO seller_requests (user_id, seller_type, location, owner_name, total_area, sale_area, ownership_details, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [req.user.id, seller_type, location || '', owner_name || '', total_area || 0, sale_area || 0, ownership_details || '']
  );
  saveDatabase();
  const id = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
  res.json({ id, message: 'הבקשה נשלחה בהצלחה. נחזור אליך תוך 72 שעות.' });
});

router.get('/my-listings', authMiddleware, (req, res) => {
  const db = getDb();
  const result = db.exec(
    "SELECT * FROM land_listings WHERE owner_id = ? ORDER BY created_at DESC",
    [req.user.id]
  );
  res.json(rowsToObjects(result));
});

router.get('/my-requests', authMiddleware, (req, res) => {
  const db = getDb();
  const result = db.exec(
    "SELECT * FROM seller_requests WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.id]
  );
  res.json(rowsToObjects(result));
});

module.exports = router;
