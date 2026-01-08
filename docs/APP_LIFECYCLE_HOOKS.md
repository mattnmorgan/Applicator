# App Lifecycle Hooks

The Vibe Applicator plugin system supports optional **lifecycle hooks** that allow apps to perform setup, migrations, cleanup, or other necessary operations during installation, upgrade, and uninstallation.

## Overview

The plugin system provides two lifecycle hooks:

1. **OnInstallation** - Called when an app is installed or upgraded
2. **OnUninstallation** - Called when an app is uninstalled

## OnInstallation Hook

The `OnInstallation` hook is called in two scenarios:

1. **Fresh Installation** - When the app is installed for the first time (`priorVersion` will be `undefined`)
2. **Upgrade** - When the app is upgraded from one version to another (`priorVersion` will contain the previous version string)

### When is it called?

- **Fresh Install**: After all app files are saved to disk and the app is registered in the database
- **Upgrade**: After the new app files replace the old ones and the database is updated

### Creating an OnInstallation Handler

Create a file at `src/system/install.ts` in your app:

```typescript
export async function OnInstallation(context: {
  priorVersion: string | undefined;
  currentVersion: string;
  appId: string;
}) {
  if (context.priorVersion === undefined) {
    // Fresh installation
    console.log(`Installing ${context.appId} v${context.currentVersion}`);
    await performInitialSetup();
  } else {
    // Upgrade from previous version
    console.log(
      `Upgrading ${context.appId} from ${context.priorVersion} to ${context.currentVersion}`
    );
    await performUpgradeMigration(context.priorVersion, context.currentVersion);
  }
}

async function performInitialSetup() {
  // Example: Create default records, initialize settings, etc.
}

async function performUpgradeMigration(from: string, to: string) {
  // Example: Migrate data from old schema to new schema
  if (from === '1.0.0' && to === '2.0.0') {
    await migrateDataV1ToV2();
  }
}
```

### OnInstallation Context

| Property | Type | Description |
|----------|------|-------------|
| `priorVersion` | `string \| undefined` | The version being upgraded from, or `undefined` for fresh installs |
| `currentVersion` | `string` | The version being installed (e.g., "1.0.0") |
| `appId` | `string` | The ID of the app being installed |

### Error Handling

If the `OnInstallation` hook throws an error:

- **Fresh Install**: The app will be removed from the database and all files will be deleted
- **Upgrade**: The upgrade will be rolled back to the previous version

```typescript
export async function OnInstallation(context) {
  try {
    await performMigration();
  } catch (error) {
    console.error('Migration failed:', error);
    // The system will automatically rollback
    throw new Error(`Failed to migrate: ${error.message}`);
  }
}
```

## OnUninstallation Hook

The `OnUninstallation` hook is called when an app is being uninstalled from the system.

### When is it called?

The hook is called **before** any data is deleted, allowing the app to:
- Perform cleanup operations
- Archive data
- Remove external resources
- Log uninstallation events

### Creating an OnUninstallation Handler

Create a file at `src/system/uninstall.ts` in your app:

```typescript
export async function OnUninstallation(context: {
  version: string;
  appId: string;
}) {
  console.log(`Uninstalling ${context.appId} v${context.version}`);

  // Perform cleanup
  await cleanupExternalResources();
  await archiveImportantData();
  await notifyExternalServices();
}

async function cleanupExternalResources() {
  // Example: Delete webhooks, revoke API tokens, etc.
}

async function archiveImportantData() {
  // Example: Export data to file system or external service
}
```

### OnUninstallation Context

| Property | Type | Description |
|----------|------|-------------|
| `version` | `string` | The version being uninstalled (e.g., "1.0.0") |
| `appId` | `string` | The ID of the app being uninstalled |

### Error Handling

If the `OnUninstallation` hook throws an error, the uninstallation will be **aborted** and the app will remain installed.

```typescript
export async function OnUninstallation(context) {
  try {
    await performCleanup();
  } catch (error) {
    console.error('Cleanup failed:', error);
    // Abort uninstallation
    throw new Error(`Failed to cleanup: ${error.message}`);
  }
}
```

## Building and Packaging

### Include in Build

Make sure your `webpack.api.config.js` includes the lifecycle handlers:

```javascript
// The default webpack config automatically picks up all .ts files in src/system/
// So your install.ts and uninstall.ts will be built automatically to:
//   - dist/system/install.js
//   - dist/system/uninstall.js
```

### Package Structure

When you build and package your app, the lifecycle handlers will be included in the `system/` directory of the zip package:

