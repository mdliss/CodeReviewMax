# TASKS.md

# AI Code Reviewer MVP - Development Task List

## Project File Structure
``````
code-review-assistant/
├── public/
├── src/
│   ├── components/
│   │   ├── Editor/
│   │   │   ├── CodeEditor.jsx
│   │   │   └── EditorToolbar.jsx
│   │   ├── Threads/
│   │   │   ├── ThreadList.jsx
│   │   │   ├── ThreadItem.jsx
│   │   │   └── ChatInput.jsx
│   │   └── Layout/
│   ├── services/
│   │   ├── aiService.js  (OpenAI or Mock)
│   ├── hooks/
│   │   ├── useEditorSelection.js
│   │   └── useThreads.js
│   ├── utils/
│   │   ├── constants.js
│   │   └── storage.js (Local Storage wrapper)
│   ├── contexts/
│   │   └── ReviewContext.jsx
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── package.json
└── vite.config.js
``````

-----

## PR \#1: Project Setup & UI Shell

**Branch:** `setup/initial-config`
**Goal:** Initialize React, Tailwind, and the Layout shell.

### Tasks:

  - [ ] **1.1: Initialize Vite Project**
      - Run `npm create vite@latest code-reviewer -- --template react`
  - [ ] **1.2: Install Dependencies**
      - `npm install @monaco-editor/react tailwindcss postcss autoprefixer uuid lucide-react`
      - `npm install openai` (or simply use fetch for API)
  - [ ] **1.3: Configure Tailwind**
      - Init tailwind and add base styles to `index.css`.
  - [ ] **1.4: Layout Component**
      - Create a 2-column layout: Left side (Code Editor - 70%), Right side (Thread/Chat Panel - 30%).

-----

## PR \#2: The Code Editor & Selection Logic

**Branch:** `feature/editor-core`
**Goal:** Implement Monaco Editor and capture line selections.

### Tasks:

  - [ ] **2.1: Implement CodeEditor.jsx**
      - Use `<Editor />` from `@monaco-editor/react`.
      - Add props for `language`, `theme`, `value`, `onChange`.
  - [ ] **2.2: Handle Text Selection**
      - Implement `handleEditorDidMount`.
      - Add listener: `editor.onDidChangeCursorSelection`.
      - Extract `startLineNumber`, `endLineNumber`, `selectedText`.
  - [ ] **2.3: Selection State**
      - Create `ReviewContext`.
      - Store `currentSelection` object: `{ startLine, endLine, code }`.
  - [ ] **2.4: "Ask AI" Trigger**
      - Show a visual "Ask AI" button or enable the Chat Panel input ONLY when a valid selection exists.

-----

## PR \#3: Thread Management (State)

**Branch:** `feature/threads`
**Goal:** Create, store, and display conversation threads.

### Tasks:

  - [ ] **3.1: Thread Data Structure**
      - Define Thread object: `{ id, range, comments: [] }`.
  - [ ] **3.2: Create New Thread**
      - When "Ask AI" is clicked, create a new Thread entry in state tied to the `currentSelection`.
  - [ ] **3.3: Visual Markers (Decorations)**
      - Use `editor.deltaDecorations` to highlight the background color of code blocks that have active threads.
      - *Challenge*: Ensure highlighting persists when switching between threads.

-----

## PR \#4: AI Service Integration

**Branch:** `feature/ai-integration`
**Goal:** Connect the chat UI to an LLM.

### Tasks:

  - [ ] **4.1: Mock Service / API Wrapper**
      - Create `services/aiService.js`.
      - **Option A (Real):** Call OpenAI API.
      - **Option B (Mock):** Return a `setTimeout` promise with a hardcoded response (e.g., "This code looks good, but consider using map() here.").
  - [ ] **4.2: Prompt Engineering**
      - Construct the prompt:
        `"You are a code expert. Review the following code. Focus specifically on lines ${start}-${end}: ${selectedCode}. The full file context is: ${fullCode}."`
  - [ ] **4.3: Streaming/Loading State**
      - Show a "Thinking..." spinner in the chat bubble while waiting.

-----

## PR \#5: Thread UI & Polish

**Branch:** `feature/ui-polish`
**Goal:** Make the chat experience intuitive.

### Tasks:

  - [ ] **5.1: Thread List Sidebar**
      - Render list of active threads.
      - Clicking a thread in the list should scroll the editor to those lines (`editor.revealLine`).
  - [ ] **5.2: Chat Interface**
      - Style User vs. AI messages differently.
      - Allow User to reply to the AI (appending to `messages` array).
  - [ ] **5.3: Markdown Rendering**
      - Use a simple markdown parser (or `react-markdown`) to render AI code blocks in the chat.
  - [ ] **5.4: Persistence**
      - Save `threads` and `code` to `localStorage` on change.
      - Load from `localStorage` on mount.

-----

## MVP Completion Checklist

  - [ ] User can paste code.
  - [ ] User can highlight a block and see the "Ask AI" option.
  - [ ] A new chat thread is created upon asking.
  - [ ] AI responds with context-aware advice.
  - [ ] Code has visual highlights where comments exist.
  - [ ] Multiple threads can exist independently.
  - [ ] Page refresh preserves data.