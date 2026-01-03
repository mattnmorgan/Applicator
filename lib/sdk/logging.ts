/**
 * Logging SDK for Vibe Applicator Plugins
 *
 * This module provides logging capabilities for plugins to log messages
 * that appear in the system logs viewer (Settings → Debug → Logs).
 *
 * @example
 * ```typescript
 * import { createPlugin } from '@/lib/sdk';
 *
 * const plugin = createPlugin('my-app-id', 'user-123');
 *
 * // Log informational messages
 * await plugin.logger.info('Task created: Buy groceries');
 *
 * // Log warnings
 * await plugin.logger.warn('Task assignment failed - user not found');
 *
 * // Log errors
 * await plugin.logger.error('Failed to save task to database');
 *
 * // Log debug messages
 * await plugin.logger.debug('Processing task validation');
 * ```
 */

import { logger as systemLogger, type LogLevel } from '../logging';

export interface LoggerOptions {
  appId: string;
  userId?: string;
}

export class Logger {
  private appId: string;
  private userId?: string;

  constructor(options: LoggerOptions) {
    this.appId = options.appId;
    this.userId = options.userId;
  }

  /**
   * Log an informational message
   * @param message The message to log
   */
  async info(message: string): Promise<void> {
    await systemLogger.info(this.appId, message, this.userId);
  }

  /**
   * Log a warning message
   * @param message The message to log
   */
  async warn(message: string): Promise<void> {
    await systemLogger.warn(this.appId, message, this.userId);
  }

  /**
   * Log an error message
   * @param message The message to log
   */
  async error(message: string): Promise<void> {
    await systemLogger.error(this.appId, message, this.userId);
  }

  /**
   * Log a debug message
   * @param message The message to log
   */
  async debug(message: string): Promise<void> {
    await systemLogger.debug(this.appId, message, this.userId);
  }
}

/**
 * Create a logger instance for a plugin
 * @param appId The ID of the app/plugin
 * @param userId Optional ID of the user (automatically included in logs)
 * @returns A logger instance
 */
export function createLogger(appId: string, userId?: string): Logger {
  return new Logger({ appId, userId });
}
