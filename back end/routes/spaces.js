const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/spaces — list all spaces with filters
router.get('/', (req, res) => {
  const { city, vehicle_type, min_price, max_price, search } = req.query;

  let query = `
    SELECT ps.*,
           u.name AS owner_name,
           COALESCE(AVG(r.rating), 0) AS avg_rating,
           COUNT(r.id) AS review_count
    FROM parking_spaces ps
    JOIN users u ON u.id = ps.owner_id
    LEFT JOIN reviews r ON r.space_id = ps.id
    WHERE ps.is_active = 1
  `;
  const params = [];

  if (city) {
    query += ` AND LOWER(ps.city) LIKE LOWER(?)`;
    params.push(`%${city}%`);
  }
  if (vehicle_type && vehicle_type !== 'all') {
    query += ` AND (ps.vehicle_type = ? OR ps.vehicle_type = 'both')`;
    params.push(vehicle_type);
  }
  if (min_price) {
    query += ` AND ps.price_per_hour >= ?`;
    params.push(parseFloat(min_price));
  }
  if (max_price) {
    query += ` AND ps.price_per_hour <= ?`;
    params.push(parseFloat(max_price));
  }
  if (search) {
    query += ` AND (LOWER(ps.title) LIKE LOWER(?) OR LOWER(ps.address) LIKE LOWER(?) OR LOWER(ps.city) LIKE LOWER(?))`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ` GROUP BY ps.id ORDER BY ps.created_at DESC`;

  const spaces = db.prepare(query).all(...params);
  res.json({ spaces });
});

// GET /api/spaces/my — my listed spaces (owner)
router.get('/my', authMiddleware, (req, res) => {
  const spaces = db.prepare(`
    SELECT ps.*,
           COALESCE(AVG(r.rating), 0) AS avg_rating,
           COUNT(DISTINCT r.id) AS review_count,
           COUNT(DISTINCT b.id) AS total_bookings,
           COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount ELSE 0 END), 0) AS total_earnings
    FROM parking_spaces ps
    LEFT JOIN reviews r ON r.space_id = ps.id
    LEFT JOIN bookings b ON b.space_id = ps.id
    WHERE ps.owner_id = ?
    GROUP BY ps.id
    ORDER BY ps.created_at DESC
  `).all(req.user.id);
  res.json({ spaces });
});

// GET /api/spaces/:id — single space detail
router.get('/:id', (req, res) => {
  const space = db.prepare(`
    SELECT ps.*,
           u.name AS owner_name, u.phone AS owner_phone,
           COALESCE(AVG(r.rating), 0) AS avg_rating,
           COUNT(r.id) AS review_count
    FROM parking_spaces ps
    JOIN users u ON u.id = ps.owner_id
    LEFT JOIN reviews r ON r.space_id = ps.id
    WHERE ps.id = ?
    GROUP BY ps.id
  `).get(req.params.id);

  if (!space) return res.status(404).json({ error: 'Parking space not found.' });

  const reviews = db.prepare(`
    SELECT r.*, u.name AS user_name
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    WHERE r.space_id = ?
    ORDER BY r.created_at DESC
    LIMIT 10
  `).all(req.params.id);

  res.json({ space, reviews });
});

// POST /api/spaces — create listing
router.post('/', authMiddleware, (req, res) => {
  const { title, address, city, description, price_per_hour, vehicle_type, available_from, available_to, total_spots, image_url, latitude, longitude } = req.body;

  if (!title || !address || !city || !price_per_hour) {
    return res.status(400).json({ error: 'Title, address, city and price are required.' });
  }

  const result = db.prepare(`
    INSERT INTO parking_spaces
      (owner_id, title, address, city, description, price_per_hour, vehicle_type, available_from, available_to, total_spots, image_url, latitude, longitude)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id, title, address, city,
    description || null, parseFloat(price_per_hour),
    vehicle_type || 'both',
    available_from || '00:00', available_to || '23:59',
    parseInt(total_spots) || 1,
    image_url || null,
    latitude ? parseFloat(latitude) : null,
    longitude ? parseFloat(longitude) : null
  );

  const space = db.prepare('SELECT * FROM parking_spaces WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ space });
});

// PUT /api/spaces/:id — update listing
router.put('/:id', authMiddleware, (req, res) => {
  const space = db.prepare('SELECT * FROM parking_spaces WHERE id = ?').get(req.params.id);
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  if (space.owner_id !== req.user.id) return res.status(403).json({ error: 'Forbidden.' });

  const { title, address, city, description, price_per_hour, vehicle_type, available_from, available_to, total_spots, image_url, is_active } = req.body;

  db.prepare(`
    UPDATE parking_spaces SET
      title = ?, address = ?, city = ?, description = ?,
      price_per_hour = ?, vehicle_type = ?,
      available_from = ?, available_to = ?,
      total_spots = ?, image_url = ?, is_active = ?
    WHERE id = ?
  `).run(
    title || space.title, address || space.address, city || space.city,
    description !== undefined ? description : space.description,
    price_per_hour ? parseFloat(price_per_hour) : space.price_per_hour,
    vehicle_type || space.vehicle_type,
    available_from || space.available_from, available_to || space.available_to,
    total_spots ? parseInt(total_spots) : space.total_spots,
    image_url !== undefined ? image_url : space.image_url,
    is_active !== undefined ? (is_active ? 1 : 0) : space.is_active,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM parking_spaces WHERE id = ?').get(req.params.id);
  res.json({ space: updated });
});

// DELETE /api/spaces/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const space = db.prepare('SELECT * FROM parking_spaces WHERE id = ?').get(req.params.id);
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  if (space.owner_id !== req.user.id) return res.status(403).json({ error: 'Forbidden.' });

  db.prepare('DELETE FROM parking_spaces WHERE id = ?').run(req.params.id);
  res.json({ message: 'Space deleted successfully.' });
});

module.exports = router;
