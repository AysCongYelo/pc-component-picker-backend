// src/services/supabaseClient.js
// -----------------------------------------------------------------------------
// SUPABASE PUBLIC (ANON) CLIENT
// Used for non-privileged operations (signup/login, public queries).
// Safe to expose server-side, but NEVER send the anon key to frontend mobile
// unless intended for client-side access.
// -----------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
  console.error("❌ Missing SUPABASE_URL in environment variables.");
}

if (!process.env.SUPABASE_ANON_KEY) {
  console.error("❌ Missing SUPABASE_ANON_KEY in environment variables.");
}

// Create public Supabase client (anon key)
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false, // backend should not auto-refresh
      persistSession: false, // no session persistence on server
    },
  }
);
