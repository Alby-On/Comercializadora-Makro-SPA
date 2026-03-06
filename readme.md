# ⚡ Comercializadora Makro SPA - Plataforma Web Oficial

Este repositorio contiene el código fuente de la plataforma web oficial de **Comercializadora Makro SPA**, una solución integral para la exhibición de productos eléctricos, herramientas e insumos industriales, con integración de cotización automatizada.



## 🚀 Tecnologías Utilizadas

* **Frontend:** HTML5, CSS3 (Custom Properties & Flexbox/Grid), JavaScript Vanilla (ES6+).
* **Integración E-commerce:** Shopify Storefront API (Headless CMS).
* **Gestión de Formularios:** [EmailJS](https://www.emailjs.com/) (Integración directa con Gmail).
* **Despliegue:** GitHub Pages.
* **Optimización:** Cloudflare (DNS & SSL).

## 📁 Estructura del Proyecto

```text
/
├── index.html          # Página de aterrizaje principal
├── pages/              # Módulos secundarios del sitio
│   ├── productos.html  # Catálogo dinámico (Shopify API)
│   ├── servicios.html  # Servicios de Ingeniería Eléctrica
│   ├── cotizacion.html # Gestión de carrito y envío
│   └── contactanos.html# Formulario de contacto general
├── css/                # Estilos modulares
├── js/                 # Lógica de negocio
│   ├── main.js         # Inicialización y componentes globales
│   ├── productos.js    # Consumo de API Shopify
│   └── contacto.js     # Lógica de EmailJS
├── images/             # Activos visuales y Favicons
├── sitemap.xml         # Mapa del sitio para Google (SEO)
└── robots.txt          # Instrucciones para rastreadores
