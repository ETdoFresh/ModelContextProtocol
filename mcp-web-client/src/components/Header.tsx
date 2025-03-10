import React from 'react';
import ThemeToggle from './ThemeToggle';
import '../styles/Header.css';

const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="container header-container">
        <h1>MCP Web Chat Interface</h1>
        <div className="header-actions">
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
