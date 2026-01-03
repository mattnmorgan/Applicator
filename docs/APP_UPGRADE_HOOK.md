# App Upgrade Hook

The Vibe Applicator plugin system supports an optional **Upgrade hook** that allows apps to perform migrations, data transformations, or other necessary updates when upgrading from one version to another.

## Overview

When an app is upgraded via the system settings, the upgrade process will:

1. Extract and validate the new app package
2. **Call the `Upgrade` function** if it exists in `api/upgrade.js`
3. Replace the old app files with the new version
4. Update the app metadata in the database
5. Log the upgrade success or failure

## Creating an Upgrade Hook

### 1. Create the Upgrade Handler

Create a file at `src/api/upgrade.ts` in your app:

```typescript
export async function Upgrade(context: {
  oldVersion: string;
  newVersion: string;
  appId: string;
}) {
  console.log(`Upgrading ${context.appId} from ${context.oldVersion} to ${context.newVersion}`);

  // Perform version-specific migrations
  if (context.oldVersion === '1.0.0' && context.newVersion === '2.0.0') {
    // Migrate data from v1 to v2 format
    await migrateDataV1ToV2();
  }

  // Run any necessary cleanup or setup
  await performPostUpgradeCleanup();
}

async function migrateDataV1ToV2() {
  // Example: Migrate records to new schema
  // You can use the plugin SDK here if needed
}

async function performPostUpgradeCleanup() {
  // Example: Clear caches, update indexes, etc.
}
```

### 2. Include in Build

Make sure your `webpack.api.config.js` includes the upgrade handler:

```javascript
// The default webpack config automatically picks up all .ts files in src/api/
// So your upgrade.ts will be built automatically to dist/api/upgrade.js
```

### 3. Package the App

When you build and package your app, the `upgrade.js` file will be included in the `api/` directory of the zip package.

## Upgrade Context

The `Upgrade` function receives a context object with:

| Property | Type | Description |
|----------|------|-------------|
| `oldVersion` | `string` | The version being upgraded from (e.g., "1.0.0") |
| `newVersion` | `string` | The version being upgraded to (e.g., "2.0.0") |
| `appId` | `string` | The ID of the app being upgraded |

## Best Practices

### 1. Version-Specific Migrations

Use conditional logic to handle different upgrade paths:

```typescript
export async function Upgrade(context) {
  const { oldVersion, newVersion } = context;

  // Handle different upgrade paths
  if (oldVersion.startsWith('1.') && newVersion.startsWith('2.')) {
    await migrateV1ToV2();
  } else if (oldVersion.startsWith('2.') && newVersion.startsWith('3.')) {
    await migrateV2ToV3();
  }

  // Always run general upgrades
  await runGeneralUpgrades();
}
```

### 2. Use the Plugin SDK

You can use the plugin SDK within the upgrade hook:

```typescript
import { createPlugin } from '@/lib/sdk';

export async function Upgrade(context) {
  const plugin = createPlugin(context.appId);

  // Migrate records
  const records = await plugin.records.list();
  for (const record of records.items) {
    // Update record schema
    const updated = transformRecordSchema(record);
    await plugin.records.update(record.id, updated);
  }

  // Log the upgrade
  await plugin.logger.info(`Successfully upgraded to ${context.newVersion}`);
}
```

### 3. Handle Errors Gracefully

If the upgrade hook throws an error, the upgrade will be rolled back:

```typescript
export async function Upgrade(context) {
  try {
    await performMigration();
  } catch (error) {
    console.error('Migration failed:', error);
    // The system will automatically rollback the upgrade
    throw new Error(`Failed to migrate: ${error.message}`);
  }
}
```

### 4. Idempotent Operations

Make upgrade operations idempotent when possible:

```typescript
export async function Upgrade(context) {
  const plugin = createPlugin(context.appId);

  // Check if migration already ran
  const migrationFlag = `migration_v${context.newVersion}_completed`;
  const alreadyMigrated = await plugin.files.exists(migrationFlag);

  if (alreadyMigrated) {
    console.log('Migration already completed, skipping');
    return;
  }

  // Perform migration
  await doMigration();

  // Set flag
  await plugin.files.writeFile(migrationFlag, 'completed');
}
```

## Example: Complete Upgrade Hook

```typescript
import { createPlugin } from '@/lib/sdk';

interface OldTaskRecord {
  title: string;
  completed: boolean;
}

interface NewTaskRecord {
  title: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

export async function Upgrade(context: {
  oldVersion: string;
  newVersion: string;
  appId: string;
}) {
  const plugin = createPlugin(context.appId);

  await plugin.logger.info(
    `Starting upgrade from ${context.oldVersion} to ${context.newVersion}`
  );

  try {
    // Version 1.x to 2.x migration
    if (context.oldVersion.startsWith('1.') && context.newVersion.startsWith('2.')) {
      await migrateV1ToV2(plugin);
    }

    // Create new indexes for v2
    if (context.newVersion.startsWith('2.')) {
      await createV2Indexes(plugin);
    }

    await plugin.logger.info('Upgrade completed successfully');
  } catch (error: any) {
    await plugin.logger.error(`Upgrade failed: ${error.message}`);
    throw error;
  }
}

async function migrateV1ToV2(plugin: any) {
  // Get all existing records
  const result = await plugin.records.list();

  for (const record of result.items) {
    const oldData = record.data as OldTaskRecord;

    // Transform to new schema
    const newData: NewTaskRecord = {
      title: oldData.title,
      status: oldData.completed ? 'completed' : 'pending',
      priority: 'medium', // Default priority
    };

    // Update record
    await plugin.records.update(record.id, newData);
  }

  await plugin.logger.info(`Migrated ${result.items.length} records to v2 schema`);
}

async function createV2Indexes(plugin: any) {
  // Create any necessary files or configuration for v2
  await plugin.files.writeFile('indexes/status.json', JSON.stringify({
    pending: [],
    'in-progress': [],
    completed: []
  }));

  await plugin.logger.info('Created v2 indexes');
}
```

## Upgrade Process Flow

```
1. User clicks "Upgrade" button in system settings
2. User selects new app package (.zip file)
3. System validates the package
4. System verifies app ID matches
5. **System calls Upgrade hook if it exists**
   - If hook throws error → rollback upgrade
   - If hook succeeds → continue
6. System replaces old files with new files
7. System updates app metadata in database
8. System logs upgrade success
9. User sees success toast with version change
```

## Logging

All upgrade operations are automatically logged to the debug logs:

- **Success**: `Application upgraded: <name> (<oldVersion> → <newVersion>)`
- **Hook Running**: `Running upgrade hook for <name> (<oldVersion> → <newVersion>)`
- **Hook Failure**: `App upgrade hook failed for <name>: <error>`
- **Upgrade Failure**: `App upgrade failed: <error>`

You can view these logs in the system settings under **Debug > Logs**.

## Notes

- The upgrade hook is **optional** - apps without an upgrade handler will still upgrade successfully
- The upgrade hook runs **before** files are replaced, so it has access to both old and new versions
- If the hook fails, the upgrade is **automatically rolled back**
- The upgrade process creates a **backup** of the old API directory before upgrading
- Backups are automatically deleted after successful upgrade
