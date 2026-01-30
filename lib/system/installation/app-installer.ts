import path from "path";
import fs from "fs/promises";
import bcrypt from "bcryptjs";
import { loadModule } from "@/lib/system/source";
import { formatVersion } from "@/lib/system/version";
import AppManager from "@/lib/database/managers/app";
import TableManager from "@/lib/database/managers/table";
import FieldManager from "@/lib/database/managers/field";
import ApiRouteManager from "@/lib/database/managers/apiRoute";
import AppletManager from "@/lib/database/managers/applet";
import AuthorizationManager from "@/lib/database/managers/authorization";
import AuthorityManager from "@/lib/database/managers/authority";
import LogManager from "@/lib/database/managers/log";
import SettingManager from "@/lib/database/managers/setting";
import UserManager from "@/lib/database/managers/user";
import AgentManager from "@/lib/database/managers/agent";
import Agent from "@/lib/system/agents/agent";
import AppPackage from "@/lib/system/installation/types/package";
import { extractAppPackage } from "@/lib/system/installation/package-extractor";
import { validateAppPackage } from "@/lib/system/installation/package-validator";

/**
 * Save app files to storage
 * @param appId The app ID
 * @param storagePath The system storage path
 * @param packageData The extracted package data
 */
export async function saveAppFiles(
  appId: string,
  storagePath: string,
  packageData: AppPackage,
): Promise<void> {
  const appDir = path.join(storagePath, "apps", appId);
  await fs.mkdir(appDir, { recursive: true });

  // Create api directory
  const apiDir = path.join(appDir, "api");
  await fs.mkdir(apiDir, { recursive: true });

  // Create assets directory if needed
  if (packageData.assets.size > 0) {
    const assetsDir = path.join(appDir, "assets");
    await fs.mkdir(assetsDir, { recursive: true });
  }

  // Save the UI bundle
  const bundlePath = path.join(appDir, "app.js");
  await fs.writeFile(bundlePath, packageData.uiBundle, "utf-8");

  // Save API handlers (supports nested paths like "settings/user-color")
  for (const [handlerName, handlerData] of packageData.apiHandlers) {
    const handlerPath = path.join(apiDir, `${handlerName}.js`);
    // Create parent directories for nested handlers
    await fs.mkdir(path.dirname(handlerPath), { recursive: true });
    await fs.writeFile(handlerPath, handlerData);
  }

  // Save assets
  for (const [assetName, asset] of packageData.assets) {
    const assetPath = path.join(appDir, assetName);
    await fs.mkdir(path.dirname(assetPath), { recursive: true });
    await fs.writeFile(assetPath, asset);
  }

  // Save tables directory (formula and validator scripts)
  for (const [tablePath, tableFile] of packageData.tables) {
    const tableFilePath = path.join(appDir, tablePath);
    await fs.mkdir(path.dirname(tableFilePath), { recursive: true });
    await fs.writeFile(tableFilePath, tableFile);
  }

  // Save agent scripts
  if (packageData.agents.size > 0) {
    const agentsDir = path.join(appDir, "agents");
    await fs.mkdir(agentsDir, { recursive: true });
    for (const [agentName, agentScript] of packageData.agents) {
      const agentPath = path.join(agentsDir, `${agentName}.js`);
      await fs.writeFile(agentPath, agentScript);
    }
  }

  // Save icon if provided
  if (packageData.iconData) {
    const iconPath = path.join(appDir, "app.png");
    await fs.writeFile(iconPath, packageData.iconData);
  }
}

/**
 * Install app components (API routes, applets, tables, fields, authorizations, authorities)
 * @param appId The app ID
 * @param appAttributes The app.json attributes
 */
