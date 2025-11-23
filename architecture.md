# ARCHITECTURE.md

# [AI Code Review Assistant] - System Architecture

## Architecture Overview

This document describes the system architecture for the AI Code Review Assistant. The architecture follows a **Client-Side SPA** pattern with **Local Persistence**, leveraging the browser as the primary execution environment to minimize backend complexity for the implementation challenge.

-----

## Architecture Diagram
``````mermaid
graph TB
    subgraph "Client Browser"
        subgraph "React Application"
            UI[UI Components]
            
            subgraph "Components Layer"
                EditorComp[Code Editor<br/>(Monaco Wrapper)<br/>Handles selection & display]
                ChatComp[Chat Interface<br/>Thread display & Input]
                Sidebar[Sidebar Panel<br/>Thread Navigation]
            end
            
            subgraph "State Management"
                ReviewCtx[Review Context<br/>- Code Content<br/>- Active Threads<br/>- Current Selection]
            end
            
            subgraph "Custom Hooks"
                useEditor[useMonacoEditor<br/>Manages Decorations<br/>& Scroll Events]
                useAI[useAICompletion<br/>Manages API loading<br/>states]
            end
            
            subgraph "Services Layer"
                AIService[AI Service<br/>(OpenAI/Mock Adapter)]
                StorageService[Storage Service<br/>(LocalStorage Wrapper)]
            end
            
            subgraph "Rendering Engine"
                Monaco[Monaco Editor Engine<br/>(Canvas Based)]
            end
        end
    end
    
    subgraph "External Services"
        OpenAI[AI Provider API<br/>(Optional/Mockable)]
    end
    
    %% Component to Context
    EditorComp --> ReviewCtx
    ChatComp --> ReviewCtx
    Sidebar --> ReviewCtx
    
    %% Context to Hooks
    ReviewCtx --> useEditor
    ReviewCtx --> useAI
    
    %% Hooks to Services
    useAI --> AIService
    ReviewCtx --> StorageService
    
    %% Services to External
    AIService -->|Completions| OpenAI
    
    %% Rendering
    EditorComp --> Monaco
    
    %% Styling
    classDef client fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef external fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef rendering fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    
    class EditorComp,ChatComp,Sidebar,ReviewCtx,useEditor,useAI,AIService,StorageService client
    class OpenAI external
    class Monaco rendering
``````

-----

## System Components

### Frontend Architecture

#### 1\. Components Layer

**Editor Components**

  - **Purpose**: Wraps the Monaco Editor instance to handle complexity.
  - **Key Components**:
      - `CodeEditor.jsx`: Initializing the editor, handling `onChange`, and mounting decorations.
      - **Specifications**: Full height, supports `javascript`/`python`.

**Chat Components**

  - **Purpose**: Displays the interaction between User and AI.
  - **Key Components**:
      - `ThreadList.jsx`: Summaries of all open comments.
      - `ChatBubble.jsx`: Individual message rendering (supports Markdown).

#### 2\. State Management

**Review Context (Context API / Zustand)**

  - **State**:
      - `code`: String (The file content).
      - `threads`: Array of Thread Objects.
      - `activeThreadId`: String | null.
      - `currentSelection`: Range Object | null.
  - **Methods**: `addThread`, `addMessageToThread`, `updateCode`.
  - **Purpose**: Central source of truth for the review session.

#### 3\. Custom Hooks

**useMonacoEditor**

  - **Purpose**: Bridges React state with Monaco's imperative API.
  - **Operations**:
      - Adds CSS class decorations to highlighted lines.
      - Listens to cursor movement.
      - Exposes `scrollToLine` method.

**useAICompletion**

  - **Purpose**: Manages the async nature of AI requests.
  - **Operations**:
      - Handles `isLoading`, `error`, `data`.
      - Abstraction for the API call.

#### 4\. Services Layer

**AI Service**

  - **Responsibilities**:
      - formatting the prompt (Context + Selection + Question).
      - Calling the API (or returning mock data).
  - **Key Functions**:
      - `getCompletion(code, selection, prompt)`: Returns Promise\<String\>.

**Storage Service**

  - **Responsibilities**:
      - Persisting state to `localStorage` to survive refreshes.
  - **Key Functions**:
      - `saveSession(data)`
      - `loadSession()`

-----

### Backend Architecture (Mock/Serverless)

*Note: For this Challenger Project, the "Backend" is simplified to Client-Side API calls or a thin Next.js API route.*

#### 1\. AI Integration

  - **Provider**: OpenAI (GPT-4o or GPT-3.5-turbo) or Anthropic.
  - **Auth**: API Key stored in `.env.local` (accessed via `import.meta.env`).

#### 2\. Persistence (Local)

  - **Database**: Browser `localStorage`.
  - **Schema**:
``````json
{
  "sessionId": "uuid",
  "lastModified": "timestamp",
  "fileData": "string",
  "threads": [
    {
      "id": "uuid",
      "lineStart": 10,
      "lineEnd": 15,
      "messages": []
    }
  ]
}
``````

-----

## Data Flow Patterns

### 1\. The "Ask AI" Flow
``````
User Selects Lines (UI)
    ↓
useMonacoEditor (Capture Range)
    ↓
ReviewContext (Update `currentSelection`)
    ↓
User Clicks "Ask AI" & Types Prompt
    ↓
ReviewContext (Create new Thread)
    ↓
AI Service (getCompletion)
    ↓
[Construct Contextual Prompt]
    ↓
External API (Request)
    ↓
ReviewContext (Update Thread with AI Response)
    ↓
EditorComp (Update Decorations/Highlighting)
``````

### 2\. Context Injection Strategy

To ensure the AI understands the code, we send a prompt structured as follows:
``````text
System: You are a helpful code review assistant.
User: 
Here is the full file context:
`````[Code File]```

The user is asking about the specific block from lines [Start] to [End]:
````[Selected Code]```

User Question: [User Prompt]
````

-----

## Performance Characteristics

### Target Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Editor Typing Latency | \< 16ms (60fps) | No lag while typing |
| Selection Event handling | \< 50ms | "Ask AI" button appears instantly |
| AI Response Start | \< 2s | Time to first token (streaming) |

### Optimization Strategies

**1. Monaco Editor Instantiation**

  - Only instantiate one editor.
  - Use `useRef` to store the editor instance, avoiding React re-renders on every cursor move.

**2. Decoration Management**

  - Batch update decorations (`deltaDecorations`) to prevent flickering.

-----

## Security Architecture

### API Key Management

  - **Client-Side (Demo Mode)**: Keys required in `.env`.
  - **Risk**: Keys are exposed in network tab if called from client.
  - **Mitigation (Production)**: Move API calls to a Serverless Function (Vercel/Next.js API) to hide keys. *For this challenge, client-side is acceptable if documented.*

-----

## Technology Choices Rationale

### Why React + Vite?

  - **Speed**: Instant server start, essential for rapid prototyping in a timed challenge.
  - **Ecosystem**: Vast library of components.

### Why Monaco Editor?

  - **Familiarity**: It's the engine powering VS Code. Developers expect this feel.
  - **Features**: Built-in minimap, syntax highlighting, and robust API for "Decorations" (critical for showing comments on code).

### Why LocalStorage?

  - **Simplicity**: Removes the need for setting up a Postgres/Mongo instance, allowing focus on the *Application Logic* and *AI Integration* as requested in the prompt.
`````