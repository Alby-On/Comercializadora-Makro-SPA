// Capturamos el ID de la URL
const urlParams = new URLSearchParams(window.location.search);
const productoId = urlParams.get('id');

// Variable global para almacenar el producto cargado y usarlo al agregar al carrito
let productoActual = null;

async function cargarDetalle() {
    if (!productoId) return;

    try {
        const { data: prod, error } = await _supabase
            .from('productos')
            .select('*')
            .eq('id', productoId)
            .single();

        if (error) throw error;

        // Guardamos los datos necesarios en la variable global
        productoActual = prod;

        // --- 1. LLENADO DE TEXTOS ---
        
        // SKU con Diseño de Ficha Técnica
        const skuElement = document.getElementById('det-sku');
        if (skuElement) {
            // Aplicamos la clase para el diseño y separamos visualmente
            skuElement.className = "sku-detail-container"; 
            const valorSKU = prod.sku ? prod.sku : 'S/N';
            
            // Inyectamos la estructura con etiqueta y valor
            skuElement.innerHTML = `
                <span class="sku-label">SKU:</span>
                <span class="sku-value">${valorSKU}</span>
            `;
        }

        // Nombre y Descripción
        const nombreElement = document.getElementById('det-nombre');
        if (nombreElement) nombreElement.textContent = prod.nombre;
        
        const descElement = document.getElementById('det-descripcion');
        if (descElement) descElement.textContent = prod.descripcion || 'Sin descripción disponible.';

        // Precio
        const precioElement = document.getElementById('det-precio');
        if (precioElement) {
            precioElement.textContent = new Intl.NumberFormat('es-CL', {
                style: 'currency', currency: 'CLP'
            }).format(prod.precio || 0);
        }

        // Categoría (Breadcrumb)
        const breadElement = document.getElementById('bread-categoria');
        if (breadElement) {
            try {
                breadElement.textContent = formatearTextoVisual(prod.categoria);
            } catch (e) {
                breadElement.textContent = prod.categoria;
            }
        }

        // --- 2. MANEJO DINÁMICO DE IMÁGENES ---
        const imgPrincipal = document.getElementById('img-principal');
        const thumbContainer = document.getElementById('thumbnails');
        
        if (imgPrincipal && thumbContainer) {
            const imagenesDisponibles = [prod.url_imagen_1, prod.url_imagen_2, prod.url_imagen_3]
                .filter(url => url && url.trim() !== "");

            thumbContainer.innerHTML = '';

            if (imagenesDisponibles.length > 0) {
                imgPrincipal.src = imagenesDisponibles[0];
                
                imagenesDisponibles.forEach((url, index) => {
                    const imgThumb = document.createElement('img');
                    imgThumb.src = url;
                    imgThumb.alt = `Miniatura ${index + 1}`;
                    imgThumb.className = `thumb-item ${index === 0 ? 'active' : ''}`;
                    
                    imgThumb.onclick = () => {
                        imgPrincipal.src = url;
                        document.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
                        imgThumb.classList.add('active');
                    };
                    
                    thumbContainer.appendChild(imgThumb);
                });
            } else {
                imgPrincipal.src = 'images/no-image.png';
            }
        }

    } catch (err) {
        console.error("Error cargando detalle:", err);
        const skuElement = document.getElementById('det-sku');
        if (skuElement) {
            skuElement.classList.remove("sku-detail-container");
            skuElement.textContent = "Error al cargar datos";
        }
    }
}

// --- LÓGICA DE COMPRA ---

// Función para el selector de cantidad
window.cambiarCantidad = (valor) => {
    const input = document.getElementById('input-cantidad');
    if (!input) return;
    let nuevaCant = parseInt(input.value) + valor;
    if (nuevaCant >= 1) {
        input.value = nuevaCant;
    }
};

// Función para enviar al carrito global
window.prepararAgregado = () => {
    if (!productoActual) {
        console.error("No hay datos del producto para agregar.");
        return;
    }

    const inputCant = document.getElementById('input-cantidad');
    const cantidad = parseInt(inputCant.value) || 1;

    // Usamos la función global con el nuevo parámetro SKU
    if (typeof agregarAlCarrito === 'function') {
        agregarAlCarrito(
            productoActual.id, 
            productoActual.nombre, 
            productoActual.precio, 
            productoActual.sku || "S/N", // <--- PASAMOS EL SKU AQUÍ
            cantidad
        );
        
        // Feedback visual
        inputCant.value = 1;
        
        // Abrir el carrito para confirmar la acción
        if (typeof toggleCart === 'function') {
            toggleCart();
        }
    } else {
        console.error("La función agregarAlCarrito no está disponible.");
    }
};

document.addEventListener('DOMContentLoaded', cargarDetalle);
