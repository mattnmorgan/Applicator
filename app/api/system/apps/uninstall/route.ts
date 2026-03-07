import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/managers/session";
import { userHasAuthorization } from "@/lib/managers/user";
import AppManager from "@/lib/managers/app";
import { formatVersion } from "@/lib/system/version";
import AuthorizationManager from "@/lib/managers/authorization";
import AuthorityManager from "@/lib/managers/authority";
import SettingManager from "@/lib/managers/setting";
import LogManager from "@/lib/managers/log";
import TableManager from "@/lib/managers/table";
import FieldManager from "@/lib/managers/field";
import ApiRouteManager from "@/lib/managers/apiRoute";
import AppletManager from "@/lib/managers/applet";
import AppletSettingManager from "@/lib/managers/appletSetting";
import AgentManager from "@/lib/managers/agent";
import UserManager from "@/lib/managers/user";
import Agent from "@/lib/system/agents/agent";
import { deleteAll } from "@/lib/database/crud/delete";
import { withTransaction } from "@/lib/database/connections/postgresql";
import path from "path";
import fs from "fs/promises";
import { loadModule } from "@/lib/system/source";

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
    const hasAdmin = await userHasAuthorization(
      session.user_id,
      "system:admin",
    );
    if (!hasAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { appId } = body;

    if (!appId) {
      return NextResponse.json(
        { error: "App ID is required" },
        { status: 400 },
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
        { status: 400 },
      );
    }

    // Check if any other apps depend on this app
    const allAppsResult = await appManager.readRecords();
    const dependentApps = allAppsResult.records.filter(
      (otherApp) =>
        otherApp.id !== appId &&
        otherApp.data.dependencies &&
        Object.keys(otherApp.data.dependencies).includes(appId),
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
        { status: 400 },
      );
    }

    // Call OnUninstallation hook if it exists
    const settingManager = new SettingManager();
    try {
      const storageRecord = await settingManager.readRecord("storage");
      const storagePath = storageRecord?.data.value;
      if (storagePath) {
        const v = app.data.version;
        const vDir = `v${v.major}.${v.minor}.${v.dev}`;
        const appDir = path.join(storagePath, "apps", appId, vDir);
        const uninstallationHookPath = path.join(
          appDir,
          "system",
          "uninstall.js",
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
            } v${formatVersion(app.data.version)}`,
          );

          const uninstallationHook = loadModule(uninstallationHookPath);

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
        { status: 500 },
      );
    }

    // Stop all agents for this app (process management, outside transaction)
    const agentManager = new AgentManager();
    const allAgentsResult = await agentManager.readRecords();
    const appAgents = allAgentsResult.records.filter(
      (agent) => agent.data.app === appId,
    );

    for (const agentRecord of appAgents) {
      try {
        const [agentAppId, agentName] = agentRecord.id.split(":");
        await new Agent(agentAppId, agentName).stop();
      } catch {
        // Agent may not be running, ignore errors
      }
    }

    // All DB cleanup in a single transaction
    await withTransaction(async (client) => {
      // Delete agent records
      for (const agentRecord of appAgents) {
        await agentManager.deleteRecord(agentRecord.id, { client });
      }

      // Delete all app tables and their records
      const tableManager = new TableManager();
      const fieldManager = new FieldManager();
      const allTablesResult = await tableManager.readRecords({}, client);
      const appTables = allTablesResult.records.filter(
        (table) => table.data.app === appId,
      );

      for (const table of appTables) {
        // Delete all records in this table
        await deleteAll(appId, table.data.table_name, client);

        // Delete the field definitions for this table
        await fieldManager.deleteTableFields(appId, table.data.table_name, client);

        // Delete the table definition
        await tableManager.deleteTable(appId, table.data.table_name, client);
      }

      // Delete all API routes for this app
      const apiRouteManager = new ApiRouteManager();
      const allApiRoutesResult = await apiRouteManager.readRecords({}, client);
      const appApiRoutes = allApiRoutesResult.records.filter(
        (route) => route.data.app === appId,
      );

      for (const route of appApiRoutes) {
        await apiRouteManager.deleteRecord(route.id, { client });
      }

      // Delete all applets for this app
      const appletManager = new AppletManager();
      const allAppletsResult = await appletManager.readRecords({}, client);
      const appApplets = allAppletsResult.records.filter(
        (applet) => applet.data.app === appId,
      );

      // Collect applet IDs for cleanup
      const appAppletIds = new Set(appApplets.map((a) => a.id));

      for (const applet of appApplets) {
        await appletManager.deleteRecord(applet.id, { client });
      }

      // Delete all applet_settings for this app's applets
      const appletSettingManager = new AppletSettingManager();
      const allAppletSettings = await appletSettingManager.readRecords({}, client);
      for (const setting of allAppletSettings.records) {
        if (appAppletIds.has(setting.data.applet)) {
          await appletSettingManager.deleteRecord(setting.id, { client });
        }
      }

      // Clean up pinned applet instances referencing this app's applets
      const userManager = new UserManager();
      const allUsers = await userManager.readRecords({}, client);
      for (const user of allUsers.records) {
        const pinnedSetting = await settingManager.readRecord(
          `${user.id}:home:applets`,
          client,
        );
        if (pinnedSetting && pinnedSetting.data.value) {
          try {
            const instances = JSON.parse(pinnedSetting.data.value);
            if (Array.isArray(instances)) {
              const filtered = instances.filter(
                (inst: any) => !appAppletIds.has(inst.appletId),
              );
              if (filtered.length !== instances.length) {
                const settingTable = await settingManager.getTable();
                await settingManager.upsertRecord(
                  settingTable,
                  `${user.id}:home:applets`,
                  {
                    value: JSON.stringify(filtered),
                    name: "home:applets",
                    user: user.id,
                  },
                  { client },
                );
              }
            }
          } catch {
            // Invalid JSON, skip
          }
        }
      }

      // Delete all authorizations for this app
      const authorizationManager = new AuthorizationManager();
      const allAuthorizationsResult = await authorizationManager.readRecords({}, client);
      const appAuthorizations = allAuthorizationsResult.records.filter(
        (auth) => auth.data.app === appId,
      );

      for (const auth of appAuthorizations) {
        await authorizationManager.deleteRecord(auth.id, { client });
      }

      // Delete all contextual authorities for this app
      const ContextualAuthorityManager = (
        await import("@/lib/managers/contextualAuthority")
      ).default;
      const contextualAuthorityManager = new ContextualAuthorityManager();
      const contextualAuthoritiesResult =
        await contextualAuthorityManager.readRecords({}, client);
      for (const auth of contextualAuthoritiesResult.records) {
        if (auth.data.app === appId) {
          await contextualAuthorityManager.deleteRecord(auth.id, { client });
        }
      }

      // Delete contextual authorities created by this app
      const authorityManager = new AuthorityManager();

      // Delete app-specific authority
      await authorityManager.deleteAppSpecificAuthority(appId, { client });

      const authoritiesResult = await authorityManager.readRecords({}, client);
      for (const authority of authoritiesResult.records) {
        // Delete contextual authorities created by this app
        if (authority.data.contextual && authority.data.app === appId) {
          await authorityManager.deleteRecord(authority.id, { client });
          continue;
        }

        // Remove main app and all subApps from non-contextual authorities
        // Also remove app's authorizations
        const updatedApps = authority.data.apps
          ? authority.data.apps.filter(
              (id) => id !== appId && !id.startsWith(`${appId}:`),
            )
          : [];

        const updatedAuthorizations = authority.data.authorizations
          ? authority.data.authorizations.filter(
              (authId) => !authId.startsWith(`${appId}:`),
            )
          : [];

        const appsChanged =
          authority.data.apps &&
          updatedApps.length !== authority.data.apps.length;
        const authorizationsChanged =
          authority.data.authorizations &&
          updatedAuthorizations.length !== authority.data.authorizations.length;

        // Only update if something changed
        if (appsChanged || authorizationsChanged) {
          await authorityManager.updateRecord(
            await authorityManager.getTable(),
            authority.data.user_id
              ? `user-specific:${authority.id}`
              : authority.id,
            {
              ...authority.data,
              apps: updatedApps,
              authorizations: updatedAuthorizations,
            },
            { client },
          );
        }
      }

      // Delete app from database
      await appManager.deleteRecord(appId, { client });
    });

    // Delete app files from storage (filesystem, outside transaction)
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

    // Clean up agent log files
    try {
      const storageRecord3 = await settingManager.readRecord("storage");
      const storagePath3 = storageRecord3?.data.value;
      if (storagePath3) {
        const agentLogsDir = path.join(storagePath3, "logs", "agents", appId);
        await fs.rm(agentLogsDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore errors cleaning up log files
    }

    // Log app uninstallation
    await new LogManager().info(
      "system",
      `Application uninstalled: ${app.data.label} (${appId})`,
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
        }`,
      );
      await new LogManager().debug("system", error.stack || "");
    } catch (logError) {
      console.error("Failed to log uninstallation error:", logError);
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
