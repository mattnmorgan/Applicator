# Applicator Framework - Application Development Guide

This documentation covers how to build applications for the Applicator framework.

## Table of Contents

1. [App Metadata (app.json)](./app-metadata.md) - Application manifest and configuration
2. [Lifecycle Hooks](./lifecycle-hooks.md) - OnInstall and OnUninstallation hooks
3. [API Routes and SDK](./api-routes.md) - Building API endpoints
4. [Assets](./assets.md) - Serving static assets
5. [Agents](./agents.md) - Background tasks and scheduled jobs
6. [App Bundle (app.js)](./app-bundle.md) - Frontend components and exports
7. [Authorities and Permissions](./authorities.md) - Access control system
8. [Contextual Authorities](./contextual-authorities.md) - Resource-level access control via the plugin SDK
9. [Guest Access](./guest-access.md) - Unauthenticated access and guest applet context
10. [Required Permissions](./required-permissions.md) - Declaring mandatory app permissions
11. [Reusable Components](./components.md) - Platform UI components for app frontends
12. [Utilities](./utilities.md) - Debouncer and other utility classes from `@applicator/sdk/utilities`

## Quick Start

An Applicator app consists of:

```
my-app/
├── src/
│   ├── index.tsx         # Frontend entry point - exports React components
│   ├── meta/             # App metadata
│   │   ├── app.json      # App manifest (required)
│   │   └── app.png       # App icon (optional, 256x256 recommended)
│   ├── api/              # API route handlers
│   │   └── my-route/
│   │       └── route.ts
│   ├── agents/           # Background agents
│   │   └── my-agent.ts
│   ├── apps/             # React components for applets
│   │   └── Dashboard.tsx
│   ├── widgets/          # Widget components (optional)
│   │   └── HomeWidget.tsx
│   ├── components/       # Reusable components (optional)
│   ├── lib/              # Shared library code (optional)
│   ├── system/           # Lifecycle hooks
│   │   ├── install.ts
│   │   └── uninstall.ts
│   └── tables/           # Table formula and validation scripts (optional)
├── assets/               # Static assets (optional)
├── webpack.config.js     # Frontend build config
├── webpack.api.config.js # API/agents build config
└── package.json
```

## Building Your App

Apps are built using webpack and packaged as ZIP files:

```bash
npm run build    # Build frontend and API handlers
npm run package  # Create installable ZIP
```

The resulting ZIP file can be installed through the Applicator admin interface.

## Key Concepts

- **Applets**: UI components that can be placed in different targets (app view, home, settings)
- **API Routes**: Server-side handlers for HTTP requests
- **Agents**: Background processes that run continuously or on a schedule
- **Authorities**: Role-based access control for your app's features
- **SDK**: Framework utilities available to API handlers and agents
