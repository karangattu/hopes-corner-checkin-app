import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let supabaseClient = null;

if (isSupabaseConfigured) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: "hopes-corner-auth-session",
    },
    global: {
      headers: {
        "x-client-info": "hopes-corner-checkin-app",
      },
    },
  });
} else {
  if (import.meta.env.DEV) {
    console.warn(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cloud sync.",
    );
  }
}

export const supabase = supabaseClient;
export const isSupabaseEnabled = isSupabaseConfigured;

export const assertSupabase = () => {
  if (!supabaseClient) {
    throw new Error(
      "Supabase client is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  return supabaseClient;
};

export default supabaseClient;
