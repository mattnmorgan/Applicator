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