export async function installAppComponents(
  appId: string,
  appAttributes: any,
): Promise<void> {
  // Install API routes
  if (appAttributes.apiRoutes && Array.isArray(appAttributes.apiRoutes)) {
    const apiRouteManager = new ApiRouteManager();
    const apiRouteTable = await apiRouteManager.getTable();

    for (const apiRoute of appAttributes.apiRoutes) {
      await apiRouteManager.createRecord(
        apiRouteTable,
        {
          app: appId,
          path: apiRoute.path,
          method: apiRoute.method,
          description: apiRoute.description || "",
        },
        { id: `${appId}:${apiRoute.path}:${apiRoute.method}` },
      );
    }
  }

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
          app: appId,
          target: applet.target,
        },
        { id: `${appId}:${applet.id}` },
      );
    }
  }

  // Install tables and fields
  if (appAttributes.tables && Array.isArray(appAttributes.tables)) {
    const tableManager = new TableManager();
    const fieldManager = new FieldManager();

    for (const table of appAttributes.tables) {
      // Create table record
      await tableManager.createTable(appId, table.name, {
        tableName: table.name,
        app: appId,
        description: table.description || "",
      });

      // Create field records
      if (table.fields && Array.isArray(table.fields)) {
        for (const field of table.fields) {
          await fieldManager.createField(appId, table.name, field);
        }
      }
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
      const authId = `${appId}:${auth.id}`;
      await authorizationManager.createRecord(
        authTable,
        {
          name: auth.name,
          description: auth.description || "",
          app: appId,
          contextual: auth.contextual || false,
          target: auth.target || "user",
        },
        { id: authId },
      );
    }
  }

  // Create app-specific authority if there are app-only authorizations
  const authorityManager = new AuthorityManager();
  await authorityManager.createAppSpecificAuthority(appId, {
    name: `${appAttributes.name} (App-specific)`,
    authorizations: [],
    apps: [],
    contextual: true,
    app: appId,
  });

  // Install contextual authorities
  if (
    appAttributes.authorities &&
    Array.isArray(appAttributes.authorities) &&
    appAttributes.authorities.length > 0
  ) {
    const authorityManager = new AuthorityManager();
    const authorityTable = await authorityManager.getTable();

    for (const authority of appAttributes.authorities) {
      const authorizations = (authority.authorizations || []).map(
        (authId: string) => `${appId}:${authId}`,
      );

      await authorityManager.createRecord(
        authorityTable,
        {
          name: authority.name,
          icon: authority.icon,
          authorizations,
          apps: [],
          contextual: true,
          app: appId,
        },
        { id: `${appId}:${authority.id}` },
      );
    }
  }

  // Install agents
  if (appAttributes.agents && Array.isArray(appAttributes.agents)) {
    const agentManager = new AgentManager();
    const agentTable = await agentManager.getTable();

    for (const agent of appAttributes.agents) {
      await agentManager.createRecord(
        agentTable,
        {
          name: agent.name,
          description: agent.description || "",
          app: appId,
          cron: agent.cron,
          status: "stopped",
          wasRunning: false,
        },
        { id: `${appId}:${agent.name}` },
      );
    }
  }
}

/**
 * Update app components by deleting old and creating new
 * @param appId The app ID
 * @param appAttributes The app.json attributes
 */
