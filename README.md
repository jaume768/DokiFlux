# Dokiflux

Generador de UI con IA al estilo v0.dev, en proceso de convertirse en plataforma SaaS con backend Django, sistema de créditos y soporte multi-proveedor.

---

## Qué es Dokiflux

Dokiflux permite generar proyectos completos de React + Tailwind a partir de prompts en lenguaje natural. El usuario describe lo que quiere, la IA genera código multiarchivo, y una vista previa en vivo (WebContainers) lo ejecuta directamente en el navegador — sin servidor, sin configuración.

El objetivo es convertirlo en un SaaS con autenticación, persistencia de proyectos, sistema de créditos/billing y soporte para múltiples modelos de IA.

---

## Características actuales

### Frontend (funcional)
- **Generación de código con IA** — Proyectos React + Tailwind completos desde un prompt
- **Modo dual Chat + Código** — La IA conversa para aclarar y luego genera cuando está lista
- **Vista previa en vivo** — WebContainers ejecutan Vite en el navegador (sin backend)
- **Streaming en tiempo real** — Código generado archivo por archivo con visor tipo IDE
- **Iteración a nivel de archivo** — Solo se regeneran los archivos modificados (optimización de tokens)
- **Estimación previa de coste** — Rango estimado basado en tokenización antes de generar
- **Auto-fix de errores de compilación** — Detecta errores del WebContainer y reintenta (hasta 3 veces)
- **Descarga ZIP** — Exporta como plantilla Vite + React lista para ejecutar
- **Responsive** — Chat/Preview conmutable en móvil, detección iOS Safari
- **Navegación por URL** — Barra de URL con atrás/adelante/recargar para apps multipágina

### Backend (Fases 1 + 2 completadas)
- **Auth completa** — Registro con email + password, login con JWT (access + refresh)
- **Google OAuth** — Login con Google Identity Services, verificación de `id_token` en backend
- **Verificación de email** — Emails transaccionales vía Brevo (auto-verify en desarrollo)
- **Username y onboarding** — Username único obligatorio post-registro, pantalla de onboarding
- **Password reset** — Flujo completo con token por email
- **Proyectos** — CRUD completo con file_map (JSONField) y ChatMessage, serializers separados list/detail
- **Billing** — Sistema de créditos FIFO, planes (free/premium), transacciones atómicas, auto-create on register
- **Generation proxy** — Proxy streaming SSE a OpenAI con validación de créditos, audit log, provider abstraction
- **Rate limiting** — Throttle por plan con Redis backend (free: 7/día, premium: 100/día)
- **API docs** — Swagger/OpenAPI con drf-spectacular

### Frontend (Fase 3 completada — Integración completa)
- **Auth flow pages** — Login, registro, onboarding (elegir username), password reset
- **AuthContext** — JWT con auto-refresh en 401, route protection, balance/plan tracking
- **API client** — `api.ts` con token management, wrappers tipados (apiGet, apiPost, apiPatch, apiDelete)
- **Dashboard** — Lista de proyectos del usuario, crear/eliminar, badge de plan, saldo
- **Sidebar** — Navegación (Home, Proyectos, Chats), proyectos recientes, balance, theme toggle, user info
- **Generación vía proxy** — `/app/generate/[id]` conectado al backend (no OpenAI directo), header JWT
- **Persistencia** — file_map guardado en backend tras cada generación, chat history cargado desde backend
- **Display de créditos** — Saldo actual en sidebar, header de generación y dashboard
- **Protected routes** — Middleware que redirige a /login si no hay token, a /onboarding si no hay username
- **Dark/Light mode** — ThemeProvider + ThemeToggle integrados

### Páginas públicas y onboarding (Fase 5 parcial — completada)
- **Landing page (`/`)** — Hero con CTA, "cómo funciona" (3 pasos), grid de features, showcase de templates, preview de pricing, CTA final. Animaciones con framer-motion.
- **Pricing page (`/pricing`)** — 3 planes (Free/Premium/Business), tabla de costes por generación, FAQ con acordeón
- **Onboarding mejorado** — Flujo de 2 pasos: elegir username → elegir template o empezar en blanco
- **6 templates predefinidos** — Dashboard Analytics, Landing SaaS, E-commerce, Portfolio, Chat App, Admin Panel. Cada uno con prompt predefinido que se auto-genera.
- **Componentes landing** — LandingNavbar (responsive + mobile menu), Footer, PlanCard, TemplateCard, FeatureCard, FAQItem
- **Reestructuración de rutas** — Rutas autenticadas bajo `/app/` (con Sidebar), rutas públicas en raíz

---

## Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│                        Monorepo                              │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────┐   │
│  │   frontend/   │    │   backend/  │    │  Docker       │   │
│  │   Next.js 16  │◄──►│  Django 5.1 │    │  Compose      │   │
│  │   React 19    │    │  DRF + JWT  │    │               │   │
│  │   Tailwind v4 │    │  PostgreSQL │    │  4 servicios: │   │
│  │   shadcn/ui   │    │  Redis      │    │  frontend     │   │
│  │   WebContainers│   │             │    │  backend      │   │
│  └──────────────┘    └──────────────┘    │  db (Postgres)│   │
│                                          │  redis        │   │
│                                          └───────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Stack técnico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, WebContainers, Vite |
| **Backend** | Django 5.1, Django REST Framework, SimpleJWT, drf-spectacular |
| **Base de datos** | PostgreSQL 16 |
| **Cache / Rate Limiting** | Redis 7 |
| **Email transaccional** | Brevo (Sendinblue) |
| **IA** | Multi-proveedor: OpenAI GPT-5.4, Claude (Sonnet/Opus 4.6, Haiku 4.5), Gemini (3.1 Pro, 3 Flash, 3.1 Flash-Lite) |
| **Auth** | JWT (access 30min / refresh 7d), Google OAuth (`google-auth`) |
| **Infraestructura** | Docker Compose (dev), Dockerfiles multietapa |

### Flujo de generación

```
Usuario escribe prompt
       │
       ▼
┌──────────────────────────┐
│  Multi-Provider Router   │
│  OpenAI / Claude / Gemini│
│  (streaming SSE)         │
└─────────┬────────────────┘
          │
    ┌─────┴─────┐
    │           │
  Chat       Código
 (texto)   (tool: generate_ui)
    │           │
    ▼           ▼
 Markdown    Parsea salida multiarchivo
 en chat     (marcadores // --- FILE:)
             Merge con archivos existentes
                    │
                    ▼
            ┌──────────────┐
            │ WebContainer │
            │ mount files  │
            │ npm install  │
            │ vite dev     │
            └──────┬───────┘
                   │
                   ▼
            Vista previa en
               iframe
```

---

## Roadmap

### Fase 1 — Monorepo + Backend Auth ✅

**Objetivo:** Convertir el frontend standalone en un monorepo con backend Django y autenticación completa.

**Por qué:** Sin backend no hay usuarios, sin usuarios no hay SaaS. La auth es el cimiento sobre el que se construye todo lo demás (proyectos, billing, rate limiting).

**Qué se hizo:**
- Reorganización en monorepo (`frontend/` + `backend/`)
- Docker Compose con 4 servicios (frontend, backend, PostgreSQL, Redis)
- Custom User model con email como login principal + username único nullable
- Flujo de onboarding: registro → elegir username → acceso a la app
- Endpoints auth completos:

| Endpoint | Descripción |
|----------|-------------|
| `POST /api/auth/register/` | Registro email + password (auto-verify en DEV) |
| `POST /api/auth/login/` | Login → JWT tokens |
| `POST /api/auth/token/refresh/` | Refrescar access token |
| `POST /api/auth/verify-email/` | Verificar email con token |
| `POST /api/auth/resend-verification/` | Reenviar email de verificación |
| `POST /api/auth/password-reset/` | Solicitar reset de contraseña |
| `POST /api/auth/password-reset-confirm/` | Confirmar reset con token |
| `GET /api/auth/me/` | Perfil del usuario autenticado |
| `PATCH /api/auth/me/` | Actualizar perfil |
| `POST /api/auth/set-username/` | Elegir username (onboarding) |
| `GET /api/auth/check-username/{username}/` | Verificar disponibilidad |
| `POST /api/auth/google/` | Login/registro con Google OAuth |

**Decisiones técnicas:**
- **Brevo para emails** — API transaccional fiable, free tier generoso. En DEV se auto-verifica sin enviar email (`AUTO_VERIFY_EMAIL=True`).
- **Username nullable** — Permite crear usuario antes de elegir username. El frontend detecta `username=null` y redirige a onboarding.
- **Puertos remapeados** — PostgreSQL en 5433, Redis en 6380 para evitar conflictos con servicios locales.

---

### Fase 2 — Projects + Generation Proxy + Billing + Rate Limiting ✅

**Objetivo:** Implementar las 3 apps backend restantes que convierten Dokiflux en un producto funcional con persistencia, billing y control de uso.

**Por qué:** Actualmente las generaciones no se guardan, no hay control de costes, y la API de OpenAI se llama directamente desde el frontend (expone la API key). El backend debe ser el proxy entre el usuario y OpenAI.

#### 2.1 — `apps.projects` (Persistencia)

