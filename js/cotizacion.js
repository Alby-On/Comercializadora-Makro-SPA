// Asegúrate de que este archivo se cargue DESPUÉS de tu main.js para que reconozca queryShopify
document.addEventListener('DOMContentLoaded', () => {
    // Pequeño delay para asegurar que los componentes carguen
    setTimeout(renderizarCotizacionDesdeShopify, 500);
});

async function renderizarCotizacionDesdeShopify() {
    const cartId = localStorage.getItem('shopify_cart_id');
    const container = document.getElementById('lista-cotizacion-items');
    const totalLabel = document.getElementById('total-ref-cot');

    if (!cartId) {
        container.innerHTML = "<p>No hay productos para cotizar. Vuelve a la tienda.</p>";
        return;
    }

    // Usamos la misma lógica de tu main.js para consultar a Shopify
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

        if (!cart || cart.lines.edges.length === 0) {
            container.innerHTML = "<p>Tu carrito está vacío en Shopify.</p>";
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
                <div class="item-cot" style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
                    <div style="text-align: left;">
                        <span style="display: block; font-weight: bold; color: #333;">${prod.product.title}</span>
                        <small style="color: #666;">Cant: ${qty} x $${Math.round(price).toLocaleString('es-CL')}</small>
                    </div>
                    <div style="font-weight: bold; color: #e63946;">
                        $${Math.round(subtotal).toLocaleString('es-CL')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        totalLabel.textContent = `$${Math.round(totalNeto).toLocaleString('es-CL')}`;

    } catch (error) {
        console.error("Error cargando cotización:", error);
        container.innerHTML = "<p>Error al conectar con el servidor de productos.</p>";
    }
}
