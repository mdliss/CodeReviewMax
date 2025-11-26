# PRD.md

# AI-Powered Code Review Assistant MVP - Product Requirements Document

**Project**: AI Code Reviewer - "Inline GitHub Comments × ChatGPT"
**Goal**: Create a standalone editor interface where users can select code blocks and receive context-aware AI feedback, refactoring suggestions, and explanations in threaded conversations.

**Note**: Multi-user collaboration (real-time sockets) and persistent backend storage are excluded from the MVP. The focus is on the frontend interactions, state management, and AI context injection.

-----

## Core Architecture (MVP)

**Client-Side SPA:**

  - MVP features a React-based Single Page Application (SPA).
  - **No Backend Database** for MVP: State is managed locally (React Context/Zustand) and persisted via `localStorage` to allow page reloads.
  - **AI Integration**: Direct calls to OpenAI/Anthropic API (or a mock service) from the client (or via a simple Next.js API route to hide keys if using a framework).
  - Future: User Authentication and cloud database for saving review history.

**URL Structure:**

  - `/`: Main editor interface.
  - No dynamic routing required for MVP (single workspace).

-----

## User Stories

### Primary User: Software Developer (MVP Priority)

  - As a developer, I want to **paste my code into an editor** so that I can review it.
  - As a developer, I want to **highlight specific lines of code** so that I can target my question to that logic.
  - As a developer, I want to **click "Ask AI" on a selection** so that I can start a review thread.
  - As a developer, I want to **see the AI's response inline** (or visually connected to the code) so I don't lose context.
  - As a developer, I want to **manage multiple independent threads** on different parts of the file simultaneously.

-----

## Key Features for MVP

### 1\. Code Editor Interface

**Must Have:**

  - Syntax highlighting for major languages (JS, Python, TS).
  - Line numbers.
  - Ability to select text ranges (start line to end line).
  - Read-only mode vs. Edit mode toggle (optional, but Edit mode preferred for pasting).

**Specific Behavior Section:**

  - **Monaco Editor (VS Code core)** or **CodeMirror** is recommended.
  - The editor must broadcast selection events (`onDidChangeCursorSelection`) to the application state.

**Success Criteria:**

  - Pasting 500 lines of code renders instantly with coloring.
  - Selecting lines 10-15 accurately updates the internal "Current Selection" state.

### 2\. Contextual AI Interaction

**Must Have:**

  - A mechanism to package:
    1.  The selected code snippet.
    2.  The *surrounding* code (context window).
    3.  The user's prompt (e.g., "Optimize this").
  - Streaming responses (optional but nice) or loading states.

**Specific Behavior Section:**

  - When a user selects text, a floating "Ask AI" button or a sidebar action becomes active.
  - The prompt sent to the LLM must explicitly demarcate the selected code vs. the rest of the file.

**Success Criteria:**

  - AI response references the specific variables in the selected block.
  - Latency for response start is under 3 seconds (API dependent).

### 3\. Thread Management (State)

**Must Have:**

  - Ability to anchor a conversation to a specific line range (e.g., `lines 45-52`).
  - Visual indicator (gutter icon or highlight) showing where a thread exists.
  - Support for multiple overlapping or distinct threads.

**Success Criteria:**

  - User can have a thread on lines 10-20 and another on 50-60.
  - Clicking a thread indicator opens the correct chat history.

### 4\. Application State Persistence

**Must Have:**

  - Save current code and conversation threads to `localStorage`.
  - Restore state on page reload.

**Success Criteria:**

  - User refreshes page -\> Code and Comments are still there.

-----

## Data Model

### Local State Structure (Mock Database)

Since this is a standalone challenger project, we treat `localStorage` as our database.
``````json
{
  "fileContent": "const hello = () => { ... }",
  "language": "javascript",
  "threads": [
    {
      "id": "thread_123",
      "lineRange": { "start": 5, "end": 8 },
      "selectedCode": "...",
      "status": "open",
      "createdAt": "timestamp",
      "messages": [
        {
          "id": "msg_1",
          "role": "user",
          "content": "Is this efficient?"
        },
        {
          "id": "msg_2",
          "role": "assistant",
          "content": "It is O(n), but you could..."
        }
      ]
    }
  ]
}
``````