export async function updateAppComponents(
  appId: string,
  appAttributes: any,
): Promise<void> {
  // Update API routes
  const apiRouteManager = new ApiRouteManager();
  const allApiRoutes = await apiRouteManager.readRecords();
  const existingApiRoutes = allApiRoutes.records.filter(
    (route) => route.data.app === appId,
  );
  const existingApiRouteKeys = new Set(
    existingApiRoutes.map((r) => `${r.data.path}:${r.data.method}`),
  );

  if (appAttributes.apiRoutes && Array.isArray(appAttributes.apiRoutes)) {
    const apiRouteTable = await apiRouteManager.getTable();

    for (const apiRoute of appAttributes.apiRoutes) {
      const routeKey = `${apiRoute.path}:${apiRoute.method}`;

      if (existingApiRouteKeys.has(routeKey)) {
        await apiRouteManager.deleteRecord(
          `${appId}:${apiRoute.path}:${apiRoute.method}`,
        );
      }

      await apiRouteManager.createRecord(
        apiRouteTable,
        {
          app: appId,
          path: apiRoute.path,
          method: apiRoute.method,
          description: apiRoute.description || "",
        },
        { id: `${appId}:${apiRoute.path}:${apiRoute.method}` },
      );

      existingApiRouteKeys.delete(routeKey);
    }
  }

  // Delete API routes that no longer exist
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
    (applet) => applet.data.app === appId,
  );
  const existingAppletIds = new Set(
    existingApplets.map((a) => a.id.split(":").pop() || ""),
  );

  if (appAttributes.applets && Array.isArray(appAttributes.applets)) {
    const appletTable = await appletManager.getTable();

    for (const applet of appAttributes.applets) {
      if (existingAppletIds.has(applet.id)) {
        await appletManager.deleteRecord(`${appId}:${applet.id}`);
      }

      await appletManager.createRecord(
        appletTable,
        {
          label: applet.label,
          description: applet.description || "",
          component: applet.component,
          app: appId,
          target: applet.target,
        },
        { id: `${appId}:${applet.id}` },
      );

      existingAppletIds.delete(applet.id);
    }
  }

  // Delete applets that no longer exist
  for (const applet of existingApplets) {
    const appletId = applet.id.split(":").pop() || "";
    if (existingAppletIds.has(appletId)) {
      await appletManager.deleteRecord(applet.id);
    }
  }

  // Update tables and fields
  if (appAttributes.tables && Array.isArray(appAttributes.tables)) {
    const tableManager = new TableManager();
    const fieldManager = new FieldManager();

    const allTables = await tableManager.listRecords();
    const existingTables = allTables.filter((t: any) =>
      t && typeof t === "string"
        ? t.startsWith(`${appId}:`)
        : t?.id?.startsWith(`${appId}:`),
    );
    const existingTableNames = new Set(
      existingTables.map((t: any) =>
        typeof t === "string" ? t.split(":")[1] : t.data.tableName,
      ),
    );

    for (const table of appAttributes.tables) {
      if (existingTableNames.has(table.name)) {
        // Delete old table and fields
        await fieldManager.deleteTableFields(appId, table.name);
        await tableManager.deleteTable(appId, table.name);
      }

      // Create table record
      await tableManager.createTable(appId, table.name, {
        tableName: table.name,
        app: appId,
        description: table.description || "",
      });

      // Create field records
      if (table.fields && Array.isArray(table.fields)) {
        for (const field of table.fields) {
          await fieldManager.createField(appId, table.name, field);
        }
      }

      existingTableNames.delete(table.name);
    }

    // Delete tables that no longer exist
    for (const tableName of existingTableNames) {
      await tableManager.deleteTable(appId, tableName);
    }
  }

  // Update agents
  const agentManager = new AgentManager();
  const allAgents = await agentManager.readRecords();
  const existingAgents = allAgents.records.filter(
    (agent) => agent.data.app === appId,
  );
  const existingAgentNames = new Set(existingAgents.map((a) => a.data.name));

  if (appAttributes.agents && Array.isArray(appAttributes.agents)) {
    const agentTable = await agentManager.getTable();

    for (const agent of appAttributes.agents) {
      const existingAgent = existingAgents.find(
        (a) => a.data.name === agent.name,
      );

      if (existingAgent) {
        // Update existing agent, preserve runtime state
        await agentManager.updateRecord(agentTable, existingAgent.id, {
          name: agent.name,
          description: agent.description || "",
          app: appId,
          cron: agent.cron,
          // Preserve: status, pid, lastRun, lastError, wasRunning
        });
      } else {
        // Create new agent
        await agentManager.createRecord(
          agentTable,
          {
            name: agent.name,
            description: agent.description || "",
            app: appId,
            cron: agent.cron,
            status: "stopped",
            wasRunning: false,
          },
          { id: `${appId}:${agent.name}` },
        );
      }

      existingAgentNames.delete(agent.name);
    }
  }

  // Delete agents that no longer exist
  for (const agent of existingAgents) {
    if (existingAgentNames.has(agent.data.name)) {
      await agentManager.deleteRecord(agent.id);
    }
  }
}

