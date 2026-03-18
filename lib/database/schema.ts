import Schema from "@/lib/database/schema/schema";
import Table from "@/lib/database/schema/table";
import Field from "@/lib/database/schema/field";
import Index from "@/lib/database/schema/index";
import { getPool } from "@/lib/database/connections/postgresql";

const schema = new Schema({
  tables: [
    new Table({
      createNonexisting: true,
      name: "authorities",
      fields: [
        new Field({ name: "id", type: "text", primaryKey: true }),
        new Field({ name: "name", type: "text" }),
        new Field({ name: "icon", type: "text", nillable: true }),
        new Field({
          name: "user_id",
          type: "text",
          nillable: true,
          foreignKey: { table: "users", field: "id" },
        }),
        new Field({
          name: "contextual",
          type: "boolean",
          nillable: true,
          defaultValue: false,
        }),
        new Field({
          name: "app",
          type: "text",
          nillable: true,
          foreignKey: { table: "apps", field: "id" },
        }),
        new Field({
          name: "authorizations",
          type: "jsonb",
          defaultValue: "[]",
        }),
        new Field({
          name: "apps",
          type: "jsonb",
          defaultValue: "[]",
        }),
        new Field({ name: "created_at", type: "bigint" }),
        new Field({ name: "updated_at", type: "bigint" }),
      ],
    }),

    new Table({
      createNonexisting: true,
      name: "apps",
      fields: [
        new Field({ name: "id", type: "text", primaryKey: true }),
        new Field({ name: "label", type: "text" }),
        new Field({ name: "version", type: "jsonb" }),
        new Field({ name: "author", type: "text" }),
        new Field({ name: "contact_email", type: "text" }),
        new Field({ name: "description", type: "text" }),
        new Field({ name: "dependencies", type: "jsonb", nillable: true }),
        new Field({
          name: "required_permissions",
          type: "jsonb",
          defaultValue: "[]",
        }),
        new Field({ name: "created_at", type: "bigint" }),
        new Field({ name: "updated_at", type: "bigint" }),
      ],
    }),

    new Table({
      createNonexisting: true,
      name: "users",
      fields: [
        new Field({ name: "id", type: "text", primaryKey: true }),
        new Field({ name: "username", type: "text", unique: true }),
        new Field({ name: "email", type: "text" }),
        new Field({ name: "display_name", type: "text" }),
        new Field({ name: "password_hash", type: "text" }),
        new Field({
          name: "authority_id",
          type: "text",
          foreignKey: { table: "authorities", field: "id" },
        }),
        new Field({ name: "is_active", type: "boolean", defaultValue: true }),
        new Field({ name: "icon", type: "text", nillable: true }),
        new Field({ name: "created_at", type: "bigint" }),
        new Field({ name: "updated_at", type: "bigint" }),
      ],
    }),

    new Table({
      createNonexisting: true,
      name: "authorizations",
      fields: [
        new Field({ name: "id", type: "text", primaryKey: true }),
        new Field({ name: "name", type: "text" }),
        new Field({ name: "description", type: "text" }),
        new Field({
          name: "app",
          type: "text",
          foreignKey: { table: "apps", field: "id", cascade: true },
        }),
        new Field({
          name: "contextual",
          type: "boolean",
          nillable: true,
          defaultValue: false,
        }),
        new Field({
          name: "target",
          type: "text",
          nillable: true,
          check: ["user", "app"],
        }),
        new Field({ name: "created_at", type: "bigint" }),
        new Field({ name: "updated_at", type: "bigint" }),
      ],
    }),

    new Table({
      createNonexisting: true,
      name: "agents",
      fields: [
        new Field({ name: "id", type: "text", primaryKey: true }),
        new Field({
          name: "app",
          type: "text",
          foreignKey: { table: "apps", field: "id", cascade: true },
        }),
        new Field({ name: "name", type: "text" }),
        new Field({ name: "label", type: "text", nillable: true }),
        new Field({ name: "description", type: "text" }),
        new Field({ name: "cron", type: "text", nillable: true }),
        new Field({ name: "manual", type: "boolean", defaultValue: false }),
        new Field({ name: "status", type: "text", defaultValue: "stopped" }),
        new Field({ name: "pid", type: "int", nillable: true }),
        new Field({ name: "last_run", type: "bigint", nillable: true }),
        new Field({ name: "last_error", type: "text", nillable: true }),
        new Field({ name: "created_at", type: "bigint" }),
        new Field({ name: "updated_at", type: "bigint" }),
      ],
    }),

    new Table({
      createNonexisting: true,
      name: "app_tables",
      fields: [
        new Field({ name: "id", type: "text", primaryKey: true }),
        new Field({ name: "table_name", type: "text" }),
        new Field({
          name: "app",
          type: "text",
          foreignKey: { table: "apps", field: "id", cascade: true },
        }),
        new Field({ name: "description", type: "text" }),
        new Field({ name: "created_at", type: "bigint" }),
        new Field({ name: "updated_at", type: "bigint" }),
      ],
    }),

    new Table({
      createNonexisting: true,
      name: "fields",
      fields: [
        new Field({ name: "id", type: "text", primaryKey: true }),
        new Field({
          name: "app",
          type: "text",
          foreignKey: { table: "apps", field: "id", cascade: true },
        }),
        new Field({ name: "table_name", type: "text" }),
        new Field({ name: "name", type: "text" }),
        new Field({ name: "description", type: "text" }),
        new Field({ name: "type", type: "text" }),
        new Field({
          name: "required",
          type: "boolean",
          nillable: true,
          defaultValue: false,
        }),
        new Field({ name: "related_to", type: "text", nillable: true }),
        new Field({ name: "default_value", type: "jsonb", nillable: true }),
        new Field({ name: "options", type: "jsonb", nillable: true }),
        new Field({ name: "created_at", type: "bigint" }),
        new Field({ name: "updated_at", type: "bigint" }),
      ],
    }),

    new Table({
      createNonexisting: true,
      name: "sessions",
      fields: [
        new Field({ name: "id", type: "text", primaryKey: true }),
        new Field({
          name: "user_id",
          type: "text",
          foreignKey: { table: "users", field: "id", cascade: true },
        }),
        new Field({ name: "expires_at", type: "text" }),
        new Field({
          name: "original_session_id",
          type: "text",
          nillable: true,
          foreignKey: { table: "sessions", field: "id" },
        }),
        new Field({ name: "created_at", type: "bigint" }),
        new Field({ name: "updated_at", type: "bigint" }),
      ],
    }),

    new Table({
      createNonexisting: true,
      name: "logs",
      fields: [
        new Field({ name: "id", type: "text", primaryKey: true }),
        new Field({ name: "timestamp", type: "text" }),
        new Field({ name: "level", type: "text" }),
        new Field({ name: "sender", type: "text" }),
        new Field({
          name: "user_id",
          type: "text",
          nillable: true,
          foreignKey: { table: "users", field: "id" },
        }),
        new Field({ name: "message", type: "text" }),
        new Field({ name: "created_at", type: "bigint" }),
        new Field({ name: "updated_at", type: "bigint" }),
      ],
    }),

    new Table({
      createNonexisting: true,
      name: "notifications",
      fields: [
        new Field({ name: "id", type: "text", primaryKey: true }),
        new Field({ name: "type", type: "text" }),
        new Field({
          name: "app",
          type: "text",
          foreignKey: { table: "apps", field: "id", cascade: true },
        }),
        new Field({ name: "icon", type: "text", nillable: true }),
        new Field({ name: "title", type: "text" }),
        new Field({ name: "message", type: "text" }),
        new Field({ name: "url", type: "text", nillable: true }),
        new Field({ name: "timestamp", type: "bigint" }),
        new Field({ name: "read", type: "boolean", defaultValue: false }),
        new Field({ name: "archived", type: "boolean", defaultValue: false }),
        new Field({
          name: "user_id",
          type: "text",
          foreignKey: { table: "users", field: "id", cascade: true },
        }),
        new Field({ name: "created_at", type: "bigint" }),
        new Field({ name: "updated_at", type: "bigint" }),
      ],
    }),

    new Table({
      createNonexisting: true,
      name: "settings",
      fields: [
        new Field({ name: "id", type: "text", primaryKey: true }),
        new Field({ name: "value", type: "text" }),
        new Field({ name: "name", type: "text", nillable: true }),
        new Field({
          name: "user",
          type: "text",
          nillable: true,
          foreignKey: { table: "users", field: "id" },
        }),
        new Field({ name: "created_at", type: "bigint" }),
        new Field({ name: "updated_at", type: "bigint" }),
      ],
    }),

    new Table({
      createNonexisting: true,
      name: "applets",
      fields: [
        new Field({ name: "id", type: "text", primaryKey: true }),
        new Field({ name: "label", type: "text" }),
        new Field({ name: "description", type: "text" }),
        new Field({ name: "component", type: "text" }),
        new Field({
          name: "app",
          type: "text",
          foreignKey: { table: "apps", field: "id", cascade: true },
        }),
        new Field({
          name: "target",
          type: "text",
          check: ["app", "home", "user-settings", "system-settings", "guest"],
        }),
        new Field({ name: "settings", type: "jsonb", defaultValue: "[]" }),
        new Field({ name: "created_at", type: "bigint" }),
        new Field({ name: "updated_at", type: "bigint" }),
      ],
    }),

    new Table({
      createNonexisting: true,
      name: "applet_settings",
      fields: [
        new Field({ name: "id", type: "text", primaryKey: true }),
        new Field({
          name: "user",
          type: "text",
          foreignKey: { table: "users", field: "id", cascade: true },
        }),
        new Field({
          name: "applet",
          type: "text",
          foreignKey: { table: "applets", field: "id", cascade: true },
        }),
        new Field({ name: "label", type: "text" }),
        new Field({ name: "settings", type: "jsonb", defaultValue: "{}" }),
        new Field({ name: "created_at", type: "bigint" }),
        new Field({ name: "updated_at", type: "bigint" }),
      ],
    }),

    new Table({
      createNonexisting: true,
      name: "api_routes",
      fields: [
        new Field({ name: "id", type: "text", primaryKey: true }),
        new Field({
          name: "app",
          type: "text",
          foreignKey: { table: "apps", field: "id", cascade: true },
        }),
        new Field({ name: "path", type: "text" }),
        new Field({ name: "method", type: "text" }),
        new Field({ name: "description", type: "text" }),
        new Field({ name: "created_at", type: "bigint" }),
        new Field({ name: "updated_at", type: "bigint" }),
      ],
    }),

    new Table({
      createNonexisting: true,
      name: "contextual_authorities",
      fields: [
        new Field({ name: "id", type: "text", primaryKey: true }),
        new Field({
          name: "permission",
          type: "text",
          foreignKey: { table: "authorities", field: "id", cascade: true },
        }),
        new Field({
          name: "user",
          type: "text",
          nillable: true,
          foreignKey: { table: "users", field: "id" },
        }),
        new Field({
          name: "authority",
          type: "text",
          nillable: true,
          foreignKey: { table: "authorities", field: "id" },
        }),
        new Field({ name: "password", type: "text", nillable: true }),
        new Field({
          name: "app",
          type: "text",
          foreignKey: { table: "apps", field: "id", cascade: true },
        }),
        new Field({ name: "created_at", type: "bigint" }),
        new Field({ name: "created_by", type: "text" }),
        new Field({ name: "context", type: "text", nillable: true }),
        new Field({ name: "updated_at", type: "bigint" }),
      ],
    }),

    new Table({
      createNonexisting: true,
      name: "agent_executions",
      fields: [
        new Field({ name: "id", type: "text", primaryKey: true }),
        new Field({
          name: "app",
          type: "text",
          foreignKey: { table: "apps", field: "id", cascade: true },
        }),
        new Field({
          name: "agent",
          type: "text",
          foreignKey: { table: "agents", field: "id", cascade: true },
        }),
        new Field({ name: "timestamp", type: "bigint" }),
        new Field({
          name: "status",
          type: "text",
          check: ["success", "failed", "unknown"],
        }),
        new Field({ name: "error", type: "text", nillable: true }),
        new Field({ name: "log_file", type: "text", nillable: true }),
        new Field({ name: "created_at", type: "bigint" }),
        new Field({ name: "updated_at", type: "bigint" }),
      ],
    }),

    new Table({
      createNonexisting: true,
      name: "records",
      primaryKey: ["app_id", "table_name", "id"],
      fields: [
        new Field({ name: "id", type: "text" }),
        new Field({
          name: "app_id",
          type: "text",
          foreignKey: { table: "apps", field: "id", cascade: true },
        }),
        new Field({ name: "table_name", type: "text" }),
        new Field({ name: "data", type: "jsonb", defaultValue: "{}" }),
        new Field({ name: "created_at", type: "bigint" }),
        new Field({ name: "updated_at", type: "bigint" }),
      ],
    }),
  ],

  indices: [
    new Index({
      createNonexisting: true,
      name: "idx_records_app_table",
      table: "records",
      fields: ["app_id", "table_name"],
    }),
    new Index({
      createNonexisting: true,
      name: "idx_records_data",
      table: "records",
      using: "gin",
      fields: ["data"],
    }),
  ],
});

/**
 * Initialize database
 */
export async function initializeSchema(): Promise<void> {
  const pool = getPool();
  await pool.query(schema.toSql());

  // Migrations: safe to run repeatedly (no-op if already applied)
  await pool.query(`ALTER TABLE logs ALTER COLUMN user_id DROP NOT NULL`);
  await pool.query(
    `ALTER TABLE applets ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '[]'`,
  );
  await pool.query(
    `ALTER TABLE agents ADD COLUMN IF NOT EXISTS manual boolean DEFAULT false`,
  );
  await pool.query(
    `UPDATE fields SET related_to = 'system:users' WHERE related_to = 'system:user'`,
  );
}

export default schema;
