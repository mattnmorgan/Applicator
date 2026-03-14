# ButtonMenu

A dropdown menu that opens from a trigger element. Uses portals for correct positioning.

```typescript
import { ButtonMenu } from "@applicator/sdk/components";
```

## Props

| Prop             | Type                | Default   | Description                                          |
| ---------------- | ------------------- | --------- | ---------------------------------------------------- |
| `children`       | `ReactNode`         | -         | Legacy trigger or custom dropdown content            |
| `options`        | `array`             | -         | Menu items (see below)                               |
| `trigger`        | `ReactNode`         | -         | Trigger element (preferred over children)            |
| `disabled`       | `boolean`           | `false`   | Disabled state                                       |
| `alignment`      | `"left" \| "right"` | `"right"` | Dropdown alignment relative to trigger               |
| `visibleOptions` | `number`            | -         | Max visible items before scrolling                   |
| `popover`        | `string`            | -         | Tooltip text shown on hover over the trigger         |

## Options Array

Each entry is either a menu item or a separator:

```typescript
// Menu item
{
  type?: "item";         // Optional, defaults to item
  label: string;         // Menu item text
  icon: ReactNode | string; // Icon element or icon name string (e.g. "edit")
  onClick: () => void;   // Click handler
  active?: boolean;      // Highlight item as active/selected
  disabled?: boolean;    // Disable the item
}

// Separator
{ type: "separator" }
```

## Usage

```tsx
<ButtonMenu
  trigger={<button>Actions</button>}
  options={[
    {
      label: "Edit",
      icon: "edit",
      onClick: () => handleEdit(),
    },
    { type: "separator" },
    {
      label: "Delete",
      icon: "trash",
      onClick: () => handleDelete(),
      disabled: !canDelete,
    },
  ]}
/>
```
