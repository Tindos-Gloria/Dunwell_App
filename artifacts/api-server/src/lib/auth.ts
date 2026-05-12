import jwt from "jsonwebtoken";
import { Pool } from "pg";
import { randomBytes } from "crypto";
import type { Request, Response, NextFunction } from "express";

const TOKEN_TTL = "7d";

export interface AuthPayload {
  userId: string;
  role: "nurse" | "patient";
}

// Extend Express Request so req.auth is fully typed, no `as any`
declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

// ── Secret resolution ─────────────────────────────────────────────────────────
// Priority: env var → persisted in Replit Postgres → generated (then persisted)
// A hardcoded fallback is intentionally absent.

let resolvedSecret: string | null = null;

async function resolveSecret(): Promise<string> {
  // 1. Env var set by operator (Replit Secret or CI)
  if (process.env["JWT_SECRET"]) return process.env["JWT_SECRET"];

  // 2. Persisted in Replit Postgres (survives restarts)
  const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    const row = await pool.query<{ value: string }>(
      "SELECT value FROM app_config WHERE key = 'jwt_secret'"
    );
    if (row.rows.length > 0) return row.rows[0].value;

    // 3. First run: generate a strong secret and persist it
    const generated = randomBytes(48).toString("base64url");
    await pool.query(
      "INSERT INTO app_config (key, value) VALUES ('jwt_secret', $1) ON CONFLICT DO NOTHING",
      [generated]
    );
    return generated;
  } finally {
    await pool.end();
  }
}

/** Must be called once at app startup before any request is served */
export async function initAuth(): Promise<void> {
  resolvedSecret = await resolveSecret();
}

function getSecret(): string {
  if (!resolvedSecret) throw new Error("initAuth() not called before using auth functions");
  return resolvedSecret;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, getSecret()) as AuthPayload;
}

/** Middleware: require a valid JWT in Authorization: Bearer <token> */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    req.auth = verifyToken(header.slice(7));
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Middleware: require that req.auth.role === 'nurse' */
export function requireNurse(req: Request, res: Response, next: NextFunction) {
  if (req.auth?.role !== "nurse") {
    return res.status(403).json({ error: "Nurse access required" });
  }
  return next();
}
