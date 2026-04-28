import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/managers/user";
import SettingManager from "@/lib/managers/setting";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const auths = new Set(user.authorizations);
    if (!auths.has("system:developer") || !auths.has("system:elasticsearch-access")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { method = "GET", path = "", body: requestBody } = body;

    const settingManager = new SettingManager();
    const [urlRecord, usernameRecord, passwordRecord] = await Promise.all([
      settingManager.readRecord("elasticsearchUrl"),
      settingManager.readRecord("elasticsearchUsername"),
      settingManager.readRecord("elasticsearchPassword"),
    ]);

    const url = urlRecord?.data.value;
    if (!url) {
      return NextResponse.json(
        { error: "Elasticsearch is not configured in system settings." },
        { status: 400 },
      );
    }

    const username = usernameRecord?.data.value || "";
    const password = passwordRecord?.data.value || "";
    const baseUrl = url.replace(/\/$/, "");
    const cleanPath = path.replace(/^\//, "");
    const fullUrl = cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (username && password) {
      headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
    }

    const start = Date.now();
    const response = await fetch(fullUrl, {
      method: method.toUpperCase(),
      headers,
      ...(requestBody !== undefined ? { body: JSON.stringify(requestBody) } : {}),
    });
    const duration = Date.now() - start;

    const data = await response.json().catch(() => null);
    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      data,
      duration,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
