import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import SessionManager from "@/lib/managers/session";
import UserManager, { verifyPassword } from "@/lib/managers/user";

function parseUserAgent(ua: string): {
  device_name: string;
  browser_name: string;
  device_type: string;
} {
  const isMobile =
    /Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);

  let device_type: string;
  if (isTablet) {
    device_type = "tablet";
  } else if (isMobile) {
    device_type = "mobile";
  } else {
    device_type = "desktop";
  }

  // Device name
  let device_name = "?";
  if (/iPhone/i.test(ua)) device_name = "iPhone";
  else if (/iPad/i.test(ua)) device_name = "iPad";
  else if (/Android/i.test(ua)) {
    const m = ua.match(/Android[^;]*;\s*([^)]+)\)/);
    device_name = m ? m[1].trim() : "Android Device";
  } else if (/Windows NT/i.test(ua)) device_name = "Windows PC";
  else if (/Macintosh/i.test(ua)) device_name = "Mac";
  else if (/Linux/i.test(ua)) device_name = "Linux PC";
  else if (/CrOS/i.test(ua)) device_name = "Chromebook";

  // Browser name
  let browser_name = "?";
  if (/Edg\//i.test(ua)) browser_name = "Edge";
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser_name = "Opera";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua))
    browser_name = "Chrome";
  else if (/Chromium\//i.test(ua)) browser_name = "Chromium";
  else if (/Firefox\//i.test(ua)) browser_name = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua))
    browser_name = "Safari";

  return { device_name, browser_name, device_type };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 },
      );
    }

    // Get user by username
    const users = await new UserManager().readRecords({
      fields: { username: username },
    });
    if (!users.total) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 },
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(
      password,
      users.records[0].data.password_hash,
    );
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 },
      );
    }

    // Check if user is active
    if (!users.records[0].data.is_active) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 },
      );
    }

    const ua = request.headers.get("user-agent") || "";
    const deviceInfo = ua ? parseUserAgent(ua) : {};
    const session = await new SessionManager().createSession(
      users.records[0].id,
      null,
      deviceInfo,
    );
    const cookieStore = await cookies();
    cookieStore.set("session", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: users.records[0],
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Failed to login" }, { status: 500 });
  }
}
