'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Notification } from '@/lib/notifications';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Array<Notification & { key: string }>>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<
    Array<Notification & { key: string }>
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'archived'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications?includeArchived=true');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    let filtered = notifications;

    if (filterType === 'unread') {
      filtered = filtered.filter((n) => !n.read && !n.archived);
    } else if (filterType === 'archived') {
      filtered = filtered.filter((n) => n.archived);
    } else {
      filtered = filtered.filter((n) => !n.archived);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title?.toLowerCase().includes(query) ||
          n.message.toLowerCase().includes(query) ||
          n.app.toLowerCase().includes(query) ||
          new Date(n.timestamp).toLocaleString().toLowerCase().includes(query)
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, searchQuery, filterType]);

  const handleMarkRead = async (timestamp: number, read: boolean) => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp, read }),
      });
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification:', error);
    }
  };

  const handleArchive = async (timestamp: number) => {
    try {
      await fetch('/api/notifications/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp }),
      });
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to archive notification:', error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#fbbf24';
      case 'success':
        return '#10b981';
      case 'info':
      default:
        return '#3b82f6';
    }
  };

  const getTypeIcon = (notification: Notification) => {
    const iconStyle = { width: '24px', height: '24px' };
    const color = getTypeColor(notification.type);

    switch (notification.type) {
      case 'error':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={iconStyle}>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case 'warning':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={iconStyle}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'success':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={iconStyle}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" style={iconStyle}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f172a',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              marginBottom: '16px',
              padding: '8px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#f1f5f9', margin: '0 0 24px 0' }}>
            Notifications
          </h1>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                minWidth: '250px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '12px 16px',
                color: '#f1f5f9',
                fontSize: '14px',
              }}
            />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setFilterType('all')}
                style={{
                  background: filterType === 'all' ? '#3b82f6' : '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  color: filterType === 'all' ? '#fff' : '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('unread')}
                style={{
                  background: filterType === 'unread' ? '#3b82f6' : '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  color: filterType === 'unread' ? '#fff' : '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Unread
              </button>
              <button
                onClick={() => setFilterType('archived')}
                style={{
                  background: filterType === 'archived' ? '#3b82f6' : '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  color: filterType === 'archived' ? '#fff' : '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Archived
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '64px',
              color: '#94a3b8',
            }}
          >
            Loading...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '64px',
              color: '#94a3b8',
            }}
          >
            No notifications found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredNotifications.map((notification) => (
              <div
                key={notification.key}
                onClick={() => {
                  if (notification.url) {
                    router.push(notification.url);
                  }
                }}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '20px',
                  cursor: notification.url ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  position: 'relative',
                  display: 'flex',
                  gap: '16px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#334155';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1e293b';
                }}
              >
                {!notification.read && !notification.archived && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '4px',
                      background: getTypeColor(notification.type),
                      borderTopLeftRadius: '8px',
                      borderBottomLeftRadius: '8px',
                    }}
                  />
                )}

                <div style={{ flexShrink: 0, marginLeft: notification.read || notification.archived ? '0' : '8px' }}>
                  {notification.icon ? (
                    <img src={notification.icon} alt="" style={{ width: '24px', height: '24px' }} />
                  ) : (
                    getTypeIcon(notification)
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {notification.title && (
                        <div
                          style={{
                            color: '#f1f5f9',
                            fontWeight: 600,
                            fontSize: '16px',
                            marginBottom: '8px',
                          }}
                        >
                          {notification.title}
                        </div>
                      )}
                      <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px', wordBreak: 'break-word' }}>
                        {notification.message}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b' }}>
                        <span>{notification.app}</span>
                        <span>{new Date(notification.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      {!notification.archived && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(notification.timestamp, !notification.read);
                          }}
                          style={{
                            background: '#334155',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                          }}
                          title={notification.read ? 'Mark as unread' : 'Mark as read'}
                        >
                          {notification.read ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          )}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(notification.timestamp);
                        }}
                        style={{
                          background: '#334155',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94a3b8',
                        }}
                        title={notification.archived ? 'Already archived' : 'Archive notification'}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
