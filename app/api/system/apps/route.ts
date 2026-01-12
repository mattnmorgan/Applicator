import { NextResponse } from "next/server";
import { getAllApps } from "@/lib/database/helpers";

export async function GET() {
  try {
    const allApps = await getAllApps();

    // Transform to flat structure expected by frontend
    const apps = allApps.map((record) => ({
      id: record.id,
      label: record.data.label,
      version: record.data.version,
      author: record.data.author,
      apiRoutes: record.data.apiRoutes,
      contactEmail: record.data.contactEmail,
      description: record.data.description,
      dependencies: record.data.dependencies,
      subApps: record.data.subApps,
    }));

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
