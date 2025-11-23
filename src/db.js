// src/db.js
// -----------------------------------------------------------------------------
// POSTGRES CONNECTION POOL — STABLE FOR SUPABASE POOLER
// Prevents: {:shutdown, :db_termination}, FATAL XX000, idle disconnects
// -----------------------------------------------------------------------------

import pg from "pg";
const { Pool } = pg;

// Prevent missing env
if (!process.env.DATABASE_URL) {
  console.error("❌ Missing DATABASE_URL env variable");
  process.exit(1);
}

// Create stable pool config
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: { rejectUnauthorized: false },

  // IMPORTANT for Supabase Pooler:
  max: 5, // small pool required by Supabase
  idleTimeoutMillis: 15000, // 15 seconds → prevents idle kill
  connectionTimeoutMillis: 5000, // timeout for slow connects
});

// Handle sudden Postgres pool shutdown and auto-recover
pool.on("error", (err) => {
  console.error(
    "💥 PG Pool Error — likely Supabase dropped connection:",
    err.message
  );
});

// Keep connection alive to avoid being marked idle
setInterval(async () => {
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    console.log("🔥 Keepalive failed:", err.message);
  }
}, 10000); // ping every 10 seconds

export default pool;
