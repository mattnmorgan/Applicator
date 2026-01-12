import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sdk";
import {
  userHasAuthorization,
  getApp,
  deleteApp,
  getAllAuthorizations,
  deleteAuthorization,
  getAllAuthorities,
  deleteAuthority,
  updateAuthority,
  getAllApps,
  deleteContextualAuthoritiesByApp,
  getSystemSetting,
  formatVersion,
} from "@/lib/database/helpers";
import { logger } from "@/lib/logging";
import path from "path";
import fs from "fs/promises";
import { createRequire } from "module";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const sessionId = request.cookies.get("session")?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin authorization
    const hasAdmin = await userHasAuthorization(session.userId, "admin");
    if (!hasAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { appId } = body;

    if (!appId) {
      return NextResponse.json(
        { error: "App ID is required" },
        { status: 400 }
      );
    }

    // Check if app exists
    const app = await getApp(appId);
    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    // Prevent uninstalling system app
    if (appId === "system") {
      const errorMsg = `App uninstallation rejected: Cannot uninstall system app`;
      await logger.error("system", errorMsg);
      return NextResponse.json(
        { error: "Cannot uninstall system app" },
        { status: 400 }
      );
    }

    // Check if any other apps depend on this app
    const allApps = await getAllApps();
    const dependentApps = allApps.filter(
      (otherApp) =>
        otherApp.id !== appId &&
        otherApp.data.dependencies &&
        Object.keys(otherApp.data.dependencies).includes(appId)
    );

    if (dependentApps.length > 0) {
      const dependentAppNames = dependentApps.map((a) => a.data.label).join(", ");
      const errorMsg = `App uninstallation rejected: Cannot uninstall '${app.data.label}' because it is required by: ${dependentAppNames}`;
      await logger.error("system", errorMsg);
      return NextResponse.json(
        {
          error: `Cannot uninstall this app because it is required by: ${dependentAppNames}`,
        },
        { status: 400 }
      );
    }

    // Call OnUninstallation hook if it exists
    try {
      const storagePath = await getSystemSetting("storage");
      if (storagePath) {
        const appDir = path.join(storagePath, "apps", appId);
        const uninstallationHookPath = path.join(
          appDir,
          "system",
          "uninstall.js"
        );
        const uninstallationHookExists = await fs
          .access(uninstallationHookPath)
          .then(() => true)
          .catch(() => false);

        if (uninstallationHookExists) {
          await logger
            .info(
              "system",
              `Running OnUninstallation hook for ${app.data.label} v${formatVersion(
                app.data.version
              )}`
            );

          const require = createRequire(import.meta.url || __filename);
          const absolutePath = path.resolve(uninstallationHookPath);

          // Clear cache to ensure fresh load
          delete require.cache[absolutePath];
          const uninstallationHook = require(absolutePath);

          if (
            uninstallationHook.OnUninstallation &&
            typeof uninstallationHook.OnUninstallation === "function"
          ) {
            const context = {
              version: formatVersion(app.data.version),
              appId: appId,
            };

            await uninstallationHook.OnUninstallation(context);
          }
        }
      }
    } catch (error: any) {
      const errorMsg = `App uninstallation hook failed for ${app.data.label}: ${error.message}`;
      await logger.error("system", errorMsg);
      return NextResponse.json(
        { error: `Uninstallation hook failed: ${error.message}` },
        { status: 500 }
      );
    }

    // Delete all app records - handled by table deletion below

    // Delete all authorizations for this app
    const allAuthorizations = await getAllAuthorizations();
    const appAuthorizations = allAuthorizations.filter(
      (auth) => auth.app === appId
    );

    for (const auth of appAuthorizations) {
      await deleteAuthorization(auth.id);
    }

    // Delete all contextual authorities for this app
    await deleteContextualAuthoritiesByApp(appId);

    // Delete contextual authorities created by this app
    const authorities = await getAllAuthorities();
    for (const authority of authorities) {
      // Delete contextual authorities created by this app
      if (authority.contextual && authority.app === appId) {
        await deleteAuthority(authority.id);
        continue;
      }

      // Remove main app and all subApps from non-contextual authorities
      if (authority.apps) {
        // Filter out the main app and all subApps (appId:*)
        const updatedApps = authority.apps.filter(
          (id) => id !== appId && !id.startsWith(`${appId}:`)
        );

        // Only update if something changed
        if (updatedApps.length !== authority.apps.length) {
          await updateAuthority(
            authority.userId ? `user-specific:${authority.id}` : authority.id,
            { apps: updatedApps }
          );
        }
      }

      // Remove app's authorizations from non-contextual authorities
      if (authority.authorizations) {
        const updatedAuthorizations = authority.authorizations.filter(
          (authId) => !authId.startsWith(`${appId}:`)
        );

        // Only update if something changed
        if (updatedAuthorizations.length !== authority.authorizations.length) {
          await updateAuthority(
            authority.userId ? `user-specific:${authority.id}` : authority.id,
            {
              authorizations: updatedAuthorizations,
            }
          );
        }
      }
    }

    // Delete app from database
    await deleteApp(appId);

    // Delete app directory from storage (includes icon, bundle, and API handlers)
    try {
      const storagePath = await getSystemSetting("storage");
      if (storagePath) {
        const appDir = path.join(storagePath, "apps", appId);
        await fs.rm(appDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error("Error deleting app files:", error);
      // Continue even if file deletion fails
    }

    // Log app uninstallation
    await logger
      .info("system", `Application uninstalled: ${app.data.label} (${appId})`);

    return NextResponse.json({
      success: true,
      message: "App uninstalled successfully",
    });
  } catch (error) {
    console.error("Error uninstalling app:", error);

    // Log uninstallation failure
    try {
      const body = await request.json().catch(() => ({}));
      const appId = body.appId || "unknown";
      await logger
        .error(
          "system",
          `App uninstallation failed for '${appId}': ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      await logger.debug("system", error.stack || "");
    } catch (logError) {
      console.error("Failed to log uninstallation error:", logError);
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
