# Reusable Components

The platform provides reusable React components that apps can import from `@applicator/sdk`. These components follow the platform's dark theme and are used throughout the system UI.

## Importing Components

Components are available through the `@applicator/sdk` package (linked via npm):

```typescript
import { Badge, Toast, ConfirmModal } from "@applicator/sdk/components";
```

All components are exported from a single barrel file. Use named imports to pick what you need.

---

## Badge

A colored label for categorizing or highlighting content.

```typescript
import { Badge } from "@applicator/sdk/components";
```

### Props

| Prop        | Type                   | Default    | Description              |
| ----------- | ---------------------- | ---------- | ------------------------ |
| `children`  | `ReactNode`            | required   | Badge content            |
| `variant`   | `string`               | `"blue"`   | Color variant            |
| `shape`     | `"circle" \| "square"` | `"circle"` | Border radius style      |
| `uppercase` | `boolean`              | `false`    | Uppercase text transform |

### Variants

`purple`, `blue`, `yellow`, `green`, `red`, `gray`, `cyan`, `pink`, `orange`, `emerald`, `amber`, `brown`, `lime`

### Usage

```tsx
<Badge variant="green">Active</Badge>
<Badge variant="red" shape="square">Error</Badge>
<Badge variant="purple" uppercase>Admin</Badge>
```

---

## Toast

A temporary notification that auto-dismisses after a duration.

```typescript
import { Toast } from "@applicator/sdk/components";
```

### Props

| Prop       | Type                   | Default  | Description                                     |
| ---------- | ---------------------- | -------- | ----------------------------------------------- |
| `message`  | `string`               | required | Notification message                            |
| `type`     | `"success" \| "error"` | required | Notification type (determines color and icon)   |
| `onClose`  | `() => void`           | required | Called when toast dismisses or close is clicked |
| `duration` | `number`               | `3000`   | Auto-dismiss duration in milliseconds           |

### Usage

```tsx
const [toast, setToast] = useState<{
  message: string;
  type: "success" | "error";
} | null>(null);

// Show toast
setToast({ message: "Item saved", type: "success" });

// Render
{
  toast && (
    <Toast
      message={toast.message}
      type={toast.type}
      onClose={() => setToast(null)}
    />
  );
}
```

---

## ConfirmModal

A confirmation dialog with cancel and confirm buttons. Closes on Escape key or overlay click.

```typescript
import { ConfirmModal } from "@applicator/sdk/components";
```

### Props

| Prop          | Type         | Default     | Description                               |
| ------------- | ------------ | ----------- | ----------------------------------------- |
| `title`       | `string`     | required    | Modal title                               |
| `message`     | `string`     | required    | Confirmation message                      |
| `confirmText` | `string`     | `"Confirm"` | Confirm button label                      |
| `cancelText`  | `string`     | `"Cancel"`  | Cancel button label                       |
| `onConfirm`   | `() => void` | required    | Called on confirm                         |
| `onCancel`    | `() => void` | required    | Called on cancel or dismiss               |
| `danger`      | `boolean`    | `false`     | Red danger styling for the confirm button |

### Usage

```tsx
const [showConfirm, setShowConfirm] = useState(false);

{
  showConfirm && (
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
  );
}
```

---

## Accordion

A collapsible content section with a title header and expand/collapse toggle.

```typescript
import { Accordion } from "@applicator/sdk/components";
```

### Props

| Prop          | Type        | Default  | Description              |
| ------------- | ----------- | -------- | ------------------------ |
| `title`       | `ReactNode` | required | Header content           |
| `children`    | `ReactNode` | required | Collapsible body content |
| `defaultOpen` | `boolean`   | `false`  | Initial expanded state   |

### Usage

```tsx
<Accordion title="Advanced Settings" defaultOpen={false}>
  <div>
    <p>Configuration options here...</p>
  </div>
</Accordion>
```

---

## Tabset

A navigation component supporting both vertical tree view and horizontal tab layouts. Vertical mode supports nested items, search filtering, and auto-expand.

