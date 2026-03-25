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

### Backend (Fase 1 completada)
- **Auth completa** — Registro con email + password, login con JWT (access + refresh)
- **Google OAuth** — Login con Google Identity Services, verificación de `id_token` en backend
- **Verificación de email** — Emails transaccionales vía Brevo (auto-verify en desarrollo)
- **Username y onboarding** — Username único obligatorio post-registro, pantalla de onboarding
- **Password reset** — Flujo completo con token por email
- **API docs** — Swagger/OpenAPI con drf-spectacular

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
| **IA** | OpenAI GPT-5.4 (Responses API, streaming + function calling) |
| **Auth** | JWT (access 30min / refresh 7d), Google OAuth (`google-auth`) |
| **Infraestructura** | Docker Compose (dev), Dockerfiles multietapa |

### Flujo de generación

```
Usuario escribe prompt
       │
       ▼
┌─────────────────────┐
│  GPT-5.4 Responses  │
│  API (streaming)    │
└─────────┬───────────┘
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

### Fase 3 — Integración Frontend ↔ Backend 📋

**Objetivo:** Conectar el frontend existente al backend, reemplazando las llamadas directas a OpenAI por llamadas autenticadas al proxy.

**Por qué:** Hasta ahora el frontend llama a su propio `/api/generate` (Next.js route). Para que funcione como SaaS, todas las llamadas deben pasar por el backend Django (auth, billing, rate limiting).

**Qué se hará:**
- **Auth flow pages** — Login, registro, verificación email, onboarding (elegir username)
- **Adaptar `/generate`** — Cambiar fetch de `/api/generate` → `NEXT_PUBLIC_API_URL/generate/` con header `Authorization: Bearer {token}`
- **Dashboard** — Lista de proyectos del usuario, crear/abrir/eliminar proyectos
- **Persistencia** — Guardar/cargar file_map y chat history desde el backend
- **Display de créditos** — Saldo actual, historial de uso, badge de plan
- **Protected routes** — Middleware que redirige a login si no hay token válido

---

### Fase 4 — Multi-proveedor, Storage, Pagos, Workers 📋

**Objetivo:** Escalar la plataforma con soporte multi-modelo, almacenamiento externo, pagos reales y tareas asíncronas.

**Por qué:** Para ser competitivo hay que ofrecer múltiples modelos (cada uno tiene sus fortalezas), y para escalar el billing necesita pagos reales con Stripe.

**Qué se hará:**
- **Multi-proveedor IA** — Implementar `AnthropicProvider`, `GoogleProvider` sobre la abstracción `BaseProvider`. Ofrecer diferentes modelos con costes distintos.
- **Multi API key rotation** — Pool de API keys con round-robin para multiplicar rate limits de los proveedores.
- **S3 / Object Storage** — Migrar file_map de JSONField a S3 para proyectos grandes. Añadir campo `file_map_url` al modelo `Project`.
- **Stripe** — Suscripciones (free → premium), compra de créditos adicionales, webhooks para renovación automática.
- **Celery + Redis** — Tareas async: expiración de grants, envío de emails masivos, analytics, limpieza de proyectos huérfanos.
- **Project snapshots** — Versionado de proyectos vinculado a cada generación. "Undo" para volver al estado anterior.

---

### Fase 5 — Landing, Onboarding UX, Deploy Producción 📋

**Objetivo:** Preparar el producto para usuarios reales con landing page, onboarding pulido y despliegue en producción.

**Por qué:** Tener el producto técnicamente funcional no es suficiente — necesita una buena primera impresión, pricing claro y una experiencia fluida.

**Qué se hará:**
- **Landing page** — Presentación del producto, demos interactivas, pricing, testimonios
- **Pricing page** — Comparativa de planes con CTA claro
- **Onboarding mejorado** — Tour guiado, primer proyecto asistido, templates de ejemplo
- **Deploy** — Backend en VPS/Cloud (Gunicorn + Nginx), frontend en Vercel/Netlify, PostgreSQL gestionado, Redis gestionado
- **CI/CD** — GitHub Actions para tests, lint, build y deploy automático
- **Monitoring** — Sentry para errores, logging estructurado, métricas de uso
- **SEO y marketing** — "Iterar sin miedo: coste controlado y estabilidad en proyectos largos"
- **Integraciones mínimas de valor** — Auth + pagos (Stripe), DB provider (Supabase), logging (Sentry). El objetivo no es 100 integraciones, es 3 que eviten re-prompts.

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
# === OpenAI ===
OPENAI_API_KEY=sk-...                    # API key de OpenAI (requerida)

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
│   │   │   ├── api/
│   │   │   │   ├── generate/route.ts  # Streaming SSE → GPT-5.4
│   │   │   │   └── estimate/route.ts  # Estimación de coste pre-generación
│   │   │   ├── generate/page.tsx      # UI principal (chat + preview)
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx               # Redirect → /generate
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx          # Lista de mensajes (markdown)
│   │   │   ├── PromptInput.tsx        # Input con badge de coste
│   │   │   ├── CodePreview.tsx        # WebContainer + code viewer + logs
│   │   │   ├── StreamingFileView.tsx  # Streaming code viewer real-time
│   │   │   ├── TokenUsage.tsx         # Tokens/coste por generación + stats
│   │   │   └── ui/                    # Primitivas shadcn/ui
│   │   ├── hooks/
│   │   │   ├── useWebContainer.ts     # Lifecycle WebContainer
│   │   │   └── useIsMobile.ts         # Detección móvil + iOS
│   │   ├── lib/
│   │   │   ├── openai.ts             # Cliente OpenAI singleton
│   │   │   ├── prompts.ts            # System prompt + codegen rules
│   │   │   ├── parser.ts             # Parser multiarchivo + merge
│   │   │   ├── pricing.ts            # Costes por tokens + estimación
│   │   │   └── utils.ts              # Utilidades shadcn
│   │   └── types/
│   │       └── index.ts              # Message, StreamChunk, SessionStats...
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
│   │   └── generation/                # ✅ Proxy OpenAI + audit
│   │       ├── models.py             # Generation (audit log)
│   │       ├── providers/
│   │       │   ├── base.py           # BaseProvider (abstracto)
│   │       │   └── openai.py         # OpenAIProvider (httpx async streaming)
│   │       ├── services.py           # stream_generation orchestrator
│   │       ├── middleware.py         # AsyncJWTAuthMiddleware
│   │       ├── serializers.py
│   │       ├── views.py              # generate (SSE async), estimate
│   │       ├── urls.py               # /api/generate/, /api/estimate/
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

## Pricing (planificado)

| | Free | Premium |
|--|------|---------|
| **Precio** | $0/mes | $20/mes |
| **Créditos incluidos** | $5/mes | $20/mes |
| **Mensajes/día** | 7 | 100 |
| **Tamaño máx. proyecto** | 200 KB | 500 KB |
| **Badge "Built with Dokiflux"** | Sí | No |
| **Créditos adicionales** | Compra disponible | Compra disponible |

- Los créditos mensuales no usados **roll over** y expiran tras **65 días**
- Los créditos comprados expiran tras **1 año**
- Si la generación no produce cambios o falla, **no se cobra**

### Coste por generación (GPT-5.4)

| | Precio por 1M tokens |
|--|--|
| Input | $2.50 |
| Output | $15.00 |

- **Primera generación típica** (~500 input + ~2,000 output): **~$0.031**
- **Iteración típica** (~5,000 input + ~1,000 output): **~$0.028**
- **Máximo output por generación:** 31,000 tokens

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
| POST | `/generate/` | Sí | Proxy streaming SSE a OpenAI |
| POST | `/estimate/` | Sí | Estimación de coste |

---

## Licencia

Pendiente de definir.