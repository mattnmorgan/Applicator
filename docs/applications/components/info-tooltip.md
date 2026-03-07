# InfoTooltip

A small inline `(?)` indicator that shows a tooltip on hover. Use it alongside labels to surface contextual help text without cluttering the UI.

```typescript
import { InfoTooltip } from "@applicator/sdk/components";
```

## Props

| Prop        | Type                                      | Default  | Description                        |
| ----------- | ----------------------------------------- | -------- | ---------------------------------- |
| `text`      | `string`                                  | required | Tooltip content                    |
| `placement` | `"top" \| "bottom" \| "left" \| "right"` | `"top"`  | Preferred tooltip side             |

## Usage

```tsx
<label style={{ display: "flex", alignItems: "center", gap: 4 }}>
  API Key
  <InfoTooltip text="Found in your account settings under Developer → API Keys." />
</label>
```

## Notes

- Renders as a 14×14 px circular `(?)` badge inline with surrounding text.
- Built on top of [`Tooltip`](./tooltip.md) and inherits its auto-flip behavior.
- When used with `DynamicInput`, set the `tooltip` field on the input definition instead of rendering `InfoTooltip` directly — the component handles it automatically.
