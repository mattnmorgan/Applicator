# App Bundle (app.js)

The app bundle (`app.js`) contains your React components that render in the Applicator UI.

## Export Convention

Your app must export **named exports** of React components:

```typescript
// src/index.tsx
export { Dashboard, Settings, HomeWidget };
```

Each export name must match the `component` field in your applet definitions:

```json
{
  "applets": [
    {
      "id": "main",
      "label": "My App",
      "target": "app",
      "component": "Dashboard"      // ← Must match export name
    },
    {
      "id": "settings",
      "label": "Settings",
      "target": "user-settings",
      "component": "Settings"       // ← Must match export name
    },
    {
      "id": "widget",
      "label": "Quick View",
      "target": "home",
      "component": "HomeWidget"     // ← Must match export name
    }
  ]
}
```

---

## Component Structure

### Entry Point

```typescript
// src/index.tsx

// Import your components
import Dashboard from './apps/Dashboard';
import Settings from './widgets/Settings';
import HomeWidget from './widgets/HomeWidget';
import SystemSettings from './widgets/SystemSettings';

// Export by name
export { Dashboard, Settings, HomeWidget, SystemSettings };
```

### Component Files

```typescript
// src/apps/Dashboard.tsx
import React, { useState, useEffect } from 'react';

interface Props {
  path?: string[];   // URL path segments
  appId: string;     // App ID (e.g., "my-app" or "my-app:main")
}

export default function Dashboard({ path, appId }: Props) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/my-app/list`);
      const json = await res.json();
      setData(json.items);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard</h1>
      {data.map(item => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  );
}
```

---

## Component Props

Components receive these props from the framework:

| Prop | Type | Description |
|------|------|-------------|
| `path` | `string[]` | Remaining URL path segments |
| `appId` | `string` | App identifier, possibly with applet ID |

### Using Path for Routing

```typescript
export default function Dashboard({ path }: { path?: string[] }) {
  // URL: /app/my-app/items/123
  // path = ["items", "123"]

  if (!path || path.length === 0) {
    return <ItemList />;
  }

  if (path[0] === 'items' && path[1]) {
    return <ItemDetail id={path[1]} />;
  }

  return <NotFound />;
}
```

---

## React Availability

React and ReactDOM are provided globally by the framework. You can use:

```typescript
import React, { useState, useEffect, useContext, useRef } from 'react';
```

Available React features:
- All hooks (`useState`, `useEffect`, `useContext`, `useRef`, `useMemo`, `useCallback`, etc.)
- JSX syntax
- Functional components
- Context API
- Suspense and lazy loading (with limitations)

---

## Styling

### Inline Styles

```typescript
export default function MyComponent() {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#1e293b',
      color: '#f1f5f9',
      borderRadius: '8px'
    }}>
      Content
    </div>
  );
}
```

### CSS Variables

The framework uses a dark theme. Common colors:

```typescript
const styles = {
  background: '#0f172a',      // Dark background
  surface: '#1e293b',         // Card/surface background
  border: '#334155',          // Border color
  text: '#f1f5f9',            // Primary text
  textMuted: '#94a3b8',       // Secondary text
  primary: '#3b82f6',         // Primary accent (blue)
  success: '#22c55e',         // Success (green)
  warning: '#f59e0b',         // Warning (amber)
  error: '#ef4444',           // Error (red)
};
```

### CSS-in-JS

You can use style objects and computed styles:

```typescript
const buttonStyle = (variant: 'primary' | 'secondary') => ({
  padding: '8px 16px',
  borderRadius: '6px',
  border: 'none',
  cursor: 'pointer',
  backgroundColor: variant === 'primary' ? '#3b82f6' : '#334155',
  color: '#f1f5f9',
});

<button style={buttonStyle('primary')}>Save</button>
```

---

## API Integration

### Fetching Data

```typescript
export default function ItemList() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch('/api/my-app/items/list')
      .then(res => res.json())
      .then(data => setItems(data.items));
  }, []);

  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  );
}
```

### Creating Data

```typescript
const createItem = async (data: { title: string }) => {
  const response = await fetch('/api/my-app/items/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error('Failed to create item');
  }

  return response.json();
};
```

### Using Assets

```typescript
<img src="/api/my-app/assets/logo.png" alt="Logo" />
<img src="/api/my-app/assets/icon" alt="App Icon" />
```

---

## Project Structure

Recommended organization:

```
src/
├── index.tsx           # Entry point with exports
├── meta/               # App metadata (app.json, app.png)
├── apps/               # Top-level applet views only (one per applet)
│   ├── Dashboard.tsx
│   └── Dashboard.module.css
├── widgets/            # Widget applet views (home, settings targets)
│   ├── HomeWidget.tsx
│   ├── UserSettings.tsx
│   └── SystemSettings.tsx
├── components/         # Reusable sub-components used by applet views
│   ├── ItemList.tsx
│   ├── ItemDetail.tsx
│   └── ShareModal.tsx
├── lib/                # Shared library code (optional)
│   └── api.ts
└── types/              # TypeScript types — one file per type
    ├── Item.ts
    ├── ItemRecord.ts
    └── SystemUser.ts
