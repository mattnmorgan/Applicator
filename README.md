# Applicator

Application is a self-hosted, dynamic application platform. The core system is a Next.js application backed by a PostgreSQL database. Developer-created applets extend the platform's functionality by including their own API, frontend, agent, and database definitions.

## Technical Stack

- `PostgreSQL` for database management
- `NextJS` for api and frontend application
- `NTFY` for notifications

## Prerequisites

- Node.js 20+
- PostgreSQL (default: `localhost:5432`, database `applicator`, user `applicator`)

## Executing Applicator

```bash
cd system
npm install          # first time only
npm run dev          # development — listens on 0.0.0.0 (LAN-accessible)
npm run dev:local    # development — localhost only
npm run build        # production build
npm start            # production start
```

Environment is configured via `system/.env.local` (or `.env.development` for development overrides):

```env
# Database location and credentials
PGHOST=localhost
PGPORT=5432
PGDATABASE=applicator
PGUSER=applicator
PGPASSWORD=yourpassword
# The name of the site to be shown on a browser tab
SITE_NAME="My Applicator"
# Description of the site to be included in page metadata
SITE_DESCRIPTION="..."
```

## Building applets

Each applet is developed independently under its own directory. Source lives in `src/`; compiled output goes to `dist/`. Applets are packaged as ZIP files and installed through the Applicator admin interface.

```bash
cd <applet-dir>
npm install          # first time only
npm run build        # build frontend + API handlers
npm run package      # produce installable ZIP
```

## Push notifications (ntfy)

Applicator supports push notifications via [ntfy](https://ntfy.sh). Configuration is managed through the system settings UI (Admin → Settings).

| Setting             | Description                                           |
| ------------------- | ----------------------------------------------------- |
| **ntfy Server URL** | Base URL of your ntfy server (e.g. `https://ntfy.sh`) |
| **ntfy Username**   | HTTP Basic auth username                              |
| **ntfy Password**   | HTTP Basic auth password                              |

Per-user: each user can set a personal **ntfy topic UUID** in their profile settings. Notifications are sent to `{serverUrl}/{ntfy_uuid}`. Users without a configured topic receive in-app notifications only.

Applets can attach a custom ntfy tag to their notification topics (configured in each applet's notification topic metadata).

## SDK documentation

Documentation for building applets lives in `system/docs/applications/`:

| Document                                                                     | Description                            |
| ---------------------------------------------------------------------------- | -------------------------------------- |
| [README](system/docs/applications/README.md)                                 | Quick-start and app structure overview |
| [Metadata (app.json)](system/docs/applications/metadata.md)                  | App manifest reference                 |
| [API Routes](system/docs/applications/api-routes.md)                         | Building server-side handlers          |
| [Components](system/docs/applications/components.md)                         | Reusable platform UI components        |
| [Authorities & Permissions](system/docs/applications/authorities.md)         | Access control system                  |
| [Contextual Authorities](system/docs/applications/contextual-authorities.md) | Resource-level access control          |
| [Lifecycle Hooks](system/docs/applications/lifecycle-hooks.md)               | Install/uninstall hooks                |
| [Agents](system/docs/applications/agents.md)                                 | Background tasks and scheduled jobs    |
| [Assets](system/docs/applications/assets.md)                                 | Serving static assets                  |
| [Utilities](system/docs/applications/utilities.md)                           | SDK utility classes                    |
| [Guest Access](system/docs/applications/guest-access.md)                     | Unauthenticated applet contexts        |
