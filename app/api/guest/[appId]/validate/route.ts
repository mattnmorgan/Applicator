import { NextRequest, NextResponse } from "next/server";
import { GenericCRUD as CRUD } from "@/lib/database/crud/";
import AuthorityManager from "@/lib/database/managers/authority";
import ContextualAuthorityManager from "@/lib/database/managers/contextualAuthority";
import App from "@/lib/database/types/app";
import ContextualAuthority from "@/lib/database/types/contextualAuthority";
import bcrypt from "bcryptjs";

interface Applet {
  label: string;
  description: string;
  component: string;
  app: string;
  target: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> },
) {
  try {
    const { appId } = await params;
    const body = await request.json();
    const { contextId, password } = body;

    if (!contextId) {
      return NextResponse.json(
        { error: "Context ID is required" },
        { status: 400 },
      );
    }

    // Check if app exists
    const appManager = new CRUD<App>("system", "app");
    const appRecord = await appManager.readRecord(appId);
    if (!appRecord) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    // Check if app has guest-accessible permission
    const authorityManager = new AuthorityManager();
    const appAuthority =
      await authorityManager.readAppSpecificAuthority(appId);
    if (
      !appAuthority ||
      !appAuthority.data.authorizations.includes("system:guest-accessible")
    ) {
      return NextResponse.json(
        { error: "This app does not support guest access" },
        { status: 403 },
      );
    }

    // Look up the contextual authority
    const caManager = new ContextualAuthorityManager();
    const caRecord = await caManager.readRecord(contextId);
    if (!caRecord || caRecord.data.app !== appId) {
      return NextResponse.json(
        { error: "Invalid or expired link" },
        { status: 404 },
      );
    }

    const ca = caRecord.data;

    // Check password requirement
    if (ca.password) {
      if (!password) {
        return NextResponse.json({
          valid: false,
          requiresPassword: true,
        });
      }

      const passwordMatch = await bcrypt.compare(password, ca.password);
      if (!passwordMatch) {
        return NextResponse.json(
          { error: "Incorrect password" },
          { status: 403 },
        );
      }
    }

    // Parse context data
    let contextData = null;
    if (ca.context) {
      try {
        contextData = JSON.parse(ca.context);
      } catch {
        contextData = null;
      }
    }

    // Resolve the guest applet for this app
    const appletManager = new CRUD<Applet>("system", "applet");
    const applets = await appletManager.readRecords({
      fields: { app: appId, target: "guest" },
    });
    const guestApplet =
      applets.records.length > 0 ? applets.records[0] : null;

    // Get app version for module URL
    const version = appRecord.data.version;
    const versionString = `${version.major}.${version.minor}.${version.dev}`;

    return NextResponse.json({
      valid: true,
      contextData,
      appletComponent: guestApplet?.data.component || null,
      appVersion: versionString,
    });
  } catch (error) {
    console.error("Error validating guest access:", error);
    return NextResponse.json(
      { error: "Failed to validate guest access" },
      { status: 500 },
    );
  }
}
