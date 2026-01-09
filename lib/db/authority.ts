import { getRedisClient } from "../redis";
import Authority from "@/lib/database/types/authority";
import { createApp } from "./app";
import { createAuthorization } from "./authorization";
import { getAllUsers, getUserById } from "./user";

/**
 * Create a new authority
 */
export async function createAuthority(
  id: string,
  name: string,
  icon?: string,
  authorizations: string[] = [],
  apps: string[] = [],
  contextual?: boolean,
  app?: string
): Promise<Authority> {
  const redis = getRedisClient();

  const authority: Authority = {
    id,
    name,
    icon,
    authorizations,
    apps,
    contextual,
    app,
  };
  const existingAuthority = await redis.get(`authority:${id}`);

  if (existingAuthority) {
    return JSON.parse(existingAuthority) as Authority;
  }

  await redis.set(`authority:${id}`, JSON.stringify(authority));
  return authority;
}

/**
 * Get an authority by ID
 */
export async function getAuthority(id: string): Promise<Authority | null> {
  const redis = getRedisClient();
  const authorityData = await redis.get(`authority:${id}`);

  if (!authorityData) {
    return null;
  }

  return JSON.parse(authorityData) as Authority;
}

/**
 * Initialize default system authorities
 */
export async function initializeAuthorities(): Promise<void> {
  // Create the system app
  await createApp(
    "system",
    "System",
    { major: 1, minor: 0, dev: 0 },
    "Matthew Morgan",
    "matthew@morgantech.info",
    "Core system application",
    [],
    [],
    {}
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

/**
 * Get all authorities
 */
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

/**
 * Update an authority
 */
export async function updateAuthority(
  id: string,
  updates: Partial<Omit<Authority, "id">>
): Promise<void> {
  const redis = getRedisClient();
  const authority = await getAuthority(id);

  if (!authority) {
    throw new Error(`Authority not found: \"${id}\"`);
  }

  const updatedAuthority = { ...authority, ...updates };
  await redis.set(`authority:${id}`, JSON.stringify(updatedAuthority));
}

/**
 * Delete an authority
 */
export async function deleteAuthority(id: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`authority:${id}`);
}

/**
 * Get the count of users with a specific authority
 */
export async function getUserCountByAuthority(
  authorityId: string
): Promise<number> {
  const users = await getAllUsers();
  return users.filter((user) => user.authority === authorityId).length;
}

/**
 * Create or update a user-specific authority
 */
export async function createOrUpdateUserAuthority(
  userId: string,
  customAuthorizations: string[] = [],
  customApps: string[] = []
): Promise<Authority | null> {
  const redis = getRedisClient();
  const user = await getUserById(userId);

  if (!user) {
    return null;
  }

  // Create or update user-specific authority
  const userAuthority: Authority = {
    id: userId,
    name: `${user.displayName}`,
    authorizations: customAuthorizations,
    apps: customApps,
    userId: userId,
  };

  await redis.set(
    `authority:user-specific:${userId}`,
    JSON.stringify(userAuthority)
  );
  return userAuthority;
}

/**
 * Get a user-specific authority
 */
export async function getUserAuthority(
  userId: string
): Promise<Authority | null> {
  const userAuthorityId = `user-specific:${userId}`;
  return await getAuthority(userAuthorityId);
}

/**
 * Delete a user-specific authority
 */
export async function deleteUserAuthority(userId: string): Promise<void> {
  const userAuthorityId = `user-specific:${userId}`;
  await deleteAuthority(userAuthorityId);
}
