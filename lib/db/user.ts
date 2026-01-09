import { getRedisClient } from "../redis";
import User from "@/lib/database/types/user";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { getAuthority, getUserAuthority } from "./authority";

/**
 * Create a new user
 */
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

/**
 * Get a user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const redis = getRedisClient();
  const userData = await redis.get(`user:${userId}`);

  if (!userData) {
    return null;
  }

  return JSON.parse(userData) as User;
}

/**
 * Get a user by username
 */
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

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

/**
 * Get all users
 */
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

/**
 * Update user status (active/inactive)
 */
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

/**
 * Update a user
 */
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

/**
 * Check if a user has a specific authorization
 */
export async function userHasAuthorization(
  userId: string,
  authorizationId: string
): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user) {
    return false;
  }

  // Check role-based authority
  const authority = await getAuthority(user.authority);
  if (authority && authority.authorizations.includes(authorizationId)) {
    return true;
  }

  // Check user-specific authority
  const userAuthority = await getUserAuthority(userId);
  if (
    userAuthority &&
    userAuthority.authorizations.includes(authorizationId)
  ) {
    return true;
  }

  return false;
}

/**
 * Get all authorizations for a user
 */
export async function getUserAuthorizations(
  userId: string
): Promise<{ authorizations: string[]; userAuthorizations: string[] }> {
  const user = await getUserById(userId);
  if (!user) {
    return { authorizations: [], userAuthorizations: [] };
  }

  const authorizationsSet = new Set<string>();
  const userAuthorizations: string[] = [];

  // Add role-based authorizations
  const authority = await getAuthority(user.authority);
  if (authority && authority.authorizations) {
    authority.authorizations.forEach((authId) => {
      authorizationsSet.add(authId);
    });
  }

  // Add user-specific authority authorizations
  const userAuthority = await getUserAuthority(userId);
  if (userAuthority && userAuthority.authorizations) {
    userAuthority.authorizations.forEach((authId) => {
      authorizationsSet.add(authId);
      userAuthorizations.push(authId);
    });
  }

  return {
    authorizations: Array.from(authorizationsSet),
    userAuthorizations: userAuthorizations,
  };
}

/**
 * Get all app access for a user
 */
export async function getUserAppAccess(
  userId: string
): Promise<{ accesses: string[]; userAccesses: string[] }> {
  const user = await getUserById(userId);
  if (!user) {
    return { accesses: [], userAccesses: [] };
  }

  const appsSet = new Set<string>();
  const userAppAccesses: string[] = [];

  // Add role-based app access
  const authority = await getAuthority(user.authority);
  if (authority && authority.apps) {
    authority.apps.forEach((appId) => appsSet.add(appId));
  }

  // Add user-specific authority app access
  const userAuthority = await getUserAuthority(userId);
  if (userAuthority && userAuthority.apps) {
    userAuthority.apps.forEach((appId) => {
      appsSet.add(appId);
      userAppAccesses.push(appId);
    });
  }

  return { accesses: Array.from(appsSet), userAccesses: userAppAccesses };
}
