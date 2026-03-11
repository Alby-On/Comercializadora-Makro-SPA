// supabase-client.js
const SUPABASE_URL = 'https://bochbeuqiruhkhpxdatb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvY2hiZXVxaXJ1aGtocHhkYXRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDUxNTMsImV4cCI6MjA4ODcyMTE1M30.LncnnP7KUzMv7MVc7TsSq-mepjdYxXxD-8jAYfCBWBo';

// Forzamos que la instancia sea GLOBAL
window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("✅ Cliente Supabase vinculado al objeto Window");
