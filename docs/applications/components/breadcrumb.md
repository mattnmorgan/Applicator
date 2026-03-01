# Breadcrumb

A navigation breadcrumb trail. Items can be clickable, disabled, or marked as the active (current) location.

```typescript
import { Breadcrumb } from "@applicator/sdk/components";
import type { BreadcrumbItem } from "@applicator/sdk/components";
```

## BreadcrumbItem Interface

```typescript
interface BreadcrumbItem {
  label: string;
  onClick?: () => void;    // If provided, item is rendered as a clickable link
  active?: boolean;        // Marks the current location — bold + blue
  disabled?: boolean;      // Prevents clicking even if onClick is set; shows tooltip
}
```

## Props

| Prop        | Type               | Default | Description                               |
| ----------- | ------------------ | ------- | ----------------------------------------- |
| `items`     | `BreadcrumbItem[]` | required | Ordered list of breadcrumb entries       |
| `separator` | `ReactNode`        | `">"`   | Separator rendered between items          |
| `style`     | `CSSProperties`    | -       | Optional style override for the container |

## Usage

```tsx
<Breadcrumb
  separator="/"
  items={[
    { label: "Home", onClick: () => navigate("/") },
    { label: "Documents", onClick: () => navigate("/docs") },
    { label: "report.pdf", active: true },
  ]}
/>

// Disable inaccessible ancestors:
<Breadcrumb
  items={[
    { label: "Home", onClick: currentPath ? () => navigate("") : undefined },
    { label: "shared-folder", disabled: true },          // no access
    { label: "subfolder", onClick: () => navigate("shared-folder/subfolder") },
  ]}
/>
```
