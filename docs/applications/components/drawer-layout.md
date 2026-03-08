# DrawerLayout

A responsive layout component with optional collapsible side panels. Panels can be configured as `inline` (resizing center content) or `overlay` (floating above it). On screens ≤ 768 px, `inline` panels automatically behave as `overlay` and expand to full width when open.

```typescript
import { DrawerLayout } from "@applicator/sdk/components";
import type { DrawerLayoutProps, DrawerPanelConfig } from "@applicator/sdk/components";
```

## Props

### DrawerLayoutProps

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `leftPanel` | `DrawerPanelConfig` | — | Configuration for the left panel |
| `rightPanel` | `DrawerPanelConfig` | — | Configuration for the right panel |
| `children` | `ReactNode` | required | Center content |
| `style` | `CSSProperties` | — | Additional styles on the root container |

### DrawerPanelConfig

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `width` | `number` | `25` | Panel width as a percentage of the container |
| `open` | `boolean` | `false` | Whether the panel is currently visible |
| `type` | `"inline" \| "overlay"` | `"overlay"` | `inline` shrinks center content; `overlay` floats above it |
| `closeable` | `boolean` | `false` | Show a close (×) button in the panel header |
| `title` | `string` | — | Title displayed in the panel header |
| `openable` | `boolean` | `false` | Render a floating open button (via portal) when the panel is closed |
| `iconName` | `IconName` | — | Icon used on the floating open button |
| `variant` | `"bare" \| "bordered"` | `"bordered"` | Style variant for the floating open button |
| `onClose` | `() => void` | — | Called when the close button is clicked |
| `onOpen` | `() => void` | — | Called when the floating open button is clicked |
| `children` | `ReactNode` | — | Panel content |

## Behavior

- **`inline`**: When the panel is open the center column shrinks to `100% - panelWidth%`. On mobile (≤ 768 px) this behaves identically to `overlay` and the panel expands to 100% width.
- **`overlay`**: The panel floats over the center content with a translucent blur backdrop. Clicking the backdrop calls `onClose`.
- **`openable`**: When `true` and the panel is closed, a `ButtonIcon` is rendered into `document.body` via a React portal, anchored to the corresponding corner of the viewport.

## Usage

```tsx
"use client";

import { useState } from "react";
import { DrawerLayout, Tabset } from "@applicator/sdk/components";

export default function MyLayout({ children }) {
  const [navOpen, setNavOpen] = useState(true);

  return (
    <DrawerLayout
      style={{ height: "calc(100vh - 64px)" }}
      leftPanel={{
        open: navOpen,
        type: "inline",
        width: 25,
        closeable: true,
        title: "Navigation",
        openable: true,
        iconName: "hamburger",
        onClose: () => setNavOpen(false),
        onOpen: () => setNavOpen(true),
        children: <Tabset items={navItems} variant="vertical" />,
      }}
    >
      <div style={{ padding: "20px" }}>{children}</div>
    </DrawerLayout>
  );
}
```

## Notes

- `DrawerLayout` itself is a `"use client"` component and must be used inside a client component tree.
- The floating open button portal is only mounted on the client after hydration.
- Use the `hamburger` icon for panel toggle buttons — see [Icon](./icon.md) for all available icon names.
