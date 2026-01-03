import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import HomeWidget from './widgets/HomeWidget';
import SettingsWidget from './widgets/SettingsWidget';
import SystemSettingsWidget from './widgets/SystemSettingsWidget';

// Export widgets for the plugin system
export { HomeWidget, SettingsWidget, SystemSettingsWidget };

// App attributes that will be read during installation
export function getAppAttributes() {
  return {
    appId: 'task',
    name: 'Task Manager',
    version: '1.0.0',
    author: 'Vibe Applicator',
    contactEmail: 'support@vibeapplicator.com',
    description: 'Manage tasks with assignments, priorities, and status tracking',
    icon: '', // Base64 encoded icon will be added during build
    authorizations: [
      {
        id: 'manage',
        name: 'Manage Tasks',
        description: 'Can create, edit, and delete tasks',
      },
      {
        id: 'assign',
        name: 'Assign Tasks',
        description: 'Can assign tasks to other users',
      },
      {
        id: 'view-all',
        name: 'View All Tasks',
        description: 'Can view tasks from all users',
      },
    ],
    apiRoutes: [
      {
        path: 'list',
        method: 'GET',
        handler: 'list',
        description: 'Get all tasks visible to the current user',
      },
      {
        path: 'create',
        method: 'POST',
        handler: 'create',
        description: 'Create a new task',
      },
      {
        path: 'update',
        method: 'PATCH',
        handler: 'update',
        description: 'Update an existing task',
      },
      {
        path: 'delete',
        method: 'DELETE',
        handler: 'delete',
        description: 'Delete a task',
      },
      {
        path: 'users',
        method: 'GET',
        handler: 'users',
        description: 'Get all active users for task assignment',
      },
    ],
    widgets: [
      {
        id: 'task-home-widget',
        name: 'Quick Task View',
        description: 'View and manage your tasks',
        target: 'home',
        component: 'HomeWidget',
        appId: 'task',
      },
      {
        id: 'task-settings-widget',
        name: 'Task Settings',
        description: 'Configure your task preferences',
        target: 'user-settings',
        component: 'SettingsWidget',
        appId: 'task',
      },
      {
        id: 'task-system-settings-widget',
        name: 'Task System Settings',
        description: 'Configure system-wide task settings',
        target: 'system-settings',
        component: 'SystemSettingsWidget',
        appId: 'task',
      },
    ],
  };
}

// Mount function called when the app is loaded
export function AppMount(container: HTMLElement, context: { appId: string }) {
  const root = createRoot(container);
  root.render(<App />);
}

// Unmount function called when leaving the app
export function AppUnmount() {
  // Cleanup if needed
}

// Expose functions and widgets globally with namespacing to prevent conflicts
if (typeof window !== 'undefined') {
  // Create app namespace if it doesn't exist
  if (!(window as any).__APPLICATOR_PLUGINS__) {
    (window as any).__APPLICATOR_PLUGINS__ = {};
  }

  // Store app-specific exports under the app ID
  (window as any).__APPLICATOR_PLUGINS__['task'] = {
    getAppAttributes,
    AppMount,
    AppUnmount,
    widgets: {
      HomeWidget,
      SettingsWidget,
      SystemSettingsWidget,
    },
  };
}
