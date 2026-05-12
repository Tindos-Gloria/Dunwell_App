// Supabase-backed store with realtime updates.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User as AuthUser } from "@supabase/supabase-js";

export type Role = "patient" | "nurse";
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type DeliveryChoice = "collect" | "courier" | null;
export type AppointmentType = "virtual" | "inclinic";
export type PaymentMethod = "online" | "eft" | "cash" | "card" | "medical-aid";

export interface MedicalAid {
  name: string; number: string; option: string; mainMember: string; mainMemberId: string;
}

export interface Profile {
  id: string;
  name: string;
  surname?: string | null;
  email?: string | null;
  phone?: string | null;
  dob?: string | null;
  gender?: string | null;
  address?: string | null;
  is_student?: boolean;
  role: Role;
}

export interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  service_id: string;
  service_name: string;
  price: number;
  date: string;
  time: string;
  type: AppointmentType;
  nurse_id?: string | null;
  nurse_name?: string | null;
  payment_method: PaymentMethod;
  is_student?: boolean | null;
  medical_aid?: MedicalAid | null;
  status: AppointmentStatus;
  paid: boolean;
  zoom_link?: string | null;
  notes?: string | null;
  diagnosis?: string | null;
  health_education?: string | null;
  follow_up_date?: string | null;
  delivery?: DeliveryChoice;
  medication_received?: boolean | null;
  rating?: number | null;
  feedback?: string | null;
  created_at: string;
}

export interface NurseSlot {
  id: string;
  nurse_id: string;
  nurse_name: string;
  date: string;
  start_time: string;
  end_time: string;
}

// --- Auth & profile hook ---
export function useCurrentUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setTimeout(() => fetchProfile(session.user.id), 0);
      else { setProfile(null); setLoading(false); }
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user) fetchProfile(data.session.user.id);
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function fetchProfile(uid: string) {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    if (p) {
      const role: Role = r?.some((x) => x.role === "nurse") ? "nurse" : "patient";
      setProfile({ ...(p as any), role });
    }
    setLoading(false);
  }

  return { user, profile, loading };
}

// --- Appointments hook ---
export function useAppointments(filter?: { patientId?: string; allForNurse?: boolean }) {
  const [items, setItems] = useState<Appointment[]>([]);

  const reload = async () => {
    let q = supabase.from("appointments").select("*").order("created_at", { ascending: false });
    if (filter?.patientId) q = q.eq("patient_id", filter.patientId);
    const { data } = await q;
    setItems((data as any) ?? []);
  };

  useEffect(() => {
    reload();
    const ch = supabase.channel("appointments-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter?.patientId, filter?.allForNurse]);

  return items;
}

// --- Slots hook ---
export function useSlots(filter?: { nurseId?: string }) {
  const [items, setItems] = useState<NurseSlot[]>([]);
  const reload = async () => {
    let q = supabase.from("nurse_slots").select("*").order("date");
    if (filter?.nurseId) q = q.eq("nurse_id", filter.nurseId);
    const { data } = await q;
    setItems((data as any) ?? []);
  };
  useEffect(() => {
    reload();
    const ch = supabase.channel("slots-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "nurse_slots" }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter?.nurseId]);
  return items;
}

// --- Medical documents ---
export type MedicalDocType = "sick_note" | "prescription" | "referral";
export interface MedicalDocument {
  id: string;
  patient_id: string;
  patient_name: string;
  nurse_id: string;
  nurse_name: string;
  type: MedicalDocType;
  data: any;
  created_at: string;
}

export function useMedicalDocuments(filter?: { patientId?: string }) {
  const [items, setItems] = useState<MedicalDocument[]>([]);
  const reload = async () => {
    let q = supabase.from("medical_documents").select("*").order("created_at", { ascending: false });
    if (filter?.patientId) q = q.eq("patient_id", filter.patientId);
    const { data } = await q;
    setItems((data as any) ?? []);
  };
  useEffect(() => {
    reload();
    const ch = supabase.channel("docs-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "medical_documents" }, () => reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter?.patientId]);
  return items;
}

// --- Patients list (for nurses) ---
export function usePatients() {
  const [items, setItems] = useState<Profile[]>([]);
  useEffect(() => {
    (async () => {
      const { data: r } = await supabase.from("user_roles").select("user_id, role");
      const nurseIds = new Set((r ?? []).filter((x: any) => x.role === "nurse").map((x: any) => x.user_id));
      const { data: ps } = await supabase.from("profiles").select("*");
      setItems(((ps as any) ?? []).filter((p: any) => !nurseIds.has(p.id)).map((p: any) => ({ ...p, role: "patient" as Role })));
    })();
  }, []);
  return items;
}

// --- Nurses list ---
export function useNurses() {
  const [items, setItems] = useState<Profile[]>([]);
  useEffect(() => {
    (async () => {
      const { data: r } = await supabase.from("user_roles").select("user_id").eq("role", "nurse");
      const ids = (r ?? []).map((x: any) => x.user_id);
      if (ids.length === 0) { setItems([]); return; }
      const { data: ps } = await supabase.from("profiles").select("*").in("id", ids);
      setItems(((ps as any) ?? []).map((p: any) => ({ ...p, role: "nurse" as Role })));
    })();
  }, []);
  return items;
}

// --- Mutations ---
export const store = {
  async signUp(input: {
    email: string; password: string; name: string; role: Role; inviteCode?: string;
    surname?: string; phone?: string; dob?: string; gender?: string;
    address?: string; isStudent?: boolean;
  }) {
    if (input.role === "nurse" && input.inviteCode !== "DUNWELL-NURSE-2026") {
      throw new Error("Invalid nurse invite code");
    }
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          name: input.name,
          surname: input.surname ?? "",
          phone: input.phone ?? "",
          dob: input.dob ?? "",
          gender: input.gender ?? "",
          address: input.address ?? "",
          is_student: input.isStudent ?? false,
          invite_code: input.role === "nurse" ? input.inviteCode : "",
        },
      },
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signInGoogle() {
    const { lovable } = await import("@/integrations/lovable");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) throw new Error((result.error as any).message ?? "Google sign-in failed");
    return result;
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  async createAppointment(a: Omit<Appointment, "id" | "created_at" | "status" | "paid"> & { status?: AppointmentStatus; paid?: boolean }) {
    const insert: any = { ...a, status: a.status ?? "pending", paid: a.paid ?? false };
    const { data, error } = await supabase.from("appointments").insert(insert).select().single();
    if (error) throw error;
    return data as unknown as Appointment;
  },

  async updateAppointment(id: string, patch: Partial<Appointment>) {
    const { error } = await supabase.from("appointments").update(patch as any).eq("id", id);
    if (error) throw error;
  },

  async addSlot(s: Omit<NurseSlot, "id">) {
    const { error } = await supabase.from("nurse_slots").insert(s as any);
    if (error) throw error;
  },

  async removeSlot(id: string) {
    await supabase.from("nurse_slots").delete().eq("id", id);
  },

  async createMedicalDocument(d: Omit<MedicalDocument, "id" | "created_at">) {
    const { data, error } = await supabase.from("medical_documents").insert(d as any).select().single();
    if (error) throw error;
    return data as unknown as MedicalDocument;
  },
};
