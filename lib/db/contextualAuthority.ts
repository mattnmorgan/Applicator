import { getRedisClient } from "../redis";
import ContextualAuthority from "@/lib/database/types/contextualAuthority";

/**
 * Create a new contextual authority
 * @param id Resource identifier that the authority applies to
 * @param permission ID of a contextual authorization specifying permissions
 * @param app App that is creating this authority
 * @param createdBy User ID or app identifier that created this authority (defaults to app if not provided)
 * @param user User ID to grant access to (if user-based)
 * @param authority Authority ID to grant access to (if authority-based)
 * @param password Hashed password for access (if password-based)
 */
export async function createContextualAuthority(
  id: string,
  permission: string,
  app: string,
  createdBy?: string,
  user?: string,
  authority?: string,
  password?: string
): Promise<ContextualAuthority> {
  const redis = getRedisClient();
  const timestamp = Date.now();

  const contextualAuthority: ContextualAuthority = {
    id,
    permission,
    user,
    authority,
    password,
    app,
    createdAt: timestamp,
    createdBy: createdBy || app, // Default to app if createdBy not provided
  };

  // Determine the key based on the type
  // Key structure: contextual-authority:[app]:[id]:user:[user-id]
  //                contextual-authority:[app]:[id]:authority:[authority-id]
  //                contextual-authority:[app]:[id]:password:[timestamp]
  let key: string;
  if (user) {
    key = `contextual-authority:${app}:${id}:user:${user}`;
  } else if (authority) {
    key = `contextual-authority:${app}:${id}:authority:${authority}`;
  } else if (password) {
    key = `contextual-authority:${app}:${id}:password:${timestamp}`;
  } else {
    throw new Error("Must specify user, authority, or password");
  }

  await redis.set(key, JSON.stringify(contextualAuthority));

  return contextualAuthority;
}

/**
 * Get all contextual authorities for a specific app and resource ID
 * @param app App identifier
 * @param resourceId The ID of the resource
 */
export async function getContextualAuthoritiesByResourceId(
  app: string,
  resourceId: string
): Promise<ContextualAuthority[]> {
  const redis = getRedisClient();
  const pattern = `contextual-authority:${app}:${resourceId}:*`;

  const authorities: ContextualAuthority[] = [];
  const keys = await redis.keys(pattern);

  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      authorities.push(JSON.parse(data));
    }
  }

  return authorities;
}

/**
 * Delete a contextual authority
 * @param app App identifier
 * @param resourceId The ID of the resource
 * @param user User ID (if user-based)
 * @param authority Authority ID (if authority-based)
 * @param passwordTimestamp Timestamp of password creation (if password-based)
 */
export async function deleteContextualAuthority(
  app: string,
  resourceId: string,
  user?: string,
  authority?: string,
  passwordTimestamp?: number
): Promise<boolean> {
  const redis = getRedisClient();

  let key: string;
  if (user) {
    key = `contextual-authority:${app}:${resourceId}:user:${user}`;
  } else if (authority) {
    key = `contextual-authority:${app}:${resourceId}:authority:${authority}`;
  } else if (passwordTimestamp !== undefined) {
    key = `contextual-authority:${app}:${resourceId}:password:${passwordTimestamp}`;
  } else {
    throw new Error("Must specify user, authority, or passwordTimestamp");
  }

  const result = await redis.del(key);
  return result > 0;
}

/**
 * Delete all contextual authorities for a specific app
 * @param app App identifier
 */
export async function deleteContextualAuthoritiesByApp(
  app: string
): Promise<number> {
  const redis = getRedisClient();
  const pattern = `contextual-authority:${app}:*`;
  const keys = await redis.keys(pattern);

  if (keys.length === 0) {
    return 0;
  }

  // Delete all keys for this app
  return await redis.del(...keys);
}

/**
 * Get all contextual authorities for a specific user
 * @param userId User identifier
 */
export async function getContextualAuthoritiesByUser(
  userId: string
): Promise<ContextualAuthority[]> {
  const redis = getRedisClient();
  const pattern = `contextual-authority:*:user:${userId}`;
  const keys = await redis.keys(pattern);

  const authorities: ContextualAuthority[] = [];
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      authorities.push(JSON.parse(data));
    }
  }

  return authorities;
}

/**
 * Get all contextual authorities for a specific authority
 * @param authorityId Authority identifier
 */
export async function getContextualAuthoritiesByAuthority(
  authorityId: string
): Promise<ContextualAuthority[]> {
  const redis = getRedisClient();
  const pattern = `contextual-authority:*:authority:${authorityId}`;
  const keys = await redis.keys(pattern);

  const authorities: ContextualAuthority[] = [];
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      authorities.push(JSON.parse(data));
    }
  }

  return authorities;
}
