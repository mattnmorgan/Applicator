# Assets

Assets are static files (images, documents, etc.) that your app can serve to clients.

## Asset Routes

Assets are served through the route pattern:

```
/api/{appId}/assets/{path}
```

### Special Routes

| Route | Description |
|-------|-------------|
| `/api/{appId}/assets/icon` | App icon (`app.png`) |
| `/api/{appId}/assets/source` | App bundle (`app.js`) |
| `/api/{appId}/assets/{path}` | Any file in the app directory |

## App Icon

Place your app icon as `app.png` in your app's root directory:

```
my-app/
├── app.json
├── app.png        ← App icon (256x256 recommended)
└── src/
```

The icon is displayed in:
- App list
- Navigation menus
- Home page widgets

**Recommendations:**
- Size: 256x256 pixels
- Format: PNG with transparency
- Simple, recognizable design

## Custom Assets

Place static assets in an `assets/` directory:

```
my-app/
├── app.json
├── assets/
│   ├── logo.svg
│   ├── banner.png
│   └── styles/
│       └── custom.css
└── src/
```

### Accessing Assets

From your React components:

```tsx
function MyComponent() {
  return (
    <div>
      <img src="/api/my-app/assets/logo.svg" alt="Logo" />
      <img src="/api/my-app/assets/banner.png" alt="Banner" />
    </div>
  );
}
```

From CSS:

```css
.banner {
  background-image: url('/api/my-app/assets/banner.png');
}
```

## Supported Content Types

The asset route automatically sets appropriate MIME types:

| Extension | Content-Type |
|-----------|-------------|
| `.js` | `application/javascript` |
| `.json` | `application/json` |
| `.css` | `text/css` |
| `.png` | `image/png` |
| `.jpg`, `.jpeg` | `image/jpeg` |
| `.gif` | `image/gif` |
| `.webp` | `image/webp` |
| `.svg` | `image/svg+xml` |
| `.woff`, `.woff2` | `font/woff`, `font/woff2` |
| Other | `application/octet-stream` |

## Caching

Assets are served with a 24-hour cache header:

```
Cache-Control: public, max-age=86400
```

To bust cache during development, append a version query parameter:

```tsx
<img src={`/api/my-app/assets/logo.svg?v=${Date.now()}`} />
```

## Webpack Configuration

Configure webpack to copy assets to your dist folder:

```javascript
// webpack.config.js
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  // ... other config
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "app.json",
          to: "app.json"
        },
        {
          from: "app.png",
          to: "app.png",
          noErrorOnMissing: true  // Icon is optional
        },
        {
          from: "assets",
          to: "assets",
          noErrorOnMissing: true  // Assets are optional
        }
      ]
    })
  ]
};
```

## Security

The asset route includes security measures:

1. **Path Validation**: Paths are validated to prevent directory traversal attacks
2. **Scoped Access**: Files are only served from within the app's storage directory
3. **No Execution**: Files are served as static content, not executed

## Example: Using Assets in a Widget

```tsx
// src/widgets/HomeWidget.tsx
import React from 'react';

export default function HomeWidget() {
  const appId = 'my-app';

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img
          src={`/api/${appId}/assets/icon`}
          alt="App Icon"
          style={{ width: 48, height: 48 }}
        />
        <div>
          <h3>My App Widget</h3>
          <p>Quick access to your data</p>
        </div>
      </div>
      <img
        src={`/api/${appId}/assets/dashboard-preview.png`}
        alt="Preview"
        style={{ width: '100%', marginTop: '16px' }}
      />
    </div>
  );
}
```

## File Organization

Recommended asset structure:

```
assets/
├── images/
│   ├── logo.svg
│   ├── icons/
│   │   ├── add.svg
│   │   └── delete.svg
│   └── backgrounds/
│       └── pattern.png
├── fonts/
│   └── custom-font.woff2
└── data/
    └── defaults.json
```

Access paths:
- `/api/my-app/assets/images/logo.svg`
- `/api/my-app/assets/images/icons/add.svg`
- `/api/my-app/assets/fonts/custom-font.woff2`
