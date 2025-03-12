import {
  initializeDefaultWorkspace,
  getWorkspaces,
  getCurrentWorkspaceId,
  workspacesExist,
  clearCurrentWorkspace
} from '../workspaceService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Default Workspace Initialization', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should initialize a default workspace when none exists', () => {
    // Verify no workspaces exist initially
    expect(workspacesExist()).toBe(false);
    expect(getWorkspaces()).toHaveLength(0);
    
    // Initialize default workspace
    const defaultWorkspace = initializeDefaultWorkspace();
    
    // Verify a default workspace was created
    expect(defaultWorkspace).toBeDefined();
    expect(defaultWorkspace?.name).toBe('Default Workspace');
    expect(defaultWorkspace?.rootPath).toBe('/');
    expect(defaultWorkspace?.description).toContain('Default workspace created automatically');
    
    // Verify it was set as the current workspace
    expect(getCurrentWorkspaceId()).toBe(defaultWorkspace?.id);
    
    // Verify it was saved to localStorage
    expect(getWorkspaces()).toHaveLength(1);
    expect(workspacesExist()).toBe(true);
  });

  it('should not create a default workspace when workspaces already exist', () => {
    // Setup existing workspace in localStorage
    const existingWorkspaces = [{
      id: 'existing-workspace-id',
      name: 'Existing Workspace',
      rootPath: '/existing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }];
    
    localStorageMock.setItem('mcp-workspaces', JSON.stringify(existingWorkspaces));
    
    // Verify workspace exists
    expect(workspacesExist()).toBe(true);
    expect(getWorkspaces()).toHaveLength(1);
    
    // Try to initialize default workspace
    const result = initializeDefaultWorkspace();
    
    // Verify no new workspace was created
    expect(result).toBeUndefined();
    expect(getWorkspaces()).toHaveLength(1);
    expect(getWorkspaces()[0].name).toBe('Existing Workspace');
  });
  
  it('should handle the case when localStorage has invalid data', () => {
    // Setup invalid workspace data
    localStorageMock.setItem('mcp-workspaces', 'invalid-json-data');
    
    // Verify workspaces don't exist due to invalid data
    expect(workspacesExist()).toBe(false);
    
    // Initialize default workspace
    const defaultWorkspace = initializeDefaultWorkspace();
    
    // Verify a default workspace was created despite invalid data
    expect(defaultWorkspace).toBeDefined();
    expect(getWorkspaces()).toHaveLength(1);
  });
  
  it('should set the current workspace ID correctly', () => {
    // Initialize default workspace
    const defaultWorkspace = initializeDefaultWorkspace();
    
    // Verify current workspace ID is set
    expect(getCurrentWorkspaceId()).toBe(defaultWorkspace?.id);
    
    // Clear current workspace
    clearCurrentWorkspace();
    
    // Verify current workspace ID is cleared
    expect(getCurrentWorkspaceId()).toBeNull();
  });
});
