// supabase-client.js
const SUPABASE_URL = 'https://afrfaeouzkjdkkqeozgq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmcmZhZW91emtqZGtrcWVvemdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTg1OTUsImV4cCI6MjA4Nzc5NDU5NX0.CRUaz7sNOuotsV3tVM5O2KvTerAT6uTXHaTy4yKKAdM';

// Forzamos que la instancia sea GLOBAL
window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("✅ Cliente Supabase vinculado al objeto Window");