/**
 * Execute the OnInstallation hook if it exists
 * @param appId The app ID
 * @param storagePath The system storage path
 * @param context The installation context
 * @throws Error if hook execution fails
 */
export async function executeInstallHook(
  appId: string,
  storagePath: string,
  context: {
    priorVersion?: string;
    currentVersion: string;
    appId: string;
  },
): Promise<void> {
  const appDir = path.join(storagePath, "apps", appId);
  const installationHookPath = path.join(appDir, "system", "install.js");

  const installationHookExists = await fs
    .access(installationHookPath)
    .then(() => true)
    .catch(() => false);

  if (!installationHookExists) {
    return;
  }

  const logMsg = context.priorVersion
    ? `Running OnInstallation hook for ${appId} (${context.priorVersion} → ${context.currentVersion})`
    : `Running OnInstallation hook for ${appId} v${context.currentVersion}`;

  await new LogManager().info("system", logMsg);

  const installationHook = loadModule(installationHookPath);

  if (
    installationHook.OnInstallation &&
    typeof installationHook.OnInstallation === "function"
  ) {
    await installationHook.OnInstallation(context);
  }
}

/**
 * Main orchestrator for installing a new app
 * @param fileBuffer The app package zip buffer
 * @returns The installed app ID and name
 * @throws Error if installation fails
 */
export async function installApp(
  fileBuffer: Buffer,
  approvedPermissions?: string[],
): Promise<{ appId: string; name: string }> {
  // Extract package
  const packageData = await extractAppPackage(fileBuffer);
  const { appAttributes } = packageData;

  // Validate package
  await validateAppPackage(appAttributes, packageData.zip, {
    isUpgrade: false,
  });

  // Verify app is not currently installed
  const existingApp = await new AppManager().readRecord(appAttributes.id);

  if (existingApp) {
    throw new Error(`App with id '${appAttributes.id}' is already installed`);
  }

  // Get storage path
  const settingManager = new SettingManager();
  const storageRecord = await settingManager.readRecord("storage");
  const storagePath = storageRecord?.data.value;
  if (!storagePath) {
    throw new Error("System storage not configured");
  }

  // Save files
  await saveAppFiles(appAttributes.id, storagePath, packageData);

  // Create app record
  const appManager = new AppManager();
  await appManager.createRecord(
    await appManager.getTable(),
    {
      label: appAttributes.name,
      version: appAttributes.version,
      author: appAttributes.author,
      contactEmail: appAttributes.contactEmail || "",
      description: appAttributes.description,
      dependencies: appAttributes.dependencies || {},
    },
    { id: appAttributes.id },
  );

  // Install components
  await installAppComponents(appAttributes.id, appAttributes);

  // Assign approved permissions to the app-specific authority
  if (approvedPermissions && approvedPermissions.length > 0) {
    const authorityManager = new AuthorityManager();
    const appAuthority = await authorityManager.readAppSpecificAuthority(
      appAttributes.id,
    );
    if (appAuthority) {
      await authorityManager.updateAppSpecificAuthority(appAttributes.id, {
        ...appAuthority.data,
        authorizations: [
          ...appAuthority.data.authorizations,
          ...approvedPermissions,
        ],
      });
    }
  }

  // Execute installation hook
  try {
    await executeInstallHook(appAttributes.id, storagePath, {
      priorVersion: undefined,
      currentVersion: formatVersion(appAttributes.version),
      appId: appAttributes.id,
    });
  } catch (error: any) {
    // Clean up on hook failure
    const appDir = path.join(storagePath, "apps", appAttributes.id);
    await appManager.deleteRecord(appAttributes.id);
    await fs.rm(appDir, { recursive: true, force: true });
    throw new Error(`Installation hook failed: ${error.message}`);
  }

  // Log installation
  await new LogManager().info(
    "system",
    `Application installed: ${appAttributes.name} v${formatVersion(
      appAttributes.version,
    )} (${appAttributes.id})`,
  );

  return {
    appId: appAttributes.id,
    name: appAttributes.name,
  };
}

