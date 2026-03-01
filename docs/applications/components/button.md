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
| `style`            | `CSSProperties`                                                              | -           | Inline style override           |

## Usage

```tsx
<Button onClick={() => save()}>Save</Button>
<Button variant="danger" onClick={() => confirmDelete()}>Delete</Button>
<Button variant="ghost" disabled>Unavailable</Button>
<Button variant="primary" popover="Copies to clipboard" onClick={copy}>
  <Icon name="copy" size={14} /> Copy
</Button>
```
