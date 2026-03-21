# Tooltip

Wraps any element and shows a text tooltip on hover. Renders via a portal and auto-flips placement if it would overflow the viewport.

```typescript
import { Tooltip } from "@applicator/sdk/components";
```

## Props

| Prop        | Type                                      | Default    | Description                                              |
| ----------- | ----------------------------------------- | ---------- | -------------------------------------------------------- |
| `text`      | `string`                                  | —          | Tooltip content (use `text` or `render`, not both)       |
| `render`    | `() => ReactNode`                         | —          | Custom tooltip content renderer                          |
| `placement` | `"top" \| "bottom" \| "left" \| "right"` | `"bottom"` | Preferred tooltip side                                   |
| `style`     | `React.CSSProperties`                     | —          | Styles applied to the wrapper `<span>` (e.g. `flex: 1`) |
| `children`  | `ReactNode`                               | required   | The element to wrap                                      |

## Usage

```tsx
<Tooltip text="Remove item" placement="top">
  <button onClick={remove}>×</button>
</Tooltip>
```

### Flex stretch

When `Tooltip` is a child of a flex container and you need it to stretch, pass `style={{ flex: 1 }}`:

```tsx
<div style={{ display: "flex" }}>
  <Tooltip text="Contribution" placement="top" style={{ flex: 1 }}>
    <Badge>{value}</Badge>
  </Tooltip>
</div>
```
