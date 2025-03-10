import React from 'react';
import Markdown from 'marked-react';
import '../styles/ChatMessage.css';
import { formatTimestamp } from '../utils/dateHelpers';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, timestamp }) => {
  return (
    <div className={`message-wrapper ${role}`}>
      <div className={`message ${role}`}>
        <div className="message-content">
          {role === 'assistant' ? (
            <Markdown>
              {content}
            </Markdown>
          ) : (
            content
          )}
        </div>
        <div className="message-timestamp">{formatTimestamp(timestamp)}</div>
      </div>
    </div>
  );
};

export default ChatMessage;
