# Badge

A colored label for categorizing or highlighting content.

```typescript
import { Badge } from "@applicator/sdk/components";
```

## Props

| Prop        | Type                   | Default    | Description              |
| ----------- | ---------------------- | ---------- | ------------------------ |
| `children`  | `ReactNode`            | required   | Badge content            |
| `variant`   | `string`               | `"blue"`   | Color variant            |
| `shape`     | `"circle" \| "square"` | `"circle"` | Border radius style      |
| `uppercase` | `boolean`              | `false`    | Uppercase text transform |

## Variants

`purple`, `blue`, `yellow`, `green`, `red`, `gray`, `cyan`, `pink`, `orange`, `emerald`, `amber`, `brown`, `lime`

## Usage

```tsx
<Badge variant="green">Active</Badge>
<Badge variant="red" shape="square">Error</Badge>
<Badge variant="purple" uppercase>Admin</Badge>
```
