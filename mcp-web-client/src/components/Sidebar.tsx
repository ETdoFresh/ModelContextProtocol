import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaComments, FaCog, FaNetworkWired, FaComment } from 'react-icons/fa';
import '../styles/Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  return (
    <div className="sidebar">
      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <FaComment />
          <span>Current Chat Session</span>
        </NavLink>
        <NavLink to="/mcp-servers" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <FaNetworkWired />
          <span>MCP Servers</span>
        </NavLink>
        <NavLink to="/chat-sessions" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <FaComments />
          <span>Chat Sessions</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <FaCog />
          <span>Settings</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default Sidebar;
