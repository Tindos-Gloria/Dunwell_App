import { Router } from "express";
import { getPool, sql } from "../lib/azureDb";
import { requireNurse } from "../lib/auth";

const router = Router();

const mapRow = (r: Record<string, unknown>) => ({
  id: String(r["AppointID"]),
  patient_id: String(r["PatientID"]),
  patient_name: String(r["PatientName"] ?? ""),
  service_id: String(r["ServiceName"] ?? ""),
  service_name: String(r["ServiceName"] ?? ""),
  price: Number(r["ServicePrice"] ?? 0),
  date: r["StartTime"] ? new Date(r["StartTime"] as string).toISOString().slice(0, 10) : "",
  time: r["StartTime"] ? new Date(r["StartTime"] as string).toISOString().slice(11, 16) : "",
  start_time: r["StartTime"] ?? null,
  end_time: r["EndTime"] ?? null,
  type: r["Booking_Type"] === "Online_Virtual" ? "virtual" : "inclinic",
  booking_type: (r["Booking_Type"] as string) || null,
  nurse_id: r["UserID"] ? String(r["UserID"]) : null,
  nurse_name: (r["NurseName"] as string) || null,
  payment_method: (r["PaymentMethod"] as string) || "cash",
  is_student: Boolean(r["IsStudent"]),
  medical_aid: r["MedicalAidName"] ? {
    name: String(r["MedicalAidName"]),
    number: String(r["MedicalAidNumber"] ?? ""),
    option: String(r["MedicalAid_option"] ?? ""),
    mainMember: String(r["MedicalAid_MainMember"] ?? ""),
    mainMemberId: String(r["MainMember__IDNo"] ?? ""),
  } : null,
  status: (r["Status"] as string) || "pending",
  paid: Boolean(r["Paid"]),
  zoom_link: (r["ZoomLink"] as string) || null,
  notes: (r["Treatment"] as string) || null,
  examination: (r["Examination"] as string) || null,
  history: (r["History"] as string) || null,
  diagnosis: (r["Diagnoses"] as string) || null,
  health_education: (r["Health_Education"] as string) || null,
  follow_up_date: (r["FollowUp_Plan"] as string) || null,
  medication: (r["Medication"] as string) || null,
  delivery: (r["Delivery_Type"] as string) || null,
  delivery_date: (r["Delivery_Date"] as string) || null,
  delivery_address: (r["Delivery_Address"] as string) || null,
  medication_received: Boolean(r["Medication_Received"]),
  rating: r["Rating"] != null ? Number(r["Rating"]) : null,
  feedback: (r["Feedback"] as string) || null,
  created_at: (r["StartTime"] as string) || new Date().toISOString(),
  is_follow_up: (r["isFollow_Up"] as string) || "No",
});

const BASE_QUERY = `
  SELECT a.*,
    u.Name + ' ' + ISNULL(u.Surname,'') as NurseName,
    COALESCE(
      pt.PatientName + ' ' + ISNULL(pt.PatientSurname,''),
      pu.Name + ' ' + ISNULL(pu.Surname,'')
    ) as PatientName,
    NULL as AppointType,
    v.Examination, v.History, v.Diagnoses, v.Treatment, v.Health_Education, v.FollowUp_Plan,
    v.Medication, v.Delivery_Type, v.Delivery_Date, v.Delivery_Address, v.Medication_Received
  FROM Appointments a
  LEFT JOIN Users u  ON a.UserID    = u.UserID
  LEFT JOIN Patients pt ON a.PatientID = pt.PatientID
  LEFT JOIN Users pu ON a.PatientID = pu.UserID
  LEFT JOIN Visit v  ON a.AppointID = v.AppointID
`;

