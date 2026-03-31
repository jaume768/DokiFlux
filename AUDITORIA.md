# Auditoría DokiFlux — Seguridad, Refactorización y SEO

> Generado el 01/04/2026. Estado del proyecto: desarrollo local.  
> Stack: Django 4.x + DRF + Celery + Redis + PostgreSQL / Next.js 15 (App Router)

---

## Tabla de prioridades rápida

| # | Tipo | Título | Prioridad |
|---|------|--------|-----------|
| 1 | 🔒 Seguridad | `@csrf_exempt` en todas las vistas async de generation | **Crítico** |
| 2 | 🔒 Seguridad | `SECRET_KEY` con valor por defecto hardcodeado | **Crítico** |
| 3 | 🐛 Bug | URL de reset de contraseña en emails incorrecta | **Crítico** |
| 4 | 🔒 Seguridad | No existe `settings/production.py` | **Crítico** |
| 5 | 🔒 Seguridad | `CookieTokenRefreshView` sin throttling | **Crítico** |
| 6 | 🔒 Seguridad | Stripe API llamada en cada GET de perfil | Alto |
| 7 | 🔒 Seguridad | `stripe.api_key` global asignado por cada request | Alto |
| 8 | 🔧 Refact | Closure async definida en loop en `tasks.py` | Alto |
| 9 | 🔧 Refact | Imports dentro de métodos/funciones | Alto |
| 10 | 🔧 Refact | `_save_generation()` sin `update_fields` | Alto |
| 11 | 🔧 Refact | Default 500 KB en serializer (plan free = 200 KB) | Alto |
| 12 | 🔒 Seguridad | Sin rate limiting en endpoints autenticados | Alto |
| 13 | 🔧 Refact | `import json` dentro de property en Model | Medio |
| 14 | 🔧 Refact | Duplicación entre `stream_generation` y `stream_phased_generation` | Medio |
| 15 | 🔧 Refact | `get_provider()` con if/elif — debería usar registry dict | Medio |
| 16 | 🔧 Refact | `AuthContext.init()` — llamadas secuenciales que pueden ser paralelas | Medio |
| 17 | 🔒 Seguridad | Sin límite de número de ítems en `chat_history` | Medio |
| 18 | 🔧 Refact | Cero tests automatizados | Medio |
| 19 | 🔧 Refact | Credenciales hardcodeadas en `docker-compose.yml` | Medio |
| 20 | 🔍 SEO | Landing page como `"use client"` — impacta indexación | Bajo |
| 21 | 🔍 SEO | Metadata incompleta (OG, Twitter Cards, canonical) | Bajo |
| 22 | 🔍 SEO | Sin `robots.txt` ni `sitemap.xml` | Bajo |
| 23 | 🔍 SEO | Páginas privadas sin `noindex` | Bajo |

---

## 🔴 CRÍTICO

---

### [1] `@csrf_exempt` en todas las vistas async de generation

**Archivo:** `backend/apps/generation/views.py` — líneas 21, 146, 229, 241, 281, 315

**Problema:**  
Todas las vistas async tienen el decorador `@csrf_exempt`:
```python
@csrf_exempt
async def generate_view(request): ...

@csrf_exempt
async def estimate_view(request): ...

@csrf_exempt
async def models_view(request): ...
# ... y el resto
```
Aunque se usa JWT por cookie, eliminar CSRF rompe la defensa en profundidad. Un ataque CSRF podría forzar a un usuario autenticado a generar código o gastar créditos desde un sitio externo.

**Fix:**  
- `models_view` (GET público): puede quedarse con `@csrf_exempt` o simplemente no tenerlo.
- Vistas que mutan datos (`generate_view`, `estimate_view`, `cancel_generation_view`): implementar validación de CSRF token o usar el middleware de Django correctamente en async.
- Alternativa práctica: mover estas vistas a DRF `APIView` con `CsrfExemptSessionAuthentication` solo donde sea necesario.

---

### [2] `SECRET_KEY` con valor por defecto hardcodeado

**Archivo:** `backend/config/settings/base.py` — línea 13

**Problema:**
```python
SECRET_KEY = config("DJANGO_SECRET_KEY", default="insecure-change-me-in-production")
```
Si se despliega sin `.env`, Django arranca con una clave pública conocida. Esto permite falsificar cookies de sesión, tokens CSRF, URLs firmadas, etc.

