# API Routes and SDK

API routes allow your app to expose HTTP endpoints. Each route is implemented as a handler function that receives a request and a plugin context with SDK utilities.

## Route Structure

Routes are accessible at `/api/{appId}/{path}`.

### File Location

```
src/api/my-route.ts  →  dist/api/my-route.js  →  /api/{appId}/my-route
src/api/items/list.ts  →  dist/api/items/list.js  →  /api/{appId}/items/list
```

### Declaring Routes

Routes must be declared in `app.json`:

```json
{
  "apiRoutes": [
    { "path": "my-route", "method": "GET", "description": "My endpoint" },
    { "path": "items/list", "method": "GET", "description": "List items" },
    { "path": "items/create", "method": "POST", "description": "Create item" }
  ]
}
```

---

## Handler Export Convention

Handlers export named functions matching HTTP methods:

```typescript
import { NextRequest, NextResponse } from 'next/server';

// GET /api/{appId}/my-route
export async function GET(req: NextRequest, context: { plugin: any }) {
  const { plugin } = context;
  return NextResponse.json({ message: 'Hello' });
}

// POST /api/{appId}/my-route
export async function POST(req: NextRequest, context: { plugin: any }) {
  const { plugin } = context;
  const body = await req.json();
  return NextResponse.json({ received: body });
}

// PUT /api/{appId}/my-route
export async function PUT(req: NextRequest, context: { plugin: any }) {
  // Update logic
}

// DELETE /api/{appId}/my-route
export async function DELETE(req: NextRequest, context: { plugin: any }) {
  // Delete logic
}
```

### Handler Signature

```typescript
(req: NextRequest, context: { plugin: PluginContext }) => Promise<NextResponse>
```

- `req`: Next.js request object with query params, body, headers
- `context.plugin`: SDK with file, record, and system utilities

---

## Plugin SDK Reference

The plugin context provides these utilities:

### Files (`plugin.files`)

All file operations are scoped to your app's data directory.

```typescript
// Write a file
await plugin.files.writeFile('data/config.json', JSON.stringify(config));
await plugin.files.writeFile('uploads/image.png', buffer);

// Read a file
const buffer = await plugin.files.readFile('uploads/image.png');
const text = buffer.toString('utf-8');

// Delete a file
await plugin.files.deleteFile('temp/old-file.txt');

// Delete a directory
await plugin.files.deleteDirectory('temp', true); // recursive

// Check existence
const exists = await plugin.files.exists('data/config.json');

// Create directory
await plugin.files.mkdir('uploads/images');
await plugin.files.createDirectory('uploads/images'); // alias

// List directory contents
const files = await plugin.files.readdir('uploads');
const files = await plugin.files.listFiles('uploads'); // alias

// Get file stats
const stats = await plugin.files.stat('uploads/image.png');
// stats.size, stats.isDirectory(), stats.mtime, etc.

// Get metadata
const meta = await plugin.files.getMetadata('uploads/image.png');
// { size: number, modifiedAt: Date, isDirectory: boolean }
```

### Records (`plugin.records`)

CRUD operations for your app's tables.

```typescript
// Create a record
const record = await plugin.records.create('my-table', {
  title: 'New Item',
  status: 'active'
});

// List records with pagination
const result = await plugin.records.list('my-table', {
  limit: 50,
  offset: 0
});
// result.records, result.total

// Get a single record
const record = await plugin.records.get('my-table', 'record-id');

// Update a record
const updated = await plugin.records.update('my-table', 'record-id', {
  status: 'completed'
});

// Delete a record
await plugin.records.delete('my-table', 'record-id');
```

### System (`plugin.system`)

User and authorization utilities.

```typescript
// Check current user's authorization
const canManage = await plugin.system.checkMyAuthorization('my-app:manage');

// Get user details
const user = await plugin.system.getUser('user-id');
// { id, username, displayName, email, authorityName }

// Get all users
const users = await plugin.system.getUsers();
const allUsers = await plugin.system.getUsers(true); // include inactive
```

### Logger (`plugin.logger`)

Log messages to the system log.

```typescript
await plugin.logger.info('Processing request...');
await plugin.logger.warn('Rate limit approaching');
await plugin.logger.error('Failed to process: ' + error.message);
```