-----

## Proposed Tech Stack

### Recommended: React + Vite + Monaco Editor

**Frontend:**

  - **React**: Component architecture.
  - **Vite**: Fast build tool.
  - **Monaco Editor (@monaco-editor/react)**: Best-in-class code editing experience (used by VS Code).
  - **Tailwind CSS**: For rapid UI styling.
  - **Zustand**: Simple global state management for threads.

**AI Integration:**

  - **OpenAI SDK** (Client-side) OR a simple **Mock Service** (if API keys are not provided).

**Rationale:** Monaco handles the heavy lifting of line rendering and coordinates. React manages the UI overlay for comments.

-----

## Out of Scope for MVP

  - User Authentication (Hardcoded "User" is fine).
  - Backend Database (Postgres/Firebase).
  - Multi-file support (File tree navigation).
  - Git integration/Diff views.
  - Real-time collaboration (multiplayer cursors).

-----

## Success Metrics for MVP Checkpoint

1.  **Selection Accuracy**: Comments attach to the exact lines selected.
2.  **Context Injection**: AI answers are relevant to the specific code block.
3.  **Usability**: User can perform a full "Paste -\> Select -\> Ask -\> Read" loop without confusion.

-----

## Risk Mitigation

**Biggest Risk**: Editor Complexity (Mapping UI over canvas-based editors like Monaco).
**Mitigation**: Use a "Sidebar" approach for the chat instead of trying to render inline widgets *inside* the code lines if Monaco proves too difficult in the time limit.

**Second Risk**: State Desynchronization (Editing code shifts line numbers).
**Mitigation**: For MVP, lock the code to "Read Only" while a thread is active, OR simply accept that line numbers might drift if code is edited above them (document this limitation).

-----

## Phase 2: Enhanced AI & UX Features

This phase builds on the MVP foundation to deliver a more powerful and polished experience.

### 5. Streaming AI Responses

**Must Have:**
- Display AI responses as they stream in (token by token)
- Show typing indicator during generation
- Allow cancellation of in-progress responses

**Specific Behavior:**
- Use OpenAI's streaming API (`stream: true`)
- Buffer tokens and render incrementally
- "Stop generating" button appears during stream
- Gracefully handle stream interruptions

**Success Criteria:**
- First token appears within 500ms of request
- User perceives faster responses vs. waiting for full completion
- Cancelled responses save partial content to thread

### 6. Keyboard Shortcuts & Power User Features

**Must Have:**
- `Cmd/Ctrl+K` opens AI dialog (when code is selected)
- `Escape` closes modals and deselects active thread
- `Cmd/Ctrl+Enter` submits in any textarea
- `Cmd/Ctrl+Alt+Up/Down` navigates between threads (already implemented)

**Nice to Have:**
- `Cmd/Ctrl+Shift+A` auto-expands selection to logical boundary (function, block)
- `Cmd/Ctrl+/` toggles thread panel visibility
- Keyboard-navigable thread list (arrow keys + Enter)

**Success Criteria:**
- Power users can complete full workflow without mouse
- Shortcuts are discoverable (tooltip hints, help modal)

### 7. Smart Selection & Context Menu

**Must Have:**
- Right-click context menu on selected code with "Ask AI about this"
- Double-click to select word, triple-click for line (Monaco default)
- Selection indicator shows char/line count

**Nice to Have:**
- "Expand to function" button near selection
- Auto-detect and suggest reviewing entire function/class
- Highlight matching brackets/scope when selecting

**Specific Behavior:**
- Context menu appears at cursor position
- Menu items: "Ask AI", "Copy", "Expand Selection"
- If selection is inside a function, offer to expand to full function

