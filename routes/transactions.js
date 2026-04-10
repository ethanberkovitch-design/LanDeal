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

router.post('/order', authMiddleware, (req, res) => {
  const db = getDb();
  const { listing_id, package_id, transaction_type } = req.body;

  let total_amount = 0;
  if (transaction_type === 'apartment' && listing_id) {
    const listing = rowsToObjects(db.exec("SELECT * FROM land_listings WHERE id = ?", [listing_id]));
    if (!listing.length) return res.status(404).json({ error: 'הצעה לא נמצאה' });
    total_amount = listing[0].total_price;
  } else if (transaction_type === 'investment' && package_id) {
    const pkg = rowsToObjects(db.exec("SELECT * FROM investment_packages WHERE id = ?", [package_id]));
    if (!pkg.length) return res.status(404).json({ error: 'חבילה לא נמצאה' });
    total_amount = pkg[0].total_price;
  } else {
    return res.status(400).json({ error: 'סוג עסקה לא תקין' });
  }

  const deposit = total_amount * 0.025;

  db.run(
    `INSERT INTO transactions (buyer_id, listing_id, package_id, transaction_type, total_amount, deposit_amount, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [req.user.id, listing_id || null, package_id || null, transaction_type, total_amount, deposit]
  );
  saveDatabase();
  const id = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
  res.json({ id, total_amount, deposit_amount: deposit, message: 'ההזמנה נוצרה בהצלחה' });
});

router.get('/my', authMiddleware, (req, res) => {
  const db = getDb();
  const result = db.exec(
    `SELECT t.*, ll.title as listing_title, ll.location as listing_location, ip.name as package_name
     FROM transactions t
     LEFT JOIN land_listings ll ON t.listing_id = ll.id
     LEFT JOIN investment_packages ip ON t.package_id = ip.id
     WHERE t.buyer_id = ?
     ORDER BY t.created_at DESC`,
    [req.user.id]
  );
  res.json(rowsToObjects(result));
});

module.exports = router;