/**
 * Upgrade the system app using SYSTEM_APP_METADATA
 * @returns The upgrade result
 * @throws Error if upgrade fails
 */
export async function upgradeSystemApp(): Promise<{
  appId: string;
  name: string;
  oldVersion: string;
  newVersion: string;
}> {
  const { SYSTEM_APP_METADATA } = await import("@/lib/database/systemMetadata");

  const appManager = new AppManager();
  const existingApp = await appManager.readRecord("system");
  if (!existingApp) {
    throw new Error("System app not found");
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
    throw new Error("System is already up to date");
  }

  // Update system app record
  await appManager.updateRecord(await appManager.getTable(), "system", {
    label: SYSTEM_APP_METADATA.name,
    version: SYSTEM_APP_METADATA.version,
    author: SYSTEM_APP_METADATA.author,
    contactEmail: SYSTEM_APP_METADATA.contactEmail,
    description: SYSTEM_APP_METADATA.description,
    dependencies: SYSTEM_APP_METADATA.dependencies,
  });

  // Update API routes
  const apiRouteManager = new ApiRouteManager();
  const allApiRoutes = await apiRouteManager.readRecords();
  const existingSystemApiRoutes = allApiRoutes.records.filter(
    (route) => route.data.app === "system",
  );

  for (const route of existingSystemApiRoutes) {
    await apiRouteManager.deleteRecord(route.id);
  }

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
          description: apiRoute.description || "",
        },
        { id: `system:${apiRoute.path}:${apiRoute.method}` },
      );
    }
  }

  // Update applets
  const appletManager = new AppletManager();
  const allApplets = await appletManager.readRecords();
  const existingSystemApplets = allApplets.records.filter(
    (applet) => applet.data.app === "system",
  );

  for (const applet of existingSystemApplets) {
    await appletManager.deleteRecord(applet.id);
  }

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
        { id: `system:${applet.id}` },
      );
    }
  }

  // Update tables and fields
  if (SYSTEM_APP_METADATA.tables && Array.isArray(SYSTEM_APP_METADATA.tables)) {
    const tableManager = new TableManager();
    const fieldManager = new FieldManager();

    // MIGRATION: Check if fields table exists, if not this is the first upgrade with the new field system
    const fieldsTableExists = await tableManager.loadTable("system", "field");
    if (!fieldsTableExists) {
      await new LogManager().info(
        "system",
        "Migrating table fields to separate field records...",
      );

      // Migrate existing table fields to field records
      const allTablesResult = await tableManager.readRecords({});
      for (const tableRecord of allTablesResult.records) {
        const tableData = tableRecord.data as any;
        if (tableData.fields && Array.isArray(tableData.fields)) {
          const [appId, tableName] = tableRecord.id.split(":");

          for (const field of tableData.fields) {
            await fieldManager.createField(appId, tableName, field);
          }

          await new LogManager().debug(
            "system",
            `Migrated ${tableData.fields.length} fields for table ${appId}:${tableName}`,
          );
        }
      }

      await new LogManager().info(
        "system",
        "Field migration completed successfully",
      );
    }

    const allTables = await tableManager.listRecords();
    const existingTables = allTables.filter((t) => t.startsWith("system:"));
    const existingTableNames = new Set(
      existingTables.map((t: any) =>
        typeof t === "string" ? t.split(":")[1] : t.data.tableName,
      ),
    );

    for (const table of SYSTEM_APP_METADATA.tables) {
      if (existingTableNames.has(table.name)) {
        await fieldManager.deleteTableFields("system", table.name);
        await tableManager.deleteTable("system", table.name);
      }

      await tableManager.createTable("system", table.name, {
        tableName: table.name,
        app: "system",
        description: table.description || "",
      });

      if (table.fields && Array.isArray(table.fields)) {
        for (const field of table.fields) {
          await fieldManager.createField("system", table.name, field as any);
        }
      }

      existingTableNames.delete(table.name);
    }

    for (const tableName of existingTableNames) {
      await tableManager.deleteTable("system", tableName);
    }
  }

  // Update authorizations and authorities
  const authorizationManager = new AuthorizationManager();
  const authorityManager = new AuthorityManager();

  // Delete existing system authorizations
  const authorizationsResult = await authorizationManager.readRecords();
  for (const auth of authorizationsResult.records) {
    if (auth.data.app === "system") {
      await authorizationManager.deleteRecord(auth.id);
    }
  }

  // Delete existing system authorities (identified by system: prefix or app === "system")
  const authoritiesResult = await authorityManager.readRecords();
  for (const authority of authoritiesResult.records) {
    if (authority.id.startsWith("system:") || authority.data.app === "system") {
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
        contextual: auth.contextual,
        target: (auth as any).target || "user",
      },
      { id: "system:" + auth.id },
    );
  }

  // Create system authorities
  for (const auth of SYSTEM_APP_METADATA.authorities) {
    await authorityManager.createRecord(
      await authorityManager.getTable(),
      {
        name: auth.name,
        authorizations: auth.authorizations,
        apps: auth.apps,
        contextual: auth.contextual || false,
        app: auth.contextual ? "system" : undefined,
      },
      { id: "system:" + auth.id },
    );
  }

  await new LogManager().info(
    "system",
    `System upgraded: ${formatVersion(
      existingApp.data.version,
    )} → ${formatVersion(SYSTEM_APP_METADATA.version)}`,
  );

  return {
    appId: "system",
    name: "System",
    oldVersion: formatVersion(existingApp.data.version),
    newVersion: formatVersion(SYSTEM_APP_METADATA.version),
  };
}

