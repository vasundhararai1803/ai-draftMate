# DraftMate AI Editor

An intelligent writing assistant that integrates AI-powered text editing capabilities directly into your editor. DraftMate helps you refine, simplify, and improve your writing with precision. Powered by Groq's fast inference API.

## Features

- **Simplify** — Explain concepts in plain, accessible language
- **Summarize** — Extract core meaning and key points concisely
- **Fix** — Correct grammar, punctuation, and phrasing
- **Improve** — Elevate clarity, vocabulary, and flow
- **Shorter** — Condense text while preserving meaning
- **Friendly** — Adopt a warm, conversational tone
- **Formal** — Use professional, executive language

## Prerequisites

1. **Groq API Key** — Sign up at [https://console.groq.com](https://console.groq.com) and get your free API key

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Add your Groq API key to .env.local
# GROQ_API_KEY=your_api_key_here

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the editor.

## Configuration

DraftMate is configured via environment variables in `.env.local`:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Get your API key from [Groq Console](https://console.groq.com). The free tier includes generous rate limits.

## API

**Endpoint:** `POST /api/ai`

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
- API key is stored server-side only, never exposed to client

Response: Streamed text from the Groq API.

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

### "The AI service is unavailable."

1. Verify your Groq API key is set in `.env.local`
2. Check that the key is valid at [Groq Console](https://console.groq.com)
3. Ensure you have API calls remaining (check quota)

### Model takes too long to respond

- Reduce the text length (max 8000 characters)
- Try again after a moment (rate limits)
- Check Groq Console for API usage

### Documents disappeared after refresh

Documents are stored in browser localStorage. If you:
- Clear browser data/cache → documents are lost
- Use private/incognito mode → documents aren't persisted

Use export or screenshots for important work, or store content elsewhere.

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with Turbopack
- **AI**: Groq API (openai/gpt-oss-120b model)
- **Client State**: React hooks with localStorage persistence
- **Validation**: Simple type-safe checks (no external validators)

## Data and Privacy

✅ **Your text stays private:**
- Text is sent **only** to Groq's API servers
- API key is stored server-side only in `.env.local` (never exposed to client)
- Documents are stored in your browser's localStorage
- No local Ollama server required
- No data sent to other external services

## Deployment

DraftMate works on any Node.js hosting platform (Vercel, Railway, Heroku, etc.):

1. Set `GROQ_API_KEY` in your platform's environment variables
2. Deploy as usual
3. The API key is automatically used on the server

Example for Vercel:
```bash
vercel env add GROQ_API_KEY
# Paste your Groq API key when prompted
vercel deploy
```

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
- API key is stored server-side only, never sent to the client
