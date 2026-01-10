import { getRedisClient } from "../redis";
import {
  AppVersion,
  ApiRoute,
  Widget,
  SubApp,
  default as App,
} from "@/lib/database/types/app";
import TableDefinition from "@/lib/database/types/tableDefinition";
import { getAuthority } from "./authority";
import { getUserById } from "./user";

/**
 * Create a new app
 */
export async function createApp(
  id: string,
  label: string,
  version: AppVersion,
  author: string,
  contactEmail: string,
  description: string,
  apiRoutes: ApiRoute[] = [],
  widgets: Widget[] = [],
  dependencies: Record<string, AppVersion> = {},
  subApps?: SubApp[],
  tables?: TableDefinition[]
): Promise<App> {
  const redis = getRedisClient();

  const app: App = {
    id,
    label,
    version,
    author,
    contactEmail,
    description,
    apiRoutes,
    widgets,
    dependencies,
    subApps,
    tables,
  };
  const existingApp = await redis.get(`app:${id}`);

  if (existingApp) {
    return JSON.parse(existingApp) as App;
  }

  await redis.set(`app:${id}`, JSON.stringify(app));
  return app;
}

/**
 * Get an app by ID
 */
export async function getApp(id: string): Promise<App | null> {
  const redis = getRedisClient();
  const appData = await redis.get(`app:${id}`);

  if (!appData) {
    return null;
  }

  return JSON.parse(appData) as App;
}

/**
 * Get all apps
 */
export async function getAllApps(): Promise<App[]> {
  const redis = getRedisClient();
  const keys = await redis.keys("app:*");

  const apps: App[] = [];
  for (const key of keys) {
    const appData = await redis.get(key);
    if (appData) {
      apps.push(JSON.parse(appData) as App);
    }
  }

  return apps;
}

/**
 * Update an app
 */
export async function updateApp(
  id: string,
  updates: Partial<Omit<App, "id">>
): Promise<void> {
  const redis = getRedisClient();
  const app = await getApp(id);

  if (!app) {
    throw new Error("App not found");
  }

  const updatedApp = { ...app, ...updates };
  await redis.set(`app:${id}`, JSON.stringify(updatedApp));
}

/**
 * Delete an app
 */
export async function deleteApp(id: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`app:${id}`);
}

/**
 * Parse a sub-app ID into main app ID and sub-app ID components
 * @param fullId Full sub-app ID in format "mainAppId:subAppId"
 * @returns Object with mainAppId and subAppId
 */
export function parseSubAppId(fullId: string): {
  mainAppId: string;
  subAppId: string;
} {
  const parts = fullId.split(":");
  if (parts.length !== 2) {
    throw new Error(
      `Invalid sub-app ID format: "${fullId}". Expected format: "mainAppId:subAppId"`
    );
  }
  return {
    mainAppId: parts[0],
    subAppId: parts[1],
  };
}

/**
 * Get a sub-app by its full ID
 * @param fullSubAppId Full sub-app ID in format "mainAppId:subAppId"
 * @returns SubApp object or null if not found
 */
export async function getSubApp(fullSubAppId: string): Promise<SubApp | null> {
  const { mainAppId, subAppId } = parseSubAppId(fullSubAppId);
  const mainApp = await getApp(mainAppId);

  if (!mainApp || !mainApp.subApps) {
    return null;
  }

  return mainApp.subApps.find((sa) => sa.id === subAppId) || null;
}

/**
 * Get all sub-app IDs that a user has access to
 * @param userId User ID
 * @returns Array of sub-app IDs in format "mainAppId:subAppId"
 */
export async function getUserSubApps(userId: string): Promise<string[]> {
  const user = await getUserById(userId);
  if (!user) {
    return [];
  }

  const authority = await getAuthority(user.authority);
  if (!authority) {
    return [];
  }

  return authority.apps || [];
}

/**
 * Get all main app IDs that a user has access to (derived from sub-apps)
 * @param userId User ID
 * @returns Array of unique main app IDs
 */
export async function getUserMainApps(userId: string): Promise<string[]> {
  const subAppIds = await getUserSubApps(userId);
  const mainAppIds = new Set<string>();

  for (const subAppId of subAppIds) {
    try {
      const { mainAppId } = parseSubAppId(subAppId);
      mainAppIds.add(mainAppId);
    } catch (error) {
      // Skip invalid IDs
      continue;
    }
  }

  return Array.from(mainAppIds);
}

/**
 * Get all widgets from all sub-apps in an app
 * @param mainAppId Main app ID
 * @returns Array of all widgets across all sub-apps
 */
export async function getAllWidgetsForApp(
  mainAppId: string
): Promise<Widget[]> {
  const app = await getApp(mainAppId);
  if (!app) {
    return [];
  }

  const widgets: Widget[] = [];

  // Get widgets from sub-apps
  if (app.subApps) {
    for (const subApp of app.subApps) {
      if (subApp.widgets) {
        widgets.push(...subApp.widgets);
      }
    }
  }

  // Legacy: Get widgets from app level
  if (app.widgets) {
    widgets.push(...app.widgets);
  }

  return widgets;
}
