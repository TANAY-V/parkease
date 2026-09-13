/* ─── search.js — Search Page Logic ─────────────────────────────────────────── */

let allSpaces = [];
let activeVehicleFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  readURLParams();
  loadSpaces();
  setupFilterListeners();
});

function readURLParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('city'))         document.getElementById('filter-city').value = params.get('city');
  if (params.get('vehicle_type')) setVehicleFilterByValue(params.get('vehicle_type'));
  if (params.get('min_price'))    document.getElementById('filter-min-price').value = params.get('min_price');
  if (params.get('max_price'))    document.getElementById('filter-max-price').value = params.get('max_price');
  if (params.get('search'))       document.getElementById('filter-search').value = params.get('search');
}

function setupFilterListeners() {
  ['filter-search','filter-city','filter-min-price','filter-max-price'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyFilters(); });
  });
}

async function loadSpaces() {
  const grid = document.getElementById('spaces-grid');
  try {
    const params = buildFilterParams();
    const { spaces } = await api.getSpaces(params);
    allSpaces = spaces;
    renderSpaces(spaces);
  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">⚠️</div>
        <h3>Could not load spaces</h3>
        <p>Make sure the backend server is running: <code>npm start</code> in the backend folder.</p>
      </div>`;
  }
}

function buildFilterParams() {
  const params = {};
  const city     = document.getElementById('filter-city').value.trim();
  const search   = document.getElementById('filter-search').value.trim();
  const minPrice = document.getElementById('filter-min-price').value;
  const maxPrice = document.getElementById('filter-max-price').value;

  if (city)         params.city = city;
  if (search)       params.search = search;
  if (activeVehicleFilter !== 'all') params.vehicle_type = activeVehicleFilter;
  if (minPrice)     params.min_price = minPrice;
  if (maxPrice)     params.max_price = maxPrice;

  return params;
}

function applyFilters() {
  const params = buildFilterParams();
  // Update URL without reload
  const url = new URLSearchParams(params);
  window.history.replaceState(null, '', '?' + url.toString());
  updateActiveFilterTags(params);
  loadSpaces();
}

function clearFilters() {
  document.getElementById('filter-city').value = '';
  document.getElementById('filter-search').value = '';
  document.getElementById('filter-min-price').value = '';
  document.getElementById('filter-max-price').value = '';
  setVehicleFilterByValue('all');
  window.history.replaceState(null, '', window.location.pathname);
  document.getElementById('active-filters').innerHTML = '';
  loadSpaces();
}

function setVehicleFilter(el) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  activeVehicleFilter = el.dataset.value;
}

function setVehicleFilterByValue(val) {
  activeVehicleFilter = val || 'all';
  document.querySelectorAll('.filter-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.value === activeVehicleFilter);
  });
}

function updateActiveFilterTags(params) {
  const container = document.getElementById('active-filters');
  const labels = {
    city: '📍', search: '🔍', vehicle_type: '🚗', min_price: '₹ Min', max_price: '₹ Max'
  };
  const tags = Object.entries(params).map(([k, v]) => `
    <span class="active-filter">
      ${labels[k] || k}: <strong>${v}</strong>
      <button onclick="removeFilter('${k}')">✕</button>
    </span>
  `);
  container.innerHTML = tags.join('');
}

function removeFilter(key) {
  const map = { city: 'filter-city', search: 'filter-search', min_price: 'filter-min-price', max_price: 'filter-max-price' };
  if (key === 'vehicle_type') setVehicleFilterByValue('all');
  else if (map[key]) document.getElementById(map[key]).value = '';
  applyFilters();
}

function renderSpaces(spaces) {
  const grid    = document.getElementById('spaces-grid');
  const empty   = document.getElementById('empty-state');
  const counter = document.getElementById('search-count');

  // Sort
  const sort = document.getElementById('sort-select').value;
  if (sort === 'price_asc')  spaces = [...spaces].sort((a,b) => a.price_per_hour - b.price_per_hour);
  if (sort === 'price_desc') spaces = [...spaces].sort((a,b) => b.price_per_hour - a.price_per_hour);
  if (sort === 'rating')     spaces = [...spaces].sort((a,b) => b.avg_rating - a.avg_rating);

  counter.textContent = `${spaces.length} space${spaces.length !== 1 ? 's' : ''} found`;

  if (spaces.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  grid.innerHTML = spaces.map(renderSpaceCard).join('');
}

function toggleSidebar() {
  document.getElementById('search-sidebar').classList.toggle('open');
}

window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.removeFilter = removeFilter;
window.setVehicleFilter = setVehicleFilter;
window.toggleSidebar = toggleSidebar;