**Success Criteria:**
- Context menu appears within 100ms of right-click
- Expand selection correctly identifies JS/TS/Python function boundaries

### 8. Thread Management Enhancements

**Must Have:**
- Filter threads by status (active/resolved/all)
- Search within thread content
- Bulk actions (resolve all, delete all resolved)
- Sort threads by date, line number, or message count

**Nice to Have:**
- Collapse/expand thread groups
- Pin important threads to top
- Thread labels/tags

**Data Model Addition:**
```json
{
  "threads": [{
    "id": "thread_123",
    "status": "active" | "resolved" | "archived",
    "tags": ["bug", "performance"],
    "isPinned": false
  }]
}
```

**Success Criteria:**
- Filter updates thread list instantly (<50ms)
- Search finds partial matches in questions and AI responses

-----

## Phase 3: Advanced AI Capabilities

### 9. Multiple AI Providers

**Must Have:**
- Support for OpenAI (GPT-4, GPT-4o-mini)
- Support for Anthropic Claude (claude-3-5-sonnet, claude-3-haiku)
- Provider selection dropdown in settings
- Graceful fallback if primary provider fails

**Nice to Have:**
- Local model support (Ollama)
- Custom API endpoint configuration
- Per-thread model selection

**Specific Behavior:**
- Settings panel with provider/model dropdowns
- API key input fields (stored in localStorage, warn about security)
- "Test Connection" button validates keys
- Model info tooltips (context window, cost tier)

**Data Model Addition:**
```json
{
  "settings": {
    "aiProvider": "openai" | "anthropic" | "ollama",
    "aiModel": "gpt-4o-mini",
    "apiKeys": {
      "openai": "sk-...",
      "anthropic": "sk-ant-..."
    },
    "fallbackProvider": "anthropic"
  }
}
```

**Success Criteria:**
- Switching providers mid-session works seamlessly
- API errors show provider-specific helpful messages
- Fallback activates automatically on provider failure

### 10. Specialized Review Modes

**Must Have:**
- General Review (default): Broad code quality feedback
- Security Review: Focus on vulnerabilities (OWASP Top 10, injection, auth issues)
- Performance Review: Focus on complexity, memory, efficiency
- Style Review: Focus on naming, structure, best practices

**Nice to Have:**
- Custom prompt templates users can create
- Language-specific modes (React patterns, Python idioms)
- Combine multiple modes in one review

**Specific Behavior:**
- Mode selector dropdown in AI dialog
- Each mode uses a specialized system prompt
- Mode icon displayed on threads to show review type
- Quick toggle buttons: 🔒 Security, ⚡ Performance, 🎨 Style

**System Prompt Examples:**

*Security Mode:*
```
You are a security-focused code reviewer. Analyze the selected code for:
- Injection vulnerabilities (SQL, XSS, command injection)
- Authentication/authorization flaws
- Sensitive data exposure
- Insecure configurations
Rate severity: Critical, High, Medium, Low, Info
```

*Performance Mode:*
```
You are a performance-focused code reviewer. Analyze for:
- Time complexity (Big O notation)
- Memory usage and potential leaks
- Unnecessary computations or re-renders
- Database query efficiency (N+1 problems)
Suggest concrete optimizations with expected impact.
```

**Success Criteria:**
- Security mode catches common vulnerabilities (SQL injection in example code)
- Performance mode correctly identifies O(n²) patterns
- Mode selection persists per session

### 11. Code Diff Suggestions

**Must Have:**
- AI can propose actual code changes, not just text descriptions
- Display proposed changes as inline diffs
- One-click "Apply" to accept suggestion
- "Reject" or "Ask for alternative"

**Specific Behavior:**
- AI returns structured response with `suggestedCode` field
- Diff view shows red (removed) and green (added) highlighting
- Apply button replaces selected code with suggestion
- Undo support (Cmd+Z reverts applied change)

