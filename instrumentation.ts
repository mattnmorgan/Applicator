import { initializeSchema } from "@/lib/database/schema";

/**
 * Called automatically by NextJS on server startup.
 */
export async function register() {
  // Only run on the server
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize database
    await initializeSchema();

    // Dynamically import to avoid client-side issues
    const { default: AgentSystem } =
      await import("@/lib/system/agents/agent-system");

    // Initialize after a short delay to ensure database is ready
    setTimeout(async () => {
      try {
        await AgentSystem.getInstance().initialize();
      } catch (error) {
        console.error("Failed to initialize agent system:", error);
      }
    }, 5000);
  }
}
