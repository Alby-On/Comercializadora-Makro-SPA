// Variable global para almacenar los productos y usarlos en los filtros
let todosLosProductos = []; 
let configuracionCategorias = []; // Almacena la estructura real de la BD

function formatearTextoVisual(texto) {
    if (!texto) return '';
    return texto
        .replace(/_/g, ' ')
        .toLowerCase()
        .split(' ')
        .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
        .join(' ');
}

// 2. Función principal de carga mejorada (Segura para todas las páginas)
async function inicializarCatalogo() {
    const client = window._supabase || _supabase;
    if (!client) return;

    try {
        // --- PASO 1: CARGA GLOBAL (Header) ---
        // Esto se ejecuta en TODAS las páginas donde esté el script
        const { data: categorias, error: errCat } = await client
            .from('configuracion_catalogo')
            .select('*')
            .order('nombre_visible', { ascending: true });

        if (errCat) throw errCat;

        if (categorias) {
            configuracionCategorias = categorias;
            generarMenuHeader(categorias); // Adiós al "Cargando..." en cualquier página
        }

        // --- PASO 2: CARGA ESPECÍFICA (Solo productos.html) ---
        const container = document.getElementById('productos-dinamicos');
        if (container) {
            const { data: productos, error: errProd } = await client
                .from('productos')
                .select('*')
                .order('nombre', { ascending: true });

            if (errProd) throw errProd;
            
            todosLosProductos = productos || [];
            
            // Si hay menú lateral, lo llenamos con la configuración oficial
            const lateral = document.getElementById('menu-categorias');
            if (lateral) generarMenuJerarquicoDesdeConfig(categorias);
            
            // Renderizar el grid inicial
            renderizarGrid(todosLosProductos);
            
            // Verificar si venimos desde el header filtrando por URL (?cat=...)
            checkURLParams();
        }
    } catch (err) {
        console.error("Error en inicialización global:", err);
    }
}

// Genera el menú desplegable del Header (Navbar)
function generarMenuHeader(categorias) {
    const headerMenu = document.getElementById('header-menu-dinamico');
    if (!headerMenu) return;

    headerMenu.innerHTML = '';
    
    if (categorias.length === 0) {
        headerMenu.innerHTML = '<li><a href="#">Próximamente</a></li>';
        return;
    }

    categorias.forEach(cat => {
        const li = document.createElement('li');
        // Redirige a productos.html pasándole la categoría por URL
        li.innerHTML = `<a href="productos.html?cat=${cat.categoria}">${cat.nombre_visible}</a>`;
        headerMenu.appendChild(li);
    });
}

// Genera el menú lateral (Acordeón) en productos.html
function generarMenuJerarquicoDesdeConfig(categorias) {
    const menu = document.getElementById('menu-categorias');
    if (!menu) return;

    menu.innerHTML = `
        <li class="category-item active" id="btn-ver-todo">
            <span><i class="fas fa-layer-group"></i> Ver Todo</span>
        </li>
    `;

    document.getElementById('btn-ver-todo').onclick = () => {
        actualizarEstadoActivo(document.getElementById('btn-ver-todo'));
        renderizarGrid(todosLosProductos);
    };

    categorias.forEach(cat => {
        const wrapper = document.createElement('div');
        wrapper.className = 'category-group';

        const liPadre = document.createElement('li');
        liPadre.className = 'category-item has-sub';
        
        // Lógica de iconos
        let icono = 'fa-plug';
        const nombreMin = cat.categoria.toLowerCase();
        if(nombreMin.includes('herramienta')) icono = 'fa-tools';
        if(nombreMin.includes('ilumina')) icono = 'fa-lightbulb';
        if(nombreMin.includes('solar') || nombreMin.includes('ernc')) icono = 'fa-sun';

        liPadre.innerHTML = `
            <span><i class="fas ${icono}"></i> ${cat.nombre_visible}</span>
            <i class="fas fa-chevron-down arrow-icon"></i>
        `;

        const ulSub = document.createElement('ul');
        ulSub.className = 'sub-list';

        liPadre.onclick = (e) => {
            e.stopPropagation();
            // Cerrar otros acordeones
            document.querySelectorAll('.sub-list.show').forEach(el => {
                if(el !== ulSub) {
                    el.classList.remove('show');
                    el.previousElementSibling.querySelector('.arrow-icon')?.classList.remove('rotate');
                }
            });
            toggleMenu(liPadre, ulSub);
            
            const filtrados = todosLosProductos.filter(p => p.categoria === cat.categoria);
            renderizarGrid(filtrados);
            actualizarEstadoActivo(liPadre);
        };

        cat.subcategorias.forEach(subNombre => {
            const liSub = document.createElement('li');
            liSub.className = 'sub-category-item';
            liSub.innerHTML = `<i class="fas fa-caret-right"></i> ${subNombre}`;

            liSub.onclick = (e) => {
                e.stopPropagation(); 
                const filtrados = todosLosProductos.filter(p => 
                    p.categoria === cat.categoria && p.subcategoria === subNombre
                );
                renderizarGrid(filtrados);
                actualizarEstadoSubActivo(liSub);
            };
            ulSub.appendChild(liSub);
        });

        wrapper.appendChild(liPadre);
        if (cat.subcategorias.length > 0) wrapper.appendChild(ulSub);
        menu.appendChild(wrapper);
    });
}

// ... (mantenemos las funciones anteriores igual hasta renderizarGrid)

