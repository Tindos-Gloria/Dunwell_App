import { Router } from "express";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

const router = Router();

router.post("/signup", async (req, res) => {
  try {
    const { email, password, name, role, inviteCode, surname, phone, dob, gender, address, isStudent } = req.body;

    if (role === "nurse" && inviteCode !== "DUNWELL-NURSE-2026") {
      return res.status(400).json({ error: "Invalid nurse invite code" });
    }

    const existing = await db.select().from(profilesTable).where(eq(profilesTable.email, email)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const id = randomUUID();

    const [profile] = await db.insert(profilesTable).values({
      id,
      email,
      name,
      role: role || "patient",
      password_hash,
      surname: surname || null,
      phone: phone || null,
      dob: dob || null,
      gender: gender || null,
      address: address || null,
      is_student: isStudent || false,
    }).returning();

    const { password_hash: _, ...safeProfile } = profile;
    return res.status(201).json({ user: safeProfile });
  } catch (err: unknown) {
    req.log.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.email, email)).limit(1);

    if (!profile || !profile.password_hash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, profile.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const { password_hash: _, ...safeProfile } = profile;
    return res.json({ user: safeProfile });
  } catch (err: unknown) {
    req.log.error(err);
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

router.get("/profile/:id", async (req, res) => {
  try {
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, req.params.id)).limit(1);
    if (!profile) return res.status(404).json({ error: "Not found" });
    const { password_hash: _, ...safeProfile } = profile;
    return res.json(safeProfile);
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  }
});

export default router;