**Fix:**
```python
SECRET_KEY = config("DJANGO_SECRET_KEY")  # sin default → lanza ValueError si no existe
```

---

### [3] URL de reset de contraseña incorrecta en el servicio de email ⚠️ BUG REAL

**Archivo:** `backend/apps/users/services/email.py` — línea 61

**Problema:**
```python
reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
```
La ruta real del frontend es `/password-reset` (confirmado en `frontend/src/app/password-reset/` y en `AuthContext.tsx` línea 41: `"/password-reset"` está en `PUBLIC_PATHS`). El email enviado lleva al usuario a `/reset-password` → 404 → redirige a `/login`. **El flujo de reset de contraseña está roto en producción.**

**Fix:**
```python
reset_url = f"{settings.FRONTEND_URL}/password-reset?token={token}"
```

---

### [4] No existe `settings/production.py`

**Archivo:** `backend/config/settings/` — solo existen `base.py` y `dev.py`

**Problema:**  
Sin un archivo de producción, si alguien despliega apuntando a `base.py` o sin `DJANGO_SETTINGS_MODULE`, Django usa los defaults base que incluyen:
- `DEBUG` no definido (error en runtime) o potencialmente `True`
- Cookies sin `Secure=True`
- Sin `SECURE_SSL_REDIRECT`

**Fix — crear `backend/config/settings/production.py`:**
```python
from .base import *  # noqa

DEBUG = False

SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True

X_FRAME_OPTIONS = "DENY"

ALLOWED_HOSTS = config("ALLOWED_HOSTS", cast=Csv())  # sin default

# Logging estructurado para producción
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "root": {"handlers": ["console"], "level": "WARNING"},
}
```

---

### [5] `CookieTokenRefreshView` sin throttling

**Archivo:** `backend/apps/users/views.py` — línea 103

**Problema:**
```python
class CookieTokenRefreshView(APIView):
    permission_classes = [AllowAny]
    # Sin throttle_classes
    def post(self, request): ...
```
`AllowAny` + sin throttle = fuerza bruta ilimitada del endpoint de refresh. Un atacante puede intentar rotar refresh tokens sin límite.

**Fix:**
```python
class CookieTokenRefreshView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonAuthThrottle]

    def post(self, request): ...
```

---

## 🟠 ALTO

---

### [6] `ProfileStatsView` llama a la API de Stripe en cada GET

**Archivo:** `backend/apps/users/views.py` — líneas 544-560

**Problema:**
```python
def get(self, request):
    ...
    if plan and plan.stripe_subscription_id and django_settings.STRIPE_SECRET_KEY:
        try:
            import stripe as stripe_lib
            stripe_lib.api_key = django_settings.STRIPE_SECRET_KEY
            sub = stripe_lib.Subscription.retrieve(plan.stripe_subscription_id)
            ...
        except Exception:
            pass  # Stripe unavailable — silencia TODOS los errores
```
Cada vez que el usuario abre su perfil hace una llamada HTTP síncrona a Stripe. Problemas:
- Añade 200-500ms de latencia a cada request
- Consume cuota de la API de Stripe innecesariamente
- `except Exception: pass` silencia errores reales
- Si Stripe está caído, el endpoint falla silenciosamente

**Fix:** Mover la sincronización de Stripe a un Celery task periódico (ej. cada hora o por webhook). El endpoint solo lee de la DB local.

---

### [7] `stripe.api_key` asignado globalmente en cada request

**Archivos:** `backend/apps/billing/views.py` — líneas 89, 154, 198, 245

**Problema:**
```python
def post(self, request):
    stripe.api_key = settings.STRIPE_SECRET_KEY  # global del módulo, se sobreescribe por cada request
    ...
```
`stripe.api_key` es una variable global del módulo `stripe`. En entornos con workers concurrentes (Gunicorn multi-worker, uvicorn), asignarlo en cada request puede causar race conditions donde un worker sobreescribe la key de otro.

**Fix:** Configurarlo una sola vez en `backend/apps/billing/apps.py`:
```python
class BillingConfig(AppConfig):
    name = "apps.billing"

    def ready(self):
        import stripe
        from django.conf import settings
        stripe.api_key = settings.STRIPE_SECRET_KEY
```
Y eliminar todas las asignaciones `stripe.api_key = ...` de las vistas.

