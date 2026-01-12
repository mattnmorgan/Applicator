import { NextResponse, NextRequest } from "next/server";
import { getSystemSettings } from "@/lib/database/managers/setting";

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { settings: await getSystemSettings() },
    { status: 200 }
  );
}
