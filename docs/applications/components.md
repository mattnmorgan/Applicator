# Reusable Components

The platform provides reusable React components that apps can import from `@applicator/sdk`. These components follow the platform's dark theme and are used throughout the system UI.

## Importing Components

Components are available through the `@applicator/sdk` package (linked via npm):

```typescript
import { Button, Icon, ToastStack } from "@applicator/sdk/components";
```

All components are exported from a single barrel file. Use named imports to pick what you need.

---

## Component Reference

| Component | Description |
| --------- | ----------- |
| [Accordion](./components/accordion.md) | Collapsible content section with expand/collapse toggle |
| [AccessDenied](./components/access-denied.md) | Full-page access denied message with a "Go Back" button |
| [Badge](./components/badge.md) | Colored label for categorizing or highlighting content |
| [Breadcrumb](./components/breadcrumb.md) | Navigation breadcrumb trail with clickable, disabled, and active states |
| [Button](./components/button.md) | Action button with semantic variants and optional tooltip |
| [ButtonIcon](./components/button-icon.md) | Icon-only button with hover tooltip |
| [ButtonMenu](./components/button-menu.md) | Dropdown menu opened from a trigger element |
| [ConfirmModal](./components/confirm-modal.md) | Confirmation dialog with cancel and confirm buttons |
| [Modal](./components/modal.md) | Flexible modal with header/body/footer slots and optional close behavior |
| [DynamicInput](./components/dynamic-input.md) | Form input rendered from a declarative definition; supports 19 input types |
| [InfoTooltip](./components/info-tooltip.md) | Inline `(?)` indicator that shows a hover tooltip |
| [FolderBrowser](./components/folder-browser.md) | Modal directory picker for the server filesystem |
| [Icon](./components/icon.md) | Named SVG icon at a configurable size |
| [ProfileIndicator](./components/profile-indicator.md) | User avatar with display name |
| [Row](./components/row.md) | Styled row container with optional click handler |
| [SearchableCombobox](./components/searchable-combobox.md) | Generic searchable single- or multi-select dropdown |
| [Tabset](./components/tabset.md) | Vertical tree or horizontal tab navigation |
| [ToastStack](./components/toast-stack.md) | Multi-toast notification manager rendered via portal |
| [Tooltip](./components/tooltip.md) | Hover tooltip wrapper with auto-flip positioning |
