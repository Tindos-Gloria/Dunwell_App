import { pgTable, text, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profilesTable = pgTable("profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  surname: text("surname"),
  email: text("email"),
  phone: text("phone"),
  dob: text("dob"),
  gender: text("gender"),
  address: text("address"),
  is_student: boolean("is_student").default(false),
  role: text("role").notNull().default("patient"),
  password_hash: text("password_hash"),
  sanc_hpcsa: text("sanc_hpcsa"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const appointmentsTable = pgTable("appointments", {
  id: text("id").primaryKey(),
  patient_id: text("patient_id").notNull(),
  patient_name: text("patient_name").notNull(),
  service_id: text("service_id").notNull(),
  service_name: text("service_name").notNull(),
  price: integer("price").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  type: text("type").notNull(),
  nurse_id: text("nurse_id"),
  nurse_name: text("nurse_name"),
  payment_method: text("payment_method").notNull(),
  is_student: boolean("is_student").default(false),
  medical_aid: jsonb("medical_aid"),
  status: text("status").notNull().default("pending"),
  paid: boolean("paid").default(false),
  zoom_link: text("zoom_link"),
  notes: text("notes"),
  diagnosis: text("diagnosis"),
  health_education: text("health_education"),
  follow_up_date: text("follow_up_date"),
  delivery: text("delivery"),
  medication_received: boolean("medication_received"),
  rating: integer("rating"),
  feedback: text("feedback"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const nurseSlotsTable = pgTable("nurse_slots", {
  id: text("id").primaryKey(),
  nurse_id: text("nurse_id").notNull(),
  nurse_name: text("nurse_name").notNull(),
  date: text("date").notNull(),
  start_time: text("start_time").notNull(),
  end_time: text("end_time").notNull(),
});

export const medicalDocumentsTable = pgTable("medical_documents", {
  id: text("id").primaryKey(),
  patient_id: text("patient_id").notNull(),
  patient_name: text("patient_name").notNull(),
  nurse_id: text("nurse_id").notNull(),
  nurse_name: text("nurse_name").notNull(),
  type: text("type").notNull(),
  data: jsonb("data"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ created_at: true });
export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ created_at: true });
export const insertNurseSlotSchema = createInsertSchema(nurseSlotsTable);
export const insertMedicalDocumentSchema = createInsertSchema(medicalDocumentsTable).omit({ created_at: true });

export type Profile = typeof profilesTable.$inferSelect;
export type Appointment = typeof appointmentsTable.$inferSelect;
export type NurseSlot = typeof nurseSlotsTable.$inferSelect;
export type MedicalDocument = typeof medicalDocumentsTable.$inferSelect;
