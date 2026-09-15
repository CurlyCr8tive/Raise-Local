import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Anon/public key only. Safe to ship in browser code — Row Level Security
// policies (supabase/migrations) are what actually restrict access, not this
// key. Never put the service_role key here.
const SUPABASE_URL = "https://ojirczskecmcwpkwiomq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qaXJjenNrZWNtY3dwa3dpb21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMzA0NzQsImV4cCI6MjEwNDcwNjQ3NH0.2pkWYVEZUyKSOby0HoefiyX-a32B_9KRjk0MnNEva3U";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
