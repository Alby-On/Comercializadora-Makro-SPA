// --- VARIABLES GLOBALES ---
let archivosListos = { foto1: null, foto2: null, foto3: null };
// Reemplazamos el objeto estático por uno que se llenará desde Supabase
let datosEnergyDinamicos = {}; 

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('add-form').addEventListener('submit', inyectarEquipo);
    // Cargamos las categorías apenas abre la página
    cargarCategoriasDesdeBD();
});

/**
 * Carga las categorías desde configuracion_catalogo y llena el select principal
 */
async function cargarCategoriasDesdeBD() {
    const catSelect = document.getElementById("cat");
    try {
        const client = window._supabase || _supabase;
        const { data, error } = await client
            .from('configuracion_catalogo')
            .select('*');

        if (error) throw error;

        // Limpiar objeto local y select
        datosEnergyDinamicos = {};
        catSelect.innerHTML = '<option value="">Seleccione Categoría</option>';

        data.forEach(item => {
            // Guardamos subcategorías en el objeto local para el onchange
            datosEnergyDinamicos[item.categoria] = item.subcategorias;

            // Añadimos la opción al select
            const option = document.createElement("option");
            option.value = item.categoria;
            option.textContent = item.nombre_visible;
            catSelect.appendChild(option);
        });
        console.log("✅ Categorías cargadas dinámicamente");
    } catch (err) {
        console.error("Error al cargar categorías:", err);
    }
}

// --- LÓGICA DE CATEGORÍAS (AHORA DINÁMICA) ---
function cargarSubcategorias() {
    const catSelect = document.getElementById("cat");
    const subcatSelect = document.getElementById("subcat");
    const seleccion = catSelect.value;

    subcatSelect.innerHTML = '<option value="">Seleccione Sub-Categoría</option>';

    // Verificamos en nuestro objeto dinámico en lugar del antiguo objeto fijo
    if (seleccion && datosEnergyDinamicos[seleccion]) {
        subcatSelect.disabled = false; 
        datosEnergyDinamicos[seleccion].forEach(sub => {
            const option = document.createElement("option");
            // Usamos el texto tal cual como valor para mantener consistencia
            option.value = sub; 
            option.textContent = sub;
            subcatSelect.appendChild(option);
        });
    } else {
        subcatSelect.disabled = true;
    }
}

// --- NAVEGACIÓN ---
function showView(viewId, btn) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    btn.classList.add('active');
    
    // Si entras a inventario, carga la tabla
    if(viewId === 'list-view' && typeof cargarTablaDesdeSupabase === 'function') {
        cargarTablaDesdeSupabase();
    }
    // Si entras a agregar producto, refrescamos categorías por si hubo cambios
    if(viewId === 'add-view') {
        cargarCategoriasDesdeBD();
    }
}

// --- PROCESAMIENTO DE IMÁGENES (Mantenido igual) ---
const opcionesCompresion = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: 'image/webp'
};

async function previewAndProcess(input, imgId) {
    const file = input.files[0];
    if (!file) return;
    const preview = document.getElementById(imgId);
    
    try {
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block'; 
        
        const compressedFile = await imageCompression(file, opcionesCompresion);
        archivosListos[input.id] = compressedFile;
    } catch (error) {
        console.error("Error al procesar preview:", error);
    }
}

// --- INYECCIÓN (INSERT) (Mantenido igual con tus campos) ---
async function inyectarEquipo(e) {
    e.preventDefault();

    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = "Procesando e Inyectando...";
    btn.disabled = true;

    const urls = [];

    try {
        const client = window._supabase || _supabase;
        if (!client) throw new Error("La conexión con Supabase no está definida.");

        // 1. Ciclo de subida de imágenes
        for (let i = 1; i <= 3; i++) {
            const file = archivosListos[`foto${i}`];
            if (file) {
                const fileName = `productos/${Date.now()}_${i}.webp`;
                const { error: uploadError } = await client.storage
                    .from('fotos-productos')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: publicData } = client.storage
                    .from('fotos-productos')
                    .getPublicUrl(fileName);
                
                urls.push(publicData.publicUrl);
            } else { 
                urls.push(null); 
            }
        }

        // 2. Preparación del Payload
        const payload = {
            nombre: document.getElementById('nombre').value,
            sku: document.getElementById('sku').value || "S/N",
            categoria: document.getElementById('cat').value,
            subcategoria: document.getElementById('subcat').value,
            stock: parseInt(document.getElementById('stock').value) || 0,
            precio: parseInt(document.getElementById('precio').value) || 0,
            descripcion: document.getElementById('desc').value,
            url_imagen_1: urls[0], 
            url_imagen_2: urls[1], 
            url_imagen_3: urls[2]
        };

        // 3. Inserción
        const { error: insertError } = await client
            .from('productos')
            .insert([payload]);

        if (insertError) throw insertError;

        alert("¡Producto inyectado con éxito en Energy Comercial SPA!");
        
        e.target.reset();
        document.querySelectorAll('.thumb-preview').forEach(img => {
            img.src = "";
            img.style.display = 'none';
        });
        document.getElementById('subcat').disabled = true;
        archivosListos = { foto1: null, foto2: null, foto3: null };

    } catch (err) {
        console.error("DETALLE DEL ERROR:", err);
        alert("FALLO LA INYECCIÓN: " + err.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}
