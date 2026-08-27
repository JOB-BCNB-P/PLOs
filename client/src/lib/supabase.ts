/** Clinical Aurora: Supabase client configuration. Browser uses only the publishable key; RLS remains the authorization boundary. */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ootfwcssrgzpliadjlau.supabase.co";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_RVWFLRUdBe1gIakvB_PRhg__ktVyZEj";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
