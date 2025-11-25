import { useState, useEffect } from 'react';
import CodeEditor from './components/CodeEditor';
import AIButton from './components/AIButton';
import ThreadPanel from './components/ThreadIndicator';
import useEditorStore from './store/useEditorStore';

function App() {
  const {
    setCurrentSelection,
    setCode,
    isReadOnly,
    toggleReadOnly,
    threads,
    currentSelection,
    activeThreadId,
    code,
  } = useEditorStore();
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const threadCount = threads.length;
  const hasSelection = currentSelection && !currentSelection.isEmpty;

  return (
    <div className={`min-h-screen ${theme}`} style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Premium Header */}
      <header className="border-b backdrop-blur-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: theme === 'dark' ? 'rgba(18, 18, 18, 0.95)' : 'rgba(255, 255, 255, 0.95)' }}>
        <div className="max-w-[2000px] mx-auto px-6 py-3 flex items-center justify-between">
          {/* Left: Theme Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full transition-colors duration-200"
              style={{ backgroundColor: 'var(--surface-muted)', color: 'var(--text-secondary)' }}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
          </div>

          {/* Center: Logo & Brand */}
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight leading-tight" style={{ color: 'var(--foreground)' }}>
              CodeReviewMax
            </h1>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleReadOnly}
              className="group rounded-lg font-semibold transition-all duration-300 flex items-center justify-center"
              style={{
                backgroundColor: isReadOnly ? 'var(--surface-muted)' : 'var(--accent)',
                border: `1px solid ${isReadOnly ? 'var(--border-color)' : 'var(--accent)'}`,
                color: isReadOnly ? 'var(--text-secondary)' : 'white',
                width: '120px',
                height: '40px',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              <span className="text-xs leading-none">{isReadOnly ? 'Locked' : 'Edit Mode'}</span>
            </button>
            <AIButton code={code} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[2000px] mx-auto p-8">
        <div className="grid grid-cols-12 gap-6" style={{ height: 'calc(100vh - 120px)' }}>
          {/* Left: Code Editor - 7 columns */}
          <section className="col-span-7 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Code Editor</h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Select code to start a conversation
                </p>
              </div>
              {hasSelection && (
                <div className="px-3 py-1.5 rounded-lg text-xs font-semibold animate-scale-in"
                     style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                  {currentSelection.selectedText.length} chars selected
                </div>
              )}
            </div>
            <div
              className="flex-1 rounded-2xl border overflow-hidden"
              style={{
                borderColor: hasSelection ? 'var(--accent)' : 'var(--border-color)',
                backgroundColor: 'var(--surface)',
                boxShadow: hasSelection ? `0 0 0 2px ${'var(--accent-light)'}` : 'none',
                transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <CodeEditor
                theme={theme}
                onSelectionChange={setCurrentSelection}
                onCodeChange={setCode}
              />
            </div>
          </section>

          {/* Right: Thread Panel - 5 columns */}
          <aside className="col-span-5 flex flex-col">
            <div className="mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Conversations</h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {activeThreadId ? 'Active discussion' : 'Review and manage threads'}
              </p>
            </div>
            <div className="flex-1 min-h-0">
              <ThreadPanel />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;
