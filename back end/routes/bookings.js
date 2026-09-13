const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/bookings — create a booking
router.post('/', authMiddleware, (req, res) => {
  const { space_id, start_time, end_time, vehicle_number } = req.body;

  if (!space_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'Space ID, start time and end time are required.' });
  }

  const space = db.prepare('SELECT * FROM parking_spaces WHERE id = ? AND is_active = 1').get(space_id);
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
  const conflicting = db.prepare(`
    SELECT COUNT(*) as c FROM bookings
    WHERE space_id = ? AND status != 'cancelled'
    AND (
      (start_time < ? AND end_time > ?)
    )
  `).get(space_id, end_time, start_time);

  if (conflicting.c >= space.total_spots) {
    return res.status(409).json({ error: 'No spots available for the selected time slot.' });
  }

  const total_amount = parseFloat((hours * space.price_per_hour).toFixed(2));

  const result = db.prepare(`
    INSERT INTO bookings (space_id, user_id, start_time, end_time, hours, total_amount, vehicle_number)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(space_id, req.user.id, start_time, end_time, parseFloat(hours.toFixed(2)), total_amount, vehicle_number || null);

  const booking = db.prepare(`
    SELECT b.*, ps.title AS space_title, ps.address AS space_address, ps.price_per_hour
    FROM bookings b
    JOIN parking_spaces ps ON ps.id = b.space_id
    WHERE b.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ booking });
});

// GET /api/bookings/my — my bookings as a customer
router.get('/my', authMiddleware, (req, res) => {
  const bookings = db.prepare(`
    SELECT b.*, ps.title AS space_title, ps.address AS space_address,
           ps.image_url, ps.price_per_hour, u.name AS owner_name
    FROM bookings b
    JOIN parking_spaces ps ON ps.id = b.space_id
    JOIN users u ON u.id = ps.owner_id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `).all(req.user.id);

  res.json({ bookings });
});

// GET /api/bookings/space/:id — bookings for my space (owner)
router.get('/space/:id', authMiddleware, (req, res) => {
  const space = db.prepare('SELECT * FROM parking_spaces WHERE id = ?').get(req.params.id);
  if (!space) return res.status(404).json({ error: 'Space not found.' });
  if (space.owner_id !== req.user.id) return res.status(403).json({ error: 'Forbidden.' });

  const bookings = db.prepare(`
    SELECT b.*, u.name AS customer_name, u.phone AS customer_phone
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    WHERE b.space_id = ?
    ORDER BY b.created_at DESC
  `).all(req.params.id);

  res.json({ bookings });
});

// PUT /api/bookings/:id/pay — simulate payment
router.put('/:id/pay', authMiddleware, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  if (booking.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden.' });
  if (booking.payment_status === 'paid') return res.status(400).json({ error: 'Already paid.' });

  db.prepare(`UPDATE bookings SET payment_status = 'paid', status = 'confirmed' WHERE id = ?`).run(req.params.id);

  const updated = db.prepare(`
    SELECT b.*, ps.title AS space_title, ps.address AS space_address
    FROM bookings b JOIN parking_spaces ps ON ps.id = b.space_id
    WHERE b.id = ?
  `).get(req.params.id);

  res.json({ booking: updated, message: 'Payment successful! Your booking is confirmed.' });
});

// PUT /api/bookings/:id/cancel
router.put('/:id/cancel', authMiddleware, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  if (booking.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden.' });
  if (booking.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled.' });

  db.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`).run(req.params.id);
  res.json({ message: 'Booking cancelled successfully.' });
});

module.exports = router;
