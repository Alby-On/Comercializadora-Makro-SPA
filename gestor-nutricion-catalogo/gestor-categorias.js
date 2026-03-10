// Aseguramos que las variables existan
let subcatsTemporales = [];

console.log("🛠️ Gestor de Categorías cargado y listo.");

/**
 * FUNCIÓN DE NAVEGACIÓN
 */
window.showView = function(viewId, btn) {
    console.log("🚀 Cambiando a vista:", viewId);
    
    // 1. Ocultar todas las vistas y desactivar botones
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    // 2. Mostrar la vista solicitada
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.add('active');
    } else {
        console.error("❌ Error: No existe el div con ID", viewId);
        return;
    }

    // 3. Activar botón
    if (btn) btn.classList.add('active');

    // --- EL CAMBIO CLAVE AQUÍ ---
    // Si la vista es inventario, DISPARA la carga de productos
    if (viewId === 'list-view') {
        console.log("📋 Disparando carga de tabla de inventario...");
        if (typeof cargarTablaDesdeSupabase === 'function') {
            cargarTablaDesdeSupabase();
        } else {
            console.error("❌ Error: La función 'cargarTablaDesdeSupabase' no existe.");
        }
    }

    // Si la vista es categorías, dispara su carga
    if (viewId === 'settings-view') {
        console.log("📂 Cargando categorías...");
        if (typeof cargarCategoriasActuales === 'function') {
            cargarCategoriasActuales();
        }
    }
};

/**
 * RENDERIZADO DE CATEGORÍAS CON BOTÓN ELIMINAR
 */
async function cargarCategoriasActuales() {
    const container = document.getElementById('categories-list-container');
    if (!container) return;

    container.innerHTML = "<p style='text-align:center;'>⏳ Conectando con Supabase...</p>";

    try {
        const client = window._supabase || _supabase;
        if (!client) throw new Error("Cliente Supabase no encontrado");

        const { data, error } = await client
            .from('configuracion_catalogo')
            .select('*');

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:20px; border:2px dashed #ccc;">
                    <p>La tabla 'configuracion_catalogo' está vacía.</p>
                    <button class="btn-main" onclick="openCreateCategoryModal()" style="width:auto; padding:10px;">
                        ✚ Crear Primera Categoría
                    </button>
                </div>`;
            return;
        }

        container.innerHTML = ""; 

        data.forEach(item => {
            const card = document.createElement('div');
            card.className = "card";
            card.style.cssText = "margin-bottom:15px; padding:20px; border-left:5px solid #059669; background:#fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); color: #333;";

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="font-size:1.1rem;">📂 ${item.nombre_visible || item.categoria}</strong>
                    <div style="display:flex; gap:10px;">
                        <button onclick="openEditCategoryModal('${item.categoria}')" 
                                style="color:#059669; background:none; border:none; cursor:pointer; font-weight:bold;">
                            ✏️ Editar
                        </button>
                        <button onclick="deleteCategory('${item.categoria}')" 
                                style="color:#e11d48; background:none; border:none; cursor:pointer; font-weight:bold;">
                            🗑️ Borrar
                        </button>
                    </div>
                </div>
                <div style="margin-top:10px; display:flex; flex-wrap:wrap; gap:6px;">
                    ${item.subcategorias.map(s => `
                        <span style="background:#f1f5f9; padding:2px 10px; border-radius:12px; font-size:12px; border:1px solid #e2e8f0; color:#475569;">
                            ${s}
                        </span>
                    `).join('')}
                </div>
            `;
            container.appendChild(card);
        });

    } catch (err) {
        console.error("❌ Error cargando categorías:", err);
        container.innerHTML = `<p style='color:red; text-align:center;'>Error: ${err.message}</p>`;
    }
}

/**
 * LÓGICA DE GUARDADO (CREAR / EDITAR)
 */
