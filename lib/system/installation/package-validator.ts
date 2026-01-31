import AdmZip from "adm-zip";
import AppManager from "@/lib/database/managers/app";
import type AppVersion from "@/lib/database/types/appVersion";
import AppMetadata from "@/lib/system/installation/types/package-metadata";
import SettingManager from "@/lib/database/managers/setting";
import TableManager from "@/lib/database/managers/table";
import { isValidCronString } from "@/lib/system/cron";
import { formatVersion, isVersionGreaterOrEqual } from "@/lib/system/version";

export interface AppValidationError {
  field: string;
  error: string;
  context?: any;
}

/**
 * Validate app package attributes, widgets, applets, and dependencies
 * @param appAttributes The app.json attributes
 * @param zip The AdmZip instance for component validation
 * @param options Validation options
 * @throws Error if validation fails
 */
export async function validateAppPackage(
  appAttributes: AppMetadata,
  zip: AdmZip,
  options: {
    isUpgrade?: boolean;
    existingVersion?: AppVersion;
  } = {}
): Promise<void> {
  // Validate required attributes
  if (
    !appAttributes.id ||
    !appAttributes.name ||
    !appAttributes.version ||
    !appAttributes.author ||
    !appAttributes.description
  ) {
    throw new Error(
      `Missing required app attributes (id: ${
        appAttributes.id || "missing"
      }, name: ${appAttributes.name || "missing"}, version: ${
        appAttributes.version || "missing"
      }, author: ${appAttributes.author || "missing"}, description: ${
        appAttributes.description ? "present" : "missing"
      })`
    );
  }

  // Validate version format
  if (
    (!appAttributes.version.major && appAttributes.version.major !== 0) ||
    (!appAttributes.version.minor && appAttributes.version.minor !== 0) ||
    (!appAttributes.version.dev && appAttributes.version.dev !== 0)
  ) {
    throw new Error(
      `Invalid version format for '${appAttributes.id}'. Version must have major, minor, and dev properties.`
    );
  }

  // Safety check: prevent 'system' from being used as an app ID for new installs
  if (appAttributes.id === "system" && !options.isUpgrade) {
    throw new Error(
      "Invalid app ID: 'system' is a reserved keyword and cannot be used as an app ID"
    );
  }

  // Check version for upgrades
  if (options.isUpgrade && options.existingVersion) {
    const newV = appAttributes.version;
    const oldV = options.existingVersion;
    const versionComparison =
      newV.major - oldV.major || newV.minor - oldV.minor || newV.dev - oldV.dev;

    if (versionComparison === 0) {
      const settingManager = new SettingManager();
      const inplaceRecord = await settingManager.readRecord("appInplaceEnabled");
      const inplaceEnabled = inplaceRecord?.data.value === "true";

      if (!inplaceEnabled) {
        throw new Error(
          `Cannot upgrade to the same version ${formatVersion(
            appAttributes.version
          )}`
        );
      }
    }
  }

  // Validate dependencies - check for self-dependency
  if (
    appAttributes.dependencies &&
    appAttributes.dependencies[appAttributes.id]
  ) {
    throw new Error(`Plugin '${appAttributes.id}' cannot depend on itself`);
  }

  // Validate dependencies - check that all required dependencies are installed
  if (
    appAttributes.dependencies &&
    Object.keys(appAttributes.dependencies).length > 0
  ) {
    const appManager = new AppManager();
    const allAppsResult = await appManager.readRecords();
    const installedApps = new Map(
      allAppsResult.records.map((app) => [app.id, app])
    );

    for (const [depId, requiredVersion] of Object.entries(
      appAttributes.dependencies
    )) {
      const installedApp = installedApps.get(depId);

      if (!installedApp) {
        throw new Error(`Required dependency '${depId}' is not installed`);
      }

      if (
        !isVersionGreaterOrEqual(
          installedApp.data.version,
          requiredVersion as AppVersion
        )
      ) {
        const installedVersionStr = formatVersion(installedApp.data.version);
        const requiredVersionStr = formatVersion(requiredVersion as AppVersion);
        throw new Error(
          `Dependency '${depId}' version ${installedVersionStr} does not meet minimum requirement ${requiredVersionStr}`
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
        throw new Error(
          `Applet at index ${i} is missing required fields (id, label, description, component, or target)`
        );
      }

      // Check for duplicate applet IDs
      if (appletIds.has(applet.id)) {
        throw new Error(`Duplicate applet ID found: ${applet.id}`);
      }
      appletIds.add(applet.id);

      // Validate target
      if (
        !["app", "home", "user-settings", "system-settings", "guest"].includes(
          applet.target
        )
      ) {
        throw new Error(
          `Applet '${applet.id}' has invalid target. Must be 'app', 'home', 'user-settings', 'system-settings', or 'guest'`
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
        throw new Error(
          `Applet '${
            applet.id
          }' component not found. Expected one of: ${componentPaths.join(", ")}`
        );
      }
    }
  }

  const errors: AppValidationError[] = [];

  // Validate no duplicate table names
  if (appAttributes.tables) {
    const tableNames = new Set<string>();
    for (const table of appAttributes.tables) {
      if (tableNames.has(table.name)) {
        errors.push({
          field: "tables",
          error: `Duplicate table name: ${table.name}`,
          context: { tableName: table.name },
        });
      }
      tableNames.add(table.name);
    }

    // Validate no duplicate field names within each table
    for (const table of appAttributes.tables) {
      const fieldNames = new Set<string>();
      for (const field of table.fields) {
        if (fieldNames.has(field.name)) {
          errors.push({
            field: "tables",
            error: `Duplicate field name '${field.name}' in table '${table.name}'`,
            context: { tableName: table.name, fieldName: field.name },
          });
        }
        fieldNames.add(field.name);
      }
    }
  }

  // Validate no duplicate authority names
  if (appAttributes.authorities) {
    const authorityNames = new Set<string>();
    for (const authority of appAttributes.authorities) {
      if (authorityNames.has(authority.name)) {
        errors.push({
          field: "authorities",
          error: `Duplicate authority name: ${authority.name}`,
          context: { authorityName: authority.name },
        });
      }
      authorityNames.add(authority.name);
    }
  }

  // Validate no duplicate authorization names
  if (appAttributes.authorizations) {
    const authorizationNames = new Set<string>();
    for (const authorization of appAttributes.authorizations) {
      if (authorizationNames.has(authorization.name)) {
        errors.push({
          field: "authorizations",
          error: `Duplicate authorization name: ${authorization.name}`,
          context: { authorizationName: authorization.name },
        });
      }
      authorizationNames.add(authorization.name);
    }
  }

  // Validate no duplicate API route names
  if (appAttributes.apiRoutes) {
    const apiRouteKeys = new Set<string>();
    for (const apiRoute of appAttributes.apiRoutes) {
      const routeKey = `${apiRoute.method}:${apiRoute.path}`;
      if (apiRouteKeys.has(routeKey)) {
        errors.push({
          field: "apiRoutes",
          error: `Duplicate API route: ${apiRoute.method} ${apiRoute.path}`,
          context: { method: apiRoute.method, path: apiRoute.path },
        });
      }
      apiRouteKeys.add(routeKey);
    }
  }

  // Validate agents
  if (appAttributes.agents && Array.isArray(appAttributes.agents)) {
    const agentNames = new Set<string>();
    for (const agent of appAttributes.agents) {
      // Validate no duplicate agent names
      if (agentNames.has(agent.name)) {
        errors.push({
          field: "agents",
          error: `Duplicate agent name: ${agent.name}`,
          context: { agentName: agent.name },
        });
      }
      agentNames.add(agent.name);

      // Validate CRON string if provided
      if (agent.cron) {
        if (!isValidCronString(agent.cron)) {
          errors.push({
            field: "agents",
            error: `Invalid CRON string for agent '${agent.name}': ${agent.cron}`,
            context: { agentName: agent.name, cron: agent.cron },
          });
        }
      }
    }
  }

  // Validate relationship fields reference existing tables
  if (appAttributes.tables) {
    const tableManager = new TableManager();
    const allTables = await tableManager.readRecords({});
    const existingTableNames = new Set<string>();

    // Add tables from this app that are being validated
    for (const table of appAttributes.tables) {
      existingTableNames.add(`${appAttributes.id}:${table.name}`);
    }

    // Add existing tables from the system
    for (const tableRecord of allTables.records) {
      existingTableNames.add(
        `${tableRecord.data.app}:${tableRecord.data.tableName}`
      );
    }

    for (const table of appAttributes.tables) {
      for (const field of table.fields) {
        if (field.type === "relationship") {
          if (field.relatedTo) {
            // Check if the related table exists
            // relatedTo format can be "tableName" or "appAttributes.id:tableName"
            let relatedTableKey = field.relatedTo;
            if (!relatedTableKey.includes(":")) {
              // If no app prefix, assume same app
              relatedTableKey = `${appAttributes.id}:${relatedTableKey}`;
            }

            if (!existingTableNames.has(relatedTableKey)) {
              errors.push({
                field: "tables",
                error: `Relationship field '${field.name}' in table '${table.name}' references non-existent table '${field.relatedTo}'`,
                context: {
                  tableName: table.name,
                  fieldName: field.name,
                  relatedTo: field.relatedTo,
                },
              });
            }
          } else {
            errors.push({
              field: "tables",
              error: `Relationship field '${field.name}' in table '${table.name}' does not specify relatedTo`,
              context: {
                tableName: table.name,
                field: field.name,
              },
            });
          }
        }
      }
    }

    // Validate formula fields are not required
    for (const table of appAttributes.tables) {
      for (const field of table.fields) {
        if (field.type === "formula" && field.required === true) {
          errors.push({
            field: "tables",
            error: `Formula field '${field.name}' in table '${table.name}' cannot be required`,
            context: {
              tableName: table.name,
              fieldName: field.name,
            },
          });
        }
      }
    }

    if (errors.length) {
      throw new Error(
        `App validation error: ${errors.map((e) => e.error).join(", ")}`
      );
    }
  }
}
