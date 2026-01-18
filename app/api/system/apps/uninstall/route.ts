import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sdk";
import { userHasAuthorization } from "@/lib/database/managers/user";
import { formatVersion } from "@/lib/database/managers/app";
import AppManager from "@/lib/database/managers/app";
import AuthorizationManager from "@/lib/database/managers/authorization";
import AuthorityManager from "@/lib/database/managers/authority";
import SettingManager from "@/lib/database/managers/setting";
import LogManager from "@/lib/database/managers/log";
import TableManager from "@/lib/database/managers/table";
import FieldManager from "@/lib/database/managers/field";
import ApiRouteManager from "@/lib/database/managers/apiRoute";
import AppletManager from "@/lib/database/managers/applet";
import { deleteAll } from "@/lib/database/crud/delete";
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
    const hasAdmin = await userHasAuthorization(session.userId, "system:admin");
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
    const appManager = new AppManager();
    const app = await appManager.readRecord(appId);
    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    // Prevent uninstalling system app
    if (appId === "system") {
      const errorMsg = `App uninstallation rejected: Cannot uninstall system app`;
      await new LogManager().error("system", errorMsg);
      return NextResponse.json(
        { error: "Cannot uninstall system app" },
        { status: 400 }
      );
    }

    // Check if any other apps depend on this app
    const allAppsResult = await appManager.readRecords();
    const dependentApps = allAppsResult.records.filter(
      (otherApp) =>
        otherApp.id !== appId &&
        otherApp.data.dependencies &&
        Object.keys(otherApp.data.dependencies).includes(appId)
    );

    if (dependentApps.length > 0) {
      const dependentAppNames = dependentApps
        .map((a) => a.data.label)
        .join(", ");
      const errorMsg = `App uninstallation rejected: Cannot uninstall '${app.data.label}' because it is required by: ${dependentAppNames}`;
      await new LogManager().error("system", errorMsg);
      return NextResponse.json(
        {
          error: `Cannot uninstall this app because it is required by: ${dependentAppNames}`,
        },
        { status: 400 }
      );
    }

    // Call OnUninstallation hook if it exists
    const settingManager = new SettingManager();
    try {
      const storageRecord = await settingManager.readRecord("storage");
      const storagePath = storageRecord?.data.value;
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
          await new LogManager().info(
            "system",
            `Running OnUninstallation hook for ${
              app.data.label
            } v${formatVersion(app.data.version)}`
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
      await new LogManager().error("system", errorMsg);
      return NextResponse.json(
        { error: `Uninstallation hook failed: ${error.message}` },
        { status: 500 }
      );
    }

    // Delete all app tables and their records
    const tableManager = new TableManager();
    const fieldManager = new FieldManager();
    const allTablesResult = await tableManager.readRecords();
    const appTables = allTablesResult.records.filter(
      (table) => table.data.app === appId
    );

    for (const table of appTables) {
      // Delete all records in this table
      await deleteAll(appId, table.data.tableName);

      // Delete the field definitions for this table
      await fieldManager.deleteTableFields(appId, table.data.tableName);

      // Delete the table definition
      await tableManager.deleteTable(appId, table.data.tableName);
    }

    // Delete all API routes for this app
    const apiRouteManager = new ApiRouteManager();
    const allApiRoutesResult = await apiRouteManager.readRecords();
    const appApiRoutes = allApiRoutesResult.records.filter(
      (route) => route.data.app === appId
    );

    for (const route of appApiRoutes) {
      await apiRouteManager.deleteRecord(route.id);
    }

    // Delete all applets for this app
    const appletManager = new AppletManager();
    const allAppletsResult = await appletManager.readRecords();
    const appApplets = allAppletsResult.records.filter(
      (applet) => applet.data.app === appId
    );

    for (const applet of appApplets) {
      await appletManager.deleteRecord(applet.id);
    }

    // Delete all authorizations for this app
    const authorizationManager = new AuthorizationManager();
    const allAuthorizationsResult = await authorizationManager.readRecords();
    const appAuthorizations = allAuthorizationsResult.records.filter(
      (auth) => auth.data.app === appId
    );

    for (const auth of appAuthorizations) {
      await authorizationManager.deleteRecord(auth.id);
    }

    // Delete all contextual authorities for this app
    const ContextualAuthorityManager = (
      await import("@/lib/database/managers/contextualAuthority")
    ).default;
    const contextualAuthorityManager = new ContextualAuthorityManager();
    const contextualAuthoritiesResult =
      await contextualAuthorityManager.readRecords();
    for (const auth of contextualAuthoritiesResult.records) {
      if (auth.data.app === appId) {
        await contextualAuthorityManager.deleteRecord(auth.id);
      }
    }

    // Delete contextual authorities created by this app
    const authorityManager = new AuthorityManager();

    // Delete app-specific authority
    await authorityManager.deleteAppSpecificAuthority(appId);

    const authoritiesResult = await authorityManager.readRecords();
    for (const authority of authoritiesResult.records) {
      // Delete contextual authorities created by this app
      if (authority.data.contextual && authority.data.app === appId) {
        await authorityManager.deleteRecord(authority.id);
        continue;
      }

      // Remove main app and all subApps from non-contextual authorities
      if (authority.data.apps) {
        // Filter out the main app and all subApps (appId:*)
        const updatedApps = authority.data.apps.filter(
          (id) => id !== appId && !id.startsWith(`${appId}:`)
        );

        // Only update if something changed
        if (updatedApps.length !== authority.data.apps.length) {
          await authorityManager.updateRecord(
            await authorityManager.getTable(),
            authority.data.userId
              ? `user-specific:${authority.id}`
              : authority.id,
            { ...authority.data, apps: updatedApps }
          );
        }
      }

      // Remove app's authorizations from non-contextual authorities
      if (authority.data.authorizations) {
        const updatedAuthorizations = authority.data.authorizations.filter(
          (authId) => !authId.startsWith(`${appId}:`)
        );

        // Only update if something changed
        if (
          updatedAuthorizations.length !== authority.data.authorizations.length
        ) {
          await authorityManager.updateRecord(
            await authorityManager.getTable(),
            authority.data.userId
              ? `user-specific:${authority.id}`
              : authority.id,
            {
              ...authority.data,
              authorizations: updatedAuthorizations,
            }
          );
        }
      }
    }

    // Delete app from database
    await appManager.deleteRecord(appId);

    // Delete app directory from storage (includes icon, bundle, and API handlers)
    try {
      const storageRecord2 = await settingManager.readRecord("storage");
      const storagePath2 = storageRecord2?.data.value;
      if (storagePath2) {
        const appDir = path.join(storagePath2, "apps", appId);
        await fs.rm(appDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error("Error deleting app files:", error);
      // Continue even if file deletion fails
    }

    // Log app uninstallation
    await new LogManager().info(
      "system",
      `Application uninstalled: ${app.data.label} (${appId})`
    );

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
      await new LogManager().error(
        "system",
        `App uninstallation failed for '${appId}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      await new LogManager().debug("system", error.stack || "");
    } catch (logError) {
      console.error("Failed to log uninstallation error:", logError);
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
