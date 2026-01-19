import { restartPreviouslyRunningAgents, stopAllAgents } from "./agent-runner";
import LogManager from "@/lib/database/managers/log";

let initialized = false;
let shutdownHandlersRegistered = false;

/**
 * Initialize the agent system on server startup.
 * This should be called once when the server starts.
 */
export async function initializeAgentSystem(): Promise<void> {
  if (initialized) {
    return;
  }

  initialized = true;

  try {
    await new LogManager().info("system", "Initializing agent system...");

    // Register shutdown handlers (only once)
    if (!shutdownHandlersRegistered) {
      shutdownHandlersRegistered = true;

      // Handle graceful shutdown
      const handleShutdown = async (signal: string) => {
        await new LogManager().info(
          "system",
          `Received ${signal}, stopping all agents...`
        );
        await stopAllAgents();
        process.exit(0);
      };

      process.on("SIGTERM", () => handleShutdown("SIGTERM"));
      process.on("SIGINT", () => handleShutdown("SIGINT"));

      // Handle uncaught exceptions
      process.on("uncaughtException", async (error) => {
        console.error("Uncaught exception:", error);
        await new LogManager().error(
          "system",
          `Uncaught exception: ${error.message}`
        );
        await stopAllAgents();
        process.exit(1);
      });

      // Handle unhandled promise rejections
      process.on("unhandledRejection", async (reason, promise) => {
        console.error("Unhandled rejection:", reason);
        await new LogManager().error(
          "system",
          `Unhandled rejection: ${reason}`
        );
      });
    }

    // Restart agents that were running before
    await restartPreviouslyRunningAgents();

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
 * Shutdown the agent system gracefully.
 * This should be called when the server is shutting down.
 */
export async function shutdownAgentSystem(): Promise<void> {
  if (!initialized) {
    return;
  }

  try {
    await new LogManager().info("system", "Shutting down agent system...");
    await stopAllAgents();
    await new LogManager().info("system", "Agent system shut down");
  } catch (error: any) {
    console.error("Failed to shutdown agent system:", error);
    await new LogManager().error(
      "system",
      `Failed to shutdown agent system: ${error.message}`
    );
  }

  initialized = false;
}

/**
 * Check if the agent system has been initialized.
 */
export function isAgentSystemInitialized(): boolean {
  return initialized;
}
