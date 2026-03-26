export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  emoji: string;
  prompt: string;
}

export const TEMPLATES: Template[] = [
  {
    id: "analytics-dashboard",
    name: "Dashboard de Analytics",
    description:
      "Dashboard moderno con stat cards, gráficos de tendencia y tabla de datos recientes",
    category: "Dashboard",
    emoji: "📊",
    prompt:
      "Crea un dashboard de analytics moderno con sidebar de navegación colapsable, 4 stat cards (ingresos, usuarios, conversiones, sesiones) con indicadores de cambio porcentual, un gráfico de líneas de tendencia mensual con datos mock, una tabla de transacciones recientes con paginación, y un header con buscador y avatar. Usa colores profesionales, bordes sutiles y diseño limpio. Incluye modo responsive.",
  },
  {
    id: "saas-landing",
    name: "Landing Page SaaS",
    description:
      "Landing completa con hero, features, testimonios, pricing y footer",
    category: "Marketing",
    emoji: "🚀",
    prompt:
      "Crea una landing page para un producto SaaS de gestión de proyectos con: hero section con título grande, subtítulo, CTA primario y secundario, e imagen placeholder del producto; sección de features con 6 cards con iconos emoji; sección de testimonios con 3 cards con avatar, nombre, cargo y quote; sección de pricing con 3 planes (Starter, Pro, Enterprise) en cards con lista de features y botón CTA; footer con 4 columnas de links y copyright. Diseño moderno, profesional, con gradientes sutiles.",
  },
  {
    id: "ecommerce-product",
    name: "E-commerce Product Page",
    description:
      "Página de producto con galería, selector de variantes y reviews",
    category: "E-commerce",
    emoji: "🛍️",
    prompt:
      "Crea una página de producto e-commerce con: galería de imágenes con thumbnail selector (usa placeholders de colores), selector de talla (S/M/L/XL) y color (3 opciones) con estado activo, cantidad con +/-, botón de añadir al carrito prominente, precio con descuento tachado, badges (Nuevo, -20%), tabs de contenido (Descripción, Especificaciones, Reviews con 3 reviews mock con estrellas), sección de productos relacionados con 4 cards. Diseño limpio tipo tienda moderna.",
  },
  {
    id: "portfolio",
    name: "Portfolio Personal",
    description:
      "Portfolio de desarrollador con about, proyectos, skills y contacto",
    category: "Portfolio",
    emoji: "👨‍💻",
    prompt:
      "Crea un portfolio personal de desarrollador fullstack con: navbar fija con links de scroll suave; hero con nombre grande, título profesional, breve bio y botones de contacto/GitHub; sección About Me con foto placeholder y texto; grid de 6 proyectos con cards que tienen imagen placeholder, título, descripción, tags de tecnologías y botón ver proyecto; sección de skills con barras de progreso animadas agrupadas por categoría (Frontend, Backend, Tools); formulario de contacto con nombre, email y mensaje; footer minimalista. Diseño elegante y minimalista con tipografía cuidada.",
  },
  {
    id: "chat-app",
    name: "Chat App UI",
    description:
      "Interfaz de chat con conversaciones, mensajes y área de input",
    category: "App",
    emoji: "💬",
    prompt:
      "Crea una interfaz de chat tipo WhatsApp/Telegram con: sidebar izquierda con barra de búsqueda, lista de 8 conversaciones con avatar circular, nombre, último mensaje truncado, timestamp y badge de mensajes no leídos; área principal de chat con header (nombre del contacto, estado online, botones de llamada/video), mensajes con burbujas diferentes para enviado (azul) y recibido (gris) con timestamps, indicador de typing; input de mensaje con botón de adjuntar, campo de texto y botón de enviar. Todo responsive, que en móvil se vea solo una vista a la vez.",
  },
  {
    id: "admin-panel",
    name: "Admin Panel",
    description:
      "Panel de administración con tabla de usuarios, filtros y acciones",
    category: "Dashboard",
    emoji: "⚙️",
    prompt:
      "Crea un panel de administración con: sidebar de navegación con iconos (Dashboard, Usuarios, Productos, Pedidos, Configuración) con item activo resaltado; header con breadcrumb, buscador global, botón de notificaciones con badge y avatar con dropdown; página principal con título 'Usuarios', stats resumidas (total, activos, nuevos hoy), tabla de usuarios con columnas (avatar+nombre, email, rol con badge de color, estado activo/inactivo, fecha registro, acciones) con 10 rows de datos mock, paginación, filtros por rol y estado, y botón de exportar. Diseño profesional tipo Tailwind UI.",
  },
];

export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
