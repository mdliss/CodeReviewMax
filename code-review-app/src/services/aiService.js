/**
 * AI Service for code review interactions
 * Handles API requests to multiple AI providers (OpenAI, Anthropic)
 * Includes caching and optimization features
 */

// Provider configurations
export const AI_PROVIDERS = {
  mock: {
    name: 'Mock (Demo)',
    models: [{ id: 'mock', name: 'Mock Responses' }],
    requiresKey: false,
  },
  openai: {
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o (Latest)' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast)' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    ],
    requiresKey: true,
    keyPrefix: 'sk-',
  },
  anthropic: {
    name: 'Anthropic',
    models: [
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5 (Latest)' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Fast)' },
    ],
    requiresKey: true,
    keyPrefix: 'sk-ant-',
  },
};

// Simple in-memory cache for AI responses
const responseCache = new Map();
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate cache key from selection and code
 */
const getCacheKey = (selection, code) => {
  const { selectedText, startLineNumber, endLineNumber } = selection;
  return `${startLineNumber}-${endLineNumber}-${selectedText.substring(0, 100)}`;
};

/**
 * Get cached response if available and not expired
 */
const getCachedResponse = (cacheKey) => {
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
    return cached.response;
  }
  if (cached) {
    responseCache.delete(cacheKey);
  }
  return null;
};

/**
 * Cache a response
 */
const cacheResponse = (cacheKey, response) => {
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now()
  });

  if (responseCache.size > 50) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
};

/**
 * Create system prompt for code review
 */
const getSystemPrompt = () => {
  return `You are an expert code reviewer. Analyze the selected code and provide helpful insights, suggestions, or explanations. Be concise but thorough.`;
};

/**
 * Create user prompt with code context
 */
const createUserPrompt = (selection, fullCode, userQuestion) => {
  const { selectedText, startLineNumber, endLineNumber } = selection;

  const codeLines = fullCode.split('\n');
  const contextStart = Math.max(0, startLineNumber - 6);
  const contextEnd = Math.min(codeLines.length, endLineNumber + 5);
  const contextCode = codeLines.slice(contextStart, contextEnd).join('\n');

  return `
Here is some code context:

\`\`\`
${contextCode}
\`\`\`

The following code is selected (lines ${startLineNumber}-${endLineNumber}):

\`\`\`
${selectedText}
\`\`\`

${userQuestion ? `Question: ${userQuestion}` : 'Please review this code and provide helpful feedback.'}
  `.trim();
};

/**
 * Structure the API request payload for OpenAI
 */
export const createOpenAIRequest = (selection, fullCode, userQuestion, model, conversationHistory = []) => {
  // Build messages array
  const messages = [
    { role: 'system', content: getSystemPrompt() }
  ];

  // If we have conversation history, add the initial context then the history
  if (conversationHistory.length > 0) {
    // Add initial code context as first user message
    messages.push({ role: 'user', content: createUserPrompt(selection, fullCode, 'Review this code.') });
    // Add conversation history (skip the last message since it's the current question)
    conversationHistory.slice(0, -1).forEach(msg => {
      messages.push({ role: msg.role, content: msg.content });
    });
    // Add current question
    messages.push({ role: 'user', content: userQuestion });
  } else {
    messages.push({ role: 'user', content: createUserPrompt(selection, fullCode, userQuestion) });
  }

  return {
    model: model || 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 2048
  };
};

/**
 * Structure the API request payload for Anthropic
 */
export const createAnthropicRequest = (selection, fullCode, userQuestion, model, conversationHistory = []) => {
  // Build messages array
  const messages = [];

  // If we have conversation history, add the initial context then the history
  if (conversationHistory.length > 0) {
    // Add initial code context as first user message
    messages.push({ role: 'user', content: createUserPrompt(selection, fullCode, 'Review this code.') });
    // Add conversation history (skip the last message since it's the current question)
    conversationHistory.slice(0, -1).forEach(msg => {
      messages.push({ role: msg.role, content: msg.content });
    });
    // Add current question
    messages.push({ role: 'user', content: userQuestion });
  } else {
    messages.push({ role: 'user', content: createUserPrompt(selection, fullCode, userQuestion) });
  }

  return {
    model: model || 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    system: getSystemPrompt(),
    messages
  };
};

/**
 * Mock AI response for testing without API key
 */
