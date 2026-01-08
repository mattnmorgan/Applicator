import { NextResponse } from "next/server";
import { getAllAuthorities, getApp } from "@/lib/db";

export async function GET() {
  try {
    const allAuthorities = await getAllAuthorities();

    // Filter out user-specific authorities (those should not be visible in the authorities list)
    const nonUserAuthorities = allAuthorities.filter(
      (authority) => !authority.userId
    );

    // Add icon URLs with cache busting and enrich with app information
    const authoritiesWithIcons = await Promise.all(
      nonUserAuthorities.map(async (authority) => {
        let appLabel = undefined;
        if (authority.contextual && authority.app) {
          const app = await getApp(authority.app);
          appLabel = app?.label || 'Unknown';
        }

        return {
          ...authority,
          icon: authority.icon
            ? `/api/system/assets/icons/authorities/${authority.id}?t=${Date.now()}`
            : undefined,
          appLabel,
        };
      })
    );

    // Sort authorities alphabetically by name
    authoritiesWithIcons.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ authorities: authoritiesWithIcons });
  } catch (error) {
    console.error("Failed to fetch authorities:", error);
    return NextResponse.json(
      { error: "Failed to fetch authorities" },
      { status: 500 }
    );
  }
}
