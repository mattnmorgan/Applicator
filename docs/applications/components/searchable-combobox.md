# SearchableCombobox

A generic searchable dropdown with single or multi-select support. Fully controlled component with type-safe generics.

```typescript
import { SearchableCombobox } from "@applicator/sdk/components";
```

## Props

| Prop                | Type                                                    | Default       | Description                                                      |
| ------------------- | ------------------------------------------------------- | ------------- | ---------------------------------------------------------------- |
| `items`             | `T[]`                                                   | required      | All available items                                              |
| `renderItem`        | `(item: T, context: "dropdown" \| "pill") => ReactNode` | required      | Render function for items. `context` indicates where it renders. |
| `filterItem`        | `(item: T, searchTerm: string) => boolean`              | required      | Filter function applied to items when searching                  |
| `selectedItems`     | `T[]`                                                   | required      | Currently selected items                                         |
| `onSelectionChange` | `(items: T[]) => void`                                  | required      | Selection change handler                                         |
| `getItemKey`        | `(item: T) => string`                                   | required      | Unique key extractor                                             |
| `multiSelect`       | `boolean`                                               | `false`       | Allow multiple selections                                        |
| `placeholder`       | `string`                                                | `"Search..."` | Input placeholder                                                |
| `minSearchLength`   | `number`                                                | `0`           | Minimum characters before filtering is applied                   |
| `debounceMs`        | `number`                                                | `0`           | Debounce delay in ms for `onSearchChange`                        |
| `onSearchChange`    | `(term: string) => void`                                | -             | Called (debounced) when the search term changes                  |
| `disabled`          | `boolean`                                               | `false`       | Disable the control entirely                                     |

The `renderItem` function receives a `context` argument (`"dropdown"` or `"pill"`) so you can render a condensed version when the item appears as a selected chip. If a single layout works for both contexts, the argument can be ignored.

## Usage

```tsx
interface User {
  id: string;
  name: string;
  email: string;
}

const [selected, setSelected] = useState<User[]>([]);

<SearchableCombobox<User>
  items={users}
  renderItem={(user, context) =>
    context === "pill" ? (
      <span>{user.name}</span>
    ) : (
      <div>
        <strong>{user.name}</strong>
        <span style={{ color: "#94a3b8" }}> {user.email}</span>
      </div>
    )
  }
  filterItem={(user, term) =>
    user.name.toLowerCase().includes(term.toLowerCase()) ||
    user.email.toLowerCase().includes(term.toLowerCase())
  }
  selectedItems={selected}
  onSelectionChange={setSelected}
  getItemKey={(user) => user.id}
  multiSelect
  placeholder="Search users..."
/>
```
