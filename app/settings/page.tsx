'use client';

import { useState, useEffect } from 'react';
import FolderBrowser from '../components/FolderBrowser';
import Toast from '../components/Toast';

export default function SettingsPage() {
  const [storage, setStorage] = useState('');
  const [originalStorage, setOriginalStorage] = useState('');
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchStorage();
  }, []);

  const fetchStorage = async () => {
    try {
      const response = await fetch('/api/system/storage');
      const data = await response.json();
      setStorage(data.storage || '');
      setOriginalStorage(data.storage || '');
    } catch (error) {
      console.error('Failed to fetch storage:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/system/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storage }),
      });

      if (response.ok) {
        setOriginalStorage(storage);
        setToast({ message: 'Settings saved successfully', type: 'success' });
      } else {
        setToast({ message: 'Failed to save settings', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setToast({ message: 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = storage !== originalStorage;

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          margin: 0,
          color: '#f1f5f9'
        }}>
          Settings
        </h1>

        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: hasChanges ? '#10b981' : '#475569',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: hasChanges ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => {
            if (hasChanges) e.currentTarget.style.background = '#059669';
          }}
          onMouseOut={(e) => {
            if (hasChanges) e.currentTarget.style.background = '#10b981';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M11 2H3C2.44772 2 2 2.44772 2 3V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V5L11 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 2V5H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 9H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: '600px'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <label style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#f1f5f9'
          }}>
            System Storage
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={storage}
              disabled
              placeholder="No storage path selected"
              style={{
                flex: 1,
                padding: '10px 12px',
                background: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#94a3b8',
                fontSize: '14px',
                outline: 'none',
                cursor: 'not-allowed'
              }}
            />
            <button
              onClick={() => setIsBrowserOpen(true)}
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
              onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
            >
              Browse
            </button>
          </div>
          <p style={{
            fontSize: '12px',
            color: '#64748b',
            margin: 0
          }}>
            Select a folder where system files will be stored
          </p>
        </div>
      </div>

      <FolderBrowser
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        onConfirm={(path) => setStorage(path)}
        initialPath={storage}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
