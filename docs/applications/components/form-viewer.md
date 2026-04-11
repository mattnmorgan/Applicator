# FormViewer

Renders a `FormLayout` produced by `FormEditor`, respecting per-section alias restrictions and per-field alias restrictions. When a column has a stored `inputDef`, `FormViewer` auto-renders via `DynamicInput` — no render props needed for those fields. Render props act as a fallback for fields without `inputDef` or as a custom override for complex types (lookup, rich text, etc.).

```typescript
import { FormViewer } from "@applicator/sdk/components";
import type { FormViewerProps, FormViewerField } from "@applicator/sdk/components";
```

## Types

### FormViewerField

```typescript
interface FormViewerField {
  id: string;
  name: string;
  fieldType: string;
  aliasIds?: string[]; // restrict field visibility to specific aliases
  required?: boolean;
  tooltip?: string;   // shown as (?) next to the field label; also injected into DynamicInput for native fields
}
```

## Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `layout` | `FormLayout` | required | Layout to render |
| `fields` | `FormViewerField[]` | required | Field metadata for visibility and label resolution |
| `activeAliasId` | `string` | — | Currently active alias ID; controls section/field visibility |
| `editing` | `boolean` | required | `true` = render editors, `false` = render values |
| `values` | `Record<string, any>` | — | Current field values keyed by field ID |
| `onChange` | `(fieldId: string, value: any) => void` | — | Called when a DynamicInput-rendered field changes |
| `resolveInputDef` | `(field: FormViewerField) => Partial<DynamicInputDefinition>` | — | Merge dynamic props (e.g. current picklist options) into the stored `inputDef` at render time |
| `renderView` | `(field: FormViewerField) => ReactNode` | — | Custom view-mode renderer; return `null` to fall through to DynamicInput default view |
| `renderEditor` | `(field: FormViewerField) => ReactNode` | — | Custom edit-mode renderer; return `null` to fall through to DynamicInput editing |

## Rendering priority

**Edit mode** (per field):
1. `renderEditor(field)` — if it returns a non-null node, that is rendered.
2. If `inputDef` is stored on the column **and** `values`/`onChange` are provided → `DynamicInput` renders the field automatically.
3. `null` (nothing shown).

**View mode** (per field):
1. `renderView(field)` — if it returns a non-null node, that is rendered.
2. If `inputDef` is stored → built-in default view (labels for selects, colored swatch for color, Yes/No for toggle, etc.).
3. `null` (nothing shown).

> `richtext` has no built-in default view (HTML rendering). Return a `<RichTextViewer>` from `renderView` for richtext fields.

## Usage — fully automatic (all fields use inputDef)

```tsx
<FormViewer
  layout={layout}
  fields={viewerFields}
  activeAliasId={activeAliasId}
  editing={editing}
  values={values}
  onChange={(fieldId, value) => setValues((p) => ({ ...p, [fieldId]: value }))}
/>
```

## Usage — mixed (some fields need custom rendering)

```tsx
<FormViewer
  layout={layout}
  fields={viewerFields}
  activeAliasId={activeAliasId}
  editing={editing}
  values={editing ? editValues : savedValues}
  onChange={setFieldValue}
  resolveInputDef={(f) => {
    // Inject current picklist options from a DB field config at render time
    const field = dbFields.find((x) => x.id === f.id);
    if (field?.fieldType === "picklist") return { options: field.config.options };
    return {};
  }}
  renderView={(f) => {
    const field = dbFields.find((x) => x.id === f.id);
    if (!field) return null;
    // Lookup needs bespoke UI
    if (field.fieldType === "lookup") return <LookupView field={field} />;
    // richtext needs RichTextViewer
    if (field.fieldType === "rich_text") return <RichTextViewer html={savedValues[f.id] || ""} />;
    // Return null for everything else — FormViewer handles via inputDef
    if (!getColInputDef(f.id)) return <span>{String(savedValues[f.id] ?? "")}</span>;
    return null;
  }}
  renderEditor={(f) => {
    const field = dbFields.find((x) => x.id === f.id);
    if (!field) return null;
    if (field.fieldType === "lookup") return <LookupEditor field={field} />;
    // Return null for fields that have inputDef — FormViewer renders them via DynamicInput
    if (!getColInputDef(f.id)) return <ManualEditor field={field} />;
    return null;
  }}
/>
```

## Notes

- `FormViewer` returns `null` if all sections are hidden for the current `activeAliasId`.
- Sections with `aliasIds: []` are shown for all aliases (including no alias).
- Pass `editing={false}` and omit `onChange` for read-only display.
- `resolveInputDef` is merged **on top of** the stored `inputDef` (dynamic values win), so it can override stored options, inject render functions, etc.
