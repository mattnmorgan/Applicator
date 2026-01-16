import { NextResponse } from "next/server";
import AppManager from "@/lib/database/managers/app";

export async function GET() {
  try {
    const appManager = new AppManager();
    const appKeys = await appManager.listRecords();

    const apps = [];
    for (const key of appKeys) {
      const appId = key.split(":").pop();
      if (appId) {
        const record = await appManager.readRecord(appId);
        if (record) {
          apps.push({
            id: record.id,
            label: record.data.label,
            version: record.data.version,
            author: record.data.author,
            apiRoutes: record.data.apiRoutes,
            contactEmail: record.data.contactEmail,
            description: record.data.description,
            dependencies: record.data.dependencies,
            subApps: record.data.subApps,
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
