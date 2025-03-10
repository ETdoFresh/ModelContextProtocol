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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    // Initialize MCP clients when the app loads
    setupMcpClients().catch(error => {
      console.error('Failed to setup MCP clients:', error);
    });

    // Add window resize listener to detect mobile/desktop
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      // Auto-open sidebar on desktop view
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <Router>
      <div className="app">
        <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <div className="content-wrapper">
          <Sidebar isOpen={isSidebarOpen} />
          <main className={`main-content ${isSidebarOpen && !isMobile ? 'with-sidebar' : ''}`}>
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
