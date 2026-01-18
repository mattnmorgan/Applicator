'use client';

import { useState, useEffect } from 'react';
import styles from './FolderBrowser.module.css';

interface FolderBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (path: string) => void;
  initialPath?: string;
}

interface Directory {
  name: string;
  path: string;
}

export default function FolderBrowser({ isOpen, onClose, onConfirm, initialPath }: FolderBrowserProps) {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [drives, setDrives] = useState<string[]>([]);
  const [platform, setPlatform] = useState<'win32' | 'unix'>('win32');
  const [loading, setLoading] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialPath) {
        loadDirectory(initialPath);
      } else {
        loadDrives();
      }
    }
  }, [isOpen, initialPath]);

  const loadDrives = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/system/apps/fs');
      const data = await response.json();
      setDrives(data.drives || []);
      setPlatform(data.platform);
      setCurrentPath('');
      setDirectories([]);
    } catch (error) {
      console.error('Failed to load drives:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDirectory = async (path: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/system/apps/fs?path=${encodeURIComponent(path)}`);
      const data = await response.json();
      setDirectories(data.directories || []);
      setCurrentPath(data.currentPath);
      setDrives([]);
    } catch (error) {
      console.error('Failed to load directory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDrive = (drive: string) => {
    const drivePath = platform === 'win32' ? `${drive}\\` : drive;
    loadDirectory(drivePath);
  };

  const handleSelectDirectory = (dir: Directory) => {
    loadDirectory(dir.path);
  };

  const handleNavigateUp = (index: number) => {
    const pathParts = currentPath.split(platform === 'win32' ? '\\' : '/').filter(Boolean);

    if (index === -1) {
      // Go back to drives
      loadDrives();
      return;
    }

    const newPathParts = pathParts.slice(0, index + 1);
    const newPath = platform === 'win32'
      ? newPathParts.join('\\') + '\\'
      : '/' + newPathParts.join('/');

    loadDirectory(newPath);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !currentPath) return;

    try {
      const response = await fetch('/api/system/apps/fs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentPath,
          name: newFolderName.trim(),
        }),
      });

      if (response.ok) {
        setNewFolderName('');
        setShowNewFolderInput(false);
        loadDirectory(currentPath);
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const handleDeleteFolder = async (dir: Directory) => {
    if (!confirm(`Are you sure you want to delete "${dir.name}"?`)) return;

    try {
      const response = await fetch('/api/system/apps/fs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: dir.path,
        }),
      });

      if (response.ok) {
        loadDirectory(currentPath);
      }
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  };

  const handleConfirm = () => {
    onConfirm(currentPath);
    onClose();
  };

  if (!isOpen) return null;

  const pathParts = currentPath ? currentPath.split(platform === 'win32' ? '\\' : '/').filter(Boolean) : [];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Select Folder</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className={styles.pathBar}>
          <button className={styles.pathSegment} onClick={() => handleNavigateUp(-1)}>
            Root
          </button>
          {pathParts.map((part, index) => (
            <span key={index}>
              <span className={styles.pathSeparator}>{'>'}</span>
              <button className={styles.pathSegment} onClick={() => handleNavigateUp(index)}>
                {part}
              </button>
            </span>
          ))}
        </div>

        <div className={styles.content}>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : drives.length > 0 ? (
            <div className={styles.list}>
              {drives.map(drive => (
                <div key={drive} className={`${styles.item} ${styles.driveItem}`} onClick={() => handleSelectDrive(drive)}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={styles.icon}>
                    <rect x="2" y="6" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="5" cy="11" r="0.75" fill="currentColor" />
                    <path d="M8 9H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M8 11H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M8 13H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span>{drive}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.list}>
              {directories.map(dir => (
                <div key={dir.path} className={styles.item}>
                  <div className={styles.itemContent} onClick={() => handleSelectDirectory(dir)}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={styles.icon}>
                      <path d="M3 6C3 4.89543 3.89543 4 5 4H7L9 6H15C16.1046 6 17 6.89543 17 8V14C17 15.1046 16.1046 16 15 16H5C3.89543 16 3 15.1046 3 14V6Z" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    <span>{dir.name}</span>
                  </div>
                  <button className={styles.deleteButton} onClick={() => handleDeleteFolder(dir)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 6V13C4 13.5523 4.44772 14 5 14H11C11.5523 14 12 13.5523 12 13V6M2 4H14M6 4V3C6 2.44772 6.44772 2 7 2H9C9.55228 2 10 2.44772 10 3V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
              {directories.length === 0 && <div className={styles.empty}>No folders</div>}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          {currentPath && (
            <>
              {showNewFolderInput ? (
                <div className={styles.newFolderInput}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                  <button className={styles.button} onClick={handleCreateFolder}>
                    Create
                  </button>
                  <button className={styles.buttonSecondary} onClick={() => {
                    setShowNewFolderInput(false);
                    setNewFolderName('');
                  }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button className={styles.buttonSecondary} onClick={() => setShowNewFolderInput(true)}>
                  New Folder
                </button>
              )}
            </>
          )}
          <div className={styles.spacer} />
          <button className={styles.buttonSecondary} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.button}
            onClick={handleConfirm}
            disabled={!currentPath}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
