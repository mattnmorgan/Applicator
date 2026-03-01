# Tooltip

Wraps any element and shows a text tooltip on hover. Renders via a portal and auto-flips placement if it would overflow the viewport.

```typescript
import { Tooltip } from "@applicator/sdk/components";
```

## Props

| Prop        | Type                                      | Default    | Description             |
| ----------- | ----------------------------------------- | ---------- | ----------------------- |
| `text`      | `string`                                  | required   | Tooltip content         |
| `placement` | `"top" \| "bottom" \| "left" \| "right"` | `"bottom"` | Preferred tooltip side  |
| `children`  | `ReactNode`                               | required   | The element to wrap     |

## Usage

```tsx
<Tooltip text="Remove item" placement="top">
  <button onClick={remove}>×</button>
</Tooltip>
```
