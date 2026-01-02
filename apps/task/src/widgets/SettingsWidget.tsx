import React, { useState, useEffect } from 'react';

export default function SettingsWidget() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [defaultPriority, setDefaultPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [showCompletedTasks, setShowCompletedTasks] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const settings = localStorage.getItem('taskSettings');
    if (settings) {
      try {
        const parsed = JSON.parse(settings);
        setEmailNotifications(parsed.emailNotifications ?? true);
        setDefaultPriority(parsed.defaultPriority ?? 'medium');
        setShowCompletedTasks(parsed.showCompletedTasks ?? true);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  function handleSave() {
    const settings = {
      emailNotifications,
      defaultPriority,
      showCompletedTasks,
    };
    localStorage.setItem('taskSettings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <h1 style={{
        color: '#f1f5f9',
        fontSize: '24px',
        fontWeight: '700',
        marginBottom: '8px',
      }}>
        Task Settings
      </h1>
      <p style={{
        color: '#94a3b8',
        fontSize: '14px',
        marginBottom: '24px',
      }}>
        Configure your personal task manager preferences
      </p>

      <div style={{
        background: '#0f172a',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '16px',
      }}>
        <h2 style={{
          color: '#f1f5f9',
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '16px',
        }}>
          Notifications
        </h2>

        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          color: '#e2e8f0',
        }}>
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(e) => setEmailNotifications(e.target.checked)}
            style={{
              width: '18px',
              height: '18px',
              cursor: 'pointer',
            }}
          />
          <span>Enable email notifications for task assignments</span>
        </label>
      </div>

      <div style={{
        background: '#0f172a',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '16px',
      }}>
        <h2 style={{
          color: '#f1f5f9',
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '16px',
        }}>
          Defaults
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            color: '#e2e8f0',
            fontSize: '14px',
            marginBottom: '8px',
          }}>
            Default Priority for New Tasks
          </label>
          <select
            value={defaultPriority}
            onChange={(e) => setDefaultPriority(e.target.value as 'low' | 'medium' | 'high')}
            style={{
              width: '100%',
              padding: '10px',
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div style={{
        background: '#0f172a',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <h2 style={{
          color: '#f1f5f9',
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '16px',
        }}>
          Display
        </h2>

        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          color: '#e2e8f0',
        }}>
          <input
            type="checkbox"
            checked={showCompletedTasks}
            onChange={(e) => setShowCompletedTasks(e.target.checked)}
            style={{
              width: '18px',
              height: '18px',
              cursor: 'pointer',
            }}
          />
          <span>Show completed tasks in task list</span>
        </label>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={handleSave}
          style={{
            padding: '10px 20px',
            background: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2563eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#3b82f6';
          }}
        >
          Save Settings
        </button>

        {saved && (
          <span style={{
            color: '#34d399',
            fontSize: '14px',
          }}>
            ✓ Settings saved
          </span>
        )}
      </div>
    </div>
  );
}
