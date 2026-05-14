import { useEffect, useState } from "react";

const API = "/api";
const TOKEN_KEY = "dunwell_token";
const SESSION_KEY = "dunwell_user";

export type Role = "patient" | "nurse";
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "InPatient" | "OutPatient";
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
  sanc_hpcsa?: string | null;
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
  start_time?: string | null;
  end_time?: string | null;
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
  examination?: string | null;
  history?: string | null;
  diagnosis?: string | null;
  health_education?: string | null;
  follow_up_date?: string | null;
  medication?: string | null;
  booking_type?: string | null;
  delivery?: DeliveryChoice;
  delivery_date?: string | null;
  delivery_address?: string | null;
  medication_received?: boolean | null;
  rating?: number | null;
  feedback?: string | null;
  created_at: string;
  is_follow_up?: string | null;
}

export interface NurseSlot {
  id: string;
  nurse_id: string;
  nurse_name: string;
  date: string;
  start_time: string;
  end_time: string;
  slot_type?: "virtual" | "inclinic";
}

export type MedicalDocType = "sick_note" | "prescription" | "referral";
export interface MedicalDocument {
  id: string;
  patient_id: string;
  patient_name: string;
  nurse_id: string;
  nurse_name: string;
  type: MedicalDocType;
  data: Record<string, unknown>;
  created_at: string;
}

export interface CatalogueItem {
  id: string;
  type: string;
  name: string;
  price: number;
  discount: number;
}

// ── session helpers ─────────────────────────────────────────────────────────

function getStoredUser(): Profile | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}
function setStoredUser(u: Profile | null) {
  if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u));
  else localStorage.removeItem(SESSION_KEY);
}
function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

/** Attach Authorization header when a token is present */
function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Fetch helper that auto-attaches auth header */
async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

