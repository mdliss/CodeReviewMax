# CodeReviewMax – AI-Powered Inline Code Review

CodeReviewMax is a standalone React + Vite experience that delivers “inline GitHub comments × AI assistant.” Paste or edit code, select a block, and spin up threaded AI conversations that stay visually anchored to those lines via Monaco decorations and inline cards.

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+

### Local development

```bash
npm install               # install dependencies
npm run dev               # start Vite (http://localhost:5173)
npm run build             # production build
npm run preview           # serve the production build
```

### Docker

From the repository root:

```bash
# Production-like build served via Nginx on http://localhost:8080
docker compose up --build

# Dev server with HMR on http://localhost:5173
docker compose -f docker-compose.dev.yml up
```

## Key Features

- **Monaco editor with inline anchors** — Syntax highlighting, read-only toggle, persistent gutter pins, and inline cards showing the latest AI reply per thread.
- **Selection-based AI workflow** — `Ask AI` activates only when a code selection exists. Prompts include the snippet + surrounding context so responses stay grounded.
- **Thread panel + inline previews** — Manage every conversation from the sidebar or by clicking glyphs/keyboard shortcuts inside the editor.
- **State persistence** — Code, threads, and highlights survive refresh via Zustand’s `persist` middleware (localStorage).
- **Mock or real AI** — Ships in mock mode for easy demos; swap in your API key to hit OpenAI/other providers.

## Architecture Overview

| Concern | Implementation |
| --- | --- |
| UI shell | React 18 + Vite, Tailwind-inspired theme (`src/App.jsx`, `src/styles`) |
| Editor | `@monaco-editor/react` (`src/components/CodeEditor.jsx`) with custom decorations, glyph handling, inline content widgets |
| State | Zustand store (`src/store/useEditorStore.js`) for code, selection, threads, UI flags, persisted via `persist()` |
| AI service | `src/services/aiService.js` builds prompts, caches responses, and runs in mock mode unless API keys are provided |
| Threads UI | `src/components/AIButton.jsx`, `ThreadIndicator.jsx`, and inline cards rendered as Monaco widgets |
| Styling | Tailwind config + custom CSS for editor overlays (`src/styles/editor.css`, `src/index.css`) |

### Data flow

1. User selects text → Monaco fires `onDidChangeCursorSelection`.
2. Selection stored in Zustand and highlighted via Monaco decorations.
3. `Ask AI` creates a thread, calls `queryAI(selection, code, question)`.
4. AI response appended to the same thread; Thread panel + inline card update automatically.
5. Threads persist across sessions; clicking a glyph re-opens the inline card and focuses the sidebar thread.

## Configuring Real AI Providers

`src/services/aiService.js` runs in mock mode by default. To call a real API:

1. Set `MOCK_MODE = false`.
2. Create a `.env` file with `VITE_OPENAI_API_KEY=<your key>` (or replace the fetch endpoint with another provider).
3. Restart `npm run dev`.

> Tip: keep keys out of git. For production, route requests through a backend so API secrets stay server-side.

## Testing & Verification

- `npm run build` — Ensures the project compiles (already used as a smoke test).
- Manual rubric pass: see Task Master checklist (Task 14) for end-to-end steps covering editor behavior, AI context, inline threads, and UX polish.

## How We Used AI

- Rapid iteration on UX copy and Tailwind styling.
- Brainstormed the inline card interaction pattern and debugging for Monaco decorations.
- Mock response phrasing + documentation outlines.

Every AI-assisted change was reviewed locally (build/test) before committing.

## Trade-offs & Future Work

1. **Line drift:** Editing code above an existing thread doesn’t rebase its range. Future: track ranges via Monaco edits or AST anchors.
2. **Single-file scope:** No file tree yet; multi-file support would require a different state model.
3. **Mock AI by default:** Keeps setup simple but hides latency behavior. Add provider toggles & streaming when API keys are configured.
4. **Persistence limitations:** localStorage works for MVP; real deployments should sync to a backend with auth.
5. **Accessibility:** Inline cards expose keyboard shortcuts but still need full ARIA auditing.

## Contributing

1. Fork/branch from `main`.
2. Run `npm run dev`, make changes.
3. Ensure `npm run build` passes.
4. Submit a PR referencing the relevant Task Master task IDs (e.g., “Task 11 – inline anchors”).

---

Need something else? Check `PRD.md` for the full product spec or `tasks.md`/Task Master for the live implementation backlog.
