/**
 * Debug Logger Agent
 *
 * Demonstrates a CRON-scheduled agent that logs a message every minute.
 * This agent showcases the logging capabilities of the platform.
 *
 * CRON Schedule: * * * * * (every minute)
 */

(async () => {
  interface IPCResponse {
    id: string;
    result?: unknown;
    error?: string;
  }

  interface ListResult {
    total?: number;
    records: unknown[];
  }

  // Pending IPC request handlers
  const pendingRequests = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();

  // Handle IPC responses from parent
  process.on("message", (message: IPCResponse) => {
    if (message.id && pendingRequests.has(message.id)) {
      const { resolve, reject } = pendingRequests.get(message.id)!;
      pendingRequests.delete(message.id);

      if (message.error) {
        reject(new Error(message.error));
      } else {
        resolve(message.result);
      }
    }
  });

  /**
   * Send an IPC request to the parent process
   */
  function request(method: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      pendingRequests.set(id, { resolve, reject });
      process.send!({ id, method, params });
    });
  }

  // Convenience methods for common operations
  const logger = {
    info: (message: string) => request("logger.info", { message }),
    warn: (message: string) => request("logger.warn", { message }),
    error: (message: string) => request("logger.error", { message }),
  };

  const records = {
    list: (table: string, options?: { limit?: number; offset?: number }) =>
      request("records.list", { table, ...options }) as Promise<ListResult>,
  };

  const appId = process.env.AGENT_APP_ID || "unknown";

  try {
    const timestamp = new Date().toISOString();
    const message = `[Debug Logger] Heartbeat at ${timestamp} - Agent is running normally`;

    // Log to the agent's logger (writes to both file and database)
    await logger.info(message);

    // Also log some system information
    await logger.info(`[Debug Logger] App ID: ${appId}`);

    // Demonstrate we can access the database
    try {
      const items = await records.list("demo-item", { limit: 1 });
      await logger.info(`[Debug Logger] Demo items in database: ${items.total || 0}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await logger.warn(`[Debug Logger] Could not read demo items: ${errorMessage}`);
    }

    // Exit successfully
    process.exit(0);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logger.error(`[Debug Logger] Fatal error: ${errorMessage}`);
    process.exit(1);
  }
})();
