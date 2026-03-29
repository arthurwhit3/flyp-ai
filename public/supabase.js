const SUPABASE_URL = "https://hiukabgrnlatlmjlimux.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpdWthYmdybmxhdGxtamxpbXV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NTAzNzYsImV4cCI6MjA5MDMyNjM3Nn0.UNeHq4-b9qz_DQ6rHPT15c7YaMidrzZIpsTjShYBmJc";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL, SUPABASE_ANON_KEY

);

window.supabaseClient = supabaseClient;