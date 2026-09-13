const { Pool } = require('pg');

// Connection pool — uses DATABASE_URL env var on Vercel/Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper: run a query
async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// ─── Initialize Tables ────────────────────────────────────────────────────────
async function initDB() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      phone         TEXT,
      role          TEXT    NOT NULL DEFAULT 'user',
      created_at    TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS parking_spaces (
      id              SERIAL PRIMARY KEY,
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
      created_at      TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id              SERIAL PRIMARY KEY,
      space_id        INTEGER NOT NULL REFERENCES parking_spaces(id) ON DELETE CASCADE,
      user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      start_time      TEXT    NOT NULL,
      end_time        TEXT    NOT NULL,
      hours           REAL    NOT NULL,
      total_amount    REAL    NOT NULL,
      status          TEXT    NOT NULL DEFAULT 'confirmed',
      payment_status  TEXT    NOT NULL DEFAULT 'unpaid',
      vehicle_number  TEXT,
      created_at      TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id          SERIAL PRIMARY KEY,
      space_id    INTEGER NOT NULL REFERENCES parking_spaces(id) ON DELETE CASCADE,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      booking_id  INTEGER REFERENCES bookings(id),
      rating      INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment     TEXT,
      created_at  TIMESTAMP DEFAULT NOW(),
      UNIQUE(booking_id)
    );
  `);

  // Seed data if empty
  const { rows } = await query('SELECT COUNT(*) as c FROM users');
  if (parseInt(rows[0].c) === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('password123', 10);

    const r1 = await query(
      'INSERT INTO users (name, email, password_hash, phone) VALUES ($1,$2,$3,$4) RETURNING id',
      ['Rajesh Kumar', 'rajesh@example.com', hash, '9876543210']
    );
    const r2 = await query(
      'INSERT INTO users (name, email, password_hash, phone) VALUES ($1,$2,$3,$4) RETURNING id',
      ['Priya Sharma', 'priya@example.com', hash, '9123456789']
    );
    await query(
      'INSERT INTO users (name, email, password_hash, phone) VALUES ($1,$2,$3,$4)',
      ['Arjun Patel', 'arjun@example.com', hash, '9988776655']
    );

    const owner1 = r1.rows[0].id;
    const owner2 = r2.rows[0].id;

    const spaces = [
      [owner1, 'Covered Parking near MG Road', '42, Brigade Road, Near MG Road Metro, Bengaluru', 'Bengaluru',
       'Secure covered parking with CCTV surveillance. Walking distance from MG Road metro station.',
       20, 'both', '06:00', '22:00', 3, 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800', 12.9716, 77.5946],
      [owner1, 'Residential Garage - Koramangala', '15, 5th Block, Koramangala, Bengaluru', 'Bengaluru',
       'Private residential garage available on weekdays. Safe neighbourhood, well-lit, easy access.',
       15, 'car', '09:00', '21:00', 1, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', 12.9352, 77.6245],
      [owner2, 'Open Parking - Connaught Place', 'Block A, Connaught Place, New Delhi', 'New Delhi',
       'Spacious open parking lot in the heart of CP. 24/7 security guard on duty.',
       25, 'both', '00:00', '23:59', 10, 'https://images.unsplash.com/photo-1470224114660-3f6686c562eb?w=800', 28.6315, 77.2167],
      [owner2, 'Basement Parking - Bandra West', 'Sea View Apartments, Bandra West, Mumbai', 'Mumbai',
       'Underground basement parking with automatic barriers. Very secure location near Bandra station.',
       30, 'car', '05:00', '23:00', 5, 'https://images.unsplash.com/photo-1541447271487-09612b3f49f7?w=800', 19.0596, 72.8295],
      [owner1, 'Bike Parking - T Nagar', 'Near Pondy Bazaar, T Nagar, Chennai', 'Chennai',
       'Dedicated two-wheeler parking. Covered shed, no sun damage. Very affordable rates.',
       8, 'bike', '07:00', '21:00', 15, 'https://images.unsplash.com/photo-1619551734325-81aaf323686c?w=800', 13.0418, 80.2341],
      [owner2, 'Premium Parking - Hitech City', 'Cyber Towers, Hitech City, Hyderabad', 'Hyderabad',
       'Premium parking near tech parks. Perfect for IT professionals. Monthly packages available.',
       18, 'both', '06:00', '22:00', 8, 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=800', 17.4474, 78.3762]
    ];

    for (const s of spaces) {
      await query(
        `INSERT INTO parking_spaces
          (owner_id,title,address,city,description,price_per_hour,vehicle_type,available_from,available_to,total_spots,image_url,latitude,longitude)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        s
      );
    }
    console.log('✅ Database seeded with demo data');
  }
}

module.exports = { query, initDB };
