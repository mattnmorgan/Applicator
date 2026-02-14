import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.PGHOST || "localhost",
      port: parseInt(process.env.PGPORT || "5432"),
      database: process.env.PGDATABASE || "applicator",
      user: process.env.PGUSER || "applicator",
      password: process.env.PGPASSWORD || "",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on("error", (error) => {
      console.error("PostgreSQL pool error:", error);
    });

    pool.on("connect", () => {
      console.log("PostgreSQL client connected");
    });
  }

  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