// Attempt to ensure Visit table has needed columns — run once per process
let visitColumnsChecked = false;
async function ensureVisitColumns(pool: Awaited<ReturnType<typeof getPool>>) {
  if (visitColumnsChecked) return;
  visitColumnsChecked = true;
  const cols = [
    "ALTER TABLE Visit ADD Medication NVARCHAR(MAX)",
    "ALTER TABLE Visit ADD Delivery_Type NVARCHAR(50)",
    "ALTER TABLE Visit ADD Delivery_Date NVARCHAR(50)",
    "ALTER TABLE Visit ADD Delivery_Address NVARCHAR(500)",
    "ALTER TABLE Visit ADD Medication_Received BIT DEFAULT 0",
    "ALTER TABLE Appointments ADD Booking_Type NVARCHAR(50)",
  ];
  for (const stmt of cols) {
    try { await pool.request().query(stmt); } catch { /* column already exists */ }
  }
}

// GET /appointments
router.get("/", async (req, res) => {
  try {
    const pool = await getPool();
    await ensureVisitColumns(pool);
    const auth = req.auth!;

    if (auth.role === "patient") {
      const result = await pool.request()
        .input("patientId", sql.Int, Number(auth.userId))
        .query(BASE_QUERY + " WHERE a.PatientID = @patientId ORDER BY a.StartTime DESC");
      return res.json(result.recordset.map(mapRow));
    }

    const { patientId } = req.query;
    if (patientId) {
      const result = await pool.request()
        .input("patientId", sql.Int, Number(patientId))
        .query(BASE_QUERY + " WHERE a.PatientID = @patientId ORDER BY a.StartTime DESC");
      return res.json(result.recordset.map(mapRow));
    }
    const result = await pool.request().query(BASE_QUERY + " ORDER BY a.StartTime DESC");
    return res.json(result.recordset.map(mapRow));
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
  }
});

// POST /appointments — EndTime = NULL, Booking_Type set
router.post("/", async (req, res) => {
  try {
    const d = req.body as Record<string, unknown>;
    const auth = req.auth!;

    if (auth.role === "patient" && String(d["patient_id"]) !== auth.userId) {
      return res.status(403).json({ error: "Cannot book on behalf of another patient" });
    }

    const pool = await getPool();
    await ensureVisitColumns(pool);
    const startTime = (d["start_time"] as string) || `${d["date"]}T${d["time"] || "09:00"}:00`;
    const bookingType = d["type"] === "inclinic" ? "Online_InClinic" : "Online_Virtual";

    const medicalAid = d["medical_aid"] as Record<string, string> | null | undefined;

    const result = await pool.request()
      .input("patientId", sql.Int, Number(d["patient_id"]))
      .input("medicalAidNumber", sql.NVarChar(50), medicalAid?.["number"] ?? null)
      .input("startTime", sql.DateTime, new Date(startTime))
      .input("userId", sql.Int, d["nurse_id"] ? Number(d["nurse_id"]) : null)
      .input("medicalAidName", sql.NVarChar(50), medicalAid?.["name"] ?? null)
      .input("status", sql.NVarChar(50), (d["status"] as string) || "pending")
      .input("serviceName", sql.NVarChar(50), String(d["service_name"] ?? "").slice(0, 50))
      .input("servicePrice", sql.Decimal(10, 2), Number(d["price"]) || 0)
      .input("mainMember", sql.NVarChar(50), medicalAid?.["mainMember"] ?? null)
      .input("mainMemberId", sql.NVarChar(50), medicalAid?.["mainMemberId"] ?? null)
      .input("medicalAidOption", sql.NVarChar(50), medicalAid?.["option"] ?? null)
      .input("paymentMethod", sql.NVarChar(50), (d["payment_method"] as string) || "cash")
      .input("finalPrice", sql.Decimal(10, 2), Number(d["price"]) || 0)
      .input("isStudent", sql.Bit, d["is_student"] ? 1 : 0)
      .input("isFollowUp", sql.NVarChar(3), "No")
      .input("bookingType", sql.NVarChar(50), bookingType)
      .query(`INSERT INTO Appointments
        (PatientID, MedicalAidNumber, StartTime, EndTime, UserID, MedicalAidName, Status, ServiceName, ServicePrice,
         MedicalAid_MainMember, MainMember__IDNo, MedicalAid_option, PaymentMethod, FinalPrice, IsStudent, isFollow_Up, Booking_Type)
        OUTPUT INSERTED.*
        VALUES (@patientId, @medicalAidNumber, @startTime, NULL, @userId, @medicalAidName, @status, @serviceName,
                @servicePrice, @mainMember, @mainMemberId, @medicalAidOption, @paymentMethod, @finalPrice, @isStudent, @isFollowUp, @bookingType)`);

    const row = result.recordset[0] as Record<string, unknown>;
    return res.status(201).json(mapRow({
      ...row,
      PatientName: d["patient_name"],
      NurseName: d["nurse_name"],
    }));
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
  }
});

