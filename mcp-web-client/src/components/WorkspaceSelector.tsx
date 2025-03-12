import React, { useState, useEffect, useRef } from 'react';
import { getWorkspaces, getCurrentWorkspace, setCurrentWorkspace } from '../services/workspaceService';
import { Workspace } from '../types';
import { FaFolder, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import '../styles/WorkspaceSelector.css';

// Define a custom event for workspace changes
export const WORKSPACE_CHANGE_EVENT = 'workspace-change';

// Custom event type for TypeScript
interface WorkspaceChangeEvent extends CustomEvent {
  detail: {
    workspace: Workspace;
  };
}

const WorkspaceSelector: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load workspaces and current workspace on component mount
    const loadedWorkspaces = getWorkspaces();
    setWorkspaces(loadedWorkspaces);
    
    const current = getCurrentWorkspace();
    setCurrentWorkspaceState(current);
  }, []);

  useEffect(() => {
    // Add click event listener to handle clicks outside the dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleWorkspaceChange = (workspace: Workspace) => {
    setCurrentWorkspace(workspace.id);
    setCurrentWorkspaceState(workspace);
    setIsOpen(false);
    
    // Dispatch a custom event to notify other components of the workspace change
    const workspaceChangeEvent = new CustomEvent(WORKSPACE_CHANGE_EVENT, { 
      detail: { workspace } 
    }) as WorkspaceChangeEvent;
    
    document.dispatchEvent(workspaceChangeEvent);
  };

  if (!currentWorkspace) {
    return null; // Don't render if no workspace is available
  }

  return (
    <div className="workspace-selector" ref={dropdownRef}>
      <div 
        className="workspace-selector-current"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="workspace-icon">
          <FaFolder color={currentWorkspace.color || '#64748b'} />
        </div>
        <div className="workspace-name">{currentWorkspace.name}</div>
        <div className="workspace-chevron">
          {isOpen ? <FaChevronUp /> : <FaChevronDown />}
        </div>
      </div>
      
      {isOpen && (
        <div className="workspace-dropdown">
          {workspaces.map(workspace => (
            <div 
              key={workspace.id}
              className={`workspace-option ${workspace.id === currentWorkspace.id ? 'active' : ''}`}
              onClick={() => handleWorkspaceChange(workspace)}
            >
              <div className="workspace-icon">
                <FaFolder color={workspace.color || '#64748b'} />
              </div>
              <div className="workspace-info">
                <div className="workspace-name">{workspace.name}</div>
                <div className="workspace-path">{workspace.rootPath}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkspaceSelector;
