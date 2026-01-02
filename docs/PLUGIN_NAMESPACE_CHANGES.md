# Plugin Namespace Changes

## Overview

The plugin system has been updated to use a cleaner, more standardized namespace pattern without legacy exports.

## Changes

### 1. Namespace Renamed

**Old:** `window.__VIBE_APPS__`
**New:** `window.__APPLICATOR_PLUGINS__`

This provides a more descriptive name that matches the system's purpose.

### 2. Removed Legacy Exports

Legacy global exports have been removed. Apps should ONLY export via the namespace:

**Before:**
```typescript
// ❌ DO NOT USE
window.getAppAttributes = getAppAttributes;
window.AppMount = AppMount;
window.AppUnmount = AppUnmount;
window.HomeWidget = HomeWidget;
```

**After:**
```typescript
// ✅ CORRECT
window.__APPLICATOR_PLUGINS__['my-app'] = {
  getAppAttributes,
  AppMount,
  AppUnmount,
  widgets: {
    HomeWidget,
    SettingsWidget,
  }
};
```

### 3. Updated App Loading

The app page (`app/app/[appId]/page.tsx`) now properly accesses apps through the namespace:

**Before:**
```typescript
if (window.AppMount) {
  window.AppMount(container, { appId });
}
```

**After:**
```typescript
const appExports = window.__APPLICATOR_PLUGINS__?.[appId];
if (appExports?.AppMount) {
  appExports.AppMount(container, { appId });
}
```

## Plugin Export Structure

Each plugin must export in this exact structure:

```typescript
if (typeof window !== 'undefined') {
  if (!window.__APPLICATOR_PLUGINS__) {
    window.__APPLICATOR_PLUGINS__ = {};
  }

  window.__APPLICATOR_PLUGINS__['your-app-id'] = {
    getAppAttributes: Function,      // Returns app metadata
    AppMount: Function,              // Mounts the app to a container
    AppUnmount: Function,            // Cleanup when unmounting
    widgets: {                       // Optional: UI widgets
      HomeWidget?: ReactComponent,
      SettingsWidget?: ReactComponent,
      SystemSettingsWidget?: ReactComponent,
    }
  };
}
```

## Benefits

1. **No Conflicts**: Each app has its own isolated namespace
2. **Clean Global Scope**: No pollution of `window` object
3. **Type-Safe**: Full TypeScript support via `types/vibe-apps.d.ts`
4. **Discoverable**: Easy to inspect `window.__APPLICATOR_PLUGINS__` to see loaded apps
5. **Consistent**: Single source of truth for app exports

## Migration Checklist

If you have an existing plugin:

- [ ] Update export code to use `__APPLICATOR_PLUGINS__` namespace
- [ ] Remove all legacy `window.AppMount`, `window.getAppAttributes`, etc. exports
- [ ] Remove all direct widget exports like `window.HomeWidget`
- [ ] Ensure app ID in namespace matches app.json `id` field
- [ ] Test app loading and mounting
- [ ] Test widget rendering (if applicable)
- [ ] Rebuild app bundle

## Example: Task App

Complete example from `apps/task/src/index.tsx`:

```typescript
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import HomeWidget from './widgets/HomeWidget';
import SettingsWidget from './widgets/SettingsWidget';
import SystemSettingsWidget from './widgets/SystemSettingsWidget';

// Export for ES modules
export { HomeWidget, SettingsWidget, SystemSettingsWidget };

export function getAppAttributes() {
  return {
    appId: 'task',
    name: 'Task Manager',
    version: '1.0.0',
    // ... other metadata
  };
}

export function AppMount(container: HTMLElement, context: { appId: string }) {
  const root = createRoot(container);
  root.render(<App />);
}

export function AppUnmount() {
  // Cleanup if needed
}

// Global namespace registration
if (typeof window !== 'undefined') {
  if (!window.__APPLICATOR_PLUGINS__) {
    window.__APPLICATOR_PLUGINS__ = {};
  }

  window.__APPLICATOR_PLUGINS__['task'] = {
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

## Accessing Plugins

### Mounting an App

```typescript
const appId = 'task';
const container = document.getElementById('app-container');
const appExports = window.__APPLICATOR_PLUGINS__?.[appId];

if (appExports && container) {
  appExports.AppMount(container, { appId });
}
```

### Rendering a Widget

```typescript
const appId = 'task';
const widgetName = 'HomeWidget';
const WidgetComponent = window.__APPLICATOR_PLUGINS__?.[appId]?.widgets?.[widgetName];

if (WidgetComponent) {
  return <WidgetComponent />;
}
```

### Getting App Metadata

```typescript
const appId = 'task';
const appExports = window.__APPLICATOR_PLUGINS__?.[appId];
const metadata = appExports?.getAppAttributes();

console.log(metadata?.name); // "Task Manager"
```

## Files Modified

1. `apps/task/src/index.tsx` - Updated to use new namespace, removed legacy exports
2. `app/app/[appId]/page.tsx` - Updated app loading logic
3. `types/vibe-apps.d.ts` - Updated TypeScript definitions
4. `docs/PLUGIN_WIDGET_SYSTEM.md` - Updated documentation
5. `lib/examples/example-plugin.ts` - Updated comments

## TypeScript Support

The `types/vibe-apps.d.ts` file provides full type safety:

```typescript
declare global {
  interface Window {
    __APPLICATOR_PLUGINS__?: {
      [appId: string]: {
        getAppAttributes: () => { /* ... */ };
        AppMount: (container: HTMLElement, context: { appId: string }) => void;
        AppUnmount: () => void;
        widgets: Record<string, React.ComponentType<any>>;
      };
    };
  }
}
```

This enables autocomplete and type checking when accessing plugins.