```typescript
import { Tabset } from "@applicator/sdk/components";
import type { TabsetItem } from "@applicator/sdk/components";
```

### TabsetItem Interface

```typescript
interface TabsetItem {
  label: string; // Display text
  path?: string; // Navigation path (triggers router.push)
  children?: TabsetItem[]; // Nested items (vertical mode only)
  clickable?: boolean; // Whether the item triggers navigation (default: true)
}
```

### Props

| Prop         | Type                         | Default      | Description                        |
| ------------ | ---------------------------- | ------------ | ---------------------------------- |
| `items`      | `TabsetItem[]`               | required     | Navigation items                   |
| `variant`    | `"vertical" \| "horizontal"` | `"vertical"` | Layout direction                   |
| `searchable` | `boolean`                    | `false`      | Show search filter (vertical only) |
| `autoExpand` | `boolean`                    | `false`      | Expand all tree nodes by default   |

### Usage

```tsx
// Vertical tree navigation
<Tabset
  items={[
    {
      label: 'Documents',
      children: [
        { label: 'My Docs', path: '/app/my-app/docs/mine' },
        { label: 'Shared', path: '/app/my-app/docs/shared' },
      ],
    },
    { label: 'Settings', path: '/app/my-app/settings' },
  ]}
  searchable
/>

// Horizontal tabs
<Tabset
  variant="horizontal"
  items={[
    { label: 'Overview', path: '/app/my-app/overview' },
    { label: 'Details', path: '/app/my-app/details' },
    { label: 'History', path: '/app/my-app/history' },
  ]}
/>
```

---

## Row

A simple styled row container with optional click handler.

```typescript
import { Row } from "@applicator/sdk/components";
```

### Props

| Prop       | Type         | Default  | Description   |
| ---------- | ------------ | -------- | ------------- |
| `children` | `ReactNode`  | required | Row content   |
| `onClick`  | `() => void` | -        | Click handler |

### Usage

```tsx
<Row onClick={() => selectItem(item)}>
  <span>{item.name}</span>
  <Badge variant="green">{item.status}</Badge>
</Row>
```

---

## ButtonIcon

An icon button with a tooltip that appears on hover. Supports semantic color variants.

```typescript
import { ButtonIcon } from "@applicator/sdk/components";
```

### Props

| Prop         | Type                                           | Default     | Description                     |
| ------------ | ---------------------------------------------- | ----------- | ------------------------------- |
| `icon`       | `ReactNode`                                    | required    | Icon element (typically an SVG) |
| `label`      | `string`                                       | required    | Tooltip text and aria-label     |
| `onClick`    | `() => void`                                   | required    | Click handler                   |
| `variant`    | `"bare" \| "bordered"`                         | `"bare"`    | Visual style                    |
| `subvariant` | `"danger" \| "warning" \| "info" \| "neutral"` | `"neutral"` | Hover color theme               |
| `disabled`   | `boolean`                                      | `false`     | Disabled state                  |

### Usage

```tsx
<ButtonIcon
  icon={
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M4 6V13C4 13.5523 4.44772 14 5 14H11C11.5523 14 12 13.5523 12 13V6M2 4H14M6 4V3C6 2.44772 6.44772 2 7 2H9C9.55228 2 10 2.44772 10 3V4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  }
  label="Delete"
  onClick={() => handleDelete()}
  subvariant="danger"
/>
```

---

## ButtonMenu

A dropdown menu that opens from a trigger element. Uses portals for correct positioning.

```typescript
import { ButtonMenu } from "@applicator/sdk/components";
```

### Props

| Prop        | Type                | Default   | Description                               |
| ----------- | ------------------- | --------- | ----------------------------------------- |
| `children`  | `ReactNode`         | required  | Legacy trigger or custom dropdown content |
| `options`   | `array`             | -         | Menu items (see below)                    |
| `trigger`   | `ReactNode`         | -         | Trigger element (preferred over children) |
| `disabled`  | `boolean`           | `false`   | Disabled state                            |
| `alignment` | `"left" \| "right"` | `"right"` | Dropdown alignment relative to trigger    |

### Options Array

