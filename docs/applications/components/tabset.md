# Tabset

A navigation component supporting both vertical tree view and horizontal tab layouts. Vertical mode supports nested items, search filtering, and auto-expand.

```typescript
import { Tabset } from "@applicator/sdk/components";
import type { TabsetItem } from "@applicator/sdk/components";
```

## TabsetItem Interface

```typescript
interface TabsetItem {
  label: string;            // Display text
  path?: string;            // Navigation path — rendered as <a href> for middle-click/ctrl+click support; left-click uses router.push
  children?: TabsetItem[];  // Nested items (vertical mode only)
  clickable?: boolean;      // Whether the item triggers navigation (default: true)
}
```

## Props

| Prop         | Type                         | Default      | Description                        |
| ------------ | ---------------------------- | ------------ | ---------------------------------- |
| `items`      | `TabsetItem[]`               | required     | Navigation items                   |
| `variant`    | `"vertical" \| "horizontal"` | `"vertical"` | Layout direction                   |
| `searchable` | `boolean`                    | `false`      | Show search filter (vertical only) |
| `autoExpand` | `boolean`                    | `false`      | Expand all tree nodes by default   |

## Usage

```tsx
// Vertical tree navigation
<Tabset
  items={[
    {
      label: 'Documents',
      children: [
        { label: 'My Docs', path: '/app/my-app/docs/mine' },
        { label: 'Shared', path: '/app/my-app/docs/shared' },
      ],
    },
    { label: 'Settings', path: '/app/my-app/settings' },
  ]}
  searchable
/>

// Horizontal tabs
<Tabset
  variant="horizontal"
  items={[
    { label: 'Overview', path: '/app/my-app/overview' },
    { label: 'Details', path: '/app/my-app/details' },
    { label: 'History', path: '/app/my-app/history' },
  ]}
/>
```
