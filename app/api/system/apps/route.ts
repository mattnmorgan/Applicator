import { NextResponse } from "next/server";
import AppManager from "@/lib/database/managers/app";
import ApiRouteManager from "@/lib/database/managers/apiRoute";

export async function GET() {
  try {
    const appManager = new AppManager();
    const appKeys = await appManager.listRecords();

    // Get all API routes
    const apiRouteManager = new ApiRouteManager();
    const allApiRoutesResult = await apiRouteManager.readRecords();

    const apps = [];
    for (const key of appKeys) {
      const appId = key.split(":").pop();
      if (appId) {
        const record = await appManager.readRecord(appId);
        if (record) {
          // Get API routes for this app
          const apiRoutes = allApiRoutesResult.records
            .filter((route) => route.data.app === appId)
            .map((route) => ({
              path: route.data.path,
              method: route.data.method,
              handler: route.data.handler,
              description: route.data.description,
            }));

          apps.push({
            id: record.id,
            label: record.data.label,
            version: record.data.version,
            author: record.data.author,
            apiRoutes: apiRoutes,
            contactEmail: record.data.contactEmail,
            description: record.data.description,
            dependencies: record.data.dependencies,
          });
        }
      }
    }

    // Sort apps alphabetically by label
    apps.sort((a, b) => a.label.localeCompare(b.label));

    return NextResponse.json({ apps });
  } catch (error) {
    console.error("Error fetching apps:", error);
    return NextResponse.json(
      { error: "Failed to fetch apps" },
      { status: 500 }
    );
  }
}
