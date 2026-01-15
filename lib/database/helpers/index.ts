/**
 * Database Helper Functions
 *
 * This file provides helper functions that use the new manager-based architecture
 * while maintaining backward compatibility with the old API patterns.
 */

import { getCurrentUser as getUser } from "@/lib/database/managers/user";
import { getSystemSettings } from "@/lib/database/managers/setting";
import AppManager from "@/lib/database/managers/app";
import AuthorityManager from "@/lib/database/managers/authority";
import NotificationManager from "@/lib/database/managers/notification";
import AuthorizationManager from "@/lib/database/managers/authorization";
import SettingManager from "@/lib/database/managers/setting";
import TableRecord from "@/lib/database/crud/types/record";
import App, { SubApp } from "@/lib/database/types/app";

// Re-export getCurrentUser with simplified return type
export async function getCurrentUser() {
  const result = await getUser();
  if (!result) return null;

  return {
    id: result.user.id,
    displayName: result.user.data.displayName,
    username: result.user.data.username,
    email: result.user.data.email,
    icon: result.user.data.icon,
    authority: result.user.data.authority,
    authorizations: result.authorizations.flat(),
    authorities: result.authorities,
    isAssumedIdentity: result.isAssumedIdentity,
  };
}

// Get brand settings (subset of system settings)
export async function getBrandSettings() {
  const settings = await getSystemSettings();
  return {
    brandName: settings.brandName || "Applicator",
    brandIcon: settings.brandIcon,
  };
}

// Check if first-time setup is needed
export async function isFirstTimeSetup(): Promise<boolean> {
  const userManager = new (
    await import("@/lib/database/managers/user")
  ).default();
  const users = await userManager.listRecords();
  return users.length === 0;
}

// Get user's sub-apps
export async function getUserSubApps(userId: string): Promise<string[]> {
  const authorityManager = new AuthorityManager();

  // Get user's authority record
  const userRecord = await new (
    await import("@/lib/database/managers/user")
  ).default().readRecord(userId);
  if (!userRecord) return [];

  // Get both main authority and user-specific authority
  const mainAuthority = await authorityManager.readRecord(
    userRecord.data.authority
  );
  const userAuthority = await authorityManager.readUserAuthority(userId);

  const apps = [
    ...(mainAuthority?.data.apps || []),
    ...(userAuthority?.data.apps || []),
  ];

  return [...new Set(apps)]; // Remove duplicates
}

// Parse sub-app ID (format: "mainAppId:subAppId")
export function parseSubAppId(fullSubAppId: string): {
  mainAppId: string;
  subAppId: string;
} {
  const parts = fullSubAppId.split(":");
  if (parts.length !== 2) {
    throw new Error(`Invalid sub-app ID format: ${fullSubAppId}`);
  }
  return {
    mainAppId: parts[0],
    subAppId: parts[1],
  };
}

// Get a sub-app by its full ID
export async function getSubApp(
  fullSubAppId: string
): Promise<(SubApp & { mainAppId: string; fullId: string }) | null> {
  try {
    const { mainAppId, subAppId } = parseSubAppId(fullSubAppId);
    const appManager = new AppManager();
    const app = await appManager.readRecord(mainAppId);

    if (!app || !app.data.subApps) return null;

    const subApp = app.data.subApps.find((sa) => sa.id === subAppId);
    if (!subApp) return null;

    return {
      ...subApp,
      mainAppId,
      fullId: fullSubAppId,
    };
  } catch (error) {
    console.error(`Error getting sub-app ${fullSubAppId}:`, error);
    return null;
  }
}

// Get all apps
export async function getAllApps(): Promise<TableRecord<App>[]> {
  const appManager = new AppManager();
  const appKeys = await appManager.listRecords();

  const apps = [];
  for (const key of appKeys) {
    const appId = key.split(":").pop();
    if (appId) {
      const app = await appManager.readRecord(appId);
      if (app) {
        apps.push(app);
      }
    }
  }

  return apps;
}

// Get a single app
export async function getApp(appId: string): Promise<TableRecord<App> | null> {
  const appManager = new AppManager();
  return await appManager.readRecord(appId);
}

// Get user authorizations
export async function getUserAuthorizations(
  userId: string
): Promise<{ authorizations: string[] }> {
  const authorityManager = new AuthorityManager();
  const userRecord = await new (
    await import("@/lib/database/managers/user")
  ).default().readRecord(userId);

  if (!userRecord) {
    return { authorizations: [] };
  }

  const authorities = [
    await authorityManager.readRecord(userRecord.data.authority),
    await authorityManager.readUserAuthority(userId),
  ];

  const authorizations = new Set<string>();
  for (const authority of authorities) {
    if (authority) {
      authority.data.authorizations.forEach((auth) => authorizations.add(auth));
    }
  }

  return { authorizations: Array.from(authorizations) };
}

// Get user's authority
export async function getUserAuthority(userId: string) {
  const authorityManager = new AuthorityManager();
  const authority = await authorityManager.readUserAuthority(userId);
  return authority?.data || null;
}

