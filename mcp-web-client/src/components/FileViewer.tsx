import React, { useState, useEffect } from 'react';
import { getFileContent, FileContent } from '../services/fileService';
import { getFileType, getLanguage, formatFileSize, formatDate, isLargeFile } from '../utils/fileUtils';
import '../styles/FileViewer.css';

// Import syntax highlighting libraries
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';

interface FileViewerProps {
  filePath: string;
  onClose?: () => void;
}

const FileViewer: React.FC<FileViewerProps> = ({ filePath, onClose }) => {
  const [fileData, setFileData] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const fetchFileContent = async () => {
      try {
        setLoading(true);
        setError(null);
        const content = await getFileContent(filePath);
        setFileData(content);
      } catch (err) {
        console.error('Error fetching file:', err);
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    fetchFileContent();
  }, [filePath]);

  const handleCopyToClipboard = () => {
    if (fileData) {
      navigator.clipboard
        .writeText(fileData.content)
        .then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        })
        .catch((err) => {
          console.error('Error copying to clipboard:', err);
        });
    }
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  if (loading) {
    return (
      <div className="file-viewer loading">
        <div className="file-viewer-loader">Loading file...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-viewer error">
        <div className="file-viewer-error">
          <h3>Error Loading File</h3>
          <p>{error}</p>
          {onClose && (
            <button onClick={onClose} className="file-viewer-close-button">
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!fileData) {
    return null;
  }

  const fileType = getFileType(fileData.metadata.name);
  const isLarge = isLargeFile(fileData.metadata.size);

  return (
    <div className={`file-viewer ${collapsed ? 'collapsed' : ''}`}>
      <div className="file-viewer-header">
        <div className="file-viewer-title">
          <span className="file-name">{fileData.metadata.name}</span>
          <div className="file-metadata">
            <span>{formatFileSize(fileData.metadata.size)}</span>
            <span>•</span>
            <span>Modified: {formatDate(fileData.metadata.modifiedAt)}</span>
          </div>
        </div>
        <div className="file-viewer-actions">
          <button
            onClick={handleCopyToClipboard}
            className={`file-viewer-button ${copySuccess ? 'success' : ''}`}
            title="Copy to clipboard"
          >
            {copySuccess ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={toggleCollapse} className="file-viewer-button" title="Toggle collapse">
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
          {onClose && (
            <button onClick={onClose} className="file-viewer-button" title="Close">
              Close
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="file-viewer-content">
          {isLarge && !collapsed && (
            <div className="file-viewer-warning">
              <p>
                This file is large ({formatFileSize(fileData.metadata.size)}) and may affect performance.
              </p>
            </div>
          )}

          {fileType === 'code' && (
            <div className="file-viewer-code">
              <SyntaxHighlighter
                language={getLanguage(fileData.metadata.name)}
                style={tomorrow}
                showLineNumbers={true}
                wrapLines={true}
                customStyle={{ margin: 0 }}
              >
                {fileData.content}
              </SyntaxHighlighter>
            </div>
          )}

          {fileType === 'markdown' && (
            <div className="file-viewer-markdown">
              <ReactMarkdown>{fileData.content}</ReactMarkdown>
            </div>
          )}

          {fileType === 'text' && (
            <div className="file-viewer-text">
              <pre>{fileData.content}</pre>
            </div>
          )}

          {fileType === 'image' && (
            <div className="file-viewer-image">
              <p>Image preview is not supported in the chat interface.</p>
            </div>
          )}

          {fileType === 'binary' && (
            <div className="file-viewer-binary">
              <p>Binary file cannot be displayed in the chat interface.</p>
            </div>
          )}

          {fileType === 'unknown' && (
            <div className="file-viewer-unknown">
              <pre>{fileData.content}</pre>
              <p className="file-viewer-note">
                File type not recognized. Displaying as text.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileViewer;
