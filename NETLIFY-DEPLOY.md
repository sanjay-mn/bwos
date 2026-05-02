# Brahmworks Inventory OS — Netlify + Neon Deployment Guide

## Architecture Overview

| Layer | Technology |
|---|---|
| Frontend | Static files in `public/` (HTML + CSS + JS) |
| Backend | Netlify Serverless Function at `netlify/functions/api.js` |
| Database | **Neon** (PostgreSQL) — serverless Postgres with HTTP transport |
| Auth | Bearer token (`Authorization: Bearer <token>` header + `localStorage`) |

---

## Step 1 — Create a Neon Database

1. Sign up or log in at https://console.neon.tech
2. Create a new **Project** (name it e.g. `brahmworks`) — region: **AWS US East 1** or closest to you.
3. Once created, go to **Connection Details** → copy the **Connection string**:
   ```
   postgresql://neondb_owner:***@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
4. This is your `NEON_DATABASE_URL`.

> **No schema needed** — the app creates all tables automatically on first request.

---

## Step 2 — Deploy to Netlify

### Option A — Netlify UI (recommended for first deploy)

1. Push this repository to GitHub (or GitLab / Bitbucket).
2. Go to https://app.netlify.com → **Add new site** → **Import an existing project**.
3. Connect your repo.
4. Build settings are auto-detected from `netlify.toml`:
   - **Build command:** `npm install`
   - **Publish directory:** `public`
5. Click **Deploy site** — the first deploy will likely fail because env vars aren't set yet. That's fine.

### Option B — Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init          # follow prompts
netlify deploy --prod
```

---

## Step 3 — Set Environment Variables

In the Netlify dashboard → **Site configuration** → **Environment variables**, add:

| Variable | Required | Value |
|---|---|---|
| `NEON_DATABASE_URL` | ✅ Yes | `postgresql://neondb_owner:***@ep-xxx...neon.tech/neondb?sslmode=require` |
| `OPENAI_API_KEY` | Optional | OpenAI key for supplier AI assistant |
| `OPENAI_MODEL` | Optional | defaults to `gpt-4o-mini` |
| `RAZORPAY_KEY_ID` | Optional | Razorpay key for payment integration |
| `RAZORPAY_KEY_SECRET` | Optional | Razorpay secret |
| `BRAHMWORKS_GST_RATE` | Optional | GST % (default: `18`) |
| `BRAHMWORKS_GST_STATE` | Optional | Home state for IGST/CGST split (default: `Tamil Nadu`) |

After setting env vars, trigger a **Redeploy** from the Deploys tab.

---

## Step 4 — First Run (Database Init)

On the first request the function automatically:
1. Creates all database tables (inventory, users, suppliers, purchase_orders, etc.)
2. Seeds default pricing rates and services
3. Creates 3 demo users (if no users exist)

**Demo credentials (seeded automatically):**

| Email | Password | Role |
|---|---|---|
| `admin@brahmworks.com` | `brahmworks123` | Admin |
| `ops@brahmworks.com` | `ops12345` | Operations |
| `procurement@brahmworks.com` | `purchase123` | Procurement |

**Change these passwords immediately after first login.**

---

## Step 5 — Local Development

```bash
npm install

# Create a .env file with your Neon connection string
cat > .env <<EOF
NEON_DATABASE_URL=postgresql://neondb_owner:***@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
EOF

# Start local dev server (uses Netlify Dev which emulates functions)
npm run dev
# App available at http://localhost:8888
```

---

## File Structure

```
BW-Project/
├── netlify.toml                  # Netlify config (routes, build, functions dir)
├── package.json                  # Dependencies (@neondatabase/serverless)
├── netlify/
│   └── functions/
│       └── api.js                # Single serverless function — all backend logic
└── public/
    ├── index.html                # SPA shell
    ├── app.js                    # Frontend JS (state, API calls, rendering)
    └── styles.css                # Styles
```

---

## File Viewers

The app includes browser-based viewers for uploaded project documents:

| File Type | Viewer |
|---|---|
| `.pdf` | PDF.js — page-by-page preview with navigation |
| `.step` / `.stp` | occt-import-js + Three.js — interactive 3D WebGL viewer |
| `.xlsx` / `.csv` | SheetJS — spreadsheet table preview |
| `.gbr` / `.kicad_pcb` | PCB info panel + direct links to JLCPCB / PCBWay |
| Images | Inline `<img>` |

---

## API Routes

All routes are handled by `netlify/functions/api.js` via redirect rules in `netlify.toml`.

| Prefix | Purpose |
|---|---|
| `/api/*` | JSON REST API |
| `/documents/*` | HTML document generation (PO, GRN, Invoice, etc.) |
| `/project-files/:id` | Project file downloads (base64 from DB) |
| `/quote-files/:id` | Quote attachment downloads (base64 from DB) |

---

## Notes

- **File uploads** are stored as base64 in the database (no filesystem required).
- **Sessions** are stateless bearer tokens stored in `localStorage` — no cookies.
- **Neon HTTP transport** (`@neondatabase/serverless`) is used — no TCP connection issues in serverless.
- **Warm invocations** reuse the DB connection and pricing cache for performance.
- The function uses `esbuild` bundler (set in `netlify.toml`) for fast cold starts.
