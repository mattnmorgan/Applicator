import { getRedisClient } from "../redis";
import Authorization from "@/lib/database/types/authorization";

/**
 * Create a new authorization
 */
export async function createAuthorization(
  id: string,
  name: string,
  description: string,
  app: string,
  contextual?: boolean
): Promise<Authorization> {
  const redis = getRedisClient();

  const authorization: Authorization = {
    id,
    name,
    description,
    app,
    contextual,
  };
  const existingAuthorization = await redis.get(`authorization:${id}`);

  if (existingAuthorization) {
    return JSON.parse(existingAuthorization) as Authorization;
  }

  await redis.set(`authorization:${id}`, JSON.stringify(authorization));
  return authorization;
}

/**
 * Get an authorization by ID
 */
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

/**
 * Get all authorizations
 */
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

/**
 * Update an authorization
 */
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

/**
 * Delete an authorization
 */
export async function deleteAuthorization(id: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(`authorization:${id}`);
}
