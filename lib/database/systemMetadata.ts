export const SYSTEM_APP_METADATA = {
  id: "system",
  name: "System",
  version: {
    major: 1,
    minor: 5,
    dev: 0,
  },
  author: "Matthew Morgan",
  contactEmail: "matthew@morgantech.info",
  description: "Core system functionality and data models",
  dependencies: {},
  applets: [],
  apiRoutes: [],
  tables: [
    {
      name: "setting",
      description: "System settings",
      fields: [
        {
          name: "value",
          description: "Value of the setting",
          type: "string",
          required: true,
        },
      ],
    },
    {
      name: "user",
      description: "System users with authentication and profile information",
      fields: [
        {
          name: "username",
          description: "Unique username for login",
          type: "string",
          required: true,
        },
        {
          name: "email",
          description: "User email address",
          type: "string",
          required: true,
        },
        {
          name: "displayName",
          description: "Display name shown in the UI",
          type: "string",
          required: true,
        },
        {
          name: "passwordHash",
          description: "Hashed password for authentication",
          type: "password",
          required: true,
        },
        {
          name: "authority",
          description: "Authority ID assigned to the user",
          type: "relationship",
          relatedTo: "system:authority",
          required: true,
        },
        {
          name: "isActive",
          description: "Whether the user account is active",
          type: "boolean",
          required: true,
          defaultValue: true,
        },
        {
          name: "icon",
          description: "Path to user's profile picture",
          type: "string",
        },
      ],
    },
    {
      name: "authority",
      description:
        "User authorities that grant access to authorizations and apps",
      fields: [
        {
          name: "name",
          description: "Name of the authority",
          type: "string",
          required: true,
        },
        {
          name: "icon",
          description: "Icon path for the authority",
          type: "string",
        },
        {
          name: "authorizations",
          description: "List of authorization IDs this authority grants",
          type: "json",
          required: true,
          defaultValue: [],
        },
        {
          name: "apps",
          description: "List of app IDs this authority grants access to",
          type: "json",
          required: true,
          defaultValue: [],
        },
        {
          name: "userId",
          description: "User ID for user-specific authorities",
          type: "relationship",
          relatedTo: "system:user",
        },
        {
          name: "contextual",
          description: "Whether this is a contextual authority",
          type: "boolean",
          defaultValue: false,
        },
        {
          name: "app",
          description: "App that created this contextual authority",
          type: "string",
        },
      ],
    },
    {
      name: "authorization",
      description: "Permissions that can be granted to authorities",
      fields: [
        {
          name: "name",
          description: "Name of the authorization",
          type: "string",
          required: true,
        },
        {
          name: "description",
          description: "Description of what this authorization grants",
          type: "string",
          required: true,
        },
        {
          name: "app",
          description: "App that owns this authorization",
          type: "string",
          required: true,
        },
        {
          name: "contextual",
          description: "Whether this is a contextual authorization",
          type: "boolean",
          defaultValue: false,
        },
        {
          name: "target",
          description:
            "Target for this authorization: 'user' for user-assignable, 'app' for app-only",
          type: "picklist",
          options: ["user", "app"],
          defaultValue: "user",
        },
      ],
    },
    {
      name: "contextual-authority",
      description:
        "Resource-specific authorities for fine-grained access control",
      fields: [
        {
          name: "permission",
          description:
            "Contextual authority that grants permissions to the record",
          type: "relationship",
          relatedTo: "system:authority",
          required: true,
        },
        {
          name: "user",
          description: "User ID for user-based contextual authority",
          type: "relationship",
          relatedTo: "system:user",
        },
        {
          name: "authority",
          description: "Authority ID for authority-based contextual authority",
          type: "relationship",
          relatedTo: "system:authority",
        },
        {
          name: "password",
          description: "Hashed password for password-protected access",
          type: "string",
        },
        {
          name: "app",
          description: "App that created this contextual authority",
          type: "string",
          required: true,
        },
        {
          name: "createdAt",
          description: "Timestamp when the authority was created",
          type: "number",
          required: true,
        },
        {
          name: "createdBy",
          description: "User ID or app that created this authority",
          type: "string",
          required: true,
        },
      ],
    },
    {
      name: "log",
      description: "System log entries for audit and debugging",
      fields: [
        {
          name: "timestamp",
          description: "Formatted timestamp of the log entry",
          type: "string",
          required: true,
        },
        {
          name: "level",
          description: "Log level (debug, info, warning, error)",
          type: "string",
          required: true,
        },
        {
          name: "sender",
          description: "System component or app that created the log",
          type: "string",
          required: true,
        },
        {
          name: "userId",
          description: "User associated with the log entry",
          type: "relationship",
          relatedTo: "system:user",
        },
        {
          name: "message",
          description: "Log message content",
          type: "string",
          required: true,
        },
      ],
    },
    {
      name: "notification",
      description: "User notifications from apps and system",
      fields: [
        {
          name: "type",
          description: "Notification type (warning, error, success, info)",
          type: "string",
          required: true,
        },
        {
          name: "app",
          description: "App that created the notification",
          type: "string",
          required: true,
        },
        {
          name: "icon",
          description: "Icon path for the notification",
          type: "string",
        },
        {
          name: "title",
          description: "Notification title",
          type: "string",
          required: true,
        },
        {
          name: "message",
          description: "Notification message content",
          type: "string",
          required: true,
        },
        {
          name: "url",
          description: "URL to navigate to when notification is clicked",
          type: "string",
        },
        {
          name: "timestamp",
          description: "Timestamp when notification was created",
          type: "number",
          required: true,
        },
        {
          name: "read",
          description: "Whether the notification has been read",
          type: "boolean",
          required: true,
          defaultValue: false,
        },
        {
          name: "archived",
          description: "Whether the notification has been archived",
          type: "boolean",
          required: true,
          defaultValue: false,
        },
        {
          name: "userId",
          description: "The user the notification is for",
          type: "relationship",
          required: true,
          relatedTo: "system:user",
        },
      ],
    },
    {
      name: "app",
      description: "Installed applications in the system",
      fields: [
        {
          name: "label",
          description: "Display name of the app",
          type: "string",
          required: true,
        },
        {
          name: "version",
          description: "App version (major.minor.dev)",
          type: "json",
          required: true,
        },
        {
          name: "author",
          description: "App author name",
          type: "string",
          required: true,
        },
        {
          name: "contactEmail",
          description: "Contact email for the app author",
          type: "string",
          required: true,
        },
        {
          name: "description",
          description: "App description",
          type: "string",
          required: true,
        },
        {
          name: "subApps",
          description: "Sub-applications within the app",
          type: "json",
          defaultValue: [],
        },
        {
          name: "widgets",
          description: "Widgets provided by the app",
          type: "json",
          defaultValue: [],
        },
        {
          name: "dependencies",
          description: "App dependencies (app ID -> version)",
          type: "json",
          defaultValue: {},
        },
      ],
    },
    {
      name: "table",
      description: "Data model tables defined by applications",
      fields: [
        {
          name: "tableName",
          description: "Name of the table within its app",
          type: "string",
          required: true,
        },
        {
          name: "app",
          description: "App ID that owns this table",
          type: "string",
          required: true,
        },
        {
          name: "description",
          description: "Description of the table's purpose",
          type: "string",
          required: true,
        },
        {
          name: "fields",
          description: "Field definitions for the table",
          type: "json",
          required: true,
        },
      ],
    },
    {
      name: "api-route",
      description: "API routes defined by applications",
      fields: [
        {
          name: "app",
          description: "App ID that owns this API route",
          type: "string",
          required: true,
        },
        {
          name: "path",
          description: "URL path for the route (relative to /api/{appId}/)",
          type: "string",
          required: true,
        },
        {
          name: "method",
          description: "HTTP method (GET, POST, PUT, PATCH, DELETE)",
          type: "string",
          required: true,
        },
        {
          name: "handler",
          description: "Handler file name (without .js extension)",
          type: "string",
          required: true,
        },
        {
          name: "description",
          description: "Description of what this route does",
          type: "string",
          required: true,
        },
      ],
    },
    {
      name: "applet",
      description:
        "Applets (apps, widgets, and UI components) defined by applications",
      fields: [
        {
          name: "label",
          description: "Display name for the applet",
          type: "string",
          required: true,
        },
        {
          name: "description",
          description: "Description of the applet's purpose",
          type: "string",
          required: true,
        },
        {
          name: "component",
          description: "Component file name for the applet",
          type: "string",
          required: true,
        },
        {
          name: "app",
          description: "App ID that owns this applet",
          type: "string",
          required: true,
        },
        {
          name: "target",
          description:
            "Where the applet should be displayed (app, home, user-settings, system-settings)",
          type: "picklist",
          required: true,
          options: ["home", "app", "user-settings", "system-settings"],
        },
      ],
    },
    {
      name: "field",
      description: "Database field definitions for tables",
      fields: [
        {
          name: "app",
          description: "The app this field belongs to",
          type: "string",
          required: true,
        },
        {
          name: "table",
          description: "The table this field belongs to",
          type: "string",
          required: true,
        },
        {
          name: "name",
          description: "The field name",
          type: "string",
          required: true,
        },
        {
          name: "description",
          description: "Field description",
          type: "string",
          required: true,
        },
        {
          name: "type",
          description: "Field data type",
          type: "picklist",
          required: true,
          options: [
            "string",
            "number",
            "boolean",
            "date",
            "datetime",
            "json",
            "relationship",
            "formula",
            "password",
            "picklist",
            "multipicklist",
          ],
        },
        {
          name: "required",
          description: "Whether the field is required",
          type: "boolean",
          defaultValue: false,
        },
        {
          name: "relatedTo",
          description:
            "For relationship fields - the related table (format: appId:tableName)",
          type: "string",
        },
        {
          name: "defaultValue",
          description: "Default value for the field",
          type: "json",
        },
        {
          name: "options",
          description:
            "For picklist/multipicklist fields - the available options",
          type: "json",
        },
      ],
    },
  ],
  authorities: [
    {
      id: "admin",
      name: "Administrator",
      authorizations: ["system:admin"],
      apps: [],
      contextual: false,
    },
    {
      id: "user",
      name: "User",
      authorizations: [],
      apps: [],
      contextual: false,
    },
    {
      id: "guest",
      name: "Guest",
      authorizations: [],
      apps: [],
      contextual: false,
    },
  ],
  authorizations: [
    {
      id: "admin",
      name: "Administrator",
      description: "Permits administrator access to the system",
      app: "system",
      contextual: false,
    },
    {
      id: "developer",
      name: "Developer",
      description: "Permits developer access to the system",
      app: "system",
      contextual: false,
    },
    {
      id: "assume-identity",
      name: "Assume User Identities",
      description: "Allows user to impersonate other users in the system",
      app: "system",
      contextual: false,
    },
    {
      id: "fs-access",
      name: "Filesystem Access",
      description:
        "Permits access to the filesystem API for reading and writing files",
      app: "system",
      contextual: false,
      target: "app",
    },
  ],
};
