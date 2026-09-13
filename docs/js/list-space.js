/* ─── list-space.js — List/Edit Space Page Logic ─────────────────────────────── */

const editId = new URLSearchParams(window.location.search).get('edit');
let isEditMode = !!editId;

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;

  if (isEditMode) {
    document.getElementById('page-title').textContent = 'Edit Parking Space';
    document.getElementById('submit-label').textContent = 'Save Changes';
    loadSpaceForEdit();
  }

  // Set up live preview listeners
  setupPreviewListeners();
  updateVehicleUI();
});

/* ─── Live Preview ─────────────────────────────────────────────────────────── */
function setupPreviewListeners() {
  const fields = {
    'f-title':   () => { document.getElementById('preview-title').textContent = document.getElementById('f-title').value || 'Your Space Title'; },
    'f-address': () => {
      const addr = document.getElementById('f-address').value;
      const city = document.getElementById('f-city').value;
      document.getElementById('preview-address').textContent = [addr, city].filter(Boolean).join(', ') || 'Address, City';
    },
    'f-city':    () => {
      const addr = document.getElementById('f-address').value;
      const city = document.getElementById('f-city').value;
      document.getElementById('preview-address').textContent = [addr, city].filter(Boolean).join(', ') || 'Address, City';
    },
    'f-price':   () => {
      const p = document.getElementById('f-price').value;
      document.getElementById('preview-price').innerHTML = p ? `₹${p}<span>/hr</span>` : `₹0<span>/hr</span>`;
    },
    'f-spots':   () => {
      const s = document.getElementById('f-spots').value;
      document.getElementById('preview-spots').textContent = `${s || 1} spot${s > 1 ? 's' : ''}`;
    },
    'f-from':    updateHoursPreview,
    'f-to':      updateHoursPreview,
    'f-image':   () => previewImage(document.getElementById('f-image').value),
  };

  Object.entries(fields).forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', fn);
  });

  // Vehicle type radio buttons
  document.querySelectorAll('input[name="vehicle_type"]').forEach(radio => {
    radio.addEventListener('change', updateVehicleUI);
  });
}

function updateHoursPreview() {
  const from = document.getElementById('f-from').value || '00:00';
  const to   = document.getElementById('f-to').value || '23:59';
  document.getElementById('preview-hours').textContent = `${from} – ${to}`;
}

function updateVehicleUI() {
  const val = document.querySelector('input[name="vehicle_type"]:checked')?.value || 'both';
  const labels = { car: '🚗 Car Only', bike: '🏍️ Bike Only', both: '🚗🏍️ Car & Bike' };
  document.getElementById('preview-vehicle').textContent = labels[val];
}