---

### [8] Closure async definida dentro de un loop en `tasks.py`

**Archivo:** `backend/apps/generation/tasks.py` — líneas 115-127

**Problema:**
```python
for file_path in files:
    file_raw = ""

    async def collect_file():
        nonlocal file_raw, total_input_tokens, total_output_tokens
        async for chunk in provider.stream_generate(
            file_messages, model=model, max_tokens=file_max_tokens
        ):
            if chunk.get("type") == "text":
                file_raw += chunk.get("content", "")
            elif chunk.get("type") == "usage":
                ...

    run(collect_file())
```
Definir funciones async dentro de un loop con `nonlocal` es un antipatrón. Las variables se capturan por referencia al scope del loop. Funciona ahora porque `file_raw` se reinicia a `""` en cada iteración, pero es frágil: si se reorganiza el código el bug es silencioso.

**Fix — extraer como función independiente:**
```python
async def collect_file_chunks(provider, file_messages, model, file_max_tokens):
    file_raw = ""
    input_tokens = 0
    output_tokens = 0
    async for chunk in provider.stream_generate(file_messages, model=model, max_tokens=file_max_tokens):
        if chunk.get("type") == "text":
            file_raw += chunk.get("content", "")
        elif chunk.get("type") == "usage":
            u = chunk.get("usage", {})
            input_tokens += u.get("inputTokens", 0)
            output_tokens += u.get("outputTokens", 0)
    return file_raw, input_tokens, output_tokens

# En el loop:
for file_path in files:
    file_raw, in_tok, out_tok = run(collect_file_chunks(provider, file_messages, model, file_max_tokens))
    total_input_tokens += in_tok
    total_output_tokens += out_tok
```

---

### [9] Imports dentro de métodos/funciones — señal de dependencias circulares

**Archivos y líneas:**
- `backend/apps/users/views.py:509-514` — `ProfileStatsView.get()` importa de `apps.projects`, `apps.generation`, `apps.billing`
- `backend/apps/billing/views.py:326-327` — `_handle_subscription_change()` importa `datetime` dentro del método
- `backend/apps/generation/views.py:254` — `from .models import Generation` dentro de una función
- `backend/apps/generation/views.py:329` — otro import local
- `backend/apps/generation/services.py:435` — `from .tasks import run_background_generation`

**Problema:** Los imports de `datetime` o modelos dentro de funciones son simplemente mal estilo. Los que importan entre apps (users → projects → generation → billing) revelan acoplamiento excesivo entre las apps.

**Fix:**
- Mover todos los imports de `datetime`, modelos propios y librerías externas al nivel del módulo.
- El caso `services.py:435` (import circular de tasks) es legítimo para evitar circular import, documentarlo claramente.
- La vista `ProfileStatsView` debería usar un servicio centralizado en lugar de importar directamente de otras apps.

---

### [10] `_save_generation()` hace `save()` completo sin `update_fields`

**Archivo:** `backend/apps/generation/services.py` — líneas 496-498

**Problema:**
```python
@sync_to_async
def _save_generation(generation):
    generation.save()  # UPDATE de TODOS los campos
```
Se llama múltiples veces durante el streaming (al cambiar status, al finalizar). Cada llamada hace un `UPDATE` completo incluyendo `file_map_snapshot`, `chat_history_cache` y `result_file_map`, que pueden contener megabytes de JSON.

**Fix — rastrear los campos modificados o usar `update_fields` explícito:**
```python
@sync_to_async
def _save_generation(generation, fields=None):
    if fields:
        generation.save(update_fields=fields)
    else:
        generation.save()
```
Y en los llamadores:
```python
generation.status = "streaming"
await _save_generation(generation, fields=["status"])

generation.status = "completed"
generation.completed_at = now()
await _save_generation(generation, fields=["status", "completed_at"])
```

---

### [11] Default de 500 KB en `ProjectDetailSerializer.validate_file_map` inconsistente

**Archivo:** `backend/apps/projects/serializers.py` — línea 63

**Problema:**
```python
def validate_file_map(self, value):
    ...
    max_kb = 500  # default  ← pero el plan free tiene 200 KB
    if request and hasattr(request.user, "plan"):
        plan_type = request.user.plan.plan_type
        max_kb = PLAN_DEFINITIONS.get(plan_type, {}).get("max_file_map_kb", 500)
```
Si el usuario no tiene plan (`hasattr` falla) o el plan_type no está en `PLAN_DEFINITIONS`, se aplica el límite de 500 KB (premium) a un usuario free.

