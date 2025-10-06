import { createClient } from "@supabase/supabase-js";
import { supabaseProxy } from "./supabaseProxyClient";

// Check if we should use the proxy (Firebase Functions) instead of direct connection
const useProxy = import.meta.env.VITE_USE_SUPABASE_PROXY === "true";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabase is configured if we're using the proxy OR if we have direct credentials
const isSupabaseConfigured = useProxy || Boolean(supabaseUrl && supabaseAnonKey);

let supabaseClient = null;

if (useProxy) {
  // Use Firebase Functions proxy to avoid exposing Supabase credentials
  supabaseClient = supabaseProxy;
  console.log("Supabase proxy mode enabled - credentials secured via Firebase Functions");
} else if (supabaseUrl && supabaseAnonKey) {
  // Direct connection (legacy mode - exposes credentials on client)
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
  console.warn(
    "Supabase direct connection mode - credentials are exposed on client. Consider using VITE_USE_SUPABASE_PROXY=true"
  );
} else {
  if (import.meta.env.DEV) {
    console.warn(
      "Supabase is not configured. Either set VITE_USE_SUPABASE_PROXY=true for proxy mode, or set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for direct mode.",
    );
  }
}

export const supabase = supabaseClient;
export const isSupabaseEnabled = isSupabaseConfigured;
export const isUsingProxy = useProxy;

export const assertSupabase = () => {
  if (!supabaseClient) {
    throw new Error(
      "Supabase client is not configured. Please configure either proxy mode or direct mode.",
    );
  }
  return supabaseClient;
};

export default supabaseClient;
