/**
 * Ping Pong Agent
 *
 * A continuous agent that processes messages from a queue file.
 * - Responds "pong" to "ping" messages
 * - Echoes back any other messages
 *
 * This demonstrates a continuous agent that processes a message queue.
 */

import { PluginContext } from "@/lib/sdk";

const QUEUE_FILE = "ping-pong-queue.json";
const RESPONSES_FILE = "ping-pong-responses.json";
const MAX_RESPONSES = 100; // Keep last 100 responses

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

/**
 * Main agent execution function
 */
export async function run(context: PluginContext): Promise<void> {
  await context.logger.info("[Ping-Pong] Agent cycle started");

  try {
    // Read the message queue
    let queue: QueueMessage[] = [];
    try {
      const queueExists = await context.files.exists(QUEUE_FILE);
      if (queueExists) {
        const queueData = await context.files.readFile(QUEUE_FILE);
        queue = JSON.parse(queueData.toString()) as QueueMessage[];
      }
    } catch {
      // Queue file might not exist yet
      queue = [];
    }

    if (queue.length === 0) {
      await context.logger.info("[Ping-Pong] No messages in queue");
      return;
    }

    await context.logger.info(`[Ping-Pong] Processing ${queue.length} message(s)`);

    // Read existing responses
    let responses: ResponseMessage[] = [];
    try {
      const responsesExist = await context.files.exists(RESPONSES_FILE);
      if (responsesExist) {
        const responsesData = await context.files.readFile(RESPONSES_FILE);
        responses = JSON.parse(responsesData.toString()) as ResponseMessage[];
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
        await context.logger.info(`[Ping-Pong] Received 'ping', responding 'pong'`);
      } else {
        responseText = message.text; // Echo back the original message
        await context.logger.info(`[Ping-Pong] Echoing message: "${message.text}"`);
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
    await context.files.writeFile(RESPONSES_FILE, JSON.stringify(responses, null, 2));
    await context.files.writeFile(QUEUE_FILE, JSON.stringify([]));

    await context.logger.info(`[Ping-Pong] Processed ${queue.length} message(s), total responses: ${responses.length}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await context.logger.error(`[Ping-Pong] Error: ${errorMessage}`);
    throw error;
  }
}
