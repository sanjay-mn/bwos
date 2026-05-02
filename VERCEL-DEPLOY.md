# Brahmworks Inventory OS — Vercel + Neon Deployment Guide

## Architecture

| Layer | Technology |
|---|---|
| Frontend | Static files in `public/` (HTML + CSS + JS) |
| Backend | Vercel Serverless Function at `api/[...slug].js` (catch-all) |
| Database | **Neon** (PostgreSQL) — serverless Postgres with HTTP transport |
| Auth | Bearer token (`Authorization: Bearer <token>` header + `localStorage`) |

---

## Step 1 — Neon Database

You already have a Neon project created. If you need the connection string:

1. Go to https://console.neon.tech → your project → **Connection Details**
2. Copy the **Connection string**:
   ```
   postgresql://neondb_owner:***@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
3. This is your `NEON_DATABASE_URL`.

> **No schema needed** — all tables are created automatically on the first request.

---

## Step 2 — Deploy to Vercel

### Option A — Vercel UI (recommended)

1. Push this repository to GitHub (or GitLab / Bitbucket).
2. Go to https://vercel.com/dashboard → **Add New Project** → **Import Git Repository**.
3. Select your repo. Vercel will auto-detect the config from `vercel.json`:
   - **Build command:** `npm install`
   - **Output directory:** `public`
4. Click **Deploy** — the first deploy may show a DB error because env vars aren't set yet. That's fine.

### Option B — Vercel CLI

```bash
npm install -g vercel
vercel login
vercel                  # follow the prompts
vercel --prod           # deploy to production
```

---

## Step 3 — Set Environment Variables

In the Vercel dashboard → your project → **Settings** → **Environment Variables**, add:

| Variable | Required | Value |
|---|---|---|
| `NEON_DATABASE_URL` | ✅ Yes | `postgresql://neondb_owner:***@ep-xxx.neon.tech/neondb?sslmode=require` |
| `OPENAI_API_KEY` | Optional | OpenAI key for supplier AI assistant |
| `OPENAI_MODEL` | Optional | defaults to `gpt-4o-mini` |
| `RAZORPAY_KEY_ID` | Optional | Razorpay key for payment integration |
| `RAZORPAY_KEY_SECRET` | Optional | Razorpay secret |
| `BRAHMWORKS_GST_RATE` | Optional | GST % (default: `18`) |
| `BRAHMWORKS_GST_STATE` | Optional | Home state for IGST/CGST split (default: `Tamil Nadu`) |

After adding env vars, click **Redeploy** from the Deployments tab.

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

# Start local dev server (uses Vercel Dev which emulates serverless functions)
npx vercel dev
# App available at http://localhost:3000
```

---

## File Structure

```
BW-Project/
├── vercel.json                   # Vercel config (routing, build, function settings)
├── package.json                  # Dependencies (@neondatabase/serverless)
├── api/
│   └── [...slug].js              # Catch-all serverless function — all backend logic
└── public/
    ├── index.html                # SPA shell
    ├── app.js                    # Frontend JS (state, API calls, rendering)
    ├── styles.css                # Styles
    ├── quote-dfm.html/js         # DFM analysis viewer
    ├── quote-review.html/js      # Customer quote review
    └── quote-checkout.html/js    # Checkout flow
```

---

## How Routing Works

`api/[...slug].js` is a Vercel **catch-all** function. Every `/api/*` request is handled by it automatically — no rewrites needed.

| URL Prefix | Handled by |
|---|---|
| `/api/auth/*` | `[...slug].js` — login, signup |
| `/api/inventory/*` | `[...slug].js` — items CRUD |
| `/api/suppliers/*` | `[...slug].js` — supplier management |
| `/api/purchase-orders/*` | `[...slug].js` — PO lifecycle |
| `/api/documents/*` | `[...slug].js` — PDF document generation |
| `/api/project-files/*` | `[...slug].js` — file downloads |
| `/api/quote-files/*` | `[...slug].js` — quote attachment downloads |
| `/*` (all other) | `public/index.html` — SPA fallback |

---

## File Viewers

| File Type | Viewer |
|---|---|
| `.pdf` | PDF.js — page-by-page preview with navigation |
| `.step` / `.stp` | occt-import-js + Three.js — interactive 3D WebGL viewer |
| `.xlsx` / `.csv` | SheetJS — spreadsheet table preview |
| `.gbr` / `.kicad_pcb` | PCB info panel + direct links to JLCPCB / PCBWay |
| Images | Inline `<img>` |

---

## Notes

- **File uploads** are stored as base64 in the database (no filesystem required).
- **Sessions** are stateless bearer tokens stored in `localStorage` — no cookies.
- **Neon HTTP transport** (`@neondatabase/serverless`) is used — no TCP connection issues in serverless.
- **Body parser is disabled** on the function (`config.api.bodyParser = false`) so large file uploads work correctly.
- The Netlify config (`netlify.toml`, `netlify/functions/`) is still present in the repo but ignored by Vercel.
