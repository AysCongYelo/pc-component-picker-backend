// src/services/supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

if (!process.env.SUPABASE_URL) {
  console.error("❌ Missing SUPABASE_URL");
}

if (!process.env.SUPABASE_ANON_KEY) {
  console.error("❌ Missing SUPABASE_ANON_KEY");
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
