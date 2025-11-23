// src/supabaseAdmin.js
// -----------------------------------------------------------------------------
// SUPABASE ADMIN CLIENT
// Uses the service role key for privileged server-side operations.
// DO NOT expose this client to the frontend.
// -----------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
  console.error("❌ Missing SUPABASE_URL in environment variables.");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "❌ Missing SUPABASE_SERVICE_ROLE_KEY in environment variables."
  );
}

// Create Supabase admin client (service role)
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false, // No auto-refresh for server-side
      persistSession: false, // No session persistence on server
    },
  }
);
