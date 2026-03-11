/* ================================================================
   LÓGICA GLOBAL DEL CARRITO - ENERGY COMERCIALIZADORA
   ================================================================ */

// 1. Persistencia: Cargar el carrito desde el navegador
let carrito = JSON.parse(localStorage.getItem('energy_cart')) || [];

/**
 * Control de apertura y cierre del panel lateral
 */
function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Bloqueamos el scroll del fondo si el carro está abierto
        document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : 'auto';
    }
}

/**
 * Agrega productos (Soporta unidades múltiples para la página de detalle)
 */

function agregarAlCarrito(id, nombre, precio, sku = "S/N", cantidad = 1) {
    const productoExistente = carrito.find(item => item.id === id);

    if (productoExistente) {
        productoExistente.cantidad += cantidad;
    } else {
        // Ahora guardamos también el SKU en el objeto del carrito
        carrito.push({ id, nombre, precio, sku, cantidad });
    }

    actualizarInterfaz();
}

/**
 * Elimina un producto por completo del listado
 */
function eliminarDelCarrito(id) {
    carrito = carrito.filter(item => item.id !== id);
    actualizarInterfaz();
}

/**
 * Guarda los cambios y refresca el contador (Badge) y la lista visual
 */
function actualizarInterfaz() {
    // 1. PRIMERO: Guardamos lo que hay en la variable 'carrito' al disco
    localStorage.setItem('energy_cart', JSON.stringify(carrito));
    
    // 2. ACTUALIZAMOS EL BADGE (Círculo naranja)
    const badge = document.getElementById('cart-badge');
    const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);
    
    if (badge) {
        badge.innerText = totalItems;
        badge.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    // 3. DIBUJAMOS LA LISTA
    renderizarLista();
}

/**
 * Dibuja los productos dentro del sidebar lateral
 */
/**
 * Dibuja los productos dentro del sidebar lateral
 */
function renderizarLista() {
    const listaContenedor = document.getElementById('cart-items-list');
    const totalContenedor = document.getElementById('cart-total-val');
    
    // 1. Verificación de existencia para evitar errores en consola
    if (!listaContenedor || !totalContenedor) return;

    // 2. Si el carrito está vacío, limpiamos ambos contenedores y salimos
    if (carrito.length === 0) {
        listaContenedor.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-box-open"></i>
                <p>Tu carrito está vacío</p>
            </div>`;
        totalContenedor.innerText = '$0';
        return;
    }

    // 3. Calculamos y generamos el HTML en una sola pasada
    let sumaTotal = 0;
    const htmlFinal = carrito.map(item => {
        const subtotal = item.precio * item.cantidad;
        sumaTotal += subtotal;
        
        return `
    <div class="cart-item-render" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
        <div style="flex: 1;">
            <h4 style="font-size: 0.85rem; margin: 0; color: var(--azul-main); line-height: 1.2;">${item.nombre}</h4>
            <div style="font-size: 0.7rem; color: #888; margin: 2px 0;">SKU: ${item.sku}</div> <small style="color: #666;">${item.cantidad} x $${item.precio.toLocaleString('es-CL')}</small>
        </div>
        <button onclick="eliminarDelCarrito('${item.id}')" style="background:none; border:none; color: #e74c3c; cursor:pointer; padding: 5px;">
            <i class="fas fa-trash-alt"></i>
        </button>
    </div>
   `;
    }).join(''); // El .join('') es vital para que no aparezcan comas entre items

    // 4. INSERCIÓN ÚNICA: Esto sobreescribe cualquier contenido previo, eliminando el doble total
    listaContenedor.innerHTML = htmlFinal;
    totalContenedor.innerText = `$${sumaTotal.toLocaleString('es-CL')}`;
}

/**
 * ACCIÓN FINAL: Envío del pedido a WhatsApp
 */
/**
 * Envío del pedido a WhatsApp con SKU incluido
 */
function enviarPedidoWhatsApp() {
    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    let mensaje = "⚡ *SOLICITUD DE COTIZACIÓN - COMERCIALIZADORA MAKRO SPA*%0A%0A";
    mensaje += "Hola, me gustaría consultar por los siguientes productos:%0A%0A";

    carrito.forEach(item => {
        // Formato: • PRODUCTO [SKU-123] (x2)
        mensaje += `• ${item.nombre} *[${item.sku}]* (x${item.cantidad})%0A`;
    });

    const total = document.getElementById('cart-total-val').innerText;
    mensaje += `%0A*TOTAL ESTIMADO:* ${total}%0A%0A_Favor confirmar disponibilidad para retiro o despacho en Chillán._`;

    const telefono = "56932318919"; 
    window.open(`https://wa.me/${telefono}?text=${mensaje}`, '_blank');
}

// --- INICIALIZACIÓN DE INTERFAZ ---

function iniciarCarro() {
    // LEER del disco solo al iniciar la página o el componente
    carrito = JSON.parse(localStorage.getItem('energy_cart')) || [];
    actualizarInterfaz();
}

// 1. Carga inicial
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('cart-items-list')) {
        iniciarCarro();
    }
});

// 2. Carga dinámica (componentes.js)
document.addEventListener('cartLoaded', () => {
    console.log("⚡ Carrito detectado: Sincronizando datos...");
    iniciarCarro();
});