const getMockResponse = (selectedText) => {
  const responses = [
    {
      text: `Great selection! This code looks clean. Here are some observations:\n\n• The function is well-structured\n• Consider adding error handling\n• Variable names are descriptive`,
      confidence: 0.85
    },
    {
      text: `Interesting code snippet! Here's my analysis:\n\n• Good use of modern JavaScript patterns\n• Consider memoization for better performance\n• The logic flow is clear and readable`,
      confidence: 0.92
    },
    {
      text: `Code review feedback:\n\n• This implementation is efficient\n• Consider adding JSDoc comments\n• Type checking could improve robustness`,
      confidence: 0.78
    }
  ];

  return responses[Math.floor(Math.random() * responses.length)];
};

/**
 * Call OpenAI API
 */
const callOpenAI = async (selection, fullCode, userQuestion, apiKey, model, conversationHistory = []) => {
  const requestPayload = createOpenAIRequest(selection, fullCode, userQuestion, model, conversationHistory);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestPayload),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const status = response.status;
    if (status === 401) throw new Error('Invalid OpenAI API key');
    if (status === 429) throw new Error('Rate limit exceeded - please try again later');
    throw new Error(`OpenAI API error: ${status}`);
  }

  const data = await response.json();
  return {
    success: true,
    response: data.choices[0].message.content,
    usage: data.usage,
    provider: 'openai',
    model: model
  };
};

/**
 * Call Anthropic API
 */
const callAnthropic = async (selection, fullCode, userQuestion, apiKey, model, conversationHistory = []) => {
  const requestPayload = createAnthropicRequest(selection, fullCode, userQuestion, model, conversationHistory);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify(requestPayload),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const status = response.status;
    if (status === 401) throw new Error('Invalid Anthropic API key');
    if (status === 429) throw new Error('Rate limit exceeded - please try again later');
    throw new Error(`Anthropic API error: ${status}`);
  }

  const data = await response.json();
  return {
    success: true,
    response: data.content[0].text,
    usage: data.usage,
    provider: 'anthropic',
    model: model
  };
};

/**
 * Send request to AI API
 * @param {Object} selection - Selected code information
 * @param {string} fullCode - Complete code context
 * @param {string} userQuestion - Optional user question
 * @param {Object} settings - AI settings (provider, model, apiKeys)
 * @param {Array} conversationHistory - Previous messages in the thread
 * @returns {Promise<Object>} AI response
 */
export const queryAI = async (selection, fullCode, userQuestion = '', settings = null, conversationHistory = []) => {
  // Default settings if not provided
  const aiSettings = settings || {
    provider: 'mock',
    model: 'mock',
    apiKeys: {}
  };

  const { provider, model, apiKeys } = aiSettings;

  // Check cache first
  const cacheKey = getCacheKey(selection, fullCode);
  const cachedResponse = getCachedResponse(cacheKey);

  if (cachedResponse) {
    console.log('Returning cached response');
    return {
      ...cachedResponse,
      cached: true
    };
  }

  // Mock mode
  if (provider === 'mock') {
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

    const mockResponse = getMockResponse(selection.selectedText);
    const response = {
      success: true,
      response: mockResponse.text,
      confidence: mockResponse.confidence,
      mock: true,
      provider: 'mock'
    };

    cacheResponse(cacheKey, response);
    return response;
  }

  try {
    let result;

    if (provider === 'openai') {
      const apiKey = apiKeys.openai || import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) throw new Error('OpenAI API key not configured');
      result = await callOpenAI(selection, fullCode, userQuestion, apiKey, model, conversationHistory);
    } else if (provider === 'anthropic') {
      const apiKey = apiKeys.anthropic || import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('Anthropic API key not configured');
      result = await callAnthropic(selection, fullCode, userQuestion, apiKey, model, conversationHistory);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }

    cacheResponse(cacheKey, result);
    return result;
  } catch (error) {
    console.error('AI API Error:', error);

    let errorMessage = error.message;
    if (error.name === 'AbortError') {
      errorMessage = 'Request timeout - please try again';
    }

    return {
      success: false,
      error: errorMessage,
      provider: provider
    };
  }
};

/**
 * Test API connection
 */
