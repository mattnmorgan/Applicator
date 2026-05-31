# Icon

Renders a named SVG icon at a specified size. Icons use `currentColor` so they inherit the text color of their parent.

```typescript
import { Icon } from "@applicator/sdk/components";
import type { IconName } from "@applicator/sdk/components";
```

## Props

| Prop   | Type       | Default  | Description                |
| ------ | ---------- | -------- | -------------------------- |
| `name` | `IconName` | required | Icon identifier            |
| `size` | `number`   | `16`     | Width and height in pixels |

## Available Icons

### General

`archive`, `audio`, `bell`, `calendar`, `check`, `check-circle`, `chevron-down`, `chevron-up`, `chevron-left`, `chevron-right`, `chevrons-up`, `chevrons-down`, `clipboard`, `close`, `code`, `copy`, `crown`, `dock`, `download`, `drag`, `edit`, `error`, `external-link`, `eye`, `eye-off`, `file`, `flag`, `folder`, `globe`, `hamburger`, `sandwich`, `home`, `image`, `info`, `library`, `link`, `lock`, `logout`, `monitor`, `more-horizontal`, `move`, `pin`, `unpin`, `play`, `popout`, `plus`, `print`, `refresh`, `reply`, `save`, `search`, `settings`, `smartphone`, `spreadsheet`, `square-stop`, `star`, `sticky-note`, `tablet`, `trash`, `unlock`, `upload`, `user`, `users`, `video`, `warning`, `word-wrap`, `list-view`, `grid-view`, `grid-view-small`

### Text formatting

`list-unordered`, `list-ordered`, `align-left`, `align-center`, `align-right`, `align-justify`, `font-color`, `superscript`, `subscript`, `font-increase`, `font-decrease`, `highlight-color`, `bg-color`

### Table

`table`, `table-row-above`, `table-row-below`, `table-row-delete`, `table-col-left`, `table-col-right`, `table-col-delete`, `table-col-distribute`, `table-header-row`, `table-header-col`, `table-header-cell`, `table-delete`

## Usage

```tsx
<Icon name="trash" size={16} />
<Icon name="check" />
```
