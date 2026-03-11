// --- VARIABLES DE ESTADO ---
let productosEnMemoria = []; 
let idProductoEditando = null;
let catalogoConfig = {}; 
let currentPage = 1;
const recordsPerPage = 50; 

/**
 * 1. CARGA INICIAL DESDE SUPABASE
 */
async function cargarTablaDesdeSupabase() {
    console.log("🔍 Iniciando carga de inventario...");
    const body = document.getElementById("inventory-body");
    if (!body) return console.error("❌ No se encontró el elemento 'inventory-body'");

    body.innerHTML = '<tr><td colspan="7" style="text-align:center;">⏳ Conectando con la base de datos...</td></tr>';

    try {
        const client = window._supabase || (typeof _supabase !== 'undefined' ? _supabase : null);
        if (!client) throw new Error("Cliente Supabase no inicializado");

        // Cargamos configuración de categorías
        const { data: confData, error: confError } = await client.from('configuracion_catalogo').select('*');
        if (confError) throw confError;

        catalogoConfig = {};
        if (confData) {
            confData.forEach(c => {
                catalogoConfig[c.categoria] = { nombre: c.nombre_visible, subs: c.subcategorias };
            });
        }

        // Cargamos los productos
        const { data, error } = await client.from('productos').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        // Guardamos en memoria y disparamos el renderizado paginado
        productosEnMemoria = data || [];
        currentPage = 1; 
        displayInventory();

    } catch (error) {
        console.error("❌ Error crítico:", error);
        body.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Error: ${error.message}</td></tr>`;
    }
}

/**
 * 2. RENDERIZADO CON PAGINACIÓN (Motor principal)
 */
function displayInventory() {
    const tbody = document.getElementById('inventory-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (productosEnMemoria.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px;">📭 No hay productos registrados.</td></tr>';
        actualizarControles();
        return;
    }

    // Lógica de Paginación
    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const currentItems = productosEnMemoria.slice(start, end);

    const formatter = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

    currentItems.forEach((prod) => {
        const nombreCategoria = catalogoConfig[prod.categoria] ? catalogoConfig[prod.categoria].nombre : prod.categoria;
        
        tbody.innerHTML += `
            <tr>
                <td><img src="${prod.url_imagen_1 || 'https://via.placeholder.com/50'}" class="thumb" style="width:45px; height:45px; object-fit:cover; border-radius:6px;" onerror="this.src='https://via.placeholder.com/50'"></td>
                <td><span class="sku-badge" style="background:#f1f5f9; padding:4px 8px; border-radius:4px; font-family:monospace; font-weight:bold;">${prod.sku || 'S/N'}</span></td>
                <td style="font-weight:500;">${prod.nombre}</td>
                <td><span class="badge-cat" style="background:#e2e8f0; padding:2px 8px; border-radius:4px; font-size:0.8em;">${nombreCategoria}</span></td>
                <td><strong>${formatter.format(prod.precio || 0)}</strong></td>
                <td><strong style="color: ${prod.stock <= 5 ? '#e63946' : '#1e293b'}">${prod.stock} un.</strong></td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="nav-btn" style="padding:5px 10px; font-size:0.8em;" onclick="prepararEdicion('${prod.id}')">✏️</button>
                        <button class="nav-btn" style="padding:5px 10px; font-size:0.8em; background:#fee2e2; color:#b91c1c;" onclick="deleteProduct('${prod.id}')">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });

    actualizarControles();
}

/**
 * 3. CONTROLES DE PAGINACIÓN E INTERFAZ
 */
function actualizarControles() {
    const total = productosEnMemoria.length;
    const totalDocs = document.getElementById('total-products');
    if(!totalDocs) return;

    totalDocs.innerText = total;
    
    const startIdx = total === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1;
    const endIdx = Math.min(currentPage * recordsPerPage, total);

    document.getElementById('start-index').innerText = startIdx;
    document.getElementById('end-index').innerText = endIdx;

    const btnPrev = document.getElementById('prev-page');
    const btnNext = document.getElementById('next-page');

    if (btnPrev && btnNext) {
        btnPrev.disabled = (currentPage === 1);
        btnNext.disabled = (currentPage * recordsPerPage >= total || total === 0);
        btnPrev.style.opacity = btnPrev.disabled ? "0.4" : "1";
        btnNext.style.opacity = btnNext.disabled ? "0.4" : "1";
    }
}

