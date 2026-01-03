'use client';

import { useState } from 'react';

export default function TestNotificationsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSendNotification = async () => {
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/test/notifications/send-notification', {
        method: 'POST',
      });

      if (response.ok) {
        setMessage('Test notification sent successfully!');
      } else {
        setMessage('Failed to send test notification.');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      setMessage('Error sending test notification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '16px' }}>
        Test Notifications
      </h1>

      <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
        Use this page to test the notification system by sending a test notification to yourself.
      </p>

      <button
        onClick={handleSendNotification}
        disabled={isLoading}
        style={{
          background: isLoading ? '#334155' : '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          padding: '12px 24px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
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
        {isLoading ? 'Sending...' : 'Send Test Notification'}
      </button>

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
