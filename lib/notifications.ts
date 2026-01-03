import { getRedisClient } from './redis';

export type NotificationType = 'warning' | 'error' | 'success' | 'info';

export interface Notification {
  type: NotificationType;
  app: string;
  icon?: string;
  title: string;
  message: string;
  url?: string;
  timestamp: number;
  read: boolean;
  archived: boolean;
}

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  app: string;
  icon?: string;
  title: string;
  message: string;
  url?: string;
}

/**
 * Create a new notification for a user
 */
export async function createNotification(params: CreateNotificationParams): Promise<Notification> {
  const redis = getRedisClient();
  const timestamp = Date.now();
  const key = `notification:${params.userId}:${timestamp}`;

  const notification: Notification = {
    type: params.type,
    app: params.app,
    icon: params.icon,
    title: params.title,
    message: params.message,
    url: params.url,
    timestamp,
    read: false,
    archived: false,
  };

  await redis.set(key, JSON.stringify(notification));
  return notification;
}

/**
 * Get all notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  includeArchived: boolean = false
): Promise<Array<Notification & { key: string }>> {
  const redis = getRedisClient();
  const pattern = `notification:${userId}:*`;
  const keys = await redis.keys(pattern);

  if (keys.length === 0) {
    return [];
  }

  const values = await redis.mget(...keys);
  const notifications = keys
    .map((key, index) => {
      const value = values[index];
      if (!value) return null;
      try {
        const notification = JSON.parse(value) as Notification;
        return { ...notification, key };
      } catch {
        return null;
      }
    })
    .filter((n): n is Notification & { key: string } => n !== null)
    .filter((n) => includeArchived || !n.archived)
    .sort((a, b) => b.timestamp - a.timestamp);

  return notifications;
}

/**
 * Mark a notification as read or unread
 */
export async function markNotificationRead(
  userId: string,
  timestamp: number,
  read: boolean
): Promise<void> {
  const redis = getRedisClient();
  const key = `notification:${userId}:${timestamp}`;
  const value = await redis.get(key);

  if (!value) {
    throw new Error('Notification not found');
  }

  const notification = JSON.parse(value) as Notification;
  notification.read = read;
  await redis.set(key, JSON.stringify(notification));
}

/**
 * Mark multiple notifications as read
 */
export async function markNotificationsRead(
  userId: string,
  timestamps: number[]
): Promise<void> {
  const redis = getRedisClient();
  const pipeline = redis.pipeline();

  for (const timestamp of timestamps) {
    const key = `notification:${userId}:${timestamp}`;
    const value = await redis.get(key);
    if (value) {
      const notification = JSON.parse(value) as Notification;
      notification.read = true;
      pipeline.set(key, JSON.stringify(notification));
    }
  }

  await pipeline.exec();
}

/**
 * Archive a notification
 */
export async function archiveNotification(
  userId: string,
  timestamp: number
): Promise<void> {
  const redis = getRedisClient();
  const key = `notification:${userId}:${timestamp}`;
  const value = await redis.get(key);

  if (!value) {
    throw new Error('Notification not found');
  }

  const notification = JSON.parse(value) as Notification;
  notification.archived = true;
  await redis.set(key, JSON.stringify(notification));
}

/**
 * Archive multiple notifications
 */
export async function archiveNotifications(
  userId: string,
  timestamps: number[]
): Promise<void> {
  const redis = getRedisClient();
  const pipeline = redis.pipeline();

  for (const timestamp of timestamps) {
    const key = `notification:${userId}:${timestamp}`;
    const value = await redis.get(key);
    if (value) {
      const notification = JSON.parse(value) as Notification;
      notification.archived = true;
      pipeline.set(key, JSON.stringify(notification));
    }
  }

  await pipeline.exec();
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const notifications = await getUserNotifications(userId, false);
  return notifications.filter((n) => !n.read).length;
}
