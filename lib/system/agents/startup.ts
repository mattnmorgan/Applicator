import { startAgent, stopAgent, runningAgents } from "./agent-runner";
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
        `Failed to initialize agent system: ${error.message}`
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
            `Received ${signal}, stopping all agents...`
          );
          await this.stopAllAgents();
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
      await new LogManager().error(
        "system",
        `Unhandled rejection: ${reason}`
      );
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
      await this.stopAllAgents();
      await new LogManager().info("system", "Agent system shut down");
    } catch (error: any) {
      console.error("Failed to shutdown agent system:", error);
      await new LogManager().error(
        "system",
        `Failed to shutdown agent system: ${error.message}`
      );
    }

    this.initialized = false;
  }

  /**
   * Stop all running agents (for graceful shutdown).
   */
  public async stopAllAgents(): Promise<void> {
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
   * Restart agents that were running before server shutdown.
   */
  public async restartPreviouslyRunningAgents(): Promise<void> {
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
}

export default AgentSystem;
