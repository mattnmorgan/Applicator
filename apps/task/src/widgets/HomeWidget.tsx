import React, { useState, useEffect } from 'react';

interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

export default function HomeWidget() {
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const response = await fetch('/api/task/list');
      if (response.ok) {
        const data = await response.json();
        const tasks = data.tasks || [];

        setStats({
          total: tasks.length,
          pending: tasks.filter((t: any) => t.status === 'pending').length,
          inProgress: tasks.filter((t: any) => t.status === 'in-progress').length,
          completed: tasks.filter((t: any) => t.status === 'completed').length,
        });
      }
    } catch (error) {
      console.error('Error loading task stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const completionRate = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  return (
    <div style={{
      background: '#1e293b',
      borderRadius: '10px',
      padding: '20px',
      border: '1px solid #334155',
    }}>
      <h3 style={{
        color: '#f1f5f9',
        fontSize: '18px',
        fontWeight: '600',
        marginBottom: '16px',
      }}>
        Task Overview
      </h3>

      {loading ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
          Loading...
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '16px',
          }}>
            <div style={{
              background: '#0f172a',
              padding: '12px',
              borderRadius: '8px',
            }}>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>
                Total
              </div>
              <div style={{ color: '#f1f5f9', fontSize: '24px', fontWeight: '700' }}>
                {stats.total}
              </div>
            </div>

            <div style={{
              background: '#0f172a',
              padding: '12px',
              borderRadius: '8px',
            }}>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>
                Pending
              </div>
              <div style={{ color: '#fbbf24', fontSize: '24px', fontWeight: '700' }}>
                {stats.pending}
              </div>
            </div>

            <div style={{
              background: '#0f172a',
              padding: '12px',
              borderRadius: '8px',
            }}>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>
                In Progress
              </div>
              <div style={{ color: '#60a5fa', fontSize: '24px', fontWeight: '700' }}>
                {stats.inProgress}
              </div>
            </div>

            <div style={{
              background: '#0f172a',
              padding: '12px',
              borderRadius: '8px',
            }}>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>
                Completed
              </div>
              <div style={{ color: '#34d399', fontSize: '24px', fontWeight: '700' }}>
                {stats.completed}
              </div>
            </div>
          </div>

          <div style={{
            background: '#0f172a',
            padding: '12px',
            borderRadius: '8px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}>
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                Completion Rate
              </span>
              <span style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: '600' }}>
                {completionRate}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: '#334155',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${completionRate}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #34d399 0%, #10b981 100%)',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          <a
            href="/app/task"
            style={{
              display: 'block',
              marginTop: '16px',
              padding: '10px',
              background: '#3b82f6',
              color: '#ffffff',
              textAlign: 'center',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#3b82f6';
            }}
          >
            View All Tasks
          </a>
        </>
      )}
    </div>
  );
}
