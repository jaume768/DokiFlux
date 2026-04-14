export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  emoji: string;
  image: string;
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
    image: "/templates/ecommerce.png",
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
    image: "/templates/portafolio.png",
    prompt:
      "Crea un portfolio personal de desarrollador fullstack con: navbar fija con links de scroll suave; hero con nombre grande, título profesional, breve bio y botones de contacto/GitHub; sección About Me con foto placeholder y texto; grid de 6 proyectos con cards que tienen imagen placeholder, título, descripción, tags de tecnologías y botón ver proyecto; sección de skills con barras de progreso animadas agrupadas por categoría (Frontend, Backend, Tools); formulario de contacto con nombre, email y mensaje; footer minimalista. Diseño elegante y minimalista con tipografía cuidada.",
  },
];

export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
