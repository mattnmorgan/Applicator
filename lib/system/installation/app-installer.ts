import path from "path";
import fs from "fs/promises";
import bcrypt from "bcryptjs";
import { PoolClient } from "pg";
import { withTransaction } from "@/lib/database/connections/postgresql";
import { loadModule } from "@/lib/system/source";
import { formatVersion, versionDir } from "@/lib/system/version";
import type AppVersion from "@/lib/database/types/appVersion";
import Context from "@/lib/sdk/plugin-context";
import AppManager from "@/lib/managers/app";
import TableManager from "@/lib/managers/table";
import FieldManager from "@/lib/managers/field";
import ApiRouteManager from "@/lib/managers/apiRoute";
import AppletManager from "@/lib/managers/applet";
import AuthorizationManager from "@/lib/managers/authorization";
import AuthorityManager from "@/lib/managers/authority";
import LogManager from "@/lib/managers/log";
import SettingManager from "@/lib/managers/setting";
import UserManager from "@/lib/managers/user";
import AgentManager from "@/lib/managers/agent";
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
): Promise<string> {
  const vDir = versionDir(packageData.appAttributes.version);
  const appDir = path.join(storagePath, "apps", appId, vDir);
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

  return appDir;
}

/**
 * Install app components (API routes, applets, tables, fields, authorizations, authorities)
 * @param appId The app ID
 * @param appAttributes The app.json attributes
 * @param client Optional transaction client
 */
export async function installAppComponents(
  appId: string,
  appAttributes: any,
  client?: PoolClient,
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
        { id: `${appId}:${apiRoute.path}:${apiRoute.method}`, client },
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
          settings: applet.settings || [],
        },
        { id: `${appId}:${applet.id}`, client },
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
        table_name: table.name,
        app: appId,
        description: table.description || "",
      }, client);

      // Create field records
      if (table.fields && Array.isArray(table.fields)) {
        for (const field of table.fields) {
          await fieldManager.createField(appId, table.name, field, client);
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
        { id: authId, client },
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
  }, { client });

  // Install contextual authorities
  if (
    appAttributes.authorities &&
    Array.isArray(appAttributes.authorities) &&
    appAttributes.authorities.length > 0
  ) {
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
        { id: `${appId}:${authority.id}`, client },
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
          label: agent.label,
          description: agent.description || "",
          app: appId,
          cron: agent.cron,
          status: "stopped",
          was_running: false,
        },
        { id: `${appId}:${agent.name}`, client },
      );
    }
  }
}

/**
 * Update app components by deleting old and creating new
 * @param appId The app ID
 * @param appAttributes The app.json attributes
 * @param client Optional transaction client
 */
