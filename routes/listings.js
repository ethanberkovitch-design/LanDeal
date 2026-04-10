const express = require('express');
const { getDb, saveDatabase } = require('../database');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

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

router.get('/', (req, res) => {
  const db = getDb();
  const { type, location, min_price, max_price, search } = req.query;
  let query = "SELECT * FROM land_listings WHERE status = 'available'";
  const params = [];

  if (type) {
    query += " AND listing_type = ?";
    params.push(type);
  }
  if (location) {
    query += " AND location LIKE ?";
    params.push(`%${location}%`);
  }
  if (min_price) {
    query += " AND total_price >= ?";
    params.push(Number(min_price));
  }
  if (max_price) {
    query += " AND total_price <= ?";
    params.push(Number(max_price));
  }
  if (search) {
    query += " AND (title LIKE ? OR description LIKE ? OR location LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += " ORDER BY created_at DESC";
  const result = db.exec(query, params);
  res.json(rowsToObjects(result));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const result = db.exec("SELECT * FROM land_listings WHERE id = ?", [req.params.id]);
  const listings = rowsToObjects(result);
  if (!listings.length) {
    return res.status(404).json({ error: 'הצעה לא נמצאה' });
  }
  res.json(listings[0]);
});

router.get('/packages/all', (req, res) => {
  const db = getDb();
  const packages = rowsToObjects(db.exec("SELECT * FROM investment_packages WHERE status = 'available'"));

  for (const pkg of packages) {
    const items = db.exec(
      `SELECT pi.*, ll.title, ll.location, ll.price_per_sqm, ll.description, ll.lat, ll.lng
       FROM package_items pi
       JOIN land_listings ll ON pi.listing_id = ll.id
       WHERE pi.package_id = ?`,
      [pkg.id]
    );
    pkg.items = rowsToObjects(items);
  }
  res.json(packages);
});

router.post('/packages/custom', (req, res) => {
  const db = getDb();
  const { budget } = req.body;
  if (!budget || budget < 30000) {
    return res.status(400).json({ error: 'סכום השקעה מינימלי: 30,000 ₪' });
  }

  const investmentListings = rowsToObjects(
    db.exec("SELECT * FROM land_listings WHERE listing_type = 'investment' AND status = 'available' ORDER BY RANDOM()")
  );

  if (investmentListings.length < 2) {
    return res.status(400).json({ error: 'אין מספיק קרקעות זמינות כרגע' });
  }

  const packages = [];
  for (let i = 0; i < 3; i++) {
    let remaining = budget;
    const items = [];
    const shuffled = [...investmentListings].sort(() => Math.random() - 0.5);

    for (const listing of shuffled) {
      if (remaining <= 0) break;
      const maxArea = Math.floor(remaining / listing.price_per_sqm);
      if (maxArea >= 5) {
        const area = Math.min(maxArea, Math.floor(Math.random() * 15) + 5);
        const cost = area * listing.price_per_sqm;
        items.push({
          listing_id: listing.id,
          title: listing.title,
          location: listing.location,
          area_sqm: area,
          price_per_sqm: listing.price_per_sqm,
          cost: cost,
          lat: listing.lat,
          lng: listing.lng
        });
        remaining -= cost;
      }
    }

    if (items.length >= 2) {
      const totalCost = items.reduce((sum, item) => sum + item.cost, 0);
      packages.push({
        name: `הצעה מותאמת ${i + 1}`,
        total_price: totalCost,
        description: `תמהיל מותאם לסכום של ${budget.toLocaleString()} ₪`,
        items
      });
    }
  }

  res.json(packages);
});

router.post('/', authMiddleware, (req, res) => {
  const db = getDb();
  const { title, location, area_sqm, price_per_sqm, listing_type, description, has_building_rights, apartment_size, project_name, company_name } = req.body;

  if (!title || !location || !area_sqm || !price_per_sqm || !listing_type) {
    return res.status(400).json({ error: 'נא למלא את כל השדות הנדרשים' });
  }

  const total_price = area_sqm * price_per_sqm;
  db.run(
    `INSERT INTO land_listings (title, location, area_sqm, price_per_sqm, total_price, listing_type, description, has_building_rights, apartment_size, project_name, company_name, owner_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, location, area_sqm, price_per_sqm, total_price, listing_type, description || '', has_building_rights || 0, apartment_size || 0, project_name || '', company_name || '', req.user.id]
  );
  saveDatabase();
  const id = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
  res.json({ id, message: 'הקרקע נוספה בהצלחה' });
});

module.exports = router;
