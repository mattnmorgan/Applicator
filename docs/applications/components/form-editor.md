# FormEditor

A drag-and-drop form layout editor. Users drag fields from a palette into a multi-column, multi-section canvas, resize column widths, and configure how each field renders via `DynamicInput` (gear icon per cell). The resulting `FormLayout` is a plain JSON value that can be persisted and fed to `FormViewer`.

```typescript
import { FormEditor } from "@applicator/sdk/components";
import type {
  FormEditorProps,
  FormLayout,
  FormLayoutSection,
  FormRow,
  FormColumn,
  FormFieldBadge,
  FormAliasBadge,
  SerializedInputDef,
} from "@applicator/sdk/components";
```

## Types

### FormLayout

```typescript
interface FormLayout {
  sections: FormLayoutSection[];
}

interface FormLayoutSection {
  id: string;
  name: string;
  aliasIds: string[]; // empty = visible for all aliases
  rows: FormRow[];
}

interface FormRow {
  id: string;
  columns: FormColumn[];
}

interface FormColumn {
  id: string;
  width: number;          // percentage; all columns in a row sum to 100
  fieldId: string | null;
  inputDef?: SerializedInputDef; // DynamicInput configuration for this cell
}
```

### SerializedInputDef

A serialisable subset of `DynamicInputDefinition` (no render functions) stored per column. When set, `FormViewer` auto-renders the field using `DynamicInput` without requiring a `renderEditor` render prop.

```typescript
interface SerializedInputDef {
  type: CustomInputType;   // all DynamicInput types including "searchable-combobox"
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  tooltip?: string;
  options?: DynamicInputOption[];
  searchable?: boolean;
  multiSelect?: boolean;   // searchable-combobox only
  min?: string;
  max?: string;
  step?: string;
  decimalPlaces?: number;
  format?: string;
  lines?: number;          // text type — >1 renders a <textarea>
  resizable?: boolean;
}
```

### FormFieldBadge / FormAliasBadge

```typescript
interface FormFieldBadge {
  id: string;
  name: string;
  fieldType: string; // shown as a label in the palette
}

interface FormAliasBadge {
  id: string;
  singularName: string;
  pluralName: string;
  bgColor?: string;
  fgColor?: string;
}
```

## Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `layout` | `FormLayout` | required | Current layout state (controlled) |
| `fields` | `FormFieldBadge[]` | required | Fields available in the drag palette |
| `aliases` | `FormAliasBadge[]` | required | Aliases used for per-section visibility toggles |
| `onChange` | `(layout: FormLayout) => void` | required | Called whenever the layout is mutated |
| `getDefaultInputDef` | `(field: FormFieldBadge) => SerializedInputDef \| undefined` | — | Auto-populates `inputDef` when a field is first dropped into a cell |

## Usage

```tsx
const [layout, setLayout] = useState<FormLayout>({ sections: [] });

<FormEditor
  layout={layout}
  fields={fields.map((f) => ({ id: f.id, name: f.name, fieldType: f.fieldType }))}
  aliases={aliases.map((a) => ({ id: a.id, singularName: a.singularName, pluralName: a.pluralName, bgColor: a.bgColor, fgColor: a.fgColor }))}
  onChange={setLayout}
  getDefaultInputDef={(field) => {
    const map: Record<string, SerializedInputDef["type"]> = {
      text: "text",
      number: "number",
      toggle: "toggle",
      picklist: "select",
    };
    const t = map[field.fieldType];
    return t ? { type: t } : undefined;
  }}
/>
```

## Cell configuration

Each occupied cell shows a **settings gear** button. Clicking it opens a modal where the user picks the `DynamicInput` type (text, select, toggle, number, searchable-combobox, etc.) and configures type-specific properties (placeholder, min/max, options list, multi-select mode, etc.).

The configured `inputDef` is stored in `FormColumn.inputDef` and serialised as part of `FormLayout` when `onChange` fires.

## Notes

- Pass an empty `{ sections: [] }` layout as the initial value when no layout has been saved yet.
- `FormEditor` expects to fill its parent's height — place it inside a container with `height: "100%"` and `overflow: "hidden"`.
- Clearing a cell (✕ button) removes both `fieldId` **and** `inputDef` from the column.
- Dragging a field from another cell swaps both `fieldId` values but leaves each column's `inputDef` intact.
