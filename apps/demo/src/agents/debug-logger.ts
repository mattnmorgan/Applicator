/**
 * Debug Logger Agent
 *
 * Demonstrates a CRON-scheduled agent that logs a message every minute.
 * This agent showcases the logging capabilities of the platform.
 *
 * CRON Schedule: * * * * * (every minute)
 */

import { PluginContext } from "@/lib/sdk";

interface ListResult {
  total?: number;
  records: unknown[];
}

/**
 * Main agent execution function
 */
export async function run(context: PluginContext): Promise<void> {
  const timestamp = new Date().toISOString();
  const message = `[Debug Logger] Heartbeat at ${timestamp} - Agent is running normally`;

  // Log to the agent's logger (writes to both file and database)
  await context.logger.info(message);

  // Also log some system information
  await context.logger.info(`[Debug Logger] App ID: ${context.appId}`);

  // Demonstrate we can access the database
  try {
    const items: ListResult = await context.records.list("demo-item", { limit: 1 });
    await context.logger.info(
      `[Debug Logger] Demo items in database: ${items.total || 0}`
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await context.logger.warn(
      `[Debug Logger] Could not read demo items: ${errorMessage}`
    );
  }
}