export async function updateAppComponents(
  appId: string,
  appAttributes: any,
  client?: PoolClient,
): Promise<void> {
  // Update API routes
  const apiRouteManager = new ApiRouteManager();
  const allApiRoutes = await apiRouteManager.readRecords({}, client);
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
          { client },
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
        { id: `${appId}:${apiRoute.path}:${apiRoute.method}`, client },
      );

      existingApiRouteKeys.delete(routeKey);
    }
  }

  // Delete API routes that no longer exist
  for (const route of existingApiRoutes) {
    const routeKey = `${route.data.path}:${route.data.method}`;
    if (existingApiRouteKeys.has(routeKey)) {
      await apiRouteManager.deleteRecord(route.id, { client });
    }
  }

  // Update applets
  const appletManager = new AppletManager();
  const allApplets = await appletManager.readRecords({}, client);
  const existingApplets = allApplets.records.filter(
    (applet) => applet.data.app === appId,
  );
  const existingAppletIds = new Set(
    existingApplets.map((a) => a.id.split(":").pop() || ""),
  );

  if (appAttributes.applets && Array.isArray(appAttributes.applets)) {
    const appletTable = await appletManager.getTable();

    for (const applet of appAttributes.applets) {
      const appletData = {
        label: applet.label,
        description: applet.description || "",
        component: applet.component,
        app: appId,
        target: applet.target,
        settings: applet.settings || [],
      };

      if (existingAppletIds.has(applet.id)) {
        await appletManager.updateRecord(
          appletTable,
          `${appId}:${applet.id}`,
          appletData,
          { client },
        );
      } else {
        await appletManager.createRecord(
          appletTable,
          appletData,
          { id: `${appId}:${applet.id}`, client },
        );
      }

      existingAppletIds.delete(applet.id);
    }
  }

  // Delete applets that no longer exist
  for (const applet of existingApplets) {
    const appletId = applet.id.split(":").pop() || "";
    if (existingAppletIds.has(appletId)) {
      await appletManager.deleteRecord(applet.id, { client });
    }
  }

  // Update tables and fields
  if (appAttributes.tables && Array.isArray(appAttributes.tables)) {
    const tableManager = new TableManager();
    const fieldManager = new FieldManager();

    const allTables = await tableManager.listRecords(client);
    const existingTables = allTables.filter((t: any) =>
      t && typeof t === "string"
        ? t.startsWith(`${appId}:`)
        : t?.id?.startsWith(`${appId}:`),
    );
    const existingTableNames = new Set(
      existingTables.map((t: any) =>
        typeof t === "string" ? t.split(":")[1] : t.data.table_name,
      ),
    );

    for (const table of appAttributes.tables) {
      if (existingTableNames.has(table.name)) {
        // Delete old table and fields
        await fieldManager.deleteTableFields(appId, table.name, client);
        await tableManager.deleteTable(appId, table.name, client);
      }

      // Create table record
      await tableManager.createTable(appId, table.name, {
        table_name: table.name,
        app: appId,
        description: table.description || "",
      }, client);

      // Create field records
      if (table.fields && Array.isArray(table.fields)) {
        for (const field of table.fields) {
          await fieldManager.createField(appId, table.name, field, client);
        }
      }

      existingTableNames.delete(table.name);
    }

    // Delete tables that no longer exist
    for (const tableName of existingTableNames) {
      await tableManager.deleteTable(appId, tableName, client);
    }
  }

  // Update agents
  const agentManager = new AgentManager();
  const allAgents = await agentManager.readRecords({}, client);
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
          label: agent.label,
          description: agent.description || "",
          app: appId,
          cron: agent.cron,
          // Preserve: status, pid, last_run, last_error, was_running
        }, { client });
      } else {
        // Create new agent
        await agentManager.createRecord(
          agentTable,
          {
            name: agent.name,
            label: agent.label,
            description: agent.description || "",
            app: appId,
            cron: agent.cron,
            status: "stopped",
            was_running: false,
          },
          { id: `${appId}:${agent.name}`, client },
        );
      }

      existingAgentNames.delete(agent.name);
    }
  }

  // Delete agents that no longer exist
  for (const agent of existingAgents) {
    if (existingAgentNames.has(agent.data.name)) {
      await agentManager.deleteRecord(agent.id, { client });
    }
  }

  // Update authorizations (add new, skip existing to preserve customizations)
  if (appAttributes.authorizations && Array.isArray(appAttributes.authorizations)) {
    const authorizationManager = new AuthorizationManager();
    const existingAuthorizationsResult = await authorizationManager.readRecords(
      { fields: { app: appId } },
      client,
    );
    const existingAuthorizationIds = new Set(
      existingAuthorizationsResult.records.map((a) => a.id),
    );
    const authTable = await authorizationManager.getTable();

    for (const auth of appAttributes.authorizations) {
      const authId = `${appId}:${auth.id}`;
      if (!existingAuthorizationIds.has(authId)) {
        await authorizationManager.createRecord(
          authTable,
          {
            name: auth.name,
            description: auth.description || "",
            app: appId,
            contextual: auth.contextual || false,
            target: auth.target || "user",
          },
          { id: authId, client },
        );
      }
    }
  }

  // Update authorities (add new, skip existing to preserve customizations)
  if (appAttributes.authorities && Array.isArray(appAttributes.authorities)) {
    const authorityManager = new AuthorityManager();
    const existingAuthoritiesResult = await authorityManager.readRecords(
      { fields: { app: appId } },
      client,
    );
    const existingAuthorityIds = new Set(
      existingAuthoritiesResult.records.map((a) => a.id),
    );
    const authorityTable = await authorityManager.getTable();

    for (const authority of appAttributes.authorities) {
      const authorityId = `${appId}:${authority.id}`;
      if (!existingAuthorityIds.has(authorityId)) {
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
          { id: authorityId, client },
        );
      }
    }
  }
}