```
my-app.zip
├── app.json
├── app.js (UI bundle)
├── app.png (icon)
├── api/
│   └── [api-handlers].js
└── system/
    ├── install.js      (OnInstallation hook)
    └── uninstall.js    (OnUninstallation hook)
```

## Best Practices

### 1. Version-Specific Migrations

Use conditional logic to handle different upgrade paths in `OnInstallation`:

```typescript
export async function OnInstallation(context) {
  if (!context.priorVersion) {
    // Fresh install
    await initializeDefaultSettings();
    return;
  }

  // Handle different upgrade paths
  const [fromMajor] = context.priorVersion.split('.');
  const [toMajor] = context.currentVersion.split('.');

  if (fromMajor === '1' && toMajor === '2') {
    await migrateV1ToV2();
  } else if (fromMajor === '2' && toMajor === '3') {
    await migrateV2ToV3();
  }

  // Always run general upgrades
  await updateIndexes();
}
```

### 2. Use the Plugin SDK

You can use the plugin SDK within lifecycle hooks:

```typescript
import { createPlugin } from '@/lib/sdk';

export async function OnInstallation(context) {
  const plugin = createPlugin(context.appId);

  if (!context.priorVersion) {
    // Fresh install - create default records
    await plugin.records.create({
      title: 'Welcome',
      content: 'Thank you for installing this app!'
    });
  } else {
    // Upgrade - migrate records
    const records = await plugin.records.list();
    for (const record of records.items) {
      const updated = transformRecordSchema(record);
      await plugin.records.update(record.id, updated);
    }
  }

  await plugin.logger.info(
    `Installation completed: v${context.currentVersion}`
  );
}
```

### 3. Idempotent Operations

Make lifecycle operations idempotent when possible:

```typescript
export async function OnInstallation(context) {
  const plugin = createPlugin(context.appId);

  // Check if migration already ran
  const migrationKey = `migration_v${context.currentVersion}_completed`;
  const migrationFile = await plugin.files.readFile(migrationKey).catch(() => null);

  if (migrationFile) {
    console.log('Migration already completed, skipping');
    return;
  }

  // Perform migration
  await doMigration();

  // Set flag
  await plugin.files.writeFile(migrationKey, 'completed');
}
```

### 4. Clean Up External Resources

Use `OnUninstallation` to clean up resources outside the app:

```typescript
export async function OnUninstallation(context) {
  const plugin = createPlugin(context.appId);

  // Archive important data
  const allRecords = await plugin.records.list();
  const archiveData = JSON.stringify(allRecords.items, null, 2);
  await plugin.files.writeFile(
    `archive_${Date.now()}.json`,
    archiveData
  );

  // Revoke API tokens or webhooks
  await revokeExternalAPIAccess();

  await plugin.logger.info('Uninstallation cleanup completed');
}
```

### 5. Logging

Always log important operations in your lifecycle hooks:

```typescript
export async function OnInstallation(context) {
  const plugin = createPlugin(context.appId);

  await plugin.logger.info(
    `Starting ${context.priorVersion ? 'upgrade' : 'installation'}`
  );

  try {
    // Perform operations
    await performMigration();
    await plugin.logger.info('Migration completed successfully');
  } catch (error: any) {
    await plugin.logger.error(`Migration failed: ${error.message}`);
    throw error;
  }
}
```

## Complete Example

Here's a complete example showing both lifecycle hooks:

### src/system/install.ts

```typescript
import { createPlugin } from '@/lib/sdk';

interface V1TaskRecord {
  title: string;
  completed: boolean;
}

interface V2TaskRecord {
  title: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
}

export async function OnInstallation(context: {
  priorVersion: string | undefined;
  currentVersion: string;
  appId: string;
}) {
  const plugin = createPlugin(context.appId);

  if (!context.priorVersion) {
    // Fresh installation
    await plugin.logger.info('Performing initial setup');
    await createDefaultRecords(plugin);
    await plugin.logger.info('Initial setup completed');
    return;
  }

  // Upgrade
  await plugin.logger.info(
    `Upgrading from ${context.priorVersion} to ${context.currentVersion}`
  );

  try {
    // Version 1.x to 2.x migration
    if (
      context.priorVersion.startsWith('1.') &&
      context.currentVersion.startsWith('2.')
    ) {
      await migrateV1ToV2(plugin);
    }

    // Create new indexes for v2
    if (context.currentVersion.startsWith('2.')) {
      await createV2Indexes(plugin);
    }

    await plugin.logger.info('Upgrade completed successfully');
  } catch (error: any) {
    await plugin.logger.error(`Upgrade failed: ${error.message}`);
    throw error;
  }
}

async function createDefaultRecords(plugin: any) {
  await plugin.records.create({
    title: 'Welcome to the Task Manager',
    status: 'pending',
    priority: 'medium',
    createdAt: Date.now(),
  });
}

async function migrateV1ToV2(plugin: any) {
  const result = await plugin.records.list();

  for (const record of result.items) {
    const oldData = record.data as V1TaskRecord;

    const newData: V2TaskRecord = {
      title: oldData.title,
      status: oldData.completed ? 'completed' : 'pending',
      priority: 'medium',
      createdAt: record.createdAt || Date.now(),
    };

    await plugin.records.update(record.id, newData);
  }

  await plugin.logger.info(
    `Migrated ${result.items.length} records to v2 schema`
  );
}

async function createV2Indexes(plugin: any) {
  await plugin.files.writeFile(
    'indexes/status.json',
    JSON.stringify({
      pending: [],
      'in-progress': [],
      completed: [],
    })
  );

  await plugin.logger.info('Created v2 indexes');
}
```

