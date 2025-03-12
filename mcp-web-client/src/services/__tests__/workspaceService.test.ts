// Import the workspace service functions
import {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  setCurrentWorkspace,
  getCurrentWorkspace,
  getCurrentWorkspaceId,
  clearCurrentWorkspace,
  ensureCurrentWorkspace
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

describe('Workspace Service', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('createWorkspace', () => {
    it('should create a new workspace with required fields', () => {
      const workspace = createWorkspace('Test Workspace', '/test/path');
      
      expect(workspace).toHaveProperty('id');
      expect(workspace.name).toBe('Test Workspace');
      expect(workspace.rootPath).toBe('/test/path');
      expect(workspace.createdAt).toBeInstanceOf(Date);
      expect(workspace.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a workspace with optional fields when provided', () => {
      const workspace = createWorkspace(
        'Test Workspace',
        '/test/path',
        'Test description',
        'icon-name',
        '#ff0000'
      );
      
      expect(workspace.description).toBe('Test description');
      expect(workspace.icon).toBe('icon-name');
      expect(workspace.color).toBe('#ff0000');
    });
  });

  describe('getWorkspaces', () => {
    it('should return an empty array when no workspaces exist', () => {
      const workspaces = getWorkspaces();
      expect(workspaces).toEqual([]);
    });

    it('should return workspaces when they exist', () => {
      createWorkspace('Workspace 1', '/path1');
      createWorkspace('Workspace 2', '/path2');
      
      const workspaces = getWorkspaces();
      
      expect(workspaces.length).toBe(2);
      expect(workspaces[0].name).toBe('Workspace 1');
      expect(workspaces[1].name).toBe('Workspace 2');
    });
  });

  describe('getWorkspaceById', () => {
    it('should return undefined for non-existent workspace', () => {
      const workspace = getWorkspaceById('non-existent-id');
      expect(workspace).toBeUndefined();
    });

    it('should return the workspace with the given ID', () => {
      const created = createWorkspace('Test Workspace', '/test/path');
      const retrieved = getWorkspaceById(created.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Test Workspace');
    });
  });

  describe('updateWorkspace', () => {
    it('should update an existing workspace', () => {
      const workspace = createWorkspace('Original Name', '/original/path');
      
      const updated = {
        ...workspace,
        name: 'Updated Name',
        rootPath: '/updated/path',
        description: 'Updated description'
      };
      
      updateWorkspace(updated);
      
      const retrieved = getWorkspaceById(workspace.id);
      
      expect(retrieved?.name).toBe('Updated Name');
      expect(retrieved?.rootPath).toBe('/updated/path');
      expect(retrieved?.description).toBe('Updated description');
    });
  });

  describe('deleteWorkspace', () => {
    it('should delete an existing workspace', () => {
      const workspace = createWorkspace('Test Workspace', '/test/path');
      
      deleteWorkspace(workspace.id);
      
      const retrieved = getWorkspaceById(workspace.id);
      expect(retrieved).toBeUndefined();
    });

    it('should clear current workspace if deleting the current one', () => {
      const workspace = createWorkspace('Test Workspace', '/test/path');
      setCurrentWorkspace(workspace.id);
      
      deleteWorkspace(workspace.id);
      
      const currentId = getCurrentWorkspaceId();
      expect(currentId).toBeNull();
    });
  });

  describe('current workspace operations', () => {
    it('should set and get the current workspace', () => {
      const workspace = createWorkspace('Test Workspace', '/test/path');
      
      setCurrentWorkspace(workspace.id);
      
      const currentId = getCurrentWorkspaceId();
      const current = getCurrentWorkspace();
      
      expect(currentId).toBe(workspace.id);
      expect(current?.id).toBe(workspace.id);
    });

    it('should clear the current workspace', () => {
      const workspace = createWorkspace('Test Workspace', '/test/path');
      setCurrentWorkspace(workspace.id);
      
      clearCurrentWorkspace();
      
      const currentId = getCurrentWorkspaceId();
      expect(currentId).toBeNull();
    });
  });

  describe('ensureCurrentWorkspace', () => {
    it('should return existing current workspace if it exists', () => {
      const workspace1 = createWorkspace('Workspace 1', '/path1');
      const workspace2 = createWorkspace('Workspace 2', '/path2');
      
      setCurrentWorkspace(workspace1.id);
      
      const ensured = ensureCurrentWorkspace();
      
      expect(ensured.id).toBe(workspace1.id);
    });

    it('should select the most recent workspace if no current workspace', () => {
      const workspace1 = createWorkspace('Workspace 1', '/path1');
      const workspace2 = createWorkspace('Workspace 2', '/path2');
      
      clearCurrentWorkspace();
      
      const ensured = ensureCurrentWorkspace();
      
      // The most recent one should be workspace2
      expect(ensured.id).toBe(workspace2.id);
    });

    it('should create a default workspace if none exist', () => {
      const ensured = ensureCurrentWorkspace();
      
      expect(ensured.name).toBe('Default Workspace');
      expect(ensured.rootPath).toBe('/');
      
      const currentId = getCurrentWorkspaceId();
      expect(currentId).toBe(ensured.id);
    });
  });
});