interface UpgradeSnapshot {
  apiRoutes: Array<{ id: string; data: any }>;
  applets: Array<{ id: string; data: any }>;
  tables: Array<{ id: string; data: any; fields: Array<{ id: string; data: any }> }>;
  agents: Array<{ id: string; data: any }>;
  /** IDs of authorizations that existed before the upgrade */
  authorizationIds: string[];
  /** IDs of authorities that existed before the upgrade */
  authorityIds: string[];
}

/**
 * Capture a snapshot of all component records for an app before an upgrade.
 */
async function captureUpgradeSnapshot(appId: string): Promise<UpgradeSnapshot> {
  const apiRouteManager = new ApiRouteManager();
  const appletManager = new AppletManager();
  const tableManager = new TableManager();
  const fieldManager = new FieldManager();
  const agentManager = new AgentManager();
  const authorizationManager = new AuthorizationManager();
  const authorityManager = new AuthorityManager();

  const [routesResult, appletsResult, tablesResult, agentsResult, authsResult, authoritiesResult] =
    await Promise.all([
      apiRouteManager.readRecords({ fields: { app: appId } }),
      appletManager.readRecords({}),
      tableManager.readRecords({}),
      agentManager.readRecords({ fields: { app: appId } }),
      authorizationManager.readRecords({ fields: { app: appId } }),
      authorityManager.readRecords({ fields: { app: appId } }),
    ]);

  const appApplets = appletsResult.records.filter((a) => a.data.app === appId);
  const appTables = tablesResult.records.filter((t) => t.data.app === appId);

  const tablesWithFields = await Promise.all(
    appTables.map(async (table) => {
      const fieldsResult = await fieldManager.readRecords({});
      const tableFields = fieldsResult.records.filter(
        (f) => (f.data as any).app === appId && (f.data as any).table_name === table.data.table_name,
      );
      return {
        id: table.id,
        data: table.data,
        fields: tableFields.map((f) => ({ id: f.id, data: f.data })),
      };
    }),
  );

  return {
    apiRoutes: routesResult.records.map((r) => ({ id: r.id, data: r.data })),
    applets: appApplets.map((a) => ({ id: a.id, data: a.data })),
    tables: tablesWithFields,
    agents: agentsResult.records.map((a) => ({ id: a.id, data: a.data })),
    authorizationIds: authsResult.records.map((a) => a.id),
    authorityIds: authoritiesResult.records.map((a) => a.id),
  };
}

/**
 * Restore all component records for an app to a previously captured snapshot.
 * Called when the install hook fails after the upgrade transaction has committed.
 */
