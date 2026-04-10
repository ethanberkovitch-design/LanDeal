const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'landeal.db');
let db;

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password TEXT NOT NULL,
      user_type TEXT DEFAULT 'buyer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS land_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      location TEXT NOT NULL,
      area_sqm REAL NOT NULL,
      price_per_sqm REAL NOT NULL,
      total_price REAL NOT NULL,
      listing_type TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      status TEXT DEFAULT 'available',
      owner_id INTEGER,
      has_building_rights INTEGER DEFAULT 0,
      apartment_size REAL,
      project_name TEXT,
      company_name TEXT,
      lat REAL,
      lng REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS investment_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      total_price REAL NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'available',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS package_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER NOT NULL,
      listing_id INTEGER NOT NULL,
      area_sqm REAL NOT NULL,
      FOREIGN KEY (package_id) REFERENCES investment_packages(id),
      FOREIGN KEY (listing_id) REFERENCES land_listings(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer_id INTEGER NOT NULL,
      listing_id INTEGER,
      package_id INTEGER,
      transaction_type TEXT NOT NULL,
      total_amount REAL NOT NULL,
      deposit_amount REAL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (buyer_id) REFERENCES users(id),
      FOREIGN KEY (listing_id) REFERENCES land_listings(id),
      FOREIGN KEY (package_id) REFERENCES investment_packages(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS seller_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      seller_type TEXT NOT NULL,
      location TEXT,
      owner_name TEXT,
      total_area REAL,
      sale_area REAL,
      ownership_details TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  seedData();
  saveDatabase();
  return db;
}

function seedData() {
  const count = db.exec("SELECT COUNT(*) as c FROM land_listings");
  if (count[0] && count[0].values[0][0] > 0) return;

  const listings = [
    { title: 'זכות לדירה בזיכרון יעקב', location: 'זיכרון יעקב', area: 100, ppm: 3500, type: 'apartment', desc: 'מתחם הרכבת – פרויקט חדש עם זכויות בנייה מאושרות. מיקום מעולה בסמוך לתחנת הרכבת.', building: 1, aptSize: 100, project: 'מתחם הרכבת', company: 'אלמוג נדל"ן', lat: 32.5710, lng: 34.9537 },
    { title: 'זכות לדירה בבאר יעקב', location: 'באר יעקב', area: 100, ppm: 3200, type: 'apartment', desc: 'פרויקט מגורים חדש באזור ביקוש. קרבה למרכז ולצירי תחבורה ראשיים.', building: 1, aptSize: 100, project: 'פארק הירוק', company: 'שיכון ובינוי', lat: 31.9436, lng: 34.8339 },
    { title: 'זכות לדירה בגדרה', location: 'גדרה', area: 90, ppm: 2800, type: 'apartment', desc: 'קרקע עם תב"ע מאושרת לבנייה רוויה. אזור מתפתח עם ביקוש גובר.', building: 1, aptSize: 90, project: 'גני גדרה', company: 'אאורה', lat: 31.8145, lng: 34.7782 },
    { title: 'זכות לדירה בנתניה', location: 'נתניה', area: 110, ppm: 4200, type: 'apartment', desc: 'פרויקט יוקרתי בסמוך לים. תוכנית בנייה מאושרת ל-15 קומות.', building: 1, aptSize: 110, project: 'מגדלי הים', company: 'גינדי', lat: 32.3215, lng: 34.8532 },
    { title: 'זכות לדירה בחריש', location: 'חריש', area: 95, ppm: 2500, type: 'apartment', desc: 'עיר צעירה ומתפתחת. מחירים נוחים עם פוטנציאל עליית ערך משמעותי.', building: 1, aptSize: 95, project: 'שכונת הפארק', company: 'שפיר', lat: 32.4564, lng: 35.0444 },
    { title: 'זכות לדירה בראשון לציון', location: 'ראשון לציון', area: 85, ppm: 4800, type: 'apartment', desc: 'מיקום מרכזי בראשל"צ המערבית. קרבה לפארק ולמרכזי מסחר.', building: 1, aptSize: 85, project: 'פארק המייסדים', company: 'יובלים', lat: 31.9730, lng: 34.7925 },

    { title: 'קרקע חקלאית בבאר יעקב', location: 'באר יעקב', area: 500, ppm: 1800, type: 'investment', desc: 'קרקע חקלאית בשלבי הפשרה מתקדמים. צפי לשינוי ייעוד תוך 3-5 שנים.', building: 0, aptSize: 0, project: '', company: '', lat: 31.9450, lng: 34.8350 },
    { title: 'קרקע חקלאית בזיכרון יעקב', location: 'זיכרון יעקב', area: 800, ppm: 1500, type: 'investment', desc: 'קרקע במיקום אסטרטגי עם תוכניות פיתוח עירוניות בתהליך. פוטנציאל גבוה.', building: 0, aptSize: 0, project: '', company: '', lat: 32.5720, lng: 34.9550 },
    { title: 'קרקע חקלאית בגדרה', location: 'גדרה', area: 600, ppm: 1600, type: 'investment', desc: 'ממוקמת באזור ביקוש גובר. תוכניות מתאר חדשות בשלבי אישור.', building: 0, aptSize: 0, project: '', company: '', lat: 31.8160, lng: 34.7790 },
    { title: 'קרקע חקלאית בנתניה', location: 'נתניה', area: 400, ppm: 2200, type: 'investment', desc: 'קרקע בפריפריית נתניה עם פוטנציאל לבנייה רוויה.', building: 0, aptSize: 0, project: '', company: '', lat: 32.3230, lng: 34.8550 },
    { title: 'קרקע חקלאית בחדרה', location: 'חדרה', area: 700, ppm: 1200, type: 'investment', desc: 'שטח נרחב עם גישה נוחה. אזור עם פיתוח תשתיות מואץ.', building: 0, aptSize: 0, project: '', company: '', lat: 32.4340, lng: 34.9198 },
    { title: 'קרקע חקלאית באור עקיבא', location: 'אור עקיבא', area: 550, ppm: 1400, type: 'investment', desc: 'קרבה לקו הרכבת. תוכניות פיתוח משמעותיות בשנים הקרובות.', building: 0, aptSize: 0, project: '', company: '', lat: 32.5082, lng: 34.9200 },
  ];

  const stmt = `INSERT INTO land_listings (title, location, area_sqm, price_per_sqm, total_price, listing_type, description, has_building_rights, apartment_size, project_name, company_name, lat, lng, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`;

  for (const l of listings) {
    db.run(stmt, [l.title, l.location, l.area, l.ppm, l.area * l.ppm, l.type, l.desc, l.building, l.aptSize, l.project, l.company, l.lat, l.lng]);
  }

  const packages = [
    { name: 'חבילת השקעה א׳ – מרכז', price: 55000, desc: 'תמהיל מגוון באזור המרכז – באר יעקב, גדרה וזיכרון יעקב', items: [[7, 10], [9, 8], [8, 12]] },
    { name: 'חבילת השקעה ב׳ – שרון', price: 78000, desc: 'תמהיל באזור השרון – נתניה, חדרה ואור עקיבא', items: [[10, 12], [11, 17], [12, 15]] },
    { name: 'חבילת השקעה ג׳ – פריפריה', price: 50000, desc: 'תמהיל מגוון בפריפריה עם פוטנציאל צמיחה גבוה', items: [[11, 15], [12, 10], [9, 10]] },
  ];

  for (const pkg of packages) {
    db.run(`INSERT INTO investment_packages (name, total_price, description, status) VALUES (?, ?, ?, 'available')`, [pkg.name, pkg.price, pkg.desc]);
    const pkgId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
    for (const [listingId, area] of pkg.items) {
      db.run(`INSERT INTO package_items (package_id, listing_id, area_sqm) VALUES (?, ?, ?)`, [pkgId, listingId, area]);
    }
  }

  console.log('Database seeded with sample data');
}

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function getDb() {
  return db;
}

module.exports = { initDatabase, getDb, saveDatabase };
