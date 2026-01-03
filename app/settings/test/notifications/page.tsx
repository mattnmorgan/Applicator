'use client';

import { useState } from 'react';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

export default function TestNotificationsPage() {
  const [isLoading, setIsLoading] = useState<NotificationType | null>(null);
  const [message, setMessage] = useState('');

  const handleSendNotification = async (type: NotificationType) => {
    setIsLoading(type);
    setMessage('');

    try {
      const response = await fetch('/api/system/test/notifications/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        setMessage(`Test ${type} notification sent successfully!`);
      } else {
        setMessage('Failed to send test notification.');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      setMessage('Error sending test notification.');
    } finally {
      setIsLoading(null);
    }
  };

  const getButtonStyle = (type: NotificationType) => {
    const baseStyle = {
      border: 'none',
      borderRadius: '6px',
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: 500,
      cursor: isLoading ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s',
      opacity: isLoading && isLoading !== type ? 0.5 : 1,
    };

    const colors: Record<NotificationType, { bg: string; hover: string }> = {
      info: { bg: '#3b82f6', hover: '#2563eb' },
      success: { bg: '#10b981', hover: '#059669' },
      warning: { bg: '#fbbf24', hover: '#f59e0b' },
      error: { bg: '#ef4444', hover: '#dc2626' },
    };

    return {
      ...baseStyle,
      background: isLoading === type ? '#334155' : colors[type].bg,
      color: '#fff',
    };
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '16px' }}>
        Test Notifications
      </h1>

      <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
        Send test notifications at different levels to verify the notification system is working correctly.
      </p>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => handleSendNotification('info')}
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
          {isLoading === 'info' ? 'Sending...' : 'Send Info Notification'}
        </button>

        <button
          onClick={() => handleSendNotification('success')}
          disabled={!!isLoading}
          style={getButtonStyle('success')}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = '#059669';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = '#10b981';
            }
          }}
        >
          {isLoading === 'success' ? 'Sending...' : 'Send Success Notification'}
        </button>

        <button
          onClick={() => handleSendNotification('warning')}
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
          {isLoading === 'warning' ? 'Sending...' : 'Send Warning Notification'}
        </button>

        <button
          onClick={() => handleSendNotification('error')}
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
          {isLoading === 'error' ? 'Sending...' : 'Send Error Notification'}
        </button>
      </div>

      {message && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: '6px',
            background: message.includes('success') ? '#10b98120' : '#ef444420',
            border: `1px solid ${message.includes('success') ? '#10b981' : '#ef4444'}`,
            color: message.includes('success') ? '#34d399' : '#f87171',
            fontSize: '14px',
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
