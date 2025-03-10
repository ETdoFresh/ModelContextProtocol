import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { getChatSessions, createChatSession, deleteChatSession, updateChatSession, setCurrentChatSession } from '../services/chatService';
import { ChatSession } from '../types';
import '../styles/ChatSessions.css';

interface EditModalProps {
  session: ChatSession;
  onSave: (session: ChatSession, newTitle: string) => void;
  onCancel: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ session, onSave, onCancel }) => {
  const [title, setTitle] = useState(session.title);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(session, title);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Edit Chat Session</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ChatSessions: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [editingSession, setEditingSession] = useState<ChatSession | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Load chat sessions when component mounts
    loadSessions();
  }, []);

  const loadSessions = () => {
    const loadedSessions = getChatSessions();
    // Sort by most recently updated
    loadedSessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    setSessions(loadedSessions);
  };

  const handleCreateSession = () => {
    createChatSession();
    loadSessions();
    navigate('/');
  };

  const handleSelectSession = (session: ChatSession) => {
    setCurrentChatSession(session.id);
    navigate('/');
  };

  const handleEditSession = (session: ChatSession) => {
    setEditingSession(session);
  };

  const handleSaveEdit = (session: ChatSession, newTitle: string) => {
    const updatedSession = {
      ...session,
      title: newTitle,
      updatedAt: new Date()
    };
    updateChatSession(updatedSession);
    setEditingSession(null);
    loadSessions();
  };

  const handleDeleteSession = (sessionId: string) => {
    if (window.confirm('Are you sure you want to delete this chat session?')) {
      deleteChatSession(sessionId);
      loadSessions();
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="chat-sessions-container">
      <div className="chat-sessions-header">
        <h2>Chat Sessions</h2>
        <button className="btn btn-primary create-session" onClick={handleCreateSession}>
          <FaPlus /> New Chat
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-sessions">
          <p>No chat sessions found. Create a new chat to get started.</p>
        </div>
      ) : (
        <div className="sessions-list">
          {sessions.map((session) => (
            <div key={session.id} className="session-item">
              <div 
                className="session-info" 
                onClick={() => handleSelectSession(session)}
              >
                <h3 className="session-title">{session.title}</h3>
                <div className="session-meta">
                  <span className="message-count">{session.messages.length} messages</span>
                  <span className="session-date">{formatDate(session.updatedAt)}</span>
                </div>
              </div>
              <div className="session-actions">
                <button 
                  className="btn btn-icon" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditSession(session);
                  }}
                  aria-label="Edit session"
                >
                  <FaEdit />
                </button>
                <button 
                  className="btn btn-icon delete" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSession(session.id);
                  }}
                  aria-label="Delete session"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingSession && (
        <EditModal
          session={editingSession}
          onSave={handleSaveEdit}
          onCancel={() => setEditingSession(null)}
        />
      )}
    </div>
  );
};

export default ChatSessions;
