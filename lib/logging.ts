import { getRedisClient } from "./redis";
import { getSession, getSystemSetting } from "./db";
import { NextRequest } from "next/server";

export type LogLevel = "debug" | "info" | "warning" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  sender: string;
  userId?: string;
  message: string;
}

/**
 * Format a timestamp in MM-DD-YYYY HH:MM:SS format (24-hour)
 */
export function formatTimestamp(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${month}-${day}-${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Check if logging is enabled
 */
async function isLoggingEnabled(): Promise<boolean> {
  try {
    const enabled = await getSystemSetting("loggingEnabled");
    return enabled === "true";
  } catch (error) {
    // Default to false if there's an error reading the setting
    return false;
  }
}

/**
 * Store a log entry in Redis
 */
async function logToRedis(
  level: LogLevel,
  sender: string,
  message: string,
  userId?: string
): Promise<void> {
  // Check if logging is enabled
  const enabled = await isLoggingEnabled();
  if (!enabled) {
    return; // Don't store logs if logging is disabled
  }

  const redis = getRedisClient();
  const now = new Date();
  const timestamp = formatTimestamp(now);
  const numericTimestamp = now.getTime();

  const logEntry: LogEntry = {
    timestamp,
    level,
    sender,
    userId,
    message,
  };

  // Store log with key format: log:[numericTimestamp]
  const key = `log:${numericTimestamp}`;

  await redis.set(key, JSON.stringify(logEntry));
}

/**
 * Extract userId from a request's session cookie
 */
async function getUserIdFromRequest(
  request: Request | NextRequest
): Promise<string | undefined> {
  try {
    // Get session cookie
    let sessionId: string | undefined;

    if ("cookies" in request && typeof request.cookies.get === "function") {
      // NextRequest
      sessionId = (request as NextRequest).cookies.get("session")?.value;
    } else {
      // Standard Request - parse cookie header
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        const cookies = cookieHeader.split(";").map((c) => c.trim());
        const sessionCookie = cookies.find((c) => c.startsWith("session="));
        if (sessionCookie) {
          sessionId = sessionCookie.split("=")[1];
        }
      }
    }

    if (!sessionId) {
      return undefined;
    }

    // Get session from database
    const session = await getSession(sessionId);
    return session?.userId;
  } catch (error) {
    // If we can't get the userId, just log without it
    return undefined;
  }
}

/**
 * Logging API for use by the system and plugins
 */
export const logger = {
  /**
   * Log a debug message (legacy - userId must be provided manually)
   */
  debug: async (
    sender: string,
    message: string,
    userId?: string
  ): Promise<void> => {
    await logToRedis("debug", sender, message, userId);
  },

  /**
   * Log an info message (legacy - userId must be provided manually)
   */
  info: async (
    sender: string,
    message: string,
    userId?: string
  ): Promise<void> => {
    await logToRedis("info", sender, message, userId);
  },

  /**
   * Log a warning message (legacy - userId must be provided manually)
   */
  warn: async (
    sender: string,
    message: string,
    userId?: string
  ): Promise<void> => {
    await logToRedis("warning", sender, message, userId);
  },

  /**
   * Log an error message (legacy - userId must be provided manually)
   */
  error: async (
    sender: string,
    message: string,
    userId?: string
  ): Promise<void> => {
    await logToRedis("error", sender, message, userId);
  },

  /**
   * Create a request-aware logger that automatically extracts userId
   */
  fromRequest: (request: Request | NextRequest) => ({
    debug: async (sender: string, message: string): Promise<void> => {
      const userId = await getUserIdFromRequest(request);
      await logToRedis("debug", sender, message, userId);
    },

    info: async (sender: string, message: string): Promise<void> => {
      const userId = await getUserIdFromRequest(request);
      await logToRedis("info", sender, message, userId);
    },

    warn: async (sender: string, message: string): Promise<void> => {
      const userId = await getUserIdFromRequest(request);
      await logToRedis("warning", sender, message, userId);
    },

    error: async (sender: string, message: string): Promise<void> => {
      const userId = await getUserIdFromRequest(request);
      await logToRedis("error", sender, message, userId);
    },
  }),
};

/**
 * Retrieve log entries from Redis
 * @param limit - Number of entries to retrieve (default: 100)
 * @param offset - Number of entries to skip (default: 0)
 * @returns Array of log entries sorted by timestamp (newest first)
 */
export async function getLogs(
  limit: number = 100,
  offset: number = 0
): Promise<LogEntry[]> {
  const redis = getRedisClient();

  // Get all log keys
  const keys = await redis.keys("log:*");

  // Sort keys in reverse chronological order (newest first)
  keys.sort().reverse();

  // Apply offset and limit
  const selectedKeys = keys.slice(offset, offset + limit);

  // Fetch all log entries
  const logs: LogEntry[] = [];
  for (const key of selectedKeys) {
    const logData = await redis.get(key);
    if (logData) {
      logs.push(JSON.parse(logData));
    }
  }

  return logs;
}

/**
 * Clear all log entries from Redis
 */
export async function clearLogs(): Promise<void> {
  const redis = getRedisClient();

  // Get all log keys
  const keys = await redis.keys("log:*");

  // Delete all log keys
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

/**
 * Get the total count of log entries
 */
export async function getLogCount(): Promise<number> {
  const redis = getRedisClient();
  const keys = await redis.keys("log:*");
  return keys.length;
}
