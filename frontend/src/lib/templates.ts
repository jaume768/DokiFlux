export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  emoji: string;
  /**
   * Ruta de la captura de preview. Puede no existir todavía: ambos renders
   * (app/templates y TemplatesShowcase) hacen fallback al emoji / mini-preview
   * vía onError. Al añadir el PNG en /public/templates/<id>.png se muestra solo.
   */
  image: string;
  /**
   * Texto alternativo del preview. Se usa como `alt` de la imagen (accesibilidad)
   * y como descripción de respaldo mientras la captura no existe.
   */
  alt: string;
  prompt: string;
}

export const TEMPLATES: Template[] = [
  {
    id: "saas-landing",
    name: "Landing Page SaaS",
    description:
      "Landing completa con hero, features, testimonios, pricing y footer",
    category: "Marketing",
    emoji: "🚀",
    image: "/templates/landingsaas.png",
    alt: "Preview de una landing page SaaS con hero, sección de features y pricing",
    prompt:
      "Crea una landing page para un producto SaaS de gestión de proyectos, moderna y profesional, totalmente responsive. Estructura: navbar fija con logo, links de navegación (Producto, Características, Precios, Blog) y botones de 'Iniciar sesión' y 'Empezar gratis'; hero con título grande y potente, subtítulo claro con propuesta de valor, CTA primario y secundario, badge de social proof ('+2.000 equipos ya lo usan') y una imagen/mockup del producto; barra de logos de empresas que confían; sección de features con 6 cards con icono emoji, título y descripción; sección de 'cómo funciona' en 3 pasos numerados; sección de testimonios con 3 cards con avatar, nombre, cargo, empresa y quote; sección de pricing con 3 planes (Starter, Pro destacado como 'Más popular', Enterprise) con precio mensual, lista de features con checks y botón CTA; sección FAQ con acordeón de 5 preguntas; CTA final a ancho completo con gradiente; footer con 4 columnas de links, newsletter y copyright. Usa gradientes sutiles, buena jerarquía tipográfica, espaciado generoso y micro-interacciones en hover. Incluye imágenes de verdad.",
  },
  {
    id: "ecommerce-product",
    name: "E-commerce Product Page",
    description:
      "Página de producto con galería, selector de variantes y reviews",
    category: "E-commerce",
    emoji: "🛍️",
    image: "/templates/ecommerce.png",
    alt: "Preview de una ficha de producto e-commerce con galería y opciones de compra",
    prompt:
      "Crea una página de producto de e-commerce limpia y moderna, responsive. Incluye: breadcrumb de navegación (Inicio / Categoría / Producto); galería de imágenes con imagen principal grande y thumbnails seleccionables (usa placeholders de colores); columna de compra con nombre del producto, valoración con estrellas y nº de reviews, precio con descuento tachado y precio final, badges ('Nuevo', '-20%', 'Envío gratis'), selector de talla (S/M/L/XL) y color (3 opciones) con estado activo y opción no disponible, selector de cantidad con +/-, indicador de stock ('Solo quedan 3'), botón grande de 'Añadir al carrito' y botón secundario de 'Comprar ahora', y fila de trust badges (devolución 30 días, pago seguro, envío 24h); tabs de contenido (Descripción, Especificaciones en tabla, Reviews con 3 opiniones mock con avatar, estrellas, fecha y texto, más resumen de valoración con barras por nº de estrellas); sección de 'productos relacionados' con 4 cards. En móvil, la barra de añadir al carrito queda fija abajo. Incluye imágenes de verdad.",
  },
  {
    id: "portfolio",
    name: "Portfolio Personal",
    description:
      "Portfolio de desarrollador con about, proyectos, skills y contacto",
    category: "Portfolio",
    emoji: "👨‍💻",
    image: "/templates/portafolio.png",
    alt: "Preview de un portfolio personal de desarrollador con grid de proyectos",
    prompt:
      "Crea un portfolio personal de desarrollador fullstack, elegante y minimalista, con modo oscuro por defecto y toggle a claro. Estructura: navbar fija con nombre/logo y links de scroll suave (Sobre mí, Proyectos, Skills, Contacto) más botón de descargar CV; hero con nombre grande, título profesional animado (efecto typing entre varios roles), breve bio y botones de contacto y GitHub, con foto/avatar placeholder; sección 'Sobre mí' con foto placeholder y texto en 2 columnas más pequeñas cards de datos (años de experiencia, proyectos, clientes); grid de 6 proyectos con cards que incluyen imagen placeholder, título, descripción, tags de tecnologías y botones de 'Ver demo' y 'Código', con overlay al hover; sección de skills agrupadas por categoría (Frontend, Backend, Herramientas) mostradas como badges o barras de progreso; timeline de experiencia laboral; formulario de contacto con nombre, email y mensaje más iconos de redes sociales; footer minimalista con copyright. Tipografía cuidada, mucho espacio en blanco y transiciones suaves al hacer scroll. Incluye imágenes de verdad.",
  },

  // ── Nuevos templates (sin captura todavía: se ve el emoji hasta subir el PNG) ──

  {
    id: "dashboard-admin",
    name: "Dashboard Admin",
    description:
      "Panel de administración con sidebar, métricas, gráficas y tabla de datos",
    category: "Dashboard",
    emoji: "📊",
    image: "/templates/dashboard-admin.png",
    alt: "Preview de un panel de administración con sidebar, tarjetas de métricas y gráficas",
    prompt:
      "Crea un dashboard de administración moderno y responsive con tema oscuro. Estructura: sidebar fija a la izquierda con logo y navegación por iconos + texto (Resumen, Ventas, Usuarios, Productos, Analíticas, Ajustes) con item activo resaltado, colapsable en móvil; topbar con buscador, selector de rango de fechas, icono de notificaciones con badge y avatar de usuario con menú; fila de 4 KPI cards (Ingresos, Pedidos, Usuarios activos, Tasa de conversión) cada una con título, valor grande, variación porcentual en verde/rojo y un mini-sparkline; sección de gráficas con una gráfica de líneas de ingresos por mes y una de barras/donut por categoría (usa SVG o divs, sin librerías externas); tabla de 'Últimos pedidos' con columnas (ID, Cliente con avatar, Producto, Estado como badge de color, Fecha, Total) con paginación; panel lateral de 'Actividad reciente' con lista de eventos. Usa cards con bordes sutiles, buena densidad de información y datos mock realistas. No hacen falta imágenes: usa avatares con iniciales y placeholders de color.",
  },
  {
    id: "blog-magazine",
    name: "Blog / Revista",
    description:
      "Blog tipo magazine con artículo destacado, grid de posts y newsletter",
    category: "Contenido",
    emoji: "📰",
    image: "/templates/blog-magazine.png",
    alt: "Preview de un blog tipo revista con artículo destacado y grid de posts",
    prompt:
      "Crea un blog/revista online moderno y editorial, responsive. Estructura: navbar con logo, categorías (Tecnología, Diseño, Negocio, Cultura), buscador y botón de suscribirse; hero con artículo destacado a ancho completo (imagen grande placeholder, categoría, título grande, extracto, autor con avatar y fecha, tiempo de lectura); sección de 'Últimos artículos' en grid de 6 cards con imagen placeholder, categoría en badge, título, extracto, autor y fecha; barra lateral (en desktop) con 'Más leídos' numerados, nube de tags y una caja de newsletter; sección de categorías populares con cards; bloque CTA de suscripción a newsletter a ancho completo con input de email; footer con enlaces, redes sociales y copyright. Tipografía tipo editorial con buena legibilidad, jerarquía clara y mucho aire. Incluye imágenes de verdad.",
  },
  {
    id: "restaurant",
    name: "Web de Restaurante",
    description:
      "Web de restaurante con hero, menú por categorías, galería y reservas",
    category: "Negocio local",
    emoji: "🍽️",
    image: "/templates/restaurant.png",
    alt: "Preview de la web de un restaurante con hero, menú y sección de reservas",
    prompt:
      "Crea la web de un restaurante acogedor y apetitoso, responsive, con una paleta cálida. Estructura: navbar con logo, links (Inicio, Menú, Nosotros, Galería, Reservas, Contacto) y botón destacado de 'Reservar mesa'; hero a pantalla completa con imagen de fondo placeholder, nombre del restaurante, eslogan y botones de reservar y ver menú; sección 'Nuestra historia' con texto e imagen; menú por categorías (Entrantes, Principales, Postres, Bebidas) con cada plato mostrando nombre, breve descripción, precio y etiquetas (vegano, picante, sin gluten); galería de fotos en grid tipo masonry con placeholders; sección de horario y ubicación con mapa placeholder y datos de contacto; formulario de reserva con fecha, hora, nº de personas y datos de contacto; testimonios de clientes con estrellas; footer con horario, redes sociales y copyright. Diseño elegante con buena fotografía. Incluye imágenes de verdad.",
  },
  {
    id: "mobile-app-landing",
    name: "Landing App Móvil",
    description:
      "Landing para promocionar una app con mockups, features y botones de store",
    category: "Marketing",
    emoji: "📱",
    image: "/templates/mobile-app-landing.png",
    alt: "Preview de una landing de app móvil con mockup de teléfono y botones de descarga",
    prompt:
      "Crea una landing page para promocionar una app móvil (por ejemplo, de fitness o finanzas personales), moderna y vibrante, responsive. Estructura: navbar con logo, links y botón de 'Descargar'; hero a dos columnas con título potente, subtítulo, botones de App Store y Google Play (con sus iconos), valoración con estrellas y nº de descargas, y un mockup de teléfono placeholder mostrando la app; barra de logos de prensa ('Aparecido en'); sección de features alternando texto e imagen/mockup (3 bloques con icono, título y descripción); sección de 'cómo funciona' en 3 pasos; carrusel/grid de screenshots de la app en mockups de móvil; sección de testimonios con avatar, nombre y valoración; bloque de estadísticas destacadas (usuarios, valoración, países); sección de precios/planes si aplica; CTA final con botones de descarga; footer completo. Usa gradientes llamativos, mockups de teléfono realistas y micro-animaciones. Incluye imágenes de verdad.",
  },
  {
    id: "pricing-page",
    name: "Página de Precios",
    description:
      "Página de pricing con toggle mensual/anual, planes comparados y FAQ",
    category: "SaaS",
    emoji: "💳",
    image: "/templates/pricing-page.png",
    alt: "Preview de una página de precios con tres planes y toggle mensual/anual",
    prompt:
      "Crea una página de precios (pricing) para un producto SaaS, clara y persuasiva, responsive. Estructura: encabezado con título, subtítulo y un toggle 'Mensual / Anual' que actualiza los precios mostrando el ahorro anual ('-20%'); 3 planes en cards (Básico, Pro destacado como 'Recomendado' con borde/gradiente y badge, Empresa) con precio grande, periodo, breve descripción del público objetivo, lista de features con checks (y features no incluidas en gris), y botón CTA por plan; tabla comparativa detallada de características por plan con filas agrupadas por categoría y checks/valores por columna; sección de logos de clientes; bloque de garantía ('30 días de devolución') con iconos de confianza; FAQ en acordeón con 6 preguntas sobre facturación; CTA final para hablar con ventas; footer. Diseño con buena jerarquía visual que guíe la vista al plan recomendado. No hacen falta imágenes reales: usa iconos y placeholders de logos.",
  },
  {
    id: "auth-pages",
    name: "Login y Registro",
    description:
      "Pantallas de autenticación con login, registro y recuperar contraseña",
    category: "Autenticación",
    emoji: "🔐",
    image: "/templates/auth-pages.png",
    alt: "Preview de pantallas de login y registro con formulario y panel lateral",
    prompt:
      "Crea un set de pantallas de autenticación modernas y responsive con diseño a dos columnas: a un lado un panel visual con gradiente/imagen placeholder, logo y un mensaje de bienvenida o testimonio; al otro lado el formulario centrado. Incluye tres vistas conmutables (con estado en el mismo componente): (1) Iniciar sesión con campos de email y contraseña con toggle de mostrar/ocultar, checkbox de 'Recordarme', link de '¿Olvidaste tu contraseña?', botón principal, separador 'o' y botones de login social (Google, GitHub); (2) Registro con nombre, email, contraseña con indicador de fortaleza, checkbox de aceptar términos y botón; (3) Recuperar contraseña con email y botón de enviar enlace, más link para volver al login. Valida los campos mostrando estados de error y éxito, incluye estados de carga en los botones y enlaces para alternar entre vistas. Cuida la accesibilidad (labels, focus states). No hacen falta imágenes reales: usa un gradiente en el panel lateral.",
  },
  {
    id: "coming-soon",
    name: "Coming Soon / Waitlist",
    description:
      "Página de próximo lanzamiento con contador, captura de emails y redes",
    category: "Marketing",
    emoji: "⏳",
    image: "/templates/coming-soon.png",
    alt: "Preview de una página coming soon con cuenta atrás y formulario de waitlist",
    prompt:
      "Crea una página de 'Próximamente' (coming soon) con lista de espera, impactante y a pantalla completa, responsive. Estructura: fondo con gradiente animado o patrón sutil; logo centrado arriba; título grande anunciando el lanzamiento, subtítulo con la propuesta de valor; un contador de cuenta atrás (días, horas, minutos, segundos) hacia una fecha objetivo, funcional con JavaScript; formulario de captura de email con input y botón 'Únete a la lista' que muestra un mensaje de éxito al enviar; contador de personas ya apuntadas ('+1.240 en lista de espera') con avatares apilados; fila de iconos de redes sociales; opcional bloque de 3 mini-features de lo que viene. Todo centrado vertical y horizontalmente, con tipografía grande y animaciones sutiles de entrada. No hacen falta imágenes reales.",
  },
  {
    id: "docs-site",
    name: "Documentación",
    description:
      "Sitio de documentación con sidebar navegable, contenido y buscador",
    category: "Producto",
    emoji: "📚",
    image: "/templates/docs-site.png",
    alt: "Preview de un sitio de documentación con sidebar de navegación y contenido técnico",
    prompt:
      "Crea un sitio de documentación técnica limpio y legible, responsive, con tema claro/oscuro. Estructura de 3 columnas en desktop: (1) sidebar izquierda con logo, buscador y navegación jerárquica por secciones colapsables (Introducción, Primeros pasos, Guías, Referencia de API, FAQ) con el item activo resaltado; (2) columna central de contenido con breadcrumb, título de página, párrafos, listas, tablas, callouts/admoniciones (info, warning, tip) con color e icono, y bloques de código con resaltado de sintaxis simulado, pestañas de lenguaje (curl, JS, Python) y botón de copiar; (3) tabla de contenidos 'On this page' a la derecha que resalta la sección visible al hacer scroll. Añade navegación 'Anterior / Siguiente' al pie del contenido, y en móvil la sidebar se convierte en menú desplegable. Diseño sobrio, mucha legibilidad y monoespaciada para el código. No hacen falta imágenes reales.",
  },
  {
    id: "event-conference",
    name: "Landing de Evento",
    description:
      "Landing de conferencia con agenda, ponentes, entradas y patrocinadores",
    category: "Eventos",
    emoji: "🎟️",
    image: "/templates/event-conference.png",
    alt: "Preview de la landing de una conferencia con ponentes, agenda y entradas",
    prompt:
      "Crea la landing page de una conferencia/evento tecnológico, enérgica y moderna, responsive. Estructura: navbar con logo, links (Ponentes, Agenda, Entradas, Ubicación) y botón destacado de 'Comprar entrada'; hero con nombre del evento, fecha y ciudad, eslogan, cuenta atrás hacia el evento y botones de comprar entrada y ver agenda; barra de estadísticas (ponentes, charlas, asistentes, días); sección de ponentes en grid de cards con foto placeholder, nombre, cargo/empresa y redes; agenda por días con pestañas (Día 1, Día 2) y listado de sesiones con hora, título, ponente y sala; sección de patrocinadores agrupados por tier (Platino, Oro, Plata) con logos placeholder; sección de precios de entradas (Early bird, General, VIP) en cards con lista de beneficios y CTA; ubicación con mapa placeholder y datos del recinto; FAQ; CTA final; footer. Usa colores vibrantes, gradientes y un diseño dinámico. Incluye imágenes de verdad.",
  },
  {
    id: "agency",
    name: "Web de Agencia",
    description:
      "Web de agencia creativa con servicios, portfolio de casos y equipo",
    category: "Marketing",
    emoji: "🎨",
    image: "/templates/agency.png",
    alt: "Preview de la web de una agencia creativa con servicios y casos de estudio",
    prompt:
      "Crea la web de una agencia creativa/de diseño, con estilo audaz y sofisticado, responsive. Estructura: navbar con logo, links (Servicios, Trabajos, Nosotros, Contacto) y botón de 'Empezar proyecto'; hero de gran impacto con titular tipográfico grande, subtítulo y CTA, con una imagen o composición visual placeholder; barra de logos de clientes; sección de servicios en grid de cards (Branding, Diseño web, Marketing, Estrategia) con icono, título, descripción y link; sección de portfolio/casos de estudio con 4-6 proyectos en grid con imagen placeholder, categoría, título y overlay al hover que lleva al caso; sección de proceso de trabajo en pasos; bloque de estadísticas (proyectos, clientes, premios, años); sección de equipo con fotos placeholder, nombre y rol; testimonios de clientes; CTA final a ancho completo con gradiente invitando a contactar; footer con formulario o datos de contacto y redes. Diseño con personalidad, buen uso de espacio negativo y micro-interacciones. Incluye imágenes de verdad.",
  },
];

export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