window.processCategorySave = async function() {
    const catName = document.getElementById('modal-input-cat-name').value.trim();
    const editingKey = document.getElementById('modal-editing-key').value;
    const warning = document.getElementById('sub-min-warning');

    // REGLA: Subcategoría obligatoria
    if (subcatsTemporales.length === 0) {
        warning.style.display = "block";
        return;
    }
    warning.style.display = "none";
    if (!catName) return alert("El nombre es obligatorio");

    // Generar key técnica (slug)
    const catKey = editingKey || catName.toLowerCase()
        .replace(/\s+/g, '_')
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const payload = {
        categoria: catKey,
        nombre_visible: catName,
        subcategorias: subcatsTemporales
    };

    try {
        const client = window._supabase || _supabase;
        let error;

        if (editingKey) {
            const res = await client.from('configuracion_catalogo').update(payload).eq('categoria', editingKey);
            error = res.error;
        } else {
            const res = await client.from('configuracion_catalogo').insert([payload]);
            error = res.error;
        }

        if (error) throw error;

        alert("✅ Catálogo actualizado");
        closeCategoryModal();
        cargarCategoriasActuales();
    } catch (err) {
        alert("❌ Error al guardar: " + err.message);
    }
};

/**
 * LÓGICA DE ELIMINACIÓN CON REGLA DE NEGOCIO
 */
window.deleteCategory = async function(catKey) {
    if (!confirm(`¿Estás seguro de eliminar la categoría '${catKey}'?`)) return;

    try {
        const client = window._supabase || _supabase;
        
        // REGLA: Verificar si existen productos asociados
        const { count, error: countError } = await client
            .from('productos')
            .select('*', { count: 'exact', head: true })
            .eq('categoria', catKey);

        if (countError) throw countError;

        if (count > 0) {
            alert(`⚠️ No se puede borrar: Existen ${count} productos usando esta categoría.`);
            return;
        }

        const { error: delError } = await client
            .from('configuracion_catalogo')
            .delete()
            .eq('categoria', catKey);

        if (delError) throw delError;

        alert("🗑️ Categoría eliminada");
        cargarCategoriasActuales();
    } catch (err) {
        alert("❌ Error: " + err.message);
    }
};

/**
 * GESTIÓN DE MODALES Y SUB-LISTAS
 */
window.openCreateCategoryModal = function() {
    document.getElementById('modal-category-title').innerText = "✚ Nueva Categoría";
    document.getElementById('modal-editing-key').value = "";
    document.getElementById('modal-input-cat-name').value = "";
    subcatsTemporales = [];
    renderSubListInModal();
    document.getElementById('category-modal').style.display = "flex";
};

window.openEditCategoryModal = async function(catKey) {
    const client = window._supabase || _supabase;
    const { data, error } = await client.from('configuracion_catalogo').select('*').eq('categoria', catKey).single();

    if (error) return alert("Error al cargar datos");

    document.getElementById('modal-category-title').innerText = "✏️ Editar Categoría";
    document.getElementById('modal-editing-key').value = data.categoria;
    document.getElementById('modal-input-cat-name').value = data.nombre_visible;
    subcatsTemporales = [...data.subcategorias];
    renderSubListInModal();
    document.getElementById('category-modal').style.display = "flex";
};

window.closeCategoryModal = function() {
    document.getElementById('category-modal').style.display = "none";
};

window.renderSubListInModal = function() {
    const container = document.getElementById('modal-sub-list');
    if (!container) return;
    container.innerHTML = "";
    subcatsTemporales.forEach((s, i) => {
        const span = document.createElement('span');
        span.style.cssText = "background:#f8fafc; border:1px solid #ddd; padding:5px 12px; border-radius:20px; font-size:0.85rem; display:flex; align-items:center; gap:8px;";
        span.innerHTML = `${s} <b style="color:red; cursor:pointer;" onclick="removeSubFromModalList(${i})">&times;</b>`;
        container.appendChild(span);
    });
};

window.addSubToModalList = function() {
    const input = document.getElementById('modal-input-sub-name');
    if (input.value.trim()) {
        subcatsTemporales.push(input.value.trim());
        input.value = "";
        renderSubListInModal();
        document.getElementById('sub-min-warning').style.display = "none";
    }
};

window.removeSubFromModalList = function(i) {
    subcatsTemporales.splice(i, 1);
    renderSubListInModal();
};
