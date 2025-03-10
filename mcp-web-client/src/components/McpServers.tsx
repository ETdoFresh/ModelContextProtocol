import React, { useState, useEffect, useRef } from 'react';
import { FaTrash, FaPlus, FaToggleOn, FaToggleOff, FaChevronDown, FaChevronRight, FaEdit, FaCode, FaCopy } from 'react-icons/fa';
import { BsCircleFill } from 'react-icons/bs';
import { getMcpServers, createMcpServer, deleteMcpServer, toggleMcpServerEnabled, initializeMcpServers, updateMcpServer, exportMcpConfig } from '../services/mcpServerService';
import { McpServerEntry, McpServerConfig } from '../types';
import '../styles/McpServers.css';

interface ServerModalProps {
  server?: McpServerEntry;
  onSave: (name: string, config: McpServerConfig, serverId?: string) => void;
  onCancel: () => void;
}

// Helper function to convert a string to a slug
const toSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^a-z0-9\-]/g, '') // Remove all non-alphanumeric chars except -
    .replace(/\-\-+/g, '-')   // Replace multiple - with single -
    .replace(/^-+/, '')       // Trim - from start of text
    .replace(/-+$/, '');      // Trim - from end of text
};

const ServerModal: React.FC<ServerModalProps> = ({ server, onSave, onCancel }) => {
  const [name, setName] = useState(server?.name || '');
  const [slug, setSlug] = useState(server?.name ? toSlug(server.name) : '');
  const [command, setCommand] = useState(server?.config.command || 'nghx');
  const [args, setArgs] = useState<string[]>(server?.config.args || []);
  const [newArg, setNewArg] = useState('');
  const [envVars, setEnvVars] = useState<Record<string, string>>(server?.config.env || {});
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    setSlug(toSlug(newName));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const config: McpServerConfig = {
      command,
      args: [...args],
      env: {...envVars}
    };
    
    onSave(name, config, server?.id);
  };

  const addArg = () => {
    if (newArg.trim()) {
      setArgs([...args, newArg.trim()]);
      setNewArg('');
    }
  };

  const removeArg = (index: number) => {
    const newArgs = [...args];
    newArgs.splice(index, 1);
    setArgs(newArgs);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addArg();
    }
  };

  const addEnvVar = () => {
    if (newEnvKey.trim()) {
      setEnvVars(prev => ({
        ...prev,
        [newEnvKey.trim()]: newEnvValue
      }));
      setNewEnvKey('');
      setNewEnvValue('');
    }
  };

  const removeEnvVar = (key: string) => {
    const newEnvVars = {...envVars};
    delete newEnvVars[key];
    setEnvVars(newEnvVars);
  };

  const handleEnvKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEnvVar();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{server ? 'Edit MCP Server' : 'Add MCP Server'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name:</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g., GitHub"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="slug">Slug:</label>
            <input
              type="text"
              id="slug"
              value={slug}
              className="disabled-input"
              disabled
              placeholder="Auto-generated from name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="command">Command:</label>
            <select
              id="command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
            >
              <option value="nghx">Node GitHub Executor</option>
              <option value="pghx">Python GitHub Executor</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Arguments:</label>
            <div className="args-input-group">
              <input
                type="text"
                value={newArg}
                onChange={(e) => setNewArg(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add an argument"
              />
              <button 
                type="button" 
                className="btn-icon add" 
                onClick={addArg}
                aria-label="Add argument"
              >
                <FaPlus />
              </button>
            </div>
            
            <div className="args-list">
              {args.map((arg, index) => (
                <div key={index} className="arg-item">
                  <span>{arg}</span>
                  <button 
                    type="button" 
                    className="btn-icon remove" 
                    onClick={() => removeArg(index)}
                    aria-label="Remove argument"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Environment Variables:</label>
            <div className="env-input-group">
              <input
                type="text"
                value={`${newEnvKey}${newEnvKey && newEnvValue ? '=' : ''}${newEnvValue}`}
                onChange={(e) => {
                  const parts = e.target.value.split('=');
                  if (parts.length > 1) {
                    setNewEnvKey(parts[0]);
                    setNewEnvValue(parts.slice(1).join('='));
                  } else {
                    setNewEnvKey(e.target.value);
                    setNewEnvValue('');
                  }
                }}
                onKeyPress={handleEnvKeyPress}
                placeholder="KEY=VALUE"
                className="env-input"
              />
              <button 
                type="button" 
                className="btn-icon add" 
                onClick={addEnvVar}
                aria-label="Add environment variable"
              >
                <FaPlus />
              </button>
            </div>
            
            <div className="env-vars-list">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="env-var-item">
                  <div className="env-var-content">
                    <span className="env-key">{key}</span>
                    <span className="env-equals">=</span>
                    <span className="env-value">{value}</span>
                  </div>
                  <button 
                    type="button" 
                    className="btn-icon remove" 
                    onClick={() => removeEnvVar(key)}
                    aria-label="Remove environment variable"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface JsonModalProps {
  onClose: () => void;
}

const JsonModal: React.FC<JsonModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const jsonConfig = JSON.stringify(exportMcpConfig(), null, 2);
  
  const handleCopy = () => {
    if (textareaRef.current) {
      textareaRef.current.select();
      document.execCommand('copy');
      setCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal json-modal">
        <h3>MCP Servers JSON Configuration</h3>
        <div className="json-content">
          <textarea 
            ref={textareaRef}
            readOnly 
            value={jsonConfig}
            className="json-textarea"
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          <button 
            type="button" 
            className="btn btn-primary copy-btn" 
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : <><FaCopy /> Copy to Clipboard</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const McpServers: React.FC = () => {
  const [servers, setServers] = useState<McpServerEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerEntry | undefined>(undefined);
  const [expandedServers, setExpandedServers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Initialize with default servers if none exist
    initializeMcpServers();
    loadServers();
  }, []);

  const loadServers = () => {
    const loadedServers = getMcpServers();
    // Sort by most recently updated
    loadedServers.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setServers(loadedServers);
  };

  const handleSaveServer = (name: string, config: McpServerConfig, serverId?: string) => {
    if (serverId) {
      // Update existing server
      const server = servers.find(s => s.id === serverId);
      if (server) {
        const updatedServer = {
          ...server,
          name,
          config
        };
        updateMcpServer(updatedServer);
      }
    } else {
      // Create new server
      createMcpServer(name, config);
    }
    
    setShowModal(false);
    setEditingServer(undefined);
    loadServers();
  };

  const handleEditServer = (server: McpServerEntry) => {
    setEditingServer(server);
    setShowModal(true);
  };

  const handleDeleteServer = (serverId: string) => {
    if (window.confirm('Are you sure you want to delete this MCP server?')) {
      deleteMcpServer(serverId);
      // Force reload servers after a short delay to ensure localStorage changes are processed
      setTimeout(() => {
        loadServers();
      }, 100);
    }
  };

  const handleToggleEnabled = (serverId: string) => {
    toggleMcpServerEnabled(serverId);
    loadServers();
  };

  const toggleExpand = (serverId: string) => {
    setExpandedServers(prev => ({
      ...prev,
      [serverId]: !prev[serverId]
    }));
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'connected': return 'green';
      case 'connecting': return 'yellow';
      case 'error': return 'red';
      default: return 'grey';
    }
  };

  return (
    <div className="mcp-servers-container">
      <div className="mcp-servers-header">
        <h2>MCP Servers</h2>
        <div className="header-buttons">
          <button 
            className="btn btn-secondary json-btn" 
            onClick={() => setShowJsonModal(true)}
            title="View JSON Configuration"
          >
            <FaCode /> JSON
          </button>
          <button 
            className="btn btn-primary create-server" 
            onClick={() => {
              setEditingServer(undefined);
              setShowModal(true);
            }}
          >
            <FaPlus /> New MCP Server
          </button>
        </div>
      </div>

      {servers.length === 0 ? (
        <div className="empty-servers">
          <p>No MCP servers found. Add a new server to get started.</p>
        </div>
      ) : (
        <div className="servers-list">
          {servers.map((server) => (
            <div key={server.id} className="server-item">
              <div className="server-header">
                <div className="server-status-name">
                  <BsCircleFill className={`status-indicator ${getStatusColor(server.status)}`} />
                  <button 
                    className="expand-button" 
                    onClick={() => toggleExpand(server.id)}
                    aria-label={expandedServers[server.id] ? 'Collapse' : 'Expand'}
                  >
                    {expandedServers[server.id] ? <FaChevronDown /> : <FaChevronRight />}
                  </button>
                  <h3>{server.name}</h3>
                </div>
                
                <div className="server-actions">
                  <button 
                    className="btn-icon edit" 
                    onClick={() => handleEditServer(server)}
                    aria-label="Edit server"
                  >
                    <FaEdit />
                  </button>
                  <button 
                    className="btn-icon toggle" 
                    onClick={() => handleToggleEnabled(server.id)}
                    aria-label={server.enabled ? 'Disable server' : 'Enable server'}
                  >
                    {server.enabled ? <FaToggleOn /> : <FaToggleOff />}
                  </button>
                  <button 
                    className="btn-icon delete" 
                    onClick={() => handleDeleteServer(server.id)}
                    aria-label="Delete server"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
              
              <div className="server-meta">
                <span className="command">{server.config.command}</span>
                {server.config.args.length > 0 && (
                  <span className="args">{server.config.args.join(' ')}</span>
                )}
              </div>
              
              {expandedServers[server.id] && (
                <div className="server-details">
                  <p>Not Yet Implemented</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {showModal && (
        <ServerModal 
          server={editingServer} 
          onSave={handleSaveServer} 
          onCancel={() => {
            setShowModal(false);
            setEditingServer(undefined);
          }} 
        />
      )}
      
      {showJsonModal && (
        <JsonModal onClose={() => setShowJsonModal(false)} />
      )}
    </div>
  );
};

export default McpServers;
