import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

const QUEUE_FILE = "ping-pong-queue.json";

/**
 * POST /api/demo/ping
 *
 * Sends a message to the ping-pong agent queue.
 * The agent will process the message and respond with "pong" for "ping",
 * or echo back other messages.
 */
export async function POST(request: NextRequest, context: { plugin: any }) {
  try {
    const { plugin } = context;

    if (!plugin.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const message = body.message || body.text;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Read existing queue
    let queue = [];
    try {
      const queueExists = await plugin.files.exists(QUEUE_FILE);
      if (queueExists) {
        const queueData = await plugin.files.readFile(QUEUE_FILE);
        queue = JSON.parse(queueData.toString());
      }
    } catch (error) {
      // Queue file might not exist yet
      queue = [];
    }

    // Generate a unique ID for tracking
    const messageId = uuidv4();

    // Add message to queue
    queue.push({
      id: messageId,
      text: message.trim(),
      userId: plugin.userId,
      timestamp: Date.now(),
      sentAt: new Date().toISOString(),
    });

    // Write updated queue
    await plugin.files.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2));

    await plugin.logger.info(`[Ping API] Message queued: "${message.trim()}" (ID: ${messageId})`);

    return NextResponse.json({
      success: true,
      messageId,
      message: "Message queued for processing",
      queueLength: queue.length,
    });
  } catch (error: any) {
    console.error("Error sending ping message:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
