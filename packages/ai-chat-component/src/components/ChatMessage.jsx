/**
 * ChatMessage.jsx
 * ===============
 * Renders a single chat message bubble.
 * Supports user, AI, and error message roles.
 */

import React from 'react';

/**
 * Small badge showing which API/source answered the message.
 */
function SourceBadge({ source }) {
  if (!source) return null;
  const labels = {
    sql: 'SQL API',
    css: 'CSS API',
    default: 'AI',
  };
  const label = labels[source] ?? source;
  return (
    <span className="ai-chat__source-badge" aria-label={`Answered by ${label}`}>
      {label}
    </span>
  );
}

/**
 * @param {object}  props
 * @param {'user'|'ai'} props.role
 * @param {string}  props.text
 * @param {string}  [props.source]   - API source badge (e.g. "sql", "css")
 * @param {boolean} [props.isError]
 */
function ChatMessage({ role, text, source, isError }) {
  const isUser = role === 'user';

  const bubbleClass = [
    'ai-chat__bubble',
    isUser ? 'ai-chat__bubble--user' : 'ai-chat__bubble--ai',
    isError ? 'ai-chat__bubble--error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`ai-chat__message ${isUser ? 'ai-chat__message--user' : 'ai-chat__message--ai'}`}>
      {!isUser && (
        <div className="ai-chat__avatar" aria-hidden="true">
          {isError ? '⚠️' : '🤖'}
        </div>
      )}
      <div className={bubbleClass}>
        {/* Render newlines as <br /> for multi-line AI responses */}
        {text.split('\n').map((line, i, lines) => (
          <React.Fragment key={i}>
            {line}
            {i < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
        {!isUser && !isError && <SourceBadge source={source} />}
      </div>
      {isUser && (
        <div className="ai-chat__avatar ai-chat__avatar--user" aria-hidden="true">
          👤
        </div>
      )}
    </div>
  );
}

export default ChatMessage;
