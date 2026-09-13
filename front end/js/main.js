/* ─── main.js — Landing Page Logic ──────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  loadFeaturedSpaces();
  prefillFromURL();
});

function switchTab(tab) {
  document.getElementById('tab-find').classList.toggle('active', tab === 'find');
  document.getElementById('tab-list').classList.toggle('active', tab === 'list');
  document.getElementById('search-find-body').classList.toggle('hidden', tab !== 'find');
  document.getElementById('search-list-body').classList.toggle('hidden', tab !== 'list');
}

function prefillFromURL() {
  const params = new URLSearchParams(window.location.search);
  const city = params.get('city');
  if (city) document.getElementById('hero-city').value = city;
}

function doSearch() {
  const city = document.getElementById('hero-city').value.trim();
  const vehicle = document.getElementById('hero-vehicle').value;
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  if (vehicle && vehicle !== 'all') params.set('vehicle_type', vehicle);
  window.location.href = 'search.html?' + params.toString();
}

// Enter key on hero search
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement.id === 'hero-city') doSearch();
});

async function loadFeaturedSpaces() {
  const grid = document.getElementById('featured-grid');
  try {
    const { spaces } = await api.getSpaces({ limit: 3 });
    const featured = spaces.slice(0, 3);

    if (featured.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">
        <div class="empty-icon">🅿️</div>
        <h3>No spaces listed yet</h3>
        <p>Be the first to list your parking space!</p>
        <a href="list-space.html" class="btn btn-primary">List a Space</a>
      </div>`;
      return;
    }

    grid.innerHTML = featured.map(renderSpaceCard).join('');

    // Update stats count
    document.getElementById('count-spaces').textContent = spaces.length + '+';
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">
      <div class="empty-icon">⚠️</div>
      <h3>Could not load spaces</h3>
      <p>Make sure the backend server is running on port 5000.</p>
    </div>`;
  }
}

function renderSpaceCard(space) {
  const rating = parseFloat(space.avg_rating || 0).toFixed(1);
  const reviewCount = space.review_count || 0;
  return `
    <div class="space-card" onclick="window.location.href='listing.html?id=${space.id}'">
      <img class="space-card-img"
           src="${space.image_url || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600'}"
           alt="${space.title}" loading="lazy">
      <div class="space-card-body">
        <div class="space-card-header">
          <h3 class="space-card-title">${space.title}</h3>
          <div class="space-card-price">
            ${formatCurrency(space.price_per_hour)}<span>/hr</span>
          </div>
        </div>
        <div class="space-card-address">📍 ${space.address}</div>
        <div class="space-card-tags">
          <span class="tag tag-accent">${getVehicleLabel(space.vehicle_type)}</span>
          <span class="tag">${space.total_spots} spot${space.total_spots > 1 ? 's' : ''}</span>
          <span class="tag">${space.available_from} – ${space.available_to}</span>
        </div>
        <div class="space-card-footer">
          <div class="space-rating">
            ★ ${rating > 0 ? rating : 'New'}
            <span class="count">${reviewCount > 0 ? `(${reviewCount})` : ''}</span>
          </div>
          <span class="btn btn-sm btn-outline">Book Now →</span>
        </div>
      </div>
    </div>
  `;
}

window.doSearch = doSearch;
window.switchTab = switchTab;
window.renderSpaceCard = renderSpaceCard;
