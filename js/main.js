async function cargarProductosDestacados(categoria, containerId) {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    try {
        const { data: productos, error } = await _supabase
            .from('productos')
            .select('*')
            .eq('categoria', categoria)
            .eq('es_destacado', true)
            .order('created_at', { ascending: false })
            .limit(6); // 🔥 Cambiado a 6

        if (error) throw error;

        if (productos && productos.length > 0) {
            grid.innerHTML = productos.map(prod => {
                const precio = new Intl.NumberFormat('es-CL', { 
                    style: 'currency', currency: 'CLP' 
                }).format(prod.precio || 0);

                const skuVisual = prod.sku ? `<div class="sku-public-container">SKU: ${prod.sku}</div>` : '';

                return `
                    <div class="product-card-simple">
                        <div class="product-img-frame">
                            <img src="${prod.url_imagen_1 || 'images/no-image.png'}" alt="${prod.nombre}" loading="lazy">
                        </div>
                        <div class="product-info-simple">
                            <span class="cat-tag-simple">${prod.categoria.replace(/_/g, ' ')}</span>
                            <h3 class="product-name-simple" title="${prod.nombre}">${prod.nombre}</h3>
                            ${skuVisual} 
                            <div class="footer-card">
                                <span class="price-simple">${precio}</span>
                                <button class="btn-cotizar-simple" onclick="verDetalle('${prod.id}')">Detalles</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            grid.innerHTML = '<p style="text-align:center; grid-column:1/-1; color: #a0aec0; padding: 20px;">Próximamente productos destacados.</p>';
        }
    } catch (error) {
        console.error("Error cargando destacados:", error);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    // 1. Carga de productos de Iluminación
    cargarProductosDestacados('iluminacion', 'productos-iluminacion-grid');
    
    // 2. Carga de productos de Herramientas
    cargarProductosDestacados('herramientas', 'productos-herramientas-grid'); 
    
    // 3. Carga de productos de Materiales Eléctricos
    cargarProductosDestacados('materiales_electricos', 'productos-materiales_electricos-grid'); 
});
