# Brahmworks Inventory OS

A lightweight full-stack inventory management system for Brahmworks built with plain Node.js, a browser front end, and a SQLite-backed data layer.

## Features

- Session-based authentication with role-aware screen and action permissions
- Inventory catalog, editing, deletion, and stock movement adjustments
- Supplier management with edit and delete flows
- Purchase order creation, editing, deletion, receiving, and linked invoice / GRN records
- Exportable HTML documents for purchase orders, invoices, GRNs, and inventory reports
- Persistent SQLite storage in `data/brahmworks.sqlite`

## Run

```bash
npm start
```

Then open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Optional OpenAI Supplier Copilot

The supplier assistant can use OpenAI to understand natural-language requirements before ranking local suppliers and running global web lookups.

Set these environment variables before starting the app:

```bash
export OPENAI_API_KEY="your_api_key_here"
export OPENAI_MODEL="gpt-5-mini"
npm start
```

If `OPENAI_API_KEY` is not set, the app falls back to the built-in supplier matcher automatically.

## Demo Credentials

- `admin@brahmworks.com` / `brahmworks123`
- `ops@brahmworks.com` / `ops12345`
- `procurement@brahmworks.com` / `purchase123`
