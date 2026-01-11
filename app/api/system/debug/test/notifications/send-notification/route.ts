import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/database/managers/user";
import NotificationManager from "@/lib/database/managers/notification";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body;

    const notificationType = type || "info";
    const validTypes = ["info", "success", "warning", "error"];
    if (!validTypes.includes(notificationType)) {
      return NextResponse.json(
        {
          error:
            "Invalid notification type. Use: info, success, warning, error",
        },
        { status: 400 }
      );
    }

    // Create notification with appropriate title and message based on type
    const titles = {
      info: "Test Info Notification",
      success: "Test Success Notification",
      warning: "Test Warning Notification",
      error: "Test Error Notification",
    };

    const messages = {
      info: "This is a test info notification to verify the notification system is working correctly.",
      success:
        "This is a test success notification. Everything is working great!",
      warning: "This is a test warning notification. Please be aware of this.",
      error: "This is a test error notification. Something needs attention.",
    };

    const manager = new NotificationManager();
    const record = await manager.createRecord(await manager.getTable(), {
      type,
      title: titles[type],
      message: messages[type],
      userId: user.user.id,
      url: "/user/notifications",
      app: "system",
      read: false,
      archived: false,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      notification: record,
    });
  } catch (error) {
    console.error("Create test notification error:", error);
    return NextResponse.json(
      { error: "Failed to create test notification" },
      { status: 500 }
    );
  }
}
