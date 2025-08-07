import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hxzsadyxljpnxqlabofy.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4enNhZHl4bGpwbnhxbGFib2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzMyMjAsImV4cCI6MjA2ODc0OTIyMH0.ADRNvpfiKGKQfpGP-JEiZkBd5WO5RmchbewTzvu0g_8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false // Marketing site doesn't need URL detection
  }
});

export default supabase;