/** Safe JSON parser — never throws on empty or non-JSON bodies */
async function safeJson<T = unknown>(res: Response): Promise<T> {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return {} as T;
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

let currentUser: Profile | null = getStoredUser();
const listeners = new Set<() => void>();
function notifyListeners() { listeners.forEach((fn) => fn()); }

// ── hooks ────────────────────────────────────────────────────────────────────

export function useCurrentUser() {
  const [profile, setProfile] = useState<Profile | null>(currentUser);

  useEffect(() => {
    const update = () => setProfile(currentUser);
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  return { user: profile, profile, loading: false };
}

export function useAppointments(filter?: { patientId?: string; allForNurse?: boolean }) {
  const [items, setItems] = useState<Appointment[]>([]);

  useEffect(() => {
    const reload = async () => {
      let url = `${API}/appointments`;
      if (filter?.patientId) url += `?patientId=${filter.patientId}`;
      try {
        const res = await apiFetch(url);
        if (res.ok) {
          const data = await safeJson<Appointment[]>(res);
          if (Array.isArray(data)) setItems(data);
        }
      } catch { /* network error — keep stale data */ }
    };
    reload();
    const id = setInterval(reload, 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter?.patientId, filter?.allForNurse]);

  return items;
}

export function useSlots(filter?: { nurseId?: string }) {
  const [items, setItems] = useState<NurseSlot[]>([]);

  useEffect(() => {
    const reload = async () => {
      let url = `${API}/slots`;
      if (filter?.nurseId) url += `?nurseId=${filter.nurseId}`;
      try {
        const res = await apiFetch(url);
        if (res.ok) {
          const data = await safeJson<NurseSlot[]>(res);
          if (Array.isArray(data)) setItems(data);
        }
      } catch { /* ignore */ }
    };
    reload();
    const id = setInterval(reload, 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter?.nurseId]);

  return items;
}

export function useMedicalDocuments(filter?: { patientId?: string }) {
  const [items, setItems] = useState<MedicalDocument[]>([]);

  useEffect(() => {
    const reload = async () => {
      let url = `${API}/documents`;
      if (filter?.patientId) url += `?patientId=${filter.patientId}`;
      try {
        const res = await apiFetch(url);
        if (res.ok) {
          const data = await safeJson<MedicalDocument[]>(res);
          if (Array.isArray(data)) setItems(data);
        }
      } catch { /* ignore */ }
    };
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter?.patientId]);

  return items;
}

export function usePatients() {
  const [items, setItems] = useState<Profile[]>([]);
  useEffect(() => {
    apiFetch(`${API}/profiles/patients`)
      .then((r) => safeJson<Profile[]>(r))
      .then((data) => { if (Array.isArray(data)) setItems(data); })
      .catch(() => {});
  }, []);
  return items;
}

export function useNurses() {
  const [items, setItems] = useState<Profile[]>([]);
  useEffect(() => {
    apiFetch(`${API}/profiles/nurses`)
      .then((r) => safeJson<Profile[]>(r))
      .then((data) => { if (Array.isArray(data)) setItems(data); })
      .catch(() => {});
  }, []);
  return items;
}

export function useCatalogue() {
  const [items, setItems] = useState<CatalogueItem[]>([]);
  useEffect(() => {
    fetch(`${API}/catalogue`)
      .then((r) => r.ok ? safeJson<CatalogueItem[]>(r) : Promise.resolve([] as CatalogueItem[]))
      .then((d) => { if (Array.isArray(d)) setItems(d); })
      .catch(() => {});
  }, []);
  return items;
}

// ── store mutations ───────────────────────────────────────────────────────────

export const store = {
  async signUp(input: {
    email: string; password: string; name: string; role: Role; inviteCode?: string;
    surname?: string; phone?: string; dob?: string; gender?: string;
    address?: string; isStudent?: boolean;
  }) {
    const res = await fetch(`${API}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await safeJson<{ user: Profile; token: string; error?: string }>(res);
    if (!res.ok) throw new Error(data.error || "Sign up failed");
    currentUser = data.user;
    setStoredUser(data.user);
    setToken(data.token);
    notifyListeners();
    return data;
  },

  async signIn(email: string, password: string, opts?: { username?: string }) {
    const body = opts?.username
      ? { username: opts.username, password }
      : { email, password };
    const res = await fetch(`${API}/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await safeJson<{ user: Profile; token: string; error?: string }>(res);
    if (!res.ok) throw new Error(data.error || "Sign in failed");
    currentUser = data.user;
    setStoredUser(data.user);
    setToken(data.token);
    notifyListeners();
    return data;
  },

  async signOut() {
    currentUser = null;
    setStoredUser(null);
    setToken(null);
    notifyListeners();
  },

  async createAppointment(a: Omit<Appointment, "id" | "created_at" | "status" | "paid"> & { status?: AppointmentStatus; paid?: boolean }) {
    const res = await apiFetch(`${API}/appointments`, {
      method: "POST",
      body: JSON.stringify(a),
    });
    const data = await safeJson<Appointment & { error?: string }>(res);
    if (!res.ok) throw new Error(data.error || "Failed to create appointment");
    return data as Appointment;
  },

  async updateAppointment(id: string, patch: Partial<Appointment>) {
    const res = await apiFetch(`${API}/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await safeJson<{ error?: string }>(res);
      throw new Error(data.error || "Failed to update appointment");
    }
  },

  async addSlot(s: Omit<NurseSlot, "id">) {
    const res = await apiFetch(`${API}/slots`, {
      method: "POST",
      body: JSON.stringify(s),
    });
    if (!res.ok) {
      const data = await safeJson<{ error?: string }>(res);
      throw new Error(data.error || "Failed to add slot");
    }
  },

  async removeSlot(id: string) {
    await apiFetch(`${API}/slots/${id}`, { method: "DELETE" });
  },

  async deleteAppointment(id: string) {
    const res = await apiFetch(`${API}/appointments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await safeJson<{ error?: string }>(res);
      throw new Error(data.error || "Failed to cancel appointment");
    }
  },

  async createMedicalDocument(d: Omit<MedicalDocument, "id" | "created_at">) {
    const res = await apiFetch(`${API}/documents`, {
      method: "POST",
      body: JSON.stringify(d),
    });
    const data = await safeJson<MedicalDocument & { error?: string }>(res);
    if (!res.ok) throw new Error(data.error || "Failed to create document");
    return data as MedicalDocument;
  },
};
