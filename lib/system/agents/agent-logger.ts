import fs from "fs/promises";
import path from "path";
import SettingManager from "@/lib/database/managers/setting";
import LogManager from "@/lib/database/managers/log";

export interface AgentLogEntry {
  timestamp: Date;
  level: "info" | "warn" | "error" | "debug";
  message: string;
}

/**
 * Get the log directory for an agent
 */
async function getAgentLogDir(appId: string, agentName: string): Promise<string | null> {
  const settingManager = new SettingManager();
  const storageRecord = await settingManager.readRecord("storage");
  const storagePath = storageRecord?.data.value;

  if (!storagePath) {
    return null;
  }

  return path.join(storagePath, "logs", "agents", appId, agentName);
}

/**
 * Create a new log file for an agent execution
 */
export async function createAgentLogFile(
  appId: string,
  agentName: string
): Promise<string | null> {
  const logDir = await getAgentLogDir(appId, agentName);
  if (!logDir) {
    return null;
  }

  await fs.mkdir(logDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logFileName = `${timestamp}.log`;
  const logFilePath = path.join(logDir, logFileName);

  // Create empty log file
  await fs.writeFile(logFilePath, "");

  return logFilePath;
}

/**
 * Append a log entry to an agent's log file
 */
export async function appendAgentLog(
  logFilePath: string,
  level: "info" | "warn" | "error" | "debug",
  message: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  const levelPadded = level.toUpperCase().padEnd(5);
  const logLine = `[${timestamp}] [${levelPadded}] ${message}\n`;

  await fs.appendFile(logFilePath, logLine);
}

/**
 * Log agent execution start to the system log
 */
export async function logAgentStart(
  appId: string,
  agentName: string
): Promise<void> {
  const logManager = new LogManager();
  await logManager.info(
    appId,
    `Agent '${agentName}' started execution`
  );
}

/**
 * Log agent execution completion to the system log
 */
export async function logAgentComplete(
  appId: string,
  agentName: string,
  durationMs: number
): Promise<void> {
  const logManager = new LogManager();
  const durationStr = durationMs < 1000
    ? `${durationMs}ms`
    : `${(durationMs / 1000).toFixed(2)}s`;

  await logManager.info(
    appId,
    `Agent '${agentName}' completed execution (${durationStr})`
  );
}

/**
 * Log agent execution error to the system log
 */
export async function logAgentError(
  appId: string,
  agentName: string,
  error: string
): Promise<void> {
  const logManager = new LogManager();
  await logManager.error(
    appId,
    `Agent '${agentName}' execution failed: ${error}`
  );
}

/**
 * Read recent log entries from an agent's log file
 */
export async function readAgentLogFile(
  logFilePath: string,
  maxLines: number = 100
): Promise<string[]> {
  try {
    const content = await fs.readFile(logFilePath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim());
    return lines.slice(-maxLines);
  } catch (error) {
    return [];
  }
}

/**
 * List all log files for an agent
 */
export async function listAgentLogFiles(
  appId: string,
  agentName: string
): Promise<{ filename: string; path: string; timestamp: Date }[]> {
  const logDir = await getAgentLogDir(appId, agentName);
  if (!logDir) {
    return [];
  }

  try {
    const files = await fs.readdir(logDir);
    const logFiles = files
      .filter((f) => f.endsWith(".log"))
      .map((filename) => {
        // Parse timestamp from filename (format: YYYY-MM-DDTHH-MM-SS-sssZ.log)
        const timestampStr = filename.replace(".log", "").replace(/-/g, (m, i) =>
          i === 4 || i === 7 ? "-" : i === 13 || i === 16 ? ":" : i === 19 ? "." : m
        );
        let timestamp: Date;
        try {
          timestamp = new Date(timestampStr);
          if (isNaN(timestamp.getTime())) {
            timestamp = new Date();
          }
        } catch {
          timestamp = new Date();
        }

        return {
          filename,
          path: path.join(logDir, filename),
          timestamp,
        };
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return logFiles;
  } catch (error) {
    return [];
  }
}

/**
 * Clean up old log files for an agent, keeping only the most recent ones
 */
export async function cleanupAgentLogs(
  appId: string,
  agentName: string,
  keepCount: number = 50
): Promise<number> {
  const logFiles = await listAgentLogFiles(appId, agentName);

  if (logFiles.length <= keepCount) {
    return 0;
  }

  const filesToDelete = logFiles.slice(keepCount);
  let deletedCount = 0;

  for (const file of filesToDelete) {
    try {
      await fs.unlink(file.path);
      deletedCount++;
    } catch (error) {
      // Ignore deletion errors
    }
  }

  return deletedCount;
}

/**
 * Create a logger context for an agent execution
 */
export function createAgentLogger(logFilePath: string | null) {
  return {
    info: async (message: string) => {
      if (logFilePath) {
        await appendAgentLog(logFilePath, "info", message);
      }
    },
    warn: async (message: string) => {
      if (logFilePath) {
        await appendAgentLog(logFilePath, "warn", message);
      }
    },
    error: async (message: string) => {
      if (logFilePath) {
        await appendAgentLog(logFilePath, "error", message);
      }
    },
    debug: async (message: string) => {
      if (logFilePath) {
        await appendAgentLog(logFilePath, "debug", message);
      }
    },
  };
}
