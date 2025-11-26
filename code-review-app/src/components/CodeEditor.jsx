import { useRef, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Editor from '@monaco-editor/react';
import useEditorStore from '../store/useEditorStore';
import '../styles/editor.css';

const NATIVE_SELECTION_HIDDEN_CLASS = 'monaco-selection-hidden';

const CodeEditor = ({ onSelectionChange, onCodeChange, theme, onAskAI, language = 'javascript', value }) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const containerRef = useRef(null);
  const threadsRef = useRef([]);
  const activeThreadIdRef = useRef(null);
  const editorDisposablesRef = useRef([]);
  const [selection, setSelection] = useState(null);
  const [inlineCardThreadId, setInlineCardThreadId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const decorationsRef = useRef([]);
  const threadDecorationsRef = useRef([]);
  const inlineWidgetRef = useRef(null);
  const isReadOnly = useEditorStore((state) => state.isReadOnly);
  const threads = useEditorStore((state) => state.threads);
  const activeThreadId = useEditorStore((state) => state.activeThreadId);
  const setActiveThread = useEditorStore((state) => state.setActiveThread);
  const clearActiveThread = useEditorStore((state) => state.clearActiveThread);
  activeThreadIdRef.current = activeThreadId;

  const removeInlineWidget = () => {
    if (inlineWidgetRef.current) {
      const { widget, root } = inlineWidgetRef.current;
      if (editorRef.current && widget) {
        editorRef.current.removeContentWidget(widget);
      }
      root?.unmount?.();
      inlineWidgetRef.current = null;
    }
  };

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    if (!inlineCardThreadId) return;
    const exists = threads.some((thread) => thread.id === inlineCardThreadId);
    if (!exists) {
      setInlineCardThreadId(null);
    }
  }, [threads, inlineCardThreadId]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) {
      return;
    }
    const MonacoRange =
      monacoRef.current.Range || monacoRef.current.editor?.Range;
    if (!MonacoRange) return;

    if (!threads.length) {
      threadDecorationsRef.current = editorRef.current.deltaDecorations(
        threadDecorationsRef.current,
        []
      );
      return;
    }

    const decorations = threads.map((thread) => {
      const isActive = thread.id === activeThreadId;
      const previewLine =
        thread.selectedCode?.trim().split('\n')[0]?.slice(0, 80) || '';

      return {
        range: new MonacoRange(
          thread.startLine,
          1,
          thread.endLine,
          Number.MAX_SAFE_INTEGER
        ),
        options: {
          isWholeLine: true,
          className: `thread-range-highlight${
            isActive ? ' thread-range-highlight--active' : ''
          }`,
          linesDecorationsClassName: `thread-line-decoration${
            isActive ? ' thread-line-decoration--active' : ''
          }`,
          glyphMarginClassName: `thread-glyph${
            isActive ? ' thread-glyph--active' : ''
          }`,
          hoverMessage: {
            value: `Thread • Lines ${thread.startLine}-${thread.endLine}${
              previewLine ? `\n${previewLine}` : ''
            }`,
          },
        },
      };
    });

    threadDecorationsRef.current = editorRef.current.deltaDecorations(
      threadDecorationsRef.current,
      decorations
    );
  }, [threads, activeThreadId]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) {
      removeInlineWidget();
      return;
    }

    if (!inlineCardThreadId) {
      removeInlineWidget();
      return;
    }

    const targetThread = threads.find((t) => t.id === inlineCardThreadId);
    if (!targetThread) {
      removeInlineWidget();
      return;
    }

    const latestAiMessage = [...(targetThread.messages || [])]
      .slice()
      .reverse()
      .find((msg) => msg.role === 'ai');
    const fallbackMessage =
      targetThread.messages?.[targetThread.messages.length - 1] || null;
    const previewMessage = latestAiMessage || fallbackMessage;

    const widgetId = `inline-thread-card-${targetThread.id}`;
    const contentPreference =
      monacoRef.current.editor?.ContentWidgetPositionPreference ||
      monacoRef.current.ContentWidgetPositionPreference;

    const widget = {
      getId: () => widgetId,
      getDomNode: () => {
        if (!inlineWidgetRef.current?.domNode) {
          const node = document.createElement('div');
          node.className = 'inline-thread-card-wrapper';
          node.setAttribute('data-preserve-selection', 'true');
          inlineWidgetRef.current = inlineWidgetRef.current || {};
          inlineWidgetRef.current.domNode = node;
        }
        return inlineWidgetRef.current.domNode;
      },
      getPosition: () => ({
        position: {
          lineNumber: targetThread.startLine,
          column: 1,
        },
        preference: contentPreference
          ? [
              contentPreference.BELOW,
              contentPreference.ABOVE,
            ]
          : undefined,
      }),
    };

    const domNode = widget.getDomNode();
    if (!inlineWidgetRef.current?.root) {
      inlineWidgetRef.current = inlineWidgetRef.current || {};
      inlineWidgetRef.current.root = createRoot(domNode);
    }

    inlineWidgetRef.current.root.render(
      <InlineThreadCard
        thread={targetThread}
        latestMessage={previewMessage}
        hasAiResponse={Boolean(latestAiMessage)}
        onClose={() => setInlineCardThreadId(null)}
        onOpenFull={() => {
          setActiveThread(targetThread.id);
          setInlineCardThreadId(null);
        }}
      />
    );

    if (inlineWidgetRef.current.widget) {
      editorRef.current.removeContentWidget(inlineWidgetRef.current.widget);
    }
    editorRef.current.addContentWidget(widget);
    editorRef.current.layoutContentWidget(widget);
    inlineWidgetRef.current.widget = widget;
  }, [inlineCardThreadId, threads, setActiveThread]);

  useEffect(() => {
    return () => {
      editorDisposablesRef.current.forEach((disposable) =>
        disposable?.dispose?.()
      );
      editorDisposablesRef.current = [];
      removeInlineWidget();
    };
  }, []);

  const toggleNativeSelectionVisibility = (shouldHide) => {
    const domNode = editorRef.current?.getDomNode();
    if (!domNode) return;
    domNode.classList.toggle(NATIVE_SELECTION_HIDDEN_CLASS, Boolean(shouldHide));
  };

  // Find function/class boundaries around a given line
  const findBlockBoundaries = (lineNumber) => {
    if (!editorRef.current) return null;
    const model = editorRef.current.getModel();
    if (!model) return null;

    const lineCount = model.getLineCount();
    let startLine = lineNumber;
    let endLine = lineNumber;
    let braceCount = 0;
    let foundStart = false;

    // Search backwards for function/class start
    for (let i = lineNumber; i >= 1; i--) {
      const lineContent = model.getLineContent(i);

      // Check for function/class/method declarations
      const isFunctionStart = /^\s*(async\s+)?(function|class|const|let|var)\s+\w+|^\s*\w+\s*[=:]\s*(async\s*)?\(|^\s*\w+\s*\([^)]*\)\s*{/.test(lineContent);
      const isMethodStart = /^\s*(async\s+)?\w+\s*\([^)]*\)\s*{/.test(lineContent);
      const isArrowFunction = /^\s*(const|let|var)\s+\w+\s*=\s*(async\s*)?\([^)]*\)\s*=>/.test(lineContent);

      if (isFunctionStart || isMethodStart || isArrowFunction) {
        startLine = i;
        foundStart = true;
        break;
      }
    }

    if (!foundStart) return null;

    // Now find the matching closing brace
    braceCount = 0;
    let foundOpenBrace = false;

    for (let i = startLine; i <= lineCount; i++) {
      const lineContent = model.getLineContent(i);

      for (const char of lineContent) {
        if (char === '{') {
          braceCount++;
          foundOpenBrace = true;
        } else if (char === '}') {
          braceCount--;
        }
      }

      if (foundOpenBrace && braceCount === 0) {
        endLine = i;
        break;
      }
    }

    return { startLine, endLine };
  };

  // Expand selection to function boundary
  const expandSelectionToFunction = () => {
    if (!editorRef.current || !monacoRef.current) return;

    const currentSelection = editorRef.current.getSelection();
    if (!currentSelection) return;

    const boundaries = findBlockBoundaries(currentSelection.startLineNumber);
    if (!boundaries) return;

    const SelectionCtor = monacoRef.current.Selection || monacoRef.current.editor?.Selection;
    if (!SelectionCtor) return;

    const model = editorRef.current.getModel();
    const endLineContent = model.getLineContent(boundaries.endLine);

    const newSelection = new SelectionCtor(
      boundaries.startLine,
      1,
      boundaries.endLine,
      endLineContent.length + 1
    );

    editorRef.current.setSelection(newSelection);
    editorRef.current.revealLineInCenter(boundaries.startLine);
    toggleNativeSelectionVisibility(false);
  };

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;

    const handleClick = () => setContextMenu(null);
    const handleScroll = () => setContextMenu(null);

    document.addEventListener('click', handleClick);
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [contextMenu]);

  // Update editor read-only state when it changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly: isReadOnly });
    }
  }, [isReadOnly]);

  // Clear selection when clicking outside the editor
  useEffect(() => {
    const handleClickOutside = (event) => {
      const preserveSelectionTarget =
        event.target.closest?.('[data-preserve-selection="true"]');
      if (preserveSelectionTarget) {
        return;
      }

      // Check if click is outside the editor container
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(event.target);

      // Also check if we clicked on a Monaco editor element
      const clickedMonacoElement = event.target.closest('.monaco-editor');

      // Only clear if we clicked outside the container OR if we didn't click on Monaco
      if (isOutsideContainer || !clickedMonacoElement) {
        toggleNativeSelectionVisibility(true);
        if (editorRef.current && monacoRef.current) {
          const currentSelection = editorRef.current.getSelection();
          if (currentSelection && !currentSelection.isEmpty()) {
            // Clear decorations first
            const clearedDecorations = editorRef.current.deltaDecorations(decorationsRef.current, []);
            decorationsRef.current = clearedDecorations;
            // Then clear selection
            editorRef.current.setSelection(new monacoRef.current.Selection(1, 1, 1, 1));
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleEditorDidMount = (editor, monaco) => {
    editorDisposablesRef.current.forEach((disposable) =>
      disposable?.dispose?.()
    );
    editorDisposablesRef.current = [];
    editorRef.current = editor;
    monacoRef.current = monaco;
    const disposables = [];

    // Track code changes
    const contentDisposable = editor.onDidChangeModelContent(() => {
      const code = editor.getValue();
      if (onCodeChange) {
        onCodeChange(code);
      }
    });
    disposables.push(contentDisposable);

    // Handle cursor selection changes
    const selectionDisposable = editor.onDidChangeCursorSelection((e) => {
      const model = editor.getModel();
      const selectedText = model.getValueInRange(e.selection);

      const selectionData = {
        startLineNumber: e.selection.startLineNumber,
        startColumn: e.selection.startColumn,
        endLineNumber: e.selection.endLineNumber,
        endColumn: e.selection.endColumn,
        selectedText: selectedText,
        isEmpty: e.selection.isEmpty()
      };

      setSelection(selectionData);

      // Apply highlighting decoration for non-empty selections
      if (!e.selection.isEmpty()) {
        toggleNativeSelectionVisibility(false);
        const newDecorations = editor.deltaDecorations(decorationsRef.current, [
          {
            range: new monaco.Range(
              e.selection.startLineNumber,
              e.selection.startColumn,
              e.selection.endLineNumber,
              e.selection.endColumn
            ),
            options: {
              className: 'code-selection-highlight',
              isWholeLine: false,
              inlineClassName: 'inline-code-highlight',
              glyphMarginClassName: 'glyph-margin-highlight'
            }
          }
        ]);
        decorationsRef.current = newDecorations;
      } else {
        toggleNativeSelectionVisibility(true);
        // Clear decorations when selection is empty
        const clearedDecorations = editor.deltaDecorations(decorationsRef.current, []);
        decorationsRef.current = clearedDecorations;
      }

      if (onSelectionChange) {
        onSelectionChange(selectionData);
      }
    });
    disposables.push(selectionDisposable);

    const focusThread = (thread) => {
      if (!thread || !monacoRef.current || !editorRef.current) return;
      setActiveThread(thread.id);
      const SelectionCtor =
        monacoRef.current.Selection || monacoRef.current.editor?.Selection;
      if (SelectionCtor) {
        const highlightedSelection = new SelectionCtor(
          thread.startLine,
          1,
          thread.endLine,
          1
        );
        editorRef.current.revealLineInCenter(thread.startLine);
        editorRef.current.setSelection(highlightedSelection);
        toggleNativeSelectionVisibility(false);
      }
    };

    const handleGlyphClick = (lineNumber) => {
      const thread =
        threadsRef.current.find(
          (t) => lineNumber >= t.startLine && lineNumber <= t.endLine
        ) || null;
      if (thread) {
        focusThread(thread);
        setInlineCardThreadId((current) =>
          current === thread.id ? null : thread.id
        );
      }
    };

    const mouseDownDisposable = editor.onMouseDown((event) => {
      if (!monaco.editor) return;
      const targetType = event.target?.type;
      if (
        targetType === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
        event.target?.position?.lineNumber
      ) {
        handleGlyphClick(event.target.position.lineNumber);
      }
    });
    disposables.push(mouseDownDisposable);

    const navigateThreads = (direction) => {
      const sorted = [...threadsRef.current].sort(
        (a, b) => a.startLine - b.startLine
      );
      if (!sorted.length) return;
      const currentActiveId = activeThreadIdRef.current;
      const currentIndex = sorted.findIndex((t) => t.id === currentActiveId);
      if (currentIndex === -1) {
        const targetThread =
          direction === 'next' ? sorted[0] : sorted[sorted.length - 1];
        focusThread(targetThread);
        return;
      }

      const nextIndex =
        direction === 'next'
          ? Math.min(sorted.length - 1, currentIndex + 1)
          : Math.max(0, currentIndex - 1);
      focusThread(sorted[nextIndex]);
    };

    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.DownArrow,
      () => navigateThreads('next')
    );
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.UpArrow,
      () => navigateThreads('prev')
    );

    // Cmd/Ctrl+K to open AI dialog
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
      () => {
        const currentSel = editor.getSelection();
        if (currentSel && !currentSel.isEmpty() && onAskAI) {
          onAskAI();
        }
      }
    );

    // Escape to clear active thread and close context menu
    editor.addCommand(
      monaco.KeyCode.Escape,
      () => {
        setContextMenu(null);
        setInlineCardThreadId(null);
        if (activeThreadIdRef.current) {
          clearActiveThread();
        }
      }
    );

    // Context menu on right-click
    const contextMenuDisposable = editor.onContextMenu((e) => {
      const currentSel = editor.getSelection();
      if (currentSel && !currentSel.isEmpty()) {
        e.event.preventDefault();
        e.event.stopPropagation();
        setContextMenu({
          x: e.event.posx,
          y: e.event.posy,
        });
      }
    });
    disposables.push(contextMenuDisposable);

    const disposeOnEditorDispose = editor.onDidDispose(() => {
      disposables.forEach((disposable) => disposable?.dispose?.());
    });
    disposables.push(disposeOnEditorDispose);
    editorDisposablesRef.current = disposables;
  };

  const defaultValue = `// Welcome to CodeReviewMax
// Select any code to start a conversation with AI

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log('Fibonacci of 10:', result);

// Example: Array manipulation
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const doubled = numbers.map(n => n * 2);
const evens = numbers.filter(n => n % 2 === 0);
const sum = numbers.reduce((acc, n) => acc + n, 0);

console.log('Doubled:', doubled);
console.log('Evens:', evens);
console.log('Sum:', sum);

// Example: Async function
async function fetchUserData(userId) {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

// Example: Class
class Calculator {
  constructor() {
    this.result = 0;
  }

  add(value) {
    this.result += value;
    return this;
  }

  subtract(value) {
    this.result -= value;
    return this;
  }

  multiply(value) {
    this.result *= value;
    return this;
  }

  divide(value) {
    if (value === 0) throw new Error('Division by zero');
    this.result /= value;
    return this;
  }

  getResult() {
    return this.result;
  }
}

// Try selecting some code above and ask AI about it!
const calc = new Calculator();
calc.add(10).multiply(2).subtract(5);
console.log('Result:', calc.getResult());
`;

  const handleContextMenuAskAI = (e) => {
    e.stopPropagation();
    setContextMenu(null);
    if (onAskAI) {
      onAskAI();
    }
  };

  const handleContextMenuExpand = (e) => {
    e.stopPropagation();
    setContextMenu(null);
    expandSelectionToFunction();
  };

  const handleContextMenuCopy = (e) => {
    e.stopPropagation();
    setContextMenu(null);
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      const model = editorRef.current.getModel();
      if (selection && model) {
        const text = model.getValueInRange(selection);
        navigator.clipboard.writeText(text);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-2xl"
      style={{ overflow: 'hidden', position: 'relative', backgroundColor: 'var(--surface)' }}
    >
      <Editor
        height="100%"
        language={language}
        value={value !== undefined ? value : defaultValue}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          glyphMargin: true,
          lineDecorationsWidth: 16,
          scrollBeyondLastLine: true,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          readOnly: isReadOnly,
          padding: { top: 16, bottom: 16 },
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            verticalScrollbarSize: 14,
            horizontalScrollbarSize: 14,
            alwaysConsumeMouseWheel: true,
            useShadows: true,
          },
          mouseWheelScrollSensitivity: 1,
          fastScrollSensitivity: 5,
          mouseWheelZoom: false,
          overviewRulerLanes: 3,
          contextmenu: false, // Disable default context menu
        }}
      />

      {/* Custom Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 9999,
          }}
          data-preserve-selection="true"
        >
          <button
            className="context-menu-item"
            onClick={handleContextMenuAskAI}
            data-preserve-selection="true"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>Ask AI</span>
            <kbd className="context-menu-shortcut">⌘K</kbd>
          </button>
          <button
            className="context-menu-item"
            onClick={handleContextMenuExpand}
            data-preserve-selection="true"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span>Expand to Function</span>
          </button>
          <div className="context-menu-divider" />
          <button
            className="context-menu-item"
            onClick={handleContextMenuCopy}
            data-preserve-selection="true"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Copy</span>
            <kbd className="context-menu-shortcut">⌘C</kbd>
          </button>
        </div>
      )}
    </div>
  );
};

const InlineThreadCard = ({
  thread,
  latestMessage,
  hasAiResponse,
  onClose,
  onOpenFull,
}) => {
  const previewText = latestMessage?.content || thread.selectedCode || '';
  const previewAuthor =
    latestMessage?.role === 'ai' ? 'CodeReviewMax' : latestMessage ? 'You' : '';

  return (
    <div className="inline-thread-card" data-preserve-selection="true">
      <div className="inline-thread-card__header">
        <div>
          <p className="inline-thread-card__label">
            Lines {thread.startLine}–{thread.endLine}
          </p>
          <p className="inline-thread-card__title">
            {hasAiResponse ? 'Latest AI reply' : 'Conversation'}
          </p>
        </div>
        <button
          type="button"
          className="inline-thread-card__close"
          onClick={onClose}
          aria-label="Close inline conversation"
          data-preserve-selection="true"
        >
          ×
        </button>
      </div>

      <div className="inline-thread-card__body" data-preserve-selection="true">
        {previewText ? (
          <>
            {previewAuthor && (
              <p className="inline-thread-card__author">{previewAuthor}</p>
            )}
            <p className="inline-thread-card__text">{previewText}</p>
          </>
        ) : (
          <p className="inline-thread-card__empty">
            No replies yet. Use Ask AI to kick things off.
          </p>
        )}
      </div>

      <div className="inline-thread-card__footer">
        <button
          type="button"
          className="inline-thread-card__button"
          onClick={onOpenFull}
          data-preserve-selection="true"
        >
          Open full thread
        </button>
      </div>
    </div>
  );
};

export default CodeEditor;
