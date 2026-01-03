'use client';

import { useState } from 'react';

type LogLevel = 'info' | 'debug' | 'error' | 'warning';

export default function TestLogsPage() {
  const [isLoading, setIsLoading] = useState<LogLevel | null>(null);
  const [message, setMessage] = useState('');

  const handleCreateLog = async (level: LogLevel) => {
    setIsLoading(level);
    setMessage('');

    try {
      const response = await fetch('/api/test/logging/create-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          message: `Test ${level} log created from test page`,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'Log created successfully!');
      } else {
        setMessage(data.error || 'Failed to create log.');
      }
    } catch (error) {
      console.error('Error creating log:', error);
      setMessage('Error creating log.');
    } finally {
      setIsLoading(null);
    }
  };

  const getButtonStyle = (level: LogLevel) => {
    const baseStyle = {
      border: 'none',
      borderRadius: '6px',
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: 500,
      cursor: isLoading ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s',
      opacity: isLoading && isLoading !== level ? 0.5 : 1,
    };

    const colors: Record<LogLevel, { bg: string; hover: string }> = {
      info: { bg: '#3b82f6', hover: '#2563eb' },
      debug: { bg: '#8b5cf6', hover: '#7c3aed' },
      error: { bg: '#ef4444', hover: '#dc2626' },
      warning: { bg: '#fbbf24', hover: '#f59e0b' },
    };

    return {
      ...baseStyle,
      background: isLoading === level ? '#334155' : colors[level].bg,
      color: '#fff',
    };
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '16px' }}>
        Test Logs
      </h1>

      <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
        Create test logs at different levels to verify the logging system is working correctly.
        Logs will be created with your user ID as the originator.
      </p>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => handleCreateLog('info')}
          disabled={!!isLoading}
          style={getButtonStyle('info')}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = '#2563eb';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = '#3b82f6';
            }
          }}
        >
          {isLoading === 'info' ? 'Creating...' : 'Create Info Log'}
        </button>

        <button
          onClick={() => handleCreateLog('debug')}
          disabled={!!isLoading}
          style={getButtonStyle('debug')}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = '#7c3aed';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = '#8b5cf6';
            }
          }}
        >
          {isLoading === 'debug' ? 'Creating...' : 'Create Debug Log'}
        </button>

        <button
          onClick={() => handleCreateLog('error')}
          disabled={!!isLoading}
          style={getButtonStyle('error')}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = '#dc2626';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = '#ef4444';
            }
          }}
        >
          {isLoading === 'error' ? 'Creating...' : 'Create Error Log'}
        </button>

        <button
          onClick={() => handleCreateLog('warning')}
          disabled={!!isLoading}
          style={getButtonStyle('warning')}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = '#f59e0b';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = '#fbbf24';
            }
          }}
        >
          {isLoading === 'warning' ? 'Creating...' : 'Create Warning Log'}
        </button>
      </div>

      {message && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: '6px',
            background: message.includes('success') || message.includes('Check Settings') ? '#10b98120' : '#ef444420',
            border: `1px solid ${message.includes('success') || message.includes('Check Settings') ? '#10b981' : '#ef4444'}`,
            color: message.includes('success') || message.includes('Check Settings') ? '#34d399' : '#f87171',
            fontSize: '14px',
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
