# ConfirmModal

A confirmation dialog with cancel and confirm buttons. Closes on Escape key or overlay click.

```typescript
import { ConfirmModal } from "@applicator/sdk/components";
```

## Props

| Prop          | Type         | Default     | Description                               |
| ------------- | ------------ | ----------- | ----------------------------------------- |
| `title`       | `string`     | required    | Modal title                               |
| `message`     | `string`     | required    | Confirmation message                      |
| `confirmText` | `string`     | `"Confirm"` | Confirm button label                      |
| `cancelText`  | `string`     | `"Cancel"`  | Cancel button label                       |
| `onConfirm`   | `() => void` | required    | Called on confirm                         |
| `onCancel`    | `() => void` | required    | Called on cancel or dismiss               |
| `danger`      | `boolean`    | `false`     | Red danger styling for the confirm button |
| `loading`     | `boolean`    | `false`     | Shows a spinner in the confirm button and disables all interactions |

## Usage

```tsx
const [showConfirm, setShowConfirm] = useState(false);

{showConfirm && (
  <ConfirmModal
    title="Delete Item"
    message="Are you sure you want to delete this item? This action cannot be undone."
    confirmText="Delete"
    onConfirm={() => {
      deleteItem();
      setShowConfirm(false);
    }}
    onCancel={() => setShowConfirm(false)}
    danger
  />
)}
```
