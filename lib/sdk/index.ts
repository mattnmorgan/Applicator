/**
 * Plugin SDK for Vibe Applicator
 *
 * This module provides the complete SDK for building plugins/apps that integrate
 * with the Vibe Applicator system. It includes:
 *
 * 1. RecordManager - Sandboxed CRUD operations for app-specific data
 * 2. SystemInterface - Access to system data (users, apps, authorities, authorizations)
 * 3. Auth - Session management and authentication helpers
 *
 * @example
 * ```typescript
 * import { createPlugin, getSession } from '@/lib/sdk';
 *
 * const plugin = createPlugin('my-app-id', 'user-123');
 *
 * // Use the record manager for app-specific data
 * await plugin.records.create({ name: 'John', email: 'john@example.com' });
 *
 * // Access system data
 * const users = await plugin.system.getUsers();
 * const hasPermission = await plugin.system.checkMyAuthorization('admin');
 *
 * // Get session from cookie
 * const session = await getSession(sessionId);
 * ```
 */

export type { default as App, Widget } from "@/lib/database/types/app";
export type { default as User } from "@/lib/database/types/user";
export type { default as Session } from "@/lib/database/types/session";
export type { default as Authorization } from "@/lib/database/types/authorization";
export type { default as Authority } from "@/lib/database/types/authority";

// Re-export from sdk modules
export {
  RecordManager,
  createRecordManager,
  type Record,
  type RecordManagerOptions,
  type ListRecordsOptions,
  type ListRecordsResult,
} from "./records";

export {
  SystemInterface,
  createSystemInterface,
  type UserWithAuthority,
  type AuthorityWithDetails,
  type AuthorizationWithApp,
  type SystemInterfaceOptions,
} from "./system";

export { getSession } from "./auth";

export { WidgetManager, createWidgetManager } from "./widgets";

export { FileManager, createFileManager } from "./files";

export { Logger, createLogger, type LoggerOptions } from "./logging";

export {
  NotificationManager,
  createNotificationManager,
  type SendNotificationParams,
} from "./notifications";

export type { Notification, NotificationType } from "../notifications";

export {
  ContextualAuthorityManager,
  createContextualAuthorityManager,
  type CreateContextualAuthorityParams,
  type DeleteContextualAuthorityParams,
  type ContextualAuthorityManagerOptions,
} from "./contextualAuthorities";

export type { default as ContextualAuthority } from "@/lib/database/types/contextualAuthority";

import { createRecordManager, RecordManager } from "./records";
import { createSystemInterface, SystemInterface } from "./system";
import { createFileManager, FileManager } from "./files";
import { createWidgetManager, WidgetManager } from "./widgets";
import { createLogger, Logger } from "./logging";
import {
  createNotificationManager,
  NotificationManager,
} from "./notifications";
import {
  createContextualAuthorityManager,
  ContextualAuthorityManager,
} from "./contextualAuthorities";

export interface PluginContext {
  appId: string;
  userId?: string;
}

export interface Plugin<T = any> {
  appId: string;
  userId?: string;
  records: RecordManager<T>;
  system: SystemInterface;
  files: FileManager;
  widgets: WidgetManager;
  logger: Logger;
  notifications: NotificationManager;
  contextualAuthorities: ContextualAuthorityManager;
}

/**
 * Create a complete plugin instance with all SDK capabilities
 * @param appId The ID of the app/plugin
 * @param userId Optional ID of the user making the request (required for user-specific methods)
 * @returns A plugin instance with records, system, files, and widgets interfaces
 *
 * @example
 * ```typescript
 * // Create a plugin instance
 * const plugin = createPlugin('my-app', 'user-123');
 *
 * // Use record manager
 * const record = await plugin.records.create({ foo: 'bar' });
 * const allRecords = await plugin.records.list();
 *
 * // Use system interface
 * const users = await plugin.system.getUsers();
 * const myPerms = await plugin.system.getMyAuthorizationDetails();
 *
 * // Use file manager
 * await plugin.files.writeFile('data.json', JSON.stringify(data));
 * const content = await plugin.files.readFileText('data.json');
 *
 * // Use widget manager
 * await plugin.widgets.registerWidget({
 *   name: 'My Widget',
 *   description: 'A cool widget',
 *   target: 'home',
 *   component: 'MyWidget'
 * });
 *
 * // Use logger
 * await plugin.logger.info('Operation completed successfully');
 * await plugin.logger.error('Failed to process data');
 *
 * // Use notifications
 * await plugin.notifications.success('Task completed!');
 * await plugin.notifications.error('Something went wrong');
 *
 * // Use contextual authorities
 * await plugin.contextualAuthorities.create({
 *   id: 'resource-123',
 *   permission: 'my-app:view',
 *   user: 'user-456'
 * });
 * ```
 */
export function createPlugin<T = any>(
  appId: string,
  userId?: string
): Plugin<T> {
  return {
    appId,
    userId,
    records: createRecordManager<T>(appId),
    system: createSystemInterface(appId, userId),
    files: createFileManager(appId),
    widgets: createWidgetManager(appId),
    logger: createLogger(appId, userId),
    notifications: createNotificationManager(appId, userId),
    contextualAuthorities: createContextualAuthorityManager(appId),
  };
}

/**
 * Helper function to check if a user has required authorization(s)
 * Throws an error if the user doesn't have the required authorization
 *
 * @param plugin The plugin instance
 * @param authorizationId Single authorization ID or array of IDs (user must have at least one)
 * @throws Error if user doesn't have the required authorization
 *
 * @example
 * ```typescript
 * const plugin = createPlugin('my-app', userId);
 *
 * // Require admin authorization
 * await requireAuthorization(plugin, 'admin');
 *
 * // Require at least one of multiple authorizations
 * await requireAuthorization(plugin, ['admin', 'developer']);
 * ```
 */
export async function requireAuthorization(
  plugin: Plugin,
  authorizationId: string | string[]
): Promise<void> {
  if (!plugin.userId) {
    throw new Error("User ID is required to check authorization");
  }

  const authIds = Array.isArray(authorizationId)
    ? authorizationId
    : [authorizationId];

  const hasAny = await Promise.all(
    authIds.map((id) =>
      plugin.system.checkUserAuthorization(plugin.userId!, id)
    )
  );

  if (!hasAny.some((has) => has)) {
    const authNames = authIds.join(" or ");
    throw new Error(`User does not have required authorization: ${authNames}`);
  }
}

/**
 * Helper function to check if a user has all required authorizations
 * Throws an error if the user doesn't have all the required authorizations
 *
 * @param plugin The plugin instance
 * @param authorizationIds Array of authorization IDs (user must have all)
 * @throws Error if user doesn't have all the required authorizations
 *
 * @example
 * ```typescript
 * const plugin = createPlugin('my-app', userId);
 *
 * // Require both admin and developer authorizations
 * await requireAllAuthorizations(plugin, ['admin', 'developer']);
 * ```
 */
export async function requireAllAuthorizations(
  plugin: Plugin,
  authorizationIds: string[]
): Promise<void> {
  if (!plugin.userId) {
    throw new Error("User ID is required to check authorization");
  }

  const hasAll = await Promise.all(
    authorizationIds.map((id) =>
      plugin.system.checkUserAuthorization(plugin.userId!, id)
    )
  );

  if (!hasAll.every((has) => has)) {
    const missingAuths = authorizationIds.filter((_, i) => !hasAll[i]);
    throw new Error(
      `User is missing required authorizations: ${missingAuths.join(", ")}`
    );
  }
}
