# Claude Code Assistant Guidelines

## ⚠️ CRITICAL RULES

### NO TAILWIND CSS
**This project does NOT use Tailwind CSS.**

- ❌ DO NOT use className with Tailwind classes (e.g., `className="flex items-center"`)
- ✅ ALWAYS use inline styles with the `style` prop
- ✅ Use the system theme color palette (see below)

**Example:**
```tsx
// ❌ WRONG - DO NOT DO THIS
<div className="flex items-center justify-center p-8">
  <div className="text-gray-400">Loading...</div>
</div>

// ✅ CORRECT - DO THIS INSTEAD
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
  <div style={{ color: '#94a3b8' }}>Loading...</div>
</div>
```

## System Theme Colors

Use these colors for consistency across the application:

### Backgrounds
- `#0f172a` - slate-900 (darkest)
- `#1e293b` - slate-800 (cards, containers)
- `#334155` - slate-700 (borders)

### Text
- `#f1f5f9` - slate-100 (primary text)
- `#e2e8f0` - slate-200 (secondary text)
- `#94a3b8` - slate-400 (muted text)

### Accent Colors
- **Blue**: `#3b82f6` (blue-500), `#2563eb` (blue-600)
- **Green**: `#34d399` (emerald-400), `#10b981` (emerald-500)
- **Yellow**: `#fbbf24` (amber-400)
- **Red**: `#ef4444` (red-500), `#f87171` (red-400)

## Plugin System

### Widget Exports
All plugins MUST export via the `__APPLICATOR_PLUGINS__` namespace:

```typescript
if (typeof window !== 'undefined') {
  if (!(window as any).__APPLICATOR_PLUGINS__) {
    (window as any).__APPLICATOR_PLUGINS__ = {};
  }

  (window as any).__APPLICATOR_PLUGINS__['app-id'] = {
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

### Widget Styling
- Use inline styles ONLY
- Match system theme colors
- No Tailwind classes
- Keep widgets self-contained

## File Structure

- `/apps/[app-name]/` - Plugin applications
- `/app/` - Next.js app directory
- `/lib/` - Shared libraries and SDK
- `/docs/` - Documentation

## Important Notes

- The project uses Next.js 15+ with App Router
- TypeScript is used throughout
- Redis for session storage
- File-based database for apps and records

## Development Workflow

### App Version Management
**IMPORTANT**: When making changes to an app in `/apps/[app-name]/`, ALWAYS update the version in `app.json`:

```json
{
  "version": {
    "major": 1,
    "minor": 0,
    "dev": 8
  }
}
```

Version follows a three-part structure:
- **major**: Increment for breaking changes (resets minor and dev to 0)
- **minor**: Increment for new features (resets dev to 0)
- **dev**: Increment for bug fixes and minor changes

Examples:
- Bug fix: `{ major: 1, minor: 0, dev: 8 }` → `{ major: 1, minor: 0, dev: 9 }`
- New feature: `{ major: 1, minor: 0, dev: 9 }` → `{ major: 1, minor: 1, dev: 0 }`
- Breaking change: `{ major: 1, minor: 1, dev: 0 }` → `{ major: 2, minor: 0, dev: 0 }`

### Dependencies
Apps can specify dependencies on other apps in `app.json`:

```json
{
  "dependencies": {
    "files": {
      "major": 1,
      "minor": 2,
      "dev": 0
    }
  }
}
```

- The system verifies dependencies during installation and upgrade
- Apps cannot be uninstalled if other apps depend on them
- Apps cannot depend on themselves
- All dependencies must be installed with minimum required versions

### Development Server
**DO NOT attempt to kill or restart the dev server** (`npm run dev`) - let the user manage it. The server runs with hot reload and will automatically pick up changes.

### File Operations
**DO NOT create `nul` files** - These are Windows null device files that should never be created in the project directory. If you see a `nul` file, it was created by mistake and should be removed.
