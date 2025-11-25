import { useState, useRef, useEffect } from 'react';
import useEditorStore from '../store/useEditorStore';
import { queryAI, formatAIResponse } from '../services/aiService';

const AIButton = ({ code }) => {
  const { currentSelection, isAILoading, setAILoading, addThread, addMessageToThread } = useEditorStore();
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [question, setQuestion] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const toastTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const showToast = (message) => {
    setToastMessage(message);
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => setToastMessage(''), 2500);
  };

  const handleAskAI = () => {
    if (!currentSelection || currentSelection.isEmpty) {
      showToast('Select code to ask CodeReviewMax.');
      return;
    }

    setShowQuestionDialog(true);
  };

  const handleSubmitQuestion = async () => {
    if (!question.trim()) {
      showToast('Add a question before sending.');
      return;
    }

    setShowQuestionDialog(false);
    setAILoading(true);

    try {
      const threadData = {
        startLine: currentSelection.startLineNumber,
        endLine: currentSelection.endLineNumber,
        selectedCode: currentSelection.selectedText,
        messages: [
          {
            id: `msg-${Date.now()}`,
            content: question,
            role: 'user',
            timestamp: new Date().toISOString(),
          }
        ],
      };

      const newThread = addThread(threadData);

      const response = await queryAI(currentSelection, code, question);
      const formatted = formatAIResponse(response);

      if (newThread?.id) {
        addMessageToThread(newThread.id, {
          content: formatted.text,
          role: 'ai',
        });
      }

      setQuestion('');
    } catch (error) {
      console.error('AI Query Error:', error);
      showToast(`Error: ${error.message}`);
    } finally {
      setAILoading(false);
    }
  };

  const hasSelection = currentSelection && !currentSelection.isEmpty;
  const canInteract = hasSelection && !isAILoading;

  return (
    <>
      <button
        data-preserve-selection="true"
        onClick={handleAskAI}
        disabled={!canInteract}
        className="group rounded-lg font-semibold transition-all duration-300 flex items-center justify-center"
        style={{
          backgroundColor: hasSelection ? 'var(--accent)' : 'var(--surface-muted)',
          color: hasSelection ? 'white' : 'var(--text-muted)',
          border: `1px solid ${hasSelection ? 'var(--accent)' : 'var(--border-color)'}`,
          cursor: canInteract ? 'pointer' : 'not-allowed',
          opacity: isAILoading ? 0.8 : 1,
          width: '120px',
          height: '40px',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        <span className="text-xs leading-none">{hasSelection ? 'Ask AI' : 'Select Code'}</span>
      </button>

      {showQuestionDialog && (
        <div data-preserve-selection="true" className="modal-backdrop flex items-center justify-center p-4 z-[9999]">
          <div
            data-preserve-selection="true"
            className="w-full max-w-3xl rounded-2xl border overflow-hidden animate-scale-in"
            style={{
              borderColor: 'var(--accent)',
              backgroundColor: 'var(--surface)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.2)'
            }}
          >
            {/* Header */}
            <div
              className="px-6 py-5 border-b flex items-center justify-between backdrop-blur-sm"
              style={{
                borderColor: 'var(--border-color)',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, transparent 100%)'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                     style={{
                       background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)'
                     }}>
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Ask AI</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Lines {currentSelection?.startLineNumber}–{currentSelection?.endLineNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowQuestionDialog(false);
                  setQuestion('');
                }}
                className="p-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-[var(--surface-muted)]"
                style={{ color: 'var(--text-muted)' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Code Preview */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-2 block"
                       style={{ color: 'var(--text-muted)' }}>
                  Selected Code
                </label>
                <pre
                  className="rounded-xl p-4 text-sm font-mono max-h-48 overflow-auto"
                  style={{
                    backgroundColor: '#0a0a0a',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {currentSelection?.selectedText}
                </pre>
              </div>

              {/* Question Input */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider mb-2 block"
                       style={{ color: 'var(--text-muted)' }}>
                  Your Question
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSubmitQuestion();
                    }
                  }}
                  placeholder="What would you like to know about this code?"
                  className="w-full input-textarea text-sm resize-none"
                  style={{ minHeight: '120px' }}
                  autoFocus
                />
                <p className="text-xs mt-2 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <kbd className="px-2 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: 'var(--surface-muted)', border: '1px solid var(--border-color)' }}>⌘</kbd>
                  <span>+</span>
                  <kbd className="px-2 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: 'var(--surface-muted)', border: '1px solid var(--border-color)' }}>Enter</kbd>
                  <span>to submit</span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowQuestionDialog(false);
                    setQuestion('');
                  }}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    backgroundColor: 'var(--surface-muted)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitQuestion}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 relative overflow-hidden group"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'white',
                    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)'
                  }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                       style={{
                         background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%)'
                       }}></div>
                  <span className="relative">Ask AI</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div
          className="fixed bottom-8 right-8 px-5 py-3 rounded-xl text-sm font-medium border animate-slide-in-down flex items-center gap-2 z-[10000]"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--accent)',
            color: 'var(--accent)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(99, 102, 241, 0.2)'
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {toastMessage}
        </div>
      )}
    </>
  );
};

export default AIButton;
