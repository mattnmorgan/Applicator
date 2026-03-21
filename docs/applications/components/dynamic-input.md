# DynamicInput

Renders a fully-featured form input from a declarative definition object. Supports 19 input types — from plain text to date pickers, color selectors, file pickers, and searchable dropdowns. Useful for building data-entry forms driven by configuration rather than hardcoded JSX.

```typescript
import { DynamicInput } from "@applicator/sdk/components";
import type { DynamicInputDefinition, DynamicInputOption } from "@applicator/sdk/components";
```

## DynamicInputOption Interface

```typescript
interface DynamicInputOption {
  value: string;
  label: string;
  description?: string;  // for radio: shown below the option; for horizontalGroup: shown as a hover tooltip
  icon?: string;
  selectedColor?: string; // horizontalGroup only — background color when this option is selected
}
```

## DynamicInputDefinition Interface

```typescript
interface DynamicInputDefinition {
  id: string;
  label: string;
  type: DynamicInputType;         // see Input Types below
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options?: DynamicInputOption[];  // for select, multiselect, radio, checklist, pseudoassignee, multipseudoassignee
  searchable?: boolean;            // enables live search in dropdown (select/multiselect/pseudoassignee)
  renderSearchItem?: (opt: DynamicInputOption) => ReactNode; // custom dropdown row (pseudoassignee types)
  renderPill?: (opt: DynamicInputOption) => ReactNode;       // custom selected-chip render (pseudoassignee types)
  tooltip?: string;                // hover tooltip shown as (?) indicator next to the label
  // number / range / rangeslider
  min?: string;
  max?: string;
  step?: string;
  decimalPlaces?: number;
  // text
  lines?: number;      // >1 renders a <textarea>
  resizable?: boolean; // allow textarea resize (requires lines > 1)
  // datetime
  format?: string;
}
```

## Input Types

| Type                  | Description                                            |
| --------------------- | ------------------------------------------------------ |
| `text`                | Single-line text input (or textarea when `lines > 1`)  |
| `number`              | Numeric input with optional min/max/step               |
| `password`            | Password input with show/hide toggle                   |
| `date`                | Date picker                                            |
| `datetime`            | Date + time picker                                     |
| `time`                | Time picker                                            |
| `checkbox`            | Single boolean checkbox                                |
| `color`               | Color picker                                           |
| `range`               | Numeric range input (min–max text fields)              |
| `rangeslider`         | Slider input                                           |
| `select`              | Single-select dropdown                                 |
| `multiselect`         | Multi-select dropdown                                  |
| `radio`               | Radio button group                                     |
| `checklist`           | Multi-option checkbox list                             |
| `pseudoassignee`      | Single-select searchable dropdown with custom rendering |
| `multipseudoassignee` | Multi-select searchable dropdown with custom rendering  |
| `icon`                | Icon picker                                            |
| `file`                | File upload input                                      |
| `toggle`              | On/off toggle switch                                   |
| `radio-horizontal-group` | Horizontal segmented button group — each option fills equal width, shows a hover tooltip when `description` is set, and uses `selectedColor` for its active background |

## Props

| Prop       | Type                               | Default  | Description                                           |
| ---------- | ---------------------------------- | -------- | ----------------------------------------------------- |
| `input`    | `DynamicInputDefinition`           | required | Input definition (type, label, options, constraints…) |
| `value`    | `any`                              | required | Current value (controlled)                            |
| `onChange` | `(id: string, value: any) => void` | required | Called with the input's `id` and new value            |

## Usage

```tsx
const [values, setValues] = useState<Record<string, any>>({});

const handleChange = (id: string, value: any) => {
  setValues((prev) => ({ ...prev, [id]: value }));
};

// Text field
<DynamicInput
  input={{ id: "title", label: "Title", type: "text", required: true }}
  value={values.title ?? ""}
  onChange={handleChange}
/>

// Select with options
<DynamicInput
  input={{
    id: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "active", label: "Active" },
      { value: "archived", label: "Archived" },
    ],
  }}
  value={values.status ?? ""}
  onChange={handleChange}
/>

// Number with constraints
<DynamicInput
  input={{ id: "quantity", label: "Quantity", type: "number", min: "0", max: "100", step: "1" }}
  value={values.quantity ?? ""}
  onChange={handleChange}
/>

// Radio horizontal group (segmented buttons with per-option color and tooltip)
<DynamicInput
  input={{
    id: "type",
    label: "Type",
    type: "radio-horizontal-group",
    options: [
      { value: "debit",  label: "Debit",  description: "Increases the balance", selectedColor: "#dc2626" },
      { value: "credit", label: "Credit", description: "Decreases the balance", selectedColor: "#16a34a" },
    ],
  }}
  value={values.type ?? "debit"}
  onChange={handleChange}
/>
```
