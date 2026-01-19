import { fork, ChildProcess } from "child_process";
import path from "path";
import fs from "fs/promises";
import AgentManager from "@/lib/database/managers/agent";
import SettingManager from "@/lib/database/managers/setting";
import LogManager from "@/lib/database/managers/log";
import { createPlugin, PluginContext } from "@/lib/sdk";
import {
  createAgentLogFile,
  createAgentLogger,
  logAgentStart,
  logAgentComplete,
  logAgentError,
  cleanupAgentLogs,
} from "./agent-logger";
import {
  getNextCronExecution,
  matchesCronSchedule,
} from "./agent-scheduler";
import { createRequire } from "module";

// Store running agent processes
const runningAgents = new Map<string, {
  process?: ChildProcess;
  cronInterval?: NodeJS.Timeout;
  lastExecution?: Date;
}>();

/**
 * Get the path to an agent's script file
 */
async function getAgentScriptPath(appId: string, agentName: string): Promise<string | null> {
  const settingManager = new SettingManager();
  const storageRecord = await settingManager.readRecord("storage");
  const storagePath = storageRecord?.data.value;

  if (!storagePath) {
    return null;
  }

  const scriptPath = path.join(storagePath, "apps", appId, "agents", `${agentName}.js`);

  try {
    await fs.access(scriptPath);
    return scriptPath;
  } catch {
    return null;
  }
}

/**
 * Execute an agent script with plugin context
 */
async function executeAgentScript(
  appId: string,
  agentName: string,
  scriptPath: string
): Promise<void> {
  const startTime = Date.now();
  const logFilePath = await createAgentLogFile(appId, agentName);
  const agentLogger = createAgentLogger(logFilePath);

  await logAgentStart(appId, agentName);
  await agentLogger.info(`Agent execution started`);

  try {
    // Create plugin context for the agent
    const plugin = await createPlugin(appId);

    // Extend plugin with agent-specific logger
    const agentPlugin: PluginContext = {
      ...plugin,
      logger: {
        info: async (message: string) => {
          await agentLogger.info(message);
          await plugin.logger.info(message);
        },
        warn: async (message: string) => {
          await agentLogger.warn(message);
          await plugin.logger.warn(message);
        },
        error: async (message: string) => {
          await agentLogger.error(message);
          await plugin.logger.error(message);
        },
      },
    };

    // Load and execute the agent script
    const require = createRequire(import.meta.url || __filename);
    const absolutePath = path.resolve(scriptPath);

    // Clear cache to ensure fresh load
    delete require.cache[absolutePath];
    const agentModule = require(absolutePath);

    if (agentModule.run && typeof agentModule.run === "function") {
      await agentModule.run(agentPlugin);
    } else if (typeof agentModule === "function") {
      await agentModule(agentPlugin);
    } else if (agentModule.default && typeof agentModule.default === "function") {
      await agentModule.default(agentPlugin);
    } else {
      throw new Error("Agent script must export a 'run' function or be a function");
    }

    const durationMs = Date.now() - startTime;
    await agentLogger.info(`Agent execution completed in ${durationMs}ms`);
    await logAgentComplete(appId, agentName, durationMs);

    // Update last run timestamp
    const agentManager = new AgentManager();
    const agentRecord = await agentManager.readRecord(`${appId}:${agentName}`);
    if (agentRecord) {
      await agentManager.updateRecord(
        await agentManager.getTable(),
        agentRecord.id,
        { lastRun: Date.now(), lastError: undefined }
      );
    }

    // Cleanup old logs
    await cleanupAgentLogs(appId, agentName);
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    await agentLogger.error(`Agent execution failed: ${errorMessage}`);
    await logAgentError(appId, agentName, errorMessage);

    // Update agent with error status
    const agentManager = new AgentManager();
    const agentRecord = await agentManager.readRecord(`${appId}:${agentName}`);
    if (agentRecord) {
      await agentManager.updateRecord(
        await agentManager.getTable(),
        agentRecord.id,
        { lastRun: Date.now(), lastError: errorMessage }
      );
    }

    throw error;
  }
}

/**
 * Start an agent
 */
