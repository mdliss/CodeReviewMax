/**
 * AI Service for code review interactions
 * Handles API requests to OpenAI or mock service
 * Includes caching and optimization features
 */

const MOCK_MODE = true; // Set to false to use real OpenAI API

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
  // Remove expired cache entry
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

  // Limit cache size to 50 entries
  if (responseCache.size > 50) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
};

/**
 * Structure the API request payload
 * @param {Object} selection - Selected code information
 * @param {string} fullCode - Complete code context
 * @param {string} userQuestion - User's question about the code
 * @returns {Object} Structured API request
 */
export const createAIRequest = (selection, fullCode, userQuestion = '') => {
  const { selectedText, startLineNumber, endLineNumber } = selection;

  // Get context around selection (5 lines before and after)
  const codeLines = fullCode.split('\n');
  const contextStart = Math.max(0, startLineNumber - 6);
  const contextEnd = Math.min(codeLines.length, endLineNumber + 5);
  const contextCode = codeLines.slice(contextStart, contextEnd).join('\n');

  const systemPrompt = `You are an expert code reviewer. Analyze the selected code and provide helpful insights, suggestions, or explanations.`;

  const userPrompt = `
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

  return {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 500
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
      text: `Interesting code snippet! Here's my analysis:\n\n• Good use of recursion\n• Consider memoization for better performance\n• The base case is handled correctly`,
      confidence: 0.92
    },
    {
      text: `Code review feedback:\n\n• This implementation is efficient\n• Consider adding JSDoc comments\n• Type checking could improve robustness`,
      confidence: 0.78
    }
  ];

  // Return a random mock response
  return responses[Math.floor(Math.random() * responses.length)];
};

/**
 * Send request to AI API
 * @param {Object} selection - Selected code information
 * @param {string} fullCode - Complete code context
 * @param {string} userQuestion - Optional user question
 * @returns {Promise<Object>} AI response
 */
export const queryAI = async (selection, fullCode, userQuestion = '') => {
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

  if (MOCK_MODE) {
    // Simulate API delay (reduced for better UX)
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

    const mockResponse = getMockResponse(selection.selectedText);
    const response = {
      success: true,
      response: mockResponse.text,
      confidence: mockResponse.confidence,
      mock: true
    };

    // Cache the response
    cacheResponse(cacheKey, response);
    return response;
  }

  try {
    const requestPayload = createAIRequest(selection, fullCode, userQuestion);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    // Real OpenAI API call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const result = {
      success: true,
      response: data.choices[0].message.content,
      usage: data.usage,
      mock: false
    };

    // Cache successful response
    cacheResponse(cacheKey, result);
    return result;
  } catch (error) {
    console.error('AI API Error:', error);

    // Better error messages
    let errorMessage = error.message;
    if (error.name === 'AbortError') {
      errorMessage = 'Request timeout - please try again';
    } else if (error.message.includes('API error: 401')) {
      errorMessage = 'Invalid API key';
    } else if (error.message.includes('API error: 429')) {
      errorMessage = 'Rate limit exceeded - please try again later';
    }

    return {
      success: false,
      error: errorMessage,
      mock: false
    };
  }
};

/**
 * Format AI response for display
 * @param {Object} aiResponse - Response from AI
 * @returns {Object} Formatted response
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
    confidence: aiResponse.confidence
  };
};
