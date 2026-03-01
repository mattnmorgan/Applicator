# Accordion

A collapsible content section with a title header and expand/collapse toggle.

```typescript
import { Accordion } from "@applicator/sdk/components";
```

## Props

| Prop          | Type        | Default  | Description              |
| ------------- | ----------- | -------- | ------------------------ |
| `title`       | `ReactNode` | required | Header content           |
| `children`    | `ReactNode` | required | Collapsible body content |
| `defaultOpen` | `boolean`   | `false`  | Initial expanded state   |

## Usage

```tsx
<Accordion title="Advanced Settings" defaultOpen={false}>
  <div>
    <p>Configuration options here...</p>
  </div>
</Accordion>
```
