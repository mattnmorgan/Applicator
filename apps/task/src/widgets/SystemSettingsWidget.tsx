import React, { useState } from 'react';

export default function SystemSettingsWidget() {
  const [maxTasksPerUser, setMaxTasksPerUser] = useState(100);
  const [taskRetentionDays, setTaskRetentionDays] = useState(90);
  const [allowFileAttachments, setAllowFileAttachments] = useState(true);
  const [maxFileSize, setMaxFileSize] = useState(10);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    // In a real implementation, this would save to the system configuration
    // For now, we'll just show a success message
    console.log('System settings:', {
      maxTasksPerUser,
      taskRetentionDays,
      allowFileAttachments,
      maxFileSize,
    });
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
        Task Manager System Settings
      </h1>
      <p style={{
        color: '#94a3b8',
        fontSize: '14px',
        marginBottom: '24px',
      }}>
        Configure system-wide task manager settings (Admin only)
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
          Task Limits
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            color: '#e2e8f0',
            fontSize: '14px',
            marginBottom: '8px',
          }}>
            Maximum Tasks Per User
          </label>
          <input
            type="number"
            value={maxTasksPerUser}
            onChange={(e) => setMaxTasksPerUser(parseInt(e.target.value) || 0)}
            min="1"
            max="1000"
            style={{
              width: '100%',
              padding: '10px',
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
          <p style={{
            color: '#94a3b8',
            fontSize: '12px',
            marginTop: '4px',
          }}>
            Maximum number of active tasks a single user can have
          </p>
        </div>

        <div>
          <label style={{
            display: 'block',
            color: '#e2e8f0',
            fontSize: '14px',
            marginBottom: '8px',
          }}>
            Task Retention Period (days)
          </label>
          <input
            type="number"
            value={taskRetentionDays}
            onChange={(e) => setTaskRetentionDays(parseInt(e.target.value) || 0)}
            min="1"
            max="365"
            style={{
              width: '100%',
              padding: '10px',
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
          <p style={{
            color: '#94a3b8',
            fontSize: '12px',
            marginTop: '4px',
          }}>
            Completed tasks will be archived after this many days
          </p>
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
          File Attachments
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            color: '#e2e8f0',
          }}>
            <input
              type="checkbox"
              checked={allowFileAttachments}
              onChange={(e) => setAllowFileAttachments(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
              }}
            />
            <span>Allow file attachments on tasks</span>
          </label>
        </div>

        {allowFileAttachments && (
          <div>
            <label style={{
              display: 'block',
              color: '#e2e8f0',
              fontSize: '14px',
              marginBottom: '8px',
            }}>
              Maximum File Size (MB)
            </label>
            <input
              type="number"
              value={maxFileSize}
              onChange={(e) => setMaxFileSize(parseInt(e.target.value) || 0)}
              min="1"
              max="100"
              style={{
                width: '100%',
                padding: '10px',
                background: '#1e293b',
                color: '#f1f5f9',
                border: '1px solid #334155',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
            <p style={{
              color: '#94a3b8',
              fontSize: '12px',
              marginTop: '4px',
            }}>
              Maximum size for file attachments
            </p>
          </div>
        )}
      </div>

      <div style={{
        background: '#fef3c7',
        border: '1px solid #fbbf24',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
        }}>
          <div style={{
            color: '#f59e0b',
            fontSize: '20px',
            flexShrink: 0,
          }}>
            ⚠️
          </div>
          <div>
            <h3 style={{
              color: '#92400e',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '4px',
            }}>
              System-wide Settings
            </h3>
            <p style={{
              color: '#92400e',
              fontSize: '13px',
              lineHeight: '1.5',
            }}>
              Changes to these settings will affect all users of the task manager.
              Please ensure you understand the impact before saving.
            </p>
          </div>
        </div>
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
          Save System Settings
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