async function rollbackUpgrade(
  appId: string,
  existingApp: { data: any },
  snapshot: UpgradeSnapshot,
): Promise<void> {
  const appManager = new AppManager();
  const apiRouteManager = new ApiRouteManager();
  const appletManager = new AppletManager();
  const tableManager = new TableManager();
  const fieldManager = new FieldManager();
  const agentManager = new AgentManager();
  const authorizationManager = new AuthorizationManager();
  const authorityManager = new AuthorityManager();

  await withTransaction(async (client) => {
    // Restore app metadata
    await appManager.updateRecord(await appManager.getTable(), appId, existingApp.data, { client });

    // Restore API routes: delete current, recreate old
    const currentRoutes = await apiRouteManager.readRecords({ fields: { app: appId } }, client);
    for (const route of currentRoutes.records) {
      await apiRouteManager.deleteRecord(route.id, { client });
    }
    const apiRouteTable = await apiRouteManager.getTable();
    for (const route of snapshot.apiRoutes) {
      await apiRouteManager.createRecord(apiRouteTable, route.data, { id: route.id, client });
    }

    // Restore applets: delete current, recreate old
    const currentApplets = await appletManager.readRecords({}, client);
    for (const applet of currentApplets.records.filter((a) => a.data.app === appId)) {
      await appletManager.deleteRecord(applet.id, { client });
    }
    const appletTable = await appletManager.getTable();
    for (const applet of snapshot.applets) {
      await appletManager.createRecord(appletTable, applet.data, { id: applet.id, client });
    }

    // Restore tables and fields: delete current, recreate old
    const currentTables = await tableManager.readRecords({}, client);
    for (const table of currentTables.records.filter((t) => t.data.app === appId)) {
      await fieldManager.deleteTableFields(appId, table.data.table_name, client);
      await tableManager.deleteTable(appId, table.data.table_name, client);
    }
    for (const { data: tableData, fields } of snapshot.tables) {
      await tableManager.createTable(appId, tableData.table_name, tableData, client);
      const fieldTable = await fieldManager.getTable();
      for (const field of fields) {
        await fieldManager.createRecord(fieldTable, field.data, { id: field.id, client });
      }
    }

    // Restore agents: delete current, recreate old (preserving runtime state)
    const currentAgents = await agentManager.readRecords({ fields: { app: appId } }, client);
    for (const agent of currentAgents.records) {
      await agentManager.deleteRecord(agent.id, { client });
    }
    const agentTable = await agentManager.getTable();
    for (const agent of snapshot.agents) {
      await agentManager.createRecord(agentTable, agent.data, { id: agent.id, client });
    }

    // Delete any authorizations that were added during the upgrade
    const snapshotAuthIds = new Set(snapshot.authorizationIds);
    const currentAuths = await authorizationManager.readRecords({ fields: { app: appId } }, client);
    for (const auth of currentAuths.records) {
      if (!snapshotAuthIds.has(auth.id)) {
        await authorizationManager.deleteRecord(auth.id, { client });
      }
    }

    // Delete any authorities that were added during the upgrade
    const snapshotAuthorityIds = new Set(snapshot.authorityIds);
    const currentAuthorities = await authorityManager.readRecords({ fields: { app: appId } }, client);
    for (const authority of currentAuthorities.records) {
      if (!snapshotAuthorityIds.has(authority.id)) {
        await authorityManager.deleteRecord(authority.id, { client });
      }
    }
  });
}

/**
 * Roll back a failed installation by removing all DB records created during install.
 * Mirrors the inverse of installAppComponents + the app record itself, all in one transaction.
 */