```

---

## Conventions

### Folder Responsibilities

- **`apps/`** — contains only top-level applet view components (one per `target: "app"` applet). Sub-views, modals, and reusable sections go in `components/`, not here.
- **`widgets/`** — same as `apps/` but for `target: "home"`, `target: "user-settings"`, etc.
- **`components/`** — reusable UI pieces composed into applet views. Any component referenced from more than one place, or that represents a self-contained UI section, belongs here.
- **`types/`** — one TypeScript file per type or interface. Do not bundle multiple unrelated interfaces into a single `types.ts` file. Both frontend and API types can live here.

### Naming

- **Applet view components** should have descriptive names reflecting the feature, not generic names like `App` or `Widget`. Use names like `Dashboard`, `Taskboard`, `InvoiceEditor`, `TaskboardWidget`, `CalendarHomeWidget`.
- The component name must match the `component` field in `app.json` applets exactly.
- Widget component exports should include the word "Widget" to distinguish them from full app views.

### Icons

Use the platform `Icon` component instead of inline SVG functions. This keeps icons consistent with the platform theme and eliminates repeated SVG markup.

```typescript
import { Icon } from "@applicator/sdk/components";

// Usage
<Icon name="trash" size={16} />
<Icon name="plus" size={14} />
```

See [components/icon.md](./components/icon.md) for the full list of available icon names.

---

## Webpack Configuration

```javascript
// webpack.config.js
const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/index.tsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "app.js",
    library: {
      type: "module"           // ES module output
    },
    module: true
  },
  experiments: {
    outputModule: true         // Enable ES module output
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: [
          /node_modules/,
          /src\/api/,          // Exclude API handlers
          /src\/agents/,       // Exclude agents
          /src\/system/        // Exclude hooks
        ]
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      }
    ]
  },
  externals: {
    react: "React",            // Use global React
    "react-dom": "ReactDOM"    // Use global ReactDOM
  },
  mode: "production",
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "app.json", to: "app.json" },
        { from: "app.png", to: "app.png", noErrorOnMissing: true },
        { from: "assets", to: "assets", noErrorOnMissing: true },
        { from: "tables", to: "tables", noErrorOnMissing: true }
      ]
    })
  ]
};
```

Key points:
- Output as ES module (`type: "module"`)
- React/ReactDOM are external (provided by framework)
- Exclude API handlers, agents, and hooks from frontend build
- Copy app.json, icon, and assets to dist

---

## TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "ES2020"],
    "jsx": "react",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": false,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Complete Example

```typescript
// src/index.tsx
import TaskManager from './apps/TaskManager';
import TaskWidget from './widgets/TaskWidget';
import TaskSettings from './widgets/TaskSettings';

export { TaskManager, TaskWidget, TaskSettings };
```

```typescript
// src/apps/TaskManager.tsx
import React, { useState, useEffect } from 'react';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'done';
}

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    const res = await fetch('/api/task-app/list');
    const data = await res.json();
    setTasks(data.tasks);
  };

  const addTask = async () => {
    if (!newTitle.trim()) return;

    await fetch('/api/task-app/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    });

    setNewTitle('');
    loadTasks();
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ color: '#f1f5f9' }}>Tasks</h1>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New task..."
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #334155',
            backgroundColor: '#1e293b',
            color: '#f1f5f9',
            marginRight: '8px'
          }}
        />
        <button
          onClick={addTask}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#3b82f6',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          Add Task
        </button>
      </div>

      <div>
        {tasks.map(task => (
          <div
            key={task.id}
            style={{
              padding: '12px',
              marginBottom: '8px',
              backgroundColor: '#1e293b',
              borderRadius: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span style={{ color: '#f1f5f9' }}>{task.title}</span>
            <span style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              backgroundColor: task.status === 'done' ? '#22c55e' : '#f59e0b',
              color: '#fff'
            }}>
              {task.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```