```typescript
{
  label: string;        // Menu item text
  icon: ReactNode;      // Menu item icon
  onClick: () => void;  // Click handler
}[]
```

### Usage

```tsx
<ButtonMenu
  trigger={<button>Actions</button>}
  options={[
    {
      label: "Edit",
      icon: <EditIcon />,
      onClick: () => handleEdit(),
    },
    {
      label: "Delete",
      icon: <DeleteIcon />,
      onClick: () => handleDelete(),
    },
  ]}
/>
```

---

## ProfileIndicator

Displays a user's avatar (or first-letter placeholder) with their display name.

```typescript
import { ProfileIndicator } from "@applicator/sdk/components";
```

### Props

| Prop             | Type     | Default  | Description          |
| ---------------- | -------- | -------- | -------------------- |
| `displayName`    | `string` | required | User's display name  |
| `profilePicture` | `string` | -        | URL to profile image |

### Usage

```tsx
<ProfileIndicator displayName="John Doe" />
<ProfileIndicator displayName="Jane" profilePicture="/api/my-app/assets/avatar.png" />
```

---

## SearchableCombobox

A generic searchable dropdown with single or multi-select support. Fully controlled component with type-safe generics.

```typescript
import { SearchableCombobox } from "@applicator/sdk/components";
```

### Props

| Prop                | Type                                       | Default       | Description                           |
| ------------------- | ------------------------------------------ | ------------- | ------------------------------------- |
| `items`             | `T[]`                                      | required      | All available items                   |
| `renderItem`        | `(item: T) => ReactNode`                   | required      | Render function for dropdown items    |
| `filterItem`        | `(item: T, searchTerm: string) => boolean` | required      | Filter function for search            |
| `selectedItems`     | `T[]`                                      | required      | Currently selected items              |
| `onSelectionChange` | `(items: T[]) => void`                     | required      | Selection change handler              |
| `getItemKey`        | `(item: T) => string`                      | required      | Unique key extractor                  |
| `multiSelect`       | `boolean`                                  | `false`       | Allow multiple selections             |
| `placeholder`       | `string`                                   | `"Search..."` | Input placeholder                     |
| `renderSelected`    | `(item: T) => ReactNode`                   | -             | Custom render for selected item chips |

### Usage

```tsx
interface User {
  id: string;
  name: string;
  email: string;
}

const [selected, setSelected] = useState<User[]>([]);

<SearchableCombobox<User>
  items={users}
  renderItem={(user) => (
    <div>
      <strong>{user.name}</strong>
      <span style={{ color: "#94a3b8" }}> {user.email}</span>
    </div>
  )}
  filterItem={(user, term) =>
    user.name.toLowerCase().includes(term.toLowerCase()) ||
    user.email.toLowerCase().includes(term.toLowerCase())
  }
  selectedItems={selected}
  onSelectionChange={setSelected}
  getItemKey={(user) => user.id}
  multiSelect
  placeholder="Search users..."
/>;
```

---

## AccessDenied

A full-page access denied message with a "Go Back" button.

```typescript
import { AccessDenied } from "@applicator/sdk/components";
```

### Props

| Prop      | Type     | Default                                             | Description   |
| --------- | -------- | --------------------------------------------------- | ------------- |
| `message` | `string` | `"You do not have permission to access this page."` | Error message |

### Usage

```tsx
if (!hasPermission) {
  return (
    <AccessDenied message="You need the 'manage' permission to access this page." />
  );
}
```

---

## FolderBrowser

A modal file browser for selecting directories on the server filesystem. Supports navigation, creating new folders, and deleting folders.

```typescript
import { FolderBrowser } from "@applicator/sdk/components";
```

### Props

| Prop          | Type                     | Default  | Description                         |
| ------------- | ------------------------ | -------- | ----------------------------------- |
| `isOpen`      | `boolean`                | required | Controls modal visibility           |
| `onClose`     | `() => void`             | required | Called when modal is dismissed      |
| `onConfirm`   | `(path: string) => void` | required | Called with selected directory path |
| `initialPath` | `string`                 | -        | Starting directory path             |

### Usage

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
