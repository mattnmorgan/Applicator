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
import AppletManager from "@/lib/database/managers/applet";
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

        // Validate component file exists (check in both apps/ and widgets/ directories for compatibility)
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
    }, {
      id: appAttributes.id,
    });

    // Install applets
    if (appAttributes.applets && Array.isArray(appAttributes.applets)) {
      const appletManager = new AppletManager();
      const appletTable = await appletManager.getTable();

      for (const applet of appAttributes.applets) {
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
      }
    }

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
