import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getAllApps, getAuthority, getUserAuthority } from "@/lib/database/helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ widgetId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { widgetId } = await params;

    // Get all apps and search for the widget
    const apps = await getAllApps();

    let foundWidget: any = null;
    let foundAppId: string | null = null;

    for (const app of apps) {
      if (!app.data.subApps) continue;

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
    const authority = await getAuthority(user.authority);
    const userAuthority = await getUserAuthority(user.id);

    const userSubApps = [
      ...(authority?.apps || []),
      ...(userAuthority?.apps || []),
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
