# ButtonIcon

An icon-only button with a tooltip that appears on hover. Supports named icons via `name` or a custom element via `icon`.

```typescript
import { ButtonIcon } from "@applicator/sdk/components";
```

## Props

| Prop         | Type                                           | Default     | Description                                          |
| ------------ | ---------------------------------------------- | ----------- | ---------------------------------------------------- |
| `label`      | `string`                                       | required    | Tooltip text and accessible label                    |
| `onClick`    | `() => void`                                   | required    | Click handler                                        |
| `name`       | `IconName`                                     | -           | Named icon (see [Icon](./icon.md)). Takes precedence over `icon`. |
| `iconSize`   | `number`                                       | `16`        | Size in pixels when using `name`                     |
| `icon`       | `ReactNode`                                    | -           | Custom icon element (used when `name` is not set)    |
| `variant`    | `"bare" \| "bordered"`                         | `"bare"`    | Visual style                                         |
| `subvariant` | `"danger" \| "warning" \| "info" \| "neutral"` | `"neutral"` | Hover color theme                                    |
| `size`       | `"sm" \| "md"`                                 | `"md"`      | Button padding. `"sm"` = 2px bare / 4px bordered, `"md"` = 4px bare / 6px bordered |
| `active`     | `boolean`                                      | `false`     | When true, shows the subvariant color persistently (for toggle buttons) |
| `disabled`   | `boolean`                                      | `false`     | Disabled state                                       |
| `placement`  | `"top" \| "bottom" \| "left" \| "right"`       | `"bottom"`  | Tooltip placement                                    |

## Usage

```tsx
// Using a named icon (preferred)
<ButtonIcon name="trash" label="Delete" onClick={handleDelete} subvariant="danger" />
<ButtonIcon name="refresh" label="Refresh" onClick={reload} variant="bordered" />

// Compact size for dense UIs
<ButtonIcon name="trash" label="Delete" onClick={handleDelete} size="sm" subvariant="danger" />

// Active/toggle state (e.g. watch button)
<ButtonIcon
  name="eye"
  label={watching ? "Unwatch" : "Watch"}
  onClick={toggleWatch}
  active={watching}
  subvariant="info"
/>

// Using a custom icon element
<ButtonIcon
  icon={<svg width="16" height="16">...</svg>}
  label="Custom action"
  onClick={handleAction}
/>
```