// PATCH /appointments/:id
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const d = req.body as Record<string, unknown>;
    const auth = req.auth!;
    const pool = await getPool();
    await ensureVisitColumns(pool);

    if (auth.role === "patient") {
      const check = await pool.request()
        .input("id", sql.Int, Number(id))
        .query("SELECT PatientID FROM Appointments WHERE AppointID = @id");
      if (check.recordset.length === 0) return res.status(404).json({ error: "Appointment not found" });
      if (String((check.recordset[0] as Record<string, unknown>)["PatientID"]) !== auth.userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const setClauses: string[] = [];
      const patientReq = pool.request().input("id", sql.Int, Number(id));

      if (d["paid"] != null) { setClauses.push("Paid = @paid"); patientReq.input("paid", sql.Bit, d["paid"] ? 1 : 0); }
      if (d["payment_method"] != null) { setClauses.push("PaymentMethod = @paymentMethod"); patientReq.input("paymentMethod", sql.NVarChar(50), String(d["payment_method"])); }
      if (d["rating"] != null) { setClauses.push("Rating = @rating"); patientReq.input("rating", sql.Int, Number(d["rating"])); }
      if (d["feedback"] != null) { setClauses.push("Feedback = @feedback"); patientReq.input("feedback", sql.NVarChar(sql.MAX), String(d["feedback"])); }
      // Reschedule (modify booking)
      if (d["date"] && d["time"]) {
        const newStart = new Date(`${d["date"]}T${d["time"]}:00`);
        setClauses.push("StartTime = @startTime", "EndTime = NULL");
        patientReq.input("startTime", sql.DateTime, newStart);
      }

      if (setClauses.length > 0) {
        await patientReq.query(`UPDATE Appointments SET ${setClauses.join(", ")} WHERE AppointID = @id`);
      }

      // Delivery + medication info → Visit record
      if (d["delivery"] || d["delivery_date"] || d["delivery_address"] || d["medication_received"] != null) {
        const existV = await pool.request().input("id", sql.Int, Number(id)).query("SELECT VisitID FROM Visit WHERE AppointID = @id");
        const vReq = pool.request()
          .input("id", sql.Int, Number(id))
          .input("deliveryType", sql.NVarChar(50), d["delivery"] ? String(d["delivery"]) : null)
          .input("deliveryDate", sql.NVarChar(50), d["delivery_date"] ? String(d["delivery_date"]) : null)
          .input("deliveryAddr", sql.NVarChar(500), d["delivery_address"] ? String(d["delivery_address"]) : null)
          .input("medRec", sql.Bit, d["medication_received"] ? 1 : 0);

        if (existV.recordset.length > 0) {
          await vReq.query(`UPDATE Visit SET
            Delivery_Type = ISNULL(@deliveryType, Delivery_Type),
            Delivery_Date = ISNULL(@deliveryDate, Delivery_Date),
            Delivery_Address = ISNULL(@deliveryAddr, Delivery_Address),
            Medication_Received = @medRec
            WHERE AppointID = @id`);
        } else {
          await vReq.query(`INSERT INTO Visit (AppointID, Delivery_Type, Delivery_Date, Delivery_Address, Medication_Received)
            VALUES (@id, @deliveryType, @deliveryDate, @deliveryAddr, @medRec)`);
        }
      }

      const updated = await pool.request().input("id", sql.Int, Number(id)).query(BASE_QUERY + " WHERE a.AppointID = @id");
      return res.json(mapRow(updated.recordset[0] as Record<string, unknown>));
    }

    // ── Nurse path ─────────────────────────────────────────────────────────────

    const aptClauses: string[] = [];
    const aptReq = pool.request().input("id", sql.Int, Number(id));

    if (d["status"]) {
      aptClauses.push("Status = @status");
      aptReq.input("status", sql.NVarChar(50), String(d["status"]));
      // When visit is completed by nurse, set EndTime on Appointments
      const completionStatuses = ["OutPatient", "completed"];
      if (completionStatuses.includes(String(d["status"]))) {
        const now = new Date();
        aptClauses.push("EndTime = @endTime");
        aptReq.input("endTime", sql.DateTime, now);
      }
    }
    if (d["zoom_link"] !== undefined) {
      aptClauses.push("ZoomLink = @zoomLink");
      aptReq.input("zoomLink", sql.NVarChar(255), d["zoom_link"] ? String(d["zoom_link"]) : null);
    }
    if (aptClauses.length > 0) {
      await aptReq.query(`UPDATE Appointments SET ${aptClauses.join(", ")} WHERE AppointID = @id`);
    }

    // Clinical notes + medication → Visit
    if (d["diagnosis"] || d["health_education"] || d["notes"] || d["follow_up_date"] || d["medication"]) {
      const existing = await pool.request().input("id", sql.Int, Number(id)).query("SELECT VisitID FROM Visit WHERE AppointID = @id");
      const now = new Date();
      const visitReq = (r: ReturnType<typeof pool.request>) => r
        .input("id", sql.Int, Number(id))
        .input("diagnosis", sql.NVarChar(sql.MAX), String(d["diagnosis"] ?? ""))
        .input("treatment", sql.NVarChar(sql.MAX), String(d["notes"] ?? ""))
        .input("healthEd", sql.NVarChar(sql.MAX), String(d["health_education"] ?? ""))
        .input("followUp", sql.NVarChar(sql.MAX), String(d["follow_up_date"] ?? ""))
        .input("medication", sql.NVarChar(sql.MAX), String(d["medication"] ?? ""))
        .input("endTime", sql.DateTime, now);

      if (existing.recordset.length > 0) {
        await visitReq(pool.request()).query(
          "UPDATE Visit SET Diagnoses=@diagnosis, Treatment=@treatment, Health_Education=@healthEd, FollowUp_Plan=@followUp, Medication=@medication, endTime=@endTime WHERE AppointID=@id"
        );
      } else {
        await visitReq(pool.request()).query(
          "INSERT INTO Visit (AppointID, Diagnoses, Treatment, Health_Education, FollowUp_Plan, Medication, endTime) VALUES (@id, @diagnosis, @treatment, @healthEd, @followUp, @medication, @endTime)"
        );
      }
    }

    const updated = await pool.request().input("id", sql.Int, Number(id)).query(BASE_QUERY + " WHERE a.AppointID = @id");
    return res.json(mapRow(updated.recordset[0] as Record<string, unknown>));
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
  }
});

// DELETE /appointments/:id — patients can only delete their own pending/confirmed
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const auth = req.auth!;
    const pool = await getPool();

    const check = await pool.request()
      .input("id", sql.Int, Number(id))
      .query("SELECT PatientID, Status FROM Appointments WHERE AppointID = @id");
    if (check.recordset.length === 0) return res.status(404).json({ error: "Appointment not found" });

    const row = check.recordset[0] as Record<string, unknown>;

    if (auth.role === "patient") {
      if (String(row["PatientID"]) !== auth.userId) return res.status(403).json({ error: "Access denied" });
      const status = String(row["Status"]);
      if (!["pending", "confirmed", "InPatient"].includes(status)) {
        return res.status(400).json({ error: "Cannot cancel a completed or already-cancelled appointment" });
      }
    }

    // Soft delete: set status to cancelled
    await pool.request()
      .input("id", sql.Int, Number(id))
      .query("UPDATE Appointments SET Status = 'cancelled' WHERE AppointID = @id");

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Server error" });
  }
});

export default router;
