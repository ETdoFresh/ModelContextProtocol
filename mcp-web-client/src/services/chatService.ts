import { ChatSession, Message } from '../types';

// Local storage key for chat sessions
const CHAT_SESSIONS_KEY = 'mcp-chat-sessions';
const CURRENT_SESSION_KEY = 'mcp-current-session';

// Helper function to convert string dates back to Date objects
const parseDates = (session: any): ChatSession => {
  return {
    ...session,
    createdAt: new Date(session.createdAt),
    updatedAt: new Date(session.updatedAt),
    messages: session.messages.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }))
  };
};

// Get all chat sessions from local storage
export const getChatSessions = (): ChatSession[] => {
  const sessionsJson = localStorage.getItem(CHAT_SESSIONS_KEY);
  console.log('Raw sessions from localStorage:', sessionsJson);
  
  if (!sessionsJson) {
    console.log('No sessions found in localStorage');
    return [];
  }
  
  try {
    const parsedSessions = JSON.parse(sessionsJson);
    console.log('Parsed sessions:', parsedSessions);
    // Convert string dates back to Date objects
    return parsedSessions.map(parseDates);
  } catch (error) {
    console.error('Error parsing chat sessions:', error);
    return [];
  }
};

// Save all chat sessions to local storage
export const saveChatSessions = (sessions: ChatSession[]): void => {
  console.log('Saving sessions to localStorage:', sessions);
  localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
};

// Create a new chat session
export const createChatSession = (title: string = 'New Chat'): ChatSession => {
  const sessions = getChatSessions();
  
  const newSession: ChatSession = {
    id: Date.now().toString(),
    title,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  console.log('Creating new session:', newSession);
  
  // Save the new session
  saveChatSessions([...sessions, newSession]);
  
  // Set as current session
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
  console.log('deleteChatSession called with id:', id);
  
  try {
    // Get raw data from localStorage first
    const rawData = localStorage.getItem(CHAT_SESSIONS_KEY);
    console.log('Raw data from localStorage:', rawData);
    
    if (!rawData) {
      console.log('No sessions found in localStorage');
      return;
    }
    
    // Parse the raw data
    const rawSessions = JSON.parse(rawData);
    console.log('Raw parsed sessions:', rawSessions);
    
    // Filter out the session to delete
    const filteredSessions = rawSessions.filter((session: any) => String(session.id) !== String(id));
    console.log('Filtered sessions after deletion:', filteredSessions);
    
    // Save the filtered sessions back to localStorage
    localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(filteredSessions));
    console.log('Sessions saved after deletion');
    
    // If the current session was deleted, clear it
    const currentId = localStorage.getItem(CURRENT_SESSION_KEY);
    console.log('Current session ID:', currentId);
    
    if (String(currentId) === String(id)) {
      console.log('Clearing current chat session as it was deleted');
      localStorage.removeItem(CURRENT_SESSION_KEY);
    }
  } catch (error) {
    console.error('Error in deleteChatSession:', error);
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
  console.log('Setting current chat session to:', id);
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
  
  if (currentSession) {
    return currentSession;
  }
  
  // No current session, check if there are any sessions
  const sessions = getChatSessions();
  
  if (sessions.length > 0) {
    // Use the most recent session
    const mostRecent = sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    setCurrentChatSession(mostRecent.id);
    return mostRecent;
  }
  
  // No sessions at all, create a new one
  return createChatSession();
};