function changePage(direction) {
    currentPage += direction;
    displayInventory();
    const container = document.querySelector('.table-container');
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 4. BUSCADOR FILTRADO
 */
function filterTable() {
    const input = document.getElementById("search").value.toLowerCase();
    
    // IMPORTANTE: Al buscar siempre volvemos a la página 1
    currentPage = 1;

    // Filtramos sobre la data original de Supabase que está en memoria
    const resultados = productosEnMemoria.filter(p => 
        p.nombre.toLowerCase().includes(input) || 
        (p.sku && p.sku.toLowerCase().includes(input)) ||
        p.categoria.toLowerCase().includes(input)
    );

    // Si queremos que el buscador funcione con la paginación de forma persistente, 
    // lo ideal es renderizar directamente el filtro.
    renderizarBusqueda(resultados);
}

// Función auxiliar para no perder la data real al borrar el buscador
function renderizarBusqueda(listaFiltrada) {
    const tbody = document.getElementById('inventory-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Para la búsqueda mostramos los primeros 50 del resultado
    const currentItems = listaFiltrada.slice(0, recordsPerPage);
    const formatter = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' });

    currentItems.forEach((prod) => {
        const nombreCategoria = catalogoConfig[prod.categoria] ? catalogoConfig[prod.categoria].nombre : prod.categoria;
        tbody.innerHTML += `
            <tr>
                <td><img src="${prod.url_imagen_1 || 'https://via.placeholder.com/50'}" class="thumb" style="width:45px; height:45px; object-fit:cover; border-radius:6px;"></td>
                <td><span class="sku-badge">${prod.sku || 'S/N'}</span></td>
                <td>${prod.nombre}</td>
                <td><span class="badge-cat">${nombreCategoria}</span></td>
                <td><strong>${formatter.format(prod.precio || 0)}</strong></td>
                <td><strong>${prod.stock} un.</strong></td>
                <td>
                    <button class="nav-btn" onclick="prepararEdicion('${prod.id}')">✏️</button>
                </td>
            </tr>
        `;
    });
}

// --- EDICIÓN, ELIMINACIÓN Y MODALES (Se mantienen igual) ---
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

    if(document.getElementById("edit-sku")) document.getElementById("edit-sku").value = p.sku || "";
    document.getElementById("edit-nombre").value = p.nombre;
    document.getElementById("edit-cat").value = p.categoria;
    document.getElementById("edit-stock").value = p.stock;
    document.getElementById("edit-precio").value = p.precio || 0;
    document.getElementById("edit-desc").value = p.descripcion || "";

    const checkDestacado = document.getElementById("edit-destacado");
    if(checkDestacado) checkDestacado.checked = p.es_destacado === true;

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
        if (archivosABorrar.length > 0) await client.storage.from('fotos-productos').remove(archivosABorrar);

        const { error } = await client.from('productos').delete().eq('id', id);
        if (error) throw error;

        alert("🗑️ Producto eliminado.");
        cargarTablaDesdeSupabase();
    } catch (err) {
        alert("Error al eliminar: " + err.message);
    }
}

function closeModal() {
    const modal = document.getElementById("edit-modal");
    if (modal) modal.style.display = "none";
}
/**
 * 5. GUARDAR CAMBIOS (UPDATE)
 */
async function saveEdit() {
    if (!idProductoEditando) return;
    
    const client = window._supabase || (typeof _supabase !== 'undefined' ? _supabase : null);
    if (!client) return alert("Error: Cliente Supabase no encontrado");

    // Bloqueamos el botón para evitar doble clic
    const btn = document.querySelector('#edit-modal .btn-main') || document.querySelector('#edit-modal button[onclick="saveEdit()"]');
    const originalText = btn ? btn.innerText : "Actualizar";
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Sincronizando...";
    }

    const productoActual = productosEnMemoria.find(p => p.id === idProductoEditando);

    // Recolectamos los datos del formulario
    const datos = {
        sku: document.getElementById("edit-sku") ? document.getElementById("edit-sku").value : "S/N",
        nombre: document.getElementById("edit-nombre").value,
        categoria: document.getElementById("edit-cat").value,
        subcategoria: document.getElementById("edit-subcat").value,
        stock: parseInt(document.getElementById("edit-stock").value) || 0,
        precio: parseInt(document.getElementById("edit-precio").value) || 0,
        descripcion: document.getElementById("edit-desc").value,
        es_destacado: document.getElementById("edit-destacado") ? document.getElementById("edit-destacado").checked : false
    };

    try {
        // Manejo de imágenes nuevas (si el usuario seleccionó archivos)
        for (let i = 1; i <= 3; i++) {
            const input = document.getElementById(`edit-foto${i}`);
            if (input && input.files && input.files[0]) {
                // 1. Borrar imagen antigua de Storage si existe
                const urlVieja = productoActual[`url_imagen_${i}`];
                if (urlVieja && urlVieja.includes('fotos-productos')) {
                    const nombreLimpio = urlVieja.split('/').pop().split('?')[0];
                    await client.storage.from('fotos-productos').remove([`productos/${nombreLimpio}`]);
                }

                // 2. Comprimir y Subir nueva imagen
                const file = input.files[0];
                const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1200, useWebWorker: true, fileType: 'image/webp' };
                
                // Nota: Asegúrate de tener la librería browser-image-compression cargada
                const compressed = typeof imageCompression !== 'undefined' ? await imageCompression(file, options) : file;
                
                const path = `productos/${idProductoEditando}_${i}_${Date.now()}.webp`;
                const { error: uploadError } = await client.storage.from('fotos-productos').upload(path, compressed);
                
                if (uploadError) throw uploadError;

                // 3. Obtener URL pública
                const { data: pub } = client.storage.from('fotos-productos').getPublicUrl(path);
                datos[`url_imagen_${i}`] = pub.publicUrl;
            }
        }

        // --- ENVIAR A SUPABASE ---
        const { error } = await client.from('productos').update(datos).eq('id', idProductoEditando);
        
        if (error) throw error;

        alert("✅ Producto actualizado con éxito.");
        closeModal();
        cargarTablaDesdeSupabase(); // Recargamos la tabla para ver los cambios

    } catch (err) {
        console.error("Error al guardar:", err);
        alert("Error al actualizar: " + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    }
}
