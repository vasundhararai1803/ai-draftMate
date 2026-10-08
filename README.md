# DraftMate AI Editor

An intelligent writing assistant that integrates AI-powered text editing capabilities directly into your editor. DraftMate helps you refine, simplify, and improve your writing with precision.

## Features

- **Simplify** — Explain concepts in plain, accessible language
- **Summarize** — Extract core meaning and key points concisely
- **Fix** — Correct grammar, punctuation, and phrasing
- **Improve** — Elevate clarity, vocabulary, and flow
- **Shorter** — Condense text while preserving meaning
- **Friendly** — Adopt a warm, conversational tone
- **Formal** — Use professional, executive language

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the editor.

## API

**POST** `/api/ai`

Request body:
```json
{
  "prompt": "text to process (1-8000 chars)",
  "action": "simplify|summarize|fix|improve|shorter|friendly|formal"
}
```

Response: Streamed text from the AI model.

## Tech Stack

- **Framework**: Next.js 16
- **Language**: TypeScript
- **AI**: Ollama (llama3.2)
- **Validation**: Zod
