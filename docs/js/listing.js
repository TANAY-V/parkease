/* ─── listing.js — Space Detail & Booking Logic ─────────────────────────────── */

let spaceData = null;
let reviewRating = 0;
let eligibleBookingId = null;

const spaceId = new URLSearchParams(window.location.search).get('id');

document.addEventListener('DOMContentLoaded', () => {
  if (!spaceId) { window.location.href = 'search.html'; return; }
  loadSpace();
  setupDateListeners();
});

async function loadSpace() {
  try {
    const { space, reviews } = await api.getSpace(spaceId);
    spaceData = space;
    populateUI(space);
    renderReviews(reviews);
    checkReviewEligibility();
    document.getElementById('page-loading').classList.add('hidden');
    document.getElementById('page-content').classList.remove('hidden');
  } catch (err) {
    Toast.error('Space not found.');
    setTimeout(() => window.location.href = 'search.html', 1500);
  }
}

function populateUI(space) {
  document.title = `${space.title} — ParkEase`;

  // Image
  const img = document.getElementById('listing-img');
  img.src = space.image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800';
  img.alt = space.title;

  // Title & address
  document.getElementById('listing-title').textContent = space.title;
  document.querySelector('#listing-address span:last-child').textContent = space.address + ', ' + space.city;

  // Meta tags
  document.getElementById('listing-vehicle').textContent = getVehicleLabel(space.vehicle_type);
  document.getElementById('listing-spots').textContent = `${space.total_spots} spot${space.total_spots > 1 ? 's' : ''}`;
  document.getElementById('listing-hours').textContent = `${space.available_from} – ${space.available_to}`;

  // Price
  const priceStr = formatCurrency(space.price_per_hour);
  document.getElementById('listing-price').textContent = priceStr;
  document.getElementById('bw-price').innerHTML = `${priceStr} <span>/hr</span>`;

  // Rating
  const rating = parseFloat(space.avg_rating || 0);
  const ratingEl = document.getElementById('listing-rating');
  ratingEl.innerHTML = rating > 0 ? `
    <div style="font-size: 1.1rem; color: var(--warning);">${renderStars(rating)}</div>
    <span style="font-weight: 600; font-size: 0.95rem;">${rating.toFixed(1)}</span>
    <span style="color: var(--text-muted); font-size: 0.875rem;">(${space.review_count} review${space.review_count !== 1 ? 's' : ''})</span>
  ` : `<span style="color: var(--text-muted); font-size: 0.875rem;">No reviews yet · Be the first!</span>`;

  // Description
  document.getElementById('listing-description').textContent = space.description || 'No description provided.';

  // Map
  if (space.latitude && space.longitude) {
    const mapSrc = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU3Kec&q=${space.latitude},${space.longitude}&zoom=16`;
    document.getElementById('map-iframe').src = mapSrc;
  } else {
    const q = encodeURIComponent(space.address + ', ' + space.city + ', India');
    document.getElementById('map-iframe').src =
      `https://maps.google.com/maps?q=${q}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  }

  // Owner
  const initials = (space.owner_name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('owner-avatar').textContent = initials;
  document.getElementById('owner-name').textContent = space.owner_name || 'Space Owner';
  document.getElementById('owner-since').textContent = `Listed on ${formatDate(space.created_at)}`;

  // Set default datetime (next hour)
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  const start = now.toISOString().slice(0, 16);
  now.setHours(now.getHours() + 2);
  const end = now.toISOString().slice(0, 16);
  document.getElementById('book-start').value = start;
  document.getElementById('book-end').value = end;
  calculateCost();
}

function setupDateListeners() {
  document.getElementById('book-start').addEventListener('change', calculateCost);
  document.getElementById('book-end').addEventListener('change', calculateCost);
}

function calculateCost() {
  if (!spaceData) return;
  const start = new Date(document.getElementById('book-start').value);
  const end   = new Date(document.getElementById('book-end').value);
  if (!start || !end || end <= start) {
    document.getElementById('booking-breakdown').classList.add('hidden');
    return;
  }
  const hours = (end - start) / (1000 * 60 * 60);
  const total = hours * spaceData.price_per_hour;

  document.getElementById('bd-duration').textContent = `${hours.toFixed(1)} hr${hours !== 1 ? 's' : ''}`;
  document.getElementById('bd-rate').textContent = formatCurrency(spaceData.price_per_hour) + '/hr';
  document.getElementById('bd-total').textContent = formatCurrency(total);
  document.getElementById('booking-breakdown').classList.remove('hidden');
}

async function submitBooking(e) {
  e.preventDefault();
  if (!Auth.requireAuth()) return;

  const btn = document.getElementById('book-btn');
  btn.disabled = true; btn.textContent = 'Booking...';

  const startVal = document.getElementById('book-start').value;
  const endVal   = document.getElementById('book-end').value;
  const vehicle  = document.getElementById('book-vehicle').value.trim().toUpperCase();

  if (!startVal || !endVal) { Toast.error('Please select start and end times.'); btn.disabled = false; btn.textContent = '🅿️ Book & Pay'; return; }

  try {
    const { booking } = await api.createBooking({
      space_id: parseInt(spaceId),
      start_time: new Date(startVal).toISOString(),
      end_time: new Date(endVal).toISOString(),
      vehicle_number: vehicle || undefined
    });
    // Redirect to payment page
    window.location.href = `payment.html?booking_id=${booking.id}`;
  } catch (err) {
    Toast.error(err.message || 'Booking failed. Please try again.');
    btn.disabled = false; btn.textContent = '🅿️ Book & Pay';
  }
}

function renderReviews(reviews) {
  const list = document.getElementById('reviews-list');
  document.getElementById('reviews-heading').textContent = `Reviews (${reviews.length})`;

  if (reviews.length === 0) {
    list.innerHTML = `<div class="empty-state" style="padding: 2rem;">
      <div class="empty-icon" style="font-size: 2rem;">⭐</div>
      <h3 style="font-size: 1rem;">No reviews yet</h3>
      <p>Be the first to review after your booking!</p>
    </div>`;
    return;
  }

  list.innerHTML = reviews.map(r => `
    <div class="review-item">
      <div class="review-header">
        <div class="review-user">
          <div class="review-avatar">${(r.user_name || 'U')[0].toUpperCase()}</div>
          <span class="review-name">${r.user_name || 'Anonymous'}</span>
        </div>
        <span class="review-date">${formatDate(r.created_at)}</span>
      </div>
      <div class="review-stars">${renderStars(r.rating)}</div>
      ${r.comment ? `<div class="review-comment">"${r.comment}"</div>` : ''}
    </div>
  `).join('');
}

async function checkReviewEligibility() {
  if (!Auth.isLoggedIn()) return;
  try {
    const { bookings } = await api.getMyBookings();
    const eligible = bookings.find(b =>
      b.space_id === parseInt(spaceId) &&
      b.status !== 'cancelled' &&
      b.payment_status === 'paid'
    );
    if (eligible) {
      eligibleBookingId = eligible.id;
      document.getElementById('write-review-btn').style.display = 'inline-flex';
      document.getElementById('review-booking-id').value = eligible.id;
    }
  } catch (_) {}
}

function openReviewModal() {
  if (!Auth.requireAuth()) return;
  document.getElementById('review-modal').classList.remove('hidden');
}
function closeReviewModal() {
  document.getElementById('review-modal').classList.add('hidden');
}

function setRating(val) {
  reviewRating = val;
  document.getElementById('review-rating').value = val;
  document.querySelectorAll('#review-stars .star').forEach((s, i) => {
    s.classList.toggle('active', i < val);
  });
}

async function submitReview(e) {
  e.preventDefault();
  if (reviewRating === 0) { Toast.error('Please select a rating.'); return; }
  const btn = document.getElementById('review-submit-btn');
  btn.disabled = true; btn.textContent = 'Submitting...';

  try {
    await api.createReview({
      space_id: parseInt(spaceId),
      booking_id: parseInt(document.getElementById('review-booking-id').value),
      rating: reviewRating,
      comment: document.getElementById('review-comment').value.trim() || undefined
    });
    Toast.success('Review submitted! Thank you.');
    closeReviewModal();
    loadSpace(); // Refresh
  } catch (err) {
    Toast.error(err.message || 'Failed to submit review.');
    btn.disabled = false; btn.textContent = 'Submit Review';
  }
}

window.submitBooking = submitBooking;
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
window.setRating = setRating;
window.submitReview = submitReview;
