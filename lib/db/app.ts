import { getRedisClient } from "../redis";
import {
  AppVersion,
  ApiRoute,
  Widget,
  default as App,
} from "@/lib/database/types/app";

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
  dependencies: Record<string, AppVersion> = {}
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