Modelos `Project` y `ChatMessage` para guardar proyectos y su historial de chat.

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/projects/` | Listar proyectos (paginado, sin file_map) |
| `POST /api/projects/` | Crear proyecto |
| `GET /api/projects/{id}/` | Detalle con file_map completo |
| `PATCH /api/projects/{id}/` | Actualizar nombre/descripción |
| `DELETE /api/projects/{id}/` | Eliminar proyecto y mensajes |
| `GET /api/projects/{id}/messages/` | Historial de chat (paginado) |

**Decisiones de escalabilidad:**
- **`file_map` en JSONField** — Simple ahora. Para migrar a S3 solo requiere añadir un campo `file_map_url` + servicio de storage, sin tocar la API.
- **Serializers separados** — `ProjectListSerializer` (sin file_map) vs `ProjectDetailSerializer` (con file_map) para evitar payloads enormes en listados.
- **Límite de tamaño** — file_map max 200KB (free) / 500KB (premium).

#### 2.2 — `apps.billing` (Créditos y planes)

Sistema de créditos con consumo FIFO, transacciones atómicas y planes definidos en código.

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/billing/balance/` | Saldo actual + plan activo |
| `GET /api/billing/transactions/` | Historial de movimientos (paginado) |
| `GET /api/billing/plans/` | Planes disponibles (público) |

**Modelos clave:**
- **`UserPlan`** — Plan activo (free/premium). Se crea automáticamente al registrarse.
- **`CreditGrant`** — Lote de créditos con expiración (monthly: +65 días, purchase: +365 días). Consumo FIFO (el que expira antes se usa primero).
- **`CreditTransaction`** — Log inmutable de cada movimiento (grant, consumption, refund, expiry).

**Decisiones de escalabilidad:**
- **`select_for_update`** en consumo de créditos — Operaciones atómicas, sin race conditions incluso con múltiples workers.
- **Planes en código (dict)** — Simple para MVP. Migrable a DB + admin panel cuando se integre Stripe.
- **Signal `post_save` en User** — Auto-crear `UserPlan(free)` + `CreditGrant($5)` al registrarse.

#### 2.3 — `apps.generation` (Proxy OpenAI)

El núcleo del producto: backend actúa como proxy streaming entre frontend y OpenAI.

| Endpoint | Descripción |
|----------|-------------|
| `POST /api/generate/` | Proxy streaming SSE (valida créditos → llama OpenAI → descuenta) |
| `POST /api/estimate/` | Estimación de coste pre-generación |

**Flujo de generación:**
1. Validar payload (prompt ≤ 10K chars, project_id válido)
2. Verificar créditos suficientes (estimación conservadora)
3. Crear registro `Generation(status='pending')`
4. Llamar a OpenAI vía provider (streaming con `httpx` async)
5. Retransmitir SSE al frontend (mismo formato: `type=text/chat/usage/done/error`)
6. Al terminar: si produjo cambios → descontar créditos reales, actualizar file_map, guardar mensajes. Si falló → no cobrar.

**Decisiones de escalabilidad:**
- **Async view** (`async def`) — No bloquea workers Django durante streams largos de OpenAI. Soporta más conexiones SSE concurrentes sin necesidad de Celery.
- **Provider abstraction** — `BaseProvider` → `OpenAIProvider`. Añadir Claude/Gemini = crear nueva clase, sin tocar views ni billing.
- **Modelo `Generation` como audit log** — Historial completo de costes por usuario para analytics y detección de abuso.
- **Formato SSE idéntico al actual** — El frontend solo cambia la URL del fetch y añade header JWT. El parsing no cambia.

#### 2.4 — Rate Limiting

Throttle classes DRF con Redis backend, límites por plan:
- **Free:** 7 mensajes/día
- **Premium:** 100 mensajes/día

Se aplica solo al endpoint `/api/generate/`.

---

### Fase 3 — Integración Frontend ↔ Backend ✅

**Objetivo:** Conectar el frontend existente al backend, reemplazando las llamadas directas a OpenAI por llamadas autenticadas al proxy.

**Por qué:** Hasta ahora el frontend llamaba a su propio `/api/generate` (Next.js route). Para que funcione como SaaS, todas las llamadas deben pasar por el backend Django (auth, billing, rate limiting).

**Qué se hizo:**
- **Auth flow pages** — Login (`/login`), registro (`/register`), onboarding con username (`/onboarding`), password reset (`/password-reset`)
- **AuthContext** — Contexto React con JWT tokens (localStorage), auto-refresh en 401, carga de perfil y balance al montar, route protection integrada
- **API client (`lib/api.ts`)** — Cliente HTTP con auto-inject de Bearer token, refresh automático, `ApiError` tipado, wrappers (apiGet/apiPost/apiPatch/apiDelete)
- **Adaptar `/generate`** — Fetch cambiado de `/api/generate` → `NEXT_PUBLIC_API_URL/generate/` con header `Authorization: Bearer {token}`. El parsing SSE no cambió.
- **Dashboard (`/app/dashboard`)** — Lista de proyectos con grid, crear proyecto, eliminar con confirmación, badge de plan + saldo
- **Sidebar** — Navegación (Home, Proyectos, Chats), últimos 10 proyectos recientes, saldo + plan, avatar con inicial, theme toggle, logout
- **Home (`/app`)** — Prompt input tipo v0.dev que crea proyecto vía API y redirige a `/app/generate/{id}?prompt=...`
- **Persistencia** — file_map guardado con `apiPatch` al backend tras cada generación. Chat history cargado al abrir proyecto. Título editable inline.
- **Display de créditos** — Saldo en sidebar footer, header de generación, y dashboard header. Badge con tipo de plan (free/premium). Balance se refresca tras cada generación.
- **Protected routes** — AuthProvider redirige a `/login` si no hay token, a `/onboarding` si `has_completed_onboarding=false`. Rutas públicas definidas en whitelist.
- **Dark/Light mode** — ThemeProvider + ThemeToggle en sidebar footer

