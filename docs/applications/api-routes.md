# API Routes and SDK

API routes allow your app to expose HTTP endpoints. Each route is implemented as a handler function that receives a request and a context object with SDK utilities.

> **Metadata reference** — for declaring routes in `app.json` (path syntax, method, parameterized segments), see [metadata/api-routes.md](./metadata/api-routes.md).

---

## Handler Export Convention

Handlers export named functions matching HTTP methods. Each handler file is named `route.ts` and lives in a directory that matches the route path.

```typescript
// src/api/items/route.ts  →  handles GET /api/{appId}/items, POST /api/{appId}/items
import { NextRequest, NextResponse } from "next/server";
import { ApiContext } from "@applicator/sdk/context";

export async function GET(req: NextRequest, context: ApiContext) {
  return NextResponse.json({ message: "Hello" });
}

export async function POST(req: NextRequest, context: ApiContext) {
  const body = await req.json();
  return NextResponse.json({ received: body });
}

// src/api/items/[item-id]/route.ts  →  handles PATCH /api/{appId}/items/:itemId
export async function PATCH(
  req: NextRequest,
  context: ApiContext,
  params: { itemId: string },
) {
  const { itemId } = params;
  const body = await req.json();
  // Update itemId...
}
```

### Handler Signature

```typescript
import { ApiContext } from "@applicator/sdk/context";

(req: NextRequest, context: ApiContext, params: Record<string, string>) => Promise<NextResponse>;
```

- `req`: Next.js request object with query params, body, headers
- `context`: Context instance with file, record, and authorization utilities
- `params`: Named URL parameters extracted from the route pattern. Segment names are converted to camelCase: `[item-id]` → `params.itemId`. Always an object — empty `{}` for non-parameterized routes.

---

## Parameterized Routes

Bracket segments in a route path declare URL parameters. Name the directory with the bracket segment; place `route.ts` inside it:

```
src/api/items/[item-id]/route.ts  →  handles /api/{appId}/items/{any-value}
```

The matched value is available in `params`, with the segment name camelCased:

```typescript
// src/api/items/[item-id]/route.ts

export async function GET(
  _req: NextRequest,
  context: ApiContext,
  params: { itemId: string },
) {
  const { itemId } = params;
  const items = context.recordManager("my-app", "items");
  const record = await items.readRecord(itemId);

  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(record);
}

export async function DELETE(
  _req: NextRequest,
  context: ApiContext,
  params: { itemId: string },
) {
  const { itemId } = params;
  const items = context.recordManager("my-app", "items");
  const existing = await items.readRecord(itemId);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await items.deleteRecord(itemId);
  return NextResponse.json({ success: true });
}
```

Multiple parameters work across nested paths. Each segment name maps to a camelCase key:

```
[project-id]  →  params.projectId
[task-id]     →  params.taskId
```

```typescript
// src/api/projects/[project-id]/tasks/[task-id]/route.ts

export async function GET(
  _req: NextRequest,
  context: ApiContext,
  params: { projectId: string; taskId: string },
) {
  const { projectId, taskId } = params;
  // ...
}
```

---

## Context Reference

The context object provides these utilities:

### Files (`context.appFileManager`)

A `Filesystem` instance scoped to your app's data directory. All paths are relative to the app's storage root.

```typescript
// Write a file (creates parent directories automatically)
await context.appFileManager.writeFile(
  "data/config.json",
  JSON.stringify(config),
);
await context.appFileManager.writeFile("uploads/image.png", buffer);

// Read a file (returns Buffer)
const buffer = await context.appFileManager.readFile("uploads/image.png");
const text = buffer.toString("utf-8");

// Delete a file
await context.appFileManager.deleteFile("temp/old-file.txt");

// Delete a directory
await context.appFileManager.deleteDirectory("temp", true); // recursive

// Check existence
const exists = await context.appFileManager.exists("data/config.json");

// Create directory (throws if already exists)
await context.appFileManager.createDirectory("uploads/images");

// Ensure directory exists (creates if not, no error if exists)
await context.appFileManager.ensureDirectory("uploads/images");

// List directory contents
const entries = await context.appFileManager.listDirectory("uploads");
// [{ name, isDirectory, size, modifiedAt }] — sorted: directories first, then by name

// Get file/directory metadata
const meta = await context.appFileManager.getMetadata("uploads/image.png");
// { size: number, createdAt: Date, modifiedAt: Date, isDirectory: boolean }

// Rename a file or directory (returns new relative path)
const newPath = await context.appFileManager.rename(
  "old-name.txt",
  "new-name.txt",
);

// Move to a different directory (returns new relative path)
const movedPath = await context.appFileManager.move("file.txt", "archive");

// Copy a file or directory (returns new relative path, handles name conflicts)
const copiedPath = await context.appFileManager.copy("file.txt", "backup");
```

