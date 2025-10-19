import { createClient } from "@supabase/supabase-js";
import { supabaseProxy } from "./supabaseProxyClient";

const useProxy = import.meta.env.VITE_USE_SUPABASE_PROXY === "true";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isSupabaseConfigured = useProxy || Boolean(supabaseUrl && supabaseAnonKey);

const getSupabaseSyncPreference = () => {
  if (!isSupabaseConfigured) return false;
  
  const savedPreference = localStorage.getItem("hopes-corner-enable-supabase-sync");
  
  if (savedPreference !== null) {
    return savedPreference === "true";
  }
  
  if (import.meta.env.DEV) {
    return false;
  }
  
  return isSupabaseConfigured;
};

let supabaseSyncEnabled = getSupabaseSyncPreference();

let supabaseClient = null;

if (useProxy) {
  supabaseClient = supabaseProxy;
} else if (supabaseUrl && supabaseAnonKey) {
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
    console.info(
      "Supabase sync is disabled. Using localStorage only. To enable cloud sync, configure Supabase credentials in .env.local",
    );
  }
}

export const supabase = supabaseClient;
export const isSupabaseEnabled = () => supabaseSyncEnabled && isSupabaseConfigured;
export const checkIfSupabaseConfigured = () => isSupabaseConfigured;
export const isUsingProxy = useProxy;

export const setSupabaseSyncEnabled = (enabled) => {
  if (!isSupabaseConfigured && enabled) {
    console.warn("Cannot enable Supabase sync: Supabase is not configured");
    return false;
  }
  supabaseSyncEnabled = enabled;
  localStorage.setItem("hopes-corner-enable-supabase-sync", enabled.toString());
  return true;
};

export const getSupabaseSyncEnabled = () => supabaseSyncEnabled;

export const assertSupabase = () => {
  if (!supabaseClient) {
    throw new Error(
      "Supabase client is not configured. Please configure either proxy mode or direct mode.",
    );
  }
  return supabaseClient;
};

export default supabaseClient;

