import React, { useState, useEffect } from 'react';
import { FaTrash, FaPlus, FaToggleOn, FaToggleOff, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { BsCircleFill } from 'react-icons/bs';
import { getMcpServers, createMcpServer, deleteMcpServer, toggleMcpServerEnabled, initializeMcpServers } from '../services/mcpServerService';
import { McpServerEntry, McpServerConfig } from '../types';
import '../styles/McpServers.css';

interface AddServerModalProps {
  onSave: (name: string, config: McpServerConfig) => void;
  onCancel: () => void;
}

const AddServerModal: React.FC<AddServerModalProps> = ({ onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [command, setCommand] = useState('npx');
  const [args, setArgs] = useState<string[]>([]);
  const [newArg, setNewArg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const config: McpServerConfig = {
      command,
      args: [...args],
      env: {}
    };
    
    onSave(name, config);
  };

  const addArg = () => {
    if (newArg.trim()) {
      setArgs([...args, newArg.trim()]);
      setNewArg('');
    }
  };

  const removeArg = (index: number) => {
    const updatedArgs = [...args];
    updatedArgs.splice(index, 1);
    setArgs(updatedArgs);
  };

  const handleCommandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCommand = e.target.value;
    setCommand(selectedCommand);
    
    // Set default args based on command
    if (selectedCommand === 'npx') {
      setArgs(['-y', '@modelcontextprotocol/server-github']);
    } else if (selectedCommand === 'python') {
      setArgs(['-m', 'mcp.server']);
    } else {
      setArgs([]);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Add MCP Server</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., GitHub"
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="command">Command</label>
            <select
              id="command"
              value={command}
              onChange={handleCommandChange}
            >
              <option value="npx">Node GitHub Executor (nghx)</option>
              <option value="python">Python GitHub Executor (pghx)</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Arguments</label>
            <div className="args-list">
              {args.map((arg, index) => (
                <div key={index} className="arg-item">
                  <span>{arg}</span>
                  <button 
                    type="button" 
                    className="btn-icon" 
                    onClick={() => removeArg(index)}
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
              
              <div className="add-arg">
                <input
                  type="text"
                  value={newArg}
                  onChange={(e) => setNewArg(e.target.value)}
                  placeholder="Add new argument"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addArg())}
                />
                <button type="button" className="btn-add" onClick={addArg}>
                  Add
                </button>
              </div>
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim() || args.length === 0}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const McpServers: React.FC = () => {
  const [servers, setServers] = useState<McpServerEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
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

  const handleCreateServer = (name: string, config: McpServerConfig) => {
    createMcpServer(name, config);
    setShowAddModal(false);
    loadServers();
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

  const formatDate = (date: Date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      date = new Date(date);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
    }
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="mcp-servers-container">
      <div className="mcp-servers-header">
        <h2>MCP Servers</h2>
        <button className="btn btn-primary create-server" onClick={() => setShowAddModal(true)}>
          <FaPlus /> New MCP Server
        </button>
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
                  <h3 className="server-title">{server.name}</h3>
                </div>
                <div className="server-meta">
                  <span className="server-command">{server.config.command} {server.config.args.join(' ')}</span>
                  <span className="server-date">{formatDate(server.updatedAt)}</span>
                </div>
                <div className="server-actions">
                  <button 
                    className="btn btn-icon toggle" 
                    onClick={() => handleToggleEnabled(server.id)}
                    aria-label={server.enabled ? 'Disable server' : 'Enable server'}
                  >
                    {server.enabled ? <FaToggleOn className="toggle-on" /> : <FaToggleOff className="toggle-off" />}
                  </button>
                  <button 
                    className="btn btn-icon delete" 
                    onClick={() => handleDeleteServer(server.id)}
                    aria-label="Delete server"
                  >
                    <FaTrash />
                  </button>
                </div>
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

      {showAddModal && (
        <AddServerModal
          onSave={handleCreateServer}
          onCancel={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
};

export default McpServers;