**Response Format:**
```json
{
  "explanation": "This refactors the loop to use map() for better readability...",
  "suggestedCode": "const results = items.map(item => transform(item));",
  "confidence": 0.85,
  "breakingChange": false
}
```

**Success Criteria:**
- Diff renders correctly for multi-line changes
- Apply works without corrupting surrounding code
- Syntax highlighting preserved in diff view

### 12. Syntax-Aware Context

**Must Have:**
- Detect function/class boundaries around selection
- Include import statements in AI context
- Identify and include related code (called functions, used variables)

**Nice to Have:**
- Full AST parsing for accurate scope detection
- Type information from TypeScript
- Cross-file context (imported modules)

**Specific Behavior:**
- When user selects code inside a function, automatically include:
  - Function signature and full body
  - Imports used by the function
  - JSDoc/docstring if present
- Context window shows "Including context from lines X-Y"

**Success Criteria:**
- AI responses reference function parameters even if not in selection
- Import context helps AI suggest correct library usage
- Context doesn't exceed model token limits (truncate intelligently)

-----

## Phase 4: Thread Intelligence & Persistence

### 13. Thread Line Tracking (Drift Prevention)

**Must Have:**
- Update thread line ranges when code is edited
- Visual indicator when a thread's code has been modified
- Option to "re-anchor" thread to current selection

**Specific Behavior:**
- Listen to Monaco's `onDidChangeModelContent` events
- Track insertions/deletions and adjust thread `startLine`/`endLine`
- If original code is deleted, mark thread as "orphaned"
- Orphaned threads show warning icon and offer re-anchor or archive

**Data Model Addition:**
```json
{
  "threads": [{
    "id": "thread_123",
    "originalCodeHash": "abc123",
    "isOrphaned": false,
    "codeModified": false
  }]
}
```

**Success Criteria:**
- Adding 10 lines above a thread correctly shifts its range by 10
- Deleting the exact code a thread references marks it orphaned
- Re-anchoring updates the thread's selected code snapshot

### 14. Conversation Memory & Cross-Reference

**Must Have:**
- Reference previous threads in new questions ("Like you suggested in thread on line 45...")
- AI has access to summary of other threads in the file
- "Apply same fix pattern here" action

**Nice to Have:**
- Automatic detection of similar code patterns
- "You have a similar issue on line X" suggestions
- Thread linking (mark threads as related)

**Specific Behavior:**
- New AI requests include summary of existing threads
- User can @mention thread IDs in questions
- AI can suggest "This looks similar to the issue on line 45"

**Context Injection:**
```
## Existing Review Threads:
- Thread on lines 10-15: Discussed null safety, resolved by adding optional chaining
- Thread on lines 45-52: Performance concern about O(n²) loop, still open

## Current Question:
[User's new question about lines 80-85]
```

**Success Criteria:**
- AI correctly references relevant past discussions
- Cross-thread suggestions are contextually appropriate

### 15. Export & Sharing

**Must Have:**
- Export all threads as Markdown document
- Export single thread as Markdown
- Copy AI response to clipboard with one click

**Nice to Have:**
- Generate shareable link (requires backend)
- Export as GitHub Gist
- PDF export with code formatting

**Export Format:**
```markdown
# Code Review: [filename]
Generated: 2025-01-15

## Thread 1 (Lines 10-15) - Resolved
**Code:**
\`\`\`javascript
const data = fetchData();
\`\`\`

**User:** Is this efficient?
**AI:** This could be optimized by...

---

## Thread 2 (Lines 45-52) - Active
...
```

**Success Criteria:**
- Exported Markdown renders correctly in GitHub/GitLab
- Code blocks have proper syntax highlighting hints
- Thread status and timestamps preserved

-----

## Phase 5: Multi-File & Project Features

### 16. Multi-File Support

**Must Have:**
- File tree sidebar showing open files
- Tab bar for switching between files
- Per-file thread storage
- Cross-file search

**Nice to Have:**
- Folder upload / drag-and-drop
- File type icons
- Recently opened files

