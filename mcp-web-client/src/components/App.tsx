import React, { useEffect } from 'react';
import ChatInterface from './ChatInterface';
import Header from './Header';
import { setupMcpClients } from '../services/mcpService';
import '../styles/App.css';

const App: React.FC = () => {
  useEffect(() => {
    // Initialize MCP clients when the app loads
    setupMcpClients().catch(error => {
      console.error('Failed to setup MCP clients:', error);
    });
  }, []);

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <ChatInterface />
      </main>
    </div>
  );
};

export default App;
