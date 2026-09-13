/**
 * ParkEase Frontend Configuration
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LOCAL DEVELOPMENT:
 *   API_BASE = 'http://localhost:5000/api'
 *
 * AFTER DEPLOYING TO RENDER:
 *   Replace the URL below with your Render backend URL, e.g.:
 *   API_BASE = 'https://parkease-backend.onrender.com/api'
 * ─────────────────────────────────────────────────────────────────────────────
 */

const CONFIG = {
  // ← Change this to your Render URL after deploying the backend
  API_BASE: 'https://parkease-api.onrender.com/api'
};

window.CONFIG = CONFIG;
