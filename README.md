# 🅿️ ParkEase — Parking Space Marketplace

India's parking marketplace where space owners can **list and earn** and drivers can **book and save** — no more parking fines!

## ✨ Features

- 🔍 **Search & filter** parking spaces by city, vehicle type, price
- 📅 **Book hourly** with real-time cost calculator
- 💳 **Simulated payment** (UPI / Card / Net Banking UI)
- ⭐ **Reviews & ratings** for spaces
- 📊 **Owner dashboard** with earnings tracking
- ➕ **List a space** with live card preview
- 🔐 **JWT authentication** (register + login)
- 🗺️ **Google Maps** embed for space location

## 🚀 Run Locally

```bash
# 1. Start the backend
cd "back end"
npm install
node server.js
# → Running on http://localhost:5000

# 2. Open frontend in browser
# Open: front end/index.html
```

**Demo login:** `rajesh@example.com` / `password123`

## 🌐 Deploy Online

**Backend → [Render.com](https://render.com)** (free)
1. Push this repo to GitHub
2. Go to render.com → New Web Service → connect repo
3. Root directory: `back end` | Start command: `node server.js`
4. Copy your Render URL (e.g. `https://parkease-api.onrender.com`)

**Frontend → [Netlify.com](https://netlify.com)** (free)
1. Go to netlify.com → New site → Deploy manually OR connect GitHub
2. Publish directory: `front end`
3. Update `front end/js/config.js` with your Render backend URL

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | HTML5, Vanilla CSS (glassmorphism), Vanilla JS |
| Backend | Node.js, Express.js |
| Database | SQLite (better-sqlite3) — auto-created |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Fonts | Inter + Space Grotesk (Google Fonts) |

## 📁 Project Structure

```
parking/
├── back end/           # Node.js + Express API
│   ├── routes/         # auth, spaces, bookings, reviews
│   ├── middleware/     # JWT auth middleware
│   ├── db.js           # SQLite setup + seed data
│   └── server.js       # Entry point
│
└── front end/          # Static HTML/CSS/JS
    ├── index.html      # Landing page
    ├── search.html     # Browse spaces
    ├── listing.html    # Space detail + booking
    ├── login.html      # Auth page
    ├── dashboard.html  # User dashboard
    ├── list-space.html # Create/edit listing
    ├── payment.html    # Payment simulation
    ├── css/            # Per-page stylesheets
    └── js/             # Per-page logic + shared helpers
```

---
Made with ❤️ for Indian drivers 🇮🇳
