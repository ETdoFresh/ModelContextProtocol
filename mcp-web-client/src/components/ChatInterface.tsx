import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import MessageInput from './MessageInput';
import { getModelResponse } from '../services/openRouterService';
import { callMcpFunction } from '../services/mcpService';
import { Message } from '../types';
import '../styles/ChatInterface.css';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setIsLoading(true);
    
    try {
      // Check if this is an MCP function call
      if (content.startsWith('/mcp ')) {
        await handleMcpCommand(content.substring(5));
      } else {
        // Get response from model
        const response = await getModelResponse(content, messages);
        
        // Add assistant message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };
        
        setMessages((prevMessages) => [...prevMessages, assistantMessage]);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date(),
      };
      
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMcpCommand = async (command: string) => {
    // Simple parsing of MCP commands in format: serverName.functionName(params)
    const match = command.match(/^([\w-]+)\.([\w-]+)(?:\((.*)\))?$/);
    
    if (!match) {
      throw new Error('Invalid MCP command format. Use: serverName.functionName(params)');
    }
    
    const [, serverName, functionName, paramsStr] = match;
    let params = {};
    
    if (paramsStr) {
      try {
        params = JSON.parse(paramsStr);
      } catch (e) {
        throw new Error('Invalid JSON parameters. Please provide valid JSON.');
      }
    }
    
    const result = await callMcpFunction(serverName, functionName, params);
    
    // Add assistant message with the result
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '```json\n' + JSON.stringify(result, null, 2) + '\n```',
      timestamp: new Date(),
    };
    
    setMessages((prevMessages) => [...prevMessages, assistantMessage]);
  };

  return (
    <div className="chat-container">
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>Send a message to start the conversation</p>
            <p className="hint">Use /mcp serverName.functionName(params) to call MCP functions</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
            />
          ))
        )}
        {isLoading && (
          <div className="loading-indicator">
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput onSendMessage={handleSendMessage} isDisabled={isLoading} />
    </div>
  );
};

export default ChatInterface;
