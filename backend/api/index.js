const express = require('express');
const cors = require('cors');
const { initDB } = require('../db');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('../routes/auth'));
app.use('/api/spaces', require('../routes/spaces'));
app.use('/api/bookings', require('../routes/bookings'));
app.use('/api/reviews', require('../routes/reviews'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ParkEase API is running 🅿️', timestamp: new Date().toISOString() });
});

// Root
app.get('/', (req, res) => {
  res.json({ message: 'ParkEase API', version: '1.0.0', docs: '/api/health' });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`🅿️  ParkEase API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;
