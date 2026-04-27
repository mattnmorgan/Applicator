# DynamicInput

Renders a fully-featured form input from a declarative definition object. Supports 24 input types — from plain text to date pickers, color selectors, file pickers, searchable dropdowns, and radial/radar graphs. Useful for building data-entry forms driven by configuration rather than hardcoded JSX.

```typescript
import { DynamicInput } from "@applicator/sdk/components";
import type { DynamicInputDefinition, DynamicInputOption, RadialGraphDimension } from "@applicator/sdk/components";
```

## DynamicInputOption Interface

```typescript
interface DynamicInputOption {
  value: string;
  label: string;
  description?: string;  // for radio: shown below the option; for horizontalGroup: shown as a hover tooltip
  icon?: string;
  selectedColor?: string; // horizontalGroup / badge-multiselect — background color when this option is selected
  fgColor?: string;       // badge-multiselect only — text color when this option is selected
}
```

## RadialGraphDimension Interface

Used with the `radial-graph` input type to define each axis of the radar chart.

```typescript
interface RadialGraphDimension {
  abbr: string;   // 1–3 character abbreviation shown on the axis tip
  label: string;  // full name shown as a native tooltip on hover of the abbreviation
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
  options?: DynamicInputOption[];  // for select, multiselect, radio, checklist, pseudoassignee, multipseudoassignee, searchable-combobox
  searchable?: boolean;            // enables live search in dropdown (select/multiselect/pseudoassignee)
  multiSelect?: boolean;           // enable multi-select mode (searchable-combobox type only)
  renderSearchItem?: (opt: DynamicInputOption) => ReactNode; // custom dropdown row (pseudoassignee types)
  renderPill?: (opt: DynamicInputOption) => ReactNode;       // custom selected-chip render (pseudoassignee types)
  tooltip?: string;                // hover tooltip shown as (?) indicator next to the label
  // number / range / rangeslider / radial-graph
  min?: string;
  max?: string;
  step?: string;
  decimalPlaces?: number;
  // text
  lines?: number;      // >1 renders a <textarea>
  resizable?: boolean; // allow textarea resize (requires lines > 1)
  // datetime
  format?: string;
  // radial-graph
  dimensions?: RadialGraphDimension[]; // 1–10 dimension definitions
}
```

## Input Types

| Type                      | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `text`                    | Single-line text input (or textarea when `lines > 1`)  |
| `number`                  | Numeric input with optional min/max/step               |
| `password`                | Password input with show/hide toggle                   |
| `date`                    | Date picker                                            |
| `datetime`                | Date + time picker                                     |
| `time`                    | Time picker                                            |
| `checkbox`                | Single boolean checkbox                                |
| `color`                   | Color picker                                           |
| `range`                   | Numeric range input (min–max text fields)              |
| `rangeslider`             | Slider input                                           |
| `select`                  | Single-select dropdown                                 |
| `multiselect`             | Multi-select dropdown                                  |
| `radio`                   | Radio button group                                     |
| `checklist`               | Multi-option checkbox list                             |
| `pseudoassignee`          | Single-select searchable dropdown with custom rendering |
| `multipseudoassignee`     | Multi-select searchable dropdown with custom rendering  |
| `icon`                    | Icon picker                                            |
| `file`                    | File upload input                                      |
| `toggle`                  | On/off toggle switch                                   |
| `radio-horizontal-group`  | Horizontal segmented button group — each option fills equal width, shows a hover tooltip when `description` is set, and uses `selectedColor` for its active background |
| `badge-multiselect`       | Multi-select rendered as clickable pill badges — options sorted alphabetically, `selectedColor` sets badge background when selected, `fgColor` sets text color when selected |
| `searchable-combobox`     | Filterable combobox backed by `options`. Single-select by default; set `multiSelect: true` for multi. Selected items appear as pills. Value is a string (single) or string[] (multi) |
| `radial-graph`            | Interactive radar/spider chart. Supports multiple named data sets with independent colors. Value is `Array<{ color: string; dims: Record<string, number> }>`. Requires `dimensions` and supports `min`/`max`. |

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

// Radial graph with multiple data sets
<DynamicInput
  input={{
    id: "stats",
    label: "Character Stats",
    type: "radial-graph",
    tooltip: "Drag sliders to adjust each attribute. Use + Add Set to compare multiple characters.",
    min: "0",
    max: "10",
    dimensions: [
      { abbr: "STR", label: "Strength" },
      { abbr: "INT", label: "Intelligence" },
      { abbr: "AGI", label: "Agility" },
      { abbr: "DEF", label: "Defense" },
      { abbr: "SPD", label: "Speed" },
    ],
  }}
  value={values.stats ?? []}
  onChange={handleChange}
/>
```

## radial-graph Value Format

The value emitted by `onChange` is an array of data set objects:

```typescript
type RadialGraphValue = Array<{
  color: string;               // hex color string, e.g. "#3b82f6"
  dims: Record<string, number>; // key = dimension abbr, value = numeric measurement
}>;
```

**Example value:**
```json
[
  { "color": "#3b82f6", "dims": { "STR": 7, "INT": 6, "AGI": 8, "DEF": 5, "SPD": 9 } },
  { "color": "#ef4444", "dims": { "STR": 9, "INT": 4, "AGI": 5, "DEF": 8, "SPD": 6 } }
]
```

Each set is rendered as a filled polygon on the radar chart with its own color. The user can:
- Add up to N sets via the **+ Add Set** button (colors cycle through a preset palette)
- Remove any set with the **×** button
- Change a set's color by clicking its color swatch
- Adjust each dimension's value with a slider

Abbreviations (≤3 chars) are shown at each axis tip; hovering reveals the full `label` as a tooltip. The `defaultValue` field accepts a JSON string of the value array for pre-populating the chart.
