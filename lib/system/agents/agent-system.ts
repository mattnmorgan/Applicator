import Agent from "@/lib/system/agents/agent";
import AgentManager from "@/lib/managers/agent";
import LogManager from "@/lib/managers/log";
import Logger from "@/lib/system/logger";
import { matchesCronSchedule } from "@/lib/system/cron";

/**
 * Singleton class to manage the agent system lifecycle.
 * Handles initialization, shutdown, and process signal handling.
 */
class AgentSystem {
  private static instance: AgentSystem;
  private initialized: boolean = false;
  private shutdownHandlersRegistered: boolean = false;
  private isShuttingDown: boolean = false;
  private schedulerInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  /**
   * Get the singleton instance of AgentSystem.
   */
  public static getInstance(): AgentSystem {
    if (!AgentSystem.instance) {
      AgentSystem.instance = new AgentSystem();
    }
    return AgentSystem.instance;
  }

  /**
   * Check if the agent system has been initialized.
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Initialize the agent system on server startup.
   * This should be called once when the server starts.
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    try {
      await new LogManager().info("system", "Initializing agent system...");

      this.registerShutdownHandlers();

      // Restart continuous agents that were running before shutdown.
      // CRON agents are automatically picked up by the scheduler below.
      await this.restartActiveAgents();

      this.startScheduler();

      await new LogManager().info("system", "Agent system initialized");
    } catch (error: any) {
      console.error("Failed to initialize agent system:", error);
      await new LogManager().error(
        "system",
        `Failed to initialize agent system: ${error.message}`,
      );
    }
  }

  /**
   * Start the central CRON scheduler. Fires every 60 seconds and executes
   * any scheduled agent whose cron expression matches the current time.
   * The DB is the sole source of truth — stopping an agent just updates its
   * status to "stopped" and the scheduler will skip it on the next tick.
   */
  private startScheduler(): void {
    const tick = async () => {
      try {
        const agentManager = new AgentManager();
        const allAgents = await agentManager.readRecords();
        const now = new Date();

        let started = 0;

        for (const record of allAgents.records) {
          if (record.data.status !== "scheduled" || !record.data.cron) {
            continue;
          }

          if (record.data.manual) {
            continue;
          }

          if (!matchesCronSchedule(record.data.cron, now)) {
            continue;
          }

          const agentId = `${record.data.app}:${record.data.name}`;
          if (Agent.isAgentExecuting(agentId)) {
            continue;
          }

          const agent = new Agent(
            record.data.app,
            record.data.name,
            new Logger({ filename: "" }),
          );

          agent.execute().catch(async (error: any) => {
            await new LogManager().error(
              record.data.app,
              `Scheduler failed to execute agent '${record.data.name}': ${error.message}`,
            );
          });

          started++;
        }
      } catch (error: any) {
        console.error("Agent scheduler tick failed:", error);
      }
    };

    this.schedulerInterval = setInterval(tick, 60000);
  }

  /**
   * Register process signal handlers for graceful shutdown.
   * Only registers handlers once.
   */
  private registerShutdownHandlers(): void {
    if (this.shutdownHandlersRegistered) {
      return;
    }

    this.shutdownHandlersRegistered = true;

    // Handle graceful shutdown - use 'once' to prevent multiple triggers
    const handleShutdown = (signal: string, exitCode: number = 0) => {
      if (this.isShuttingDown) {
        return;
      }
      this.isShuttingDown = true;

      // Use an IIFE to handle async operations and ensure process exits after completion
      (async () => {
        try {
          await new LogManager().info(
            "system",
            `Received ${signal}, stopping all agents...`,
          );
          await Agent.stopAll();
        } catch (error) {
          console.error(`Error during shutdown: ${error}`);
        } finally {
          process.exit(exitCode);
        }
      })();
    };

    process.once("SIGTERM", () => handleShutdown("SIGTERM", 0));
    process.once("SIGINT", () => handleShutdown("SIGINT", 0));

    // Handle uncaught exceptions
    process.once("uncaughtException", (error) => {
      console.error("Uncaught exception:", error);
      new LogManager()
        .error("system", `Uncaught exception: ${error.message}`)
        .finally(() => handleShutdown("uncaughtException", 1));
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", async (reason) => {
      console.error("Unhandled rejection:", reason);
      await new LogManager().error("system", `Unhandled rejection: ${reason}`);
    });
  }