**Filesystem errors** have `name: "FilesystemError"`, a `code` property (`NOT_FOUND`, `ALREADY_EXISTS`, `INVALID_PATH`, `INVALID_OPERATION`, `PERMISSION_DENIED`), and a `statusCode` suitable for HTTP responses.

### System Files (`context.systemFileManager`)

A `Filesystem` instance scoped to the system files directory. Only available if your app has the `system:fs-access` authorization — throws an error otherwise.

```typescript
// Access system files (requires system:fs-access permission)
const systemEntries = await context.systemFileManager.listDirectory("");

// Create a child filesystem scoped to a subdirectory
const scopedFs = context.systemFileManager.scoped("some/subdir");
```

See [Authorities](./authorities.md#filesystem-access) for how to request `system:fs-access`.

### Records (`context.recordManager`)

Create a CRUD manager for a specific app table. The manager is scoped to the given app and table.

```typescript
// Get a record manager for a table
const items = context.recordManager("my-app", "items");

// Read a single record by ID
const record = await items.readRecord("record-id");
// { id, data: T, createdAt, updatedAt }

// Read records with filtering and pagination
const result = await items.readRecords({
  limit: 50,
  offset: 0,
  fields: { status: "active" }, // simple equality filter by field values
  ids: ["id-1", "id-2"], // filter by specific IDs
  includeRelated: ["author"], // include related records
});
// { records: TableRecord[], total, limit, offset, related? }

// Advanced filtering with operators
const result = await items.readRecords({
  filters: [
    { field: "status", operator: "IN", value: ["active", "pending"] },
    { field: "score", operator: ">=", value: 50 },
    { field: "title", operator: "LIKE", value: "Report%" },
  ],
});
// All filters are ANDed together by default

// Complex conditions with logical grouping
const result = await items.readRecords({
  filters: [
    { field: "status", operator: "=", value: "active" },   // 1
    { field: "type", operator: "=", value: "urgent" },     // 2
    { field: "type", operator: "=", value: "critical" },   // 3
  ],
  condition: "1 AND (2 OR 3)",  // index-based logical expression
});

// Create a record (pass null for table to skip validation)
const table = await items.getTable();
const created = await items.createRecord(table, {
  title: "New Item",
  status: "active",
});

// Update a record (partial update)
const updated = await items.updateRecord(table, "record-id", {
  status: "completed",
});

// Upsert a record (create or update)
const upserted = await items.upsertRecord(table, "record-id", {
  title: "Item",
  status: "active",
});

// Delete a record
await items.deleteRecord("record-id");

// Delete all records matching a filter (same filter syntax as readRecords)
await items.deleteFilteredRecords({ fields: { status: "archived" } });
await items.deleteFilteredRecords({
  filters: [{ field: "shareId", operator: "=", value: linkId }],
});

// Bulk operations
const bulkCreated = await items.bulkCreateRecords(table, [
  { title: "Item 1" },
  { title: "Item 2" },
]);
// { success: TableRecord[], failures: { data, error }[] }

const bulkUpdated = await items.bulkUpdateRecords(table, [
  { id: "id-1", data: { status: "done" } },
  { id: "id-2", data: { status: "done" } },
]);

await items.bulkDeleteRecords(["id-1", "id-2"]);

// List all record keys
const keys = await items.listRecords();

// Delete all records in the table
await items.deleteAll();

// Get table definition and fields
const tableDef = await items.getTable();
const fields = await items.getTableFields();
```

#### Record Filtering Reference

`readRecords` accepts a `RecordFilter` object with these options:

| Option | Type | Description |
|--------|------|-------------|
| `fields` | `object` | Simple equality filter: `{ status: "active", type: "task" }` |
| `ids` | `string[]` | Return only records with these IDs |
| `filters` | `FieldFilter[]` | Advanced filter conditions with operators (see below) |
| `condition` | `string` | Logical expression combining `filters` by 1-based index |
| `limit` | `number` | Max records to return |
| `offset` | `number` | Number of records to skip |
| `includeRelated` | `string[]` | Field names whose related records should be fetched |

##### FieldFilter Operators

| Operator | Description | Value type |
|----------|-------------|------------|
| `=` | Exact match | scalar |
| `!=` | Not equal | scalar |
| `<` | Less than | number |
| `>` | Greater than | number |
| `<=` | Less than or equal | number |
| `>=` | Greater than or equal | number |
| `IN` | Matches any value in list | `string[]` or `number[]` |
| `NOT IN` | Matches none of the values | `string[]` or `number[]` |
| `LIKE` | SQL LIKE pattern (`%` wildcard) | string |
| `NOT LIKE` | Negated LIKE | string |

##### Condition Syntax

When `filters` has more than one entry and you need non-default logic, use `condition` to express the relationship. Indices are **1-based** and map to positions in the `filters` array:

```typescript
filters: [
  { field: "status", operator: "=", value: "active" },    // 1
  { field: "priority", operator: "=", value: "high" },    // 2
  { field: "priority", operator: "=", value: "critical" }, // 3
  { field: "dueDate", operator: "<", value: Date.now() }, // 4
],
condition: "(2 OR 3) AND (1 AND 4)"
```

If `condition` is omitted, all filters are ANDed together.

---

### User and App Info

```typescript
// Get current user's info (cached after first call)
const user = await context.user();
// { id, displayName, username, email, authorities: { system, userSpecific } }

// Get a specific user's info
const otherUser = await context.user("user-id");

// Get current app's info (cached after first call)
const app = await context.app();
// { name, version, authority: { name, authorizations } }

// Get another app's info
const otherApp = await context.app("other-app-id");
```

### Authorization

```typescript
// Check if the current user has an authorization
const canManage = await context.isUserAuthorizedFor("my-app:manage");

// Check multiple authorizations (test: "some" or "all")
const hasAny = await context.isUserAuthorized(
  ["my-app:view", "my-app:edit"],
  "some",
);
const hasAll = await context.isUserAuthorized(
  ["my-app:view", "my-app:edit"],
  "all",
);

// Check app-level authorization (for the current app)
const appHasAccess = await context.isAppAuthorizedFor("system:fs-access");

// Check another app's authorization
const otherAppAccess = await context.isAppAuthorizedFor(
  "files:fs-access",
  "other-app-id",
);
```

### Logger (`context.logger`)

Log messages to the system log.

```typescript
await context.logger.info("Processing request...");
await context.logger.warn("Rate limit approaching");
await context.logger.debug("Debug details here");
await context.logger.error("Failed to process: " + error.message);
```

---

## Common Patterns

### GET - List with Query Parameters

```typescript
export async function GET(req: NextRequest, context: Context) {
  const { searchParams } = new URL(req.url);

  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const status = searchParams.get("status");

  const items = context.recordManager("my-app", "items");
  const result = await items.readRecords({
    limit,
    offset,
    ...(status ? { fields: { status } } : {}),
  });

  return NextResponse.json({
    items: result.records.map((r) => ({ id: r.id, ...r.data })),
    total: result.total,
  });
}
```

### POST - Create with Validation

```typescript
export async function POST(req: NextRequest, context: Context) {
  try {
    const body = await req.json();

    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const items = context.recordManager("my-app", "items");
    const table = await items.getTable();
    const record = await items.createRecord(table, {
      title: body.title,
      status: body.status || "pending",
    });

    await context.logger.info(`Created item: ${record.id}`);
    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    await context.logger.error(`Create failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### PUT - Update Existing

Using a parameterized route (preferred — `src/api/items/[item-id].ts`):

```typescript
export async function PUT(
  req: NextRequest,
  context: ApiContext,
  params: { itemId: string },
) {
  try {
    const { itemId } = params;
    const body = await req.json();
    const items = context.recordManager("my-app", "items");
    const table = await items.getTable();
    const existing = await items.readRecord(itemId);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await items.updateRecord(table, itemId, body);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### DELETE - Remove Record

Using a parameterized route (preferred — `src/api/items/[item-id].ts`):

```typescript
export async function DELETE(
  _req: NextRequest,
  context: ApiContext,
  params: { itemId: string },
) {
  try {
    const { itemId } = params;
    const items = context.recordManager("my-app", "items");
    const existing = await items.readRecord(itemId);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await items.deleteRecord(itemId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

Using a query parameter (for non-resource-oriented routes):

```typescript
export async function DELETE(req: NextRequest, context: ApiContext) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID required" }, { status: 400 });
  }

  // ...same delete logic
}
```

### File Upload

```typescript
export async function POST(req: NextRequest, context: Context) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `uploads/${Date.now()}-${file.name}`;

    await context.appFileManager.writeFile(filename, buffer);

    return NextResponse.json({
      success: true,
      path: filename,
      size: buffer.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### File Download

```typescript
export async function GET(req: NextRequest, context: Context) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Path required" }, { status: 400 });
  }

  try {
    const exists = await context.appFileManager.exists(path);
    if (!exists) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const buffer = await context.appFileManager.readFile(path);
    const filename = path.split("/").pop();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Authorization Check

```typescript
export async function POST(req: NextRequest, context: Context) {
  const canManage = await context.isUserAuthorizedFor("my-app:manage");
  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Authorized - proceed with operation
  const body = await req.json();
  const items = context.recordManager("my-app", "items");
  const table = await items.getTable();
  const record = await items.createRecord(table, body);
  return NextResponse.json(record);
}
```

---

## Webpack Configuration

API handlers need a separate webpack config for Node.js. The `findRouteHandlers` function discovers all `route.ts` files in the `src/api/` directory tree, while `findHandlers` is used for other directories (`system/`, `tables/`, `agents/`) that use named files:

```javascript
// webpack.api.config.js
const path = require("path");
const fs = require("fs");

// Find route.ts handler files (Next.js-style routing for src/api/)
function findRouteHandlers(dir, baseDir, prefix) {
  const entries = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      Object.assign(entries, findRouteHandlers(fullPath, baseDir, prefix));
    } else if (entry.name === "route.ts") {
      const relative = path.relative(baseDir, fullPath).replace(/\\/g, "/");
      const name = relative.replace(".ts", "");
      entries[`${prefix}/${name}`] =
        `./${path.relative(__dirname, fullPath).replace(/\\/g, "/")}`;
    }
  }
  return entries;
}

// Find named .ts handler files (for system/, tables/, agents/)
function findHandlers(dir, baseDir, prefix) {
  const entries = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      Object.assign(entries, findHandlers(fullPath, baseDir, prefix));
    } else if (entry.name.endsWith(".ts") && entry.name !== "index.ts") {
      const relative = path.relative(baseDir, fullPath).replace(/\\/g, "/");
      const name = relative.replace(".ts", "");
      entries[`${prefix}/${name}`] =
        `./${path.relative(__dirname, fullPath).replace(/\\/g, "/")}`;
    }
  }
  return entries;
}

const apiDir = path.resolve(__dirname, "src/api");
const handlers = fs.existsSync(apiDir) ? findRouteHandlers(apiDir, apiDir, "api") : {};

const systemDir = path.resolve(__dirname, "src/system");
if (fs.existsSync(systemDir)) {
  Object.assign(handlers, findHandlers(systemDir, systemDir, "system"));
}

const agentsDir = path.resolve(__dirname, "src/agents");
if (fs.existsSync(agentsDir)) {
  Object.assign(handlers, findHandlers(agentsDir, agentsDir, "agents"));
}

module.exports = {
  entry: handlers,
  target: "node",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    library: { type: "commonjs2" },
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {},
    symlinks: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: { configFile: "tsconfig.webpack.json", transpileOnly: true },
        },
        exclude: /node_modules/,
      },
    ],
  },
  externals: {
    "next/server": "commonjs2 next/server",
    ioredis: "commonjs2 ioredis",
    uuid: "commonjs2 uuid",
    bcryptjs: "commonjs2 bcryptjs",
  },
  mode: "production",
};
```
