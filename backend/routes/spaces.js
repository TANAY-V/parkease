const express = require('express');
const { query } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/spaces — list all spaces with filters
router.get('/', async (req, res) => {
  try {
    const { city, vehicle_type, min_price, max_price, search } = req.query;

    let sql = `
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
    let idx = 1;

    if (city) {
      sql += ` AND LOWER(ps.city) LIKE LOWER($${idx++})`;
      params.push(`%${city}%`);
    }
    if (vehicle_type && vehicle_type !== 'all') {
      sql += ` AND (ps.vehicle_type = $${idx++} OR ps.vehicle_type = 'both')`;
      params.push(vehicle_type);
    }
    if (min_price) {
      sql += ` AND ps.price_per_hour >= $${idx++}`;
      params.push(parseFloat(min_price));
    }
    if (max_price) {
      sql += ` AND ps.price_per_hour <= $${idx++}`;
      params.push(parseFloat(max_price));
    }
    if (search) {
      sql += ` AND (LOWER(ps.title) LIKE LOWER($${idx}) OR LOWER(ps.address) LIKE LOWER($${idx}) OR LOWER(ps.city) LIKE LOWER($${idx}))`;
      params.push(`%${search}%`);
      idx++;
    }

    sql += ` GROUP BY ps.id, u.name ORDER BY ps.created_at DESC`;

    const result = await query(sql, params);
    res.json({ spaces: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/spaces/my — my listed spaces (owner)
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const result = await query(`
      SELECT ps.*,
             COALESCE(AVG(r.rating), 0) AS avg_rating,
             COUNT(DISTINCT r.id) AS review_count,
             COUNT(DISTINCT b.id) AS total_bookings,
             COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount ELSE 0 END), 0) AS total_earnings
      FROM parking_spaces ps
      LEFT JOIN reviews r ON r.space_id = ps.id
      LEFT JOIN bookings b ON b.space_id = ps.id
      WHERE ps.owner_id = $1
      GROUP BY ps.id
      ORDER BY ps.created_at DESC
    `, [req.user.id]);
    res.json({ spaces: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/spaces/:id — single space detail
router.get('/:id', async (req, res) => {
  try {
    const spaceRes = await query(`
      SELECT ps.*,
             u.name AS owner_name, u.phone AS owner_phone,
             COALESCE(AVG(r.rating), 0) AS avg_rating,
             COUNT(r.id) AS review_count
      FROM parking_spaces ps
      JOIN users u ON u.id = ps.owner_id
      LEFT JOIN reviews r ON r.space_id = ps.id
      WHERE ps.id = $1
      GROUP BY ps.id, u.name, u.phone
    `, [req.params.id]);

    const space = spaceRes.rows[0];
    if (!space) return res.status(404).json({ error: 'Parking space not found.' });

    const reviewsRes = await query(`
      SELECT r.*, u.name AS user_name
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.space_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [req.params.id]);

    res.json({ space, reviews: reviewsRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/spaces — create listing
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, address, city, description, price_per_hour, vehicle_type, available_from, available_to, total_spots, image_url, latitude, longitude } = req.body;

    if (!title || !address || !city || !price_per_hour) {
      return res.status(400).json({ error: 'Title, address, city and price are required.' });
    }

    const result = await query(`
      INSERT INTO parking_spaces
        (owner_id,title,address,city,description,price_per_hour,vehicle_type,available_from,available_to,total_spots,image_url,latitude,longitude)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `, [
      req.user.id, title, address, city,
      description || null, parseFloat(price_per_hour),
      vehicle_type || 'both',
      available_from || '00:00', available_to || '23:59',
      parseInt(total_spots) || 1,
      image_url || null,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null
    ]);

    res.status(201).json({ space: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/spaces/:id — update listing
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const spaceRes = await query('SELECT * FROM parking_spaces WHERE id = $1', [req.params.id]);
    const space = spaceRes.rows[0];
    if (!space) return res.status(404).json({ error: 'Space not found.' });
    if (space.owner_id !== req.user.id) return res.status(403).json({ error: 'Forbidden.' });

    const { title, address, city, description, price_per_hour, vehicle_type, available_from, available_to, total_spots, image_url, is_active } = req.body;

    const result = await query(`
      UPDATE parking_spaces SET
        title=$1, address=$2, city=$3, description=$4,
        price_per_hour=$5, vehicle_type=$6,
        available_from=$7, available_to=$8,
        total_spots=$9, image_url=$10, is_active=$11
      WHERE id=$12
      RETURNING *
    `, [
      title || space.title, address || space.address, city || space.city,
      description !== undefined ? description : space.description,
      price_per_hour ? parseFloat(price_per_hour) : space.price_per_hour,
      vehicle_type || space.vehicle_type,
      available_from || space.available_from, available_to || space.available_to,
      total_spots ? parseInt(total_spots) : space.total_spots,
      image_url !== undefined ? image_url : space.image_url,
      is_active !== undefined ? (is_active ? 1 : 0) : space.is_active,
      req.params.id
    ]);

    res.json({ space: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/spaces/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const spaceRes = await query('SELECT * FROM parking_spaces WHERE id = $1', [req.params.id]);
    const space = spaceRes.rows[0];
    if (!space) return res.status(404).json({ error: 'Space not found.' });
    if (space.owner_id !== req.user.id) return res.status(403).json({ error: 'Forbidden.' });

    await query('DELETE FROM parking_spaces WHERE id = $1', [req.params.id]);
    res.json({ message: 'Space deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