/* ─── Image Preview ────────────────────────────────────────────────────────── */
function previewImage(url) {
  const wrap = document.getElementById('image-preview-wrap');
  const img  = document.getElementById('image-preview');
  const previewImg = document.getElementById('preview-img');

  if (url && url.startsWith('http')) {
    img.src = url;
    previewImg.src = url;
    wrap.style.display = 'inline-block';
    img.onerror = () => { wrap.style.display = 'none'; previewImg.src = 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600'; };
  } else {
    wrap.style.display = 'none';
  }
}

function clearImage() {
  document.getElementById('f-image').value = '';
  document.getElementById('image-preview-wrap').style.display = 'none';
  document.getElementById('preview-img').src = 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600';
}

function useSampleImage(src) {
  const fullSrc = src.replace('w=200', 'w=800');
  document.getElementById('f-image').value = fullSrc;
  previewImage(fullSrc);
}

/* ─── Edit Mode — Load Existing Space ─────────────────────────────────────── */
async function loadSpaceForEdit() {
  try {
    const { space } = await api.getSpace(editId);

    // Verify ownership
    const user = Auth.getUser();
    if (space.owner_id !== user.id) {
      Toast.error('You do not own this space.');
      window.location.href = 'dashboard.html';
      return;
    }

    // Populate form
    document.getElementById('f-title').value       = space.title || '';
    document.getElementById('f-description').value = space.description || '';
    document.getElementById('f-address').value     = space.address || '';
    document.getElementById('f-city').value        = space.city || '';
    document.getElementById('f-price').value       = space.price_per_hour || '';
    document.getElementById('f-spots').value       = space.total_spots || 1;
    document.getElementById('f-from').value        = space.available_from || '00:00';
    document.getElementById('f-to').value          = space.available_to || '23:59';
    document.getElementById('f-lat').value         = space.latitude || '';
    document.getElementById('f-lng').value         = space.longitude || '';
    if (space.image_url) {
      document.getElementById('f-image').value = space.image_url;
      previewImage(space.image_url);
    }

    // Vehicle type
    const vt = document.getElementById(`vt-${space.vehicle_type}`);
    if (vt) vt.checked = true;

    // Trigger preview update
    ['f-title','f-address','f-city','f-price','f-spots','f-from','f-to'].forEach(id => {
      document.getElementById(id)?.dispatchEvent(new Event('input'));
    });
    updateVehicleUI();
  } catch (err) {
    Toast.error('Could not load space for editing.');
    setTimeout(() => window.location.href = 'dashboard.html', 1500);
  }
}

/* ─── Form Submission ──────────────────────────────────────────────────────── */
async function handleSubmit(e) {
  e.preventDefault();

  const btn    = document.getElementById('submit-btn');
  const errEl  = document.getElementById('form-error');
  errEl.classList.add('hidden');

  // Collect values
  const title        = document.getElementById('f-title').value.trim();
  const description  = document.getElementById('f-description').value.trim();
  const address      = document.getElementById('f-address').value.trim();
  const city         = document.getElementById('f-city').value.trim();
  const price_per_hour = parseFloat(document.getElementById('f-price').value);
  const total_spots  = parseInt(document.getElementById('f-spots').value);
  const vehicle_type = document.querySelector('input[name="vehicle_type"]:checked')?.value || 'both';
  const available_from = document.getElementById('f-from').value || '00:00';
  const available_to   = document.getElementById('f-to').value || '23:59';
  const image_url    = document.getElementById('f-image').value.trim() || null;
  const latitude     = document.getElementById('f-lat').value  ? parseFloat(document.getElementById('f-lat').value)  : null;
  const longitude    = document.getElementById('f-lng').value  ? parseFloat(document.getElementById('f-lng').value) : null;

  // Validate
  if (!title)   { showError('Listing title is required.'); return; }
  if (!address) { showError('Address is required.'); return; }
  if (!city)    { showError('City is required.'); return; }
  if (!price_per_hour || price_per_hour < 1) { showError('Please enter a valid hourly price (minimum ₹1).'); return; }
  if (!total_spots || total_spots < 1)        { showError('Please enter number of spots (minimum 1).'); return; }

  const payload = { title, description, address, city, price_per_hour, total_spots, vehicle_type, available_from, available_to, image_url, latitude, longitude };

  btn.disabled = true;
  btn.innerHTML = `<span style="display:inline-block; width:16px; height:16px; border:2px solid rgba(255,255,255,0.3); border-top-color:white; border-radius:50%; animation:spin 0.8s linear infinite;"></span> ${isEditMode ? 'Saving...' : 'Publishing...'}`;

  try {
    if (isEditMode) {
      await api.updateSpace(editId, payload);
      Toast.success('Space updated successfully! ✅');
    } else {
      await api.createSpace(payload);
      Toast.success('Space listed successfully! 🎉 Customers can now find and book it.');
    }
    setTimeout(() => window.location.href = 'dashboard.html', 1200);
  } catch (err) {
    showError(err.message || 'Failed to save space. Please try again.');
    btn.disabled = false;
    btn.innerHTML = `🅿️ <span id="submit-label">${isEditMode ? 'Save Changes' : 'Publish Listing'}</span>`;
  }
}

function showError(msg) {
  const el = document.getElementById('form-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

window.handleSubmit   = handleSubmit;
window.previewImage   = previewImage;
window.clearImage     = clearImage;
window.useSampleImage = useSampleImage;
