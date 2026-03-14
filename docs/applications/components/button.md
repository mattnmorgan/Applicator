# Button

A standard action button with multiple semantic variants and optional tooltip support.

```typescript
import { Button } from "@applicator/sdk/components";
```

## Props

| Prop               | Type                                                                         | Default     | Description                     |
| ------------------ | ---------------------------------------------------------------------------- | ----------- | ------------------------------- |
| `children`         | `ReactNode`                                                                  | required    | Button label/content            |
| `onClick`          | `() => void`                                                                 | -           | Click handler                   |
| `type`             | `"button" \| "submit" \| "reset"`                                            | `"button"`  | HTML button type                |
| `variant`          | `"primary" \| "secondary" \| "ghost" \| "danger" \| "success" \| "warning"` | `"primary"` | Color and style variant         |
| `disabled`         | `boolean`                                                                    | `false`     | Disabled state                  |
| `fullWidth`        | `boolean`                                                                    | `false`     | Stretch to fill container width |
| `title`            | `string`                                                                     | -           | Native HTML title attribute     |
| `popover`          | `string`                                                                     | -           | Tooltip text shown on hover     |
| `popoverPlacement` | `"top" \| "bottom" \| "left" \| "right"`                                    | `"bottom"`  | Tooltip placement               |
| `colors`           | `ButtonColors`                                                               | -           | Override individual color states (see below) |
| `style`            | `CSSProperties`                                                              | -           | Inline style override           |

## ButtonColors

Overrides individual color states. Unset fields fall back to the variant defaults.

```typescript
interface ButtonColors {
  base?: string;   // Background color at rest
  hover?: string;  // Background color on hover
  active?: string; // Background color when pressed (falls back to hover if unset)
  text?: string;   // Text color
  border?: string; // Border value (e.g. "1px solid #334155")
}
```

## Usage

```tsx
<Button onClick={() => save()}>Save</Button>
<Button variant="danger" onClick={() => confirmDelete()}>Delete</Button>
<Button variant="ghost" disabled>Unavailable</Button>
<Button variant="primary" popover="Copies to clipboard" onClick={copy}>
  <Icon name="copy" size={14} /> Copy
</Button>
```
