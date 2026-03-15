# Spinner

An animated loading indicator for use during async operations.

```typescript
import { Spinner } from "@applicator/sdk/components";
```

## Props

| Prop    | Type     | Default      | Description                               |
| ------- | -------- | ------------ | ----------------------------------------- |
| `size`  | `number` | `20`         | Diameter in pixels                        |
| `color` | `string` | `"#3b82f6"`  | Color of the spinning arc                 |
| `label` | `string` | `"Loading"`  | Accessible label for screen readers       |

## Usage

```tsx
// Default spinner
<Spinner />

// Larger spinner centered in a container
<div style={{ display: "flex", justifyContent: "center", padding: "32px" }}>
  <Spinner size={36} />
</div>

// Inline spinner inside a button
<Button variant="primary" disabled={saving}>
  {saving ? <><Spinner size={14} color="#fff" /> Saving...</> : "Save"}
</Button>

// Full-page overlay while processing
{processing && (
  <div style={{
    position: "absolute",
    inset: 0,
    background: "rgba(15, 23, 42, 0.75)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    zIndex: 1000,
  }}>
    <Spinner size={36} />
    <span style={{ color: "#94a3b8", fontSize: "14px" }}>Processing...</span>
  </div>
)}
```
