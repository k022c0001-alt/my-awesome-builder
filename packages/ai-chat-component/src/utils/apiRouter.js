/**
 * apiRouter.js
 * ============
 * Routes chat messages to the appropriate API endpoint based on
 * the content of the user's message (SQL vs CSS/styling).
 */

import API_ENDPOINTS from '../config/apiEndpoints.js';
import { detectLanguage, isStylingLanguage, isSQLLanguage, LANGUAGES } from './languageDetector.js';
import { getAuthHeader } from './apiKeyManager.js';

/** Routing intents */
export const ROUTE_INTENT = {
  SQL: 'sql',
  CSS: 'css',
  DEFAULT: 'default',
};

/**
 * Determine which API to use for a given message.
 *
 * @param {string} message - The user's message text
 * @returns {{ intent: string, endpoint: string, language: string, confidence: number }}
 */
export function resolveRoute(message) {
  const { language, confidence, scores } = detectLanguage(message);

  if (isSQLLanguage(language)) {
    return {
      intent: ROUTE_INTENT.SQL,
      endpoint: API_ENDPOINTS.SQL_CHAT,
      language,
      confidence,
    };
  }

  if (isStylingLanguage(language)) {
    return {
      intent: ROUTE_INTENT.CSS,
      endpoint: API_ENDPOINTS.CSS_CHAT,
      language,
      confidence,
    };
  }

  // If scores are too close to distinguish, prefer the higher-scored one
  const sqlScore = scores[LANGUAGES.SQL] ?? 0;

  // Track which specific CSS-related language scored highest
  const cssLangScores = [
    [LANGUAGES.CSS, scores[LANGUAGES.CSS] ?? 0],
    [LANGUAGES.TAILWIND, scores[LANGUAGES.TAILWIND] ?? 0],
    [LANGUAGES.SCSS, scores[LANGUAGES.SCSS] ?? 0],
    [LANGUAGES.POSTCSS, scores[LANGUAGES.POSTCSS] ?? 0],
    [LANGUAGES.STYLED_COMPONENTS, scores[LANGUAGES.STYLED_COMPONENTS] ?? 0],
    [LANGUAGES.CSS_MODULES, scores[LANGUAGES.CSS_MODULES] ?? 0],
  ];
  const [topCSSLang, cssScore] = cssLangScores.reduce(
    (best, curr) => (curr[1] > best[1] ? curr : best),
    cssLangScores[0],
  );

  if (sqlScore > cssScore && sqlScore > 0) {
    return {
      intent: ROUTE_INTENT.SQL,
      endpoint: API_ENDPOINTS.SQL_CHAT,
      language: LANGUAGES.SQL,
      confidence: Math.min(sqlScore / 5, 1),
    };
  }

  if (cssScore > sqlScore && cssScore > 0) {
    return {
      intent: ROUTE_INTENT.CSS,
      endpoint: API_ENDPOINTS.CSS_CHAT,
      language: topCSSLang,
      confidence: Math.min(cssScore / 5, 1),
    };
  }

  return {
    intent: ROUTE_INTENT.DEFAULT,
    endpoint: API_ENDPOINTS.DEFAULT_CHAT,
    language: LANGUAGES.UNKNOWN,
    confidence: 0,
  };
}

/**
 * Send a chat message to the appropriate API endpoint.
 *
 * @param {object} params
 * @param {string} params.message - The user's message
 * @param {Array<{role:string,content:string}>} params.history - Conversation history
 * @param {string} [params.dbPath] - Optional database path (for SQL API)
 * @param {object} [params.endpointOverrides] - Override specific endpoints
 * @returns {Promise<{ reply: string, source: string, intent: string, language: string }>}
 */
export async function sendMessage({ message, history = [], dbPath = '', endpointOverrides = {} }) {
  const { intent, endpoint: defaultEndpoint, language } = resolveRoute(message);

  const endpoint = endpointOverrides[intent] ?? defaultEndpoint;

  // Select auth header based on routing intent
  const authProvider = intent === ROUTE_INTENT.SQL ? 'SQL_API' : 'CSS_API';
  const authHeader = getAuthHeader(authProvider);

  const body = {
    message,
    history,
    mode: 'custom',
    language,
  };

  if (intent === ROUTE_INTENT.SQL) {
    body.db_type = 'sqlite';
    body.db_path = dbPath;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  return {
    reply: data.reply ?? data.message ?? data.content ?? '',
    source: data.source ?? intent,
    intent,
    language,
  };
}

export default { resolveRoute, sendMessage };
