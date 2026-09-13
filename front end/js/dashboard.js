/* ─── dashboard.js — Dashboard Page Logic ────────────────────────────────────── */

let allBookings = [];
let mySpaces    = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;

  const user = Auth.getUser();
  document.getElementById('dash-welcome').textContent =
    `Welcome back, ${user.name.split(' ')[0]}! 👋 Here's your activity overview.`;

  loadDashboard();
});

async function loadDashboard() {
  await Promise.all([loadBookings(), loadMySpaces()]);
  updateStats();
}

/* ─── Bookings ─────────────────────────────────────────────────────────────── */
async function loadBookings() {
  try {
    const { bookings } = await api.getMyBookings();
    allBookings = bookings;
    renderBookings(bookings);
  } catch (err) {
    document.getElementById('bookings-list').innerHTML = `
      <div class="alert alert-danger">Could not load bookings. ${err.message}</div>`;
  }
}

function filterBookings() {
  const val = document.getElementById('booking-filter').value;
  const filtered = val === 'all'
    ? allBookings
    : allBookings.filter(b => b.status === val);
  renderBookings(filtered);
}

function renderBookings(bookings) {
  const container = document.getElementById('bookings-list');

  if (bookings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <h3>No bookings yet</h3>
        <p>Find and book your first parking space!</p>
        <a href="search.html" class="btn btn-primary">🔍 Search Spaces</a>
      </div>`;
    return;
  }

  container.innerHTML = bookings.map(b => {
    const isPaid      = b.payment_status === 'paid';
    const isCancelled = b.status === 'cancelled';

    return `
    <div class="booking-card">
      <img class="booking-img"
           src="${b.image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=200'}"
           alt="${b.space_title}" onerror="this.src='https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=200'">
      <div class="booking-info">
        <div class="booking-title">${b.space_title || 'Parking Space'}</div>
        <div class="booking-meta">
          <span>📍 ${b.space_address || '—'}</span>
          <span class="sep">·</span>
          <span>🚗 ${b.vehicle_number || 'No vehicle'}</span>
        </div>
        <div class="booking-meta">
          <span>📅 ${formatDateTime(b.start_time)}</span>
          <span class="sep">→</span>
          <span>${formatDateTime(b.end_time)}</span>
          <span class="sep">·</span>
          <span>${b.hours} hr${b.hours !== 1 ? 's' : ''}</span>
        </div>
        <div class="booking-tags">
          ${getStatusTag(b.status)}
          ${getPaymentTag(b.payment_status)}
          <span class="tag">By: ${b.owner_name || '—'}</span>
        </div>
      </div>
      <div class="booking-actions">
        <div class="booking-amount">${formatCurrency(b.total_amount)}</div>
        ${!isPaid && !isCancelled ? `
          <a href="payment.html?booking_id=${b.id}" class="btn btn-primary btn-sm">💳 Pay Now</a>` : ''}
        ${!isCancelled ? `
          <button class="btn btn-ghost btn-sm" onclick="viewSpace(${b.space_id})">View Space</button>` : ''}
        ${!isCancelled && b.status !== 'completed' ? `
          <button class="btn btn-danger btn-sm" onclick="cancelBooking(${b.id})">Cancel</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function cancelBooking(id) {
  if (!confirm('Are you sure you want to cancel this booking?')) return;
  try {
    await api.cancelBooking(id);
    Toast.success('Booking cancelled successfully.');
    loadBookings();
    updateStats();
  } catch (err) {
    Toast.error(err.message || 'Failed to cancel booking.');
  }
}

function viewSpace(spaceId) {
  window.location.href = `listing.html?id=${spaceId}`;
}

/* ─── My Spaces ────────────────────────────────────────────────────────────── */
async function loadMySpaces() {
  try {
    const { spaces } = await api.getMySpaces();
    mySpaces = spaces;
    renderMySpaces(spaces);
  } catch (err) {
    document.getElementById('my-spaces-list').innerHTML = `
      <div class="alert alert-danger" style="grid-column:1/-1">Could not load spaces. ${err.message}</div>`;
  }
}

function renderMySpaces(spaces) {
  const container = document.getElementById('my-spaces-list');

  if (spaces.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🅿️</div>
        <h3>No spaces listed yet</h3>
        <p>List your first parking space and start earning!</p>
        <a href="list-space.html" class="btn btn-primary">➕ List a Space</a>
      </div>`;
    return;
  }

  container.innerHTML = spaces.map(s => `
    <div class="my-space-card">
      <img class="my-space-img"
           src="${s.image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400'}"
           alt="${s.title}"
           onerror="this.src='https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400'">
      <div class="my-space-body">
        <div class="my-space-header">
          <div class="my-space-title">${s.title}</div>
          <div class="my-space-price">${formatCurrency(s.price_per_hour)}/hr</div>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
          📍 ${s.city}
        </div>
        <div class="my-space-stats">
          <div class="mss-item">
            <div class="mss-val">${s.total_bookings || 0}</div>
            <div class="mss-label">Bookings</div>
          </div>
          <div class="mss-item">
            <div class="mss-val">${formatCurrency(s.total_earnings || 0)}</div>
            <div class="mss-label">Earned</div>
          </div>
          <div class="mss-item">
            <div class="mss-val">${parseFloat(s.avg_rating || 0).toFixed(1)} ⭐</div>
            <div class="mss-label">Rating</div>
          </div>
          <div class="mss-item">
            <div class="mss-val">${s.total_spots}</div>
            <div class="mss-label">Spots</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom: 0.75rem;">
          <span class="tag ${s.is_active ? 'tag-success' : 'tag-danger'}">
            ${s.is_active ? '● Active' : '○ Inactive'}
          </span>
          <span class="tag">${getVehicleLabel(s.vehicle_type)}</span>
        </div>
        <div class="my-space-actions">
          <a href="listing.html?id=${s.id}" class="btn btn-outline btn-sm">👁 View</a>
          <a href="list-space.html?edit=${s.id}" class="btn btn-ghost btn-sm">✏️ Edit</a>
          <button class="btn btn-ghost btn-sm toggle-active"
                  onclick="toggleSpaceActive(${s.id}, ${s.is_active})">
            ${s.is_active ? '⏸ Pause' : '▶ Activate'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteSpace(${s.id})">🗑</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function toggleSpaceActive(id, currentlyActive) {
  try {
    await api.updateSpace(id, { is_active: !currentlyActive });
    Toast.success(`Space ${currentlyActive ? 'paused' : 'activated'} successfully.`);
    loadMySpaces();
  } catch (err) {
    Toast.error(err.message || 'Failed to update space.');
  }
}

async function deleteSpace(id) {
  if (!confirm('Delete this parking space? This cannot be undone.')) return;
  try {
    await api.deleteSpace(id);
    Toast.success('Space deleted successfully.');
    loadMySpaces();
    updateStats();
  } catch (err) {
    Toast.error(err.message || 'Failed to delete space.');
  }
}

/* ─── Stats ────────────────────────────────────────────────────────────────── */
function updateStats() {
  const totalBookings = allBookings.length;
  const totalSpaces   = mySpaces.length;
  const totalEarnings = mySpaces.reduce((sum, s) => sum + (s.total_earnings || 0), 0);
  const activeSpaces  = mySpaces.filter(s => s.is_active).length;

  animateNumber('sv-bookings', totalBookings);
  animateNumber('sv-spaces', totalSpaces);
  document.getElementById('sv-earnings').textContent = formatCurrency(totalEarnings);
  animateNumber('sv-active', activeSpaces);
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  let current = 0;
  const step = Math.ceil(target / 20);
  const interval = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(interval);
  }, 40);
}

/* ─── Tab Switching ────────────────────────────────────────────────────────── */
function switchDashTab(tab) {
  ['bookings', 'spaces'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('hidden', t !== tab);
    document.getElementById(`dtab-${t}`).classList.toggle('active', t === tab);
  });
}

window.switchDashTab  = switchDashTab;
window.filterBookings = filterBookings;
window.cancelBooking  = cancelBooking;
window.viewSpace      = viewSpace;
window.toggleSpaceActive = toggleSpaceActive;
window.deleteSpace    = deleteSpace;
