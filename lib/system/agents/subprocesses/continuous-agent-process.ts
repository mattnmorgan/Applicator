/**
 * Worker script for continuous agents.
 * This runs as a separate child process and executes the agent in a loop.
 *
 * Expected message format from parent:
 * { type: "start", appId: string, agentName: string, scriptPath: string }
 *
 * Sends back:
 * { type: "error", message: string }
 * { type: "execution", success: boolean, executionTime: number, error?: string }
 */

import { createPlugin, PluginContext } from "@/lib/sdk";
import { loadModule } from "@/lib/system/source";
import AgentManager from "@/lib/database/managers/agent";
import LogManager from "@/lib/database/managers/log";

interface WorkerConfig {
  type: "start";
  appId: string;
  agentName: string;
  scriptPath: string;
}

let isRunning = true;

process.on("message", async (message: WorkerConfig) => {
  if (message.type === "start") {
    await runContinuousAgent(message.appId, message.agentName, message.scriptPath);
  }
});

process.on("SIGTERM", () => {
  isRunning = false;
});

process.on("SIGINT", () => {
  isRunning = false;
});

async function runContinuousAgent(
  appId: string,
  agentName: string,
  scriptPath: string
): Promise<void> {
  const logManager = new LogManager();

  await logManager.info(
    appId,
    `Continuous agent worker started for '${agentName}'`
  );

  while (isRunning) {
    const executionStart = Date.now();
    let success = true;
    let errorMessage: string | undefined;

    try {
      // Create plugin context for the agent
      const plugin = await createPlugin(appId);
      const agentPlugin: PluginContext = {
        ...plugin,
        logger: {
          info: async (message: string) => {
            await plugin.logger.info(message);
          },
          warn: async (message: string) => {
            await plugin.logger.warn(message);
          },
          error: async (message: string) => {
            await plugin.logger.error(message);
          },
        },
      };

      // Load and execute the agent script
      const agentModule = loadModule(scriptPath);

      if (agentModule.run && typeof agentModule.run === "function") {
        await agentModule.run(agentPlugin);
      } else if (typeof agentModule === "function") {
        await agentModule(agentPlugin);
      } else if (
        agentModule.default &&
        typeof agentModule.default === "function"
      ) {
        await agentModule.default(agentPlugin);
      } else {
        throw new Error(
          "Agent script must export a 'run' function or be a function"
        );
      }
    } catch (error: any) {
      success = false;
      errorMessage = error.message || String(error);

      await logManager.error(
        appId,
        `Continuous agent '${agentName}' execution failed: ${errorMessage}`
      );

      // Send error back to parent
      if (process.send) {
        process.send({
          type: "error",
          message: errorMessage,
        });
      }

      // Wait before retrying after error
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    const executionTime = Date.now() - executionStart;

    // Update last run in database
    try {
      const manager = new AgentManager();
      await manager.updateRecord(await manager.getTable(), `${appId}:${agentName}`, {
        lastRun: Date.now(),
        lastError: errorMessage,
      });
    } catch {
      // Ignore database update errors
    }

    // Send execution result to parent
    if (process.send) {
      process.send({
        type: "execution",
        success,
        executionTime,
        error: errorMessage,
      });
    }

    // Small delay between continuous executions
    if (isRunning) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  await logManager.info(appId, `Continuous agent worker stopped for '${agentName}'`);
  process.exit(0);
}