export async function startAgent(agentId: string): Promise<boolean> {
  const agentManager = new AgentManager();
  const agent = await agentManager.readRecord(agentId);

  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  if (agent.data.status === "running") {
    return true; // Already running
  }

  const scriptPath = await getAgentScriptPath(agent.data.app, agent.data.name);
  if (!scriptPath) {
    throw new Error(`Agent script not found for: ${agent.data.name}`);
  }

  // Update status to running
  await agentManager.updateRecord(
    await agentManager.getTable(),
    agentId,
    {
      status: "running",
      wasRunning: true,
      lastError: undefined,
    }
  );

  const agentState: { process?: ChildProcess; cronInterval?: NodeJS.Timeout; lastExecution?: Date } = {};

  if (agent.data.cron) {
    // CRON-based agent - schedule execution
    await new LogManager().info(
      agent.data.app,
      `Starting CRON agent '${agent.data.name}' with schedule: ${agent.data.cron}`
    );

    // Check every minute for CRON match
    agentState.cronInterval = setInterval(async () => {
      try {
        if (matchesCronSchedule(agent.data.cron!, new Date())) {
          // Prevent duplicate executions within the same minute
          const now = new Date();
          now.setSeconds(0, 0);
          if (agentState.lastExecution?.getTime() === now.getTime()) {
            return;
          }
          agentState.lastExecution = now;

          await executeAgentScript(agent.data.app, agent.data.name, scriptPath);
        }
      } catch (error: any) {
        // Log error but keep running
        await new LogManager().error(
          agent.data.app,
          `CRON agent '${agent.data.name}' execution failed: ${error.message}`
        );
      }
    }, 60000); // Check every minute

    // Also check immediately in case we're at the right time
    if (matchesCronSchedule(agent.data.cron)) {
      agentState.lastExecution = new Date();
      agentState.lastExecution.setSeconds(0, 0);
      executeAgentScript(agent.data.app, agent.data.name, scriptPath).catch(async (error) => {
        await new LogManager().error(
          agent.data.app,
          `CRON agent '${agent.data.name}' initial execution failed: ${error.message}`
        );
      });
    }
  } else {
    // Continuous agent - run immediately and keep running
    await new LogManager().info(
      agent.data.app,
      `Starting continuous agent '${agent.data.name}'`
    );

    // For continuous agents, we run in a loop
    const runContinuous = async () => {
      while (runningAgents.has(agentId)) {
        try {
          await executeAgentScript(agent.data.app, agent.data.name, scriptPath);
        } catch (error: any) {
          await new LogManager().error(
            agent.data.app,
            `Continuous agent '${agent.data.name}' execution failed: ${error.message}`
          );
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        // Small delay between runs
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    };

    // Start in background
    runContinuous();
  }

  runningAgents.set(agentId, agentState);
  return true;
}

/**
 * Stop an agent
 */
export async function stopAgent(agentId: string): Promise<boolean> {
  const agentState = runningAgents.get(agentId);

  if (agentState) {
    // Clear CRON interval if set
    if (agentState.cronInterval) {
      clearInterval(agentState.cronInterval);
    }

    // Kill process if running
    if (agentState.process) {
      agentState.process.kill("SIGTERM");
    }

    runningAgents.delete(agentId);
  }

  // Try to update the database record (may not exist if being uninstalled)
  const agentManager = new AgentManager();
  const agent = await agentManager.readRecord(agentId);

  if (agent) {
    await agentManager.updateRecord(
      await agentManager.getTable(),
      agentId,
      {
        status: "stopped",
        wasRunning: false,
        pid: undefined,
      }
    );

    await new LogManager().info(
      agent.data.app,
      `Agent '${agent.data.name}' stopped`
    );
  }

  return true;
}

/**
 * Get agent status information
 */
export async function getAgentStatus(agentId: string): Promise<{
  status: "stopped" | "running" | "error";
  lastRun?: number;
  lastError?: string;
  nextRun?: string;
} | null> {
  const agentManager = new AgentManager();
  const agent = await agentManager.readRecord(agentId);

  if (!agent) {
    return null;
  }

  let nextRun: string | undefined;
  if (agent.data.cron && agent.data.status === "running") {
    const nextExec = getNextCronExecution(agent.data.cron);
    if (nextExec) {
      nextRun = nextExec.toISOString();
    }
  }

  return {
    status: agent.data.status,
    lastRun: agent.data.lastRun,
    lastError: agent.data.lastError,
    nextRun,
  };
}

/**
 * Check if an agent is currently running
 */
export function isAgentRunning(agentId: string): boolean {
  return runningAgents.has(agentId);
}

/**
 * Stop all running agents (for graceful shutdown)
 */
export async function stopAllAgents(): Promise<void> {
  const agentIds = Array.from(runningAgents.keys());

  for (const agentId of agentIds) {
    try {
      await stopAgent(agentId);
    } catch (error) {
      console.error(`Failed to stop agent ${agentId}:`, error);
    }
  }
}

/**
 * Restart agents that were running before server shutdown
 */
export async function restartPreviouslyRunningAgents(): Promise<void> {
  const agentManager = new AgentManager();
  const allAgents = await agentManager.readRecords();

  const agentsToRestart = allAgents.records.filter(
    (agent) => agent.data.wasRunning === true
  );

  for (const agent of agentsToRestart) {
    try {
      await new LogManager().info(
        agent.data.app,
        `Auto-restarting agent '${agent.data.name}'`
      );
      await startAgent(agent.id);
    } catch (error: any) {
      await new LogManager().error(
        agent.data.app,
        `Failed to auto-restart agent '${agent.data.name}': ${error.message}`
      );

      // Update agent with error status
      await agentManager.updateRecord(
        await agentManager.getTable(),
        agent.id,
        {
          status: "error",
          lastError: `Failed to auto-restart: ${error.message}`,
        }
      );
    }
  }
}