**Fix:**
```python
from apps.billing.plans import PLAN_DEFINITIONS

max_kb = PLAN_DEFINITIONS["free"]["max_file_map_kb"]  # 200 KB como default seguro
if request and hasattr(request.user, "plan"):
    plan_type = getattr(request.user.plan, "plan_type", "free")
    max_kb = PLAN_DEFINITIONS.get(plan_type, PLAN_DEFINITIONS["free"]).get("max_file_map_kb", 200)
```

---

### [12] Sin rate limiting en endpoints autenticados críticos

**Problema:** Las siguientes vistas no tienen `throttle_classes`:
- `MeView` (`GET /api/auth/me/`) — llamada en cada carga de página
- `ProfileStatsView` (`GET /api/auth/profile-stats/`) — hace llamada a Stripe
- `ProjectListCreateView` (`GET/POST /api/projects/`)
- `ChatMessageListView` (`GET /api/projects/{id}/messages/`)
- `BalanceView` (`GET /api/billing/balance/`)

**Fix — añadir en `base.py`:**
```python
REST_FRAMEWORK = {
    ...
    "DEFAULT_THROTTLE_RATES": {
        "anon_auth": "10/min",
        "resend_email": "3/min",
        "user": "200/min",       # autenticados general
        "user_heavy": "30/min",  # endpoints costosos (profile-stats, generate)
    },
}
```
Y en cada vista costosa:
```python
from rest_framework.throttling import UserRateThrottle

class HeavyUserThrottle(UserRateThrottle):
    scope = "user_heavy"

class ProfileStatsView(APIView):
    throttle_classes = [HeavyUserThrottle]
    ...
```

---

## 🟡 MEDIO

---

### [13] `import json` dentro de property en `Project`

**Archivo:** `backend/apps/projects/models.py` — líneas 32-34

**Problema:**
```python
@property
def file_map_size_kb(self):
    import json  # re-importado en cada acceso
    return len(json.dumps(self.file_map).encode("utf-8")) / 1024
```

**Fix:**
```python
import json  # al nivel del módulo

@property
def file_map_size_kb(self):
    return len(json.dumps(self.file_map).encode("utf-8")) / 1024
```

---

### [14] Duplicación entre `stream_generation` y `stream_phased_generation`

**Archivo:** `backend/apps/generation/services.py` — líneas 63-160 y 227-477

Ambas funciones repiten:
1. Pre-check de créditos (líneas 80-83 / 241-243)
2. Serialización de `file_map` (líneas 86-92 / 247-253)
3. Creación del registro `Generation` (líneas 98 / 259)
4. Envío del `generation_id` al frontend (líneas 101 / 260)
5. Cambio de status a "streaming" (líneas 104-105 / 261-262)

**Fix:** Extraer un helper `_setup_generation_stream()` que devuelva `(generation, file_map, current_project)` y sea llamado por ambas funciones.

---

### [15] `get_provider()` usa if/elif — difícil de extender

**Archivo:** `backend/apps/generation/services.py` — líneas 22-37

**Problema:**
```python
def get_provider(model: str = "gpt-5.4"):
    config = get_model_config(model)
    provider_name = config["provider"]
    if provider_name == "openai":
        from .providers.openai import OpenAIProvider
        return OpenAIProvider()
    elif provider_name == "anthropic":
        from .providers.anthropic import AnthropicProvider
        return AnthropicProvider()
    elif provider_name == "gemini":
        from .providers.gemini import GeminiProvider
        return GeminiProvider()
    else:
        raise ValueError(f"Unknown provider: {provider_name}")
```

**Fix — usar un registry dict en `registry.py`:**
```python
# En providers/registry.py
def get_provider_class(provider_name: str):
    from .openai import OpenAIProvider
    from .anthropic import AnthropicProvider
    from .gemini import GeminiProvider
    PROVIDER_MAP = {
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
        "gemini": GeminiProvider,
    }
    cls = PROVIDER_MAP.get(provider_name)
    if cls is None:
        raise ValueError(f"Unknown provider: {provider_name}")
    return cls()
```

---

