import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Read from environment if provided
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  if (supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseInstance;
  }
  return null;
}

export interface SupabaseConfigStatus {
  connected: boolean;
  configured: boolean;
  supabaseUrl?: string;
  tablesSynced?: string[];
  message?: string;
}

export async function checkSupabaseStatus(): Promise<SupabaseConfigStatus> {
  try {
    const res = await fetch("/api/supabase/status");
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback to local check
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      connected: false,
      configured: false,
      message: "SUPABASE_URL and SUPABASE_ANON_KEY are not configured yet."
    };
  }

  try {
    const { error } = await client.from("appointments").select("id").limit(1);
    if (error && error.code !== "PGRST116") {
      return {
        connected: false,
        configured: true,
        message: error.message
      };
    }
    return {
      connected: true,
      configured: true,
      message: "Connected to Supabase successfully."
    };
  } catch (err: unknown) {
    return {
      connected: false,
      configured: true,
      message: err instanceof Error ? err.message : "Connection failed"
    };
  }
}
