import { NextResponse } from "next/server";
import { getAllAuthorities } from "@/lib/db";

export async function GET() {
  try {
    const allAuthorities = await getAllAuthorities();

    // Filter out user-specific authorities (those should not be visible in the authorities list)
    const nonUserAuthorities = allAuthorities.filter(
      (authority) => !authority.userId
    );

    // Add icon URLs with cache busting
    const authoritiesWithIcons = nonUserAuthorities.map((authority) => ({
      ...authority,
      icon: authority.icon
        ? `/api/system/assets/icons/authorities/${authority.id}?t=${Date.now()}`
        : undefined,
    }));

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
