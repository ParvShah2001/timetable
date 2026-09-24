/**
 * Permanent Supabase Project Credentials.
 * 
 * NOTE: The Supabase Anon Key is designed by Supabase to be public client-side.
 * It is completely safe to embed because Supabase Row-Level Security (RLS) policies
 * protect the database so users can only access their own data.
 * 
 * Putting your credentials here ensures NO DEVICE (phone, tablet, PC, GitHub Pages)
 * will ever be asked to enter the Supabase URL or Anon key again!
 */

export const SUPABASE_CONFIG = {
  // Your Supabase Project URL (e.g. "https://abcdefghijklm.supabase.co")
  url: import.meta.env.VITE_SUPABASE_URL || '',

  // Your Supabase Anon / Public API Key
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
};