### Helper Properties and Methods

```typescript
// App ID
const appId = plugin.appId;

// Current user ID (if authenticated)
const userId = plugin.userId;

// Get current user's data
const user = await plugin.getUser();

// Check authorization (alternative to system.checkMyAuthorization)
const hasAuth = await plugin.hasAuthorization('my-app:admin');
```

---

## Authorization Helper

Require specific authorization before processing:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthorization } from '@/lib/sdk';

export async function POST(req: NextRequest, context: { plugin: any }) {
  const { plugin } = context;

  try {
    // Throws if user lacks authorization
    await requireAuthorization(plugin, 'my-app:manage');

    // Authorized - proceed with operation
    const body = await req.json();
    const record = await plugin.records.create('items', body);
    return NextResponse.json(record);

  } catch (error: any) {
    if (error.message.includes('Missing required authorization')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## Common Patterns

### GET - List with Query Parameters

```typescript
export async function GET(req: NextRequest, context: { plugin: any }) {
  const { plugin } = context;
  const { searchParams } = new URL(req.url);

  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const status = searchParams.get('status');

  const result = await plugin.records.list('items', { limit, offset });

  // Filter if status provided
  let items = result.records;
  if (status) {
    items = items.filter(r => r.data.status === status);
  }

  return NextResponse.json({
    items: items.map(r => ({ id: r.id, ...r.data })),
    total: result.total
  });
}
```

### POST - Create with Validation

```typescript
export async function POST(req: NextRequest, context: { plugin: any }) {
  const { plugin } = context;

  try {
    const body = await req.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Create record
    const record = await plugin.records.create('items', {
      title: body.title,
      status: body.status || 'pending',
      createdBy: plugin.userId
    });

    await plugin.logger.info(`Created item: ${record.id}`);
    return NextResponse.json(record, { status: 201 });

  } catch (error: any) {
    await plugin.logger.error(`Create failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### PUT - Update Existing

```typescript
export async function PUT(req: NextRequest, context: { plugin: any }) {
  const { plugin } = context;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const existing = await plugin.records.get('items', id);

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await plugin.records.update('items', id, body);
    return NextResponse.json(updated);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### DELETE - Remove Record

```typescript
export async function DELETE(req: NextRequest, context: { plugin: any }) {
  const { plugin } = context;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  try {
    const existing = await plugin.records.get('items', id);

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await plugin.records.delete('items', id);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### File Upload

```typescript
export async function POST(req: NextRequest, context: { plugin: any }) {
  const { plugin } = context;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `uploads/${Date.now()}-${file.name}`;

    await plugin.files.writeFile(filename, buffer);

    return NextResponse.json({
      success: true,
      path: filename,
      size: buffer.length
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### File Download

```typescript
export async function GET(req: NextRequest, context: { plugin: any }) {
  const { plugin } = context;
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Path required' }, { status: 400 });
  }

  try {
    const exists = await plugin.files.exists(path);
    if (!exists) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const buffer = await plugin.files.readFile(path);
    const filename = path.split('/').pop();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## Webpack Configuration

API handlers need a separate webpack config for Node.js:

```javascript
// webpack.api.config.js
const path = require("path");
const fs = require("fs");

function findTsFiles(dir, prefix = "") {
  const entries = {};
  if (!fs.existsSync(dir)) return entries;

  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      Object.assign(entries, findTsFiles(fullPath, prefix ? `${prefix}/${file}` : file));
    } else if (file.endsWith(".ts") && file !== "index.ts") {
      const name = file.replace(".ts", "");
      const entryName = prefix ? `${prefix}/${name}` : name;
      entries[`api/${entryName}`] = path.join(dir, file);
    }
  }
  return entries;
}

const apiDir = path.resolve(__dirname, "src/api");
const handlers = findTsFiles(apiDir);

module.exports = {
  entry: handlers,
  target: "node",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    library: { type: "commonjs2" }
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: { "@": path.resolve(__dirname, "../..") }
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      use: "ts-loader",
      exclude: /node_modules/
    }]
  },
  externals: {
    "next/server": "commonjs2 next/server"
  },
  optimization: {
    splitChunks: false,
    runtimeChunk: false
  },
  mode: "production"
};
```
