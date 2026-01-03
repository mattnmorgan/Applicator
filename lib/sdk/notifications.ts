import { createNotification, type NotificationType } from '../notifications';

export interface NotificationManagerOptions {
  appId: string;
  userId?: string;
}

export interface SendNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  url?: string;
  userId?: string;
}

/**
 * NotificationManager provides apps with the ability to send notifications to users
 */
export class NotificationManager {
  private appId: string;
  private userId?: string;

  constructor(options: NotificationManagerOptions) {
    this.appId = options.appId;
    this.userId = options.userId;
  }

  /**
   * Send a notification to a user
   * @param params Notification parameters
   * @returns The created notification
   *
   * @example
   * ```typescript
   * await notificationManager.send({
   *   type: 'success',
   *   title: 'Task completed',
   *   message: 'Your task has been completed successfully',
   *   url: '/app/tasks/123'
   * });
   * ```
   */
  async send(params: SendNotificationParams) {
    const targetUserId = params.userId || this.userId;

    if (!targetUserId) {
      throw new Error('userId is required to send notification');
    }

    return await createNotification({
      userId: targetUserId,
      type: params.type,
      app: this.appId,
      icon: params.icon,
      title: params.title,
      message: params.message,
      url: params.url,
    });
  }

  /**
   * Send a success notification
   */
  async success(title: string, message: string, url?: string) {
    return this.send({ type: 'success', title, message, url });
  }

  /**
   * Send an error notification
   */
  async error(title: string, message: string, url?: string) {
    return this.send({ type: 'error', title, message, url });
  }

  /**
   * Send a warning notification
   */
  async warning(title: string, message: string, url?: string) {
    return this.send({ type: 'warning', title, message, url });
  }

  /**
   * Send an info notification
   */
  async info(title: string, message: string, url?: string) {
    return this.send({ type: 'info', title, message, url });
  }
}

/**
 * Create a new NotificationManager instance
 * @param appId The ID of the app sending notifications
 * @param userId Optional user ID (defaults to current user)
 * @returns A NotificationManager instance
 */
export function createNotificationManager(
  appId: string,
  userId?: string
): NotificationManager {
  return new NotificationManager({ appId, userId });
}
