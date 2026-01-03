# Plugin Widget System

## Overview

The Vibe Applicator plugin system supports widgets that can be rendered in three locations:
- **Home** - User's home screen dashboard
- **User Settings** - User's personal settings menu
- **System Settings** - System-wide configuration (admin only)

## Widget Registration

### 1. Declare Widgets in app.json

```json
{
  "id": "my-app",
  "name": "My Application",
  "widgets": [
    {
      "name": "My Home Widget",
      "description": "Shows stats on the home screen",
      "target": "home",
      "component": "HomeWidget"
    },
    {
      "name": "My Settings",
      "description": "User-specific settings",
      "target": "user-settings",
      "component": "SettingsWidget"
    },
    {
      "name": "System Configuration",
      "description": "System-wide settings",
      "target": "system-settings",
      "component": "SystemSettingsWidget"
    }
  ]
}
```

### 2. Export Widgets (Namespaced to Prevent Conflicts)

**IMPORTANT**: All apps must use the `__APPLICATOR_PLUGINS__` namespace to prevent conflicts when multiple apps are loaded.

```typescript
// src/index.tsx
import HomeWidget from './widgets/HomeWidget';
import SettingsWidget from './widgets/SettingsWidget';
import SystemSettingsWidget from './widgets/SystemSettingsWidget';

// Export widgets for ES module consumers
export { HomeWidget, SettingsWidget, SystemSettingsWidget };

// Expose globally with proper namespacing
if (typeof window !== 'undefined') {
  // Create global namespace if it doesn't exist
  if (!(window as any).__APPLICATOR_PLUGINS__) {
    (window as any).__APPLICATOR_PLUGINS__ = {};
  }

  // Store app-specific exports under the app ID
  (window as any).__APPLICATOR_PLUGINS__['my-app'] = {
    getAppAttributes,
    AppMount,
    AppUnmount,
    widgets: {
      HomeWidget,
      SettingsWidget,
      SystemSettingsWidget,
    },
  };
}
```

### 3. Access Widgets and App Functions at Runtime

When the system needs to access plugin exports:

```typescript
// Get the app's exports
const appId = 'my-app';
const appExports = window.__APPLICATOR_PLUGINS__?.[appId];

// Access widgets
const componentName = 'HomeWidget';
const WidgetComponent = appExports?.widgets?.[componentName];

if (WidgetComponent) {
  // Render the widget
  return <WidgetComponent />;
}

// Mount the app
const container = document.getElementById('app-container');
if (container && appExports?.AppMount) {
  appExports.AppMount(container, { appId });
}

// Unmount the app
if (appExports?.AppUnmount) {
  appExports.AppUnmount();
}
```

## Plugin Structure

### Namespace Pattern

```
window.__APPLICATOR_PLUGINS__ = {
  'task': {
    getAppAttributes: Function,
    AppMount: Function,
    AppUnmount: Function,
    widgets: {
      HomeWidget: ReactComponent,
      SettingsWidget: ReactComponent,
      SystemSettingsWidget: ReactComponent,
    }
  },
  'another-app': {
    getAppAttributes: Function,
    AppMount: Function,
    AppUnmount: Function,
    widgets: {
      HomeWidget: ReactComponent,  // No conflict!
      SettingsWidget: ReactComponent,
    }
  }
}
```

## Widget Development Guidelines

### Styling

Widgets should use inline styles matching the system theme:

```typescript
export default function MyWidget() {
  return (
    <div style={{
      background: '#1e293b',      // slate-800
      borderRadius: '10px',
      padding: '20px',
      border: '1px solid #334155', // slate-700
    }}>
      <h3 style={{
        color: '#f1f5f9',          // slate-100
        fontSize: '18px',
        fontWeight: '600',
      }}>
        Widget Title
      </h3>
      {/* Widget content */}
    </div>
  );
}
```

### Common Theme Colors

- **Backgrounds**: `#0f172a` (slate-900), `#1e293b` (slate-800)
- **Borders**: `#334155` (slate-700)
- **Text**: `#f1f5f9` (slate-100), `#e2e8f0` (slate-200), `#94a3b8` (slate-400)
- **Accent Blue**: `#3b82f6` (blue-500), `#2563eb` (blue-600)
- **Success Green**: `#34d399` (emerald-400), `#10b981` (emerald-500)
- **Warning Yellow**: `#fbbf24` (amber-400)
- **Danger Red**: `#ef4444` (red-500)

### State Management

Widgets can use:
- **React State** for UI state
- **localStorage** for user preferences
- **API calls** to `/api/[appId]/[endpoint]` for data

### Example Widget

```typescript
import React, { useState, useEffect } from 'react';

export default function MyHomeWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const response = await fetch('/api/my-app/stats');
      if (response.ok) {
        const json = await response.json();
        setData(json);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: '#1e293b',
      borderRadius: '10px',
      padding: '20px',
      border: '1px solid #334155',
    }}>
      <h3 style={{
        color: '#f1f5f9',
        fontSize: '18px',
        fontWeight: '600',
        marginBottom: '16px',
      }}>
        My Widget
      </h3>

      {loading ? (
        <div style={{ color: '#94a3b8' }}>Loading...</div>
      ) : (
        <div style={{ color: '#e2e8f0' }}>
          {/* Widget content */}
        </div>
      )}
    </div>
  );
}
```

## Widget Lifecycle

1. **Installation**: App declares widgets in `app.json`
2. **Loading**: App bundle loads and registers widgets in `__VIBE_APPS__`
3. **Discovery**: System reads widgets from app database record
4. **Rendering**: System accesses widget component from namespace and renders it
5. **Uninstallation**: Widgets are removed when app is uninstalled

## Best Practices

1. ✅ **Always use the `__APPLICATOR_PLUGINS__` namespace** for all exports
2. ✅ **Match the component name** in app.json with the exported widget name
3. ✅ **Use system theme colors** for consistency
4. ✅ **Handle loading states** gracefully
5. ✅ **Keep widgets focused** - one responsibility per widget
6. ✅ **Test with multiple apps** to ensure no conflicts
7. ❌ **Don't export to global scope directly** (e.g., `window.MyWidget`, `window.AppMount`)
8. ❌ **Don't use Tailwind classes** - use inline styles instead
9. ❌ **Don't make assumptions** about the container size

## Migration Guide

If you have an existing app without namespacing:

**Before (Legacy - DO NOT USE):**
```typescript
if (typeof window !== 'undefined') {
  (window as any).HomeWidget = HomeWidget;
  (window as any).SettingsWidget = SettingsWidget;
  (window as any).AppMount = AppMount;
  (window as any).AppUnmount = AppUnmount;
}
```

**After (Correct):**
```typescript
if (typeof window !== 'undefined') {
  if (!(window as any).__APPLICATOR_PLUGINS__) {
    (window as any).__APPLICATOR_PLUGINS__ = {};
  }

  (window as any).__APPLICATOR_PLUGINS__['your-app-id'] = {
    getAppAttributes,
    AppMount,
    AppUnmount,
    widgets: {
      HomeWidget,
      SettingsWidget,
    },
  };
}
```
