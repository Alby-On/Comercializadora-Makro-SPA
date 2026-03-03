document.addEventListener('DOMContentLoaded', () => {
    // 1. Carga inicial
    setTimeout(renderizarCotizacionDesdeShopify, 500);

    // 2. ESCUCHA ACTIVA: Si el carrito cambia en otra pestaña o mediante el lateral
    window.addEventListener('storage', (event) => {
        if (event.key === 'shopify_cart_id' || event.key === 'shopify_checkout_url') {
            console.log("Cambio detectado en el carrito, actualizando vista...");
            renderizarCotizacionDesdeShopify();
        }
    });

    // 3. POLLING (Opcional): Por si los cambios ocurren dentro de la misma página 
    // sin recargar (como el carrito lateral). Ejecuta cada 2 segundos.
    setInterval(renderizarCotizacionDesdeShopify, 2000);
});

async function renderizarCotizacionDesdeShopify() {
    const cartId = localStorage.getItem('shopify_cart_id');
    const container = document.getElementById('lista-cotizacion-items');
    const totalLabel = document.getElementById('total-ref-cot');

    if (!cartId) {
        if (container) container.innerHTML = "<p>Tu carrito está vacío.</p>";
        return;
    }

    const query = `{
      cart(id: "${cartId}") {
        cost { totalAmount { amount } }
        lines(first: 20) {
          edges {
            node {
              quantity
              merchandise {
                ... on ProductVariant {
                  product { title }
                  price { amount }
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

        // Si no hay respuesta o el carrito se vació en Shopify
        if (!cart || cart.lines.edges.length === 0) {
            container.innerHTML = "<p>No hay productos seleccionados.</p>";
            totalLabel.textContent = "$0";
            return;
        }

        let html = '';
        const totalNeto = Number(cart.cost.totalAmount.amount);

        cart.lines.edges.forEach(item => {
            const prod = item.node.merchandise;
            const qty = item.node.quantity;
            const price = Number(prod.price.amount);
            const subtotal = price * qty;

            html += `
                <div class="item-cot" style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee;">
                    <div style="text-align: left; padding-right: 10px;">
                        <span style="display: block; font-weight: bold; color: #222; font-size: 0.95rem;">${prod.product.title}</span>
                        <small style="color: #777;">${qty} unidad(es) x $${Math.round(price).toLocaleString('es-CL')}</small>
                    </div>
                    <div style="font-weight: bold; color: #e63946; white-space: nowrap;">
                        $${Math.round(subtotal).toLocaleString('es-CL')}
                    </div>
                </div>
            `;
        });

        // Solo actualizamos el DOM si el HTML generado es distinto al actual 
        // (para evitar parpadeos innecesarios en el S22 Ultra)
        if (container.innerHTML !== html) {
            container.innerHTML = html;
            totalLabel.textContent = `$${Math.round(totalNeto).toLocaleString('es-CL')}`;
        }

    } catch (error) {
        console.error("Error en sincronización de cotización:", error);
    }
}
