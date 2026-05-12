import sql from "mssql";

const config: sql.config = {
  server: process.env["DB_SERVER"] || "dunwell.database.windows.net",
  port: Number(process.env["DB_PORT"] || 1433),
  database: process.env["DB_DATABASE"] || "Dunwell_Clinic",
  user: process.env["DB_USER"] || "dunwell",
  password: process.env["DB_PASSWORD"] || "",
  options: {
    encrypt: true,
    trustServerCertificate: false,
    connectTimeout: 30000,
    requestTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) return pool;
  pool = await sql.connect(config);
  return pool;
}

export { sql };
