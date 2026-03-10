// Configuración centralizada de Supabase para Energy SPA
const supabaseUrl = 'https://afrfaeouzkjdkkqeozgq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmcmZhZW91emtqZGtrcWVvemdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTg1OTUsImV4cCI6MjA4Nzc5NDU5NX0.CRUaz7sNOuotsV3tVM5O2KvTerAT6uTXHaTy4yKKAdM';

// Exportamos el cliente para que esté disponible globalmente
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Función utilitaria global (opcional ponerla aquí para que esté en todas partes)
function formatearTextoVisual(texto) {
    if (!texto) return '';
    return texto
        .replace(/_/g, ' ')
        .toLowerCase()
        .split(' ')
        .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
        .join(' ');
}
