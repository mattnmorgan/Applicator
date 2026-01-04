import { getRedisClient } from "./redis";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

// Version interface and utility functions
export interface AppVersion {
  major: number;
  minor: number;
  dev: number;
}

export function formatVersion(version: AppVersion): string {
  return `${version.major}.${version.minor}.${version.dev}`;
}

export function parseVersion(versionString: string): AppVersion {
  const parts = versionString.split(".").map((p) => parseInt(p, 10));
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    dev: parts[2] || 0,
  };
}

export function compareVersions(v1: AppVersion, v2: AppVersion): number {
  if (v1.major !== v2.major) return v1.major - v2.major;
  if (v1.minor !== v2.minor) return v1.minor - v2.minor;
  return v1.dev - v2.dev;
}

export function isVersionGreaterOrEqual(
  installed: AppVersion,
  required: AppVersion
): boolean {
  return compareVersions(installed, required) >= 0;
}

export interface Authority {
  id: string;
  name: string;
  icon?: string;
  authorizations: string[]; // Array of authorization IDs
  apps: string[]; // Array of app IDs that this authority has access to
}

export interface Authorization {
  id: string;
  name: string;
  description: string;
  app: string; // App ID
}

export interface ApiRoute {
  path: string;
  method: string;
  handler: string;
  description: string;
}

export interface Widget {
  id: string; // Unique ID for the widget
  name: string;
  description: string;
  target: "home" | "user-settings" | "system-settings";
  component: string; // Name of the component exported by the app
  appId: string; // App ID that this widget belongs to
}

export interface App {
  id: string;
  label: string;
  version: AppVersion;
  author: string;
  contactEmail: string;
  description: string;
  apiRoutes: ApiRoute[];
  widgets?: Widget[];
  dependencies?: Record<string, AppVersion>; // Map of app IDs to minimum required versions
}

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  passwordHash: string;
  authority: string;
  isActive: boolean;
  profilePicture?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  originalSessionId?: string; // Reference to the original session when assuming identity
}

// Authority management
export async function createAuthority(
  id: string,
  name: string,
  icon?: string,
  authorizations: string[] = [],
  apps: string[] = []
): Promise<Authority> {
  const redis = getRedisClient();

  const authority: Authority = {
    id,
    name,
    icon,
    authorizations,
    apps,
  };
  const existingAuthority = await redis.get(`authority:${id}`);

  if (existingAuthority) {
    return JSON.parse(existingAuthority) as Authority;
  }

  await redis.set(`authority:${id}`, JSON.stringify(authority));
  return authority;
}

export async function getAuthority(id: string): Promise<Authority | null> {
  const redis = getRedisClient();
  const authorityData = await redis.get(`authority:${id}`);

  if (!authorityData) {
    return null;
  }

  return JSON.parse(authorityData) as Authority;
}

export async function initializeAuthorities(): Promise<void> {
  // Create the system app
  await createApp(
    "system",
    "System",
    { major: 1, minor: 0, dev: 0 },
    "Matthew Morgan",
    "matthew@morgantech.info",
    "Core system application"
  );

  // Create default authorizations
  await createAuthorization(
    "admin",
    "Administrator",
    "Permits administrator access to the system",
    "system"
  );

  await createAuthorization(
    "developer",
    "Developer",
    "Permits developer access to the system",
    "system"
  );

  await createAuthorization(
    "assume-identity",
    "Assume User Identities",
    "Allows user to impersonate other users in the system",
    "system"
  );

  // Create the three default authorities
  // Admin authority has the 'admin' authorization
  await createAuthority("admin", "Administrator", undefined, ["admin"]);
  await createAuthority("user", "User", undefined, []);
  await createAuthority("guest", "Guest", undefined, []);
}

export async function getAllAuthorities(): Promise<Authority[]> {
  const redis = getRedisClient();
  const keys = await redis.keys("authority:*");

  const authorities: Authority[] = [];
  for (const key of keys) {
    const authorityData = await redis.get(key);
    if (authorityData) {
      authorities.push(JSON.parse(authorityData) as Authority);
    }
  }

  return authorities;
}

export async function updateAuthority(
  id: string,
  updates: Partial<Omit<Authority, "id">>
): Promise<void> {
  const redis = getRedisClient();
  const authority = await getAuthority(id);

  if (!authority) {
    throw new Error("Authority not found");
  }

  const updatedAuthority = { ...authority, ...updates };
  await redis.set(`authority:${id}`, JSON.stringify(updatedAuthority));
}

export async function deleteAuthority(id: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`authority:${id}`);
}

export async function getUserCountByAuthority(
  authorityId: string
): Promise<number> {
  const redis = getRedisClient();
  const users = await getAllUsers();
  return users.filter((user) => user.authority === authorityId).length;
}

// Authorization management
export async function createAuthorization(
  id: string,
  name: string,
  description: string,
  app: string
): Promise<Authorization> {
  const redis = getRedisClient();

  const authorization: Authorization = {
    id,
    name,
    description,
    app,
  };
  const existingAuthorization = await redis.get(`authorization:${id}`);

  if (existingAuthorization) {
    return JSON.parse(existingAuthorization) as Authorization;
  }

  await redis.set(`authorization:${id}`, JSON.stringify(authorization));
  return authorization;
}

