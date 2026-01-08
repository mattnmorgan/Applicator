import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  userHasAuthorization,
  getApp,
  updateApp,
  getAllApps,
} from "@/lib/db";
import {
  getSystemSetting,
  AppVersion,
  formatVersion,
  isVersionGreaterOrEqual,
  compareVersions,
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
    const appId = formData.get("appId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!appId) {
      return NextResponse.json(
        { error: "No app ID provided" },
        { status: 400 }
      );
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
        .fromRequest(request)
        .error("system", `App upgrade rejected: App '${appId}' does not exist`);
      return NextResponse.json(
        { error: "App does not exist" },
        { status: 404 }
      );
    }

    const oldVersion = existingApp.version;

    // Read file as buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Extract zip contents
    let zip: AdmZip;
    let appAttributes: any;
    let uiBundle: string;
    let iconData: Buffer | null = null;
    let apiHandlers: Map<string, Buffer> = new Map();

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
          .fromRequest(request)
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
      const errorMsg = `App upgrade rejected: Invalid version format for '${appAttributes.id}'. Version must have major, minor, and dev properties.`;
      await logger.fromRequest(request).error("system", errorMsg);
      return NextResponse.json(
        {
          error:
            "Invalid version format. Version must have major, minor, and dev properties.",
        },
        { status: 400 }
      );
    }

    // Check if upgrading to the same version
    if (compareVersions(appAttributes.version, existingApp.version) === 0) {
      const versionStr = formatVersion(appAttributes.version);
      const errorMsg = `App upgrade rejected: Cannot upgrade '${appAttributes.id}' to the same version ${versionStr}`;
      await logger.fromRequest(request).error("system", errorMsg);
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
          const errorMsg = `App upgrade rejected: Required dependency '${depId}' is not installed`;
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
          const errorMsg = `App upgrade rejected: Dependency '${depId}' version ${installedVersionStr} does not meet minimum requirement ${requiredVersionStr}`;
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

    // Backup old version (rename api directory)
    const apiDir = path.join(appDir, "api");
    const backupApiDir = path.join(appDir, `api.backup.${Date.now()}`);

    try {
      await fs.rename(apiDir, backupApiDir);
    } catch (error) {
      // If api directory doesn't exist, that's okay
      console.log("No existing api directory to backup");
    }

    // Create new api directory
    await fs.mkdir(apiDir, { recursive: true });

    try {
      // Save the UI bundle (in root of app directory)
      const bundlePath = path.join(appDir, `app.js`);
      await fs.writeFile(bundlePath, uiBundle, "utf-8");

      // Save API handlers
      for (const [handlerName, handlerData] of apiHandlers) {
        const handlerPath = path.join(apiDir, `${handlerName}.js`);
        await fs.writeFile(handlerPath, handlerData);
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
        widgets: processedWidgets,
        dependencies: appAttributes.dependencies || {},
      });

      // Delete backup after successful upgrade
      try {
        await fs.rm(backupApiDir, { recursive: true, force: true });
      } catch (error) {
        console.log("No backup to clean up");
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
            .fromRequest(request)
            .info(
              "system",
              `Running OnInstallation hook for ${appAttributes.name} (${formatVersion(
                existingApp.version
              )} → ${formatVersion(appAttributes.version)})`
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
              priorVersion: formatVersion(existingApp.version),
              currentVersion: formatVersion(appAttributes.version),
              appId: appAttributes.id,
            };

            await installationHook.OnInstallation(context);
          }
        }
      } catch (error: any) {
        const errorMsg = `App installation hook failed for ${appAttributes.name}: ${error.message}`;
        await logger.fromRequest(request).error("system", errorMsg);

        // Rollback - restore the backup
        try {
          await fs.rm(apiDir, { recursive: true, force: true });
          await fs.rename(backupApiDir, apiDir);
          // Also restore the old bundle and icon
          const oldBundlePath = path.join(appDir, `app.js.backup.${Date.now()}`);
          const bundlePath = path.join(appDir, `app.js`);
          // Note: We don't have backups of bundle/icon yet, but the API rollback is critical
        } catch (rollbackError) {
          console.error("Failed to rollback after installation hook failure:", rollbackError);
        }

        return NextResponse.json(
          { error: `Installation hook failed: ${error.message}` },
          { status: 500 }
        );
      }

      // Log app upgrade
      await logger
        .fromRequest(request)
        .info(
          "system",
          `Application upgraded: ${appAttributes.name} (${formatVersion(
            existingApp.version
          )} → ${formatVersion(appAttributes.version)})`
        );

      return NextResponse.json({
        success: true,
        appId: appAttributes.id,
        name: appAttributes.name,
        oldVersion: formatVersion(existingApp.version),
        newVersion: formatVersion(appAttributes.version),
      });
    } catch (error) {
      // Restore backup on error
      try {
        await fs.rm(apiDir, { recursive: true, force: true });
        await fs.rename(backupApiDir, apiDir);
      } catch (restoreError) {
        console.error("Failed to restore backup:", restoreError);
      }
      throw error;
    }
  } catch (error) {
    console.error("Error upgrading app:", error);

    // Log upgrade failure
    try {
      await logger
        .fromRequest(request)
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
