import React, { useState, useEffect } from 'react';

interface FileItem {
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
  isDirectory: boolean;
  type: string;
}

export default function HomeWidget() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [targetPath, setTargetPath] = useState('');

  useEffect(() => {
    loadFiles();
  }, [currentPath]);

  const loadFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/files/list?directory=${encodeURIComponent(currentPath)}`);
      const data = await response.json();

      if (data.success) {
        setFiles(data.files);
      } else {
        setError(data.error || 'Failed to load files');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('directory', currentPath);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        loadFiles();
      } else {
        setError(data.error || 'Failed to upload file');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`Are you sure you want to delete ${file.name}?`)) {
      return;
    }

    setError('');
    try {
      const response = await fetch(`/api/files/delete?path=${encodeURIComponent(file.path)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        loadFiles();
      } else {
        setError(data.error || 'Failed to delete file');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete file');
    }
  };

  const handleDownload = (file: FileItem) => {
    window.open(`/api/files/download?path=${encodeURIComponent(file.path)}`, '_blank');
  };

  const handleRename = async () => {
    if (!selectedFile || !newName) return;

    setError('');
    try {
      const response = await fetch('/api/files/rename', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPath: selectedFile.path,
          newName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowRenameModal(false);
        setNewName('');
        setSelectedFile(null);
        loadFiles();
      } else {
        setError(data.error || 'Failed to rename file');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to rename file');
    }
  };

  const handleMove = async () => {
    if (!selectedFile) return;

    setError('');
    try {
      const response = await fetch('/api/files/move', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePath: selectedFile.path,
          destinationDir: targetPath,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowMoveModal(false);
        setTargetPath('');
        setSelectedFile(null);
        loadFiles();
      } else {
        setError(data.error || 'Failed to move file');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to move file');
    }
  };

  const handleCopy = async (file: FileItem) => {
    const destination = prompt('Enter destination directory (leave empty for root):');
    if (destination === null) return;

    setError('');
    try {
      const response = await fetch('/api/files/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePath: file.path,
          destinationDir: destination,
        }),
      });

      const data = await response.json();

      if (data.success) {
        loadFiles();
      } else {
        setError(data.error || 'Failed to copy file');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to copy file');
    }
  };

  const handleCreateFolder = async () => {
    if (!newName) return;

    const folderPath = currentPath ? `${currentPath}/${newName}` : newName;

    setError('');
    try {
      const response = await fetch('/api/files/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath }),
      });

      const data = await response.json();

      if (data.success) {
        setShowNewFolderModal(false);
        setNewName('');
        loadFiles();
      } else {
        setError(data.error || 'Failed to create folder');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create folder');
    }
  };

  const navigateToDirectory = (path: string) => {
    setCurrentPath(path);
  };

  const getPathParts = () => {
    if (!currentPath) return [{ label: 'Home', path: '' }];

    const parts = currentPath.split('/');
    const breadcrumbs = [{ label: 'Home', path: '' }];

    let accumulatedPath = '';
    for (const part of parts) {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
      breadcrumbs.push({ label: part, path: accumulatedPath });
    }

    return breadcrumbs;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getFileIcon = (file: FileItem): string => {
    if (file.isDirectory) return '📁';
    switch (file.type) {
      case 'image': return '🖼️';
      case 'document': return '📄';
      case 'spreadsheet': return '📊';
      case 'archive': return '📦';
      case 'code': return '💻';
      case 'video': return '🎥';
      case 'audio': return '🎵';
      default: return '📄';
    }
  };

  return (
    <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 'bold', color: '#f1f5f9' }}>
          File Browser
        </h2>

        {/* Breadcrumb Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {getPathParts().map((part, index) => (
            <React.Fragment key={part.path}>
              {index > 0 && <span style={{ color: '#94a3b8' }}>{'>'}</span>}
              <button
                onClick={() => navigateToDirectory(part.path)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: index === getPathParts().length - 1 ? '#3b82f6' : '#e2e8f0',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  fontSize: '14px',
                  fontWeight: index === getPathParts().length - 1 ? 'bold' : 'normal',
                }}
              >
                {part.label}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <label style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: '#fff',
            borderRadius: '4px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: uploading ? 0.6 : 1,
          }}>
            {uploading ? 'Uploading...' : 'Upload File'}
            <input
              type="file"
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>

          <button
            onClick={() => setShowNewFolderModal(true)}
            style={{
              padding: '8px 16px',
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            New Folder
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '12px',
          background: '#ef4444',
          color: '#fff',
          borderRadius: '4px',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {/* File List */}
      <div style={{ flex: 1, overflow: 'auto', background: '#1e293b', borderRadius: '4px' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
            Loading files...
          </div>
        ) : files.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
            No files in this directory
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '12px', textAlign: 'left', color: '#e2e8f0', fontSize: '14px' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#e2e8f0', fontSize: '14px' }}>Type</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#e2e8f0', fontSize: '14px' }}>Size</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#e2e8f0', fontSize: '14px' }}>Modified</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#e2e8f0', fontSize: '14px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.path} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{getFileIcon(file)}</span>
                      {file.isDirectory ? (
                        <button
                          onClick={() => navigateToDirectory(file.path)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#3b82f6',
                            cursor: 'pointer',
                            fontSize: '14px',
                            textDecoration: 'underline',
                          }}
                        >
                          {file.name}
                        </button>
                      ) : (
                        <span style={{ color: '#f1f5f9', fontSize: '14px' }}>{file.name}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px', color: '#94a3b8', fontSize: '14px' }}>
                    {file.isDirectory ? 'Folder' : file.type}
                  </td>
                  <td style={{ padding: '12px', color: '#94a3b8', fontSize: '14px' }}>
                    {file.isDirectory ? '-' : formatFileSize(file.size)}
                  </td>
                  <td style={{ padding: '12px', color: '#94a3b8', fontSize: '14px' }}>
                    {formatDate(file.modifiedAt)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!file.isDirectory && (
                        <button
                          onClick={() => handleDownload(file)}
                          style={{
                            padding: '4px 8px',
                            background: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          Download
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedFile(file);
                          setNewName(file.name);
                          setShowRenameModal(true);
                        }}
                        style={{
                          padding: '4px 8px',
                          background: '#fbbf24',
                          color: '#0f172a',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => {
                          setSelectedFile(file);
                          setTargetPath('');
                          setShowMoveModal(true);
                        }}
                        style={{
                          padding: '4px 8px',
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Move
                      </button>
                      {!file.isDirectory && (
                        <button
                          onClick={() => handleCopy(file)}
                          style={{
                            padding: '4px 8px',
                            background: '#8b5cf6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          Copy
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(file)}
                        style={{
                          padding: '4px 8px',
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Rename Modal */}
      {showRenameModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#1e293b',
            padding: '24px',
            borderRadius: '8px',
            minWidth: '400px',
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#f1f5f9' }}>Rename {selectedFile?.name}</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#f1f5f9',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowRenameModal(false);
                  setNewName('');
                  setSelectedFile(null);
                }}
                style={{
                  padding: '8px 16px',
                  background: '#334155',
                  color: '#f1f5f9',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                style={{
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Modal */}
      {showMoveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#1e293b',
            padding: '24px',
            borderRadius: '8px',
            minWidth: '400px',
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#f1f5f9' }}>Move {selectedFile?.name}</h3>
            <input
              type="text"
              value={targetPath}
              onChange={(e) => setTargetPath(e.target.value)}
              placeholder="Enter destination path (leave empty for root)"
              style={{
                width: '100%',
                padding: '8px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#f1f5f9',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setTargetPath('');
                  setSelectedFile(null);
                }}
                style={{
                  padding: '8px 16px',
                  background: '#334155',
                  color: '#f1f5f9',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleMove}
                style={{
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#1e293b',
            padding: '24px',
            borderRadius: '8px',
            minWidth: '400px',
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#f1f5f9' }}>Create New Folder</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Folder name"
              style={{
                width: '100%',
                padding: '8px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#f1f5f9',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewName('');
                }}
                style={{
                  padding: '8px 16px',
                  background: '#334155',
                  color: '#f1f5f9',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                style={{
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