export const testAPIConnection = async (provider, apiKey) => {
  if (provider === 'mock') {
    return { success: true, message: 'Mock mode - no connection needed' };
  }

  try {
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (!response.ok) {
        if (response.status === 401) throw new Error('Invalid API key');
        throw new Error(`API error: ${response.status}`);
      }
      return { success: true, message: 'OpenAI connection successful!' };
    }

    if (provider === 'anthropic') {
      // Anthropic doesn't have a simple test endpoint, so we'll do a minimal message
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      });
      if (!response.ok) {
        if (response.status === 401) throw new Error('Invalid API key');
        throw new Error(`API error: ${response.status}`);
      }
      return { success: true, message: 'Anthropic connection successful!' };
    }

    return { success: false, message: 'Unknown provider' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

/**
 * Format AI response for display
 */
export const formatAIResponse = (aiResponse) => {
  if (!aiResponse.success) {
    return {
      text: `Error: ${aiResponse.error}`,
      type: 'error'
    };
  }

  return {
    text: aiResponse.response,
    type: 'success',
    isMock: aiResponse.mock,
    isCached: aiResponse.cached,
    confidence: aiResponse.confidence,
    provider: aiResponse.provider
  };
};

// Legacy export for backwards compatibility
export const createAIRequest = createOpenAIRequest;

/**
 * Stream OpenAI API response
 */
const streamOpenAI = async (selection, fullCode, userQuestion, apiKey, model, conversationHistory, onChunk) => {
  const requestPayload = {
    ...createOpenAIRequest(selection, fullCode, userQuestion, model, conversationHistory),
    stream: true
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestPayload)
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 401) throw new Error('Invalid OpenAI API key');
    if (status === 429) throw new Error('Rate limit exceeded - please try again later');
    throw new Error(`OpenAI API error: ${status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.trim() !== '');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            onChunk(content, fullText);
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  return {
    success: true,
    response: fullText,
    provider: 'openai',
    model: model
  };
};

/**
 * Stream Anthropic API response
 */
const streamAnthropic = async (selection, fullCode, userQuestion, apiKey, model, conversationHistory, onChunk) => {
  const requestPayload = {
    ...createAnthropicRequest(selection, fullCode, userQuestion, model, conversationHistory),
    stream: true
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify(requestPayload)
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 401) throw new Error('Invalid Anthropic API key');
    if (status === 429) throw new Error('Rate limit exceeded - please try again later');
    throw new Error(`Anthropic API error: ${status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.trim() !== '');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);

        try {
          const parsed = JSON.parse(data);
          // Anthropic sends content_block_delta events with text
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            const content = parsed.delta.text;
            fullText += content;
            onChunk(content, fullText);
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  return {
    success: true,
    response: fullText,
    provider: 'anthropic',
    model: model
  };
};

/**
 * Stream mock response for testing
 */
const streamMock = async (selectedText, onChunk) => {
  const mockResponse = getMockResponse(selectedText);
  const words = mockResponse.text.split(' ');
  let fullText = '';

  for (const word of words) {
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
    const chunk = (fullText ? ' ' : '') + word;
    fullText += chunk;
    onChunk(chunk, fullText);
  }

  return {
    success: true,
    response: fullText,
    mock: true,
    provider: 'mock'
  };
};

/**
 * Send streaming request to AI API
 * @param {Object} selection - Selected code information
 * @param {string} fullCode - Complete code context
 * @param {string} userQuestion - Optional user question
 * @param {Object} settings - AI settings (provider, model, apiKeys)
 * @param {Array} conversationHistory - Previous messages in the thread
 * @param {Function} onChunk - Callback for each chunk (chunk, fullText)
 * @returns {Promise<Object>} Final AI response
 */
export const queryAIStreaming = async (selection, fullCode, userQuestion = '', settings = null, conversationHistory = [], onChunk = () => {}) => {
  const aiSettings = settings || {
    provider: 'mock',
    model: 'mock',
    apiKeys: {}
  };

  const { provider, model, apiKeys } = aiSettings;

  // Mock mode
  if (provider === 'mock') {
    return await streamMock(selection.selectedText, onChunk);
  }

  try {
    let result;

    if (provider === 'openai') {
      const apiKey = apiKeys.openai || import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) throw new Error('OpenAI API key not configured');
      result = await streamOpenAI(selection, fullCode, userQuestion, apiKey, model, conversationHistory, onChunk);
    } else if (provider === 'anthropic') {
      const apiKey = apiKeys.anthropic || import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('Anthropic API key not configured');
      result = await streamAnthropic(selection, fullCode, userQuestion, apiKey, model, conversationHistory, onChunk);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }

    return result;
  } catch (error) {
    console.error('AI Streaming Error:', error);

    return {
      success: false,
      error: error.message,
      provider: provider
    };
  }
};