  /**
   * Shutdown the agent system gracefully.
   * This should be called when the server is shutting down.
   */
  public async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    try {
      await new LogManager().info("system", "Shutting down agent system...");
      await Agent.stopAll();
      await new LogManager().info("system", "Agent system shut down");
    } catch (error: any) {
      console.error("Failed to shutdown agent system:", error);
      await new LogManager().error(
        "system",
        `Failed to shutdown agent system: ${error.message}`,
      );
    }

    this.initialized = false;
  }

  /**
   * Stop all running agents (for graceful shutdown).
   */
  public async stopAllAgents(): Promise<void> {
    await Agent.stopAll();
  }

  /**
   * Restart continuous agents that were running before server shutdown.
   * CRON agents with status "scheduled" are skipped — the scheduler handles them.
   */
  public async restartActiveAgents(): Promise<void> {
    const agentManager = new AgentManager();
    const allAgents = await agentManager.readRecords();

    // Reset cron/manual agents that were executing when the server last stopped.
    // Their child process is gone; put them back to the correct idle status.
    const interruptedExecuting = allAgents.records.filter(
      (agent) => agent.data.status === "running" && agent.data.cron,
    );
    for (const agentRecord of interruptedExecuting) {
      const resetStatus = agentRecord.data.manual ? "stopped" : "scheduled";
      await agentManager.updateRecord(
        await agentManager.getTable(),
        agentRecord.id,
        {
          status: resetStatus,
          last_error: "Execution interrupted by server restart",
        },
      );
      await new LogManager().warn(
        agentRecord.data.app,
        `Agent '${agentRecord.data.name}' was interrupted by server restart; status reset to '${resetStatus}'`,
      );
    }

    // Only restart continuous (non-cron) agents; CRON agents are driven by the scheduler.
    const agentsToRestart = allAgents.records.filter(
      (agent) => agent.data.status === "running" && !agent.data.cron,
    );

    for (const agentRecord of agentsToRestart) {
      try {
        const agent = new Agent(agentRecord.data.app, agentRecord.data.name);

        const scriptPath = await agent.getScriptPath();
        if (!scriptPath) {
          await new LogManager().warn(
            agentRecord.data.app,
            `Cannot auto-restart agent '${agentRecord.data.name}': storage not configured`,
          );
          await agentManager.updateRecord(
            await agentManager.getTable(),
            agentRecord.id,
            {
              status: "stopped",
              last_error: "Storage not configured",
            },
          );
          continue;
        }

        // Verify the script file exists (app may have been uninstalled)
        const fs = await import("fs/promises");
        try {
          await fs.access(scriptPath);
        } catch {
          await new LogManager().warn(
            agentRecord.data.app,
            `Cannot auto-restart agent '${agentRecord.data.name}': script file not found (app may have been uninstalled)`,
          );
          await agentManager.deleteRecord(agentRecord.id);
          continue;
        }

        await new LogManager().info(
          agentRecord.data.app,
          `Auto-restarting continuous agent '${agentRecord.data.name}'`,
        );

        await agent.start();
      } catch (error: any) {
        await new LogManager().error(
          agentRecord.data.app,
          `Failed to auto-restart agent '${agentRecord.data.name}': ${error.message}`,
        );

        await agentManager.updateRecord(
          await agentManager.getTable(),
          agentRecord.id,
          {
            status: "error",
            last_error: `Failed to auto-restart: ${error.message}`,
          },
        );
      }
    }
  }
}

export default AgentSystem;
