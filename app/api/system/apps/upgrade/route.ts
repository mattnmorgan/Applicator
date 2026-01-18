import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sdk";
import { userHasAuthorization } from "@/lib/database/managers/user";
import {
  formatVersion,
  isVersionGreaterOrEqual,
} from "@/lib/database/managers/app";
import AppManager from "@/lib/database/managers/app";
import AuthorityManager from "@/lib/database/managers/authority";
import AuthorizationManager from "@/lib/database/managers/authorization";
import SettingManager from "@/lib/database/managers/setting";
import TableManager from "@/lib/database/managers/table";
import ApiRouteManager from "@/lib/database/managers/apiRoute";
import AppletManager from "@/lib/database/managers/applet";
import LogManager from "@/lib/database/managers/log";
import type AppVersion from "@/lib/database/types/appVersion";
import { SYSTEM_APP_METADATA } from "@/lib/database/systemMetadata";
import path from "path";
import fs from "fs/promises";
import AdmZip from "adm-zip";
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const appId = formData.get("appId") as string;

    if (!appId) {
      return NextResponse.json(
        { error: "No app ID provided" },
        { status: 400 }
      );
    }

    // Special handling for system app upgrade without file
    const isSystemApp = appId === "system";
    const appManager = new AppManager();
    const authorizationManager = new AuthorizationManager();
    const authorityManager = new AuthorityManager();

    if (isSystemApp && !file) {
      // Upgrade system app using metadata
      const existingApp = await appManager.readRecord("system");
      if (!existingApp) {
        return NextResponse.json(
          { error: "System app not found" },
          { status: 404 }
        );
      }

      // Check if upgrade is needed
      const needsUpgrade =
        existingApp.data.version.major < SYSTEM_APP_METADATA.version.major ||
        (existingApp.data.version.major === SYSTEM_APP_METADATA.version.major &&
          existingApp.data.version.minor < SYSTEM_APP_METADATA.version.minor) ||
        (existingApp.data.version.major === SYSTEM_APP_METADATA.version.major &&
          existingApp.data.version.minor ===
            SYSTEM_APP_METADATA.version.minor &&
          existingApp.data.version.dev < SYSTEM_APP_METADATA.version.dev);

      if (!needsUpgrade) {
        return NextResponse.json(
          { error: "System is already up to date" },
          { status: 400 }
        );
      }

      // Update system app with new metadata
      await appManager.updateRecord(await appManager.getTable(), "system", {
        label: SYSTEM_APP_METADATA.name,
        version: SYSTEM_APP_METADATA.version,
        author: SYSTEM_APP_METADATA.author,
        contactEmail: SYSTEM_APP_METADATA.contactEmail,
        description: SYSTEM_APP_METADATA.description,
        dependencies: SYSTEM_APP_METADATA.dependencies,
      });

      // Update API routes for system app
      const apiRouteManager = new ApiRouteManager();
      const allApiRoutes = await apiRouteManager.readRecords();
      const existingSystemApiRoutes = allApiRoutes.records.filter(
        (route) => route.data.app === "system"
      );

      // Delete existing system API routes
      for (const route of existingSystemApiRoutes) {
        await apiRouteManager.deleteRecord(route.id);
      }

      // Create new API routes from metadata
      if (
        SYSTEM_APP_METADATA.apiRoutes &&
        Array.isArray(SYSTEM_APP_METADATA.apiRoutes)
      ) {
        const apiRouteTable = await apiRouteManager.getTable();
        for (const apiRoute of SYSTEM_APP_METADATA.apiRoutes) {
          await apiRouteManager.createRecord(
            apiRouteTable,
            {
              app: "system",
              path: apiRoute.path,
              method: apiRoute.method,
              handler: apiRoute.handler,
              description: apiRoute.description || "",
            },
            { id: `system:${apiRoute.path}:${apiRoute.method}` }
          );
        }
      }

      // Update applets for system app
      const appletManager = new AppletManager();
      const allApplets = await appletManager.readRecords();
      const existingSystemApplets = allApplets.records.filter(
        (applet) => applet.data.app === "system"
      );

      // Delete existing system applets
      for (const applet of existingSystemApplets) {
        await appletManager.deleteRecord(applet.id);
      }

      // Create new applets from metadata
      if (
        SYSTEM_APP_METADATA.applets &&
        Array.isArray(SYSTEM_APP_METADATA.applets)
      ) {
        const appletTable = await appletManager.getTable();
        for (const applet of SYSTEM_APP_METADATA.applets) {
          await appletManager.createRecord(
            appletTable,
            {
              label: applet.label,
              description: applet.description || "",
              component: applet.component,
              app: "system",
              target: applet.target,
            },
            { id: `system:${applet.id}` }
          );
        }
      }

      // Update table records
      if (
        SYSTEM_APP_METADATA.tables &&
        Array.isArray(SYSTEM_APP_METADATA.tables)
      ) {
        const tableManager = new TableManager();
        const fieldManager = (await import("@/lib/database/managers/field"))
          .default;
        const fieldMgr = new fieldManager();

        // MIGRATION: Check if fields table exists, if not this is the first upgrade with the new field system
        const fieldsTableExists = await tableManager.loadTable("system", "field");
        if (!fieldsTableExists) {
          await new LogManager().info(
            "system",
            "Migrating table fields to separate field records..."
          );

          // Migrate existing table fields to field records
          const allTablesResult = await tableManager.readRecords({});
          for (const tableRecord of allTablesResult.records) {
            const tableData = tableRecord.data as any;
            if (tableData.fields && Array.isArray(tableData.fields)) {
              // Extract appId and tableName from record ID (format: "appId:tableName")
              const [appId, tableName] = tableRecord.id.split(":");

              // Create field records for each field
              for (const field of tableData.fields) {
                await fieldMgr.createField(appId, tableName, field);
              }

              await new LogManager().debug(
                "system",
                `Migrated ${tableData.fields.length} fields for table ${appId}:${tableName}`
              );
            }
          }

          await new LogManager().info(
            "system",
            "Field migration completed successfully"
          );
        }

        const allTables = await tableManager.listRecords();
        const existingTables = allTables.filter((t) => t.startsWith("system:"));
        const existingTableNames = new Set(
          existingTables.map((t: any) => t.data.tableName)
        );

        for (const table of SYSTEM_APP_METADATA.tables) {
          if (existingTableNames.has(table.name)) {
            // Delete old table and its fields
            await fieldMgr.deleteTableFields("system", table.name);
            await tableManager.deleteTable("system", table.name);
          }

          // Create table record
          await tableManager.createTable("system", table.name, {
            tableName: table.name,
            app: "system",
            description: table.description || "",
          });

          // Create field records
          if (table.fields && Array.isArray(table.fields)) {
            for (const field of table.fields) {
              await fieldMgr.createField("system", table.name, field as any);
            }
          }

          existingTableNames.delete(table.name);
        }

        for (const tableName of existingTableNames) {
          await tableManager.deleteTable("system", tableName);
        }
      }

      // Reinitialize authorities
      // Delete all existing system authorizations
      const authorizationsResult = await authorizationManager.readRecords();
      for (const auth of authorizationsResult.records) {
        if (auth.data.app === "system") {
          await authorizationManager.deleteRecord(auth.id);
        }
      }

      // Delete all existing system authorities
      const authoritiesResult = await authorityManager.readRecords();
      for (const authority of authoritiesResult.records) {
        if (
          (authority.data.apps && authority.data.apps.includes("system")) ||
          authority.data.app === "system"
        ) {
          await authorityManager.deleteRecord(authority.id);
        }
      }

      // Create system authorizations
      for (const auth of SYSTEM_APP_METADATA.authorizations) {
        await authorizationManager.createRecord(
          await authorizationManager.getTable(),
          {
            app: "system",
            name: auth.name,
            description: auth.description,
          },
          { id: `system:${auth.id}` }
        );
      }

      // Create system authorities
      for (const auth of SYSTEM_APP_METADATA.authorities) {
        await authorityManager.createRecord(
          await authorityManager.getTable(),
          {
            name: auth.name,
            authorizations: auth.authorizations,
            apps: ["system"],
            contextual: auth.contextual || false,
            app: auth.contextual ? "system" : undefined,
          },
          { id: auth.id }
        );
      }

      await new LogManager().info(
        "system",
        `System upgraded: ${formatVersion(
          existingApp.data.version
        )} → ${formatVersion(SYSTEM_APP_METADATA.version)}`
      );

      return NextResponse.json({
        success: true,
        appId: "system",
        name: "System",
        oldVersion: formatVersion(existingApp.data.version),
        newVersion: formatVersion(SYSTEM_APP_METADATA.version),
      });
    }

    // Normal app upgrade requires a file
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check if file is a zip
    if (!file.name.endsWith(".zip")) {
      return NextResponse.json(
        { error: "Invalid file format. Please upload a .zip package" },
        { status: 400 }
      );
    }

    // Check if app exists
    const existingApp = await appManager.readRecord(appId);
    if (!existingApp) {
      await new LogManager().error(
        "system",
        `App upgrade rejected: App '${appId}' does not exist`
      );
      return NextResponse.json(
        { error: "App does not exist" },
        { status: 404 }
      );
    }

    // Read file as buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Extract zip contents
    let zip: AdmZip;
    let appAttributes: any;
    let uiBundle: string;
    let iconData: Buffer | null = null;
    let apiHandlers: Map<string, Buffer> = new Map();
    let assets: Map<string, Buffer> = new Map();
    let tables: Map<string, Buffer> = new Map();

    try {
      zip = new AdmZip(fileBuffer);
      const zipEntries = zip.getEntries();

      // Extract app.json
      const appJsonEntry = zipEntries.find((e) => e.entryName === "app.json");
      if (!appJsonEntry) {
        return NextResponse.json(
          { error: "Invalid app package: missing app.json" },
          { status: 400 }
        );
      }

      appAttributes = JSON.parse(appJsonEntry.getData().toString("utf8"));

      // Verify app ID matches
      if (appAttributes.id !== appId) {
        await new LogManager().error(
          "system",
          `App upgrade rejected: App ID mismatch (expected '${appId}', got '${appAttributes.id}')`
        );
        return NextResponse.json(
          {
            error: `App ID mismatch. Expected '${appId}', got '${appAttributes.id}'`,
          },
          { status: 400 }
        );
      }

      // Extract UI bundle
      const bundleEntry = zipEntries.find((e) => e.entryName === "app.js");
      if (!bundleEntry) {
        return NextResponse.json(
          { error: "Invalid app package: missing UI bundle" },
          { status: 400 }
        );
      }

      uiBundle = bundleEntry.getData().toString("utf8");

      // Extract icon if present
      const iconEntry = zipEntries.find(
        (e) => e.entryName === "app.png" || e.entryName === "app.jpg"
      );
      if (iconEntry) {
        iconData = iconEntry.getData();
      }

      // Extract API handlers
      const apiEntries = zipEntries.filter(
        (e) => e.entryName.startsWith("api/") && e.entryName.endsWith(".js")
      );
      for (const entry of apiEntries) {
        const handlerName = path.basename(entry.entryName, ".js");
        apiHandlers.set(handlerName, entry.getData());
      }

      // Extract assets
      const assetsEntries = zipEntries.filter(
        (e) => e.entryName.startsWith("assets/") && !e.isDirectory
      );
      for (const entry of assetsEntries) {
        assets.set(entry.entryName, entry.getData());
      }

      // Extract tables directory (formula and validator scripts)
      const tablesEntries = zipEntries.filter(
        (e) => e.entryName.startsWith("tables/") && !e.isDirectory
      );
      for (const entry of tablesEntries) {
        tables.set(entry.entryName, entry.getData());
      }
    } catch (error) {
      console.error("Error extracting zip:", error);
      return NextResponse.json({ error: "Invalid zip file" }, { status: 400 });
    }

    // Validate required attributes
    if (
      !appAttributes.id ||
      !appAttributes.name ||
      !appAttributes.version ||
      !appAttributes.author ||
      !appAttributes.description
    ) {
      const errorMsg = `App upgrade rejected: Missing required app attributes (id: ${
        appAttributes.id || "missing"
      }, name: ${appAttributes.name || "missing"}, version: ${
        appAttributes.version || "missing"
      }, author: ${appAttributes.author || "missing"}, description: ${
        appAttributes.description ? "present" : "missing"
      })`;
      await new LogManager().error("system", errorMsg);
      return NextResponse.json(
        { error: "Missing required app attributes" },
        { status: 400 }
      );
    }

    // Validate version format
    if (
      (!appAttributes.version.major && appAttributes.version.major !== 0) ||
      (!appAttributes.version.minor && appAttributes.version.minor !== 0) ||
      (!appAttributes.version.dev && appAttributes.version.dev !== 0)
    ) {
      const errorMsg = `App upgrade rejected: Invalid version format for '${appAttributes.id}'. Version must have major, minor, and dev properties.`;
      await new LogManager().error("system", errorMsg);
      return NextResponse.json(
        {
          error:
            "Invalid version format. Version must have major, minor, and dev properties.",
        },
        { status: 400 }
      );
    }

    // Check if upgrading to the same version
    const newV = appAttributes.version;
    const oldV = existingApp.data.version;
    const versionComparison =
      newV.major - oldV.major || newV.minor - oldV.minor || newV.dev - oldV.dev;

    if (versionComparison === 0) {
      const versionStr = formatVersion(appAttributes.version);
      const errorMsg = `App upgrade rejected: Cannot upgrade '${appAttributes.id}' to the same version ${versionStr}`;
      await new LogManager().error("system", errorMsg);
      return NextResponse.json(
        { error: `Cannot upgrade to the same version ${versionStr}` },
        { status: 400 }
      );
    }

    // Validate dependencies - check for self-dependency
    if (
      appAttributes.dependencies &&
      appAttributes.dependencies[appAttributes.id]
    ) {
      const errorMsg = `App upgrade rejected: Plugin '${appAttributes.id}' cannot depend on itself`;
      await new LogManager().error("system", errorMsg);
      return NextResponse.json(
        { error: "A plugin cannot require itself for installation" },
        { status: 400 }
      );
    }

    // Validate dependencies - check that all required dependencies are installed
    if (
      appAttributes.dependencies &&
      Object.keys(appAttributes.dependencies).length > 0
    ) {
      const allAppsResult = await appManager.readRecords();
      const installedApps = new Map(
        allAppsResult.records.map((app) => [app.id, app])
      );

      for (const [depId, requiredVersion] of Object.entries(
        appAttributes.dependencies
      )) {
        const installedApp = installedApps.get(depId);

        if (!installedApp) {
          const errorMsg = `App upgrade rejected: Required dependency '${depId}' is not installed`;
          await new LogManager().error("system", errorMsg);
          return NextResponse.json(
            { error: `Required dependency '${depId}' is not installed` },
            { status: 400 }
          );
        }

        if (
          !isVersionGreaterOrEqual(
            installedApp.data.version,
            requiredVersion as AppVersion
          )
        ) {
          const installedVersionStr = formatVersion(installedApp.data.version);
          const requiredVersionStr = formatVersion(
            requiredVersion as AppVersion
          );
          const errorMsg = `App upgrade rejected: Dependency '${depId}' version ${installedVersionStr} does not meet minimum requirement ${requiredVersionStr}`;
          await new LogManager().error("system", errorMsg);
          return NextResponse.json(
            {
              error: `Dependency '${depId}' version ${installedVersionStr} does not meet minimum requirement ${requiredVersionStr}`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Validate widgets if present
    if (appAttributes.widgets && Array.isArray(appAttributes.widgets)) {
      let hasSystemWidget = false;

      for (let i = 0; i < appAttributes.widgets.length; i++) {
        const widget = appAttributes.widgets[i];

        // Check that widget has an id
        if (!widget.id) {
          return NextResponse.json(
            { error: `Widget at index ${i} is missing required 'id' field` },
            { status: 400 }
          );
        }

        // Check that widget has required fields
        if (
          !widget.name ||
          !widget.description ||
          !widget.target ||
          !widget.component
        ) {
          return NextResponse.json(
            {
              error: `Widget '${widget.id}' is missing required fields (name, description, target, or component)`,
            },
            { status: 400 }
          );
        }

        // Validate target
        if (
          !["home", "user-settings", "system-settings"].includes(widget.target)
        ) {
          return NextResponse.json(
            {
              error: `Widget '${widget.id}' has invalid target. Must be 'home', 'user-settings', or 'system-settings'`,
            },
            { status: 400 }
          );
        }

        // Validate singular system settings widget
        if (widget.target === "system-settings") {
          if (!hasSystemWidget) {
            hasSystemWidget = true;
          } else {
            return NextResponse.json(
              {
                error: `An application cannot have more than one system widget.`,
              },
              { status: 400 }
            );
          }
        }

        // Check that appId matches if provided
        if (widget.appId && widget.appId !== appAttributes.id) {
          return NextResponse.json(
            {
              error: `Widget '${widget.id}' has mismatched appId. Expected '${appAttributes.id}', got '${widget.appId}'`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Validate applets if present
    if (appAttributes.applets && Array.isArray(appAttributes.applets)) {
      const zipEntries = zip.getEntries();
      const appletIds = new Set<string>();

      for (let i = 0; i < appAttributes.applets.length; i++) {
        const applet = appAttributes.applets[i];

        // Validate required applet fields
        if (
          !applet.id ||
          !applet.label ||
          !applet.description ||
          !applet.component ||
          !applet.target
        ) {
          return NextResponse.json(
            {
              error: `Applet at index ${i} is missing required fields (id, label, description, component, or target)`,
            },
            { status: 400 }
          );
        }

        // Check for duplicate applet IDs
        if (appletIds.has(applet.id)) {
          return NextResponse.json(
            { error: `Duplicate applet ID found: ${applet.id}` },
            { status: 400 }
          );
        }
        appletIds.add(applet.id);

        // Validate target
        if (
          !["app", "home", "user-settings", "system-settings"].includes(
            applet.target
          )
        ) {
          return NextResponse.json(
            {
              error: `Applet '${applet.id}' has invalid target. Must be 'app', 'home', 'user-settings', or 'system-settings'`,
            },
            { status: 400 }
          );
        }

        // Validate component file exists
        const componentPaths = [
          `apps/${applet.component}.tsx`,
          `apps/${applet.component}.ts`,
          `apps/${applet.component}.jsx`,
          `apps/${applet.component}.js`,
          `widgets/${applet.component}.tsx`,
          `widgets/${applet.component}.ts`,
          `widgets/${applet.component}.jsx`,
          `widgets/${applet.component}.js`,
        ];

        const componentExists = componentPaths.some((p) =>
          zipEntries.some((e) => e.entryName === p)
        );

        if (!componentExists) {
          return NextResponse.json(
            {
              error: `Applet '${
                applet.id
              }' component not found. Expected one of: ${componentPaths.join(
                ", "
              )}`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Get system storage path
    const settingManager = new SettingManager();
    const storageRecord = await settingManager.readRecord("storage");
    const storagePath = storageRecord?.data.value;
    if (!storagePath) {
      return NextResponse.json(
        { error: "System storage not configured" },
        { status: 500 }
      );
    }

    // Get app directory in system storage
    const appDir = path.join(storagePath, "apps", appAttributes.id);

    // Backup old version (rename api and tables directories)
    const apiDir = path.join(appDir, "api");
    const tablesDir = path.join(appDir, "tables");
    const backupApiDir = path.join(appDir, `api.backup.${Date.now()}`);
    const backupTablesDir = path.join(appDir, `tables.backup.${Date.now()}`);

    try {
      await fs.rename(apiDir, backupApiDir);
    } catch (error) {
      // If api directory doesn't exist, that's okay
      console.log("No existing api directory to backup");
    }

    try {
      await fs.rename(tablesDir, backupTablesDir);
    } catch (error) {
      // If tables directory doesn't exist, that's okay
      console.log("No existing tables directory to backup");
    }

    // Create new api and tables directories
    await fs.mkdir(apiDir, { recursive: true });
    await fs.mkdir(tablesDir, { recursive: true });

    try {
      // Save the UI bundle (in root of app directory)
      const bundlePath = path.join(appDir, `app.js`);
      await fs.writeFile(bundlePath, uiBundle, "utf-8");

      // Save API handlers
      for (const [handlerName, handlerData] of apiHandlers) {
        const handlerPath = path.join(apiDir, `${handlerName}.js`);
        await fs.writeFile(handlerPath, handlerData);
      }

      // Save assets
      for (const [assetName, asset] of assets) {
        const assetPath = path.join(appDir, assetName);
        await fs.mkdir(path.dirname(assetPath), { recursive: true });
        await fs.writeFile(assetPath, asset);
      }

      // Save tables directory (formula and validator scripts)
      for (const [tablePath, tableFile] of tables) {
        const tableFilePath = path.join(appDir, tablePath);
        await fs.mkdir(path.dirname(tableFilePath), { recursive: true });
        await fs.writeFile(tableFilePath, tableFile);
      }

      // Save icon if provided
      if (iconData) {
        const iconPath = path.join(appDir, "app.png");
        await fs.writeFile(iconPath, iconData);
      }

      // Update app in database
      await appManager.updateRecord(
        await appManager.getTable(),
        appAttributes.id,
        {
          label: appAttributes.name,
          version: appAttributes.version,
          author: appAttributes.author,
          contactEmail: appAttributes.contactEmail || "",
          description: appAttributes.description,
          dependencies: appAttributes.dependencies || {},
        }
      );

      // Update API routes
      const apiRouteManager = new ApiRouteManager();
      const allApiRoutes = await apiRouteManager.readRecords();
      const existingApiRoutes = allApiRoutes.records.filter(
        (route) => route.data.app === appAttributes.id
      );
      const existingApiRouteKeys = new Set(
        existingApiRoutes.map((r) => `${r.data.path}:${r.data.method}`)
      );

      // Create or update API routes
      if (appAttributes.apiRoutes && Array.isArray(appAttributes.apiRoutes)) {
        const apiRouteTable = await apiRouteManager.getTable();

        for (const apiRoute of appAttributes.apiRoutes) {
          const routeKey = `${apiRoute.path}:${apiRoute.method}`;

          if (existingApiRouteKeys.has(routeKey)) {
            // Delete existing route (we'll recreate it)
            await apiRouteManager.deleteRecord(
              `${appAttributes.id}:${apiRoute.path}:${apiRoute.method}`
            );
          }

          // Create/recreate API route
          await apiRouteManager.createRecord(
            apiRouteTable,
            {
              app: appAttributes.id,
              path: apiRoute.path,
              method: apiRoute.method,
              handler: apiRoute.handler,
              description: apiRoute.description || "",
            },
            { id: `${appAttributes.id}:${apiRoute.path}:${apiRoute.method}` }
          );

          existingApiRouteKeys.delete(routeKey);
        }
      }

      // Delete API routes that no longer exist in the app definition
      for (const route of existingApiRoutes) {
        const routeKey = `${route.data.path}:${route.data.method}`;
        if (existingApiRouteKeys.has(routeKey)) {
          await apiRouteManager.deleteRecord(route.id);
        }
      }

      // Update applets
      const appletManager = new AppletManager();
      const allApplets = await appletManager.readRecords();
      const existingApplets = allApplets.records.filter(
        (applet) => applet.data.app === appAttributes.id
      );
      const existingAppletIds = new Set(
        existingApplets.map((a) => a.id.split(":").pop() || "")
      );

      // Create or update applets
      if (appAttributes.applets && Array.isArray(appAttributes.applets)) {
        const appletTable = await appletManager.getTable();

        for (const applet of appAttributes.applets) {
          if (existingAppletIds.has(applet.id)) {
            // Delete existing applet (we'll recreate it)
            await appletManager.deleteRecord(
              `${appAttributes.id}:${applet.id}`
            );
          }

          // Create/recreate applet
          await appletManager.createRecord(
            appletTable,
            {
              label: applet.label,
              description: applet.description || "",
              component: applet.component,
              app: appAttributes.id,
              target: applet.target,
            },
            { id: `${appAttributes.id}:${applet.id}` }
          );

          existingAppletIds.delete(applet.id);
        }
      }

      // Delete applets that no longer exist in the app definition
      for (const applet of existingApplets) {
        const appletId = applet.id.split(":").pop() || "";
        if (existingAppletIds.has(appletId)) {
          await appletManager.deleteRecord(applet.id);
        }
      }

      // Update table records
      if (appAttributes.tables && Array.isArray(appAttributes.tables)) {
        const tableDefinition = await new TableManager().loadTable(
          "system",
          "table"
        );
        if (!tableDefinition) {
          throw new Error("System table definition not found");
        }

        // Get existing table records for this app
        const tableManager = new TableManager();
        const allTables = await tableManager.listRecords();
        const existingTables = allTables.filter((t: any) =>
          t && typeof t === "string"
            ? t.startsWith(`${appAttributes.id}:`)
            : t?.id?.startsWith(`${appAttributes.id}:`)
        );
        const existingTableNames = new Set(
          existingTables.map((t: any) =>
            typeof t === "string" ? t.split(":")[1] : t.data.tableName
          )
        );

        // Create or update tables
        const FieldManager = (await import("@/lib/database/managers/field"))
          .default;
        const fieldManager = new FieldManager();

        for (const table of appAttributes.tables) {
          if (existingTableNames.has(table.name)) {
            // Update existing table - delete old table and fields
            await fieldManager.deleteTableFields(appAttributes.id, table.name);
            await tableManager.deleteTable(appAttributes.id, table.name);
          }

          // Create table record
          await tableManager.createTable(appAttributes.id, table.name, {
            tableName: table.name,
            app: appAttributes.id,
            description: table.description || "",
          });

          // Create field records
          if (table.fields && Array.isArray(table.fields)) {
            for (const field of table.fields) {
              await fieldManager.createField(appAttributes.id, table.name, field);
            }
          }

          existingTableNames.delete(table.name);
        }

        // Delete tables that no longer exist in the app definition
        for (const tableName of existingTableNames) {
          await new TableManager().deleteTable(appAttributes.id, tableName);
        }
      }

      // Handle system app upgrade
      if (isSystemApp) {
        await new LogManager().info(
          "system",
          `Performing system app upgrade tasks (${formatVersion(
            existingApp.data.version
          )} → ${formatVersion(appAttributes.version)})`
        );

        // Reinitialize authorities from SYSTEM_APP_METADATA
        // Delete all existing system authorizations
        const authorizationsResult2 = await authorizationManager.readRecords();
        for (const auth of authorizationsResult2.records) {
          if (auth.data.app === "system") {
            await authorizationManager.deleteRecord(auth.id);
          }
        }

        // Delete all existing system authorities
        const authoritiesResult2 = await authorityManager.readRecords();
        for (const authority of authoritiesResult2.records) {
          if (
            (authority.data.apps && authority.data.apps.includes("system")) ||
            authority.data.app === "system"
          ) {
            await authorityManager.deleteRecord(authority.id);
          }
        }

        // Create system authorizations
        for (const auth of SYSTEM_APP_METADATA.authorizations) {
          await authorizationManager.createRecord(
            await authorizationManager.getTable(),
            {
              app: "system",
              name: auth.name,
              description: auth.description,
            },
            { id: `system:${auth.id}` }
          );
        }

        // Create system authorities
        for (const auth of SYSTEM_APP_METADATA.authorities) {
          await authorityManager.createRecord(
            await authorityManager.getTable(),
            {
              name: auth.name,
              authorizations: auth.authorizations.map((a) => `system:${a}`),
              apps: ["system"],
              contextual: auth.contextual || false,
              app: auth.contextual ? "system" : undefined,
            },
            { id: auth.id }
          );
        }

        await new LogManager().info(
          "system",
          "System authorities reinitialized"
        );
      }

      // Delete backups after successful upgrade
      try {
        await fs.rm(backupApiDir, { recursive: true, force: true });
      } catch (error) {
        console.log("No API backup to clean up");
      }

      try {
        await fs.rm(backupTablesDir, { recursive: true, force: true });
      } catch (error) {
        console.log("No tables backup to clean up");
      }

      // Call OnInstallation hook if it exists (with prior version for upgrade)
      try {
        const installationHookPath = path.join(appDir, "system", "install.js");
        const installationHookExists = await fs
          .access(installationHookPath)
          .then(() => true)
          .catch(() => false);

        if (installationHookExists) {
          await new LogManager().info(
            "system",
            `Running OnInstallation hook for ${
              appAttributes.name
            } (${formatVersion(existingApp.data.version)} → ${formatVersion(
              appAttributes.version
            )})`
          );

          const require = createRequire(import.meta.url || __filename);
          const absolutePath = path.resolve(installationHookPath);

          // Clear cache to ensure fresh load
          delete require.cache[absolutePath];
          const installationHook = require(absolutePath);

          if (
            installationHook.OnInstallation &&
            typeof installationHook.OnInstallation === "function"
          ) {
            const context = {
              priorVersion: formatVersion(existingApp.data.version),
              currentVersion: formatVersion(appAttributes.version),
              appId: appAttributes.id,
            };

            await installationHook.OnInstallation(context);
          }
        }
      } catch (error: any) {
        const errorMsg = `App installation hook failed for ${appAttributes.name}: ${error.message}`;
        await new LogManager().error("system", errorMsg);

        // Rollback - restore the backups
        try {
          await fs.rm(apiDir, { recursive: true, force: true });
          await fs.rename(backupApiDir, apiDir);

          await fs.rm(tablesDir, { recursive: true, force: true });
          await fs.rename(backupTablesDir, tablesDir);
          // Note: We don't have backups of bundle/icon yet, but the API and tables rollback is critical
        } catch (rollbackError) {
          console.error(
            "Failed to rollback after installation hook failure:",
            rollbackError
          );
        }

        return NextResponse.json(
          { error: `Installation hook failed: ${error.message}` },
          { status: 500 }
        );
      }

      // Log app upgrade
      await new LogManager().info(
        "system",
        `Application upgraded: ${appAttributes.name} (${formatVersion(
          existingApp.data.version
        )} → ${formatVersion(appAttributes.version)})`
      );

      return NextResponse.json({
        success: true,
        appId: appAttributes.id,
        name: appAttributes.name,
        oldVersion: formatVersion(existingApp.data.version),
        newVersion: formatVersion(appAttributes.version),
      });
    } catch (error) {
      // Restore backups on error
      try {
        await fs.rm(apiDir, { recursive: true, force: true });
        await fs.rename(backupApiDir, apiDir);
      } catch (restoreError) {
        console.error("Failed to restore API backup:", restoreError);
      }

      try {
        await fs.rm(tablesDir, { recursive: true, force: true });
        await fs.rename(backupTablesDir, tablesDir);
      } catch (restoreError) {
        console.error("Failed to restore tables backup:", restoreError);
      }

      throw error;
    }
  } catch (error) {
    console.error("Error upgrading app:", error);

    // Log upgrade failure
    try {
      await new LogManager().error(
        "system",
        `App upgrade failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } catch (logError) {
      console.error("Failed to log upgrade error:", logError);
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