**Specific Behavior:**
- Left sidebar shows file tree (collapsible)
- Click file to open in editor tab
- Each file maintains independent thread state
- "New File" and "Open File" actions

**Data Model Change:**
```json
{
  "files": {
    "file_1": {
      "name": "index.js",
      "content": "...",
      "language": "javascript",
      "threads": [...]
    },
    "file_2": {
      "name": "utils.ts",
      "content": "...",
      "language": "typescript",
      "threads": [...]
    }
  },
  "activeFileId": "file_1",
  "openTabs": ["file_1", "file_2"]
}
```

**Success Criteria:**
- Switching files preserves scroll position and selection
- Threads are correctly associated with their files
- File tree supports 50+ files without performance issues

### 17. Cross-File AI Context

**Must Have:**
- AI can see imports and understand cross-file dependencies
- "Find usages" before suggesting changes
- Warn about breaking changes in exported functions

**Nice to Have:**
- Full project-wide context window
- Dependency graph visualization
- "This function is used in 3 other files" warnings

**Specific Behavior:**
- When reviewing a function, AI sees where it's imported
- Suggested changes include impact analysis
- Option to "Review all usages" spawns threads in other files

**Success Criteria:**
- AI correctly identifies that changing a function signature breaks callers
- Cross-file context doesn't exceed token limits

-----

## Phase 6: Backend & Collaboration (Future)

### 18. User Authentication

**Features:**
- Sign up / Sign in (email + password or OAuth)
- User profile with saved preferences
- Review history across sessions

### 19. Cloud Persistence

**Features:**
- Sync files and threads to cloud database
- Access reviews from any device
- Version history for files

### 20. Team Collaboration

**Features:**
- Share review sessions with team members
- Real-time collaborative editing
- Comment threads between team members (not just AI)
- Role-based permissions (viewer, commenter, editor)

-----

## Updated Tech Stack (Full Vision)

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript |
| Editor | Monaco Editor |
| Styling | Tailwind CSS 4 |
| State | Zustand with persistence |
| AI Providers | OpenAI, Anthropic, Ollama |
| Streaming | Server-Sent Events / WebSocket |
| Backend (Future) | Node.js / Python FastAPI |
| Database (Future) | PostgreSQL + Prisma |
| Auth (Future) | Clerk / Auth0 / Supabase Auth |
| Real-time (Future) | Socket.io / Liveblocks |

-----

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Streaming Responses | High | Medium | P1 |
| Keyboard Shortcuts | Medium | Low | P1 |
| Multiple AI Providers | High | Medium | P1 |
| Specialized Review Modes | High | Low | P1 |
| Code Diff Suggestions | Very High | High | P2 |
| Thread Line Tracking | Medium | High | P2 |
| Smart Selection | Medium | Medium | P2 |
| Thread Filtering/Search | Medium | Low | P2 |
| Export/Sharing | Medium | Low | P2 |
| Syntax-Aware Context | High | High | P3 |
| Cross-Reference Memory | Medium | High | P3 |
| Multi-File Support | Very High | Very High | P3 |
| Cross-File Context | High | Very High | P4 |
| Backend/Auth | High | Very High | P4 |

-----

## Updated Success Metrics

### Phase 2 Checkpoint
1. Streaming responses feel instant (first token < 500ms)
2. Power users complete reviews 30% faster with shortcuts
3. Review mode switching works seamlessly

### Phase 3 Checkpoint
1. Multiple providers work interchangeably
2. Security mode catches 80% of OWASP Top 10 in test cases
3. Diff suggestions apply correctly 95% of the time

### Phase 4 Checkpoint
1. Thread anchors survive 90% of typical edits
2. Cross-reference suggestions are relevant 70% of the time
3. Export produces valid, well-formatted Markdown

### Phase 5 Checkpoint
1. Multi-file navigation feels as fast as VS Code
2. Cross-file context improves AI accuracy measurably
3. 100+ file projects load in under 3 seconds