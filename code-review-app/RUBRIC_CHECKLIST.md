# Rubric Compliance Checklist & Test Plan

This document lets us prove every requirement in `../rubric.md` is satisfied. Each item lists the expected behavior, how to verify it, and where it lives in the codebase.

## 1. Working Application

| Requirement | Verification Steps | Status |
| --- | --- | --- |
| Paste or write code in an editor | Open http://localhost:5173, paste a large snippet into Monaco (enabled when Edit Mode is on). The editor renders syntax highlighting immediately. | ✅ |
| Select specific lines | Drag-select any lines; selection pill in the header updates with character count. Monaco selection data stored in Zustand (`src/components/CodeEditor.jsx`). | ✅ |
| Request AI feedback on a selection | With code selected, `Ask AI` button becomes active. Clicking it opens the modal and posts the prompt to `queryAI`. | ✅ |
| Receive contextual suggestions (selected snippet + surrounding context) | Run `npm run dev`, inspect network console or mock output. Service packages snippet + ±5 surrounding lines (`src/services/aiService.js#createAIRequest`). AI replies reflect local identifiers. | ✅ |
| Maintain iterative threads tied to code sections | Each `Ask AI` call creates a thread with start/end line metadata. Thread sidebar + inline cards show the history; replying in the sidebar appends messages to the same thread. | ✅ |
| Multiple independent threads | Create threads on non-overlapping ranges; sidebar shows each with counts, inline glyph per range. No collision. | ✅ |

## 2. Core Requirements

| Requirement | Implementation Reference | How to Test |
| --- | --- | --- |
| Code editor interface w/ syntax highlighting | `src/components/CodeEditor.jsx` uses `@monaco-editor/react`. | Change theme toggle, paste various languages; highlight colors change accordingly. |
| Selection-based interaction | Zustand `currentSelection`; `AIButton` disables when `selection.isEmpty`. | Try clicking Ask AI with no selection (toast appears). |
| Contextual AI responses | `createAIRequest()` bundles selection + context and indicates language. | Inspect mock response; verify snippet-specific hints. |
| Inline conversation threads visually tied to code | Thread decorations + inline cards (`src/components/CodeEditor.jsx`, `src/styles/editor.css`). | Create two threads, confirm gutter pins + inline cards appear on matching lines. |
| Multiple independent threads | Zustand `threads[]`; sidebar and inline cards iterate over them. | Add threads on lines 5–8 and 20–25, open each via glyph. |

## 3. Technical Execution Highlights

| Area | Notes |
| --- | --- |
| Architecture | React + Zustand + Monaco + Tailwind; see README “Architecture Overview”. |
| State management | `src/store/useEditorStore.js` persists code, threads, highlights. |
| AI integration | `src/services/aiService.js` (mock by default). Supports caching, error handling, timeouts. |
| Inline UX | Inline cards via Monaco content widgets; keyboard shortcuts (Cmd/Ctrl+Alt+↑/↓) navigate threads. |

## 4. Documentation Deliverable

| Requirement | Files | Status |
| --- | --- | --- |
| “Brief documentation (README)” covering run instructions, architecture, improvements, AI usage, trade-offs | `code-review-app/README.md` | ✅ |

## 5. Test Plan

### Manual Smoke Tests
1. `npm run dev` → load http://localhost:5173.
2. Paste 200+ lines of code.
3. Toggle Edit Mode off/on (read-only enforcement works).
4. Select lines 10–20, click Ask AI, enter prompt. Verify new thread appears in sidebar with AI response.
5. Click gutter glyph; inline card opens showing latest AI reply. Close card, re-open via another glyph.
6. Reply from sidebar; conversation scrolls to newest message.
7. Refresh page; thread list + inline pins persist (localStorage).
8. Run `npm run build` to ensure production build passes.

### Optional Automated Checks
- `npm run build` (already part of CI; ensures no type/compile errors).
- Future: add Playwright scenario to drive the flow above (not yet implemented).

## 6. Open Risks / Future Enhancements

- Editing code above an existing thread does not re-map ranges (documented in README trade-offs).
- Inline cards currently single-instance (one open at a time) to keep UX focused.
- Mock AI default: real provider testing requires API keys.

With this checklist, we can demonstrate every rubric bullet is met and explain remaining trade-offs. Update this file whenever major functionality shifts.***
