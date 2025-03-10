import { ChatSession, Message } from '../types';

// Local storage key for chat sessions
const CHAT_SESSIONS_KEY = 'mcp-chat-sessions';
const CURRENT_SESSION_KEY = 'mcp-current-session';

// Get all chat sessions from local storage
export const getChatSessions = (): ChatSession[] => {
  const sessionsJson = localStorage.getItem(CHAT_SESSIONS_KEY);
  if (!sessionsJson) return [];
  
  try {
    // Parse the sessions and ensure dates are properly converted
    const sessions = JSON.parse(sessionsJson) as ChatSession[];
    return sessions.map(session => ({
      ...session,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt),
      messages: session.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    }));
  } catch (error) {
    console.error('Error parsing chat sessions:', error);
    return [];
  }
};

// Save all chat sessions to local storage
export const saveChatSessions = (sessions: ChatSession[]): void => {
  localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
};

// Create a new chat session
export const createChatSession = (title: string = 'New Chat'): ChatSession => {
  const newSession: ChatSession = {
    id: Date.now().toString(),
    title,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const sessions = getChatSessions();
  saveChatSessions([...sessions, newSession]);
  setCurrentChatSession(newSession.id);
  
  return newSession;
};

// Get a specific chat session by ID
export const getChatSessionById = (id: string): ChatSession | undefined => {
  const sessions = getChatSessions();
  return sessions.find(session => session.id === id);
};

// Update a chat session
export const updateChatSession = (updatedSession: ChatSession): void => {
  const sessions = getChatSessions();
  const index = sessions.findIndex(session => session.id === updatedSession.id);
  
  if (index !== -1) {
    // Update the session with the new data and update timestamp
    sessions[index] = {
      ...updatedSession,
      updatedAt: new Date()
    };
    saveChatSessions(sessions);
  }
};

// Delete a chat session
export const deleteChatSession = (id: string): void => {
  const sessions = getChatSessions();
  const filteredSessions = sessions.filter(session => session.id !== id);
  saveChatSessions(filteredSessions);
  
  // If the current session was deleted, set current to undefined
  if (getCurrentChatSessionId() === id) {
    clearCurrentChatSession();
  }
};

// Add a message to a chat session
export const addMessageToChatSession = (sessionId: string, message: Message): void => {
  const sessions = getChatSessions();
  const index = sessions.findIndex(session => session.id === sessionId);
  
  if (index !== -1) {
    sessions[index].messages.push(message);
    sessions[index].updatedAt = new Date();
    saveChatSessions(sessions);
  }
};

// Set the current chat session ID
export const setCurrentChatSession = (id: string): void => {
  localStorage.setItem(CURRENT_SESSION_KEY, id);
};

// Get the current chat session ID
export const getCurrentChatSessionId = (): string | null => {
  return localStorage.getItem(CURRENT_SESSION_KEY);
};

// Get the current chat session
export const getCurrentChatSession = (): ChatSession | undefined => {
  const currentId = getCurrentChatSessionId();
  if (!currentId) return undefined;
  
  return getChatSessionById(currentId);
};

// Clear the current chat session
export const clearCurrentChatSession = (): void => {
  localStorage.removeItem(CURRENT_SESSION_KEY);
};

// Ensure there's always a current chat session
export const ensureCurrentChatSession = (): ChatSession => {
  const currentSession = getCurrentChatSession();
  if (currentSession) return currentSession;
  
  const sessions = getChatSessions();
  if (sessions.length > 0) {
    // Set the most recently updated session as current
    const mostRecent = sessions.sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    setCurrentChatSession(mostRecent.id);
    return mostRecent;
  }
  
  // If no sessions exist, create a new one
  return createChatSession('New Chat');
};
