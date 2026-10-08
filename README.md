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

## Prerequisites

Before getting started, make sure you have:

1. **Ollama installed** — Download from [https://ollama.com](https://ollama.com)
2. **llama3.2 model** — Run: `ollama pull llama3.2`
3. **Ollama running** — Start the server: `ollama serve`

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the editor.

## Configuration

DraftMate is configured via environment variables in `.env.local`:

```env
OLLAMA_BASE_URL=http://localhost:11434  # Ollama server address
AI_MODEL=llama3.2                        # LLM model to use
```

Both have sensible defaults, so you don't need to set them unless your Ollama server is running elsewhere.

## API

**POST** `/api/ai`

Request body:
```json
{
  "prompt": "text to process (1-8000 characters)",
  "action": "simplify|summarize|fix|improve|shorter|friendly|formal"
}
```

The request is validated server-side:
- `action` must be one of the 7 allowed values
- `prompt` must be a non-empty string, max 8000 characters
- Invalid requests return 400 with a clear error message

Response: Streamed text from the LLM.

## Features

### Document Management
- **Create** new documents from the sidebar
- **Rename** documents by clicking the title
- **Favorite** documents for quick access
- **Auto-save** to browser localStorage (survives refresh)
- **Recent** filter shows documents edited within 7 days
- **Favorites** filter shows starred documents

### AI Actions
- Select action buttons in the toolbar or quick prompts panel
- Highlight text to process only the selection
- Click without selection to process the entire document
- "Improve all" replaces the document; other actions append suggestions
- Stop button halts long-running generations

### Text Editing
- Bold, italic, underline formatting
- Heading 1 & 2 support
- Bulleted list formatting
- Font switching (Arial, Georgia, or Inter)
- Word count display

## Troubleshooting

### "The AI service is unavailable. Is Ollama running?"

1. Start Ollama: `ollama serve`
2. Verify `OLLAMA_BASE_URL` in `.env.local` matches your Ollama server
3. Check that the model is installed: `ollama list`

### Model takes too long to respond

- Reduce the text length (max 8000 characters)
- Check your system resources (CPU/RAM)
- Try a faster model: `ollama pull phi` (smaller, faster)
- Edit `.env.local` to set `AI_MODEL=phi`

### Documents disappeared after refresh

Documents are stored in browser localStorage. If you:
- Clear browser data/cache → documents are lost
- Use private/incognito mode → documents aren't persisted

Use export or screenshots for important work, or store content elsewhere.

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with Turbopack
- **AI**: Ollama (local LLM inference)
- **Client State**: React hooks with localStorage persistence
- **Validation**: Simple type-safe checks (no external validators)

## Data and Privacy

✅ **Your text stays private:**
- Text is sent **only** to the Ollama server specified in `OLLAMA_BASE_URL`
- Default is `http://localhost:11434` (your local machine)
- No data sent to external services
- Documents are stored in your browser's localStorage
- No cloud sync or telemetry

## Development

```bash
# Run linter
npm run lint

# Type check
npx tsc --noEmit

# Production build
npm run build

# Start production server
npm run start
```

## Security Notes

- The API validates all input to prevent prompt injection
- Prototype pollution attacks are blocked (e.g., `action: "constructor"`)
- Text is wrapped in delimiters to prevent accidental instruction following
- The system prompt explicitly instructs the model to ignore nested instructions
