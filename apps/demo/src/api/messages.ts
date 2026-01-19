import { NextRequest, NextResponse } from "next/server";

const RESPONSES_FILE = "ping-pong-responses.json";
const QUEUE_FILE = "ping-pong-queue.json";

/**
 * GET /api/demo/messages
 *
 * Retrieves recent messages from the ping-pong agent, including
 * both pending messages in the queue and processed responses.
 */
export async function GET(request: NextRequest, context: { plugin: any }) {
  try {
    const { plugin } = context;

    if (!plugin.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const since = url.searchParams.get("since"); // Optional: only get messages since this timestamp
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    // Read processed responses
    let responses = [];
    try {
      const responsesExist = await plugin.files.exists(RESPONSES_FILE);
      if (responsesExist) {
        const responsesData = await plugin.files.readFile(RESPONSES_FILE);
        responses = JSON.parse(responsesData.toString());
      }
    } catch (error) {
      responses = [];
    }

    // Read pending messages in queue
    let pending = [];
    try {
      const queueExists = await plugin.files.exists(QUEUE_FILE);
      if (queueExists) {
        const queueData = await plugin.files.readFile(QUEUE_FILE);
        pending = JSON.parse(queueData.toString());
      }
    } catch (error) {
      pending = [];
    }

    // Filter by timestamp if provided
    if (since) {
      const sinceTimestamp = parseInt(since, 10);
      responses = responses.filter((r: any) => r.timestamp > sinceTimestamp);
    }

    // Sort by timestamp descending and limit
    responses.sort((a: any, b: any) => b.timestamp - a.timestamp);
    responses = responses.slice(0, limit);

    return NextResponse.json({
      responses,
      pending: pending.length,
      pendingMessages: pending,
      total: responses.length,
    });
  } catch (error: any) {
    console.error("Error getting messages:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
