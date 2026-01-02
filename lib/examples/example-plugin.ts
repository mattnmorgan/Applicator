/**
 * Example Plugin - Task Manager
 *
 * This example demonstrates how to use the Plugin SDK to create a task management plugin
 * that integrates with the Vibe Applicator system.
 *
 * Features:
 * - Create, read, update, delete tasks (using RecordManager)
 * - Check user permissions (using SystemInterface)
 * - Assign tasks to users in the system
 * - Filter tasks by status and assignee
 */

import {
  createPlugin,
  requireAuthorization,
  type Plugin,
} from '../plugin-sdk';
import { createAuthorization } from '../db';

// Define the app ID for this plugin
const TASK_MANAGER_APP_ID = 'task-manager';

// Define custom authorization IDs for this app
const TASK_MANAGER_AUTHORIZATIONS = {
  MANAGE_TASKS: 'task-manager:manage-tasks',
  ASSIGN_TASKS: 'task-manager:assign-tasks',
  VIEW_ALL_TASKS: 'task-manager:view-all-tasks',
};

// Define the task data structure
export interface Task {
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo?: string; // User ID
  dueDate?: string; // ISO 8601 date string
  priority: 'low' | 'medium' | 'high';
  createdBy: string; // User ID
  tags?: string[];
}

/**
 * Initialize the Task Manager plugin
 * Creates custom authorizations for task management
 */
export async function initializeTaskManager(): Promise<void> {
  // Create custom authorizations for this app
  await createAuthorization(
    TASK_MANAGER_AUTHORIZATIONS.MANAGE_TASKS,
    'Manage Tasks',
    'Can create, edit, and delete tasks',
    TASK_MANAGER_APP_ID
  );

  await createAuthorization(
    TASK_MANAGER_AUTHORIZATIONS.ASSIGN_TASKS,
    'Assign Tasks',
    'Can assign tasks to other users',
    TASK_MANAGER_APP_ID
  );

  await createAuthorization(
    TASK_MANAGER_AUTHORIZATIONS.VIEW_ALL_TASKS,
    'View All Tasks',
    'Can view tasks from all users',
    TASK_MANAGER_APP_ID
  );
}

/**
 * Task Manager class - demonstrates plugin usage
 */
