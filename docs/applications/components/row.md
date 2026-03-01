# Row

A simple styled row container with optional click handler.

```typescript
import { Row } from "@applicator/sdk/components";
```

## Props

| Prop       | Type         | Default  | Description   |
| ---------- | ------------ | -------- | ------------- |
| `children` | `ReactNode`  | required | Row content   |
| `onClick`  | `() => void` | -        | Click handler |

## Usage

```tsx
<Row onClick={() => selectItem(item)}>
  <span>{item.name}</span>
  <Badge variant="green">{item.status}</Badge>
</Row>
```
