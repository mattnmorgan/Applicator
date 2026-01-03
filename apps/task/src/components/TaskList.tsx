import React from 'react';
import { Task } from '../types';

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, status: Task['status']) => void;
}

export default function TaskList({ tasks, onEdit, onDelete, onStatusChange }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
        <p className="text-gray-600 dark:text-gray-400">No tasks found</p>
      </div>
    );
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'in-progress':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'pending':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {task.title}
                </h3>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}
                >
                  {task.priority}
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}
                >
                  {task.status.replace('-', ' ')}
                </span>
              </div>

              {task.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  {task.description}
                </p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                {task.assignedToName && (
                  <div>
                    <span className="font-medium">Assigned to:</span> {task.assignedToName}
                  </div>
                )}
                {task.createdByName && (
                  <div>
                    <span className="font-medium">Created by:</span> {task.createdByName}
                  </div>
                )}
                {task.dueDate && (
                  <div>
                    <span className="font-medium">Due:</span>{' '}
                    {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>

              {task.tags && task.tags.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {task.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {task.attachmentFileName && (
                <div className="mt-3">
                  <a
                    href={`/api/task/download?taskId=${task.id}`}
                    download={task.attachmentFileName}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M8 10L4 6H7V2H9V6H12L8 10Z"
                        fill="currentColor"
                      />
                      <path
                        d="M14 12V14H2V12H0V14C0 15.1 0.9 16 2 16H14C15.1 16 16 15.1 16 14V12H14Z"
                        fill="currentColor"
                      />
                    </svg>
                    {task.attachmentFileName}
                  </a>
                </div>
              )}
            </div>

            <div className="flex gap-2 ml-4">
              <select
                value={task.status}
                onChange={(e) => onStatusChange(task.id, e.target.value as Task['status'])}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>

              <button
                onClick={() => onEdit(task)}
                className="px-3 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
              >
                Edit
              </button>

              <button
                onClick={() => onDelete(task.id)}
                className="px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