**Decisiones técnicas:**
- **Ruta `app/`** — Layout con Sidebar solo para rutas autenticadas (`/app/*`). Auth pages y páginas públicas sin sidebar.
- **Rutas dinámicas `/app/generate/[id]`** — Cada proyecto tiene su propia URL. Prompt inicial vía query param.
- **Tokens en localStorage** — Simple para MVP. Migrable a httpOnly cookies cuando se necesite más seguridad.
- **Auto-submit initial prompt** — Si la URL tiene `?prompt=`, se envía automáticamente al cargar (para flujo Home → Generate).

---

### Fase 4 — Multi-proveedor IA + API Key Rotation ✅

**Objetivo:** Soporte multi-modelo con 3 proveedores (OpenAI, Anthropic, Google) y rotación de API keys.

**Por qué:** Para ser competitivo hay que ofrecer múltiples modelos (cada uno tiene sus fortalezas en coste, velocidad e inteligencia).

**Qué se hizo:**
- **11 modelos de IA** — GPT-5.4 (5 niveles de reasoning: none/low/medium/high/xhigh), Claude Sonnet 4.6, Claude Opus 4.6, Claude Haiku 4.5, Gemini 3.1 Pro, Gemini 3 Flash, Gemini 3.1 Flash-Lite
- **3 providers** — `OpenAIProvider` (refactorizado), `AnthropicProvider` (nuevo), `GeminiProvider` (nuevo), todos sobre `BaseProvider`
- **MODEL_REGISTRY centralizado** — Config, pricing y límites de cada modelo en `providers/registry.py`. Único punto de verdad.
- **Multi API Key rotation** — `KeyPool` thread-safe con round-robin en `providers/key_pool.py`. Soporta múltiples keys por proveedor (comma-separated en `.env`).
- **Factory multi-provider** — `get_provider(model_id)` en `services.py` instancia el provider correcto según el registry.
- **Endpoint `/api/models/`** — Lista modelos disponibles con pricing (para el frontend).
- **Frontend ModelSelector** — Dropdown en el header de generación para elegir modelo. Agrupado por proveedor con pricing inline.
- **Validación de modelo** — Serializer valida que el modelo esté en el registry. Estimate view usa pricing del modelo seleccionado.
- **S3 preparado** — Campo `file_map_url` añadido al modelo `Project` (migración aplicada, sin lógica activa).

**Decisiones técnicas:**
- **Prompts compartidos** — `SYSTEM_PROMPT` y `CODEGEN_RULES` en `providers/prompts.py`, con tool definitions en formato específico de cada proveedor (OpenAI function, Anthropic input_schema, Gemini function_declarations).
- **Reasoning effort en GPT-5.4** — Parámetro `reasoning.effort` controla "thinking tokens". Se facturan como output tokens, así que xhigh es significativamente más caro.
- **Backward compatible** — Si solo `OPENAI_API_KEY` está definida (sin `OPENAI_API_KEYS`), se usa como fallback. Ídem para Anthropic y Gemini.
- **Message format conversion** — Cada provider convierte mensajes internos a su formato nativo (OpenAI: `developer`/`user`/`assistant`, Anthropic: `system` param + `user`/`assistant`, Gemini: `system_instruction` + `user`/`model`).

**Fase 4b — Billing + Snapshots ✅:**
- **Stripe** — Suscripciones free → premium con Stripe Checkout. `UserPlan` con `stripe_customer_id` + `stripe_subscription_id`. Webhook handler + endpoint `verify-session` como fallback fiable sin depender del webhook en desarrollo. Créditos Premium ($20) concedidos automáticamente al upgrade. (4242 4242 4242 4242, 12/26, 123)
- **Project snapshots** — Campos `file_map_snapshot` (estado antes) y `result_file_map` (estado después) en modelo `Generation`. Permite restaurar cualquier versión anterior de un proyecto.
- **Página de perfil** — `/app/profile` con estadísticas de uso (proyectos, generaciones, coste, modelo favorito, tokens), gestión de suscripción inline y enlace al portal de Stripe.

**Pendiente (Fase 4c — 📋):**
- **Celery + Redis** — Tareas async: expiración de grants, envío de emails masivos, analytics, limpieza de proyectos huérfanos.
- **S3 activo** — Lógica de upload/download de file_map a S3 (campo ya preparado).

---

### Fase 5 — Landing, Onboarding UX, Deploy Producción ⏳

**Objetivo:** Preparar el producto para usuarios reales con landing page, onboarding pulido y despliegue en producción.

