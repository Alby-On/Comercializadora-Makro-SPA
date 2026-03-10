/**
 * Carga los componentes compartidos (Header, Footer y Carrito)
 */
async function loadSharedComponents() {
    const components = [
        { name: 'header', id: 'header-placeholder' },
        { name: 'footer', id: 'footer-placeholder' },
        { name: 'carro_compras', id: 'cart-placeholder' }
    ];

    for (const comp of components) {
        const container = document.getElementById(comp.id);
        if (!container) continue;

        try {
            const response = await fetch(`./components/${comp.name}.html`);
            
            if (response.ok) {
                container.innerHTML = await response.text();
                console.log(`✅ Componente [${comp.name}] cargado correctamente.`);

                // --- LÓGICA ESPECÍFICA POR COMPONENTE ---

                // 1. Si cargamos el HEADER, activamos el menú móvil (Burger)
                if (comp.name === 'header') {
                    if (typeof inicializarMenuMobile === "function") {
                        inicializarMenuMobile();
                    }
                }

                // 2. Si cargamos el CARRITO, avisamos para renderizar productos
                if (comp.name === 'carro_compras') {
                    document.dispatchEvent(new CustomEvent('cartLoaded'));
                }
                
            } else {
                console.error(`❌ No se encontró el archivo: components/${comp.name}.html`);
            }
        } catch (error) {
            console.error(`❌ Error de red al cargar ${comp.name}:`, error);
        }
    }
}

// Iniciar la carga al abrir cualquier página
document.addEventListener("DOMContentLoaded", loadSharedComponents);

function inicializarMenuMobile() {
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav-links');
    const navLinks = document.querySelectorAll('.nav-links li');

    if (burger) {
        burger.addEventListener('click', () => {
            // Alternar el menú
            nav.classList.toggle('nav-active');

            // Animación de los enlaces (aparecen uno por uno)
            navLinks.forEach((link, index) => {
                if (link.style.animation) {
                    link.style.animation = '';
                } else {
                    link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
                }
            });

            // Animación del Burger (se transforma en X)
            burger.classList.toggle('toggle');
        });
    }
}

// Ejecutar al cargar el DOM
document.addEventListener('DOMContentLoaded', inicializarMenuMobile);
