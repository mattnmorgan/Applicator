import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/db";
import {
  userHasAuthorization,
  createApp,
  createAuthorization,
  getApp,
  getAllApps,
  deleteApp,
} from "@/lib/db";
import {
  getSystemSetting,
  AppVersion,
  formatVersion,
  isVersionGreaterOrEqual,
} from "@/lib/db";
import { logger } from "@/lib/logging";
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
      await logger.fromRequest(request).error("system", errorMsg);
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
      await logger.fromRequest(request).error("system", errorMsg);
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
      await logger.fromRequest(request).error("system", errorMsg);
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
      await logger.fromRequest(request).error("system", errorMsg);
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
          const errorMsg = `App installation rejected: Required dependency '${depId}' is not installed`;
          await logger.fromRequest(request).error("system", errorMsg);
          return NextResponse.json(
            { error: `Required dependency '${depId}' is not installed` },
            { status: 400 }
          );
        }

        if (
          !isVersionGreaterOrEqual(
            installedApp.version,
            requiredVersion as AppVersion
          )
        ) {
          const installedVersionStr = formatVersion(installedApp.version);
          const requiredVersionStr = formatVersion(
            requiredVersion as AppVersion
          );
          const errorMsg = `App installation rejected: Dependency '${depId}' version ${installedVersionStr} does not meet minimum requirement ${requiredVersionStr}`;
          await logger.fromRequest(request).error("system", errorMsg);
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

    // Check if app already exists
    const existingApp = await getApp(appAttributes.id);
    if (existingApp) {
      return NextResponse.json(
        { error: "App with this ID already exists" },
        { status: 409 }
      );
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

    // Process widgets - ensure appId is set correctly
    const processedWidgets = (appAttributes.widgets || []).map(
      (widget: any) => ({
        id: widget.id,
        name: widget.name,
        description: widget.description,
        target: widget.target,
        component: widget.component,
        appId: appAttributes.id, // Always use the app's ID
      })
    );

    // Create app in database
    await createApp(
      appAttributes.id,
      appAttributes.name,
      appAttributes.version,
      appAttributes.author,
      appAttributes.contactEmail || "",
      appAttributes.description,
      appAttributes.apiRoutes || [],
      processedWidgets,
      appAttributes.dependencies || {}
    );

    // Install authorizations
    if (
      appAttributes.authorizations &&
      Array.isArray(appAttributes.authorizations)
    ) {
      for (const auth of appAttributes.authorizations) {
        const authId = `${appAttributes.id}:${auth.id}`;
        await createAuthorization(
          authId,
          auth.name,
          auth.description || "",
          appAttributes.id
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
        await logger
          .fromRequest(request)
          .info(
            "system",
            `Running OnInstallation hook for ${appAttributes.name} v${formatVersion(
              appAttributes.version
            )}`
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
      await logger.fromRequest(request).error("system", errorMsg);

      // Clean up - remove app from database and delete files
      try {
        await deleteApp(appAttributes.id);
        await fs.rm(appDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error("Failed to clean up after installation hook failure:", cleanupError);
      }

      return NextResponse.json(
        { error: `Installation hook failed: ${error.message}` },
        { status: 500 }
      );
    }

    // Log app installation
    await logger
      .fromRequest(request)
      .info(
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
      await logger
        .fromRequest(request)
        .error(
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
