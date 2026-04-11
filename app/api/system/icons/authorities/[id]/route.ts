import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/managers/session";
import { userHasAuthorization } from "@/lib/managers/user";
import AuthorityManager from "@/lib/managers/authority";
import { getSystemSettings } from "@/lib/managers/setting";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

async function checkAdmin(request: NextRequest): Promise<boolean> {
  const sessionId = request.cookies.get("session")?.value;
  if (!sessionId) return false;
  const session = await getSession(sessionId);
  if (!session) return false;
  return userHasAuthorization(session.user_id, "system:admin");
}

function iconPath(storagePath: string, id: string): string {
  return path.join(storagePath, "apps", "system", "icons", "authorities", `${id}.png`);
}

// POST /api/system/icons/authorities/:id — upload and resize authority icon
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await checkAdmin(request))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const authorityManager = new AuthorityManager();
    const record = await authorityManager.readRecord(id);
    if (!record) {
      return NextResponse.json({ error: "Authority not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const storagePath = (await getSystemSettings()).storage;
    const filePath = iconPath(storagePath, id);

    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const raw = Buffer.from(await file.arrayBuffer());
    const resized = await sharp(raw)
      .resize(64, 64, { fit: "cover" })
      .png({ compressionLevel: 6 })
      .toBuffer();
    await fs.writeFile(filePath, resized);

    const table = await authorityManager.getTable();
    await authorityManager.updateRecord(table, id, { ...record.data, icon: "true" });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to upload authority icon:", error);
    return NextResponse.json({ error: "Failed to upload icon" }, { status: 500 });
  }
}

// DELETE /api/system/icons/authorities/:id — remove authority icon
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await checkAdmin(request))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const storagePath = (await getSystemSettings()).storage;
    const filePath = iconPath(storagePath, id);

    try {
      await fs.unlink(filePath);
    } catch {}
    // Also remove legacy .jpg if present
    try {
      await fs.unlink(filePath.replace(/\.png$/, ".jpg"));
    } catch {}

    const authorityManager = new AuthorityManager();
    const record = await authorityManager.readRecord(id);
    if (record) {
      const table = await authorityManager.getTable();
      await authorityManager.updateRecord(table, id, { ...record.data, icon: "" });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete authority icon:", error);
    return NextResponse.json({ error: "Failed to delete icon" }, { status: 500 });
  }
}
