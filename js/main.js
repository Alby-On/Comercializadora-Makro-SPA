// 1. Configuración de Shopify Storefront API (Actualizada)
const shopifyConfig = {
    domain: 'zidiwr-ax.myshopify.com',
    accessToken: '22259948ae8b45daf91294ada0ff44b4',
    apiVersion: '2024-01'
};
// Función para cargar componentes estáticos (Header/Footer)
function loadComponent(id, file) {
    return fetch(file)
        .then(response => {
            if (!response.ok) throw new Error("Error al cargar " + file);
            return response.text();
        })
        .then(data => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = data;
        })
        .catch(error => console.error(error));
}

// NUEVA FUNCIÓN: Control visual del carrito lateral
window.toggleCarrito = function() {
    const sidebar = document.getElementById('carrito-lateral');
    const overlay = document.getElementById('carrito-overlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('visible');
        
        // Si se abre, actualizamos el contenido desde Shopify
        if (sidebar.classList.contains('open')) {
            actualizarVisualizacionCarro();
        }
    }
};

// 2. Función Maestra para consultas GraphQL
async function queryShopify(query) {
    try {
        const response = await fetch(`https://${shopifyConfig.domain}/api/${shopifyConfig.apiVersion}/graphql.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': shopifyConfig.accessToken,
            },
            body: JSON.stringify({ query })
        });
        return await response.json();
    } catch (error) {
        console.error("Error en la petición API:", error);
    }
}

function templateProducto(prod) {
    const precio = Math.round(prod.variants.edges[0].node.price.amount);
    const imagen = prod.images.edges[0]?.node.url || 'img/placeholder.jpg';
    const idProducto = btoa(prod.id); 

    return `
        <div class="tarjeta-oferta">
            <div class="img-container">
                <img src="${imagen}" alt="${prod.title}">
            </div>
            <h3 class="producto-titulo">${prod.title}</h3>
            <div class="precio-monto">$${precio.toLocaleString('es-CL')}</div>
            <a href="detalles.html?id=${idProducto}" class="btn-detalles">
                Ver Detalles
            </a>
        </div>
    `;
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. Carga de componentes dinámicos
    Promise.all([
        loadComponent('header-placeholder', 'components/header.html'),
        loadComponent('footer-placeholder', 'components/footer.html'),
        loadComponent('whatsapp-placeholder', 'components/whatsapp.html'),
        loadComponent('carrito-placeholder', 'components/carro_compras.html')
    ]).then(() => {

        // ================================
        // INICIALIZACIONES GENERALES
        // ================================

        inicializarBusquedaUniversal();

        // --- LLAMADA AUTOMÁTICA DEL CARRITO ---
        if (localStorage.getItem('shopify_cart_id')) {
            actualizarVisualizacionCarro();
        }

        // ================================
        // EVENTOS DEL CARRITO
        // ================================

        const btnAbrir = document.getElementById('cart-button'); 
        if (btnAbrir) {
            btnAbrir.addEventListener('click', (e) => {
                e.preventDefault();
                toggleCarrito();
            });
        }

        const overlay = document.getElementById('carrito-overlay');
        if (overlay) {
            overlay.addEventListener('click', toggleCarrito);
        }

        // ================================
        // CATEGORÍAS
        // ================================

        const menuCat = document.getElementById('menu-categorias');
        if (menuCat) {
            const enlaces = document.querySelectorAll('.btn-categoria');
            enlaces.forEach(enlace => {
                enlace.addEventListener('click', (e) => {
                    e.preventDefault();
                    const categoria = enlace.getAttribute('data-categoria');
                    const nombreCategoria = enlace.textContent;
                    ejecutarCargaPorCategoria(categoria, nombreCategoria);
                });
            });
        }

        // --- LÓGICA DE ACTIVACIÓN (URL) ---
        const urlParams = new URLSearchParams(window.location.search);
        const categoriaSolicitada = urlParams.get('cat');

        if (categoriaSolicitada) {
            if (categoriaSolicitada.toLowerCase() === 'all') {
                // ADICIONAL: Carga total si el parámetro es "all"
                ejecutarCargaTodosLosProductos();
            } else {
                // Mantener filtrado por categorías original
                const botones = document.querySelectorAll('.btn-categoria');
                let botonFiltrar = null;

                botones.forEach(boton => {
                    const dataCat = boton.getAttribute('data-categoria');
                    if (dataCat && dataCat.toLowerCase() === categoriaSolicitada.toLowerCase()) {
                        botonFiltrar = boton;
                    }
                });

                if (botonFiltrar) {
                    botonFiltrar.click();
                    botonFiltrar.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        } else if (window.location.pathname.includes('productos.html') && !urlParams.get('q')) {
            // ADICIONAL: Si entra a productos sin parámetros, carga todo por defecto
            ejecutarCargaTodosLosProductos();
        }
    });

    // ========================================
    // 2. LÓGICA DE CARGA DE PRODUCTOS
    // ========================================

    const contenedorOfertas = document.getElementById('carrusel-ofertas');
    if (contenedorOfertas) {
        ejecutarCargaOfertasInicio();
    }

    const contenedorProductos = document.getElementById('shopify-products-load');
    if (contenedorProductos) {
        const urlParams = new URLSearchParams(window.location.search);
        const busquedaURL = urlParams.get('q');
        if (busquedaURL) {
            ejecutarBusquedaAPI(decodeURIComponent(busquedaURL));
        }
    }
});

// 4. Carga específica para el Inicio (Tags descuento1, 2, 3)
async function ejecutarCargaOfertasInicio() {
    const contenedor = document.getElementById('carrusel-ofertas');
    if (!contenedor) return;

    const query = `
    {
      products(first: 10, query: "tag:descuento1 OR tag:descuento2 OR tag:descuento3") {
        edges {
          node {
            id
            title
            images(first: 1) { edges { node { url } } }
            variants(first: 1) { edges { node { price { amount } } } }
          }
        }
      }
    }`;

    const { data } = await queryShopify(query);
    const edges = data?.products?.edges;

    if (!edges || edges.length === 0) {
        contenedor.innerHTML = `<p>No hay ofertas disponibles en este momento.</p>`;
        return;
    }
    contenedor.innerHTML = edges.map(edge => templateProducto(edge.node)).join('');
}

// 4. Buscador Universal
function inicializarBusquedaUniversal() {
    const inputBuscar = document.getElementById('search-input');
    const btnBuscar = document.getElementById('search-btn');

    if (btnBuscar && inputBuscar) {
        const realizarBusqueda = () => {
            const termino = inputBuscar.value.toLowerCase().trim();
            if (termino === "") return;

            if (window.location.pathname.includes('productos.html')) {
                ejecutarBusquedaAPI(termino);
            } else {
                window.location.href = `productos.html?q=${encodeURIComponent(termino)}`;
            }
        };

        btnBuscar.addEventListener('click', realizarBusqueda);
        inputBuscar.addEventListener('keypress', (e) => { if (e.key === 'Enter') realizarBusqueda(); });
    }
}

// 5. Consultas con campo ID incluido
async function ejecutarBusquedaAPI(termino) {
    const contenedor = document.getElementById('shopify-products-load');
    const titulo = document.getElementById('titulo-coleccion');
    
    if (titulo) titulo.textContent = `Resultados para: "${termino}"`;
    contenedor.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">Buscando productos...</p>`;

    const query = `
    {
      products(first: 50, query: "title:${termino}*") {
        edges {
          node {
            id
            title
            onlineStoreUrl
            images(first: 1) { edges { node { url } } }
            variants(first: 1) { edges { node { price { amount } } } }
          }
        }
      }
    }`;

    const { data } = await queryShopify(query);
    renderizarProductos(data?.products?.edges);
}

async function ejecutarCargaPorCategoria(tag, nombre) {
    const contenedor = document.getElementById('shopify-products-load');
    const titulo = document.getElementById('titulo-coleccion');
    
    if (titulo) titulo.textContent = nombre;
    contenedor.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">Cargando ${nombre}...</p>`;

    const query = `
    {
      products(first: 50, query: "tag:${tag}") {
        edges {
          node {
            id
            title
            onlineStoreUrl
            images(first: 1) { edges { node { url } } }
            variants(first: 1) { edges { node { price { amount } } } }
          }
        }
      }
    }`;

    const { data } = await queryShopify(query);
    renderizarProductos(data?.products?.edges);
}

function renderizarProductos(edges) {
    const contenedor = document.getElementById('shopify-products-load');
    if (!edges || edges.length === 0) {
        contenedor.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">No se encontraron productos.</p>`;
        return;
    }
    contenedor.innerHTML = edges.map(edge => templateProducto(edge.node)).join('');
}

// --- NUEVA LÓGICA DEL CARRITO LATERAL ---

// 1. Abrir y Cerrar el panel
window.toggleCarrito = function() {
    const sidebar = document.getElementById('carrito-lateral');
    const overlay = document.getElementById('carrito-overlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('visible');
        
        // Si se abre, refrescamos los productos desde Shopify
        if (sidebar.classList.contains('open')) {
            actualizarVisualizacionCarro();
        }
    }
};

// 2. Redirigir al checkout de Shopify (Mantenemos tu lógica)
window.irAPagar = function() {
    const url = localStorage.getItem('shopify_checkout_url');
    if (url) {
        window.location.href = url;
    } else {
        alert("El carrito está vacío o no se ha generado el checkout.");
    }
}

async function actualizarVisualizacionCarro() {
    const cartId = localStorage.getItem('shopify_cart_id');
    if (!cartId) return;

    const query = `{
      cart(id: "${cartId}") {
        totalQuantity
        checkoutUrl
        cost { totalAmount { amount } }
        lines(first: 20) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  product { title }
                  image { url }
                  price { amount }
                }
              }
            }
          }
        }
      }
    }`;

    const response = await queryShopify(query);
    const cart = response.data?.cart;

    // Si el carrito no existe en Shopify (ej: expiró), limpiamos localmente
    if (!cart) {
        localStorage.removeItem('shopify_cart_id');
        const listContainer = document.getElementById('carrito-items-lista');
        if (listContainer) listContainer.innerHTML = '<p class="carrito-vacio">Tu carrito está vacío</p>';
        return;
    }

    // 1. Guardar URL de checkout para el botón de "Finalizar Compra"
    localStorage.setItem('shopify_checkout_url', cart.checkoutUrl);

    // 2. Actualizar contador en el icono del carrito (Header)
    const countEl = document.getElementById('cart-count'); // Asegúrate que tu span del header tenga este ID
    if (countEl) {
        countEl.textContent = cart.totalQuantity;
        countEl.style.display = cart.totalQuantity > 0 ? 'inline-block' : 'none';
    }

    // 3. Actualizar el Monto Total en el footer del carrito
    const totalEl = document.getElementById('carrito-total-monto');
    if (totalEl) {
        const total = Number(cart.cost.totalAmount.amount);
        totalEl.textContent = `$${Math.round(total).toLocaleString('es-CL')}`;
    }

    // 4. Renderizado de los productos en la lista
    const listContainer = document.getElementById('carrito-items-lista');
    if (!listContainer) return;

    if (cart.lines.edges.length === 0) {
        listContainer.innerHTML = '<p class="carrito-vacio">Tu carrito está vacío</p>';
        return;
    }

    listContainer.innerHTML = ''; // Limpiar antes de rellenar

    cart.lines.edges.forEach(item => {
        const prod = item.node.merchandise;
        const lineId = item.node.id;
        const qty = item.node.quantity;
        const unitPrice = Number(prod.price.amount);
        const lineSubtotal = unitPrice * qty;
        const imageUrl = prod.image ? prod.image.url : 'img/placeholder.jpg';

        const div = document.createElement('div');
        // Estilos en línea para mantener la estructura flex
        div.style.cssText = 'display: flex; align-items: center; padding: 15px 0; border-bottom: 1px solid #eee; gap: 12px;';

        div.innerHTML = `
            <img src="${imageUrl}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #eee;">
            <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 4px;">
                <div style="font-weight: bold; font-size: 0.95rem; color: #1e293b; line-height: 1.2;">
                    ${prod.product.title}
                </div>
                <div style="font-size: 0.85rem; color: #64748b;">
                    ${qty} x $${Math.round(unitPrice).toLocaleString('es-CL')}
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
                    <div style="display: flex; align-items: center; background: #f1f5f9; border-radius: 6px; overflow: hidden;">
                        <button onclick="cambiarCantidad('${lineId}', ${qty - 1})" style="padding: 4px 10px; border: none; background: none; cursor: pointer; font-weight: bold;">-</button>
                        <span style="padding: 0 8px; font-size: 0.85rem; font-weight: 600;">${qty}</span>
                        <button onclick="cambiarCantidad('${lineId}', ${qty + 1})" style="padding: 4px 10px; border: none; background: none; cursor: pointer; font-weight: bold;">+</button>
                    </div>
                    <span style="font-size: 0.95rem; font-weight: 800; color: #d9534f;">
                        $${Math.round(lineSubtotal).toLocaleString('es-CL')}
                    </span>
                </div>
            </div>
            <button onclick="quitarProducto('${lineId}')" 
                style="background: #fff1f0; border: none; color: #ff4d4f; cursor: pointer; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;" 
                title="Quitar producto">🗑️</button>
        `;
        listContainer.appendChild(div);
    });
}
// Función para sumar o restar
window.cambiarCantidad = async function(lineId, nuevaCantidad) {
    if (nuevaCantidad <= 0) {
        quitarProducto(lineId);
        return;
    }
    const cartId = localStorage.getItem('shopify_cart_id');
    const mutation = `mutation { cartLinesUpdate(cartId: "${cartId}", lines: [{ id: "${lineId}", quantity: ${nuevaCantidad} }]) { cart { id } } }`;
    await queryShopify(mutation);
    actualizarVisualizacionCarro();
};

// Función para ELIMINAR totalmente
window.quitarProducto = async function(lineId) {
    const cartId = localStorage.getItem('shopify_cart_id');
    const mutation = `mutation { cartLinesRemove(cartId: "${cartId}", lineIds: ["${lineId}"]) { cart { id } } }`;
    await queryShopify(mutation);
    actualizarVisualizacionCarro();
};
async function ejecutarCargaTodosLosProductos() {
    const contenedor = document.getElementById('shopify-products-load');
    const titulo = document.getElementById('titulo-coleccion');
    
    if (titulo) titulo.textContent = "Catálogo Completo";
    if (contenedor) {
        contenedor.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">Cargando todos los productos...</p>`;
    }

    // Esta query pide productos de forma general, sin filtros de TAG
    const query = `
    {
      products(first: 50) {
        edges {
          node {
            id
            title
            images(first: 1) { edges { node { url } } }
            variants(first: 1) { edges { node { price { amount } } } }
          }
        }
      }
    }`;

    try {
        const { data } = await queryShopify(query);
        // Usamos tu función renderizarProductos que ya tienes creada
        renderizarProductos(data?.products?.edges);
    } catch (error) {
        console.error("Error en carga total:", error);
    }
}
// Función para mostrar/ocultar campos extras si es Factura
function toggleCamposFactura() {
    const tipo = document.getElementById('tipo-documento').value;
    const camposExtras = document.getElementById('campos-factura');
    camposExtras.style.display = (tipo === 'factura') ? 'block' : 'none';
}

/* ==========================================================================
    FUNCIÓN: prepararCheckout (Versión Final Corregida)
   ========================================================================== */

async function prepararCheckout() {
    // 1. Capturar elementos y validar que existan en el DOM
    const elTipo = document.getElementById('tipo-documento');
    const elRut = document.getElementById('rut-cliente');
    const cartId = localStorage.getItem('shopify_cart_id');

    if (!elTipo || !elRut) {
        console.error("Error: No se encontraron los inputs en el HTML.");
        return;
    }

    const tipo = elTipo.value;
    const rutInput = elRut.value.trim();

    // 2. Validar el RUT (Sin puntos, con guion)
    if (!validarRut(rutInput)) {
        alert("RUT inválido. Por favor ingresa el formato: 12345678-9 (Sin puntos y con guion).");
        elRut.focus();
        return;
    }

    // 3. Validar Carrito existente
    if (!cartId) {
        alert("Tu carrito parece haber expirado. Agrega un producto de nuevo.");
        return;
    }

    // 4. Construir la nota (Asegurando que no sea un string vacío)
    let notaFinal = `Documento: ${tipo.toUpperCase()} | RUT: ${rutInput}`;
    
    if (tipo === 'factura') {
        const rs = document.getElementById('razon-social')?.value.trim();
        const giro = document.getElementById('giro-empresa')?.value.trim();

        if (!rs || !giro) {
            alert("Razón Social y Giro son obligatorios para Factura.");
            return;
        }
        notaFinal += ` | Razón: ${rs} | Giro: ${giro}`;
    }

    // 5. Proceso de envío a Shopify (CORRECCIÓN DE TIPADO String!)
    const query = `
        mutation cartNoteUpdate($cartId: ID!, $note: String!) {
            cartNoteUpdate(cartId: $cartId, note: $note) {
                cart { 
                    checkoutUrl 
                }
                userErrors { 
                    field 
                    message 
                }
            }
        }
    `;

    const btn = document.querySelector('.btn-checkout');
    const originalText = btn ? btn.innerText : "Finalizar Compra";

    // URL y Headers usando tu configuración
    const apiUrl = `https://${shopifyConfig.domain}/api/${shopifyConfig.apiVersion}/graphql.json`;
    const apiHeaders = {
        'X-Shopify-Storefront-Access-Token': shopifyConfig.accessToken,
        'Content-Type': 'application/json'
    };

    try {
        if (btn) {
            btn.innerText = "Procesando...";
            btn.disabled = true;
        }

        console.log("Actualizando nota del carrito en:", apiUrl);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: apiHeaders,
            body: JSON.stringify({ 
                query, 
                variables: { 
                    cartId: cartId, 
                    note: notaFinal // El valor ya está validado como String no nulo
                } 
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Respuesta de error:", errorText);
            throw new Error(`Servidor respondió con código ${response.status}.`);
        }

        const result = await response.json();

        // 6. Revisar errores usando el esquema correcto
        if (result.errors || (result.data?.cartNoteUpdate?.userErrors?.length > 0)) {
            const errorMsg = result.data?.cartNoteUpdate?.userErrors?.[0]?.message || result.errors?.[0]?.message || "Error de validación";
            throw new Error(errorMsg);
        }

        const checkoutUrl = result.data?.cartNoteUpdate?.cart?.checkoutUrl;
        
        if (checkoutUrl) {
            // ÉXITO: Redirigir al checkout oficial de Shopify
            window.location.href = checkoutUrl;
        } else {
            throw new Error("No se pudo generar la URL de pago.");
        }

    } catch (e) {
        console.error("Error técnico detallado:", e);
        alert("Error: " + e.message);
        
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
}
/* ==========================================================================
    Validación de RUT 
   ========================================================================== */

function validarRut(rut) {
    if (!rut) return false;
    const limpio = rut.trim().toUpperCase();
    
    // REGLA: Debe tener guion y NO debe tener puntos
    if (!limpio.includes('-') || limpio.includes('.')) return false;

    // Validar formato básico: números antes del guion, y un número o K después
    const regex = /^[0-9]+-[0-9K]$/;
    return regex.test(limpio);
}
/**
 * Función para ordenar productos cargados dinámicamente desde Shopify
 */
function ordenarProductosShopify() {
    const contenedor = document.getElementById('shopify-products-load');
    const selector = document.getElementById('sort-price');
    const orden = selector.value;

    if (!contenedor || orden === 'default') return;

    // 1. Capturamos los productos actuales
    let productos = Array.from(contenedor.children);

    if (productos.length === 0) {
        console.warn("No hay productos cargados aún.");
        return;
    }

    // 2. Proceso de Ordenamiento Numérico
    productos.sort((a, b) => {
        // Función interna para extraer el precio real de una tarjeta
        const extraerPrecio = (el) => {
            // Prioridad 1: Buscar la clase específica de precio oferta que creamos
            // Prioridad 2: Buscar cualquier clase que use Shopify para el precio actual
            const selectorPrecio = el.querySelector('.precio-oferta') || 
                                   el.querySelector('.shopify-buy__product__actual-price') ||
                                   el.querySelector('.price');
            
            let texto = selectorPrecio ? selectorPrecio.innerText : el.innerText;

            // Si hay dos precios (el tachado y el nuevo), nos quedamos solo con el primero
            // Esto evita que "15.990 $20.000" se convierta en 1599020000
            if (texto.includes('$')) {
                texto = texto.split('$')[1]; // Agarramos lo que está después del primer $
            }

            // Limpiamos: dejamos solo números. "15.990" -> "15990"
            const numeroPuro = texto.replace(/\D/g, "");
            return parseInt(numeroPuro, 10) || 0;
        };

        const precioA = extraerPrecio(a);
        const precioB = extraerPrecio(b);

        // Debug para verificar en consola (F12)
        console.log(`Ordenando: ${precioA} vs ${precioB}`);

        if (orden === 'asc') return precioA - precioB; // Menor a Mayor
        if (orden === 'desc') return precioB - precioA; // Mayor a Menor
        return 0;
    });

    // 3. Re-inyección limpia en el DOM
    contenedor.innerHTML = '';
    productos.forEach(p => {
        contenedor.appendChild(p);
    });

    console.log("Productos ordenados correctamente.");
}
