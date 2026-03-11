// --- VARIABLES DE ESTADO ---
let productosEnMemoria = []; 
let idProductoEditando = null;
let catalogoConfig = {}; 

/**
 * CARGA INICIAL Y NAVEGACIÓN
 */
async function cargarTablaDesdeSupabase() {
    console.log("🔍 Iniciando carga de inventario...");
    const body = document.getElementById("inventory-body");
    if (!body) return console.error("❌ No se encontró el elemento 'inventory-body'");

    // Actualizado el colspan a 7 para la nueva columna
    body.innerHTML = '<tr><td colspan="7" style="text-align:center;">⏳ Conectando con la base de datos...</td></tr>';

    try {
        const client = window._supabase || (typeof _supabase !== 'undefined' ? _supabase : null);
        
        if (!client) {
            console.error("❌ El cliente de Supabase no está inicializado.");
            body.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Error: Cliente no inicializado</td></tr>';
            return;
        }

        // 1. Cargamos configuración de categorías
        console.log("📂 Descargando configuración de categorías...");
        const { data: confData, error: confError } = await client.from('configuracion_catalogo').select('*');
        
        if (confError) throw confError;

        catalogoConfig = {};
        if (confData) {
            confData.forEach(c => {
                catalogoConfig[c.categoria] = {
                    nombre: c.nombre_visible,
                    subs: c.subcategorias
                };
            });
            console.log("✅ Categorías procesadas:", Object.keys(catalogoConfig).length);
        }

        // 2. Cargamos los productos
        console.log("📦 Descargando lista de productos...");
        const { data, error } = await client
            .from('productos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        console.log("✅ Productos recibidos:", data ? data.length : 0);
        
        productosEnMemoria = data || [];
        renderizarTabla(productosEnMemoria);

    } catch (error) {
        console.error("❌ Error crítico en cargarTablaDesdeSupabase:", error);
        body.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Error: ${error.message}</td></tr>`;
    }
}

function renderizarTabla(lista) {
    const body = document.getElementById("inventory-body");
    if (!body) return;
    body.innerHTML = "";

    if (!lista || lista.length === 0) {
        body.innerHTML = '<tr><td colspan="7" style="text-align:center;">📭 No hay productos registrados.</td></tr>';
        return;
    }

    lista.forEach((prod) => {
        const tr = document.createElement("tr");
        
        const precioFormateado = new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP'
        }).format(prod.precio || 0);

        const nombreCategoria = catalogoConfig[prod.categoria] ? catalogoConfig[prod.categoria].nombre : prod.categoria;

        tr.innerHTML = `
            <td><img src="${prod.url_imagen_1 || 'https://via.placeholder.com/50'}" class="thumb" onerror="this.src='https://via.placeholder.com/50'"></td>
            <td><span class="sku-badge" style="background:#f1f5f9; padding:4px 8px; border-radius:4px; font-family:monospace; font-weight:bold;">${prod.sku || 'S/N'}</span></td>
            <td>${prod.nombre}</td>
            <td><span class="badge-cat" style="background:#e2e8f0; padding:2px 8px; border-radius:4px; font-size:0.8em;">${nombreCategoria}</span></td>
            <td><strong>${precioFormateado}</strong></td>
            <td>${prod.stock} unidades</td>
            <td>
                <button class="nav-btn" style="padding:5px 10px; font-size:0.8em;" onclick="prepararEdicion('${prod.id}')">✏️ Editar</button>
                <button class="nav-btn" style="padding:5px 10px; font-size:0.8em; background:#fee2e2; color:#b91c1c;" onclick="deleteProduct('${prod.id}')">🗑️ Borrar</button>
            </td>
        `;
        body.appendChild(tr);
    });
}

// --- FUNCIÓN PARA RELLENAR EL MODAL DE EDICIÓN ---
async function prepararEdicion(id) {
    const p = productosEnMemoria.find(item => item.id === id);
    if (!p) return; 

    idProductoEditando = p.id;

    const editCatSelect = document.getElementById("edit-cat");
    editCatSelect.innerHTML = '<option value="">Seleccione Categoría</option>';
    
    Object.keys(catalogoConfig).forEach(key => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = catalogoConfig[key].nombre;
        editCatSelect.appendChild(opt);
    });

    // Seteamos valores actuales incluyendo SKU y Destacado
    if(document.getElementById("edit-sku")) document.getElementById("edit-sku").value = p.sku || "";
    document.getElementById("edit-nombre").value = p.nombre;
    document.getElementById("edit-cat").value = p.categoria;
    document.getElementById("edit-stock").value = p.stock;
    document.getElementById("edit-precio").value = p.precio || 0;
    document.getElementById("edit-desc").value = p.descripcion || "";

    // --- NUEVO: Seteamos el checkbox de destacado ---
    const checkDestacado = document.getElementById("edit-destacado");
    if(checkDestacado) {
        checkDestacado.checked = p.es_destacado === true;
    }

    cargarSubcategoriasEdicion(p.subcategoria);

    for (let i = 1; i <= 3; i++) {
        const imgPre = document.getElementById(`pre-edit-${i}`);
        const url = p[`url_imagen_${i}`];
        imgPre.src = url || "";
        imgPre.style.display = url ? "block" : "none";
    }

    const modal = document.getElementById("edit-modal");
    if(modal) modal.style.display = "flex";
}

function cargarSubcategoriasEdicion(subcatPreseleccionada = "") {
    const catValue = document.getElementById("edit-cat").value;
    const subcatSelect = document.getElementById("edit-subcat");
    
    subcatSelect.innerHTML = '<option value="">Seleccione Sub-Categoría</option>';

    if (catValue && catalogoConfig[catValue]) {
        subcatSelect.disabled = false;
        catalogoConfig[catValue].subs.forEach(sub => {
            const option = document.createElement("option");
            option.value = sub; 
            option.textContent = sub;
            if (sub === subcatPreseleccionada) option.selected = true;
            subcatSelect.appendChild(option);
        });
    } else {
        subcatSelect.disabled = true;
    }
}

// --- ELIMINACIÓN ---
async function deleteProduct(id) {
    if (!confirm("¿Deseas eliminar este producto permanentemente?")) return;
    const client = window._supabase || _supabase;
    const producto = productosEnMemoria.find(p => p.id === id);
    
    try {
        const archivosABorrar = [];
        for (let i = 1; i <= 3; i++) {
            const url = producto[`url_imagen_${i}`];
            if (url && url.includes('fotos-productos')) {
                const nombreArchivo = url.split('/').pop().split('?')[0];
                archivosABorrar.push(`productos/${nombreArchivo}`);
            }
        }

        if (archivosABorrar.length > 0) {
            await client.storage.from('fotos-productos').remove(archivosABorrar);
        }

        const { error } = await client.from('productos').delete().eq('id', id);
        if (error) throw error;

        alert("🗑️ Producto eliminado.");
        cargarTablaDesdeSupabase();
    } catch (err) {
        alert("Error al eliminar: " + err.message);
    }
}

// --- ACTUALIZACIÓN (UPDATE) ---
async function saveEdit() {
    if (!idProductoEditando) return;
    const client = window._supabase || _supabase;

    const btn = document.querySelector('#edit-modal .btn-main');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Sincronizando...";

    const productoActual = productosEnMemoria.find(p => p.id === idProductoEditando);

    const datos = {
        sku: document.getElementById("edit-sku") ? document.getElementById("edit-sku").value : "S/N",
        nombre: document.getElementById("edit-nombre").value,
        categoria: document.getElementById("edit-cat").value,
        subcategoria: document.getElementById("edit-subcat").value,
        stock: parseInt(document.getElementById("edit-stock").value) || 0,
        precio: parseInt(document.getElementById("edit-precio").value) || 0,
        descripcion: document.getElementById("edit-desc").value,
        // --- NUEVO: Capturamos el valor del checkbox de destacado ---
        es_destacado: document.getElementById("edit-destacado") ? document.getElementById("edit-destacado").checked : false
    };

    try {
        for (let i = 1; i <= 3; i++) {
            const input = document.getElementById(`edit-foto${i}`);
            if (input.files && input.files[0]) {
                const urlVieja = productoActual[`url_imagen_${i}`];
                if (urlVieja) {
                    const nombreLimpio = urlVieja.split('/').pop().split('?')[0];
                    await client.storage.from('fotos-productos').remove([`productos/${nombreLimpio}`]);
                }
                const options = { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true, fileType: 'image/webp' };
                const compressed = await imageCompression(input.files[0], options);
                const path = `productos/${idProductoEditando}_${i}_${Date.now()}.webp`;
                await client.storage.from('fotos-productos').upload(path, compressed);
                const { data: pub } = client.storage.from('fotos-productos').getPublicUrl(path);
                datos[`url_imagen_${i}`] = pub.publicUrl;
            }
        }

        const { error } = await client.from('productos').update(datos).eq('id', idProductoEditando);
        if (error) throw error;

        alert("✅ Producto actualizado.");
        closeModal();
        cargarTablaDesdeSupabase();
    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

// --- UTILIDADES ---
function filterTable() {
    const input = document.getElementById("search").value.toLowerCase();
    const resultados = productosEnMemoria.filter(p => 
        p.nombre.toLowerCase().includes(input) || 
        (p.sku && p.sku.toLowerCase().includes(input)) || // Búsqueda por SKU
        p.categoria.toLowerCase().includes(input) ||
        p.subcategoria.toLowerCase().includes(input)
    );
    renderizarTabla(resultados);
}

function closeModal() {
    const modal = document.getElementById("edit-modal");
    if (modal) modal.style.display = "none";
}

function previewEdit(input, imgId) {
    const preview = document.getElementById(imgId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// --- VARIABLES GLOBALES PARA LA PRUEBA ---
let currentPage = 1;
const recordsPerPage = 50; // Límite solicitado
let allProducts = []; 

// --- FUNCIÓN QUE SIMULA LA CARGA DE DATOS ---
function cargarPruebaInventario() {
    allProducts = []; // 1. Limpiamos
    
    // 2. Llenamos el array (Este proceso es instantáneo)
    for (let i = 1; i <= 125; i++) {
        allProducts.push({
            foto: 'https://via.placeholder.com/40',
            sku: `SKU-MAK-${1000 + i}`,
            nombre: `Producto Industrial ${i}`,
            categoria: i % 2 === 0 ? 'Ferretería' : 'Construcción',
            stock: Math.floor(Math.random() * 500)
        });
    }
    
    // 3. ¡IMPORTANTE! Forzamos que la página sea la 1 al inicio
    currentPage = 1; 
    
    // 4. Ahora sí, mandamos a dibujar la tabla
    displayInventory(); 
}

// Asegúrate de que esta línea esté al final de tus scripts
window.onload = cargarPruebaInventario;

// --- FUNCIÓN PARA MOSTRAR LA TABLA PAGINADA ---
function displayInventory() {
    const tbody = document.getElementById('inventory-body');
    tbody.innerHTML = '';

    // Lógica de "rebanado" (Slice)
    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const currentItems = allProducts.slice(start, end);

    currentItems.forEach(prod => {
        tbody.innerHTML += `
            <tr>
                <td><img src="${prod.foto}" width="40" style="border-radius:5px"></td>
                <td>${prod.sku}</td>
                <td>${prod.nombre}</td>
                <td>${prod.categoria}</td>
                <td><strong>${prod.stock}</strong></td>
                <td><button style="cursor:pointer">⚙️</button></td>
            </tr>
        `;
    });

    actualizarControles();
}

// --- ACTUALIZA LOS TEXTOS Y BOTONES ---
function actualizarControles() {
    const total = allProducts.length;
    document.getElementById('total-products').innerText = total;
    document.getElementById('start-index').innerText = (currentPage - 1) * recordsPerPage + 1;
    document.getElementById('end-index').innerText = Math.min(currentPage * recordsPerPage, total);

    // Bloquear botones si no hay más páginas
    document.getElementById('prev-page').disabled = (currentPage === 1);
    document.getElementById('next-page').disabled = (currentPage * recordsPerPage >= total);
}

// --- FUNCIÓN PARA CAMBIAR DE PÁGINA ---
function changePage(direction) {
    currentPage += direction;
    displayInventory();
    // Scroll hacia arriba de la tabla para comodidad
    document.querySelector('.table-container').scrollTop = 0;
}

// LANZAR LA PRUEBA AL CARGAR LA PÁGINA
window.onload = cargarPruebaInventario;
