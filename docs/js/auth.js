/* ─── auth.js — Auth state management & navbar rendering ─────────────────── */

const Auth = {
  getToken()  { return localStorage.getItem('pe_token'); },
  getUser()   { const u = localStorage.getItem('pe_user'); return u ? JSON.parse(u) : null; },
  isLoggedIn(){ return !!this.getToken(); },

  setSession(token, user) {
    localStorage.setItem('pe_token', token);
    localStorage.setItem('pe_user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('pe_token');
    localStorage.removeItem('pe_user');
  },

  logout() {
    this.clearSession();
    window.location.href = '/index.html';
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
      return false;
    }
    return true;
  },

  redirectIfLoggedIn() {
    if (this.isLoggedIn()) {
      window.location.href = '/dashboard.html';
    }
  }
};

/* ─── Toast Notifications ────────────────────────────────────────────────────── */
const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 4000) {
    this.init();
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span>${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    this.container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error'); },
  info(msg)    { this.show(msg, 'info'); },
};

/* ─── Navbar Rendering ───────────────────────────────────────────────────────── */
function renderNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const user = Auth.getUser();
  const loggedIn = Auth.isLoggedIn();

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = [
    { href: 'index.html',      label: 'Home' },
    { href: 'search.html',     label: 'Find Parking' },
    { href: 'list-space.html', label: 'List Your Space' },
  ];

  const navHtml = loggedIn ? `
    <div class="nav-user-menu">
      <button class="nav-user-btn" onclick="toggleDropdown()" id="nav-user-btn">
        <div class="nav-avatar">${user.name[0].toUpperCase()}</div>
        <span>${user.name.split(' ')[0]}</span>
        <span>▾</span>
      </button>
      <div class="nav-dropdown" id="nav-dropdown">
        <a href="dashboard.html">🏠 Dashboard</a>
        <a href="list-space.html">➕ List a Space</a>
        <div class="divider" style="margin: 0.25rem 0;"></div>
        <button onclick="Auth.logout()">🚪 Logout</button>
      </div>
    </div>
  ` : `
    <a href="login.html" class="btn btn-outline btn-sm">Login</a>
    <a href="login.html?tab=register" class="btn btn-primary btn-sm">Sign Up Free</a>
  `;

  navbar.innerHTML = `
    <div class="container">
      <a href="index.html" class="navbar-brand">
        <div class="logo-icon">🅿️</div>
        <span class="text-gradient">ParkEase</span>
      </a>
      <nav class="navbar-nav">
        ${navLinks.map(l => `
          <a href="${l.href}" class="${currentPage === l.href ? 'active' : ''}">${l.label}</a>
        `).join('')}
      </nav>
      <div class="navbar-actions">${navHtml}</div>
    </div>
  `;
}

function toggleDropdown() {
  const dd = document.getElementById('nav-dropdown');
  if (dd) dd.classList.toggle('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-user-menu')) {
    document.getElementById('nav-dropdown')?.classList.remove('open');
  }
});

/* ─── Utility Helpers ────────────────────────────────────────────────────────── */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function renderStars(rating, max = 5) {
  return Array.from({ length: max }, (_, i) =>
    `<span class="${i < Math.round(rating) ? 'star-display' : 'star-empty'}">★</span>`
  ).join('');
}

function getVehicleLabel(type) {
  return { car: '🚗 Car', bike: '🏍️ Bike', both: '🚗🏍️ Car & Bike' }[type] || type;
}

function getStatusTag(status) {
  const map = {
    confirmed: 'tag-success', pending: 'tag-warning',
    cancelled: 'tag-danger', completed: 'tag-accent'
  };
  return `<span class="tag ${map[status] || ''}">${status}</span>`;
}

function getPaymentTag(status) {
  return status === 'paid'
    ? `<span class="tag tag-success">✅ Paid</span>`
    : `<span class="tag tag-warning">⏳ Unpaid</span>`;
}

window.Auth = Auth;
window.Toast = Toast;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.renderStars = renderStars;
window.getVehicleLabel = getVehicleLabel;
window.getStatusTag = getStatusTag;
window.getPaymentTag = getPaymentTag;
window.renderNavbar = renderNavbar;
window.toggleDropdown = toggleDropdown;

document.addEventListener('DOMContentLoaded', renderNavbar);
