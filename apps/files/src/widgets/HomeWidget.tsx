import React, { useState, useEffect, useRef } from 'react';
import ButtonIcon from '@/lib/components/ButtonIcon';
import ButtonMenu from '@/lib/components/ButtonMenu';

interface FileItem {
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
  isDirectory: boolean;
  type: string;
}

interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
}

export default function HomeWidget() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargets, setDeleteTargets] = useState<FileItem[]>([]);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [filesToOverwrite, setFilesToOverwrite] = useState<string[]>([]);
  const [pendingUpload, setPendingUpload] = useState<FileList | null>(null);
  const [newName, setNewName] = useState('');
  const [targetPath, setTargetPath] = useState('');
  const [moveDirectories, setMoveDirectories] = useState<DirectoryItem[]>([]);
  const [moveBrowsePath, setMoveBrowsePath] = useState('');
  const [moveExcludePaths, setMoveExcludePaths] = useState<string[]>([]);
  const [copyDirectories, setCopyDirectories] = useState<DirectoryItem[]>([]);
  const [copyBrowsePath, setCopyBrowsePath] = useState('');
  const [copyTargetPath, setCopyTargetPath] = useState('');
  const [copyExcludePaths, setCopyExcludePaths] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState<'image' | 'text' | 'pdf' | 'unsupported'>('unsupported');
  const [previewContent, setPreviewContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const loadMoveDirectories = async (path: string, excludePaths: string[] = []) => {
    try {
      const response = await fetch(`/api/files/list?directory=${encodeURIComponent(path)}`);
      const data = await response.json();

      if (data.success) {
        const dirs = data.files.filter((f: DirectoryItem) => {
          if (!f.isDirectory) return false;
          // Exclude exact matches
          if (excludePaths.includes(f.path)) return false;
          // Exclude subdirectories of excluded paths
          for (const excludePath of excludePaths) {
            if (f.path.startsWith(excludePath + '/')) return false;
          }
          return true;
        });
        setMoveDirectories(dirs);
        setMoveBrowsePath(path);
      }
    } catch (err: any) {
      console.error('Failed to load directories:', err);
    }
  };

  const loadCopyDirectories = async (path: string, excludePaths: string[] = []) => {
    try {
      const response = await fetch(`/api/files/list?directory=${encodeURIComponent(path)}`);
      const data = await response.json();

      if (data.success) {
        const dirs = data.files.filter((f: DirectoryItem) => {
          if (!f.isDirectory) return false;
          // Exclude exact matches
          if (excludePaths.includes(f.path)) return false;
          // Exclude subdirectories of excluded paths
          for (const excludePath of excludePaths) {
            if (f.path.startsWith(excludePath + '/')) return false;
          }
          return true;
        });
        setCopyDirectories(dirs);
        setCopyBrowsePath(path);
      }
    } catch (err: any) {
      console.error('Failed to load directories:', err);
    }
  };

  const checkForOverwrites = (fileList: FileList): string[] => {
    const overwrites: string[] = [];
    const existingFileNames = new Set(files.map(f => f.name));

    for (let i = 0; i < fileList.length; i++) {
      if (existingFileNames.has(fileList[i].name)) {
        overwrites.push(fileList[i].name);
      }
    }

    return overwrites;
  };

  const handleUploadWithCheck = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const overwrites = checkForOverwrites(fileList);

    if (overwrites.length > 0) {
      // Show confirmation modal
      setFilesToOverwrite(overwrites);
      setPendingUpload(fileList);
      setShowOverwriteModal(true);
      return;
    }

    // No overwrites, proceed with upload
    await performUpload(fileList);
  };

  const confirmOverwrite = async () => {
    setShowOverwriteModal(false);
    if (pendingUpload) {
      await performUpload(pendingUpload);
      setPendingUpload(null);
      setFilesToOverwrite([]);
    }
  };

  const cancelOverwrite = () => {
    setShowOverwriteModal(false);
    setPendingUpload(null);
    setFilesToOverwrite([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const performUpload = async (fileList: FileList) => {
    setUploading(true);
    setError('');
    setUploadProgress(`Uploading ${fileList.length} file(s)...`);

    try {
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadProgress(`Uploading ${i + 1} of ${fileList.length}: ${file.name}`);

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
            successCount++;
          } else {
            failCount++;
            console.error(`Failed to upload ${file.name}:`, data.error);
          }
        } catch (err) {
          failCount++;
          console.error(`Failed to upload ${file.name}:`, err);
        }
      }

      if (successCount > 0) {
        loadFiles();
      }

      if (failCount > 0) {
        setError(`Failed to upload ${failCount} file(s)`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload files');
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const fileList = await getAllFiles(items);
      if (fileList.length > 0) {
        // Convert array to FileList-like object
        const dt = new DataTransfer();
        fileList.forEach(file => dt.items.add(file));
        await handleUploadWithCheck(dt.files);
      }
    } else {
      // Fallback to files if items not supported
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        await handleUploadWithCheck(files);
      }
    }
  };

  const getAllFiles = async (items: DataTransferItemList): Promise<File[]> => {
    const files: File[] = [];

    const traverseFileTree = async (item: any, path: string = ''): Promise<void> => {
      return new Promise((resolve) => {
        if (item.isFile) {
          item.file((file: File) => {
            // Preserve relative path in file name for nested files
            if (path) {
              const relativePath = path + file.name;
              // Store original path as a property (note: this won't upload nested structure, just flat files)
              files.push(file);
            } else {
              files.push(file);
            }
            resolve();
          });
        } else if (item.isDirectory) {
          const dirReader = item.createReader();
          dirReader.readEntries(async (entries: any[]) => {
            for (const entry of entries) {
              await traverseFileTree(entry, path + item.name + '/');
            }
            resolve();
          });
        } else {
          resolve();
        }
      });
    };

    const promises: Promise<void>[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i].webkitGetAsEntry();
      if (item) {
        promises.push(traverseFileTree(item));
      }
    }

    await Promise.all(promises);
    return files;
  };

  const handleDelete = (file: FileItem) => {
    setDeleteTargets([file]);
    setShowDeleteModal(true);
  };

  const handleBulkDeleteClick = () => {
    const selectedItems = files.filter(f => selectedFiles.has(f.path));
    setDeleteTargets(selectedItems);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setError('');
    let successCount = 0;
    let failCount = 0;

    for (const file of deleteTargets) {
      try {
        const response = await fetch(`/api/files/delete?path=${encodeURIComponent(file.path)}`, {
          method: 'DELETE',
        });

        const data = await response.json();

        if (data.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err: any) {
        failCount++;
      }
    }

    if (failCount > 0) {
      setError(`Failed to delete ${failCount} item(s)`);
    }

    setShowDeleteModal(false);
    setDeleteTargets([]);
    setSelectedFiles(new Set());
    loadFiles();
  };

  const handleBulkMove = () => {
    const selectedItems = files.filter(f => selectedFiles.has(f.path));
    const selectedFolderPaths = selectedItems.filter(f => f.isDirectory).map(f => f.path);

    setTargetPath('');
    setMoveBrowsePath('');
    setMoveDirectories([]);
    setMoveExcludePaths(selectedFolderPaths);
    loadMoveDirectories('', selectedFolderPaths);
    setShowMoveModal(true);
  };

  const handleBulkCopy = () => {
    const selectedItems = files.filter(f => selectedFiles.has(f.path));
    const selectedFolderPaths = selectedItems.filter(f => f.isDirectory).map(f => f.path);

    setCopyTargetPath('');
    setCopyBrowsePath('');
    setCopyDirectories([]);
    setCopyExcludePaths(selectedFolderPaths);
    loadCopyDirectories('', selectedFolderPaths);
    setShowCopyModal(true);
  };

  const handleDownload = (file: FileItem) => {
    window.open(`/api/files/download?path=${encodeURIComponent(file.path)}`, '_blank');
  };

  const handlePreview = async (file: FileItem) => {
    if (file.isDirectory) return;

    setSelectedFile(file);
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';

    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    const textExts = ['txt', 'md', 'json', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'xml', 'log', 'csv'];
    const pdfExts = ['pdf'];

    if (imageExts.includes(fileExt)) {
      setPreviewType('image');
      setPreviewUrl(`/api/files/download?path=${encodeURIComponent(file.path)}&inline=true`);
      setShowPreviewModal(true);
    } else if (pdfExts.includes(fileExt)) {
      setPreviewType('pdf');
      setPreviewUrl(`/api/files/download?path=${encodeURIComponent(file.path)}&inline=true`);
      setShowPreviewModal(true);
    } else if (textExts.includes(fileExt)) {
      try {
        const response = await fetch(`/api/files/download?path=${encodeURIComponent(file.path)}&inline=true`);
        const text = await response.text();
        setPreviewType('text');
        setPreviewContent(text);
        setShowPreviewModal(true);
      } catch (err) {
        setError('Failed to load file preview');
      }
    } else {
      setError('Preview not supported for this file type');
    }
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
    const itemsToMove = selectedFiles.size > 0
      ? files.filter(f => selectedFiles.has(f.path))
      : selectedFile ? [selectedFile] : [];

    if (itemsToMove.length === 0) return;

    setError('');
    let successCount = 0;
    let failCount = 0;

    for (const file of itemsToMove) {
      try {
        const response = await fetch('/api/files/move', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourcePath: file.path,
            destinationDir: targetPath,
          }),
        });

        const data = await response.json();

        if (data.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err: any) {
        failCount++;
      }
    }

    if (failCount > 0) {
      setError(`Failed to move ${failCount} item(s)`);
    }

    setShowMoveModal(false);
    setTargetPath('');
    setSelectedFile(null);
    setSelectedFiles(new Set());
    setMoveBrowsePath('');
    setMoveDirectories([]);
    loadFiles();
  };

  const handleCopy = async () => {
    const itemsToCopy = selectedFiles.size > 0
      ? files.filter(f => selectedFiles.has(f.path))
      : selectedFile ? [selectedFile] : [];

    if (itemsToCopy.length === 0) return;

    setError('');
    let successCount = 0;
    let failCount = 0;

    for (const file of itemsToCopy) {
      try {
        const response = await fetch('/api/files/copy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourcePath: file.path,
            destinationDir: copyTargetPath,
          }),
        });

        const data = await response.json();

        if (data.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err: any) {
        failCount++;
      }
    }

    if (failCount > 0) {
      setError(`Failed to copy ${failCount} item(s)`);
    }

    setShowCopyModal(false);
    setCopyTargetPath('');
    setSelectedFile(null);
    setSelectedFiles(new Set());
    setCopyBrowsePath('');
    setCopyDirectories([]);
    loadFiles();
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
    setSelectedFiles(new Set());
  };

  const toggleFileSelection = (filePath: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(filePath)) {
      newSelection.delete(filePath);
    } else {
      newSelection.add(filePath);
    }
    setSelectedFiles(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.path)));
    }
  };

  const getMovePathParts = () => {
    if (!moveBrowsePath) return [{ label: 'Home', path: '' }];

    const parts = moveBrowsePath.split('/');
    const breadcrumbs = [{ label: 'Home', path: '' }];

    let accumulatedPath = '';
    for (const part of parts) {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
      breadcrumbs.push({ label: part, path: accumulatedPath });
    }

    return breadcrumbs;
  };

  const getCopyPathParts = () => {
    if (!copyBrowsePath) return [{ label: 'Home', path: '' }];

    const parts = copyBrowsePath.split('/');
    const breadcrumbs = [{ label: 'Home', path: '' }];

    let accumulatedPath = '';
    for (const part of parts) {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
      breadcrumbs.push({ label: part, path: accumulatedPath });
    }

    return breadcrumbs;
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
    <div
      style={{ height: '100%', padding: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div style={{ marginBottom: '8px', flexShrink: 0 }}>
        {/* Breadcrumb Navigation and Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {/* Breadcrumb Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', flex: 1 }}>
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <ButtonIcon
              icon={<span style={{ fontSize: '18px' }}>⬆️</span>}
              label={uploading ? 'Uploading...' : 'Upload File'}
              onClick={() => fileInputRef.current?.click()}
              variant="bordered"
              subvariant="info"
              disabled={uploading}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleUploadWithCheck(e.target.files)}
              disabled={uploading}
              style={{ display: 'none' }}
            />

            <ButtonIcon
              icon={<span style={{ fontSize: '18px' }}>📁</span>}
              label="New Folder"
              onClick={() => setShowNewFolderModal(true)}
              variant="bordered"
              subvariant="neutral"
            />

            <ButtonMenu
              disabled={selectedFiles.size === 0}
              alignment="right"
              trigger={
                <button
                  disabled={selectedFiles.size === 0}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    color: selectedFiles.size === 0 ? '#64748b' : '#e2e8f0',
                    cursor: selectedFiles.size === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: selectedFiles.size === 0 ? 0.5 : 1,
                  }}
                >
                  Actions {selectedFiles.size > 0 && `(${selectedFiles.size})`}
                </button>
              }
              options={[
                {
                  label: 'Move',
                  icon: <span>📤</span>,
                  onClick: handleBulkMove
                },
                {
                  label: 'Copy',
                  icon: <span>📋</span>,
                  onClick: handleBulkCopy
                },
                {
                  label: 'Delete',
                  icon: <span>🗑️</span>,
                  onClick: handleBulkDeleteClick
                }
              ]}
            >
              {null}
            </ButtonMenu>
          </div>
        </div>

        {/* Upload Progress */}
        {uploadProgress && (
          <div style={{
            padding: '8px 12px',
            background: '#1e293b',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#94a3b8',
            marginBottom: '8px'
          }}>
            {uploadProgress}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '12px',
          background: '#ef4444',
          color: '#fff',
          borderRadius: '4px',
          marginBottom: '16px',
          flexShrink: 0,
        }}>
          {error}
        </div>
      )}

      {/* Drag Overlay */}
      {isDragging && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(59, 130, 246, 0.1)',
          border: '2px dashed #3b82f6',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          <div style={{ color: '#3b82f6', fontSize: '24px', fontWeight: 'bold' }}>
            Drop files to upload
          </div>
        </div>
      )}

      {/* File List */}
      <div style={{ flex: 1, overflow: 'auto', background: '#1e293b', borderRadius: '4px', minHeight: 0 }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
            Loading files...
          </div>
        ) : files.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
            No files in this directory
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '12px', textAlign: 'left', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedFiles.size === files.length && files.length > 0}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#e2e8f0', fontSize: '14px' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#e2e8f0', fontSize: '14px', width: '120px' }}>Size</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#e2e8f0', fontSize: '14px', width: '180px' }}>Modified</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#e2e8f0', fontSize: '14px', width: '200px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr
                  key={file.path}
                  style={{
                    borderBottom: '1px solid #334155',
                    background: selectedFiles.has(file.path) ? '#334155' : 'transparent'
                  }}
                >
                  <td style={{ padding: '12px' }}>
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.path)}
                      onChange={() => toggleFileSelection(file.path)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <span style={{ flexShrink: 0 }}>{getFileIcon(file)}</span>
                      {file.isDirectory ? (
                        <button
                          onClick={() => navigateToDirectory(file.path)}
                          title={file.name}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#3b82f6',
                            cursor: 'pointer',
                            fontSize: '14px',
                            textDecoration: 'underline',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textAlign: 'left',
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {file.name}
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePreview(file)}
                          title={file.name}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#f1f5f9',
                            cursor: 'pointer',
                            fontSize: '14px',
                            textDecoration: 'underline',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            textAlign: 'left',
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {file.name}
                        </button>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px', color: '#94a3b8', fontSize: '14px' }}>
                    {file.isDirectory ? '-' : formatFileSize(file.size)}
                  </td>
                  <td style={{ padding: '12px', color: '#94a3b8', fontSize: '14px' }}>
                    {formatDate(file.modifiedAt)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {!file.isDirectory && (
                        <ButtonIcon
                          icon={<span style={{ fontSize: '16px' }}>⬇️</span>}
                          label="Download"
                          onClick={() => handleDownload(file)}
                          variant="bare"
                          subvariant="info"
                        />
                      )}
                      <ButtonIcon
                        icon={<span style={{ fontSize: '16px' }}>✏️</span>}
                        label="Rename"
                        onClick={() => {
                          setSelectedFile(file);
                          setNewName(file.name);
                          setShowRenameModal(true);
                        }}
                        variant="bare"
                        subvariant="warning"
                      />
                      <ButtonIcon
                        icon={<span style={{ fontSize: '16px' }}>📤</span>}
                        label="Move"
                        onClick={() => {
                          setSelectedFile(file);
                          const excludePaths = file.isDirectory ? [file.path] : [];
                          setTargetPath('');
                          setMoveBrowsePath('');
                          setMoveDirectories([]);
                          setMoveExcludePaths(excludePaths);
                          loadMoveDirectories('', excludePaths);
                          setShowMoveModal(true);
                        }}
                        variant="bare"
                        subvariant="info"
                      />
                      <ButtonIcon
                        icon={<span style={{ fontSize: '16px' }}>📋</span>}
                        label="Copy"
                        onClick={() => {
                          setSelectedFile(file);
                          const excludePaths = file.isDirectory ? [file.path] : [];
                          setCopyTargetPath('');
                          setCopyBrowsePath('');
                          setCopyDirectories([]);
                          setCopyExcludePaths(excludePaths);
                          loadCopyDirectories('', excludePaths);
                          setShowCopyModal(true);
                        }}
                        variant="bare"
                        subvariant="info"
                      />
                      <ButtonIcon
                        icon={<span style={{ fontSize: '16px' }}>🗑️</span>}
                        label="Delete"
                        onClick={() => handleDelete(file)}
                        variant="bare"
                        subvariant="danger"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>


      {/* Preview Modal */}
      {showPreviewModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => {
            setShowPreviewModal(false);
            setPreviewUrl('');
            setPreviewContent('');
          }}
        >
          <div
            style={{
              background: '#1e293b',
              borderRadius: '8px',
              minWidth: '50vw',
              minHeight: '50vh',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '16px',
              borderBottom: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '18px' }}>{selectedFile?.name}</h3>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewUrl('');
                  setPreviewContent('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '24px',
                  padding: '0 8px',
                }}
              >
                ×
              </button>
            </div>
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {previewType === 'image' && (
                <img
                  src={previewUrl}
                  alt={selectedFile?.name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              )}
              {previewType === 'pdf' && (
                <iframe
                  src={`${previewUrl}#view=FitH`}
                  style={{ width: '100%', height: '100%', border: 'none', minHeight: '500px' }}
                  title={selectedFile?.name}
                />
              )}
              {previewType === 'text' && (
                <pre style={{
                  margin: 0,
                  color: '#e2e8f0',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  width: '100%',
                }}>
                  {previewContent}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overwrite Confirmation Modal */}
      {showOverwriteModal && (
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
            width: '500px',
            maxWidth: '90vw',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#f1f5f9' }}>Confirm File Overwrite</h3>
            <p style={{ color: '#e2e8f0', marginBottom: '12px' }}>
              The following {filesToOverwrite.length === 1 ? 'file' : 'files'} will be overwritten:
            </p>
            <div style={{
              flex: 1,
              overflow: 'auto',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '4px',
              padding: '16px',
              marginBottom: '16px',
              maxHeight: '300px',
            }}>
              {filesToOverwrite.map((fileName, index) => (
                <div
                  key={index}
                  style={{
                    color: '#fbbf24',
                    padding: '8px 12px',
                    background: index % 2 === 0 ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                  }}
                >
                  {fileName}
                </div>
              ))}
            </div>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
              Do you want to proceed with the upload?
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelOverwrite}
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
                onClick={confirmOverwrite}
                style={{
                  padding: '8px 16px',
                  background: '#fbbf24',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Overwrite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
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
            width: '400px',
            maxWidth: '90vw',
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#f1f5f9' }}>Confirm Delete</h3>
            <p style={{ color: '#e2e8f0', marginBottom: '24px' }}>
              {deleteTargets.length === 1
                ? `Are you sure you want to delete "${deleteTargets[0].name}"?`
                : `Are you sure you want to delete ${deleteTargets.length} selected item(s)?`}
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteTargets([]);
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
                onClick={confirmDelete}
                style={{
                  padding: '8px 16px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
            width: '400px',
            maxWidth: '90vw',
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#f1f5f9' }}>Rename {selectedFile?.name}</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{
                width: 'calc(100% - 16px)',
                padding: '8px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#f1f5f9',
                marginBottom: '16px',
                boxSizing: 'border-box',
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
            width: '500px',
            maxWidth: '90vw',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#f1f5f9' }}>
              Move {selectedFiles.size > 0 ? `${selectedFiles.size} item(s)` : selectedFile?.name}
            </h3>

            {/* Path breadcrumbs */}
            <div style={{
              marginBottom: '12px',
              padding: '8px',
              background: '#0f172a',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexWrap: 'wrap',
            }}>
              {getMovePathParts().map((part, index) => (
                <React.Fragment key={part.path}>
                  {index > 0 && <span style={{ color: '#94a3b8' }}>{'>'}</span>}
                  <button
                    onClick={() => {
                      setTargetPath(part.path);
                      loadMoveDirectories(part.path, moveExcludePaths);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: moveBrowsePath === part.path ? '#3b82f6' : '#e2e8f0',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      fontSize: '13px',
                      fontWeight: moveBrowsePath === part.path ? 'bold' : 'normal',
                    }}
                  >
                    {part.label}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Directory list */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '4px',
              marginBottom: '16px',
              minHeight: '200px',
              maxHeight: '400px',
            }}>
              {moveDirectories.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                  No subdirectories
                </div>
              ) : (
                moveDirectories.map((dir) => (
                  <div
                    key={dir.path}
                    onClick={() => {
                      setTargetPath(dir.path);
                      loadMoveDirectories(dir.path, moveExcludePaths);
                    }}
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#e2e8f0',
                      background: targetPath === dir.path ? '#334155' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (targetPath !== dir.path) {
                        e.currentTarget.style.background = '#1e293b';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (targetPath !== dir.path) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <span>📁</span>
                    <span>{dir.name}</span>
                  </div>
                ))
              )}
            </div>

            {/* Current selection */}
            <div style={{ marginBottom: '16px', fontSize: '13px', color: '#94a3b8' }}>
              Selected: <span style={{ color: '#3b82f6' }}>{targetPath || '(root)'}</span>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setTargetPath('');
                  setSelectedFile(null);
                  setMoveBrowsePath('');
                  setMoveDirectories([]);
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
                Move Here
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Modal */}
      {showCopyModal && (
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
            width: '500px',
            maxWidth: '90vw',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#f1f5f9' }}>
              Copy {selectedFiles.size > 0 ? `${selectedFiles.size} item(s)` : selectedFile?.name}
            </h3>

            {/* Path breadcrumbs */}
            <div style={{
              marginBottom: '12px',
              padding: '8px',
              background: '#0f172a',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexWrap: 'wrap',
            }}>
              {getCopyPathParts().map((part, index) => (
                <React.Fragment key={part.path}>
                  {index > 0 && <span style={{ color: '#94a3b8' }}>{'>'}</span>}
                  <button
                    onClick={() => {
                      setCopyTargetPath(part.path);
                      loadCopyDirectories(part.path, copyExcludePaths);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copyBrowsePath === part.path ? '#3b82f6' : '#e2e8f0',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      fontSize: '13px',
                      fontWeight: copyBrowsePath === part.path ? 'bold' : 'normal',
                    }}
                  >
                    {part.label}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Directory list */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '4px',
              marginBottom: '16px',
              minHeight: '200px',
              maxHeight: '400px',
            }}>
              {copyDirectories.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                  No subdirectories
                </div>
              ) : (
                copyDirectories.map((dir) => (
                  <div
                    key={dir.path}
                    onClick={() => {
                      setCopyTargetPath(dir.path);
                      loadCopyDirectories(dir.path, copyExcludePaths);
                    }}
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #334155',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#e2e8f0',
                      background: copyTargetPath === dir.path ? '#334155' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (copyTargetPath !== dir.path) {
                        e.currentTarget.style.background = '#1e293b';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (copyTargetPath !== dir.path) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <span>📁</span>
                    <span>{dir.name}</span>
                  </div>
                ))
              )}
            </div>

            {/* Current selection */}
            <div style={{ marginBottom: '16px', fontSize: '13px', color: '#94a3b8' }}>
              Copying to: <span style={{ color: '#3b82f6' }}>{copyTargetPath || '(root)'}</span>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCopyModal(false);
                  setCopyTargetPath('');
                  setSelectedFile(null);
                  setCopyBrowsePath('');
                  setCopyDirectories([]);
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
                onClick={handleCopy}
                style={{
                  padding: '8px 16px',
                  background: '#8b5cf6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Copy Here
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
            width: '400px',
            maxWidth: '90vw',
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#f1f5f9' }}>Create New Folder</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Folder name"
              style={{
                width: 'calc(100% - 16px)',
                padding: '8px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '4px',
                color: '#f1f5f9',
                marginBottom: '16px',
                boxSizing: 'border-box',
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
