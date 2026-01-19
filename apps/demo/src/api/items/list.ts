import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/demo/items/list
 *
 * Lists all demo items visible to the current user.
 */
export async function GET(request: NextRequest, context: { plugin: any }) {
  try {
    const { plugin } = context;

    if (!plugin.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization
    const canViewAll = await plugin.system.checkMyAuthorization("demo:view");

    // Get all demo items
    const result = await plugin.records.list("demo-item", { limit: 1000 });

    // Filter based on permissions and enrich with user data
    const items = [];
    for (const record of result.records) {
      // If user can view all, or is the creator, or is assigned
      if (
        canViewAll ||
        record.data.createdBy === plugin.userId ||
        record.data.assignedTo === plugin.userId
      ) {
        // Enrich with user names
        let createdByName = "Unknown";
        let assignedToName;

        const createdByUser = await plugin.system.getUser(record.data.createdBy);
        if (createdByUser) {
          createdByName = createdByUser.displayName;
        }

        if (record.data.assignedTo) {
          const assignedUser = await plugin.system.getUser(record.data.assignedTo);
          if (assignedUser) {
            assignedToName = assignedUser.displayName;
          }
        }

        items.push({
          id: record.id,
          ...record.data,
          createdByName,
          assignedToName,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        });
      }
    }

    return NextResponse.json({ items, total: items.length });
  } catch (error) {
    console.error("Error listing demo items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
