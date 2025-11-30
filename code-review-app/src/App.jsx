import { useState, useEffect, useRef, useCallback } from 'react';
import CodeEditor from './components/CodeEditor';
import AIButton from './components/AIButton';
import ThreadPanel from './components/ThreadIndicator';
import Settings from './components/Settings';
import ThemeToggle from './components/ThemeToggle';
import useEditorStore from './store/useEditorStore';
import { AI_PROVIDERS } from './services/aiService';

// Map file extensions to Monaco language identifiers
const getLanguageFromExtension = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cc: 'cpp',
    h: 'cpp',
    hpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    swift: 'swift',
    kt: 'kotlin',
    php: 'php',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'scss',
    less: 'less',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    ps1: 'powershell',
    dockerfile: 'dockerfile',
    vue: 'vue',
    svelte: 'svelte',
    graphql: 'graphql',
    gql: 'graphql',
  };
  return languageMap[ext] || 'plaintext';
};

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
    aiSettings,
    currentFileName,
    currentLanguage,
    setFileWithLanguage,
  } = useEditorStore();
  const [theme, setTheme] = useState('dark');
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const aiButtonRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  // Handle file reading
  const handleFileUpload = useCallback((file) => {
    setUploadError(null);

    // Check file size (limit to 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('File too large. Maximum size is 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const language = getLanguageFromExtension(file.name);
      setFileWithLanguage(content, file.name, language);
    };
    reader.onerror = () => {
      setUploadError('Failed to read file. Please try again.');
    };
    reader.readAsText(file);
  }, [setFileWithLanguage]);

  // Handle drag events
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // Handle file input change
  const handleFileInputChange = useCallback((e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleFileUpload]);

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
          {/* Left: Theme Toggle & Settings */}
          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200"
              style={{ backgroundColor: 'var(--surface-muted)', color: 'var(--text-secondary)' }}
              aria-label="AI Settings"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-xs font-medium">{AI_PROVIDERS[aiSettings.provider]?.name || 'Mock'}</span>
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
            <AIButton ref={aiButtonRef} code={code} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[2000px] mx-auto p-8">
        <div className="grid grid-cols-12 gap-6" style={{ height: 'calc(100vh - 120px)' }}>
          {/* Left: Code Editor - 7 columns */}
          <section className="col-span-7 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                    {currentFileName || 'Code Editor'}
                  </h2>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {currentFileName
                      ? `${currentLanguage} • Drop file or click Upload to change`
                      : 'Select code to start a conversation'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  className="hidden"
                  accept=".js,.jsx,.ts,.tsx,.py,.rb,.java,.c,.cpp,.cc,.h,.hpp,.cs,.go,.rs,.swift,.kt,.php,.html,.htm,.css,.scss,.sass,.less,.json,.xml,.yaml,.yml,.md,.sql,.sh,.bash,.zsh,.ps1,.vue,.svelte,.graphql,.gql,.txt"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5"
                  style={{
                    backgroundColor: 'var(--surface-muted)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload
                </button>
                {hasSelection && (
                  <div className="px-3 py-1.5 rounded-lg text-xs font-semibold animate-scale-in"
                       style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                    {currentSelection.selectedText.length} chars selected
                  </div>
                )}
              </div>
            </div>

            {/* Error message */}
            {uploadError && (
              <div
                className="mb-3 px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {uploadError}
                <button
                  onClick={() => setUploadError(null)}
                  className="ml-auto p-0.5 rounded hover:bg-red-500/20"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <div
              className="flex-1 rounded-2xl border overflow-hidden relative"
              style={{
                borderColor: isDragging ? 'var(--accent)' : hasSelection ? 'var(--accent)' : 'var(--border-color)',
                backgroundColor: 'var(--surface)',
                boxShadow: isDragging ? '0 0 0 3px var(--accent-light)' : hasSelection ? '0 0 0 2px var(--accent-light)' : 'none',
                transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {/* Drag overlay */}
              {isDragging && (
                <div
                  className="absolute inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-sm"
                  style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}
                >
                  <div
                    className="p-6 rounded-2xl border-2 border-dashed flex flex-col items-center gap-3"
                    style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--surface)' }}
                  >
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--accent)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>Drop file to upload</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Supports most code file formats</p>
                  </div>
                </div>
              )}

              <CodeEditor
                theme={theme}
                onSelectionChange={setCurrentSelection}
                onCodeChange={setCode}
                onAskAI={() => aiButtonRef.current?.openDialog()}
                language={currentLanguage}
                value={code || undefined}
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

      {/* Settings Modal */}
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

export default App;
