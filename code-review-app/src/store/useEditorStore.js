import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Helper function to generate random thread colors
const getRandomThreadColor = () => {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const useEditorStore = create(
  persist(
    (set) => ({
  // Editor selection state
  currentSelection: null,
  setCurrentSelection: (selection) => set({ currentSelection: selection }),

  // Highlighted ranges for tracking selections
  highlightedRanges: [],
  addHighlightedRange: (range) => set((state) => ({
    highlightedRanges: [...state.highlightedRanges, { ...range, id: Date.now() }]
  })),
  removeHighlightedRange: (id) => set((state) => ({
    highlightedRanges: state.highlightedRanges.filter(r => r.id !== id)
  })),
  clearHighlightedRanges: () => set({ highlightedRanges: [] }),

  // Code content state
  code: '',
  setCode: (code) => set({ code }),

  // File upload state
  currentFileName: null,
  currentLanguage: 'javascript',
  setCurrentFileName: (fileName) => set({ currentFileName: fileName }),
  setCurrentLanguage: (language) => set({ currentLanguage: language }),
  setFileWithLanguage: (code, fileName, language) => set({
    code,
    currentFileName: fileName,
    currentLanguage: language,
  }),

  // Thread state - manages conversation threads anchored to code lines
  threads: [],

  // Add a new thread
  addThread: (threadData) => {
    let createdThread = null;
    set((state) => {
      createdThread = {
        id: `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        startLine: threadData.startLine,
        endLine: threadData.endLine,
        selectedCode: threadData.selectedCode,
        messages: threadData.messages || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active', // active, resolved, archived
        color: threadData.color || getRandomThreadColor(),
      };
      return {
        threads: [...state.threads, createdThread],
        activeThreadId: createdThread.id // Auto-select the new thread
      };
    });
    return createdThread;
  },

  // Add a message to an existing thread
  addMessageToThread: (threadId, message) => set((state) => ({
    threads: state.threads.map(t =>
      t.id === threadId
        ? {
            ...t,
            messages: [
              ...t.messages,
              {
                id: `msg-${Date.now()}`,
                content: message.content,
                role: message.role, // 'user' or 'ai'
                timestamp: new Date().toISOString(),
              }
            ],
            updatedAt: new Date().toISOString(),
          }
        : t
    )
  })),

  // Remove a thread
  removeThread: (threadId) => set((state) => ({
    threads: state.threads.filter(t => t.id !== threadId)
  })),

  // Update thread properties
  updateThread: (threadId, updates) => set((state) => ({
    threads: state.threads.map(t =>
      t.id === threadId
        ? { ...t, ...updates, updatedAt: new Date().toISOString() }
        : t
    )
  })),

  // Get threads for a specific line range
  getThreadsForLineRange: (startLine, endLine) => (state) => {
    return state.threads.filter(t =>
      (t.startLine >= startLine && t.startLine <= endLine) ||
      (t.endLine >= startLine && t.endLine <= endLine) ||
      (t.startLine <= startLine && t.endLine >= endLine)
    );
  },

  // Active thread selection
  activeThreadId: null,
  setActiveThread: (threadId) => set({ activeThreadId: threadId }),
  clearActiveThread: () => set({ activeThreadId: null }),

  // UI state
  isAILoading: false,
  setAILoading: (loading) => set({ isAILoading: loading }),

  // Streaming state
  streamingText: '',
  streamingThreadId: null,
  setStreamingText: (text) => set({ streamingText: text }),
  setStreamingThreadId: (threadId) => set({ streamingThreadId: threadId }),
  clearStreaming: () => set({ streamingText: '', streamingThreadId: null }),

  // Editor mode state
  isReadOnly: false,
  toggleReadOnly: () => set((state) => ({ isReadOnly: !state.isReadOnly })),
  setReadOnly: (readOnly) => set({ isReadOnly: readOnly }),

  // AI Settings
  aiSettings: {
    provider: 'mock', // 'mock', 'openai', 'anthropic'
    model: 'gpt-4o-mini',
    apiKeys: {
      openai: '',
      anthropic: '',
    },
  },
  setAIProvider: (provider) => set((state) => ({
    aiSettings: { ...state.aiSettings, provider }
  })),
  setAIModel: (model) => set((state) => ({
    aiSettings: { ...state.aiSettings, model }
  })),
  setAPIKey: (provider, key) => set((state) => ({
    aiSettings: {
      ...state.aiSettings,
      apiKeys: { ...state.aiSettings.apiKeys, [provider]: key }
    }
  })),
  updateAISettings: (settings) => set((state) => ({
    aiSettings: { ...state.aiSettings, ...settings }
  })),
}),
    {
      name: 'code-review-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        code: state.code,
        threads: state.threads,
        highlightedRanges: state.highlightedRanges,
        activeThreadId: state.activeThreadId,
        aiSettings: state.aiSettings,
        currentFileName: state.currentFileName,
        currentLanguage: state.currentLanguage,
      }),
    }
  )
);

export default useEditorStore;
