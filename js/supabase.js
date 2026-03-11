// Configuración centralizada de Supabase para Energy SPA
const supabaseUrl = 'https://bochbeuqiruhkhpxdatb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvY2hiZXVxaXJ1aGtocHhkYXRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDUxNTMsImV4cCI6MjA4ODcyMTE1M30.LncnnP7KUzMv7MVc7TsSq-mepjdYxXxD-8jAYfCBWBo';

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
