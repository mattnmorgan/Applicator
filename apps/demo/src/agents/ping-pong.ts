/**
 * Ping Pong Agent
 *
 * A continuous agent that processes messages from a queue file.
 * - Responds "pong" to "ping" messages
 * - Echoes back any other messages
 *
 * This demonstrates a continuous agent using the IPC message protocol.
 */

(async () => {
  const QUEUE_FILE = "ping-pong-queue.json";
  const RESPONSES_FILE = "ping-pong-responses.json";
  const MAX_RESPONSES = 100;
  const POLL_INTERVAL = 2000;

  interface QueueMessage {
    id: string;
    text: string;
    userId: string;
    timestamp: number;
    sentAt: string;
  }

  interface ResponseMessage {
    id: string;
    input: string;
    output: string;
    timestamp: number;
    processedAt: string;
  }

  interface IPCResponse {
    id: string;
    result?: unknown;
    error?: string;
  }

  // Pending IPC request handlers
  const pendingRequests = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();

  // Flag to control agent loop (declared early for use in message handler)
  let isRunning = true;

  // Handle IPC responses from parent
  process.on("message", (message: IPCResponse | { type: string }) => {
    // Handle shutdown command from parent
    if ("type" in message && message.type === "shutdown") {
      isRunning = false;
      return;
    }

    const response = message as IPCResponse;
    if (response.id && pendingRequests.has(response.id)) {
      const { resolve, reject } = pendingRequests.get(response.id)!;
      pendingRequests.delete(response.id);

      if (response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response.result);
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

  const files = {
    exists: (path: string) => request("files.exists", { path }) as Promise<boolean>,
    read: async (path: string): Promise<string> => {
      const base64 = (await request("files.read", { path })) as string;
      return Buffer.from(base64, "base64").toString("utf-8");
    },
    write: (path: string, content: string) =>
      request("files.write", { path, content, encoding: "utf-8" }),
  };

  process.on("SIGTERM", () => {
    isRunning = false;
  });

  process.on("SIGINT", () => {
    isRunning = false;
  });

  /**
   * Process one cycle of the message queue
   */
  async function processCycle(): Promise<void> {
    // Read the message queue
    let queue: QueueMessage[] = [];
    try {
      const queueExists = await files.exists(QUEUE_FILE);
      if (queueExists) {
        const queueData = await files.read(QUEUE_FILE);
        queue = JSON.parse(queueData) as QueueMessage[];
      }
    } catch {
      queue = [];
    }

    if (queue.length === 0) {
      return;
    }

    await logger.info(`[Ping-Pong] Processing ${queue.length} message(s)`);

    // Read existing responses
    let responses: ResponseMessage[] = [];
    try {
      const responsesExist = await files.exists(RESPONSES_FILE);
      if (responsesExist) {
        const responsesData = await files.read(RESPONSES_FILE);
        responses = JSON.parse(responsesData) as ResponseMessage[];
      }
    } catch {
      responses = [];
    }

    // Process each message
    for (const message of queue) {
      const inputText = (message.text || "").trim().toLowerCase();
      let responseText: string;

      if (inputText === "ping") {
        responseText = "pong";
        await logger.info(`[Ping-Pong] Received 'ping', responding 'pong'`);
      } else {
        responseText = message.text;
        await logger.info(`[Ping-Pong] Echoing message: "${message.text}"`);
      }

      responses.push({
        id: message.id,
        input: message.text,
        output: responseText,
        timestamp: Date.now(),
        processedAt: new Date().toISOString(),
      });
    }

    // Keep only the last MAX_RESPONSES
    if (responses.length > MAX_RESPONSES) {
      responses = responses.slice(-MAX_RESPONSES);
    }

    // Write responses and clear queue
    await files.write(RESPONSES_FILE, JSON.stringify(responses, null, 2));
    await files.write(QUEUE_FILE, JSON.stringify([]));

    await logger.info(
      `[Ping-Pong] Processed ${queue.length} message(s), total responses: ${responses.length}`,
    );
  }

  await logger.info("[Ping-Pong] Continuous agent started");

  while (isRunning) {
    try {
      await processCycle();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await logger.error(`[Ping-Pong] Error: ${errorMessage}`);
    }

    // Wait before next cycle
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }

  await logger.info("[Ping-Pong] Agent shutting down");
  process.exit(0);
})();
