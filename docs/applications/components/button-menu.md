# ButtonMenu

A dropdown menu that opens from a trigger element. Uses portals for correct positioning.

```typescript
import { ButtonMenu } from "@applicator/sdk/components";
```

## Props

| Prop        | Type                | Default   | Description                               |
| ----------- | ------------------- | --------- | ----------------------------------------- |
| `children`  | `ReactNode`         | required  | Legacy trigger or custom dropdown content |
| `options`   | `array`             | -         | Menu items (see below)                    |
| `trigger`   | `ReactNode`         | -         | Trigger element (preferred over children) |
| `disabled`  | `boolean`           | `false`   | Disabled state                            |
| `alignment` | `"left" \| "right"` | `"right"` | Dropdown alignment relative to trigger    |

## Options Array

```typescript
{
  label: string;        // Menu item text
  icon: ReactNode;      // Menu item icon
  onClick: () => void;  // Click handler
}[]
```

## Usage

```tsx
<ButtonMenu
  trigger={<button>Actions</button>}
  options={[
    {
      label: "Edit",
      icon: <EditIcon />,
      onClick: () => handleEdit(),
    },
    {
      label: "Delete",
      icon: <DeleteIcon />,
      onClick: () => handleDelete(),
    },
  ]}
/>
```
