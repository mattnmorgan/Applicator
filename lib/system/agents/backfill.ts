import fs from "fs/promises";
import path from "path";
import SettingManager from "@/lib/managers/setting";
import AgentExecutionManager from "@/lib/managers/agent-execution";
import LogManager from "@/lib/managers/log";
import { getPool } from "@/lib/database/connections/postgresql";

/**
 * Parse the execution timestamp from a log filename.
 * Filename format: YYYY-MM-DDTHH-mm-ss-sssZ.log
 */
function parseTimestampFromFilename(filename: string): number {
  const id = filename.replace(".log", "");
  const restored = id.replace(/-/g, (m, i: number) =>
    i === 4 || i === 7 ? "-" : i === 13 || i === 16 ? ":" : i === 19 ? "." : m,
  );
  const d = new Date(restored);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

/**
 * Parse success/error from a log file's finalization line.
 */
async function parseLogOutcome(
  logPath: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const content = await fs.readFile(logPath, "utf8");
    const m = content.match(/Agent has finished execution :: (\{.*\})/);
    if (m) {
      const meta = JSON.parse(m[1]);
      return {
        success: !!meta.success,
        error: meta.error ?? null,
      };
    }
  } catch {
    // Unreadable log — treat as unknown
  }
  return { success: false, error: null };
}

/**
 * Delete a directory and all its contents recursively.
 */
async function deleteDirectory(dirPath: string): Promise<void> {
  await fs.rm(dirPath, { recursive: true, force: true });
}

/**
 * Scan all agent log files and create missing `agent_executions` records.
 * Also deletes log directories for agents that no longer exist in the DB.
 * Called once on startup after the schema is initialized.
 */
export async function backfillAgentExecutions(): Promise<void> {
  const storagePath = (await new SettingManager().readRecord("storage"))?.data
    .value;

  if (!storagePath) {
    return;
  }

  const logsRoot = path.join(storagePath, "apps", "system", "logs");

  // Check the logs root exists
  try {
    await fs.access(logsRoot);
  } catch {
    return; // No logs directory yet — nothing to backfill
  }

  const pool = getPool();

  // Fetch all existing agent IDs from the DB
  const agentsResult = await pool.query<{ id: string }>(
    `SELECT id FROM agents`,
  );
  const knownAgentIds = new Set(agentsResult.rows.map((r) => r.id));

  // Fetch all existing log_file values in one query
  const existing = await pool.query<{ log_file: string }>(
    `SELECT log_file FROM agent_executions WHERE log_file IS NOT NULL`,
  );
  const knownLogFiles = new Set(existing.rows.map((r) => r.log_file));

  const manager = new AgentExecutionManager();
  let created = 0;
  let deletedDirs = 0;

  // Structure: logsRoot/{appId}/{agentName}/*.log
  let appDirs: string[];
  try {
    appDirs = await fs.readdir(logsRoot);
  } catch {
    return;
  }

  for (const appId of appDirs) {
    const appDir = path.join(logsRoot, appId);
    let agentDirs: string[];
    try {
      agentDirs = await fs.readdir(appDir);
    } catch {
      continue;
    }

    for (const agentName of agentDirs) {
      const agentKey = `${appId}:${agentName}`;
      const agentDir = path.join(appDir, agentName);

      // If this agent no longer exists, delete its log directory entirely
      if (!knownAgentIds.has(agentKey)) {
        try {
          await deleteDirectory(agentDir);
          deletedDirs++;
        } catch {
          // Non-fatal
        }
        continue;
      }

      let files: string[];
      try {
        files = await fs.readdir(agentDir);
      } catch {
        continue;
      }

      for (const filename of files.filter((f) => f.endsWith(".log"))) {
        if (knownLogFiles.has(filename)) {
          continue;
        }

        const logPath = path.join(agentDir, filename);
        const timestamp = parseTimestampFromFilename(filename);
        const { success, error } = await parseLogOutcome(logPath);

        try {
          await manager.createRecord(null, {
            app: appId,
            agent: agentKey,
            timestamp,
            status: success ? "success" : "failed",
            error,
            log_file: filename,
          });
          created++;
        } catch {
          // Non-fatal — skip this entry
        }
      }
    }
  }

  const parts: string[] = [];
  if (created > 0) parts.push(`backfilled ${created} execution record${created === 1 ? "" : "s"}`);
  if (deletedDirs > 0) parts.push(`removed ${deletedDirs} stale log director${deletedDirs === 1 ? "y" : "ies"}`);

  if (parts.length > 0) {
    await new LogManager().debug(
      "system",
      `Agent log backfill: ${parts.join(", ")}`,
    );
  }
}
