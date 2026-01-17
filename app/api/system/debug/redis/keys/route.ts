import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/database/managers/user";
import { getRedisClient } from "@/lib/database/crud/redis";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.authorizations.some((a) => a === "system:admin")) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.json({ keys: await getRedisClient().keys("*") });
  } catch (error) {
    console.error("Failed to fetch Redis keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch Redis keys" },
      { status: 500 }
    );
  }
}