### src/system/uninstall.ts

```typescript
import { createPlugin } from '@/lib/sdk';

export async function OnUninstallation(context: {
  version: string;
  appId: string;
}) {
  const plugin = createPlugin(context.appId);

  await plugin.logger.info(
    `Starting uninstallation cleanup for v${context.version}`
  );

  try {
    // Archive all records before deletion
    const records = await plugin.records.list();
    if (records.items.length > 0) {
      const archiveData = {
        version: context.version,
        exportedAt: new Date().toISOString(),
        records: records.items,
      };

      await plugin.files.writeFile(
        `archive_${Date.now()}.json`,
        JSON.stringify(archiveData, null, 2)
      );

      await plugin.logger.info(
        `Archived ${records.items.length} records`
      );
    }

    // Perform any external cleanup
    await cleanupExternalResources(plugin);

    await plugin.logger.info('Uninstallation cleanup completed');
  } catch (error: any) {
    await plugin.logger.error(`Uninstallation cleanup failed: ${error.message}`);
    throw error;
  }
}

async function cleanupExternalResources(plugin: any) {
  // Example: Revoke webhooks, API tokens, etc.
  await plugin.logger.info('External resources cleaned up');
}
```

## Lifecycle Flow

### Installation Flow

```
1. User uploads app package (.zip)
2. System validates package
3. System extracts and saves files
4. System registers app in database
5. **System calls OnInstallation hook** (priorVersion = undefined)
   - If hook throws → rollback installation
   - If hook succeeds → continue
6. System logs installation success
7. User sees success notification
```

### Upgrade Flow

```
1. User uploads new app package (.zip)
2. System validates package
3. System backs up old API directory
4. System replaces files with new version
5. System updates database
6. **System calls OnInstallation hook** (priorVersion = old version)
   - If hook throws → rollback upgrade
   - If hook succeeds → continue
7. System deletes backup
8. System logs upgrade success
9. User sees success notification with version change
```

### Uninstallation Flow

```
1. User clicks uninstall
2. System validates uninstallation is allowed
3. **System calls OnUninstallation hook**
   - If hook throws → abort uninstallation
   - If hook succeeds → continue
4. System deletes all app records
5. System removes all authorizations
6. System removes app from database
7. System deletes app files
8. System logs uninstallation success
9. User sees success notification
```

## Logging

All lifecycle operations are automatically logged:

- **Installation Success**: `Application installed: <name> v<version> (<appId>)`
- **Installation Hook Running**: `Running OnInstallation hook for <name> v<version>`
- **Installation Hook Failure**: `App installation hook failed for <name>: <error>`
- **Upgrade Success**: `Application upgraded: <name> (<oldVersion> → <newVersion>)`
- **Upgrade Hook Running**: `Running OnInstallation hook for <name> (<oldVersion> → <newVersion>)`
- **Uninstallation Success**: `Application uninstalled: <name> (<appId>)`
- **Uninstallation Hook Running**: `Running OnUninstallation hook for <name> v<version>`
- **Uninstallation Hook Failure**: `App uninstallation hook failed for <name>: <error>`

You can view these logs in the system settings under **Debug > Logs**.

## Notes

- Lifecycle hooks are **optional** - apps without handlers will work normally
- **OnInstallation** runs after files are saved (for both install and upgrade)
- **OnUninstallation** runs before any data is deleted
- If any hook fails, the operation is **automatically rolled back** or **aborted**
- Hooks have access to the full Plugin SDK for data operations
- Backups are automatically created and managed during upgrades
