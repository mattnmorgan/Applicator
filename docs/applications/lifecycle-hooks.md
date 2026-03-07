# Lifecycle Hooks

Lifecycle hooks allow your app to run custom code during installation, upgrades, and uninstallation.

## OnInstallation Hook

Called during fresh installation and upgrades after the framework has set up tables, authorizations, agents, and applets.

### Location

```
src/system/install.ts → dist/system/install.js
```

### Signature

```typescript
export async function OnInstallation(context: {
  priorVersion: string | undefined;  // undefined for fresh install, "1.0.0" for upgrades
  currentVersion: string;             // Current version being installed (e.g., "1.2.0")
  appId: string;                      // Your app's ID
  storagePath: string;                // Absolute path to the system storage directory
  adminUserId: string | null;         // User ID of the system administrator, if set
  ctx: Context | null;                // SDK Context instance scoped to the installing user
}): Promise<void>
```

### Additional Context Properties

| Property | Type | Description |
|---|---|---|
| `storagePath` | `string` | Absolute OS path to the system storage root. Useful for direct filesystem operations outside the SDK. |
| `adminUserId` | `string \| null` | ID of the system administrator user configured at first-time setup. `null` if no admin has been set. |
| `ctx` | `Context \| null` | SDK `Context` instance. Provides access to `ctx.user()`, `ctx.recordManager()`, `ctx.contextualAuthorityManager`, `ctx.systemFileManager`, etc. `null` if the context could not be created. |

The `ctx` instance is scoped to the admin user (`adminUserId`). Call `await ctx.user()` to get the full user object.

### Example

```typescript
// src/system/install.ts

export async function OnInstallation(context: {
  priorVersion: string | undefined;
  currentVersion: string;
  appId: string;
  storagePath: string;
  adminUserId: string | null;
  ctx: any;
}) {
  if (context.priorVersion === undefined) {
    // Fresh installation
    console.log(`[${context.appId}] Fresh install of v${context.currentVersion}`);

    const { ctx } = context;
    if (ctx) {
      const user = await ctx.user();
      if (user) {
        // Use the SDK to create initial records owned by the installing user
        const manager = ctx.recordManager("my-app", "settings");
        const table = await manager.getTable();
        await manager.createRecord(table, { owner: user.id, value: "default" });
      }
    }

  } else {
    // Upgrade from previous version
    console.log(`[${context.appId}] Upgrading from v${context.priorVersion} to v${context.currentVersion}`);

    // Run migrations based on version
    await runMigrations(context.priorVersion, context.currentVersion);
  }
}

async function runMigrations(fromVersion: string, toVersion: string) {
  // Parse versions and run appropriate migrations
  const [fromMajor] = fromVersion.split('.').map(Number);
  const [toMajor] = toVersion.split('.').map(Number);

  if (fromMajor < 2 && toMajor >= 2) {
    // Major version upgrade migration
    console.log('Running v2 migration...');
  }
}
```

### Execution Context

The hook runs **after** the framework has:
1. Extracted and validated the package
2. Saved app files (UI bundle, API handlers, assets)
3. Created/updated the app database record
4. Set up tables and fields
5. Created applets
6. Registered authorizations and authorities
7. Configured agents

If the hook throws an error during **fresh installation**, the framework will:
- Roll back all installed database records (routes, applets, tables, fields, authorizations, authorities, agents, and the app record itself) atomically
- Delete the versioned app directory (e.g. `apps/{appId}/v1.0.0/`)
- Throw the error to the installer

If the hook throws an error during **upgrade**, the framework will:
- Restore the full pre-upgrade database state atomically (routes, applets, tables, fields, authorizations, authorities, agents, and the app version) from a snapshot taken before the upgrade began
- Delete the new versioned app directory
- Keep the app running at the prior version

---

## OnUninstallation Hook

Called before the app is uninstalled, allowing cleanup of custom resources.

### Location

```
src/system/uninstall.ts → dist/system/uninstall.js
```

### Signature

```typescript
export async function OnUninstallation(context: {
  version: string;    // Version being uninstalled (e.g., "1.2.0")
  appId: string;      // Your app's ID
}): Promise<void>
```

### Example

```typescript
// src/system/uninstall.ts

export async function OnUninstallation(context: {
  version: string;
  appId: string;
}) {
  console.log(`[${context.appId}] Uninstalling v${context.version}`);

  // Perform custom cleanup
  await cleanupExternalResources();
  await notifyExternalServices();

  console.log(`[${context.appId}] Cleanup complete`);
}

async function cleanupExternalResources() {
  // Clean up any resources not managed by the framework
  // - External API registrations
  // - Third-party service connections
  // - Cached data in external systems
}

async function notifyExternalServices() {
  // Notify external services about app removal if needed
}
```

### Execution Context

The hook runs **before** the framework:
1. Stops and removes agents
2. Deletes tables and their records
3. Removes API routes
4. Deletes applets
5. Removes authorizations and authorities
6. Deletes the app directory

If the hook throws an error, the uninstallation is aborted.

---

## Best Practices

### 1. Handle Both Fresh Install and Upgrade

```typescript
export async function OnInstallation(context) {
  if (context.priorVersion === undefined) {
    // Fresh install logic
  } else {
    // Upgrade logic
  }
}
```

### 2. Use Semantic Versioning for Migrations

```typescript
function parseVersion(version: string): [number, number, number] {
  const parts = version.split('.').map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

async function runMigrations(from: string, to: string) {
  const [fromMajor, fromMinor] = parseVersion(from);
  const [toMajor, toMinor] = parseVersion(to);

  // Run migrations in order
  if (fromMajor < 1 || (fromMajor === 1 && fromMinor < 2)) {
    if (toMajor > 1 || (toMajor === 1 && toMinor >= 2)) {
      await migrateToV1_2();
    }
  }

  if (fromMajor < 2) {
    if (toMajor >= 2) {
      await migrateToV2();
    }
  }
}
```

### 3. Make Operations Idempotent

Hooks may be re-run if installation fails and retries. Ensure operations are safe to repeat:

```typescript
async function initializeDefaultData() {
  // Check if already initialized before creating
  const existing = await checkForExistingData();
  if (!existing) {
    await createDefaultRecords();
  }
}
```

### 4. Log Important Operations

```typescript
export async function OnInstallation(context) {
  console.log(`[${context.appId}] Starting installation...`);

  try {
    await doWork();
    console.log(`[${context.appId}] Installation complete`);
  } catch (error) {
    console.error(`[${context.appId}] Installation failed:`, error);
    throw error;
  }
}
```

### 5. Clean Up in Uninstall

Don't leave orphaned data in external systems:

```typescript
export async function OnUninstallation(context) {
  // Clean up anything not automatically removed by the framework
  await removeExternalWebhooks();
  await clearExternalCache();
  await deregisterFromThirdPartyServices();
}
```

---

## Webpack Configuration

Hooks are compiled separately from the frontend bundle. Include them in your API webpack config:

```javascript
// webpack.api.config.js
const systemDir = path.resolve(__dirname, "src/system");
if (fs.existsSync(systemDir)) {
  const systemFiles = fs.readdirSync(systemDir)
    .filter(file => file.endsWith(".ts"))
    .reduce((entries, file) => {
      const name = file.replace(".ts", "");
      entries[`system/${name}`] = `./src/system/${file}`;
      return entries;
    }, {});

  Object.assign(handlers, systemFiles);
}
```

This produces:
- `dist/system/install.js`
- `dist/system/uninstall.js`