**Por qué:** Tener el producto técnicamente funcional no es suficiente — necesita una buena primera impresión, pricing claro y una experiencia fluida.

**Qué se hizo (✅):**
- **Landing page (`/`)** — Hero animado (framer-motion), sección "Cómo funciona" (3 pasos), grid de 8 features, showcase de 6 templates, preview de pricing (2 planes), CTA final. Navbar responsive con detección de login. Footer con links.
- **Pricing page (`/pricing`)** — 3 planes (Free $0, Premium $20, Business custom), tabla de costes por tipo de generación, FAQ con 6 preguntas en acordeón colapsable.
- **Onboarding mejorado** — Flujo de 2 pasos con indicador visual: (1) Elegir username con check en tiempo real, (2) Elegir template predefinido o empezar desde cero.
- **6 templates predefinidos (`lib/templates.ts`)** — Dashboard Analytics, Landing SaaS, E-commerce Product, Portfolio Personal, Chat App UI, Admin Panel. Cada template es un prompt que se auto-envía al generar.
- **Componentes landing reutilizables** — `LandingNavbar`, `Footer`, `PlanCard`, `TemplateCard`, `FeatureCard`, `FAQItem` en `components/landing/`.
- **Reestructuración de rutas** — Rutas autenticadas bajo `/app/*` (con Sidebar layout). Raíz `/` libre para landing pública. `PUBLIC_PATHS` actualizado con `/`, `/pricing`.

**Decisiones técnicas:**
- **`/app/` como ruta real** — Antes era route group `(main)/`. Ahora `/app/*` es una ruta real con su propio layout + Sidebar. Las páginas públicas (`/`, `/pricing`) no tienen sidebar.
- **Templates como prompts** — Los templates no son código hardcodeado sino prompts predefinidos en `lib/templates.ts`. Al seleccionar uno se crea proyecto vía API y se redirige a `/app/generate/[id]?prompt=...` que auto-genera.
- **framer-motion** — Animaciones fade-in, stagger y scroll-triggered en la landing. Lightweight, solo se carga en páginas públicas.
- **buttonVariants + Link** — El Button de base-ui no soporta `asChild`, así que se usa `buttonVariants()` con `<Link>` de Next.js para CTAs con routing.

**Pendiente (📋):**
- **Deploy** — Backend en VPS/Cloud (Gunicorn + Nginx), frontend en Vercel/Netlify, PostgreSQL gestionado, Redis gestionado
- **CI/CD** — GitHub Actions para tests, lint, build y deploy automático
- **Monitoring** — Sentry para errores, logging estructurado, métricas de uso
- **SEO y marketing** — "Iterar sin miedo: coste controlado y estabilidad en proyectos largos"
- **Integraciones mínimas de valor** — Auth + pagos (Stripe), DB provider (Supabase), logging (Sentry). El objetivo no es 100 integraciones, es 3 que eviten re-prompts.

---

### Fase 6 — Servicios Post-Generación, Chat Libre y Multi-Framework 📋

**Objetivo:** Ampliar el producto más allá de la generación de proyectos React, ofreciendo servicios de productización, un chat libre sin generación de código, y soporte multi-framework.

#### 6.1 — Servicios Post-Generación (Contacto DokiFlux)

**Qué:** Ofrecer a los usuarios un camino para llevar sus proyectos generados a producción con ayuda profesional.

- **CTA post-generación** — Botón/banner en la UI tras generar: "¿Quieres llevar tu proyecto a producción?"
- **Servicios ofrecidos** — Hosting, dominio personalizado, base de datos, mejoras avanzadas, integraciones.
- **Formulario de contacto** — Enlace a email comercial o formulario integrado.
- **Posible integración** — Calendly para agendar llamadas, Typeform para presupuestos.

#### 6.2 — Chat Libre (sin generación de proyecto)

**Qué:** La sección "Chats" del sidebar pasa de ser un placeholder a un chat funcional tipo ChatGPT, sin WebContainer ni generación de código.

- **Interfaz** — Conversación libre con el modelo de IA seleccionado (mismo `ModelSelector`).
- **Sin WebContainer** — No hay preview, no hay generación de archivos. Solo chat de texto con respuestas en markdown.
- **Endpoint** — Posibilidades: reutilizar `/api/generate/` sin `project_id` ni contexto, o crear un endpoint `/api/chat/` más ligero.
- **Selector de modelo** — Disponible en el chat, mismos modelos que en generación.
- **Persistencia** — Historial de chats guardado en backend (nuevo modelo `Chat` + `ChatMessage`).

#### 6.3 — Multi-Framework

**Qué:** Permitir al usuario elegir el framework del proyecto en la primera generación (React, Vue, Angular, Next.js).

**Estrategia de implementación:**