/**
 * Main orchestrator for upgrading an existing app
 * @param appId The app ID to upgrade
 * @param fileBuffer The app package zip buffer
 * @returns The upgrade result
 * @throws Error if upgrade fails
 */
export async function upgradeApp(
  appId: string,
  fileBuffer: Buffer,
): Promise<{
  appId: string;
  name: string;
  oldVersion: string;
  newVersion: string;
}> {
  // Check if app exists
  const appManager = new AppManager();
  const existingApp = await appManager.readRecord(appId);
  if (!existingApp) {
    throw new Error(`App '${appId}' does not exist`);
  }

  // Extract package
  const packageData = await extractAppPackage(fileBuffer);
  const { appAttributes } = packageData;

  // Verify app ID matches
  if (appAttributes.id !== appId) {
    throw new Error(
      `App ID mismatch. Expected '${appId}', got '${appAttributes.id}'`,
    );
  }

  // Validate package
  await validateAppPackage(appAttributes, packageData.zip, {
    isUpgrade: true,
    existingVersion: existingApp.data.version,
  });

  // Get storage path
  const settingManager = new SettingManager();
  const storageRecord = await settingManager.readRecord("storage");
  const storagePath = storageRecord?.data.value;
  if (!storagePath) {
    throw new Error("System storage not configured");
  }

  // Stop running agents and mark them for restart
  const agentManager = new AgentManager();
  const allAgents = await agentManager.readRecords();
  const appAgents = allAgents.records.filter((a) => a.data.app === appId);
  const runningAgentIds: string[] = [];

  for (const agentRecord of appAgents) {
    if (agentRecord.data.status === "running") {
      runningAgentIds.push(agentRecord.id);
      // Stop the agent
      const [agentAppId, agentName] = agentRecord.id.split(":");
      await new Agent(agentAppId, agentName).stop();
    }
  }

  // Backup old version
  const appDir = path.join(storagePath, "apps", appId);
  const apiDir = path.join(appDir, "api");
  const tablesDir = path.join(appDir, "tables");
  const agentsDir = path.join(appDir, "agents");
  const backupApiDir = path.join(appDir, `api.backup.${Date.now()}`);
  const backupTablesDir = path.join(appDir, `tables.backup.${Date.now()}`);
  const backupAgentsDir = path.join(appDir, `agents.backup.${Date.now()}`);

  try {
    await fs.rename(apiDir, backupApiDir);
  } catch (error) {
    // If api directory doesn't exist, that's okay
  }

  try {
    await fs.rename(tablesDir, backupTablesDir);
  } catch (error) {
    // If tables directory doesn't exist, that's okay
  }

  try {
    await fs.rename(agentsDir, backupAgentsDir);
  } catch (error) {
    // If agents directory doesn't exist, that's okay
  }

  // Create new directories
  await fs.mkdir(apiDir, { recursive: true });
  await fs.mkdir(tablesDir, { recursive: true });

  try {
    // Save files
    await saveAppFiles(appId, storagePath, packageData);

    // Update app record
    await appManager.updateRecord(await appManager.getTable(), appId, {
      label: appAttributes.name,
      version: appAttributes.version,
      author: appAttributes.author,
      contactEmail: appAttributes.contactEmail || "",
      description: appAttributes.description,
      dependencies: appAttributes.dependencies || {},
    });

    // Update components
    await updateAppComponents(appId, appAttributes);

    // Delete backups after successful upgrade
    try {
      await fs.rm(backupApiDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }

    try {
      await fs.rm(backupTablesDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }

    try {
      await fs.rm(backupAgentsDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore
    }

    // Execute installation hook
    try {
      await executeInstallHook(appId, storagePath, {
        priorVersion: formatVersion(existingApp.data.version),
        currentVersion: formatVersion(appAttributes.version),
        appId,
      });
    } catch (error: any) {
      // Rollback - restore backups
      try {
        await fs.rm(apiDir, { recursive: true, force: true });
        await fs.rename(backupApiDir, apiDir);

        await fs.rm(tablesDir, { recursive: true, force: true });
        await fs.rename(backupTablesDir, tablesDir);

        await fs.rm(agentsDir, { recursive: true, force: true });
        await fs.rename(backupAgentsDir, agentsDir);
      } catch (rollbackError) {
        console.error(
          "Failed to rollback after installation hook failure:",
          rollbackError,
        );
      }
      throw new Error(`Installation hook failed: ${error.message}`);
    }

    // Log upgrade
    await new LogManager().info(
      "system",
      `Application upgraded: ${appAttributes.name} (${formatVersion(
        existingApp.data.version,
      )} → ${formatVersion(appAttributes.version)})`,
    );

    return {
      appId,
      name: appAttributes.name,
      oldVersion: formatVersion(existingApp.data.version),
      newVersion: formatVersion(appAttributes.version),
    };
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

    try {
      await fs.rm(agentsDir, { recursive: true, force: true });
      await fs.rename(backupAgentsDir, agentsDir);
    } catch (restoreError) {
      console.error("Failed to restore agents backup:", restoreError);
    }

    throw error;
  }
}

/**
 * Perform first-time system setup
 * @param adminUser The admin user details
 * @returns Success status
 * @throws Error if setup fails
 */
export async function setupSystem(adminUser: {
  username: string;
  email: string;
  displayName: string;
  password: string;
}): Promise<void> {
  const { SYSTEM_APP_METADATA } = await import("@/lib/database/systemMetadata");

  // Validate input
  if (
    !adminUser.username ||
    !adminUser.email ||
    !adminUser.displayName ||
    !adminUser.password
  ) {
    throw new Error("All fields are required");
  }

  // Check if setup is still needed
  const userManager = new UserManager();
  const users = await userManager.listRecords();
  if (users.length > 0) {
    throw new Error("Setup already completed");
  }

  // Create the system app
  const appManager = new AppManager();
  await appManager.createRecord(
    await appManager.getTable(),
    {
      label: SYSTEM_APP_METADATA.name,
      version: SYSTEM_APP_METADATA.version,
      author: SYSTEM_APP_METADATA.author,
      contactEmail: SYSTEM_APP_METADATA.contactEmail,
      description: SYSTEM_APP_METADATA.description,
      dependencies: SYSTEM_APP_METADATA.dependencies,
    },
    { id: "system" },
  );

  // Create API routes for system app
  if (
    SYSTEM_APP_METADATA.apiRoutes &&
    Array.isArray(SYSTEM_APP_METADATA.apiRoutes)
  ) {
    const apiRouteManager = new ApiRouteManager();
    const apiRouteTable = await apiRouteManager.getTable();

    for (const apiRoute of SYSTEM_APP_METADATA.apiRoutes) {
      await apiRouteManager.createRecord(
        apiRouteTable,
        {
          app: "system",
          path: apiRoute.path,
          method: apiRoute.method,
          description: apiRoute.description || "",
        },
        { id: `system:${apiRoute.path}:${apiRoute.method}` },
      );
    }
  }

  // Create applets for system app
  if (
    SYSTEM_APP_METADATA.applets &&
    Array.isArray(SYSTEM_APP_METADATA.applets)
  ) {
    const appletManager = new AppletManager();
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
        { id: `system:${applet.id}` },
      );
    }
  }

  // Create all table definitions
  const tableManager = new TableManager();
  const fieldManager = new FieldManager();

  for (const table of SYSTEM_APP_METADATA.tables) {
    // Create the table definition (without fields)
    await tableManager.createTable("system", table.name, {
      tableName: table.name,
      app: "system",
      description: table.description,
    });

    // Create each field definition separately
    if (table.fields && Array.isArray(table.fields)) {
      for (const field of table.fields) {
        await fieldManager.createField("system", table.name, field as any);
      }
    }
  }

  // Initialize authorities
  const authorityManager = new AuthorityManager();
  const authorizationManager = new AuthorizationManager();

  // Create authorizations from system metadata
  for (const authorization of SYSTEM_APP_METADATA.authorizations) {
    await authorizationManager.createRecord(
      await authorizationManager.getTable(),
      {
        name: authorization.name,
        description: authorization.description,
        app: authorization.app,
        contextual: authorization.contextual,
        target: (authorization as any).target || "user",
      },
      { id: "system:" + authorization.id },
    );
  }

  // Create authorities from system metadata
  for (const authority of SYSTEM_APP_METADATA.authorities) {
    await authorityManager.createRecord(
      await authorityManager.getTable(),
      {
        name: authority.name,
        authorizations: authority.authorizations,
        apps: authority.apps,
        contextual: authority.contextual,
      },
      { id: "system:" + authority.id },
    );
  }

  // Create the administrative user with 'system:admin' authority
  const passwordHash = await bcrypt.hash(adminUser.password, 10);
  const user = await userManager.createRecord(await userManager.getTable(), {
    username: adminUser.username,
    email: adminUser.email,
    displayName: adminUser.displayName,
    passwordHash,
    authority: "system:admin",
    isActive: true,
  });

  // Mark setup as complete
  const settingManager = new SettingManager();
  await settingManager.createRecord(
    await settingManager.getTable(),
    { value: user.id },
    { id: "administratorUserId" },
  );
}
