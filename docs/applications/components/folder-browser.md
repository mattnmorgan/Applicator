# FolderBrowser

A modal file browser for selecting directories on the server filesystem. Supports navigation, creating new folders, and deleting folders.

```typescript
import { FolderBrowser } from "@applicator/sdk/components";
```

## Props

| Prop          | Type                     | Default  | Description                         |
| ------------- | ------------------------ | -------- | ----------------------------------- |
| `isOpen`      | `boolean`                | required | Controls modal visibility           |
| `onClose`     | `() => void`             | required | Called when modal is dismissed      |
| `onConfirm`   | `(path: string) => void` | required | Called with selected directory path |
| `initialPath` | `string`                 | -        | Starting directory path             |

## Usage

```tsx
const [showBrowser, setShowBrowser] = useState(false);

<button onClick={() => setShowBrowser(true)}>Select Folder</button>

<FolderBrowser
  isOpen={showBrowser}
  onClose={() => setShowBrowser(false)}
  onConfirm={(path) => {
    console.log('Selected:', path);
    setShowBrowser(false);
  }}
  initialPath="/home/user/documents"
/>
```

Note: FolderBrowser uses the system filesystem API and requires appropriate permissions.