| Orden | Framework | Stack | Notas |
|-------|-----------|-------|-------|
| 1 | React + Vite | ✅ Ya funcional | Base actual |
| 2 | Vue 3 + Vite | Composition API + Tailwind | Más similar a React, menor esfuerzo |
| 3 | Next.js | App Router + Tailwind | Requiere SSR awareness en prompts |
| 4 | Angular | Angular CLI + Tailwind | Más diferente, último |

**Cada framework requiere:**
- **Scaffolding WebContainer** — `package.json`, configs, entry point, estructura de directorios diferente.
- **Prompts del sistema** — `CODEGEN_RULES` adaptados: imports, routing, sintaxis de componentes, convenciones.
- **Parser de archivos** — Ajustar si cambia la estructura de directorios o extensiones.

**Reglas:**
- El framework se elige en la primera generación (`/app` page) y se guarda por proyecto.
- Una vez generado, el framework **no se puede cambiar** (no hay selector en `/app/generate/[id]`).
- El selector UI ya está implementado con todos los frameworks bloqueados excepto React.

---

## Quick Start

### 1. Clonar y configurar

```bash
git clone https://github.com/tu-usuario/dokiflux.git
cd dokiflux
cp .env.example .env
# Edita .env y añade tu OPENAI_API_KEY
```

### 2. Ejecutar con Docker (recomendado)

```bash
docker compose up --build
```

