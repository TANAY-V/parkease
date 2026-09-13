const express = require('express');
const { getDb } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/bookings — create a booking
router.post('/', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const { space_id, start_time, end_time, vehicle_number } = req.body;

    if (!space_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'Space ID, start time and end time are required.' });
    }

    const space = await db.get('SELECT * FROM parking_spaces WHERE id = ? AND is_active = 1', [space_id]);
    if (!space) return res.status(404).json({ error: 'Parking space not found or not available.' });

    if (space.owner_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot book your own parking space.' });
    }

    const start = new Date(start_time);
    const end = new Date(end_time);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ error: 'Invalid date format.' });
    }
    if (end <= start) {
      return res.status(400).json({ error: 'End time must be after start time.' });
    }

    const hours = (end - start) / (1000 * 60 * 60);
    if (hours < 0.5) {
      return res.status(400).json({ error: 'Minimum booking duration is 30 minutes.' });
    }

    // Check for overlapping bookings
    const conflicting = await db.get(`
      SELECT COUNT(*) as c FROM bookings
      WHERE space_id = ? AND status != 'cancelled'
      AND (start_time < ? AND end_time > ?)
    `, [space_id, end_time, start_time]);

    if (conflicting.c >= space.total_spots) {
      return res.status(409).json({ error: 'No spots available for the selected time slot.' });
    }

    const total_amount = parseFloat((hours * space.price_per_hour).toFixed(2));

    const result = await db.run(`
      INSERT INTO bookings (space_id, user_id, start_time, end_time, hours, total_amount, vehicle_number)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [space_id, req.user.id, start_time, end_time, parseFloat(hours.toFixed(2)), total_amount, vehicle_number || null]);

    const booking = await db.get(`
      SELECT b.*, ps.title AS space_title, ps.address AS space_address, ps.price_per_hour
      FROM bookings b
      JOIN parking_spaces ps ON ps.id = b.space_id
      WHERE b.id = ?
    `, [result.lastID]);

    res.status(201).json({ booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/bookings/my — my bookings as a customer
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const bookings = await db.all(`
      SELECT b.*, ps.title AS space_title, ps.address AS space_address,
             ps.image_url, ps.price_per_hour, u.name AS owner_name
      FROM bookings b
      JOIN parking_spaces ps ON ps.id = b.space_id
      JOIN users u ON u.id = ps.owner_id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `, [req.user.id]);

    res.json({ bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/bookings/space/:id — bookings for my space (owner)
router.get('/space/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const space = await db.get('SELECT * FROM parking_spaces WHERE id = ?', [req.params.id]);
    if (!space) return res.status(404).json({ error: 'Space not found.' });
    if (space.owner_id !== req.user.id) return res.status(403).json({ error: 'Forbidden.' });

    const bookings = await db.all(`
      SELECT b.*, u.name AS customer_name, u.phone AS customer_phone
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      WHERE b.space_id = ?
      ORDER BY b.created_at DESC
    `, [req.params.id]);

    res.json({ bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/bookings/:id/pay — simulate payment
router.put('/:id/pay', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden.' });
    if (booking.payment_status === 'paid') return res.status(400).json({ error: 'Already paid.' });

    await db.run(`UPDATE bookings SET payment_status = 'paid', status = 'confirmed' WHERE id = ?`, [req.params.id]);

    const updated = await db.get(`
      SELECT b.*, ps.title AS space_title, ps.address AS space_address
      FROM bookings b JOIN parking_spaces ps ON ps.id = b.space_id
      WHERE b.id = ?
    `, [req.params.id]);

    res.json({ booking: updated, message: 'Payment successful! Your booking is confirmed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/bookings/:id/cancel
router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden.' });
    if (booking.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled.' });

    await db.run(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Booking cancelled successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
