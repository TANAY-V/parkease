/* ─── login.js — Auth Page Logic ─────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  if (Auth.isLoggedIn()) {
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    window.location.href = redirect || 'dashboard.html';
    return;
  }

  // Auto switch to register tab if URL says so
  const tab = new URLSearchParams(window.location.search).get('tab');
  if (tab === 'register') showTab('register');
});

function showTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
  // Clear errors
  document.getElementById('login-error').classList.add('hidden');
  document.getElementById('reg-error').classList.add('hidden');
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  btn.disabled = true; btn.textContent = 'Signing in...';
  errEl.classList.add('hidden');

  try {
    const { user, token } = await api.login({
      email: document.getElementById('login-email').value.trim(),
      password: document.getElementById('login-password').value
    });
    Auth.setSession(token, user);
    Toast.success(`Welcome back, ${user.name.split(' ')[0]}! 👋`);

    const redirect = new URLSearchParams(window.location.search).get('redirect');
    setTimeout(() => window.location.href = redirect || 'dashboard.html', 800);
  } catch (err) {
    errEl.textContent = err.message || 'Login failed. Please check your credentials.';
    errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Sign In →';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('reg-btn');
  const errEl = document.getElementById('reg-error');
  btn.disabled = true; btn.textContent = 'Creating account...';
  errEl.classList.add('hidden');

  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const pass  = document.getElementById('reg-password').value;

  if (!name || !email || !pass) {
    errEl.textContent = 'Please fill in all required fields.';
    errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Create Account →';
    return;
  }

  try {
    const { user, token } = await api.register({ name, email, phone: phone || undefined, password: pass });
    Auth.setSession(token, user);
    Toast.success(`Welcome to ParkEase, ${user.name.split(' ')[0]}! 🎉`);

    const redirect = new URLSearchParams(window.location.search).get('redirect');
    setTimeout(() => window.location.href = redirect || 'dashboard.html', 800);
  } catch (err) {
    errEl.textContent = err.message || 'Registration failed. Please try again.';
    errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Create Account →';
  }
}

window.showTab = showTab;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
