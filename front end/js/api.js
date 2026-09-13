/* ─── api.js — Centralized API helper ──────────────────────────────────────── */

// API_BASE comes from js/config.js — update that file after deploying backend
const API_BASE = (window.CONFIG && window.CONFIG.API_BASE) || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('pe_token');
}

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `Request failed with status ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

const api = {
  // Auth
  register: (body) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login:    (body) => apiFetch('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  getMe:    ()     => apiFetch('/auth/me'),

  // Spaces
  getSpaces:   (params = {}) => apiFetch('/spaces?' + new URLSearchParams(params)),
  getSpace:    (id)          => apiFetch(`/spaces/${id}`),
  getMySpaces: ()            => apiFetch('/spaces/my'),
  createSpace: (body)        => apiFetch('/spaces',     { method: 'POST', body: JSON.stringify(body) }),
  updateSpace: (id, body)    => apiFetch(`/spaces/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSpace: (id)          => apiFetch(`/spaces/${id}`, { method: 'DELETE' }),

  // Bookings
  createBooking:    (body) => apiFetch('/bookings',          { method: 'POST', body: JSON.stringify(body) }),
  getMyBookings:    ()     => apiFetch('/bookings/my'),
  getSpaceBookings: (id)   => apiFetch(`/bookings/space/${id}`),
  payBooking:       (id)   => apiFetch(`/bookings/${id}/pay`,    { method: 'PUT' }),
  cancelBooking:    (id)   => apiFetch(`/bookings/${id}/cancel`, { method: 'PUT' }),

  // Reviews
  createReview: (body) => apiFetch('/reviews',           { method: 'POST', body: JSON.stringify(body) }),
  getReviews:   (id)   => apiFetch(`/reviews/space/${id}`),
};

window.api = api;
