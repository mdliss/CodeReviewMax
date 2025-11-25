import { useRef, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Editor from '@monaco-editor/react';
import useEditorStore from '../store/useEditorStore';
import '../styles/editor.css';

const NATIVE_SELECTION_HIDDEN_CLASS = 'monaco-selection-hidden';

const CodeEditor = ({ onSelectionChange, onCodeChange, theme }) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const containerRef = useRef(null);
  const threadsRef = useRef([]);
  const activeThreadIdRef = useRef(null);
  const editorDisposablesRef = useRef([]);
  const [selection, setSelection] = useState(null);
  const [inlineCardThreadId, setInlineCardThreadId] = useState(null);
  const decorationsRef = useRef([]);
  const threadDecorationsRef = useRef([]);
  const inlineWidgetRef = useRef(null);
  const isReadOnly = useEditorStore((state) => state.isReadOnly);
  const threads = useEditorStore((state) => state.threads);
  const activeThreadId = useEditorStore((state) => state.activeThreadId);
  const setActiveThread = useEditorStore((state) => state.setActiveThread);
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

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-2xl"
      style={{ overflow: 'hidden', position: 'relative', backgroundColor: 'var(--surface)' }}
    >
      <Editor
        height="100%"
        defaultLanguage="javascript"
        defaultValue={defaultValue}
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
        }}
      />
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
