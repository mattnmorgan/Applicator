# App Package Format

Apps are distributed as `.zip` packages containing all necessary files for installation.

## Package Structure

### Zip Package Structure
```
app.zip
├── app.json          # App metadata and configuration
├── app.png           # App icon (optional)
├── {appId}.js        # UI bundle (webpack UMD bundle)
└── api/              # API handlers (optional)
    ├── handler1.js
    ├── handler2.js
    └── ...
```

### Installed Structure (in system storage)
```
{storage}/apps/{appId}/
├── app.png           # App icon
├── {appId}.js        # UI bundle
└── api/              # API handlers
    ├── handler1.js
    ├── handler2.js
    └── ...
```

## app.json Schema

The `app.json` file contains all app metadata:

```json
{
  "id": "task",                    // Unique app identifier
  "name": "Task Manager",          // Display name (stored as 'label' in database)
  "version": "1.0.0",             // Semantic version
  "author": "Your Name",          // Author name
  "contactEmail": "you@example.com", // Support email (optional)
  "description": "App description", // Short description
  "authorizations": [              // Permissions this app defines
    {
      "id": "manage",              // Permission ID (will be prefixed with appId:)
      "name": "Manage Tasks",      // Permission display name
      "description": "Can create, edit, and delete tasks"
    }
  ],
  "apiRoutes": [                   // API endpoints this app provides
    {
      "path": "list",              // Route path (accessed at /api/{appId}/list)
      "method": "GET",             // HTTP method
      "handler": "list",           // Handler file name (from api/ directory)
      "description": "Get all tasks"
    }
  ]
}
```

## Building an App Package

### 1. Create App Structure

```
my-app/
├── app.json           # Metadata file
├── app.png           # Icon file
├── src/
│   ├── index.tsx     # Main entry point
│   ├── App.tsx       # React app component
│   └── api/          # API handlers (if needed)
│       └── list.ts
├── webpack.config.js
├── webpack.api.config.js
└── build-package.js
```

### 2. Build Script

Create a `build-package.js` file:

```javascript
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function buildPackage() {
  const outputDir = path.resolve(__dirname, 'dist');
  const zipPath = path.join(outputDir, 'my-app.zip');

  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(output);
  archive.file('app.json', { name: 'app.json' });
  archive.file('app.png', { name: 'app.png' });
  archive.file('dist/my-app.js', { name: 'my-app.js' });
  archive.directory('dist/api/', 'api');

  await archive.finalize();
}

buildPackage();
```

### 3. Package.json Scripts

```json
{
  "scripts": {
    "build": "npm run build:api && webpack --mode production && npm run package",
    "build:api": "webpack --config webpack.api.config.js",
    "package": "node build-package.js"
  }
}
```

### 4. Build the Package

```bash
cd my-app
npm run build
```

This will create `dist/my-app.zip` ready for installation.

## Installing an App

1. Navigate to Settings → Apps
2. Click "Install App"
3. Select the `.zip` package file
4. The system will:
   - Extract and validate the package
   - Read metadata from `app.json`
   - Install the UI bundle to `{storage}/apps/{appId}/{appId}.js`
   - Install API handlers to `{storage}/apps/{appId}/api/`
   - Save the icon to `{storage}/apps/{appId}/app.png`
   - Register authorizations and API routes in the database

Note: All app files are stored in the system storage directory configured in Settings, not in the project repository.

## API Handlers

API handlers are CommonJS modules that export HTTP method functions:

```typescript
// api/list.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/db';
import { createPlugin } from '@/lib/plugin-sdk';

export async function GET(request: NextRequest) {
  // Get session
  const sessionId = request.cookies.get('session')?.value;
  const session = await getSession(sessionId);

  // Use plugin SDK
  const plugin = createPlugin('my-app', session.userId);

  // Access records
  const records = await plugin.records.list();

  return NextResponse.json({ records });
}
```

API handlers are bundled using webpack with the main project's libraries as dependencies.

## UI Bundle

The UI bundle is a UMD module that exports mount/unmount functions:

```typescript
// src/index.tsx
export function AppMount(container: HTMLElement, context: { appId: string }) {
  const root = createRoot(container);
  root.render(<App />);
}

export function AppUnmount() {
  // Cleanup
}

// Expose globally
if (typeof window !== 'undefined') {
  window.AppMount = AppMount;
  window.AppUnmount = AppUnmount;
}
```

The bundle expects React and ReactDOM to be available globally.
