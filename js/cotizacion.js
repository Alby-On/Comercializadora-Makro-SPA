document.addEventListener('DOMContentLoaded', () => {
    // Pequeño retraso para asegurar que el DOM esté listo
    setTimeout(renderizarResumenCotizacion, 100);
});

function renderizarResumenCotizacion() {
    const container = document.getElementById('lista-cotizacion-items');
    const totalLabel = document.getElementById('total-ref-cot');

    // 1. Intentar obtener el carrito
    const cartData = localStorage.getItem('cart');
    
    if (!cartData) {
        console.error("No se encontró la llave 'cart' en localStorage");
        container.innerHTML = "<p style='color:red;'>Error: No hay datos en el carrito.</p>";
        return;
    }

    const cart = JSON.parse(cartData);
    let html = '';
    let totalAcumulado = 0;

    if (cart.length === 0) {
        container.innerHTML = "<p>El carrito está vacío.</p>";
        return;
    }

    cart.forEach((item) => {
        // Mapeo flexible: Busca 'title' o 'name'. Busca 'price' o 'price_original'.
        const nombre = item.title || item.name || item.product_title || "Producto";
        const precio = parseFloat(item.price) || 0;
        const cantidad = parseInt(item.quantity) || 0;
        const subtotal = precio * cantidad;
        
        totalAcumulado += subtotal;

        html += `
            <div class="item-cot" style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eee;">
                <div style="text-align:left;">
                    <span style="display:block; font-weight:bold;">${nombre}</span>
                    <small>Cant: ${cantidad} x $${precio.toLocaleString('es-CL')}</small>
                </div>
                <div style="font-weight:bold; color:#e63946;">
                    $${subtotal.toLocaleString('es-CL')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    totalLabel.innerText = `$${totalAcumulado.toLocaleString('es-CL')}`;
}
