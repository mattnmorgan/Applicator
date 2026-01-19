import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/demo/items/create
 *
 * Creates a new demo item.
 */
export async function POST(request: NextRequest, context: { plugin: any }) {
  try {
    const { plugin } = context;

    if (!plugin.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization
    const canManage = await plugin.system.checkMyAuthorization("demo:manage");
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();

    if (!body.title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Create the demo item
    const record = await plugin.records.create("demo-item", {
      title: body.title,
      description: body.description || "",
      status: body.status || "draft",
      createdAt: Date.now(),
      metadata: body.metadata || {},
      createdBy: plugin.userId,
      assignedTo: body.assignedTo || null,
    });

    return NextResponse.json({
      success: true,
      item: {
        id: record.id,
        ...record.data,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error creating demo item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
