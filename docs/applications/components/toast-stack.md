# ToastStack

A multi-toast manager that renders all active notifications in a stacked column via a portal into `document.body`. Use this whenever multiple toasts may be queued simultaneously.

```typescript
import { ToastStack } from "@applicator/sdk/components";
import type { ToastItem } from "@applicator/sdk/components";
```

## ToastItem Interface

```typescript
interface ToastItem {
  message: string;
  title?: string;
  type: "success" | "error";
  duration?: number; // defaults to 3000ms; 0 = no auto-dismiss
}
```

## Props

| Prop      | Type                      | Default  | Description                                  |
| --------- | ------------------------- | -------- | -------------------------------------------- |
| `toasts`  | `ToastItem[]`             | required | Active toast notifications                   |
| `onClose` | `(index: number) => void` | required | Called with the index of the dismissed toast |

## Usage

```tsx
const [toasts, setToasts] = useState<ToastItem[]>([]);

const addToast = (toast: ToastItem) => {
  setToasts((prev) => [...prev, toast]);
};

const removeToast = (index: number) => {
  setToasts((prev) => prev.filter((_, i) => i !== index));
};

// Show a notification
addToast({ message: "Item saved", type: "success" });
addToast({ title: "Upload failed", message: "File too large", type: "error" });

// Render (place once, at the top level of your component)
<ToastStack toasts={toasts} onClose={removeToast} />
```
