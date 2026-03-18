/**
 * Called automatically by NextJS on server startup.
 */
export async function register() {
  // Only run on the server — all imports are dynamic to avoid
  // pulling Node.js modules into the edge runtime bundle.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializeSchema } = await import("@/lib/database/schema");
    await initializeSchema();

    const { default: AgentSystem } = await import(
      "@/lib/system/agents/agent-system"
    );
    const { backfillAgentExecutions } = await import(
      "@/lib/system/agents/backfill"
    );

    // Initialize after a short delay to ensure database is ready
    setTimeout(async () => {
      try {
        await AgentSystem.getInstance().initialize();
      } catch (error) {
        console.error("Failed to initialize agent system:", error);
      }

      try {
        await backfillAgentExecutions();
      } catch (error) {
        console.error("Failed to backfill agent executions:", error);
      }
    }, 5000);
  }
}
