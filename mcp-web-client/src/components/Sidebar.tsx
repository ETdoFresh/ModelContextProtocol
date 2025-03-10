import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaComments, FaCog, FaServer } from 'react-icons/fa';
import '../styles/Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  return (
    <div className="sidebar">
      <nav className="sidebar-nav">
        <NavLink to="/mcp-view" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <FaServer />
          <span>View MCPs</span>
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
