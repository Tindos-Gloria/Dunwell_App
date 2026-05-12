import { Router } from "express";
import { getPool, sql } from "../lib/azureDb";
import bcrypt from "bcryptjs";
import { signToken, requireAuth } from "../lib/auth";
import { randomUUID } from "crypto";

const router = Router();

type UserRole = "nurse" | "patient";

// ── helpers ──────────────────────────────────────────────────────────────────

const mapPatient = (p: Record<string, unknown>) => ({
  id: String(p["PatientID"]),
  name: String(p["PatientName"] ?? "").trim(),
  surname: (p["PatientSurname"] as string)?.trim() || null,
  email: (p["Patient_Email"] as string)?.trim() || null,
  phone: (p["Patient_ContactNo"] as string)?.trim() || null,
  dob: p["DOB"] ? new Date(p["DOB"] as string).toISOString().slice(0, 10) : null,
  gender: (p["Gender"] as string) || null,
  address: (p["Address"] as string) || null,
  role: "patient" as UserRole,
  sanc_hpcsa: null,
  is_student: false,
});

const mapNurse = (u: Record<string, unknown>) => ({
  id: String(u["UserID"]),
  name: String(u["Name"] ?? "").trim(),
  surname: (u["Surname"] as string)?.trim() || null,
  email: (u["Email"] as string)?.trim() || null,
  phone: (u["ContactNo"] as string)?.trim() || null,
  dob: (u["DOB"] as string)?.trim() || null,
  gender: null,
  address: null,
  role: "nurse" as UserRole,
  sanc_hpcsa: (u["SANC_HPCSA"] as string)?.trim() || null,
  is_student: false,
});

/** Returns a promise that rejects after `ms` milliseconds */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

let columnWidened = false;
async function ensureUsersPasswordColumn() {
  if (columnWidened) return;
  try {
    const pool = await getPool();
    await pool.request().query("ALTER TABLE Users ALTER COLUMN Password NVARCHAR(100)");
  } catch { /* already wide or no permission */ }
  columnWidened = true;
}

// ── Postgres fallback helpers ─────────────────────────────────────────────────