### [16] `AuthContext.init()` — llamadas API secuenciales

**Archivo:** `frontend/src/context/AuthContext.tsx` — líneas 81-94

**Problema:**
```typescript
async function init() {
    const userData = await apiGet<User>("/auth/me/");   // espera...
    setUser(userData);
    refreshBalance();  // no se awaita — pero tampoco se maneja el error si me/ falló
}
```
Si `/auth/me/` falla, `refreshBalance()` puede intentar llamar a `/billing/balance/` sin sesión, causando un 401 que se silencia.

**Fix:**
```typescript
async function init() {
    try {
        const [userData, balanceData] = await Promise.all([
            apiGet<User>("/auth/me/"),
            apiGet<BalanceResponse>("/billing/balance/").catch(() => null),
        ]);
        setUser(userData);
        if (balanceData) {
            setBalance(balanceData.balance);
            setPlanType(balanceData.plan.plan_type);
        }
    } catch {
        setUser(null);
    } finally {
        setIsLoading(false);
    }
}
```

---

### [17] Sin límite de número de ítems en `chat_history`

**Archivo:** `backend/apps/generation/serializers.py` — líneas 9-13

**Problema:**
```python
chat_history = serializers.ListField(
    child=serializers.DictField(),
    required=False,
    default=list,
    # Sin max_length
)
```
Un usuario puede enviar 10.000 ítems con contenido mínimo para crear requests enormes y abusar del sistema.

**Fix:**
```python
chat_history = serializers.ListField(
    child=serializers.DictField(),
    required=False,
    default=list,
    max_length=100,  # máximo 100 mensajes de historial
)
```

---

### [18] Cero tests automatizados

**Problema:** No existe ningún directorio `tests/` en ninguna app del backend ni en el frontend. Para un sistema que maneja cobros reales con Stripe y créditos de IA, los flujos críticos sin test son:
- `consume_credits()` — FIFO deduction con `select_for_update`
- `upgrade_to_premium()` / `downgrade_to_free()` — cambios de plan
- `grant_monthly_credits()` — concurrencia
- Webhook de Stripe — `_handle_checkout_completed`, `_handle_invoice_paid`, `_handle_subscription_change`
- `check_daily_generate_limit()` — Redis throttle

**Fix mínimo sugerido — crear `backend/apps/billing/tests.py`:**
```python
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from .services import consume_credits, grant_monthly_credits, get_balance

User = get_user_model()

class CreditConsumptionTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="test@test.com", password="test1234")

    def test_consume_credits_fifo(self):
        grant_monthly_credits(self.user)
        balance_before = get_balance(self.user)
        consume_credits(self.user, Decimal("1.00"), description="test")
        balance_after = get_balance(self.user)
        self.assertEqual(balance_before - balance_after, Decimal("1.00"))

    def test_consume_more_than_balance_returns_false(self):
        result = consume_credits(self.user, Decimal("9999.00"), description="too much")
        self.assertFalse(result)
```

---

### [19] Credenciales hardcodeadas en `docker-compose.yml`

**Archivo:** `docker-compose.yml` — líneas 38-40 y 52-55

**Problema:**
```yaml
environment:
  - POSTGRES_PASSWORD=dokiflux
```
Si el repo es público o se comparte, las credenciales son visibles. Aunque son solo de desarrollo, es mejor práctica referenciarlas desde variables de entorno.

**Fix:**
```yaml
environment:
  - POSTGRES_DB=${POSTGRES_DB:-dokiflux}
  - POSTGRES_USER=${POSTGRES_USER:-dokiflux}
  - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-dokiflux}
```

---

## 🟢 BAJO — SEO y polish

---

### [20] Landing page es `"use client"` — impacta indexación SEO

**Archivo:** `frontend/src/app/page.tsx` — línea 1

**Problema:**
```typescript
"use client";
```
La landing entera es un Client Component por las animaciones de `framer-motion`. El contenido no se renderiza en el servidor → los crawlers pueden indexarlo tarde o no indexarlo bien.

**Fix:** Hacer `LandingPage` un Server Component y mover las animaciones a un componente hijo `"use client"`:
```typescript
// app/page.tsx — Server Component (sin "use client")
import { HeroSection } from "@/components/landing/HeroSection"; // "use client" solo aquí

export default function LandingPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <LandingNavbar />
            <HeroSection />
            {/* Secciones estáticas sin animación como Server Components */}
        </div>
    );
}
```

