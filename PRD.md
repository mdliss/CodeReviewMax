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