# Dokiflux — Generador de UI con IA

Genera proyectos completos de React a partir de prompts en lenguaje natural, impulsado por GPT-5.4. Un generador de UI de código abierto al estilo v0.dev con vista previa en el navegador mediante WebContainers.

## Características

- **Generación de código con IA** — Describe una UI y obtén un proyecto completo de React + Tailwind con múltiples archivos
- **Modo dual (Chat + Código)** — La IA conversa para aclarar tu solicitud y luego genera código cuando está lista
- **Vista previa en vivo** — WebContainers ejecutan un servidor de desarrollo completo de Vite en el navegador, sin necesidad de backend
- **Vista de código en streaming** — Observa cómo se genera el código archivo por archivo en un visor en tiempo real tipo IDE
- **Iteración a nivel de archivo** — Itera sobre proyectos existentes sin regenerarlo todo; solo se devuelven los archivos modificados
- **Proyectos multiarchivo** — Compatible con marcadores `// --- FILE:` y `// --- DELETE:` para una salida estructurada del proyecto
- **Estimación previa de coste** — Consulta un rango estimado de coste antes de generar (basado en tokenización)
- **Seguimiento de tokens** — Tokens de entrada/salida y coste por generación, además de estadísticas acumuladas de la sesión
- **Corrección automática de errores de compilación** — Detecta errores de compilación en WebContainer y vuelve a intentarlo automáticamente (hasta 3 intentos)
- **Descargar como ZIP** — Exporta el proyecto generado como una plantilla Vite + React lista para ejecutar
- **Adaptado a móviles** — Vistas conmutables de Chat/Vista previa en móvil con detección de iOS Safari
- **Navegación por URL** — Barra de URL integrada con atrás/adelante/recargar para apps multipágina (`react-router-dom`)
- **Cancelar generación** — Detén al instante cualquier generación en curso

## Stack

- **Next.js 16** (App Router, React 19)
- **Tailwind CSS v4** + **shadcn/ui**
- **WebContainers** + **Vite** (vista previa de React en el navegador con instalación completa de npm)
- **OpenAI GPT-5.4** (Responses API con streaming + llamadas a funciones)
- **react-markdown** (renderizado de mensajes del chat)
- **gpt-tokenizer** (conteo de tokens del lado del cliente para estimación de costes)
- **JSZip** (descarga del proyecto)
- **Docker** (compilación multietapa: desarrollo + producción)

## Cómo funciona

```text
Prompt del usuario
    │
    ▼
┌─────────────────────────────┐
│  API de Responses de GPT-5.4│
│ (streaming + llamada a función) │
└──────────┬──────────────────┘
           │
     ┌─────┴─────┐
     │           │
   Chat       Código
  (texto)   (herramienta generate_ui)
     │           │
     ▼           ▼
 Markdown    Analiza la salida multiarchivo
 en el chat  (marcadores // --- FILE:)
             Fusiona con archivos existentes
             (iteración a nivel de archivo)
                   │
                   ▼
           ┌───────────────┐
           │ WebContainer  │
           │ monta archivos → │
           │ npm install → │
           │ vite dev      │
           └───────┬───────┘
                   │
                   ▼
             Vista previa en vivo
                en iframe
```

**Flujo de iteración:** En los prompts posteriores, el estado actual del proyecto se serializa y se envía como contexto. La IA devuelve solo los archivos nuevos o modificados, que se fusionan del lado del cliente. Esto reduce drásticamente el uso de tokens en proyectos grandes.

## Inicio rápido

### 1. Clona y configura

```bash
cp .env.example .env
# Edita .env y añade tu clave de API de OpenAI
```

### 2. Ejecuta con Docker

```bash
docker compose up --build
```

### 3. Ejecuta sin Docker

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Precios de GPT-5.4

| | Precio por 1M de tokens |
|--|--|
| Entrada | $2.50 |
| Salida | $15.00 |

- **Máximo de tokens de salida por generación:** 31,000
- **Primera generación típica** (~500 de entrada + ~2,000 de salida): **~$0.031**
- **Iteración típica** (~5,000 de entrada + ~1,000 de salida): **~$0.028**
- La estimación de coste previa a la generación se muestra en la barra de entrada (impulsada por `gpt-tokenizer`)

## Estructura del proyecto

```text
src/
├── app/
│   ├── api/
│   │   ├── generate/route.ts    # API de streaming → GPT-5.4 (SSE + llamadas a funciones)
│   │   └── estimate/route.ts    # Endpoint de estimación de coste previa a la generación
│   ├── generate/page.tsx        # UI principal (chat + vista previa, móvil/escritorio)
│   ├── layout.tsx
│   └── page.tsx                 # Redirige a /generate
├── components/
│   ├── ChatPanel.tsx            # Lista de mensajes con renderizado markdown
│   ├── PromptInput.tsx          # Área de texto de entrada con insignia de estimación de coste
│   ├── CodePreview.tsx          # Vista previa de WebContainer + visor de código + logs
│   ├── StreamingFileView.tsx    # Vista de streaming de código archivo por archivo en tiempo real
│   ├── TokenUsage.tsx           # Insignias de tokens/coste + barra de estadísticas de sesión
│   └── ui/                      # Primitivas de shadcn/ui (button, badge, card, etc.)
├── hooks/
│   ├── useWebContainer.ts       # Ciclo de vida de WebContainer (inicio → instalación → servidor de desarrollo)
│   └── useIsMobile.ts           # Hooks de detección de móvil + iOS
├── lib/
│   ├── openai.ts                # Singleton del cliente de OpenAI
│   ├── prompts.ts               # Prompt del sistema + reglas de generación de código (diseño, iteración, etc.)
│   ├── parser.ts                # Parser multiarchivo (marcadores FILE/DELETE) + lógica de fusión
│   ├── pricing.ts               # Calculadora de coste por tokens + heurísticas de estimación
│   └── utils.ts                 # Utilidades de shadcn
└── types/
    └── index.ts                 # Tipos de TypeScript (Message, SessionStats, StreamChunk, etc.)
```