// Get an authority by ID
export async function getAuthority(authorityId: string) {
  const authorityManager = new AuthorityManager();
  const authority = await authorityManager.readRecord(authorityId);
  return authority?.data || null;
}

// Get user notifications
export async function getNotifications(userId: string) {
  const notificationManager = new NotificationManager();
  const notificationKeys = await notificationManager.listRecords();

  const notifications = [];
  for (const key of notificationKeys) {
    const recordId = key.split(":").pop();
    if (recordId) {
      const record = await notificationManager.readRecord(recordId);
      if (record && record.data.userId === userId) {
        notifications.push(record);
      }
    }
  }

  return notifications.sort((a, b) => {
    return b.data.timestamp - a.data.timestamp; // Most recent first
  });
}

// Check if user has a specific authorization
export async function userHasAuthorization(
  userId: string,
  authorization: string
): Promise<boolean> {
  const { authorizations } = await getUserAuthorizations(userId);
  return authorizations.includes(authorization);
}

// Get system setting by key
export async function getSystemSetting(
  key: string
): Promise<string | undefined> {
  const settingManager = new SettingManager();
  const record = await settingManager.readRecord(key);
  return record?.data.value;
}

// Get system version
export async function getSystemVersion() {
  const settings = await getSystemSettings();
  return settings.version;
}

// Archive a notification (supports both notificationId and userId + timestamp patterns)
export async function archiveNotification(
  userIdOrNotificationId: string,
  timestamp?: number
) {
  const notificationManager = new NotificationManager();

  if (timestamp !== undefined) {
    // Old pattern: userId and timestamp
    // Find notification by userId and timestamp
    const notificationKeys = await notificationManager.listRecords();
    let foundNotification = null;

    for (const key of notificationKeys) {
      const recordId = key.split(":").pop(); // Extract ID from key
      if (recordId) {
        const record = await notificationManager.readRecord(recordId);
        if (
          record &&
          record.data.userId === userIdOrNotificationId &&
          record.data.timestamp === timestamp
        ) {
          foundNotification = record;
          break;
        }
      }
    }

    if (!foundNotification) {
      throw new Error("Notification not found");
    }

    await notificationManager.updateRecord(
      await notificationManager.getTable(),
      foundNotification.id,
      { ...foundNotification.data, archived: true }
    );
  } else {
    // New pattern: notification ID
    const notification = await notificationManager.readRecord(
      userIdOrNotificationId
    );

    if (!notification) {
      throw new Error("Notification not found");
    }

    await notificationManager.updateRecord(
      await notificationManager.getTable(),
      userIdOrNotificationId,
      { ...notification.data, archived: true }
    );
  }
}

// Archive multiple notifications (supports both notificationIds and userId + timestamps patterns)
export async function archiveNotifications(
  userIdOrNotificationIds: string | string[],
  timestamps?: number[]
) {
  if (timestamps !== undefined && typeof userIdOrNotificationIds === "string") {
    // Old pattern: userId and array of timestamps
    for (const timestamp of timestamps) {
      await archiveNotification(userIdOrNotificationIds, timestamp);
    }
  } else if (Array.isArray(userIdOrNotificationIds)) {
    // New pattern: array of notification IDs
    for (const id of userIdOrNotificationIds) {
      await archiveNotification(id);
    }
  }
}

// Create a new user
export async function createUser(
  username: string,
  email: string,
  displayName: string,
  password: string,
  authority: string = "user"
) {
  const UserManager = (await import("@/lib/database/managers/user")).default;
  const userManager = new UserManager();
  const bcrypt = await import("bcryptjs");

  // Hash the password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create the user record
  const user = await userManager.createRecord(await userManager.getTable(), {
    username,
    email,
    displayName,
    passwordHash,
    authority,
    isActive: true,
  });

  return user;
}

// Set a system setting
export async function setSystemSetting(key: string, value: string) {
  const settingManager = new SettingManager();
  const existing = await settingManager.readRecord(key);

  if (existing) {
    await settingManager.updateRecord(await settingManager.getTable(), key, {
      value,
    });
  } else {
    await settingManager.createRecord(
      await settingManager.getTable(),
      { value },
      { id: key }
    );
  }
}

// Initialize default authorities
export async function initializeAuthorities() {
  const authorityManager = new AuthorityManager();
  const authorizationManager = new AuthorizationManager();

  // Check if authorities are already initialized
  const adminAuthority = await authorityManager.readRecord("admin");
  if (adminAuthority) {
    return; // Already initialized
  }

  // Create authorizations from system metadata
  const { SYSTEM_APP_METADATA } = await import("@/lib/database/systemMetadata");
  for (const authorization of SYSTEM_APP_METADATA.authorizations) {
    await authorizationManager.createRecord(
      await authorizationManager.getTable(),
      {
        name: authorization.name,
        description: authorization.description,
        app: authorization.app,
        contextual: authorization.contextual,
      },
      { id: authorization.id }
    );
  }

  // Create authorities from system metadata
  for (const authority of SYSTEM_APP_METADATA.authorities) {
    await authorityManager.createRecord(
      await authorityManager.getTable(),
      {
        name: authority.name,
        authorizations: authority.authorizations,
        apps: authority.apps,
        contextual: authority.contextual,
      },
      { id: authority.id }
    );
  }
}

