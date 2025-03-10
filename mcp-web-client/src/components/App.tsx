import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ChatInterface from './ChatInterface';
import Header from './Header';
import Sidebar from './Sidebar';
import McpView from './McpView';
import ChatSessions from './ChatSessions';
import Settings from './Settings';
import { setupMcpClients } from '../services/mcpService';
import '../styles/App.css';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Initialize MCP clients when the app loads
    setupMcpClients().catch(error => {
      console.error('Failed to setup MCP clients:', error);
    });
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <Router>
      <div className="app">
        <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <div className="app-body">
          {isSidebarOpen && (
            <div className="sidebar-container">
              <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            </div>
          )}
          <main className="main-content">
            <Routes>
              <Route path="/" element={<ChatInterface />} />
              <Route path="/mcp-view" element={<McpView />} />
              <Route path="/chat-sessions" element={<ChatSessions />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;