async function rollbackInstallation(appId: string): Promise<void> {
  await withTransaction(async (client) => {
    // Agents
    const agentManager = new AgentManager();
    const agentsResult = await agentManager.readRecords({ fields: { app: appId } }, client);
    for (const agent of agentsResult.records) {
      await agentManager.deleteRecord(agent.id, { client });
    }

    // Tables and fields (no user records yet on fresh install)
    const tableManager = new TableManager();
    const fieldManager = new FieldManager();
    const tablesResult = await tableManager.readRecords({}, client);
    for (const table of tablesResult.records.filter((t) => t.data.app === appId)) {
      await fieldManager.deleteTableFields(appId, table.data.table_name, client);
      await tableManager.deleteTable(appId, table.data.table_name, client);
    }

    // API routes
    const apiRouteManager = new ApiRouteManager();
    const routesResult = await apiRouteManager.readRecords({ fields: { app: appId } }, client);
    for (const route of routesResult.records) {
      await apiRouteManager.deleteRecord(route.id, { client });
    }

    // Applets
    const appletManager = new AppletManager();
    const appletsResult = await appletManager.readRecords({}, client);
    for (const applet of appletsResult.records.filter((a) => a.data.app === appId)) {
      await appletManager.deleteRecord(applet.id, { client });
    }

    // Authorizations
    const authorizationManager = new AuthorizationManager();
    const authsResult = await authorizationManager.readRecords({ fields: { app: appId } }, client);
    for (const auth of authsResult.records) {
      await authorizationManager.deleteRecord(auth.id, { client });
    }

    // App-specific authority and any contextual authorities created by this app
    const authorityManager = new AuthorityManager();
    await authorityManager.deleteAppSpecificAuthority(appId, { client });
    const authoritiesResult = await authorityManager.readRecords({ fields: { app: appId } }, client);
    for (const authority of authoritiesResult.records) {
      await authorityManager.deleteRecord(authority.id, { client });
    }

    // App record itself
    const appManager = new AppManager();
    await appManager.deleteRecord(appId, { client });
  });
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
  version: AppVersion,
  context: {
    priorVersion?: string;
    currentVersion: string;
    appId: string;
  },
): Promise<void> {
  const appDir = path.join(storagePath, "apps", appId, versionDir(version));
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
    // Read admin user ID so the hook can perform ownership operations
    const adminUserIdRecord = await new SettingManager().readRecord("administratorUserId");
    const adminUserId = adminUserIdRecord?.data.value ?? null;

    // Create an SDK context so the hook can interact with records and the filesystem
    let ctx: Context | null = null;
    try {
      ctx = await Context.create(appId, adminUserId);
    } catch {
      // Non-fatal — the hook can handle a null ctx
    }

    await installationHook.OnInstallation({
      ...context,
      storagePath,
      adminUserId,
      ctx,
    });
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

  // Save files (filesystem, outside transaction)
  await saveAppFiles(appAttributes.id, storagePath, packageData);

  // All DB operations in a single transaction
  const appManager = new AppManager();
  await withTransaction(async (client) => {
    // Create app record
    await appManager.createRecord(
      await appManager.getTable(),
      {
        label: appAttributes.name,
        version: appAttributes.version,
        author: appAttributes.author,
        contact_email: appAttributes.contactEmail || "",
        description: appAttributes.description,
        dependencies: appAttributes.dependencies || {},
        required_permissions: appAttributes.requiredPermissions || [],
      },
      { id: appAttributes.id, client },
    );

    // Install components
    await installAppComponents(appAttributes.id, appAttributes, client);

    // Assign approved permissions to the app-specific authority
    if (approvedPermissions && approvedPermissions.length > 0) {
      const authorityManager = new AuthorityManager();
      const appAuthority = await authorityManager.readAppSpecificAuthority(
        appAttributes.id,
        client,
      );
      if (appAuthority) {
        await authorityManager.updateAppSpecificAuthority(appAttributes.id, {
          ...appAuthority.data,
          authorizations: [
            ...appAuthority.data.authorizations,
            ...approvedPermissions,
          ],
        }, { client });
      }
    }
  });

  // Execute installation hook (outside transaction — needs committed data)
  try {
    await executeInstallHook(appAttributes.id, storagePath, appAttributes.version, {
      priorVersion: undefined,
      currentVersion: formatVersion(appAttributes.version),
      appId: appAttributes.id,
    });
  } catch (error: any) {
    // Clean up on hook failure — roll back all DB records and delete the versioned dir
    const vDir = path.join(storagePath, "apps", appAttributes.id, versionDir(appAttributes.version));
    await rollbackInstallation(appAttributes.id);
    await fs.rm(vDir, { recursive: true, force: true });
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

  await withTransaction(async (client) => {
    // Update system app record
    await appManager.updateRecord(await appManager.getTable(), "system", {
      label: SYSTEM_APP_METADATA.name,
      version: SYSTEM_APP_METADATA.version,
      author: SYSTEM_APP_METADATA.author,
      contact_email: SYSTEM_APP_METADATA.contact_email,
      description: SYSTEM_APP_METADATA.description,
      dependencies: SYSTEM_APP_METADATA.dependencies,
    }, { client });

    // Update API routes
    const apiRouteManager = new ApiRouteManager();
    const allApiRoutes = await apiRouteManager.readRecords({}, client);
    const existingSystemApiRoutes = allApiRoutes.records.filter(
      (route) => route.data.app === "system",
    );

    for (const route of existingSystemApiRoutes) {
      await apiRouteManager.deleteRecord(route.id, { client });
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
          { id: `system:${apiRoute.path}:${apiRoute.method}`, client },
        );
      }
    }

    // Update applets
    const appletManager = new AppletManager();
    const allApplets = await appletManager.readRecords({}, client);
    const existingSystemApplets = allApplets.records.filter(
      (applet) => applet.data.app === "system",
    );

    for (const applet of existingSystemApplets) {
      await appletManager.deleteRecord(applet.id, { client });
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
            settings: applet.settings || [],
          },
          { id: `system:${applet.id}`, client },
        );
      }
    }

    // Update tables and fields
    if (SYSTEM_APP_METADATA.tables && Array.isArray(SYSTEM_APP_METADATA.tables)) {
      const tableManager = new TableManager();
      const fieldManager = new FieldManager();

      // MIGRATION: Check if fields table exists, if not this is the first upgrade with the new field system
      const fieldsTableExists = await tableManager.loadTable("system", "fields");
      if (!fieldsTableExists) {
        await new LogManager().info(
          "system",
          "Migrating table fields to separate field records...",
        );

        // Migrate existing table fields to field records
        const allTablesResult = await tableManager.readRecords({}, client);
        for (const tableRecord of allTablesResult.records) {
          const tableData = tableRecord.data as any;
          if (tableData.fields && Array.isArray(tableData.fields)) {
            const [appId, tableName] = tableRecord.id.split(":");

            for (const field of tableData.fields) {
              await fieldManager.createField(appId, tableName, field, client);
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

      const allTables = await tableManager.listRecords(client);
      const existingTables = allTables.filter((t) => t.startsWith("system:"));
      const existingTableNames = new Set(
        existingTables.map((t: any) =>
          typeof t === "string" ? t.split(":")[1] : t.data.table_name,
        ),
      );

      for (const table of SYSTEM_APP_METADATA.tables) {
        if (existingTableNames.has(table.name)) {
          await fieldManager.deleteTableFields("system", table.name, client);
          await tableManager.deleteTable("system", table.name, client);
        }

        await tableManager.createTable("system", table.name, {
          table_name: table.name,
          app: "system",
          description: table.description || "",
        }, client);

        if (table.fields && Array.isArray(table.fields)) {
          for (const field of table.fields) {
            await fieldManager.createField("system", table.name, field as any, client);
          }
        }

        existingTableNames.delete(table.name);
      }

      for (const tableName of existingTableNames) {
        await tableManager.deleteTable("system", tableName, client);
      }
    }

    // Update authorizations and authorities
    const authorizationManager = new AuthorizationManager();
    const authorityManager = new AuthorityManager();

    // Create new system authorizations (skip existing to preserve customizations)
    const authorizationsResult = await authorizationManager.readRecords({}, client);
    const existingAuthorizationIds = new Set(authorizationsResult.records.map((a) => a.id));

    for (const auth of SYSTEM_APP_METADATA.authorizations) {
      const authId = "system:" + auth.id;
      if (!existingAuthorizationIds.has(authId)) {
        await authorizationManager.createRecord(
          await authorizationManager.getTable(),
          {
            app: "system",
            name: auth.name,
            description: auth.description,
            contextual: auth.contextual,
            target: (auth as any).target || "user",
          },
          { id: authId, client },
        );
      }
    }

    // Create new system authorities (skip existing to preserve customizations)
    const authoritiesResult = await authorityManager.readRecords({}, client);
    const existingAuthorityIds = new Set(authoritiesResult.records.map((a) => a.id));

    for (const auth of SYSTEM_APP_METADATA.authorities) {
      const authorityId = "system:" + auth.id;
      if (!existingAuthorityIds.has(authorityId)) {
        await authorityManager.createRecord(
          await authorityManager.getTable(),
          {
            name: auth.name,
            authorizations: auth.authorizations,
            apps: auth.apps,
            contextual: auth.contextual || false,
            app: auth.contextual ? "system" : undefined,
          },
          { id: authorityId, client },
        );
      }
    }
  });

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

  // Stop running agents before upgrade
  const agentManager = new AgentManager();
  const appAgentsResult = await agentManager.readRecords({ fields: { app: appId } });
  const appAgents = appAgentsResult.records;

  for (const agentRecord of appAgents) {
    if (agentRecord.data.status === "running") {
      const [agentAppId, agentName] = agentRecord.id.split(":");
      await new Agent(agentAppId, agentName).stop();
    }
  }

  // Versioned directory paths — old version stays untouched until success
  const oldVDir = versionDir(existingApp.data.version);
  const newVDir = versionDir(appAttributes.version);
  const appBaseDir = path.join(storagePath, "apps", appId);
  const newAppDir = path.join(appBaseDir, newVDir);

  // Snapshot current component state before the transaction so we can fully
  // restore it if the install hook fails after the DB has already committed
  const snapshot = await captureUpgradeSnapshot(appId);

  // Write new files into the new version subdirectory
  await saveAppFiles(appId, storagePath, packageData);

  try {
    // All DB operations in a single transaction
    await withTransaction(async (client) => {
      await appManager.updateRecord(await appManager.getTable(), appId, {
        label: appAttributes.name,
        version: appAttributes.version,
        author: appAttributes.author,
        contact_email: appAttributes.contactEmail || "",
        description: appAttributes.description,
        dependencies: appAttributes.dependencies || {},
        required_permissions: appAttributes.requiredPermissions || [],
      }, { client });

      await updateAppComponents(appId, appAttributes, client);
    });

    // Execute installation hook (outside transaction — needs committed data)
    try {
      await executeInstallHook(appId, storagePath, appAttributes.version, {
        priorVersion: formatVersion(existingApp.data.version),
        currentVersion: formatVersion(appAttributes.version),
        appId,
      });
    } catch (error: any) {
      // Hook failed — fully restore the DB to pre-upgrade state, then delete the new version dir
      try {
        await rollbackUpgrade(appId, existingApp, snapshot);
      } catch (rollbackError) {
        console.error("Failed to roll back upgrade after hook failure:", rollbackError);
      }
      await fs.rm(newAppDir, { recursive: true, force: true });
      throw new Error(`Installation hook failed: ${error.message}`);
    }

    // Success — delete the old version directory if it differs from the new one
    if (oldVDir !== newVDir) {
      await fs.rm(path.join(appBaseDir, oldVDir), { recursive: true, force: true });
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
    // DB transaction failed or other error — delete the new version directory
    await fs.rm(newAppDir, { recursive: true, force: true });
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

  // Hash password outside transaction (CPU-bound)
  const passwordHash = await bcrypt.hash(adminUser.password, 10);

  await withTransaction(async (client) => {
    // Create the system app
    const appManager = new AppManager();
    await appManager.createRecord(
      await appManager.getTable(),
      {
        label: SYSTEM_APP_METADATA.name,
        version: SYSTEM_APP_METADATA.version,
        author: SYSTEM_APP_METADATA.author,
        contact_email: SYSTEM_APP_METADATA.contact_email,
        description: SYSTEM_APP_METADATA.description,
        dependencies: SYSTEM_APP_METADATA.dependencies,
        required_permissions: [],
      },
      { id: "system", client },
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
          { id: `system:${apiRoute.path}:${apiRoute.method}`, client },
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
          { id: `system:${applet.id}`, client },
        );
      }
    }

    // Create all table definitions
    const tableManager = new TableManager();
    const fieldManager = new FieldManager();

    for (const table of SYSTEM_APP_METADATA.tables) {
      // Create the table definition (without fields)
      await tableManager.createTable("system", table.name, {
        table_name: table.name,
        app: "system",
        description: table.description,
      }, client);

      // Create each field definition separately
      if (table.fields && Array.isArray(table.fields)) {
        for (const field of table.fields) {
          await fieldManager.createField("system", table.name, field as any, client);
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
        { id: "system:" + authorization.id, client },
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
        { id: "system:" + authority.id, client },
      );
    }

    // Create the administrative user with 'system:admin' authority
    const user = await userManager.createRecord(await userManager.getTable(), {
      username: adminUser.username,
      email: adminUser.email,
      display_name: adminUser.displayName,
      password_hash: passwordHash,
      authority_id: "system:admin",
      is_active: true,
    }, { client });

    // Mark setup as complete
    const settingManager = new SettingManager();
    await settingManager.createRecord(
      await settingManager.getTable(),
      { value: user.id },
      { id: "administratorUserId", client },
    );
  });
}
