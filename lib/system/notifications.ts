import NotificationManager from "@/lib/managers/notification";
import NotificationTopicManager from "@/lib/managers/notificationTopic";
import SettingManager from "@/lib/managers/setting";
import { sendNtfyNotification } from "@/lib/system/ntfy";
import { NotificationType } from "@/lib/database/types/notification";

/**
 * Read the user's notification preference for a given topic and channel.
 * Defaults to enabled (true) when no preference has been stored.
 */
async function isChannelEnabled(
  userId: string,
  topicId: string,
  channel: "internal" | "external",
): Promise<boolean> {
  const settingManager = new SettingManager();
  const prefRecord = await settingManager.readRecord(
    `${userId}:notification-preferences`,
  );
  if (!prefRecord?.data.value) return true;
  try {
    const prefs = JSON.parse(prefRecord.data.value) as Record<
      string,
      { internal?: boolean; external?: boolean }
    >;
    return prefs[topicId]?.[channel] !== false;
  } catch {
    return true;
  }
}

export interface SendNotificationOptions {
  /** Recipient user ID */
  userId: string;
  /** App sending the notification */
  app: string;
  /** Notification title */
  title: string;
  /** Notification body */
  message: string;
  /** Severity type — defaults to "info" */
  type?: NotificationType;
  /** Deep-link URL opened when the notification is clicked */
  url?: string;
  /**
   * Registered topic ID in the form `{appId}:{topicId}` (e.g. `forums:thread-reply`).
   * When provided the user's Internal/External preferences for this topic are
   * checked before delivering. Omit for system-level notifications that are
   * always delivered.
   */
  topicId?: string;
}

/**
 * Send a notification to a user, respecting their per-topic preferences.
 *
 * - **Internal** (bell): writes a record to the `system.notifications` table.
 * - **External** (ntfy): pushes to the user's configured ntfy topic.
 *
 * Both channels default to enabled when the user has no stored preference.
 */
export async function sendNotification(
  options: SendNotificationOptions,
): Promise<void> {
  const { userId, app, title, message, type = "info", url, topicId } = options;

  // Determine per-channel opt-in
  let sendInternal = true;
  let sendExternal = true;

  if (topicId) {
    [sendInternal, sendExternal] = await Promise.all([
      isChannelEnabled(userId, topicId, "internal"),
      isChannelEnabled(userId, topicId, "external"),
    ]);
  }

  if (sendInternal) {
    const manager = new NotificationManager();
    await manager.createRecord(null, {
      type,
      app,
      title,
      message,
      url,
      timestamp: Date.now(),
      read: false,
      archived: false,
      user_id: userId,
    });
  }

  if (sendExternal) {
    // Look up the topic's ntfy_tag if a topicId was provided
    let ntfyTag: string | undefined;
    if (topicId) {
      try {
        const topicManager = new NotificationTopicManager();
        const topic = await topicManager.readRecord(topicId);
        ntfyTag = topic?.data.ntfy_tag || undefined;
      } catch {
        // Non-fatal — fall back to type-based tag
      }
    }
    await sendNtfyNotification(userId, title, message, type, ntfyTag).catch(
      () => {},
    );
  }
}
