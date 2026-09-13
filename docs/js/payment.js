/* ─── payment.js — Payment Page Logic ───────────────────────────────────────── */

let bookingData = null;
let spaceData   = null;
let selectedMethod = 'upi';
const bookingId = new URLSearchParams(window.location.search).get('booking_id');

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;
  if (!bookingId) { window.location.href = 'dashboard.html'; return; }
  loadBooking();
});

async function loadBooking() {
  try {
    const { bookings } = await api.getMyBookings();
    bookingData = bookings.find(b => b.id === parseInt(bookingId));
    if (!bookingData) throw new Error('Booking not found');

    if (bookingData.payment_status === 'paid') {
      showSuccess(bookingData);
      return;
    }

    // Load space image
    try {
      const { space } = await api.getSpace(bookingData.space_id);
      spaceData = space;
    } catch (_) {}

    populateSummary();
    document.getElementById('payment-loading').classList.add('hidden');
    document.getElementById('payment-content').classList.remove('hidden');
  } catch (err) {
    Toast.error('Could not load booking details.');
    setTimeout(() => window.location.href = 'dashboard.html', 1500);
  }
}

function populateSummary() {
  const b = bookingData;

  // Back link
  document.getElementById('back-to-space').href = `listing.html?id=${b.space_id}`;

  // Space summary
  document.getElementById('summary-img').src = spaceData?.image_url ||
    'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=300';
  document.getElementById('summary-title').textContent = b.space_title || 'Parking Space';
  document.getElementById('summary-address').textContent = b.space_address || '';

  // Rows
  const rows = [
    ['Check-in',  formatDateTime(b.start_time)],
    ['Check-out', formatDateTime(b.end_time)],
    ['Duration',  `${b.hours} hr${b.hours !== 1 ? 's' : ''}`],
    ['Rate',      `${formatCurrency(b.price_per_hour)}/hr`],
    ['Vehicle',   b.vehicle_number || '—'],
  ];
  document.getElementById('summary-rows').innerHTML = rows.map(([k, v]) => `
    <div class="summary-row"><span>${k}</span><span>${v}</span></div>
  `).join('');

  document.getElementById('summary-total-val').textContent = formatCurrency(b.total_amount);
  document.getElementById('pay-amount').textContent = formatCurrency(b.total_amount);
  document.getElementById('booking-id-display').textContent = `#PE${String(b.id).padStart(5, '0')}`;
}

function selectMethod(el, method) {
  document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
  el.classList.add('active');
  selectedMethod = method;

  ['upi', 'card', 'netbanking'].forEach(m => {
    const form = document.getElementById(`form-${m}`);
    if (form) form.classList.toggle('hidden', m !== method);
  });
}

async function processPayment() {
  const btn = document.getElementById('pay-now-btn');
  btn.disabled = true;
  btn.innerHTML = `<span style="display:inline-block; animation: spin 0.8s linear infinite; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; width: 18px; height: 18px;"></span> Processing...`;

  // Simulate payment processing delay
  await new Promise(r => setTimeout(r, 2000));

  try {
    const { booking } = await api.payBooking(bookingId);
    showSuccess(booking);
  } catch (err) {
    Toast.error(err.message || 'Payment failed. Please try again.');
    btn.disabled = false;
    btn.innerHTML = `🔒 Pay ${formatCurrency(bookingData?.total_amount || 0)} Now`;
  }
}

function showSuccess(booking) {
  document.getElementById('payment-loading').classList.add('hidden');
  document.getElementById('payment-content').classList.add('hidden');
  document.getElementById('payment-success').classList.remove('hidden');

  const rows = [
    ['Booking ID', `#PE${String(booking.id).padStart(5, '0')}`],
    ['Space',      booking.space_title || 'Parking Space'],
    ['Location',   booking.space_address || '—'],
    ['Check-in',   formatDateTime(booking.start_time)],
    ['Check-out',  formatDateTime(booking.end_time)],
    ['Duration',   `${booking.hours} hr${booking.hours !== 1 ? 's' : ''}`],
    ['Amount Paid', formatCurrency(booking.total_amount)],
    ['Status',     '✅ Confirmed'],
  ];

  document.getElementById('success-details').innerHTML = `
    <h3 style="margin-bottom: 1.25rem;">Booking Confirmation</h3>
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      ${rows.map(([k, v]) => `
        <div style="display: flex; justify-content: space-between; font-size: 0.875rem;">
          <span style="color: var(--text-secondary);">${k}</span>
          <span style="font-weight: 500;">${v}</span>
        </div>
      `).join('')}
    </div>
    <div class="divider"></div>
    <div class="alert alert-success" style="margin: 0;">
      🎉 Show this confirmation to the space owner when you arrive. Happy parking!
    </div>
  `;
}

window.selectMethod = selectMethod;
window.processPayment = processPayment;
