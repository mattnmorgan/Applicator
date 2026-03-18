import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/managers/session";
import { userHasAuthorization } from "@/lib/managers/user";
import Agent from "@/lib/system/agents/agent";
import Logger from "@/lib/system/logger";
import fs from "fs/promises";
import path from "path";

async function getLogDir(appId: string, agentId: string): Promise<string | null> {
  const agent = new Agent(appId, agentId, new Logger({ filename: "" }));
  return agent.getLogDirectory();
}

function parseTimestampFromFilename(id: string): Date {
  // Filename: YYYY-MM-DDTHH-mm-ss-sssZ → restore colons and dot
  const timestampStr = id.replace(/-/g, (m, i) =>
    i === 4 || i === 7 ? "-" : i === 13 || i === 16 ? ":" : i === 19 ? "." : m,
  );
  const d = new Date(timestampStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

async function parseLogSuccess(logPath: string): Promise<boolean | null> {
  try {
    const content = await fs.readFile(logPath, "utf8");
    const m = content.match(/Agent has finished execution :: (\{.*\})/);
    if (m) {
      const meta = JSON.parse(m[1]);
      return !!meta.success;
    }
  } catch {}
  return null;
}

async function requireAdmin(request: NextRequest): Promise<{ userId: string } | null> {
  const sessionId = request.cookies.get("session")?.value;
  if (!sessionId) return null;
  const session = await getSession(sessionId);
  if (!session) return null;
  const hasAdmin = await userHasAuthorization(session.user_id, "system:admin");
  if (!hasAdmin) return null;
  return { userId: session.user_id };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; agentId: string }> },
) {
  try {
    const { appId, agentId } = await params;

    if (!await requireAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const logDir = await getLogDir(appId, agentId);
    if (!logDir) return NextResponse.json({ logs: [] });

    let files: string[];
    try {
      files = await fs.readdir(logDir);
    } catch {
      return NextResponse.json({ logs: [] });
    }

    const entries = await Promise.all(
      files
        .filter((f) => f.endsWith(".log"))
        .map(async (filename) => {
          const id = filename.replace(".log", "");
          const timestamp = parseTimestampFromFilename(id);
          const success = await parseLogSuccess(path.join(logDir, filename));
          return { id, timestamp: timestamp.toISOString(), success };
        }),
    );

    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ logs: entries });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; agentId: string }> },
) {
  try {
    const { appId, agentId } = await params;

    if (!await requireAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const logDir = await getLogDir(appId, agentId);
    if (!logDir) return NextResponse.json({ deleted: 0 });

    let files: string[];
    try {
      files = await fs.readdir(logDir);
    } catch {
      return NextResponse.json({ deleted: 0 });
    }

    let deleted = 0;
    for (const filename of files.filter((f) => f.endsWith(".log"))) {
      try {
        await fs.unlink(path.join(logDir, filename));
        deleted++;
      } catch {}
    }

    return NextResponse.json({ deleted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
