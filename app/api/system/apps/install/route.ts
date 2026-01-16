import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/sdk";
import { userHasAuthorization } from "@/lib/database/managers/user";
import {
  formatVersion,
  isVersionGreaterOrEqual,
} from "@/lib/database/managers/app";
import AppManager from "@/lib/database/managers/app";
import AuthorizationManager from "@/lib/database/managers/authorization";
import AuthorityManager from "@/lib/database/managers/authority";
import SettingManager from "@/lib/database/managers/setting";
import TableManager from "@/lib/database/managers/table";
import ApiRouteManager from "@/lib/database/managers/apiRoute";
import LogManager from "@/lib/database/managers/log";
import type AppVersion from "@/lib/database/types/appVersion";
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
    const file = formData.get("file") as File;

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

      // Extract UI bundle (app.js or {appId}.js)
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
      const errorMsg = `App installation rejected: Missing required app attributes (id: ${
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
      const errorMsg = `App installation rejected: Invalid version format for '${appAttributes.id}'. Version must have major, minor, and dev properties.`;
      await new LogManager().error("system", errorMsg);
      return NextResponse.json(
        {
          error:
            "Invalid version format. Version must have major, minor, and dev properties.",
        },
        { status: 400 }
      );
    }

    // Safety check: prevent 'system' from being used as an app ID
    if (appAttributes.id === "system") {
      const errorMsg = `App installation rejected: attempted to use reserved app ID 'system'`;
      await new LogManager().error("system", errorMsg);
      return NextResponse.json(
        {
          error:
            "Invalid app ID: 'system' is a reserved keyword and cannot be used as an app ID",
        },
        { status: 400 }
      );
    }

    // Validate dependencies - check for self-dependency
    if (
      appAttributes.dependencies &&
      appAttributes.dependencies[appAttributes.id]
    ) {
      const errorMsg = `App installation rejected: Plugin '${appAttributes.id}' cannot depend on itself`;
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
      const appManager = new AppManager();
      const allAppsResult = await appManager.readRecords();
      const installedApps = new Map(allAppsResult.records.map((app) => [app.id, app]));

      for (const [depId, requiredVersion] of Object.entries(
        appAttributes.dependencies
      )) {
        const installedApp = installedApps.get(depId);

        if (!installedApp) {
          const errorMsg = `App installation rejected: Required dependency '${depId}' is not installed`;
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
          const errorMsg = `App installation rejected: Dependency '${depId}' version ${installedVersionStr} does not meet minimum requirement ${requiredVersionStr}`;
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

      // Check for duplicate widget IDs
      const widgetIds = appAttributes.widgets.map((w: any) => w.id);
      const duplicates = widgetIds.filter(
        (id: string, index: number) => widgetIds.indexOf(id) !== index
      );
      if (duplicates.length > 0) {
        return NextResponse.json(
          { error: `Duplicate widget IDs found: ${duplicates.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Validate sub-apps if present (new format)
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

      // Check for apps/ directory
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

        // Validate required sub-app fields
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

        // Check for duplicate sub-app IDs
        if (subAppIds.has(subApp.id)) {
          return NextResponse.json(
            { error: `Duplicate sub-app ID found: ${subApp.id}` },
            { status: 400 }
          );
        }
        subAppIds.add(subApp.id);

        // Validate component file exists
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

        // Validate widgets for this sub-app
        if (subApp.widgets && Array.isArray(subApp.widgets)) {
          const hasWidgets = subApp.widgets.length > 0;

          // Check for widgets/ directory if widgets are defined
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

            // Check widget has required fields
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

            // Validate target
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

            // Validate singular system settings widget per sub-app
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

            // Validate widget.appId format
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

            // Validate widget component exists
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

          // Check for duplicate widget IDs within sub-app
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
      // If no subApps and no widgets, create a default sub-app
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

    // Check if app already exists
    const appManager = new AppManager();
    const existingApp = await appManager.readRecord(appAttributes.id);
    if (existingApp) {
      return NextResponse.json(
        { error: "App with this ID already exists" },
        { status: 409 }
      );
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
    await fs.mkdir(appDir, { recursive: true });

    // Create api directory
    const apiDir = path.join(appDir, "api");
    await fs.mkdir(apiDir, { recursive: true });

    // Create assets directory
    if (assets.size) {
      const assetsDir = path.join(appDir, "assets");
      await fs.mkdir(assetsDir, { recursive: true });
    }

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

    // Create app in database
    await appManager.createRecord(await appManager.getTable(), {
      label: appAttributes.name,
      version: appAttributes.version,
      author: appAttributes.author,
      contactEmail: appAttributes.contactEmail || "",
      description: appAttributes.description,
      dependencies: appAttributes.dependencies || {},
      subApps: appAttributes.subApps || [],
    }, {
      id: appAttributes.id,
    });

    // Install API routes
    if (appAttributes.apiRoutes && Array.isArray(appAttributes.apiRoutes)) {
      const apiRouteManager = new ApiRouteManager();
      const apiRouteTable = await apiRouteManager.getTable();

      for (const apiRoute of appAttributes.apiRoutes) {
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
      }
    }

    // Install authorizations
    if (
      appAttributes.authorizations &&
      Array.isArray(appAttributes.authorizations) &&
      appAttributes.authorizations.length > 0
    ) {
      const authorizationManager = new AuthorizationManager();
      const authTable = await authorizationManager.getTable();

      for (const auth of appAttributes.authorizations) {
        await authorizationManager.createRecord(
          authTable,
          {
            name: auth.name,
            description: auth.description || "",
            app: appAttributes.id,
            contextual: auth.contextual || false,
          },
          { id: `${appAttributes.id}:${auth.id}` }
        );
      }
    }

    // Install contextual authorities
    if (appAttributes.authorities && Array.isArray(appAttributes.authorities) && appAttributes.authorities.length > 0) {
      const authorityManager = new AuthorityManager();
      const authorityTable = await authorityManager.getTable();

      for (const authority of appAttributes.authorities) {
        const authorizations = (authority.authorizations || []).map(
          (authId: string) => `${appAttributes.id}:${authId}`
        );

        await authorityManager.createRecord(
          authorityTable,
          {
            name: authority.name,
            icon: authority.icon,
            authorizations,
            apps: [],
            contextual: true,
            app: appAttributes.id,
          },
          { id: `${appAttributes.id}:${authority.id}` }
        );
      }
    }

    // Install tables
    if (appAttributes.tables && Array.isArray(appAttributes.tables)) {
      const tableManager = new TableManager();
      const tableDefinition = await tableManager.loadTable("system", "table");
      if (!tableDefinition) {
        throw new Error("System table definition not found");
      }

      for (const table of appAttributes.tables) {
        await tableManager.createTable(
          appAttributes.id,
          table.name,
          {
            tableName: table.name,
            app: appAttributes.id,
            description: table.description || "",
            fields: table.fields || [],
          }
        );
      }
    }

    // Save icon if provided
    if (iconData) {
      const iconPath = path.join(appDir, "app.png");
      await fs.writeFile(iconPath, iconData);
    }

    // Call OnInstallation hook if it exists (with undefined for fresh install)
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
          } v${formatVersion(appAttributes.version)}`
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
            priorVersion: undefined, // Fresh install
            currentVersion: formatVersion(appAttributes.version),
            appId: appAttributes.id,
          };

          await installationHook.OnInstallation(context);
        }
      }
    } catch (error: any) {
      const errorMsg = `App installation hook failed for ${appAttributes.name}: ${error.message}`;
      await new LogManager().error("system", errorMsg);

      // Clean up - remove app from database and delete files
      try {
        await appManager.deleteRecord(appAttributes.id);
        await fs.rm(appDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error(
          "Failed to clean up after installation hook failure:",
          cleanupError
        );
      }

      return NextResponse.json(
        { error: `Installation hook failed: ${error.message}` },
        { status: 500 }
      );
    }

    // Log app installation
    await new LogManager().info(
      "system",
      `Application installed: ${appAttributes.name} v${formatVersion(
        appAttributes.version
      )} (${appAttributes.id})`
    );

    return NextResponse.json({
      success: true,
      appId: appAttributes.id,
      name: appAttributes.name,
    });
  } catch (error) {
    console.error("Error installing app:", error);

    // Log installation failure
    try {
      await new LogManager().error(
        "system",
        `App installation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } catch (logError) {
      console.error("Failed to log installation error:", logError);
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