export async function getAuthorization(
  id: string
): Promise<Authorization | null> {
  const redis = getRedisClient();
  const authorizationData = await redis.get(`authorization:${id}`);

  if (!authorizationData) {
    return null;
  }

  return JSON.parse(authorizationData) as Authorization;
}

export async function getAllAuthorizations(): Promise<Authorization[]> {
  const redis = getRedisClient();
  const keys = await redis.keys("authorization:*");

  const authorizations: Authorization[] = [];
  for (const key of keys) {
    const authorizationData = await redis.get(key);
    if (authorizationData) {
      authorizations.push(JSON.parse(authorizationData) as Authorization);
    }
  }

  return authorizations;
}

export async function updateAuthorization(
  id: string,
  updates: Partial<Omit<Authorization, "id">>
): Promise<void> {
  const redis = getRedisClient();
  const authorization = await getAuthorization(id);

  if (!authorization) {
    throw new Error("Authorization not found");
  }

  const updatedAuthorization = { ...authorization, ...updates };
  await redis.set(`authorization:${id}`, JSON.stringify(updatedAuthorization));
}

export async function deleteAuthorization(id: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`authorization:${id}`);
}

// App management
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

export async function getApp(id: string): Promise<App | null> {
  const redis = getRedisClient();
  const appData = await redis.get(`app:${id}`);

  if (!appData) {
    return null;
  }

  return JSON.parse(appData) as App;
}

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

export async function deleteApp(id: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`app:${id}`);
}

// Helper function to check if a user has a specific authorization
export async function userHasAuthorization(
  userId: string,
  authorizationId: string
): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user) {
    return false;
  }

  const authority = await getAuthority(user.authority);
  if (!authority) {
    return false;
  }

  return authority.authorizations.includes(authorizationId);
}

// Helper function to get all authorizations for a user
export async function getUserAuthorizations(userId: string): Promise<string[]> {
  const user = await getUserById(userId);
  if (!user) {
    return [];
  }

  const authority = await getAuthority(user.authority);
  if (!authority) {
    return [];
  }

  return authority.authorizations;
}

// User management
export async function createUser(
  username: string,
  email: string,
  displayName: string,
  password: string,
  authority: string = "user"
): Promise<User> {
  const redis = getRedisClient();
  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  const user: User = {
    id: userId,
    username,
    email,
    displayName,
    passwordHash,
    authority,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  // Store user data
  await redis.set(`user:${userId}`, JSON.stringify(user));

  // Create username -> userId mapping for login
  await redis.set(`user:username:${username}`, userId);

  return user;
}

export async function getUserById(userId: string): Promise<User | null> {
  const redis = getRedisClient();
  const userData = await redis.get(`user:${userId}`);

  if (!userData) {
    return null;
  }

  return JSON.parse(userData) as User;
}

export async function getUserByUsername(
  username: string
): Promise<User | null> {
  const redis = getRedisClient();
  const userId = await redis.get(`user:username:${username}`);

  if (!userId) {
    return null;
  }

  return getUserById(userId);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function getAllUsers(): Promise<User[]> {
  const redis = getRedisClient();
  const keys = await redis.keys("user:*");

  // Filter out username mapping keys
  const userKeys = keys.filter((key) => !key.includes("user:username:"));

  const users: User[] = [];
  for (const key of userKeys) {
    const userData = await redis.get(key);
    if (userData) {
      users.push(JSON.parse(userData) as User);
    }
  }

  return users;
}

export async function updateUserStatus(
  userId: string,
  isActive: boolean
): Promise<void> {
  const redis = getRedisClient();
  const user = await getUserById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  user.isActive = isActive;
  await redis.set(`user:${userId}`, JSON.stringify(user));
}

export async function updateUser(
  userId: string,
  updates: Partial<Omit<User, "id">>
): Promise<void> {
  const redis = getRedisClient();
  const user = await getUserById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const updatedUser = { ...user, ...updates };
  await redis.set(`user:${userId}`, JSON.stringify(updatedUser));
}

// Session management
export async function createSession(userId: string): Promise<Session> {
  const redis = getRedisClient();
  const sessionId = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  const session: Session = {
    id: sessionId,
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  // Store session with expiry
  const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
  await redis.setex(`session:${sessionId}`, ttl, JSON.stringify(session));

  return session;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const redis = getRedisClient();
  const sessionData = await redis.get(`session:${sessionId}`);

  if (!sessionData) {
    return null;
  }

  const session = JSON.parse(sessionData) as Session;

  // Check if session is expired
  if (new Date(session.expiresAt) < new Date()) {
    await deleteSession(sessionId);
    return null;
  }

  // Check if user is still active
  const user = await getUserById(session.userId);
  if (!user || !user.isActive) {
    // User is inactive or doesn't exist, delete the session
    await deleteSession(sessionId);
    return null;
  }

  return session;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`session:${sessionId}`);
}

// System settings
export async function getSystemSetting(key: string): Promise<string | null> {
  const redis = getRedisClient();
  return redis.get(`settings:system:${key}`);
}

export async function setSystemSetting(
  key: string,
  value: string
): Promise<void> {
  const redis = getRedisClient();
  await redis.set(`settings:system:${key}`, value);
}

export async function isFirstTimeSetup(): Promise<boolean> {
  const adminUserId = await getSystemSetting("administratorUserId");
  return adminUserId === null;
}
