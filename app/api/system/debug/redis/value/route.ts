import { NextResponse } from "next/server";
import LogManager from "@/lib/database/managers/log";
import { getCurrentUser } from "@/lib/database/managers/user";
import { getRedisClient } from "@/lib/database/crud/redis";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.authorizations.some((a) => a === "admin")) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Key parameter is required" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      key: key,
      value: await getRedisClient().get(key),
    });
  } catch (error) {
    console.error("Failed to fetch Redis value:", error);
    return NextResponse.json(
      { error: "Failed to fetch Redis value" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.authorizations.some((a) => a === "admin")) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Key and value are required" },
        { status: 400 }
      );
    }

    await getRedisClient().set(key, value);

    await new LogManager().createLog(
      "info",
      `Database key "${key}" was modified`,
      "system"
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update Redis value:", error);
    return NextResponse.json(
      { error: "Failed to update Redis value" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.authorizations.some((a) => a === "admin")) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "Key parameter is required" },
        { status: 400 }
      );
    }

    await getRedisClient().del(key);
    await new LogManager().createLog(
      "info",
      'Database key was deleted: "' + key + '"',
      "system"
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete Redis key:", error);
    return NextResponse.json(
      { error: "Failed to delete Redis key" },
      { status: 500 }
    );
  }
}
