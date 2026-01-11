import Redis from "ioredis";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6380"),
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on("error", (error) => {
      console.error("Redis connection error:", error);
    });

    redisClient.on("connect", () => {
      console.log("Redis connected successfully");
    });
  }

  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Get the Redis key prefix for a table
 * System tables: "{table}:"
 * App tables: "sandbox:{app}:{table}:"
 */
export function getKeyPrefix(appId: string, tableName: string): string {
  if (appId === "system") {
    return `${tableName}:`;
  }
  return `sandbox:${appId}:${tableName}:`;
}

/**
 * Get the Redis key for a specific record
 */
export function getRecordKey(
  appId: string,
  tableName: string,
  recordId: string
): string {
  const prefix = getKeyPrefix(appId, tableName);
  return `${prefix}${recordId}`;
}