async function pgSignIn(email: string, password: string) {
  const { db, profilesTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const rows = await db.select().from(profilesTable).where(eq(profilesTable.email, email));
  if (rows.length === 0) return null;
  const { password_hash, ...user } = rows[0];
  if (!password_hash) return null;
  const valid = await bcrypt.compare(password, password_hash);
  if (!valid) return null;
  return user;
}

async function pgSignUp(data: {
  id: string; name: string; surname?: string; email: string; phone?: string;
  dob?: string; gender?: string; address?: string; role: UserRole;
  password_hash: string; is_student?: boolean; sanc_hpcsa?: string;
}) {
  const { db, profilesTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  const existing = await db.select().from(profilesTable).where(eq(profilesTable.email, data.email));
  if (existing.length > 0) throw new Error("Email already registered");
  await db.insert(profilesTable).values({
    id: data.id,
    name: data.name,
    surname: data.surname || null,
    email: data.email,
    phone: data.phone || null,
    dob: data.dob || null,
    gender: data.gender || null,
    address: data.address || null,
    role: data.role,
    password_hash: data.password_hash,
    is_student: data.is_student ?? false,
    sanc_hpcsa: data.sanc_hpcsa || null,
  });
  return {
    id: data.id, name: data.name, surname: data.surname || null,
    email: data.email, phone: data.phone || null, dob: data.dob || null,
    gender: data.gender || null, address: data.address || null,
    role: data.role, sanc_hpcsa: data.sanc_hpcsa || null, is_student: data.is_student ?? false,
  };
}

// ── signup ─────────────────────────────────────────────────────────────────────

router.post("/signup", async (req, res) => {
  try {
    const body = req.body as Record<string, string>;
    const { email, password, name, surname, role, phone, dob, address, gender } = body;
    const isStudent = (body["isStudent"] === "true" || body["isStudent"] === true as unknown);

    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    // Nurses cannot self-register — they must use existing clinic credentials
    if (role === "nurse") {
      return res.status(403).json({ error: "Nurse accounts are managed by the clinic. Please sign in with your provided credentials." });
    }

    const hash = await bcrypt.hash(password, 10);

    // Try Azure SQL first (with 8s timeout)
    try {
      const pool = await withTimeout(getPool(), 8000);

      // Patient
      const existingP = await pool.request()
        .input("email", sql.NVarChar, email)
        .query("SELECT PatientID FROM Patients WHERE Patient_Email = @email");
      if (existingP.recordset.length > 0) return res.status(400).json({ error: "Email already registered" });

      const dobDate = dob ? new Date(dob) : null;
      const result = await pool.request()
        .input("name", sql.NVarChar(50), (name || "").slice(0, 50))
        .input("surname", sql.NVarChar(50), (surname || "").slice(0, 50))
        .input("contactNo", sql.NChar(10), (phone || "").padEnd(10).slice(0, 10))
        .input("email", sql.NVarChar(50), email.slice(0, 50))
        .input("dob", dobDate ? sql.Date : sql.Date, dobDate)
        .input("address", sql.NVarChar(50), (address || "").slice(0, 50))
        .input("gender", sql.NVarChar(10), (gender || "").slice(0, 10))
        .input("password", sql.NVarChar(255), hash)
        .input("createdDate", sql.Date, new Date())
        .query(`INSERT INTO Patients (PatientName,PatientSurname,Patient_ContactNo,Patient_Email,DOB,Address,Gender,Patient_Password,CreatedDate)
                OUTPUT INSERTED.* VALUES (@name,@surname,@contactNo,@email,@dob,@address,@gender,@password,@createdDate)`);
      const profile = mapPatient(result.recordset[0] as Record<string, unknown>);
      const token = signToken({ userId: profile.id, role: profile.role });
      return res.status(201).json({ user: profile, token });

    } catch (azureErr) {
      const msg = azureErr instanceof Error ? azureErr.message : "";
      // Only fall back to Postgres on connection/timeout errors, not auth logic errors
      const lc = msg.toLowerCase();
      const isConnError = lc.includes("timeout") || lc.includes("connect") ||
        lc.includes("econnrefused") || lc.includes("login") || lc.includes("enotfound") ||
        lc.includes("failed") || lc.includes("password") || lc.includes("credentials");
      if (!isConnError) throw azureErr;
      // Postgres fallback
      const pgRole = role === "nurse" ? "nurse" : "patient";
      const profile = await pgSignUp({
        id: randomUUID(), name: name || "", surname, email, phone, dob,
        gender, address, role: pgRole, password_hash: hash,
        is_student: isStudent as boolean, sanc_hpcsa: body["sanc_hpcsa"],
      });
      const token = signToken({ userId: profile.id, role: profile.role });
      return res.status(201).json({ user: profile, token });
    }

  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
  }
});

// ── signin ─────────────────────────────────────────────────────────────────────

router.post("/signin", async (req, res) => {
  try {
    const body = req.body as Record<string, string>;
    const { password } = body;
    // `username` is used for nurse login (maps to UserName column); `email` for patients
    const email = body["email"] || "";
    const username = body["username"] || "";
    const identifier = username || email;
    if (!identifier || !password) return res.status(400).json({ error: "Username/email and password required" });

    // Try Azure SQL first (8s timeout)
    try {
      const pool = await withTimeout(getPool(), 8000);

      // 1. Patients table — always match by email
      if (email) {
        const patientResult = await pool.request()
          .input("email", sql.NVarChar, email)
          .query("SELECT * FROM Patients WHERE Patient_Email = @email");

        if (patientResult.recordset.length > 0) {
          const row = patientResult.recordset[0] as Record<string, unknown>;
          const stored = String(row["Patient_Password"] ?? "");
          let valid = false;
          if (stored.startsWith("$2")) {
            valid = await bcrypt.compare(password, stored);
          } else if (stored.trim()) {
            valid = password === stored.trim();
            if (valid) {
              try {
                const newHash = await bcrypt.hash(password, 10);
                await pool.request()
                  .input("id", sql.Int, Number(row["PatientID"]))
                  .input("hash", sql.NVarChar(255), newHash)
                  .query("UPDATE Patients SET Patient_Password = @hash WHERE PatientID = @id");
              } catch { /* non-fatal */ }
            }
          }
          if (!valid) return res.status(401).json({ error: "Invalid email or password" });
          const profile = mapPatient(row);
          const token = signToken({ userId: profile.id, role: "patient" });
          return res.json({ user: profile, token });
        }
      }

      // 2. Users table — nurses login with UserName field
      const userResult = await pool.request()
        .input("username", sql.NVarChar, identifier)
        .query("SELECT * FROM Users WHERE UserName = @username");

      if (userResult.recordset.length > 0) {
        const user = userResult.recordset[0] as Record<string, unknown>;
        const stored = String(user["Password"] ?? "");
        const isNurse = (user["UserRole"] as string)?.trim() === "N";
        let valid = false;
        if (stored.startsWith("$2")) {
          valid = await bcrypt.compare(password, stored);
        } else if (stored.trim()) {
          valid = password === stored.trim();
          if (valid) {
            try {
              await ensureUsersPasswordColumn();
              const newHash = await bcrypt.hash(password, 10);
              await pool.request()
                .input("id", sql.Int, Number(user["UserID"]))
                .input("hash", sql.NVarChar(100), newHash)
                .query("UPDATE Users SET Password = @hash WHERE UserID = @id");
            } catch { /* non-fatal */ }
          }
        }
        if (!valid) return res.status(401).json({ error: "Invalid email or password" });
        const profile = isNurse ? mapNurse(user) : {
          id: String(user["UserID"]), name: String(user["Name"] ?? "").trim(),
          surname: (user["Surname"] as string)?.trim() || null,
          email: (user["Email"] as string)?.trim() || null,
          phone: (user["ContactNo"] as string)?.trim() || null,
          dob: (user["DOB"] as string)?.trim() || null,
          gender: null, address: null, role: "patient" as UserRole, sanc_hpcsa: null, is_student: false,
        };
        const token = signToken({ userId: profile.id, role: profile.role });
        return res.json({ user: profile, token });
      }

      // Not found in Azure SQL — fall through to Postgres
    } catch (azureErr) {
      const msg = azureErr instanceof Error ? azureErr.message : "";
      const lc = msg.toLowerCase();
      const isConnError = lc.includes("timeout") || lc.includes("connect") ||
        lc.includes("econnrefused") || lc.includes("login") || lc.includes("enotfound") ||
        lc.includes("failed") || lc.includes("password") || lc.includes("credentials");
      if (!isConnError) {
        return res.status(500).json({ error: msg || "Server error" });
      }
      // Fall through to Postgres below
    }

    // ── Postgres fallback ─────────────────────────────────────────────────────
    const pgUser = await pgSignIn(identifier, password);
    if (!pgUser) return res.status(401).json({ error: "Invalid username or password" });
    const token = signToken({ userId: pgUser.id, role: pgUser.role as UserRole });
    return res.json({ user: pgUser, token });

  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
  }
});

// ── profile fetch ─────────────────────────────────────────────────────────────

router.get("/profile/:id", requireAuth, async (req, res) => {
  try {
    const auth = req.auth!;
    const targetId = req.params.id;
    if (auth.role === "patient" && targetId !== auth.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Try Azure SQL
    try {
      const pool = await withTimeout(getPool(), 8000);
      if (auth.role === "patient") {
        const r = await pool.request()
          .input("id", sql.Int, Number(targetId))
          .query("SELECT * FROM Patients WHERE PatientID = @id");
        if (r.recordset.length === 0) return res.status(404).json({ error: "Not found" });
        return res.json(mapPatient(r.recordset[0] as Record<string, unknown>));
      }
      const r = await pool.request()
        .input("id", sql.Int, Number(targetId))
        .query("SELECT * FROM Users WHERE UserID = @id");
      if (r.recordset.length === 0) return res.status(404).json({ error: "Not found" });
      return res.json(mapNurse(r.recordset[0] as Record<string, unknown>));
    } catch {
      // Postgres fallback
      const { db, profilesTable } = await import("@workspace/db");
      const { eq } = await import("drizzle-orm");
      const rows = await db.select().from(profilesTable).where(eq(profilesTable.id, targetId));
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      return res.json(rows[0]);
    }
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
  }
});

export default router;
