import { useState } from 'react';
import useEditorStore from '../store/useEditorStore';
import { AI_PROVIDERS, testAPIConnection } from '../services/aiService';

const Settings = ({ isOpen, onClose }) => {
  const { aiSettings, setAIProvider, setAIModel, setAPIKey } = useEditorStore();
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showKey, setShowKey] = useState({ openai: false, anthropic: false });

  if (!isOpen) return null;

  const currentProvider = AI_PROVIDERS[aiSettings.provider];
  const availableModels = currentProvider?.models || [];

  const handleProviderChange = (newProvider) => {
    setAIProvider(newProvider);
    // Set default model for new provider
    const providerConfig = AI_PROVIDERS[newProvider];
    if (providerConfig?.models?.length > 0) {
      setAIModel(providerConfig.models[0].id);
    }
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    const provider = aiSettings.provider;
    const apiKey = aiSettings.apiKeys[provider];

    if (provider !== 'mock' && !apiKey) {
      setTestResult({ success: false, message: 'Please enter an API key first' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const result = await testAPIConnection(provider, apiKey);
    setTestResult(result);
    setIsTesting(false);
  };

  const toggleShowKey = (provider) => {
    setShowKey(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  return (
    <div
      className="modal-backdrop flex items-center justify-center p-4 z-[9999]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div
        className="w-full rounded-xl border overflow-hidden"
        style={{
          maxWidth: '480px',
          borderColor: 'var(--border-color)',
          backgroundColor: 'var(--surface)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                AI Settings
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Configure your AI provider
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors hover:bg-[var(--surface-muted)]"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Provider Selection */}
          <div>
            <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
              AI Provider
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
                <button
                  key={key}
                  onClick={() => handleProviderChange(key)}
                  className="p-3 rounded-lg border text-sm font-medium transition-all"
                  style={{
                    borderColor: aiSettings.provider === key ? 'var(--accent)' : 'var(--border-color)',
                    backgroundColor: aiSettings.provider === key ? 'var(--accent-light)' : 'transparent',
                    color: aiSettings.provider === key ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  {provider.name}
                </button>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          {availableModels.length > 1 && (
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
                Model
              </label>
              <select
                value={aiSettings.model}
                onChange={(e) => setAIModel(e.target.value)}
                className="w-full p-2.5 rounded-lg border text-sm"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--surface-muted)',
                  color: 'var(--foreground)',
                }}
              >
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* API Key Input - OpenAI */}
          {aiSettings.provider === 'openai' && (
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
                OpenAI API Key
              </label>
              <div className="relative">
                <input
                  type={showKey.openai ? 'text' : 'password'}
                  value={aiSettings.apiKeys.openai || ''}
                  onChange={(e) => setAPIKey('openai', e.target.value)}
                  placeholder="sk-..."
                  className="w-full p-2.5 pr-10 rounded-lg border text-sm font-mono"
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--surface-muted)',
                    color: 'var(--foreground)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('openai')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showKey.openai ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                Get your key at{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent)' }}
                >
                  platform.openai.com
                </a>
              </p>
            </div>
          )}

          {/* API Key Input - Anthropic */}
          {aiSettings.provider === 'anthropic' && (
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-muted)' }}>
                Anthropic API Key
              </label>
              <div className="relative">
                <input
                  type={showKey.anthropic ? 'text' : 'password'}
                  value={aiSettings.apiKeys.anthropic || ''}
                  onChange={(e) => setAPIKey('anthropic', e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full p-2.5 pr-10 rounded-lg border text-sm font-mono"
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--surface-muted)',
                    color: 'var(--foreground)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('anthropic')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showKey.anthropic ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                Get your key at{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent)' }}
                >
                  console.anthropic.com
                </a>
              </p>
            </div>
          )}

          {/* Mock Mode Info */}
          {aiSettings.provider === 'mock' && (
            <div
              className="p-3 rounded-lg border"
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--surface-muted)',
              }}
            >
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Mock mode returns simulated AI responses for testing. No API key required.
              </p>
            </div>
          )}

          {/* Security Warning */}
          {aiSettings.provider !== 'mock' && (
            <div
              className="px-3 py-2 rounded-lg flex items-center gap-2"
              style={{ backgroundColor: 'rgba(251, 191, 36, 0.08)' }}
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#fbbf24' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-[11px]" style={{ color: '#d97706' }}>
                Keys stored in browser only
              </p>
            </div>
          )}

          {/* Test Connection Result - inline style */}
          {testResult && (
            <div
              className="px-3 py-2 rounded-lg flex items-center gap-2"
              style={{
                backgroundColor: testResult.success ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              }}
            >
              {testResult.success ? (
                <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#22c55e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#ef4444' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <p className="text-[11px]" style={{ color: testResult.success ? '#22c55e' : '#ef4444' }}>
                {testResult.message}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 border-t flex justify-between"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--surface-muted)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              opacity: isTesting ? 0.6 : 1,
            }}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'white',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
