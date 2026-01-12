import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sdk";
import {
  userHasAuthorization,
  getApp,
  getAllApps,
  initializeAuthorities,
  getSystemSetting,
  formatVersion,
  isVersionGreaterOrEqual,
  updateApp,
  compareVersions,
  type AppVersion,
} from "@/lib/database/helpers";
import { loadTable, createTable, deleteTable } from "@/lib/db/tables";
import TableManager from "@/lib/database/managers/table";
import { logger } from "@/lib/logging";
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
    const hasAdmin = await userHasAuthorization(session.userId, "admin");
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
    if (isSystemApp && !file) {
      // Upgrade system app using metadata
      const existingApp = await getApp("system");
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
          existingApp.data.version.minor === SYSTEM_APP_METADATA.version.minor &&
          existingApp.data.version.dev < SYSTEM_APP_METADATA.version.dev);

      if (!needsUpgrade) {
        return NextResponse.json(
          { error: "System is already up to date" },
          { status: 400 }
        );
      }

      // Update system app with new metadata
      await updateApp("system", {
        label: SYSTEM_APP_METADATA.name,
        version: SYSTEM_APP_METADATA.version,
        author: SYSTEM_APP_METADATA.author,
        contactEmail: SYSTEM_APP_METADATA.contactEmail,
        description: SYSTEM_APP_METADATA.description,
        apiRoutes: SYSTEM_APP_METADATA.apiRoutes,
        dependencies: SYSTEM_APP_METADATA.dependencies,
        subApps: SYSTEM_APP_METADATA.subApps,
      });

      // Update table records
      if (
        SYSTEM_APP_METADATA.tables &&
        Array.isArray(SYSTEM_APP_METADATA.tables)
      ) {
        const tableDefinition = await loadTable("system", "table");
        if (!tableDefinition) {
          throw new Error("System table definition not found");
        }

        const tableManager = new TableManager();
        const allTables = await tableManager.listRecords();
        const existingTables = allTables.filter((t: any) => t.id.startsWith("system:"));
        const existingTableNames = new Set(
          existingTables.map((t: any) => t.data.tableName)
        );

        for (const table of SYSTEM_APP_METADATA.tables) {
          if (existingTableNames.has(table.name)) {
            await deleteTable("system", table.name);
          }

          await createTable(
            "system",
            table.name,
            {
              tableName: table.name,
              app: "system",
              description: table.description || "",
              fields: (table.fields || []) as any,
            }
          );

          existingTableNames.delete(table.name);
        }

        for (const tableName of existingTableNames) {
          await deleteTable("system", tableName);
        }
      }

      // Reinitialize authorities
      await initializeAuthorities();

      await logger
        .info(
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
    const existingApp = await getApp(appId);
    if (!existingApp) {
      await logger
        .error("system", `App upgrade rejected: App '${appId}' does not exist`);
      return NextResponse.json(
        { error: "App does not exist" },
        { status: 404 }
      );
    }

    const oldVersion = existingApp.data.version;

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
        await logger
          .error(
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
      await logger.error("system", errorMsg);
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
      await logger.error("system", errorMsg);
      return NextResponse.json(
        {
          error:
            "Invalid version format. Version must have major, minor, and dev properties.",
        },
        { status: 400 }
      );
    }

    // Check if upgrading to the same version
    if (compareVersions(appAttributes.version, existingApp.data.version) === 0) {
      const versionStr = formatVersion(appAttributes.version);
      const errorMsg = `App upgrade rejected: Cannot upgrade '${appAttributes.id}' to the same version ${versionStr}`;
      await logger.error("system", errorMsg);
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
      await logger.error("system", errorMsg);
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
      const allApps = await getAllApps();
      const installedApps = new Map(allApps.map((app) => [app.id, app]));

      for (const [depId, requiredVersion] of Object.entries(
        appAttributes.dependencies
      )) {
        const installedApp = installedApps.get(depId);

        if (!installedApp) {
          const errorMsg = `App upgrade rejected: Required dependency '${depId}' is not installed`;
          await logger.error("system", errorMsg);
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
          await logger.error("system", errorMsg);
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

    // Validate sub-apps if present (new format) - same validation as install
    if (appAttributes.subApps && Array.isArray(appAttributes.subApps)) {
      const zipEntries = zip.getEntries();

      if (appAttributes.subApps.length === 0) {
        return NextResponse.json(
          {
            error:
              "subApps array cannot be empty. At least one sub-app is required.",
          },
          { status: 400 }
        );
      }

      const hasAppsDir = zipEntries.some((e) =>
        e.entryName.startsWith("apps/")
      );
      if (!hasAppsDir) {
        return NextResponse.json(
          {
            error:
              "Package must contain 'apps/' directory for sub-app components",
          },
          { status: 400 }
        );
      }

      const subAppIds = new Set<string>();

      for (let i = 0; i < appAttributes.subApps.length; i++) {
        const subApp = appAttributes.subApps[i];

        if (
          !subApp.id ||
          !subApp.label ||
          !subApp.description ||
          !subApp.component
        ) {
          return NextResponse.json(
            {
              error: `Sub-app at index ${i} is missing required fields (id, label, description, or component)`,
            },
            { status: 400 }
          );
        }

        if (subAppIds.has(subApp.id)) {
          return NextResponse.json(
            { error: `Duplicate sub-app ID found: ${subApp.id}` },
            { status: 400 }
          );
        }
        subAppIds.add(subApp.id);

        const componentPaths = [
          `apps/${subApp.component}.tsx`,
          `apps/${subApp.component}.ts`,
          `apps/${subApp.component}.jsx`,
          `apps/${subApp.component}.js`,
        ];

        const componentExists = componentPaths.some((p) =>
          zipEntries.some((e) => e.entryName === p)
        );

        if (!componentExists) {
          return NextResponse.json(
            {
              error: `Sub-app '${
                subApp.id
              }' component not found. Expected one of: ${componentPaths.join(
                ", "
              )}`,
            },
            { status: 400 }
          );
        }

        if (subApp.widgets && Array.isArray(subApp.widgets)) {
          const hasWidgets = subApp.widgets.length > 0;

          if (hasWidgets) {
            const hasWidgetsDir = zipEntries.some((e) =>
              e.entryName.startsWith("widgets/")
            );
            if (!hasWidgetsDir) {
              return NextResponse.json(
                {
                  error:
                    "Package must contain 'widgets/' directory when widgets are defined",
                },
                { status: 400 }
              );
            }
          }

          let hasSystemWidget = false;

          for (let j = 0; j < subApp.widgets.length; j++) {
            const widget = subApp.widgets[j];

            if (
              !widget.id ||
              !widget.name ||
              !widget.description ||
              !widget.target ||
              !widget.component
            ) {
              return NextResponse.json(
                {
                  error: `Widget at index ${j} in sub-app '${subApp.id}' is missing required fields`,
                },
                { status: 400 }
              );
            }

            if (
              !["home", "user-settings", "system-settings"].includes(
                widget.target
              )
            ) {
              return NextResponse.json(
                {
                  error: `Widget '${widget.id}' has invalid target. Must be 'home', 'user-settings', or 'system-settings'`,
                },
                { status: 400 }
              );
            }

            if (widget.target === "system-settings") {
              if (!hasSystemWidget) {
                hasSystemWidget = true;
              } else {
                return NextResponse.json(
                  {
                    error: `Sub-app '${subApp.id}' cannot have more than one system widget`,
                  },
                  { status: 400 }
                );
              }
            }

            if (!widget.appId) {
              return NextResponse.json(
                {
                  error: `Widget '${widget.id}' is missing appId field`,
                },
                { status: 400 }
              );
            }

            if (!widget.appId.includes(":")) {
              return NextResponse.json(
                {
                  error: `Widget '${widget.id}' appId must be in format "mainAppId:subAppId"`,
                },
                { status: 400 }
              );
            }

            const [mainId, subId] = widget.appId.split(":");
            if (mainId !== appAttributes.id || subId !== subApp.id) {
              return NextResponse.json(
                {
                  error: `Widget '${widget.id}' has incorrect appId. Expected '${appAttributes.id}:${subApp.id}', got '${widget.appId}'`,
                },
                { status: 400 }
              );
            }

            const widgetPaths = [
              `widgets/${widget.component}.tsx`,
              `widgets/${widget.component}.ts`,
              `widgets/${widget.component}.jsx`,
              `widgets/${widget.component}.js`,
            ];

            const widgetExists = widgetPaths.some((p) =>
              zipEntries.some((e) => e.entryName === p)
            );

            if (!widgetExists) {
              return NextResponse.json(
                {
                  error: `Widget '${
                    widget.id
                  }' component not found. Expected one of: ${widgetPaths.join(
                    ", "
                  )}`,
                },
                { status: 400 }
              );
            }
          }

          const widgetIds = subApp.widgets.map((w: any) => w.id);
          const duplicates = widgetIds.filter(
            (id: string, index: number) => widgetIds.indexOf(id) !== index
          );
          if (duplicates.length > 0) {
            return NextResponse.json(
              {
                error: `Duplicate widget IDs in sub-app '${
                  subApp.id
                }': ${duplicates.join(", ")}`,
              },
              { status: 400 }
            );
          }
        }
      }
    } else if (!appAttributes.widgets) {
      // Legacy format auto-conversion
      appAttributes.subApps = [
        {
          id: "main",
          label: appAttributes.name,
          description: appAttributes.description,
          component: "App",
          widgets: [],
        },
      ];
    } else {
      // Legacy format with widgets - convert to subApps
      appAttributes.subApps = [
        {
          id: "main",
          label: appAttributes.name,
          description: appAttributes.description,
          component: "App",
          widgets: appAttributes.widgets.map((w: any) => ({
            ...w,
            appId: `${appAttributes.id}:main`,
          })),
        },
      ];
    }

    // Get system storage path
    const storagePath = await getSystemSetting("storage");
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

      // Process widgets - ensure appId is set correctly
      const processedWidgets = (appAttributes.widgets || []).map(
        (widget: any) => ({
          id: widget.id,
          name: widget.name,
          description: widget.description,
          target: widget.target,
          component: widget.component,
          appId: appAttributes.id,
        })
      );

      // Update app in database
      await updateApp(appAttributes.id, {
        label: appAttributes.name,
        version: appAttributes.version,
        author: appAttributes.author,
        contactEmail: appAttributes.contactEmail || "",
        description: appAttributes.description,
        apiRoutes: appAttributes.apiRoutes || [],
        dependencies: appAttributes.dependencies || {},
        subApps: appAttributes.subApps || [],
      });

      // Update table records
      if (appAttributes.tables && Array.isArray(appAttributes.tables)) {
        const tableDefinition = await loadTable("system", "table");
        if (!tableDefinition) {
          throw new Error("System table definition not found");
        }

        // Get existing table records for this app
        const tableManager = new TableManager();
        const allTables = await tableManager.listRecords();
        const existingTables = allTables.filter((t: any) => t.id.startsWith(`${appAttributes.id}:`));
        const existingTableNames = new Set(
          existingTables.map((t: any) => t.data.tableName)
        );

        // Create or update tables
        for (const table of appAttributes.tables) {
          if (existingTableNames.has(table.name)) {
            // Update existing table
            await deleteTable(appAttributes.id, table.name);
          }

          // Create/recreate table record
          await createTable(
            appAttributes.id,
            table.name,
            {
              tableName: table.name,
              app: appAttributes.id,
              description: table.description || "",
              fields: table.fields || [],
            }
          );

          existingTableNames.delete(table.name);
        }

        // Delete tables that no longer exist in the app definition
        for (const tableName of existingTableNames) {
          await deleteTable(appAttributes.id, tableName);
        }
      }

      // Handle system app upgrade
      if (isSystemApp) {
        await logger
          .info(
            "system",
            `Performing system app upgrade tasks (${formatVersion(
              existingApp.data.version
            )} → ${formatVersion(appAttributes.version)})`
          );

        // Reinitialize authorities from SYSTEM_APP_METADATA
        await initializeAuthorities();

        await logger
          .info("system", "System authorities reinitialized");
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
          await logger
            .info(
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
        await logger.error("system", errorMsg);

        // Rollback - restore the backups
        try {
          await fs.rm(apiDir, { recursive: true, force: true });
          await fs.rename(backupApiDir, apiDir);

          await fs.rm(tablesDir, { recursive: true, force: true });
          await fs.rename(backupTablesDir, tablesDir);
          // Also restore the old bundle and icon
          const oldBundlePath = path.join(
            appDir,
            `app.js.backup.${Date.now()}`
          );
          const bundlePath = path.join(appDir, `app.js`);
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
      await logger
        .info(
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
      await logger
        .error(
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
