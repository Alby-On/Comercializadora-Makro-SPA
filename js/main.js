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
    const imagen = prod.images.edges[0]?.node.url || 'img/placeholder.jpg';
    const idProducto = btoa(prod.id); 

    return `
        <div class="tarjeta-oferta">
            <div class="img-container">
                <img src="${imagen}" alt="${prod.title}">
            </div>
            
            <div class="info-contenedor">
                <h3 class="producto-titulo">${prod.title}</h3>
                
                <div class="acciones-producto">
                    <a href="detalles.html?id=${idProducto}" class="btn-detalles">
                        <i class="fas fa-file-invoice-dollar"></i> Cotizar Producto
                    </a>
                </div>
            </div>
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

    // Recuperamos el respaldo local para cruzar los datos
    const respaldo = JSON.parse(localStorage.getItem('respaldo_cotizacion') || '{}');

    const query = `{
      cart(id: "${cartId}") {
        totalQuantity
        lines(first: 20) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  product { title }
                  image { url }
                }
              }
            }
          }
        }
      }
    }`;

    const response = await queryShopify(query);
    const cart = response.data?.cart;

    if (!cart) {
        localStorage.removeItem('shopify_cart_id');
        const listContainer = document.getElementById('carrito-items-lista');
        if (listContainer) listContainer.innerHTML = '<p class="carrito-vacio">Tu carrito está vacío</p>';
        return;
    }

    // 1. Contador del Header (Lo calculamos sumando el respaldo para precisión total)
    const countEl = document.getElementById('cart-count');
    if (countEl) {
        let totalReal = 0;
        cart.lines.edges.forEach(item => {
            const lineId = item.node.id;
            totalReal += (respaldo[lineId] || item.node.quantity);
        });
        countEl.textContent = totalReal;
        countEl.style.display = totalReal > 0 ? 'inline-block' : 'none';
    }

    // 2. Footer con mensaje de cotización
    const totalEl = document.getElementById('carrito-total-monto');
    if (totalEl) {
        totalEl.innerHTML = `<span style="font-size: 0.9rem; color: #64748b; font-weight: bold;">Precio: Pendiente de Cotización</span>`;
    }

    // 3. Renderizado de productos
    const listContainer = document.getElementById('carrito-items-lista');
    if (!listContainer) return;

    if (cart.lines.edges.length === 0) {
        listContainer.innerHTML = '<p class="carrito-vacio">No hay productos seleccionados</p>';
        return;
    }

    listContainer.innerHTML = ''; 

    cart.lines.edges.forEach(item => {
        const prod = item.node.merchandise;
        const lineId = item.node.id;
        const imageUrl = prod.image ? prod.image.url : 'img/placeholder.jpg';
        
        // LÓGICA MAESTRA: Priorizar el número del respaldo local
        const qtyFinal = respaldo[lineId] || item.node.quantity;

        const div = document.createElement('div');
        div.className = 'carrito-item-row'; 
        div.style.cssText = 'display: flex; align-items: center; padding: 15px 0; border-bottom: 1px solid #eee; gap: 12px;';

        div.innerHTML = `
            <img src="${imageUrl}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #eee;">
            <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 4px;">
                <div style="font-weight: bold; font-size: 0.95rem; color: #1e293b; line-height: 1.2;">
                    ${prod.product.title}
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px;">
                    <div style="display: flex; align-items: center; background: #f1f5f9; border-radius: 6px; overflow: hidden;">
                        <button onclick="ajustarCantidadLocal(this, '${lineId}', -1)" style="padding: 6px 12px; border: none; background: none; cursor: pointer; font-weight: bold; font-size: 1.1rem;">-</button>
                        <span style="padding: 0 10px; font-size: 1rem; font-weight: 700; min-width: 25px; text-align: center;">${qtyFinal}</span>
                        <button onclick="ajustarCantidadLocal(this, '${lineId}', 1)" style="padding: 6px 12px; border: none; background: none; cursor: pointer; font-weight: bold; font-size: 1.1rem;">+</button>
                    </div>
                </div>
            </div>
            <button onclick="quitarProductoInstantaneo(this, '${lineId}')" 
                style="background: #fff1f0; border: none; color: #ff4d4f; cursor: pointer; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;" 
                title="Quitar">🗑️</button>
        `;
        listContainer.appendChild(div);
    });
}

window.ajustarCantidadLocal = function(btn, lineId, cambio) {
    // 1. Buscamos el span que está justo al lado del botón presionado
    const span = btn.parentElement.querySelector('span');
    if (!span) return;

    const cantidadActual = parseInt(span.innerText) || 0;
    const nuevaCantidad = cantidadActual + cambio;

    // 2. Si la cantidad llega a 0, ejecutamos la función de quitar
    if (nuevaCantidad <= 0) {
        window.quitarProducto(lineId);
        return;
    }

    // 3. Si no, ejecutamos el cambio visual e informamos a Shopify
    window.cambiarCantidad(lineId, nuevaCantidad);
};

window.cambiarCantidad = function(lineId, nuevaCantidad) {
    // 1. Guardamos un respaldo local "invencible"
    let respaldoCantidades = JSON.parse(localStorage.getItem('respaldo_cotizacion') || '{}');
    respaldoCantidades[lineId] = nuevaCantidad;
    localStorage.setItem('respaldo_cotizacion', JSON.stringify(respaldoCantidades));

    // 2. Actualizamos la vista de inmediato para que el usuario vea sus 10 unidades
    const botones = document.querySelectorAll(`button[onclick*="${lineId}"]`);
    botones.forEach(btn => {
        const span = btn.parentElement.querySelector('span');
        if (span) span.innerText = nuevaCantidad;
    });

    // 3. Avisamos a Shopify (aunque él intente bajarlo a 2, nuestro respaldo manda)
    const cartId = localStorage.getItem('shopify_cart_id');
    const mutation = `mutation { cartLinesUpdate(cartId: "${cartId}", lines: [{ id: "${lineId}", quantity: ${nuevaCantidad} }]) { cart { id } } }`;
    queryShopify(mutation).catch(err => console.error("Error sync:", err));
};

// Función para ELIMINAR totalmente
window.quitarProducto = async function(lineId) {
    // 1. Efecto visual inmediato: buscamos la fila y la ocultamos
    const botones = document.querySelectorAll(`button[onclick*="${lineId}"]`);
    botones.forEach(btn => {
        const fila = btn.closest('div[style*="display: flex"]');
        if (fila) fila.style.display = 'none';
    });

    // 2. Avisar a Shopify
    const cartId = localStorage.getItem('shopify_cart_id');
    const mutation = `mutation { cartLinesRemove(cartId: "${cartId}", lineIds: ["${lineId}"]) { cart { id } } }`;
    
    await queryShopify(mutation);
    
    // 3. Refrescar el contador del header (el numerito del icono del carro)
    actualizarVisualizacionCarro(); 
};
/* ==========================================================================
    FUNCIÓN: Quitar Producto de forma Instantánea
   ========================================================================== */
window.quitarProductoInstantaneo = function(btn, lineId) {
    // 1. Buscamos el contenedor del producto (la fila completa)
    const row = btn.closest('.carrito-item-row');
    
    if (row) {
        // 2. Aplicamos una animación de salida para que se sienta fluido
        row.style.transition = 'all 0.3s ease';
        row.style.opacity = '0';
        row.style.transform = 'translateX(30px)'; // Se desliza hacia la derecha
        
        // 3. Lo eliminamos del DOM después de la animación
        setTimeout(() => {
            row.remove();
            
            // Si el carrito queda vacío después de borrar, mostramos el mensaje
            const listContainer = document.getElementById('carrito-items-lista');
            if (listContainer && listContainer.children.length === 0) {
                listContainer.innerHTML = '<p class="carrito-vacio">Tu lista de cotización está vacía</p>';
            }
        }, 300);
    }

    // 4. Avisamos a Shopify en segundo plano (sin bloquear al usuario)
    window.quitarProducto(lineId);
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
    const elTipo = document.getElementById('tipo-documento');
    const elRut = document.getElementById('rut-cliente');
    const cartId = localStorage.getItem('shopify_cart_id');

    if (!elTipo || !elRut || !cartId) {
        alert("Error de sesión o datos faltantes. Intenta recargar la página.");
        return;
    }

    const tipo = elTipo.value;
    const rutInput = elRut.value.trim();

    if (!validarRut(rutInput)) {
        alert("RUT inválido.");
        elRut.focus();
        return;
    }

    const btn = document.querySelector('.btn-checkout');
    const originalText = btn ? btn.innerText : "Finalizar Compra";

    try {
        if (btn) { btn.innerText = "Validando Stock..."; btn.disabled = true; }

        // 1. Consultar stock actual
        const queryValidacion = `
        query checkStock($id: ID!) {
          cart(id: $id) {
            lines(first: 20) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      title
                      quantityAvailable
                    }
                  }
                }
              }
            }
          }
        }`;

        const resValidacion = await fetch(`https://${shopifyConfig.domain}/api/${shopifyConfig.apiVersion}/graphql.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': shopifyConfig.accessToken },
            body: JSON.stringify({ query: queryValidacion, variables: { id: cartId } })
        });

        const dataValidacion = await resValidacion.json();
        const lineas = dataValidacion.data?.cart?.lines?.edges || [];

        let lineasAActualizar = [];
        let nombresErrores = [];

        lineas.forEach(item => {
            const solicitado = item.node.quantity;
            const disponible = item.node.merchandise.quantityAvailable;
            const lineId = item.node.id;

            if (disponible < solicitado) {
                nombresErrores.push(`${item.node.merchandise.title} (Disponible: ${disponible})`);
                // Preparamos la línea para corregirla en Shopify (si es 0, se elimina sola)
                lineasAActualizar.push({ id: lineId, quantity: disponible });
            }
        });

        // --- LÓGICA DE CORRECCIÓN AUTOMÁTICA ---
        if (lineasAActualizar.length > 0) {
            alert("⚠️ Algunos productos ya no tienen stock suficiente:\n\n" + nombresErrores.join("\n") + "\n\nEl carrito se ajustará automáticamente al máximo disponible.");

            const mutationUpdate = `
                mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
                    cartLinesUpdate(cartId: $cartId, lines: $lines) {
                        cart { id }
                        userErrors { message }
                    }
                }
            `;

            await fetch(`https://${shopifyConfig.domain}/api/${shopifyConfig.apiVersion}/graphql.json`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': shopifyConfig.accessToken },
                body: JSON.stringify({ 
                    query: mutationUpdate, 
                    variables: { cartId: cartId, lines: lineasAActualizar } 
                })
            });

            // Refrescamos la interfaz del usuario
            if (typeof actualizarVisualizacionCarro === "function") await actualizarVisualizacionCarro();
            
            if (btn) { btn.innerText = originalText; btn.disabled = false; }
            return; // Detenemos para que el usuario vea el cambio y presione de nuevo
        }

        // --- SI TODO ESTÁ OK, ACTUALIZAMOS NOTA Y VAMOS AL CHECKOUT ---
        if (btn) btn.innerText = "Preparando Pago...";

        let notaFinal = `Documento: ${tipo.toUpperCase()} | RUT: ${rutInput}`;
        if (tipo === 'factura') {
            const rs = document.getElementById('razon-social')?.value.trim();
            const giro = document.getElementById('giro-empresa')?.value.trim();
            if (!rs || !giro) { alert("Datos de factura incompletos."); if (btn) { btn.innerText = originalText; btn.disabled = false; } return; }
            notaFinal += ` | Razón: ${rs} | Giro: ${giro}`;
        }

        const mutationNota = `
            mutation cartNoteUpdate($cartId: ID!, $note: String!) {
                cartNoteUpdate(cartId: $cartId, note: $note) {
                    cart { checkoutUrl }
                    userErrors { message }
                }
            }
        `;

        const responseNota = await fetch(`https://${shopifyConfig.domain}/api/${shopifyConfig.apiVersion}/graphql.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': shopifyConfig.accessToken },
            body: JSON.stringify({ query: mutationNota, variables: { cartId: cartId, note: notaFinal } })
        });

        const resultNota = await responseNota.json();
        const checkoutUrl = resultNota.data?.cartNoteUpdate?.cart?.checkoutUrl;

        if (checkoutUrl) {
            window.location.href = checkoutUrl;
        } else {
            throw new Error("No se pudo obtener la URL de pago.");
        }

    } catch (e) {
        console.error("Error en checkout:", e);
        alert("Hubo un problema: " + e.message);
        if (btn) { btn.innerText = originalText; btn.disabled = false; }
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
async function actualizarCantidadLinea(cartId, lineId, nuevaCantidad) {
    const mutation = `
        mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
            cartLinesUpdate(cartId: $cartId, lines: $lines) {
                cart { id }
                userErrors { message }
            }
        }
    `;

    const variables = {
        cartId: cartId,
        lines: [{ id: lineId, quantity: nuevaCantidad }]
    };

    try {
        await fetch(`https://${shopifyConfig.domain}/api/${shopifyConfig.apiVersion}/graphql.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': shopifyConfig.accessToken
            },
            body: JSON.stringify({ query: mutation, variables })
        });
    } catch (e) {
        console.error("Error actualizando stock:", e);
    }
}