// Update user
export async function updateUser(
  userId: string,
  data: Partial<import("@/lib/database/types/user").default>
) {
  const UserManager = (await import("@/lib/database/managers/user")).default;
  const userManager = new UserManager();
  const user = await userManager.readRecord(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return await userManager.updateRecord(await userManager.getTable(), userId, {
    ...user.data,
    ...data,
  });
}

// Get user by ID
export async function getUserById(userId: string) {
  const UserManager = (await import("@/lib/database/managers/user")).default;
  const userManager = new UserManager();
  const user = await userManager.readRecord(userId);
  return user?.data || null;
}

// Update user status
export async function updateUserStatus(userId: string, isActive: boolean) {
  return await updateUser(userId, { isActive });
}

// Create app
export async function createApp(
  appId: string,
  appData: import("@/lib/database/types/app").default
) {
  const appManager = new AppManager();
  return await appManager.createRecord(await appManager.getTable(), appData, {
    id: appId,
  });
}

// Delete app
export async function deleteApp(appId: string) {
  const appManager = new AppManager();
  await appManager.deleteRecord(appId);
}

// Update app
export async function updateApp(
  appId: string,
  appData: Partial<import("@/lib/database/types/app").default>
) {
  const appManager = new AppManager();
  const app = await appManager.readRecord(appId);
  if (!app) {
    throw new Error("App not found");
  }
  return await appManager.updateRecord(await appManager.getTable(), appId, {
    ...app.data,
    ...appData,
  });
}

// Compare versions (returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2)
export function compareVersions(
  v1: import("@/lib/database/types/appVersion").default,
  v2: import("@/lib/database/types/appVersion").default
): number {
  if (v1.major !== v2.major) return v1.major > v2.major ? 1 : -1;
  if (v1.minor !== v2.minor) return v1.minor > v2.minor ? 1 : -1;
  if (v1.dev !== v2.dev) return v1.dev > v2.dev ? 1 : -1;
  return 0;
}

// Create authorization
export async function createAuthorization(
  authorizationId: string,
  authorizationData: import("@/lib/database/types/authorization").default
) {
  const authorizationManager = new AuthorizationManager();
  return await authorizationManager.createRecord(
    await authorizationManager.getTable(),
    authorizationData,
    { id: authorizationId }
  );
}

// Delete authorization
export async function deleteAuthorization(authorizationId: string) {
  const authorizationManager = new AuthorizationManager();
  await authorizationManager.deleteRecord(authorizationId);
}

// Create authority
export async function createAuthority(
  authorityId: string,
  authorityData: import("@/lib/database/types/authority").default
) {
  const authorityManager = new AuthorityManager();
  return await authorityManager.createRecord(
    await authorityManager.getTable(),
    authorityData,
    { id: authorityId }
  );
}

// Delete authority
export async function deleteAuthority(authorityId: string) {
  const authorityManager = new AuthorityManager();
  await authorityManager.deleteRecord(authorityId);
}

// Update authority
export async function updateAuthority(
  authorityId: string,
  authorityData: Partial<import("@/lib/database/types/authority").default>
) {
  const authorityManager = new AuthorityManager();
  const authority = await authorityManager.readRecord(authorityId);
  if (!authority) {
    throw new Error("Authority not found");
  }
  return await authorityManager.updateRecord(
    await authorityManager.getTable(),
    authorityId,
    { ...authority.data, ...authorityData }
  );
}

// Get all authorizations
export async function getAllAuthorizations() {
  const authorizationManager = new AuthorizationManager();
  const authKeys = await authorizationManager.listRecords();

  const authorizations = [];
  for (const key of authKeys) {
    const authId = key.split(":").pop();
    if (authId) {
      const auth = await authorizationManager.readRecord(authId);
      if (auth) {
        authorizations.push(auth);
      }
    }
  }

  return authorizations;
}

// Get all authorities
export async function getAllAuthorities() {
  const authorityManager = new AuthorityManager();
  const authKeys = await authorityManager.listRecords();

  const authorities = [];
  for (const key of authKeys) {
    const authId = key.split(":").pop();
    if (authId) {
      const auth = await authorityManager.readRecord(authId);
      if (auth) {
        authorities.push(auth);
      }
    }
  }

  return authorities;
}

// Delete contextual authorities by app
export async function deleteContextualAuthoritiesByApp(appId: string) {
  const ContextualAuthorityManager = (
    await import("@/lib/database/managers/contextualAuthority")
  ).default;
  const manager = new ContextualAuthorityManager();
  const authKeys = await manager.listRecords();

  for (const key of authKeys) {
    const authId = key.split(":").pop();
    if (authId) {
      const auth = await manager.readRecord(authId);
      if (auth && auth.data.app === appId) {
        await manager.deleteRecord(authId);
      }
    }
  }
}

// Re-export types and utilities
export {
  formatVersion,
  isVersionGreaterOrEqual,
} from "@/lib/database/managers/app";
export type { default as AppVersion } from "@/lib/database/types/appVersion";
