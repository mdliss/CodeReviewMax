import { useState, useRef, useEffect } from 'react';
import useEditorStore from '../store/useEditorStore';
import { queryAIStreaming, formatAIResponse } from '../services/aiService';

// Export thread as markdown
const exportThreadAsMarkdown = (thread) => {
  const lines = [];

  // Header
  lines.push(`# Code Review Thread`);
  lines.push('');
  lines.push(`**Lines:** ${thread.startLine}–${thread.endLine}`);
  lines.push(`**Created:** ${new Date(thread.createdAt).toLocaleString()}`);
  lines.push(`**Last Updated:** ${new Date(thread.updatedAt).toLocaleString()}`);
  lines.push('');

  // Code snippet
  lines.push('## Code Snippet');
  lines.push('');
  lines.push('```');
  lines.push(`// Lines ${thread.startLine}–${thread.endLine}`);
  lines.push(thread.selectedCode);
  lines.push('```');
  lines.push('');

  // Conversation
  lines.push('## Conversation');
  lines.push('');

  if (thread.messages.length === 0) {
    lines.push('*No messages in this thread.*');
  } else {
    thread.messages.forEach((msg, index) => {
      const role = msg.role === 'ai' ? 'CodeReviewMax' : 'You';
      const timestamp = new Date(msg.timestamp).toLocaleString();
      lines.push(`### ${role} — ${timestamp}`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
    });
  }

  lines.push('---');
  lines.push('*Exported from CodeReviewMax*');

  return lines.join('\n');
};

// Download markdown file
const downloadMarkdown = (content, filename) => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const ThreadConversation = ({ thread }) => {
  const {
    setActiveThread,
    addMessageToThread,
    code,
    isAILoading,
    setAILoading,
    aiSettings,
    streamingText,
    streamingThreadId,
    setStreamingText,
    setStreamingThreadId,
    clearStreaming
  } = useEditorStore();
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef(null);
  const hasMounted = useRef(false);
  const prevMessageCount = useRef(thread.messages.length);

  useEffect(() => {
    if (messagesEndRef.current) {
      if (!hasMounted.current) {
        // On initial mount, or when switching threads, scroll to bottom without smooth behavior
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        hasMounted.current = true;
      } else if (thread.messages.length > prevMessageCount.current) {
        // Only scroll smoothly if new messages have been added
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      prevMessageCount.current = thread.messages.length;
    }
  }, [thread.messages, thread.id]); // Add thread.id to dependencies to reset prevMessageCount on thread switch

  useEffect(() => {
    // Reset hasMounted and prevMessageCount when a new thread becomes active
    hasMounted.current = false;
    prevMessageCount.current = 0;
  }, [thread.id]);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;

    const userMessage = {
      content: replyText,
      role: 'user',
    };

    addMessageToThread(thread.id, userMessage);
    setReplyText('');
    setAILoading(true);
    setStreamingThreadId(thread.id);
    setStreamingText('');

    try {
      const selection = {
        startLineNumber: thread.startLine,
        endLineNumber: thread.endLine,
        selectedText: thread.selectedCode,
      };

      // Build conversation history for context
      const conversationHistory = thread.messages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.content
      }));

      // Add the new user message to history
      conversationHistory.push({ role: 'user', content: replyText });

      const response = await queryAIStreaming(
        selection,
        code,
        replyText,
        aiSettings,
        conversationHistory,
        (chunk, fullText) => {
          setStreamingText(fullText);
        }
      );

      const formatted = formatAIResponse(response);

      addMessageToThread(thread.id, {
        content: formatted.text,
        role: 'ai',
      });
    } catch (error) {
      console.error('AI Reply Error:', error);
      addMessageToThread(thread.id, {
        content: `Error: ${error.message}`,
        role: 'ai',
      });
    } finally {
      setAILoading(false);
      clearStreaming();
    }
  };

  return (
    <div
      className="border-t flex flex-col shrink-0 animate-slide-in-down"
      style={{
        borderColor: 'var(--border-color)',
        backgroundColor: 'var(--surface)',
        maxHeight: '50vh',
      }}
    >
              <div
                className="px-5 py-4 border-b flex items-center justify-between backdrop-blur-sm"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--surface-muted)'
                }}
              >        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono"
            style={{
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent)'
            }}
          >
            L{thread.startLine}
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Active Conversation</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Lines {thread.startLine}–{thread.endLine}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const markdown = exportThreadAsMarkdown(thread);
              const filename = `thread-L${thread.startLine}-${thread.endLine}-${Date.now()}.md`;
              downloadMarkdown(markdown, filename);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5"
            style={{
              backgroundColor: 'var(--surface-muted)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)'
            }}
            title="Export as Markdown"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button
            onClick={() => setActiveThread(null)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5"
            style={{
              backgroundColor: 'var(--surface-muted)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)'
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {thread.messages.length === 0 && (
          <div className="message-info w-full" style={{ maxWidth: '100%' }}>
            Ask CodeReviewMax a question to kick off this thread.
          </div>
        )}

        {thread.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`${msg.role === 'user' ? 'message-user' : 'message-assistant'} shadow-lg`}>
              <div className="flex items-center justify-between mb-1 text-[11px] opacity-70">
                <span className="font-semibold">
                  {msg.role === 'ai' ? 'CodeReviewMax' : 'You'}
                </span>
                <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {isAILoading && streamingThreadId === thread.id && (
          <div className="flex justify-start">
            <div className="message-assistant" style={{ maxWidth: '100%', backgroundColor: 'var(--card-bg)' }}>
              <div className="flex items-center gap-2 text-xs mb-2" style={{ color: 'var(--accent)' }}>
                <span className="font-semibold">CodeReviewMax</span>
                <span className="animate-pulse">typing...</span>
              </div>
              {streamingText ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {streamingText}
                  <span className="inline-block w-2 h-4 ml-0.5 animate-pulse" style={{ backgroundColor: 'var(--accent)' }}></span>
                </p>
              ) : (
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent)', animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent)', animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent)', animationDelay: '300ms' }}></div>
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        className="p-4 border-t"
        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--surface)' }}
      >
        <div className="flex gap-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            handleSendReply();
                          }
                        }}
                        placeholder="Add a follow-up..."
                        className="flex-1 input-textarea text-sm"
                        style={{ color: 'var(--text-primary)' }}
                        rows={2}
                        disabled={isAILoading}
                      />          <button
            onClick={handleSendReply}
            disabled={!replyText.trim() || isAILoading}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
              !replyText.trim() || isAILoading
                ? 'cursor-not-allowed'
                : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40'
            }`}
            style={{
              backgroundColor: !replyText.trim() || isAILoading ? 'var(--surface-muted)' : 'var(--accent)',
              color: !replyText.trim() || isAILoading ? 'var(--text-muted)' : 'white',
            }}
          >
            Send
          </button>
        </div>
        <p className="text-[11px] text-muted mt-1">Press Cmd/Ctrl + Enter to send</p>
      </div>
    </div>
  );
};

const ThreadIndicator = ({ thread, onClick, style }) => {
  const { activeThreadId, removeThread } = useEditorStore();
  const [showMenu, setShowMenu] = useState(false);

  const isActive = activeThreadId === thread.id;
  const messageCount = thread.messages.length;

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm('Delete this thread?')) {
      removeThread(thread.id);
    }
    setShowMenu(false);
  };

  const handleExport = (e) => {
    e.stopPropagation();
    const markdown = exportThreadAsMarkdown(thread);
    const filename = `thread-L${thread.startLine}-${thread.endLine}-${Date.now()}.md`;
    downloadMarkdown(markdown, filename);
    setShowMenu(false);
  };

  return (
    <div
      className="group relative cursor-pointer rounded-xl border transition-all duration-300 overflow-hidden animate-fade-in"
      style={{
        borderColor: isActive ? 'var(--accent)' : 'var(--border-color)',
        backgroundColor: isActive ? 'var(--surface-muted)' : 'var(--card-bg)',
        boxShadow: isActive ? '0 4px 20px rgba(99, 102, 241, 0.15)' : 'none',
        ...style
      }}
      onClick={() => onClick(thread)}
    >
      {/* Active indicator glow */}
      {isActive && (
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, transparent 100%)',
            pointerEvents: 'none'
          }}
        />
      )}

      <div className="relative p-3">
        <div className="flex items-start gap-2">
          {/* Thread color indicator */}
          <div
            className="w-1 h-10 rounded-full flex-shrink-0 mt-1"
            style={{
              background: `linear-gradient(180deg, ${thread.color} 0%, ${thread.color}80 100%)`
            }}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: 'var(--accent-light)',
                      color: 'var(--accent)'
                    }}>
                L{thread.startLine}–{thread.endLine}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: isActive ? 'rgba(99, 102, 241, 0.2)' : 'var(--surface-muted)',
                      color: isActive ? 'var(--accent)' : 'var(--text-muted)'
                    }}>
                {messageCount}
              </span>
            </div>

            <p className="text-xs font-medium mb-1 line-clamp-1 font-mono"
               style={{ color: 'var(--foreground)' }}
               title={thread.selectedCode}>
              {thread.selectedCode}
            </p>

            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {new Date(thread.updatedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </p>
          </div>

          {/* Menu button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-lg hover:bg-[var(--border-color)]"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
              <circle cx="8" cy="2" r="1.5"/>
              <circle cx="8" cy="8" r="1.5"/>
              <circle cx="8" cy="14" r="1.5"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Thread menu */}
      {showMenu && (
        <div
          className="dropdown-container min-w-[160px] right-2 top-14 z-50"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
        >
          <button
            onClick={handleExport}
            className="block w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded flex items-center gap-2"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--surface-muted)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export as Markdown
          </button>
          <button
            onClick={handleDelete}
            className="block w-full text-left px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 rounded flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Thread
          </button>
        </div>
      )}
    </div>
  );
};

const ThreadPanel = () => {
  const { threads, activeThreadId, setActiveThread } = useEditorStore();

  // Safety check for threads
  const safeThreads = Array.isArray(threads) ? threads : [];
  const activeThread = safeThreads.find((t) => t?.id === activeThreadId);

  console.log('🔄 ThreadPanel rendering - threads:', safeThreads.length, 'activeId:', activeThreadId);

  return (
    <div
      className="h-full flex flex-col rounded-2xl border overflow-hidden"
      style={{
        borderColor: 'var(--border-color)',
        backgroundColor: 'var(--surface)'
      }}
    >
      {/* Always show thread list at top */}
      <div
        className="flex flex-col border-b"
        style={{
          borderColor: 'var(--border-color)',
          maxHeight: activeThread ? '40%' : '100%',
          minHeight: activeThread ? '200px' : 'auto'
        }}
      >
        <div className="px-4 py-3 border-b" style={{ backgroundColor: 'var(--surface-muted)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>
                All Conversations
              </h3>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {safeThreads.length} total • Click to view
              </p>
            </div>
            <span className="text-sm font-bold px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
              {safeThreads.length}
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ backgroundColor: 'var(--background)' }}>
          {safeThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center"
                   style={{ backgroundColor: 'var(--surface-muted)', border: '2px dashed var(--border-color)' }}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-muted)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>No conversations yet</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Select code and ask AI to start
              </p>
            </div>
          ) : (
            safeThreads.map((thread, index) => (
              <ThreadIndicator
                key={thread.id}
                thread={thread}
                onClick={(t) => setActiveThread(t.id)}
                style={{ animationDelay: `${index * 50}ms` }}
              />
            ))
          )}
        </div>
      </div>

      {/* Active Conversation - shows below thread list */}
      {activeThread && (
        <div className="flex-1 min-h-0">
          <ThreadConversation key={activeThread.id} thread={activeThread} />
        </div>
      )}
    </div>
  );
};

export default ThreadPanel;
