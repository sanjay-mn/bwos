// This file intentionally left minimal.
// Vercel routes /api/* through api/[...slug].js (the catch-all).
// This file exists only to satisfy file system tooling.
module.exports = (req, res) => res.status(404).json({ error: "Use /api/<path>" });
