import Agent from "@/lib/system/agents/agent";
import AgentManager from "@/lib/database/managers/agent";
import LogManager from "@/lib/database/managers/log";

/**
 * Singleton class to manage the agent system lifecycle.
 * Handles initialization, shutdown, and process signal handling.
 */
class AgentSystem {
  private static instance: AgentSystem;
  private initialized: boolean = false;
  private shutdownHandlersRegistered: boolean = false;
  private isShuttingDown: boolean = false;

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

      // Restart agents that were running before
      await this.restartPreviouslyRunningAgents();

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
   * Restart agents that were running before server shutdown.
   */
  public async restartPreviouslyRunningAgents(): Promise<void> {
    const agentManager = new AgentManager();
    const allAgents = await agentManager.readRecords();

    const agentsToRestart = allAgents.records.filter(
      (agent) => agent.data.was_running === true,
    );

    for (const agentRecord of agentsToRestart) {
      try {
        const agent = new Agent(agentRecord.data.app, agentRecord.data.name);

        // Check if the agent script file exists before trying to start
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
              was_running: false,
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
          // Clean up the orphaned agent record
          await agentManager.deleteRecord(agentRecord.id);
          continue;
        }

        await new LogManager().info(
          agentRecord.data.app,
          `Auto-restarting agent '${agentRecord.data.name}'`,
        );

        await agent.start();
      } catch (error: any) {
        await new LogManager().error(
          agentRecord.data.app,
          `Failed to auto-restart agent '${agentRecord.data.name}': ${error.message}`,
        );

        // Update agent with error status
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
