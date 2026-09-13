const express = require('express');
const { getDb } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/reviews — add a review
router.post('/', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const { space_id, booking_id, rating, comment } = req.body;

    if (!space_id || !rating) {
      return res.status(400).json({ error: 'Space ID and rating are required.' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }

    // Verify the user had a completed/confirmed booking for this space
    const booking = await db.get(`
      SELECT * FROM bookings
      WHERE id = ? AND user_id = ? AND space_id = ? AND status != 'cancelled'
    `, [booking_id, req.user.id, space_id]);

    if (!booking) {
      return res.status(403).json({ error: 'You can only review spaces you have booked.' });
    }

    // Check for duplicate review
    const existing = await db.get('SELECT id FROM reviews WHERE booking_id = ?', [booking_id]);
    if (existing) {
      return res.status(409).json({ error: 'You have already reviewed this booking.' });
    }

    const result = await db.run(`
      INSERT INTO reviews (space_id, user_id, booking_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `, [space_id, req.user.id, booking_id, rating, comment || null]);

    const review = await db.get(`
      SELECT r.*, u.name AS user_name
      FROM reviews r JOIN users u ON u.id = r.user_id
      WHERE r.id = ?
    `, [result.lastID]);

    res.status(201).json({ review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/reviews/space/:id — get reviews for a space
router.get('/space/:id', async (req, res) => {
  try {
    const db = await getDb();
    const reviews = await db.all(`
      SELECT r.*, u.name AS user_name
      FROM reviews r JOIN users u ON u.id = r.user_id
      WHERE r.space_id = ?
      ORDER BY r.created_at DESC
    `, [req.params.id]);

    res.json({ reviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