export class TaskManager {
  private plugin: Plugin<Task>;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.plugin = createPlugin<Task>(TASK_MANAGER_APP_ID, userId);
  }

  /**
   * Create a new task
   * Requires 'manage-tasks' authorization
   */
  async createTask(taskData: Omit<Task, 'createdBy'>): Promise<void> {
    // Check if user has permission to manage tasks
    await requireAuthorization(
      this.plugin,
      TASK_MANAGER_AUTHORIZATIONS.MANAGE_TASKS
    );

    // Validate assignee if provided
    if (taskData.assignedTo) {
      const assignee = await this.plugin.system.getUser(taskData.assignedTo);
      if (!assignee) {
        throw new Error('Assigned user does not exist');
      }

      // Check if user can assign tasks
      const canAssign = await this.plugin.system.checkMyAuthorization(
        TASK_MANAGER_AUTHORIZATIONS.ASSIGN_TASKS
      );
      if (!canAssign) {
        throw new Error('User does not have permission to assign tasks');
      }
    }

    // Create the task
    const task: Task = {
      ...taskData,
      createdBy: this.userId,
    };

    await this.plugin.records.create(task);
  }

  /**
   * Get all tasks (respects permissions)
   */
  async getTasks(): Promise<Array<{ id: string; task: Task }>> {
    // Check if user can view all tasks
    const canViewAll = await this.plugin.system.checkMyAuthorization(
      TASK_MANAGER_AUTHORIZATIONS.VIEW_ALL_TASKS
    );

    // Get all tasks
    const result = await this.plugin.records.list();

    // Filter based on permissions
    const tasks = result.records
      .filter((record) => {
        if (canViewAll) {
          return true; // Can see all tasks
        }
        // Can only see tasks created by or assigned to them
        return (
          record.data.createdBy === this.userId ||
          record.data.assignedTo === this.userId
        );
      })
      .map((record) => ({
        id: record.id,
        task: record.data,
      }));

    return tasks;
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(
    status: 'pending' | 'in-progress' | 'completed'
  ): Promise<Array<{ id: string; task: Task }>> {
    const allTasks = await this.getTasks();
    return allTasks.filter((t) => t.task.status === status);
  }

  /**
   * Get tasks assigned to a specific user
   */
  async getTasksByAssignee(
    userId: string
  ): Promise<Array<{ id: string; task: Task }>> {
    const allTasks = await this.getTasks();
    return allTasks.filter((t) => t.task.assignedTo === userId);
  }

  /**
   * Update a task
   */
  async updateTask(
    taskId: string,
    updates: Partial<Task>
  ): Promise<void> {
    await requireAuthorization(
      this.plugin,
      TASK_MANAGER_AUTHORIZATIONS.MANAGE_TASKS
    );

    const existing = await this.plugin.records.read(taskId);
    if (!existing) {
      throw new Error('Task not found');
    }

    // Check ownership or view-all permission
    const canViewAll = await this.plugin.system.checkMyAuthorization(
      TASK_MANAGER_AUTHORIZATIONS.VIEW_ALL_TASKS
    );

    if (
      !canViewAll &&
      existing.data.createdBy !== this.userId &&
      existing.data.assignedTo !== this.userId
    ) {
      throw new Error('You do not have permission to update this task');
    }

    // Validate assignee if being updated
    if (updates.assignedTo) {
      const canAssign = await this.plugin.system.checkMyAuthorization(
        TASK_MANAGER_AUTHORIZATIONS.ASSIGN_TASKS
      );
      if (!canAssign) {
        throw new Error('You do not have permission to assign tasks');
      }

      const assignee = await this.plugin.system.getUser(updates.assignedTo);
      if (!assignee) {
        throw new Error('Assigned user does not exist');
      }
    }

    await this.plugin.records.update(taskId, updates);
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    await requireAuthorization(
      this.plugin,
      TASK_MANAGER_AUTHORIZATIONS.MANAGE_TASKS
    );

    const existing = await this.plugin.records.read(taskId);
    if (!existing) {
      throw new Error('Task not found');
    }

    // Check ownership or view-all permission
    const canViewAll = await this.plugin.system.checkMyAuthorization(
      TASK_MANAGER_AUTHORIZATIONS.VIEW_ALL_TASKS
    );

    if (!canViewAll && existing.data.createdBy !== this.userId) {
      throw new Error('You can only delete tasks you created');
    }

    await this.plugin.records.delete(taskId);
  }

  /**
   * Get list of users that can be assigned tasks
   */
  async getAssignableUsers() {
    const users = await this.plugin.system.getUsers(false);
    return users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      authorityName: user.authorityName,
    }));
  }

  /**
   * Get task statistics
   */
  async getStatistics() {
    const allTasks = await this.getTasks();

    return {
      total: allTasks.length,
      pending: allTasks.filter((t) => t.task.status === 'pending').length,
      inProgress: allTasks.filter((t) => t.task.status === 'in-progress')
        .length,
      completed: allTasks.filter((t) => t.task.status === 'completed').length,
      byPriority: {
        low: allTasks.filter((t) => t.task.priority === 'low').length,
        medium: allTasks.filter((t) => t.task.priority === 'medium').length,
        high: allTasks.filter((t) => t.task.priority === 'high').length,
      },
    };
  }
}

/**
 * Example usage:
 *
 * // Initialize the plugin (do this once when the app is installed)
 * await initializeTaskManager();
 *
 * // Create a task manager instance for a user
 * const taskManager = new TaskManager('user-123');
 *
 * // Create a task
 * await taskManager.createTask({
 *   title: 'Implement login feature',
 *   description: 'Add JWT authentication to the API',
 *   status: 'pending',
 *   priority: 'high',
 *   assignedTo: 'user-456',
 *   dueDate: '2026-01-10T00:00:00Z',
 *   tags: ['feature', 'backend']
 * });
 *
 * // Get all tasks
 * const tasks = await taskManager.getTasks();
 *
 * // Get pending tasks
 * const pendingTasks = await taskManager.getTasksByStatus('pending');
 *
 * // Get tasks assigned to a user
 * const userTasks = await taskManager.getTasksByAssignee('user-456');
 *
 * // Update a task
 * await taskManager.updateTask('task-id', { status: 'in-progress' });
 *
 * // Get statistics
 * const stats = await taskManager.getStatistics();
 *
 * // Delete a task
 * await taskManager.deleteTask('task-id');
 */
