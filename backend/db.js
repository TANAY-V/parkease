const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'parkease.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Create Tables ────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    phone         TEXT,
    role          TEXT    NOT NULL DEFAULT 'user',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS parking_spaces (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT    NOT NULL,
    address         TEXT    NOT NULL,
    city            TEXT    NOT NULL,
    description     TEXT,
    price_per_hour  REAL    NOT NULL,
    vehicle_type    TEXT    NOT NULL DEFAULT 'both',
    available_from  TEXT    NOT NULL DEFAULT '00:00',
    available_to    TEXT    NOT NULL DEFAULT '23:59',
    total_spots     INTEGER NOT NULL DEFAULT 1,
    image_url       TEXT,
    latitude        REAL,
    longitude       REAL,
    is_active       INTEGER NOT NULL DEFAULT 1,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    space_id        INTEGER NOT NULL REFERENCES parking_spaces(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time      TEXT    NOT NULL,
    end_time        TEXT    NOT NULL,
    hours           REAL    NOT NULL,
    total_amount    REAL    NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'confirmed',
    payment_status  TEXT    NOT NULL DEFAULT 'unpaid',
    vehicle_number  TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    space_id    INTEGER NOT NULL REFERENCES parking_spaces(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id  INTEGER REFERENCES bookings(id),
    rating      INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(booking_id)
  );
`);

// ─── Seed Demo Data ───────────────────────────────────────────────────────────
const seedData = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (seedData.c === 0) {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('password123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, phone, role)
    VALUES (?, ?, ?, ?, ?)
  `);
  const owner1 = insertUser.run('Rajesh Kumar', 'rajesh@example.com', hash, '9876543210', 'user');
  const owner2 = insertUser.run('Priya Sharma', 'priya@example.com', hash, '9123456789', 'user');
  insertUser.run('Arjun Patel', 'arjun@example.com', hash, '9988776655', 'user');

  const insertSpace = db.prepare(`
    INSERT INTO parking_spaces
      (owner_id, title, address, city, description, price_per_hour, vehicle_type, available_from, available_to, total_spots, image_url, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSpace.run(
    owner1.lastInsertRowid,
    'Covered Parking near MG Road',
    '42, Brigade Road, Near MG Road Metro, Bengaluru',
    'Bengaluru',
    'Secure covered parking with CCTV surveillance. Walking distance from MG Road metro station. Available for cars and bikes.',
    20, 'both', '06:00', '22:00', 3,
    'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800',
    12.9716, 77.5946
  );
  insertSpace.run(
    owner1.lastInsertRowid,
    'Residential Garage - Koramangala',
    '15, 5th Block, Koramangala, Bengaluru',
    'Bengaluru',
    'Private residential garage available on weekdays. Safe neighbourhood, well-lit, easy access.',
    15, 'car', '09:00', '21:00', 1,
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    12.9352, 77.6245
  );
  insertSpace.run(
    owner2.lastInsertRowid,
    'Open Parking - Connaught Place',
    'Block A, Connaught Place, New Delhi',
    'New Delhi',
    'Spacious open parking lot in the heart of CP. 24/7 security guard on duty.',
    25, 'both', '00:00', '23:59', 10,
    'https://images.unsplash.com/photo-1470224114660-3f6686c562eb?w=800',
    28.6315, 77.2167
  );
  insertSpace.run(
    owner2.lastInsertRowid,
    'Basement Parking - Bandra West',
    'Sea View Apartments, Bandra West, Mumbai',
    'Mumbai',
    'Underground basement parking with automatic barriers. Very secure location near Bandra station.',
    30, 'car', '05:00', '23:00', 5,
    'https://images.unsplash.com/photo-1541447271487-09612b3f49f7?w=800',
    19.0596, 72.8295
  );
  insertSpace.run(
    owner1.lastInsertRowid,
    'Bike Parking - T Nagar',
    'Near Pondy Bazaar, T Nagar, Chennai',
    'Chennai',
    'Dedicated two-wheeler parking. Covered shed, no sun damage. Very affordable rates.',
    8, 'bike', '07:00', '21:00', 15,
    'https://images.unsplash.com/photo-1619551734325-81aaf323686c?w=800',
    13.0418, 80.2341
  );
  insertSpace.run(
    owner2.lastInsertRowid,
    'Premium Parking - Hitech City',
    'Cyber Towers, Hitech City, Hyderabad',
    'Hyderabad',
    'Premium parking near tech parks. Perfect for IT professionals. Monthly packages available.',
    18, 'both', '06:00', '22:00', 8,
    'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=800',
    17.4474, 78.3762
  );

  console.log('✅ Database seeded with demo data');
}

module.exports = db;
