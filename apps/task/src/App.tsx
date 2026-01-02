import React, { useState, useEffect } from 'react';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import { Task } from './types';

const API_BASE = '/api/app-api/task';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/list`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTask(formData: FormData) {
    try {
      const response = await fetch(`${API_BASE}/create`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await loadTasks();
        setShowForm(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task');
    }
  }

  async function handleUpdateTask(taskId: string, formData: FormData) {
    try {
      formData.append('taskId', taskId);

      const response = await fetch(`${API_BASE}/update`, {
        method: 'PATCH',
        body: formData,
      });

      if (response.ok) {
        await loadTasks();
        setEditingTask(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`${API_BASE}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });

      if (response.ok) {
        await loadTasks();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  const filterButtonStyle = (isActive: boolean) => ({
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    background: isActive ? '#3b82f6' : '#1e293b',
    color: isActive ? '#ffffff' : '#e2e8f0',
  });

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '30px',
          fontWeight: '700',
          color: '#f1f5f9',
          marginBottom: '8px',
        }}>
          Task Manager
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
          Manage tasks with assignments, priorities, and status tracking
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{
          background: '#1e293b',
          borderRadius: '10px',
          padding: '16px',
          border: '1px solid #334155',
        }}>
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>Total</div>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#f1f5f9',
          }}>
            {stats.total}
          </div>
        </div>
        <div style={{
          background: '#1e293b',
          borderRadius: '10px',
          padding: '16px',
          border: '1px solid #334155',
        }}>
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>Pending</div>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#fbbf24',
          }}>
            {stats.pending}
          </div>
        </div>
        <div style={{
          background: '#1e293b',
          borderRadius: '10px',
          padding: '16px',
          border: '1px solid #334155',
        }}>
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>In Progress</div>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#60a5fa',
          }}>
            {stats.inProgress}
          </div>
        </div>
        <div style={{
          background: '#1e293b',
          borderRadius: '10px',
          padding: '16px',
          border: '1px solid #334155',
        }}>
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>Completed</div>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#34d399',
          }}>
            {stats.completed}
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'pending', 'in-progress', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={filterButtonStyle(filter === status)}
              onMouseEnter={(e) => {
                if (filter !== status) {
                  e.currentTarget.style.background = '#334155';
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== status) {
                  e.currentTarget.style.background = '#1e293b';
                }
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setShowForm(true);
            setEditingTask(null);
          }}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
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
          + New Task
        </button>
      </div>

      {/* Task List */}
      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 0',
          color: '#94a3b8',
        }}>
          Loading tasks...
        </div>
      ) : (
        <TaskList
          tasks={filteredTasks}
          onEdit={(task) => {
            setEditingTask(task);
            setShowForm(true);
          }}
          onDelete={handleDeleteTask}
          onStatusChange={async (taskId, status) => {
            const formData = new FormData();
            formData.append('updates', JSON.stringify({ status }));
            await handleUpdateTask(taskId, formData);
          }}
        />
      )}

      {/* Task Form Modal */}
      {showForm && (
        <TaskForm
          task={editingTask}
          onSubmit={editingTask ? (data) => handleUpdateTask(editingTask.id, data as FormData) : (data) => handleCreateTask(data as FormData)}
          onCancel={() => {
            setShowForm(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}
