import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/database/managers/user";
import AppManager from "@/lib/database/managers/app";
import AuthorityManager from "@/lib/database/managers/authority";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ widgetId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = currentUser.user;
    const { widgetId } = await params;

    // Get all apps and search for the widget
    const appManager = new AppManager();
    const appKeys = await appManager.listRecords();

    let foundWidget: any = null;
    let foundAppId: string | null = null;

    for (const key of appKeys) {
      const appId = key.split(":").pop();
      if (!appId) continue;

      const app = await appManager.readRecord(appId);
      if (!app || !app.data.subApps) continue;

      for (const subApp of app.data.subApps) {
        if (!subApp.widgets) continue;

        const widget = subApp.widgets.find((w) => w.id === widgetId);
        if (widget) {
          foundWidget = widget;
          foundAppId = `${app.id}:${subApp.id}`;
          break;
        }
      }

      if (foundWidget) break;
    }

    if (!foundWidget || !foundAppId) {
      return NextResponse.json(
        { error: "Widget not found" },
        { status: 404 }
      );
    }

    // Check if user has access to the widget's sub-app
    const authorityManager = new AuthorityManager();
    const authority = await authorityManager.readRecord(user.data.authority);
    const userAuthority = await authorityManager.readUserAuthority(user.id);

    const userSubApps = [
      ...(authority?.data.apps || []),
      ...(userAuthority?.data.apps || []),
    ];

    if (!userSubApps.includes(foundAppId)) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Return widget info
    return NextResponse.json({
      id: foundWidget.id,
      name: foundWidget.name,
      description: foundWidget.description,
      target: foundWidget.target,
      component: foundWidget.component,
      appId: foundAppId,
    });
  } catch (error) {
    console.error("Error fetching widget:", error);
    return NextResponse.json(
      { error: "Failed to fetch widget" },
      { status: 500 }
    );
  }
}