Esto levanta 4 servicios:
- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend:** [http://localhost:8000](http://localhost:8000)
- **PostgreSQL:** puerto 5433 (host) → 5432 (container)
- **Redis:** puerto 6380 (host) → 6379 (container)

### 3. Ejecutar frontend solo (sin backend)

```bash
cd frontend
npm install
npm run dev
```

> **Nota:** Sin backend solo funciona la generación directa (el frontend llama a OpenAI directamente). Auth, proyectos y billing requieren el backend.

---

## Variables de entorno

```bash
# === AI Providers ===
OPENAI_API_KEY=sk-...                    # API key de OpenAI
ANTHROPIC_API_KEY=sk-ant-...             # API key de Anthropic (Claude)
GEMINI_API_KEY=AIza...                   # API key de Google Gemini
# Multi-key rotation (comma-separated, optional):
# OPENAI_API_KEYS=sk-key1,sk-key2
# ANTHROPIC_API_KEYS=sk-ant-key1,sk-ant-key2
# GEMINI_API_KEYS=AIza-key1,AIza-key2

# === Backend Django ===
DJANGO_SECRET_KEY=change-me              # Secret key de Django
DJANGO_DEBUG=True                        # Debug mode
DJANGO_SETTINGS_MODULE=config.settings.dev
POSTGRES_DB=dokiflux                     # Nombre de la base de datos
POSTGRES_USER=dokiflux                   # Usuario PostgreSQL
POSTGRES_PASSWORD=dokiflux               # Contraseña PostgreSQL
POSTGRES_HOST=db                         # Host (nombre del servicio Docker)
POSTGRES_PORT=5432                       # Puerto interno del container
REDIS_URL=redis://redis:6379/0           # URL de Redis
ALLOWED_HOSTS=localhost,127.0.0.1        # Hosts permitidos
CORS_ALLOWED_ORIGINS=http://localhost:3000

# === Email (Brevo) ===
BREVO_API_KEY=                           # Dejar vacío en DEV (auto-verify activo)
BREVO_SENDER_EMAIL=noreply@dokiflux.com
BREVO_SENDER_NAME=Dokiflux

# === Google OAuth ===
GOOGLE_CLIENT_ID=                        # Client ID de Google Cloud Console
GOOGLE_CLIENT_SECRET=                    # Client Secret

# === Desarrollo ===
AUTO_VERIFY_EMAIL=True                   # Auto-verificar emails en DEV (sin enviar email)

# === Frontend ===
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=            # Mismo que GOOGLE_CLIENT_ID
```

---

## Estructura del proyecto

```
Dokiflux/
├── frontend/                          # Next.js 16 (React 19)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page pública (hero, features, templates, pricing)
│   │   │   ├── pricing/page.tsx      # Pricing page (3 planes, FAQ, tabla costes)
│   │   │   ├── api/
│   │   │   │   ├── generate/route.ts  # Streaming SSE → GPT-5.4 (legacy, sin usar)
│   │   │   │   └── estimate/route.ts  # Estimación de coste (legacy, sin usar)
│   │   │   ├── app/                   # Rutas autenticadas (con Sidebar)
│   │   │   │   ├── layout.tsx        # Layout con Sidebar
│   │   │   │   ├── page.tsx          # Home — prompt input → crear proyecto
│   │   │   │   ├── dashboard/page.tsx # Dashboard — CRUD proyectos
│   │   │   │   ├── chats/page.tsx     # Vista de chats (placeholder)
│   │   │   │   └── generate/
│   │   │   │       ├── page.tsx       # Redirect → /app/dashboard
│   │   │   │       └── [id]/page.tsx  # UI principal (chat + preview)
│   │   │   ├── login/page.tsx         # Login con email + password
│   │   │   ├── register/page.tsx      # Registro con nombre + email + password
│   │   │   ├── onboarding/page.tsx    # Onboarding 2 pasos: username + template
│   │   │   ├── password-reset/page.tsx # Solicitar reset de contraseña
│   │   │   ├── layout.tsx             # Root layout (AuthProvider + ThemeProvider)
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx          # Lista de mensajes (markdown)
│   │   │   ├── PromptInput.tsx        # Input con badge de coste
│   │   │   ├── CodePreview.tsx        # WebContainer + code viewer + logs
│   │   │   ├── StreamingFileView.tsx  # Streaming code viewer real-time
│   │   │   ├── TokenUsage.tsx         # Tokens/coste por generación + stats
│   │   │   ├── Sidebar.tsx            # Navegación + proyectos recientes + balance
│   │   │   ├── ThemeProvider.tsx       # next-themes wrapper
│   │   │   ├── ModelSelector.tsx       # Dropdown multi-modelo (OpenAI/Claude/Gemini)
│   │   │   ├── ThemeToggle.tsx         # Botón dark/light mode
│   │   │   ├── landing/               # Componentes de landing/pricing
│   │   │   │   ├── LandingNavbar.tsx  # Navbar responsive (logo, links, CTAs, mobile)
│   │   │   │   ├── Footer.tsx         # Footer con 4 columnas
│   │   │   │   ├── PlanCard.tsx       # Card de plan (pricing)
│   │   │   │   ├── TemplateCard.tsx   # Card de template (landing + onboarding)
│   │   │   │   ├── FeatureCard.tsx    # Card de feature (landing)
│   │   │   │   ├── FAQItem.tsx        # Acordeón FAQ (pricing)
│   │   │   │   └── index.ts          # Barrel exports
│   │   │   └── ui/                    # Primitivas shadcn/ui (button, card, badge...)
│   │   ├── context/
│   │   │   └── AuthContext.tsx         # JWT auth, route protection, balance
│   │   ├── hooks/
│   │   │   ├── useWebContainer.ts     # Lifecycle WebContainer
│   │   │   └── useIsMobile.ts         # Detección móvil + iOS
│   │   ├── lib/
│   │   │   ├── api.ts                # API client (JWT, auto-refresh, wrappers)
│   │   │   ├── templates.ts          # 6 templates predefinidos con prompts
│   │   │   ├── openai.ts             # Cliente OpenAI singleton (legacy)
│   │   │   ├── prompts.ts            # System prompt + codegen rules
│   │   │   ├── parser.ts             # Parser multiarchivo + merge
│   │   │   ├── pricing.ts            # Multi-model registry + costes + estimación
│   │   │   ├── projectUtils.ts       # Utilidades de proyecto (generar título)
│   │   │   └── utils.ts              # Utilidades shadcn
│   │   └── types/
│   │       ├── index.ts              # Message, StreamChunk, SessionStats...
│   │       └── auth.ts               # User, AuthTokens, Project, Billing types
│   ├── Dockerfile
│   └── package.json
│
├── backend/                           # Django 5.1 + DRF
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py               # Settings compartidos
│   │   │   └── dev.py                # DEBUG=True, AUTO_VERIFY_EMAIL=True
│   │   ├── urls.py                   # URLs raíz
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── apps/
│   │   ├── users/                     # ✅ Auth completa
│   │   │   ├── models.py             # User, EmailVerificationToken, PasswordResetToken
│   │   │   ├── managers.py           # CustomUserManager (email-based)
│   │   │   ├── validators.py         # Validación username
│   │   │   ├── serializers.py        # Auth serializers
│   │   │   ├── views.py              # Auth views (register, login, OAuth...)
│   │   │   ├── urls.py               # /api/auth/...
│   │   │   ├── admin.py
│   │   │   └── services/
│   │   │       ├── email.py          # Brevo email service
│   │   │       └── tokens.py         # Token generation helpers
│   │   ├── projects/                  # ✅ CRUD + ChatMessage
│   │   │   ├── models.py             # Project, ChatMessage
│   │   │   ├── serializers.py        # List/Detail/Create serializers
│   │   │   ├── views.py              # CRUD + messages list
│   │   │   ├── permissions.py        # IsProjectOwner
│   │   │   ├── urls.py               # /api/projects/...
│   │   │   └── admin.py
│   │   ├── billing/                   # ✅ Créditos + planes
│   │   │   ├── models.py             # UserPlan, CreditGrant, CreditTransaction
│   │   │   ├── services.py           # get_balance, consume_credits, grant_monthly
│   │   │   ├── signals.py            # Auto-create plan + grant on register
│   │   │   ├── plans.py              # PLAN_DEFINITIONS (free/premium)
│   │   │   ├── throttles.py          # PlanBasedDailyThrottle
│   │   │   ├── serializers.py
│   │   │   ├── views.py              # balance, transactions, plans
│   │   │   ├── urls.py               # /api/billing/...
│   │   │   └── admin.py
│   │   └── generation/                # ✅ Multi-provider AI + audit
│   │       ├── models.py             # Generation (audit log)
│   │       ├── providers/
│   │       │   ├── base.py           # BaseProvider (abstracto)
│   │       │   ├── registry.py       # MODEL_REGISTRY + calculate_cost
│   │       │   ├── key_pool.py       # KeyPool round-robin multi-key
│   │       │   ├── prompts.py        # Shared prompts + tool defs
│   │       │   ├── openai.py         # OpenAIProvider (reasoning effort)
│   │       │   ├── anthropic.py      # AnthropicProvider (Messages API)
│   │       │   └── gemini.py         # GeminiProvider (REST streaming)
│   │       ├── services.py           # stream_generation + multi-provider factory
│   │       ├── middleware.py         # AsyncJWTAuthMiddleware
│   │       ├── serializers.py
│   │       ├── views.py              # generate (SSE async), estimate, models
│   │       ├── urls.py               # /api/generate/, /api/estimate/, /api/models/
│   │       └── admin.py
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── docker-compose.yml                 # 4 servicios: frontend, backend, db, redis
├── .env.example
├── .gitignore
├── todo.txt                           # Notas de TODO del proyecto
├── aprendido.txt                      # Decisiones técnicas y aprendizajes
└── README.md                          # Este archivo
```

---

## Pricing

| | Free | Premium | Business |
|--|------|---------|----------|
| **Precio** | $0/mes | $20/mes | Custom |
| **Créditos incluidos** | $5/mes | $20/mes | Personalizados |
| **Mensajes/día** | 7 | 100 | Ilimitados |
| **Tamaño máx. proyecto** | 200 KB | 500 KB | Sin límite |
| **Badge "Built with Dokiflux"** | Sí | No | No |
| **Créditos adicionales** | Compra disponible | Compra disponible | Incluidos |
| **Soporte** | Comunidad | Email | Prioritario |

- Los créditos mensuales no usados **roll over** y expiran tras **65 días**
- Los créditos comprados expiran tras **1 año**
- Si la generación no produce cambios o falla, **no se cobra**

### Coste por generación (por modelo)

| Modelo | Input / 1M tokens | Output / 1M tokens | Max output |
|--------|-------------------|--------------------|-----------|
| GPT-5.4 (all reasoning levels) | $2.50 | $15.00 | 31,000 |
| Claude Sonnet 4.6 | $3.00 | $15.00 | 16,384 |
| Claude Opus 4.6 | $5.00 | $25.00 | 16,384 |
| Claude Haiku 4.5 | $1.00 | $5.00 | 8,192 |
| Gemini 3.1 Pro | $2.00 | $12.00 | 65,536 |
| Gemini 3 Flash | $0.50 | $3.00 | 65,536 |
| Gemini 3.1 Flash-Lite | $0.25 | $1.50 | 65,536 |

> **Nota:** En GPT-5.4 con reasoning effort (low/medium/high/xhigh), los "thinking tokens" se facturan como output. A mayor effort, más tokens de salida consumidos.

---

## API Endpoints

### Auth (`/api/auth/`) — ✅ Implementado

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/register/` | No | Registro email + password |
| POST | `/login/` | No | Login → JWT tokens |
| POST | `/token/refresh/` | No | Refrescar access token |
| POST | `/verify-email/` | No | Verificar email con token |
| POST | `/resend-verification/` | No | Reenviar verificación |
| POST | `/password-reset/` | No | Solicitar reset |
| POST | `/password-reset-confirm/` | No | Confirmar reset |
| GET | `/me/` | Sí | Perfil usuario |
| PATCH | `/me/` | Sí | Actualizar perfil |
| POST | `/set-username/` | Sí | Elegir username (onboarding) |
| GET | `/check-username/{username}/` | No | Verificar disponibilidad |
| POST | `/google/` | No | Login/registro Google OAuth |

### Projects (`/api/projects/`) — ✅ Implementado

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/` | Sí | Listar proyectos (sin file_map) |
| POST | `/` | Sí | Crear proyecto |
| GET | `/{id}/` | Sí | Detalle con file_map |
| PATCH | `/{id}/` | Sí | Actualizar nombre/descripción |
| DELETE | `/{id}/` | Sí | Eliminar proyecto |
| GET | `/{id}/messages/` | Sí | Historial de chat |

### Billing (`/api/billing/`) — ✅ Implementado

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/balance/` | Sí | Saldo + plan activo |
| GET | `/transactions/` | Sí | Historial de movimientos |
| GET | `/plans/` | No | Planes disponibles |

### Generation (`/api/`) — ✅ Implementado

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/generate/` | Sí | Proxy streaming SSE multi-proveedor (model param) |
| POST | `/estimate/` | Sí | Estimación de coste (soporta model param) |
| GET | `/models/` | No | Lista modelos disponibles con pricing |

---

## Licencia

Pendiente de definir.