import { Workspace } from '../types';

// Local storage keys
const WORKSPACES_KEY = 'mcp-workspaces';
const CURRENT_WORKSPACE_KEY = 'mcp-current-workspace';

// Helper function to parse dates in workspace objects
const parseDates = (workspace: any): Workspace => {
  return {
    ...workspace,
    createdAt: new Date(workspace.createdAt),
    updatedAt: new Date(workspace.updatedAt)
  };
};

/**
 * Get all workspaces from local storage
 */
export const getWorkspaces = (): Workspace[] => {
  const workspacesJson = localStorage.getItem(WORKSPACES_KEY);
  
  if (!workspacesJson) {
    return [];
  }
  
  try {
    const parsedWorkspaces = JSON.parse(workspacesJson);
    return parsedWorkspaces.map(parseDates);
  } catch (error) {
    console.error('Error parsing workspaces:', error);
    return [];
  }
};

/**
 * Save all workspaces to local storage
 */
export const saveWorkspaces = (workspaces: Workspace[]): void => {
  localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
};

/**
 * Create a new workspace
 */
export const createWorkspace = (
  name: string,
  rootPath: string,
  description: string = '',
  icon: string = '',
  color: string = ''
): Workspace => {
  const workspaces = getWorkspaces();
  
  const newWorkspace: Workspace = {
    id: Date.now().toString(),
    name,
    rootPath,
    description,
    createdAt: new Date(),
    updatedAt: new Date(),
    icon,
    color
  };
  
  saveWorkspaces([...workspaces, newWorkspace]);
  
  return newWorkspace;
};

/**
 * Get a workspace by ID
 */
export const getWorkspaceById = (id: string): Workspace | undefined => {
  const workspaces = getWorkspaces();
  return workspaces.find(workspace => workspace.id === id);
};

/**
 * Update a workspace
 */
export const updateWorkspace = (updatedWorkspace: Workspace): void => {
  const workspaces = getWorkspaces();
  const index = workspaces.findIndex(workspace => workspace.id === updatedWorkspace.id);
  
  if (index !== -1) {
    // Update the workspace with new data and update timestamp
    workspaces[index] = {
      ...updatedWorkspace,
      updatedAt: new Date()
    };
    saveWorkspaces(workspaces);
  }
};

/**
 * Delete a workspace
 */
export const deleteWorkspace = (id: string): void => {
  const workspaces = getWorkspaces();
  const filteredWorkspaces = workspaces.filter(workspace => workspace.id !== id);
  
  // If we're deleting the current workspace, clear the current workspace
  const currentId = getCurrentWorkspaceId();
  if (currentId === id) {
    clearCurrentWorkspace();
  }
  
  saveWorkspaces(filteredWorkspaces);
};

/**
 * Set the current workspace
 */
export const setCurrentWorkspace = (id: string): void => {
  localStorage.setItem(CURRENT_WORKSPACE_KEY, id);
};

/**
 * Get the current workspace ID
 */
export const getCurrentWorkspaceId = (): string | null => {
  return localStorage.getItem(CURRENT_WORKSPACE_KEY);
};

/**
 * Get the current workspace
 */
export const getCurrentWorkspace = (): Workspace | undefined => {
  const currentId = getCurrentWorkspaceId();
  
  if (!currentId) {
    return undefined;
  }
  
  return getWorkspaceById(currentId);
};

/**
 * Clear the current workspace
 */
export const clearCurrentWorkspace = (): void => {
  localStorage.removeItem(CURRENT_WORKSPACE_KEY);
};

/**
 * Ensure there's a current workspace selected
 * If none is selected, select the first available workspace
 * If no workspaces exist, create a default workspace
 */
export const ensureCurrentWorkspace = (): Workspace => {
  const currentWorkspace = getCurrentWorkspace();
  
  if (currentWorkspace) {
    return currentWorkspace;
  }
  
  // No current workspace, check if there are any workspaces
  const workspaces = getWorkspaces();
  
  if (workspaces.length > 0) {
    // Use the most recent workspace
    const mostRecent = workspaces.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    setCurrentWorkspace(mostRecent.id);
    return mostRecent;
  }
  
  // No workspaces at all, create a default one
  const defaultWorkspace = createWorkspace('Default Workspace', '/', 'Default workspace created automatically');
  setCurrentWorkspace(defaultWorkspace.id);
  return defaultWorkspace;
};
