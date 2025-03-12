import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import MessageInput from './MessageInput';
import { getModelResponse } from '../services/openRouterService';
import { callMcpFunction } from '../services/mcpService';
import { ensureCurrentChatSession, getCurrentChatSession, updateChatSession } from '../services/chatService';
import { ensureCurrentWorkspace, getCurrentWorkspace } from '../services/workspaceService';
import { WORKSPACE_CHANGE_EVENT } from './WorkspaceSelector';
import { Message, Workspace } from '../types';
import '../styles/ChatInterface.css';

const ChatInterface: React.FC = () => {
  const [currentSession, setCurrentSession] = useState(ensureCurrentChatSession());
  const [currentWorkspace, setCurrentWorkspace] = useState(ensureCurrentWorkspace());
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Ensure we have a current session and workspace when component mounts
    const session = ensureCurrentChatSession();
    const workspace = ensureCurrentWorkspace();
    
    // Update the session with the current workspace info
    const updatedSession = {
      ...session,
      workspaceId: workspace.id,
      currentWorkingDirectory: workspace.rootPath
    };
    
    setCurrentSession(updatedSession);
    updateChatSession(updatedSession);
    setCurrentWorkspace(workspace);
  }, []);

  useEffect(() => {
    // Listen for workspace change events
    const handleWorkspaceChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const workspace = customEvent.detail.workspace as Workspace;
      
      setCurrentWorkspace(workspace);
      
      // Update the current session with the new workspace info
      const updatedSession = {
        ...currentSession,
        workspaceId: workspace.id,
        currentWorkingDirectory: workspace.rootPath
      };
      
      setCurrentSession(updatedSession);
      updateChatSession(updatedSession);
    };
    
    document.addEventListener(WORKSPACE_CHANGE_EVENT, handleWorkspaceChange);
    
    return () => {
      document.removeEventListener(WORKSPACE_CHANGE_EVENT, handleWorkspaceChange);
    };
  }, [currentSession]);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession.messages]);

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
    
    // Add message to current session
    const updatedSession = {
      ...currentSession,
      messages: [...currentSession.messages, userMessage],
      updatedAt: new Date(),
      workspaceId: currentWorkspace.id,
      currentWorkingDirectory: currentWorkspace.rootPath
    };
    setCurrentSession(updatedSession);
    updateChatSession(updatedSession);
    
    setIsLoading(true);
    
    try {
      // Check if this is an MCP function call
      if (content.startsWith('/mcp ')) {
        await handleMcpCommand(content.substring(5));
      } else {
        // Get response from model
        const response = await getModelResponse(content, currentSession.messages);
        
        // Add assistant message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };
        
        // Update session with assistant message
        const finalSession = {
          ...updatedSession,
          messages: [...updatedSession.messages, assistantMessage],
          updatedAt: new Date()
        };
        setCurrentSession(finalSession);
        updateChatSession(finalSession);
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
      
      // Update session with error message
      const errorSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, errorMessage],
        updatedAt: new Date()
      };
      setCurrentSession(errorSession);
      updateChatSession(errorSession);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMcpCommand = async (command: string) => {
    // Simple parsing of MCP commands in format: serverName.functionName(params)
    const match = command.match(/^([\w-]+)\.([\w-]+)(?:\((.+)\))?$/);
    
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
    
    // Update current session with the result
    const updatedSession = {
      ...currentSession,
      messages: [...currentSession.messages, assistantMessage],
      updatedAt: new Date()
    };
    setCurrentSession(updatedSession);
    updateChatSession(updatedSession);
  };

  return (
    <div className="chat-container">
      <div className="session-header">
        <h2>{currentSession.title}</h2>
        {currentWorkspace && (
          <div className="workspace-info">
            <span>Workspace: {currentWorkspace.name}</span>
            <span>Path: {currentWorkspace.rootPath}</span>
          </div>
        )}
      </div>
      <div className="messages-container">
        {currentSession.messages.length === 0 ? (
          <div className="empty-state">
            <p>Send a message to start the conversation</p>
            <p className="hint">Use /mcp serverName.functionName(params) to call MCP functions</p>
          </div>
        ) : (
          currentSession.messages.map((message) => (
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