---

### [21] Metadata incompleta en `layout.tsx`

**Archivo:** `frontend/src/app/layout.tsx` — líneas 17-20

**Problema:**
```typescript
export const metadata: Metadata = {
    title: "Dokiflux — AI UI Generator",
    description: "Generate React UI components with AI, powered by GPT-5.4",
};
```
Falta Open Graph, Twitter Cards, canonical y keywords.

**Fix:**
```typescript
export const metadata: Metadata = {
    title: {
        default: "Dokiflux — AI UI Generator",
        template: "%s | Dokiflux",
    },
    description: "Genera prototipos React funcionales con IA en segundos. De idea a prototipo con GPT-5.4, Claude y Gemini.",
    keywords: ["AI UI generator", "React prototyping", "generador de UI con IA", "prototipado rápido"],
    authors: [{ name: "Dokiflux" }],
    openGraph: {
        title: "Dokiflux — AI UI Generator",
        description: "Genera prototipos React funcionales con IA en segundos.",
        url: "https://dokiflux.com",
        siteName: "Dokiflux",
        type: "website",
        images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Dokiflux — AI UI Generator",
        description: "Genera prototipos React funcionales con IA en segundos.",
        images: ["/og-image.png"],
    },
    robots: {
        index: true,
        follow: true,
    },
};
```

---

### [22] Sin `robots.txt` ni `sitemap.xml`

**Problema:** No existe `public/robots.txt` ni generación de sitemap.

**Fix — crear `frontend/src/app/robots.ts`:**
```typescript
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: ["/", "/pricing", "/login", "/register"],
                disallow: ["/app/", "/onboarding/", "/api/"],
            },
        ],
        sitemap: "https://dokiflux.com/sitemap.xml",
    };
}
```

**Fix — crear `frontend/src/app/sitemap.ts`:**
```typescript
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        { url: "https://dokiflux.com", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
        { url: "https://dokiflux.com/pricing", lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
        { url: "https://dokiflux.com/login", lastModified: new Date(), changeFrequency: "yearly", priority: 0.5 },
        { url: "https://dokiflux.com/register", lastModified: new Date(), changeFrequency: "yearly", priority: 0.5 },
    ];
}
```

---

### [23] Páginas privadas sin `noindex`

**Problema:** Las rutas bajo `/app/*` y `/onboarding` pueden ser indexadas por Google si un usuario comparte un enlace o si el crawler llega a ellas.

**Fix — añadir en los layouts privados:**

`frontend/src/app/app/layout.tsx`:
```typescript
export const metadata = {
    robots: { index: false, follow: false },
};
```

`frontend/src/app/onboarding/page.tsx`:
```typescript
export const metadata = {
    robots: { index: false, follow: false },
};
```

---

## Notas adicionales de arquitectura

### Sobre el modelo `Generation` y almacenamiento de datos grandes
Los campos `file_map_snapshot`, `chat_history_cache` y `result_file_map` en el modelo `Generation` pueden contener megabytes de datos JSON para proyectos grandes. A largo plazo, considerar almacenar estos datos en S3 (el modelo ya tiene el campo `file_map_url` preparado para ello). Esto reduciría el tamaño de la base de datos y mejoraría el rendimiento de las queries.

### Sobre la autenticación async (`AsyncJWTAuthMiddleware`)
El middleware en `backend/apps/generation/middleware.py` es una solución correcta y bien implementada para el problema de autenticación en vistas async. No requiere cambios de comportamiento, pero podría beneficiarse de una prueba de integración.

### Sobre el rol `"developer"` en `build_messages()`
El rol `"developer"` (línea 49 en `services.py`) es específico de la API de OpenAI Responses. Los providers de Anthropic y Gemini lo filtran en sus implementaciones. No es un bug activo, pero a medida que se añadan más providers, esta inconsistencia podría causar problemas. Considerar usar `"system"` con adaptación por provider.

### Sobre la arquitectura de `ProfileStatsView`
Esta vista importa directamente de 4 apps diferentes (`projects`, `generation`, `billing`, `users`). Es una señal de que necesita un servicio transversal o un endpoint dedicado de "resumen de cuenta". Considerar crear `backend/apps/users/services/stats.py` que centralice toda esta lógica.
