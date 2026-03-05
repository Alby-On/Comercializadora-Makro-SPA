document.addEventListener('DOMContentLoaded', () => {
    // 1. CARGA Y SINCRONIZACIÓN (Tu lógica original)
    setTimeout(renderizarCotizacionDesdeShopify, 500);

    window.addEventListener('storage', (event) => {
        if (event.key === 'shopify_cart_id' || event.key === 'respaldo_cotizacion') {
            renderizarCotizacionDesdeShopify();
        }
    });

    setInterval(renderizarCotizacionDesdeShopify, 2000);

    // 2. LÓGICA DE SELECCIÓN DE MÉTODO Y ENVÍO
    const form = document.getElementById('cotizacion-form');
    const btnTexto = document.getElementById('texto-boton');
    const btnIcono = document.getElementById('icono-boton');

    // Cambiar texto del botón dinámicamente según el Radio seleccionado
    form.addEventListener('change', (e) => {
        if (e.target.name === 'metodo_contacto') {
            if (e.target.value === 'whatsapp') {
                if(btnTexto) btnTexto.innerText = "Cotizar por WhatsApp";
                if(btnIcono) btnIcono.className = "fab fa-whatsapp";
            } else {
                if(btnTexto) btnTexto.innerText = "Enviar Solicitud por Correo";
                if(btnIcono) btnIcono.className = "fas fa-paper-plane";
            }
        }
    });

    // Manejador del Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validarAntesDeEnviar()) return;

        // Extraer productos directamente del DOM renderizado para asegurar exactitud
        const items = document.querySelectorAll('.item-cot');
        let listaTexto = "";
        let productosArray = [];

        items.forEach(item => {
            const nombre = item.querySelector('span[style*="font-weight: bold"]').innerText;
            const cantidad = item.querySelector('span[style*="min-width: 20px"]').innerText;
            listaTexto += `- ${nombre} (Cant: ${cantidad})\n`;
            productosArray.push({ nombre, cantidad });
        });

        const datos = {
            nombre: document.getElementById('cot-nombre').value,
            rut: document.getElementById('cot-rut').value,
            telefono: document.getElementById('cot-telefono').value,
            email: document.getElementById('cot-email').value,
            mensaje: document.getElementById('cot-mensaje').value,
            metodo: document.querySelector('input[name="metodo_contacto"]:checked').value
        };

        if (datos.metodo === 'whatsapp') {
            enviarWhatsApp(datos, listaTexto);
        } else {
            enviarCorreo(datos, productosArray);
        }
    });
});

// --- RENDERIZADO (Tu lógica original de Shopify) ---
async function renderizarCotizacionDesdeShopify() {
    const cartId = localStorage.getItem('shopify_cart_id');
    const container = document.getElementById('lista-cotizacion-items');
    const totalLabel = document.getElementById('total-ref-cot');
    const respaldo = JSON.parse(localStorage.getItem('respaldo_cotizacion') || '{}');

    if (!cartId || !container) {
        if (container) container.innerHTML = "<p>Tu lista de cotización está vacía.</p>";
        if (totalLabel) totalLabel.style.display = 'none';
        return;
    }

    const query = `{
      cart(id: "${cartId}") {
        lines(first: 20) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  product { title }
                }
              }
            }
          }
        }
      }
    }`;

    try {
        const response = await queryShopify(query);
        const cart = response.data?.cart;

        if (!cart || cart.lines.edges.length === 0) {
            container.innerHTML = "<p>No hay productos seleccionados.</p>";
            if (totalLabel) totalLabel.style.display = 'none';
            return;
        }

        let html = '';
        cart.lines.edges.forEach(item => {
            const prod = item.node.merchandise;
            const lineId = item.node.id;
            const qtyShopify = item.node.quantity;
            const qtyFinal = respaldo[lineId] || qtyShopify;

            html += `
                <div class="item-cot" style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #eee;">
                    <div style="text-align: left; flex-grow: 1;">
                        <span style="display: block; font-weight: bold; color: #1e293b; font-size: 1rem;">${prod.product.title}</span>
                        <div style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
                            <span style="color: #64748b; font-size: 0.9rem;">Cantidad:</span>
                            <div style="display: flex; align-items: center; background: #f1f5f9; border-radius: 6px; overflow: hidden;">
                                <button type="button" onclick="editarCantidadCotizacion(this, '${lineId}', -1)" style="padding: 4px 10px; border: none; background: none; cursor: pointer; font-weight: bold;">-</button>
                                <span style="padding: 0 8px; font-weight: 700; min-width: 20px; text-align: center;">${qtyFinal}</span>
                                <button type="button" onclick="editarCantidadCotizacion(this, '${lineId}', 1)" style="padding: 4px 10px; border: none; background: none; cursor: pointer; font-weight: bold;">+</button>
                            </div>
                        </div>
                    </div>
                    <button type="button" onclick="eliminarDesdeCotizacion('${lineId}')" style="background: none; border: none; color: #ff4d4f; cursor: pointer; font-size: 1.1rem; padding-left: 15px;">🗑️</button>
                </div>
            `;
        });

        if (container.dataset.lastHtml !== html) {
            container.innerHTML = html;
            container.dataset.lastHtml = html;
            if (totalLabel) {
                totalLabel.style.display = 'block';
                totalLabel.innerHTML = "Precio final se enviará por el canal seleccionado";
            }
        }
    } catch (error) {
        console.error("Error en sincronización:", error);
    }
}

// --- FUNCIONES DE ENVÍO ---
function enviarWhatsApp(datos, listaTexto) {
    const telefonoVentas = "56936246559"; // REEMPLAZA CON TU TELÉFONO REAL
    const mensajeHeader = `*SOLICITUD DE COTIZACIÓN - MAKRO SPA*%0A%0A`;
    const infoCliente = `*Cliente:* ${datos.nombre}%0A*RUT:* ${datos.rut}%0A*Email:* ${datos.email}%0A%0A`;
    const productos = `*PRODUCTOS:*%0A${encodeURIComponent(listaTexto)}%0A`;
    const nota = datos.mensaje ? `%0A*Nota:* ${datos.mensaje}` : "";

    const fullUrl = `https://wa.me/${telefonoVentas}?text=${mensajeHeader}${infoCliente}${productos}${nota}`;
    window.open(fullUrl, '_blank');
}

function enviarCorreo(datos, productosArray) {
    // Aquí puedes integrar EmailJS o un fetch a tu Supabase/Backend
    console.log("Datos para correo:", datos, productosArray);
    alert("¡Solicitud enviada! En breve recibirás la cotización en tu correo: " + datos.email);
}

// --- UTILIDADES ---
window.editarCantidadCotizacion = function(btn, lineId, cambio) {
    const span = btn.parentElement.querySelector('span');
    const cantidadActual = parseInt(span.innerText);
    const nuevaCantidad = cantidadActual + cambio;
    if (nuevaCantidad <= 0) {
        eliminarDesdeCotizacion(lineId);
        return;
    }
    span.innerText = nuevaCantidad;
    if (typeof window.cambiarCantidad === 'function') window.cambiarCantidad(lineId, nuevaCantidad);
};

window.eliminarDesdeCotizacion = function(lineId) {
    if (confirm("¿Quitar este producto de la cotización?")) {
        if (typeof window.quitarProducto === 'function') window.quitarProducto(lineId);
    }
};

function validarAntesDeEnviar() {
    const cartId = localStorage.getItem('shopify_cart_id');
    const items = document.querySelectorAll('.item-cot');
    if (!cartId || items.length === 0) {
        alert("Tu lista de cotización está vacía.");
        return false;
    }
    return true;
}
