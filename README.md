# Dokiflux — AI UI Generator

Generate React UI components from natural language prompts, powered by GPT-5.4. A basic v0.dev clone.

## Features

- **AI Code Generation** — Describe a UI, get React + Tailwind code
- **Live Preview** — Sandpack renders the generated code in-browser
- **Streaming** — Watch code generate token by token via SSE
- **Token Tracking** — See input/output tokens and cost per generation
- **Session Stats** — Cumulative cost tracking for your session

## Stack

- **Next.js 15** (App Router)
- **Tailwind CSS** + **shadcn/ui**
- **Sandpack** (in-browser React preview)
- **OpenAI GPT-5.4** (Responses API with streaming)
- **Docker**

## Quick Start

### 1. Clone and configure

```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

### 2. Run with Docker

```bash
docker compose up --build
```

### 3. Run without Docker

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## GPT-5.4 Pricing

| | Price per 1M tokens |
|--|--|
| Input | $2.50 |
| Output | $15.00 |
| **Typical generation** (~500 in + ~2000 out) | **~$0.031** |

## Project Structure

```
src/
├── app/
│   ├── api/generate/route.ts   # Streaming API → GPT-5.4
│   ├── generate/page.tsx        # Main UI (chat + preview)
│   ├── layout.tsx
│   └── page.tsx                 # Redirects to /generate
├── components/
│   ├── ChatPanel.tsx            # Message list
│   ├── PromptInput.tsx          # Input textarea
│   ├── CodePreview.tsx          # Sandpack wrapper
│   └── TokenUsage.tsx           # Cost badges
├── lib/
│   ├── openai.ts                # OpenAI client
│   ├── prompts.ts               # System prompt
│   ├── pricing.ts               # Token cost calculator
│   └── utils.ts                 # shadcn utils
└── types/
    └── index.ts                 # TypeScript types
```
