import React from 'react';
import ThemeToggle from './ThemeToggle';
import WorkspaceSelector from './WorkspaceSelector';
import { FaBars, FaTimes } from 'react-icons/fa';
import '../styles/Header.css';

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen }) => {
  return (
    <header className="header">
      <div className="container header-container">
        <div className="header-left">
          <button 
            className={`menu-toggle ${isSidebarOpen ? 'active' : ''}`} 
            onClick={toggleSidebar}
            aria-label="Toggle menu"
          >
            {isSidebarOpen ? <FaTimes /> : <FaBars />}
          </button>
          <h1>MCP Web Chat Interface</h1>
        </div>
        <div className="header-actions">
          <WorkspaceSelector />
          <div className="model-info">
            <span>Model: google/gemini-2.0-flash-001</span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;