// Renderiza los productos en el Grid
function renderizarGrid(productos) {
    const container = document.getElementById('productos-dinamicos');
    if (!container) return;

    container.innerHTML = '';

    if (!productos || productos.length === 0) {
        container.innerHTML = '<p style="text-align:center; grid-column: 1/-1; padding: 50px; color: #718096;">No hay productos disponibles.</p>';
        return;
    }

    productos.forEach(prod => {
        const precioFormateado = new Intl.NumberFormat('es-CL', {
            style: 'currency', currency: 'CLP'
        }).format(prod.precio || 0);

        const imagenPrincipal = prod.url_imagen_1 || 'images/no-image.png';
        
        const conf = configuracionCategorias.find(c => c.categoria === prod.categoria);
        const categoriaVisual = conf ? conf.nombre_visible : formatearTextoVisual(prod.categoria);
        const subcategoriaVisual = prod.subcategoria ? ` | ${prod.subcategoria}` : '';
        
        // --- CAMBIO: Lógica para el SKU ---
        const skuVisual = prod.sku ? `<div class="sku-public-container">SKU: ${prod.sku}</div>` : '';

        const productCard = `
        <div class="product-card-simple">
            <div class="product-img-frame">
            <img src="${imagenPrincipal}" alt="${prod.nombre}" loading="lazy">
            ${(prod.stock <= 0) ? '<span class="badge-out">A pedido</span>' : ''}
        </div>
        <div class="product-info-simple">
            <span class="cat-tag-simple">${categoriaVisual}${subcategoriaVisual}</span>
            
            <h3 class="product-name-simple" title="${prod.nombre}">${prod.nombre}</h3>
            
            ${skuVisual} <div class="footer-card">
                <span class="price-simple">${precioFormateado}</span>
                <button class="btn-cotizar-simple" onclick="verDetalle('${prod.id}')">Detalles</button>
            </div>
        </div>
    </div>
`;
        container.innerHTML += productCard;
    });
}

// Captura el parámetro ?cat= de la URL para filtrar al cargar la página
function checkURLParams() {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('cat');
    if (cat && todosLosProductos.length > 0) {
        const filtrados = todosLosProductos.filter(p => p.categoria === cat);
        renderizarGrid(filtrados);
        
        // Marcar visualmente la categoría en el menú lateral si existe
        setTimeout(() => {
            const items = document.querySelectorAll('.category-item span');
            items.forEach(span => {
                const conf = configuracionCategorias.find(c => c.categoria === cat);
                if (conf && span.innerText.includes(conf.nombre_visible)) {
                    actualizarEstadoActivo(span.parentElement);
                }
            });
        }, 500);
    }
}

// Auxiliares de interfaz
function toggleMenu(btn, lista) {
    lista.classList.toggle('show');
    const icon = btn.querySelector('.arrow-icon');
    if (icon) icon.classList.toggle('rotate');
}

function actualizarEstadoActivo(elemento) {
    document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
    elemento.classList.add('active');
}

function actualizarEstadoSubActivo(elemento) {
    document.querySelectorAll('.sub-category-item').forEach(el => el.classList.remove('selected'));
    elemento.classList.add('selected');
}

window.verDetalle = (id) => {
    window.location.href = `detalle_productos.html?id=${id}`;
};

document.addEventListener('DOMContentLoaded', inicializarCatalogo);

/* ================================================================
   MOTOR DE BÚSQUEDA DINÁMICO - MAKRO SPA
   ================================================================ */

function ejecutarBusquedaReal() {
    // 1. Obtener el término de la URL (?buscar=...)
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('buscar')?.toLowerCase().trim();

    // Si no hay búsqueda, salimos de la función y mostramos todo normal
    if (!query) return;

    // 2. Seleccionar elementos clave
    const productos = document.querySelectorAll('.product-card-simple');
    const contenedorGrid = document.querySelector('.productos-grid');
    const tituloSeccion = document.querySelector('.header-destacados h2');
    
    let encontrados = 0;

    // 3. Normalizar y Filtrar
    productos.forEach(card => {
        // Obtenemos el nombre y la marca (si existe en el texto de la card)
        const nombreProducto = card.querySelector('.product-name-simple').innerText.toLowerCase();
        
        // Lógica de coincidencia
        if (nombreProducto.includes(query)) {
            card.style.display = 'flex'; // Usamos flex para mantener el diseño de la card
            encontrados++;
        } else {
            card.style.display = 'none';
        }
    });

    // 4. Feedback Visual al Usuario
    if (tituloSeccion) {
        if (encontrados > 0) {
            tituloSeccion.innerHTML = `Resultados para: <span style="color: #e63946;">"${query}"</span> <small>(${encontrados})</small>`;
        } else {
            tituloSeccion.innerText = `No hay resultados para: "${query}"`;
            
            // Inyectamos un mensaje amigable si el grid queda vacío
            if (contenedorGrid) {
                contenedorGrid.style.display = 'block'; // Cambiamos de grid a block para el mensaje
                contenedorGrid.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; color: #64748b;">
                        <i class="fas fa-search-minus" style="font-size: 4rem; color: #cbd5e1; margin-bottom: 20px; display: block;"></i>
                        <h3 style="color: #1e293b; margin-bottom: 10px;">¡Lo sentimos!</h3>
                        <p>No encontramos productos que coincidan con su búsqueda.</p>
                        <p style="margin-bottom: 25px;">Intente con palabras más generales o revise la ortografía.</p>
                        <a href="productos.html" 
                           style="background: #e63946; color: white; padding: 12px 25px; border-radius: 5px; text-decoration: none; font-weight: 700; display: inline-block; transition: 0.3s;">
                           Ver todo el catálogo
                        </a>
                    </div>
                `;
            }
        }
    }
}

// EJECUCIÓN: Asegúrate de llamarla después de que tus productos se carguen
window.addEventListener('DOMContentLoaded', () => {
    // Si tus productos se cargan por JS, llama esta función AL FINAL de ese proceso de carga.
    // Si son estáticos, esto funcionará de inmediato:
    ejecutarBusquedaReal();
});
