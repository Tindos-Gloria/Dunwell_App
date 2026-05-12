import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { store, useCurrentUser, useAppointments, useSlots, type Appointment } from "@/lib/store";
import { toast } from "sonner";
import {
  Calendar, CheckCircle2, Clock, Plus, Trash2, Video, Stethoscope,
  Building2, FileText, TrendingUp, Users, WifiOff, UserCheck,
  ChevronRight, AlertCircle,
} from "lucide-react";
import { MedicalDocsPanel } from "@/components/MedicalDocsPanel";

const statusConfig: Record<string, { cls: string; label: string }> = {
  pending:    { cls: "bg-amber-50 text-amber-700 border-amber-200",      label: "Pending" },
  confirmed:  { cls: "bg-blue-50 text-blue-700 border-blue-200",         label: "Confirmed" },
  completed:  { cls: "bg-emerald-50 text-emerald-700 border-emerald-200",label: "Completed" },
  OutPatient: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200",label: "OutPatient" },
  cancelled:  { cls: "bg-slate-100 text-slate-500 border-slate-200",     label: "Cancelled" },
  InPatient:  { cls: "bg-purple-50 text-purple-700 border-purple-200",   label: "In-Patient" },
};

const NursePortal = () => {
  const { profile, loading } = useCurrentUser();
  const navigate = useNavigate();
  const allApps = useAppointments({ allForNurse: true });
  const slots = useSlots({ nurseId: profile?.id });

  const [slotForm, setSlotForm] = useState({ date: "", start_time: "09:00", end_time: "12:00" });
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [zoomLink, setZoomLink] = useState("");
  const [notes, setNotes] = useState({ diagnosis: "", notes: "", health_education: "", follow_up_date: "", medication: "" });
  const [docPatientId, setDocPatientId] = useState<string | null>(null);
  const [editingMode, setEditingMode] = useState<"zoom" | "complete" | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!profile) navigate("/auth");
    else if (profile.role !== "nurse") navigate("/portal");
  }, [profile, loading, navigate]);

  if (!profile || profile.role !== "nurse") return null;

  const addSlot = async () => {
    if (!slotForm.date) { toast.error("Pick a date"); return; }
    try {
      await store.addSlot({ ...slotForm, nurse_id: profile.id, nurse_name: profile.name });
      toast.success("Slot added");
      setSlotForm({ date: "", start_time: "09:00", end_time: "12:00" });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "An error occurred"); }
  };

  const openZoom = (a: Appointment) => {
    setEditing(a); setEditingMode("zoom");
    setZoomLink("https://us04web.zoom.us/j/" + Math.floor(Math.random() * 9e9));
  };
  const openComplete = (a: Appointment) => {
    setEditing(a); setEditingMode("complete");
    setNotes({ diagnosis: "", notes: "", health_education: "", follow_up_date: "", medication: "" });
  };
  const closeDialog = () => { setEditing(null); setEditingMode(null); setZoomLink(""); };

  const accept = async (a: Appointment) => {
    if (!zoomLink.trim()) { toast.error("Add a Zoom link to confirm"); return; }
    await store.updateAppointment(a.id, { status: "confirmed", zoom_link: zoomLink });
    toast.success("Appointment confirmed and Zoom link sent");
    closeDialog();
  };

  const completeWithNotes = async (a: Appointment) => {
    await store.updateAppointment(a.id, {
      status: "OutPatient", diagnosis: notes.diagnosis, notes: notes.notes,
      health_education: notes.health_education, follow_up_date: notes.follow_up_date || null,
      medication: notes.medication || null,
    });
    toast.success("Visit completed — status set to OutPatient");
    closeDialog();
  };

  const cancel = async (a: Appointment) => {
    await store.updateAppointment(a.id, { status: "cancelled" });
    toast.success("Appointment cancelled");
  };

  // Today's date string (YYYY-MM-DD) for In-Clinic filter
  const todayStr = new Date().toISOString().slice(0, 10);

  // Groups
  const virtualPending   = allApps.filter((a) => a.type === "virtual" && a.status === "pending" && a.paid);
  const virtualAwaiting  = allApps.filter((a) => a.type === "virtual" && a.status === "pending" && !a.paid);
  const virtualConfirmed = allApps.filter((a) => a.type === "virtual" && a.status === "confirmed");
  const virtualCompleted = allApps.filter((a) => a.type === "virtual" && a.status === "completed");

  // In-Clinic: must be today's date, assigned to this nurse, and status === "InPatient"
  const inPatient = allApps.filter(
    (a) => a.type === "inclinic" && a.status === "InPatient" && a.date === todayStr && a.nurse_id === profile.id
  );
  // Completed in-clinic: today + this nurse (includes OutPatient status)
  const inClinicCompleted = allApps.filter(
    (a) => a.type === "inclinic" && ["completed", "OutPatient"].includes(a.status) && a.date === todayStr && a.nurse_id === profile.id
  );
  // Completed virtual: also includes OutPatient
  const virtualCompletedFull = allApps.filter((a) => a.type === "virtual" && ["completed", "OutPatient"].includes(a.status));

  const totalVirtual  = virtualPending.length + virtualAwaiting.length + virtualConfirmed.length + virtualCompletedFull.length;
  const totalInClinic = inPatient.length + inClinicCompleted.length;

  const stats = [
    { label: "Awaiting payment", value: virtualAwaiting.length,  icon: WifiOff,      color: "text-slate-500",   bg: "bg-slate-100",   accent: "#94a3b8" },
    { label: "Pending Zoom",     value: virtualPending.length,   icon: AlertCircle,  color: "text-amber-600",   bg: "bg-amber-50",    accent: "#f59e0b" },
    { label: "In-Patient",       value: inPatient.length,        icon: UserCheck,    color: "text-purple-600",  bg: "bg-purple-50",   accent: "#9333ea" },
    { label: "Completed",        value: virtualCompletedFull.length + inClinicCompleted.length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", accent: "#10b981" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #fffbeb 100%)" }}>
      <Header />
      <div className="container py-8 space-y-6 animate-fade-in-up">

        {/* Hero */}
        <div className="rounded-3xl overflow-hidden shadow-xl" style={{ background: "linear-gradient(135deg, #1a365d 0%, #2a5298 60%, #1a365d 100%)" }}>
          <div className="p-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-1">Nurse Portal</p>
              <h1 className="text-3xl font-black text-white flex items-center gap-2.5">
                <Stethoscope className="h-7 w-7 text-[#fbbf24]" /> Welcome, {profile.name}
              </h1>
              <p className="text-blue-200 text-sm mt-1">{allApps.length} total booking{allApps.length !== 1 ? "s" : ""} in the system</p>
            </div>
            <img src="/dunwell-logo.jpeg" alt="Dunwell" className="h-16 w-16 rounded-2xl object-contain bg-white/10 p-1 hidden sm:block shadow-lg" />
          </div>
          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10">
            {stats.map((s) => (
              <div key={s.label} className="bg-white/5 p-5 hover:bg-white/10 transition-colors">
                <div className="text-3xl font-black text-white">{s.value}</div>
                <div className="text-blue-200 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick-action stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-5 border-0 shadow-sm rounded-2xl bg-white hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon className={`${s.color} h-4.5 w-4.5`} />
              </div>
              <div className="text-2xl font-black text-[#1a365d]">{s.value}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="bookings">
          <TabsList className="bg-white border border-slate-200 shadow-sm rounded-2xl p-1 gap-1">
            {[
              { value: "bookings",      label: "Bookings",      icon: Calendar },
              { value: "availability",  label: "Availability",  icon: Clock },
              { value: "documents",     label: "Documents",     icon: FileText },
              { value: "patients",      label: "Patients",      icon: Users },
            ].map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="rounded-xl font-semibold data-[state=active]:bg-[#1a365d] data-[state=active]:text-white gap-1.5 px-4">
                <t.icon className="h-4 w-4" /> {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Bookings ── */}
          <TabsContent value="bookings" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">

              {/* Virtual column */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b-2 border-blue-100">
                  <div className="w-10 h-10 rounded-2xl bg-[#1a365d] flex items-center justify-center shadow-sm">
                    <Video className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-black text-[#1a365d] text-lg leading-tight">Virtual Appointments</h2>
                    <p className="text-xs text-slate-400">Outpatient · online consultations</p>
                  </div>
                  <Badge className="ml-auto bg-[#1a365d] text-white border-0 font-bold px-3">{totalVirtual}</Badge>
                </div>

                <GroupSection
                  title="Awaiting Zoom link"
                  icon={AlertCircle}
                  items={virtualPending}
                  accent="amber"
                  emptyText="No appointments awaiting confirmation"
                  actions={(a) => (
                    <Button size="sm" className="bg-[#1a365d] text-white hover:bg-[#1a365d]/90 rounded-xl" onClick={() => openZoom(a)}>
                      <Video className="h-3.5 w-3.5 mr-1" /> Accept & send link
                    </Button>
                  )}
                />

                <GroupSection
                  title="Confirmed — upcoming"
                  icon={CheckCircle2}
                  items={virtualConfirmed}
                  accent="blue"
                  emptyText="No confirmed virtual sessions"
                  actions={(a) => (
                    <div className="flex gap-2">
                      {a.zoom_link && (
                        <Button variant="outline" size="sm" className="rounded-xl border-[#1a365d]/20 text-[#1a365d]" asChild>
                          <a href={a.zoom_link} target="_blank" rel="noreferrer"><Video className="h-3.5 w-3.5 mr-1" /> Join</a>
                        </Button>
                      )}
                      <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl" onClick={() => openComplete(a)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                      </Button>
                    </div>
                  )}
                />

                <GroupSection
                  title="Awaiting payment"
                  icon={WifiOff}
                  items={virtualAwaiting}
                  accent="slate"
                  emptyText="No unpaid virtual appointments"
                  muted
                  actions={(a) => (
                    <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 rounded-xl" onClick={() => cancel(a)}>Cancel</Button>
                  )}
                />

                <GroupSection
                  title="Completed outpatient visits"
                  icon={CheckCircle2}
                  items={virtualCompletedFull}
                  accent="emerald"
                  emptyText="No completed virtual visits yet"
                  muted
                  actions={(a) => (
                    <div className="flex gap-2 items-center">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">{a.rating ? `${a.rating}★` : "OutPatient"}</Badge>
                      <Button variant="ghost" size="sm" className="text-xs text-[#1a365d] hover:bg-[#1a365d]/5" onClick={() => setDocPatientId(a.patient_id)}>
                        <FileText className="h-3.5 w-3.5 mr-1" /> Issue doc
                      </Button>
                    </div>
                  )}
                />
              </div>

              {/* In-clinic column */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b-2 border-amber-100">
                  <div className="w-10 h-10 rounded-2xl bg-[#fbbf24] flex items-center justify-center shadow-sm">
                    <Building2 className="h-5 w-5 text-[#1a365d]" />
                  </div>
                  <div>
                    <h2 className="font-black text-[#1a365d] text-lg leading-tight">In-Clinic Appointments</h2>
                    <p className="text-xs text-slate-400">In-Patient · physical consultations</p>
                  </div>
                  <Badge className="ml-auto bg-[#fbbf24] text-[#1a365d] border-0 font-bold px-3">{totalInClinic}</Badge>
                </div>

                <GroupSection
                  title="In-Patient — checked in"
                  icon={UserCheck}
                  items={inPatient}
                  accent="purple"
                  emptyText="No patients currently checked in"
                  actions={(a) => (
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl" onClick={() => openComplete(a)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete visit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 rounded-xl" onClick={() => cancel(a)}>Cancel</Button>
                    </div>
                  )}
                />

                <GroupSection
                  title="Completed inpatient visits"
                  icon={CheckCircle2}
                  items={inClinicCompleted}
                  accent="emerald"
                  emptyText="No completed in-clinic visits yet"
                  muted
                  actions={(a) => (
                    <div className="flex gap-2 items-center">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">{a.rating ? `${a.rating}★` : "Done"}</Badge>
                      <Button variant="ghost" size="sm" className="text-xs text-[#1a365d] hover:bg-[#1a365d]/5" onClick={() => setDocPatientId(a.patient_id)}>
                        <FileText className="h-3.5 w-3.5 mr-1" /> Issue doc
                      </Button>
                    </div>
                  )}
                />

                {/* Summary card */}
                <Card className="p-5 border-0 shadow-sm rounded-2xl bg-gradient-to-br from-amber-50 to-white">
                  <p className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-wide flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4" /> In-Clinic Summary
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 rounded-xl bg-white border border-purple-100 shadow-sm">
                      <div className="text-2xl font-black text-purple-600">{inPatient.length}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Checked In</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white border border-emerald-100 shadow-sm">
                      <div className="text-2xl font-black text-emerald-600">{inClinicCompleted.length}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Completed</div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ── Availability ── */}
          <TabsContent value="availability" className="space-y-4 mt-6">
            <Card className="p-6 border-0 shadow-sm rounded-2xl bg-white">
              <h3 className="font-bold mb-5 flex items-center gap-2 text-[#1a365d]">
                <div className="w-8 h-8 rounded-xl bg-[#fbbf24] flex items-center justify-center">
                  <Plus className="h-4 w-4 text-[#1a365d]" />
                </div>
                Add Availability Slot
              </h3>
              <div className="grid md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs font-semibold uppercase text-slate-500">Date</Label>
                  <Input type="date" value={slotForm.date} onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })} className="mt-1 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase text-slate-500">Start</Label>
                  <Input type="time" value={slotForm.start_time} onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })} className="mt-1 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase text-slate-500">End</Label>
                  <Input type="time" value={slotForm.end_time} onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })} className="mt-1 rounded-xl" />
                </div>
                <div className="flex items-end">
                  <Button className="w-full bg-[#1a365d] text-white hover:bg-[#1a365d]/90 rounded-xl font-bold" onClick={addSlot}>
                    <Plus className="h-4 w-4 mr-1" /> Add Slot
                  </Button>
                </div>
              </div>
            </Card>

            <div className="space-y-2">
              {slots.length === 0 && (
                <Card className="p-12 text-center border-dashed border-2 border-slate-200 rounded-2xl bg-white">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-7 w-7 text-slate-300" />
                  </div>
                  <p className="font-bold text-slate-500">No availability slots set yet</p>
                  <p className="text-xs text-slate-400 mt-1">Add a slot above so patients can book virtual appointments.</p>
                </Card>
              )}
              {slots.map((s) => (
                <Card key={s.id} className="p-4 flex justify-between items-center border-0 shadow-sm rounded-2xl bg-white hover:shadow-md transition-all">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#1a365d]/10 flex items-center justify-center">
                      <Calendar className="text-[#1a365d] h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-[#1a365d]">{new Date(s.date + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "long", month: "long", day: "numeric" })}</div>
                      <div className="text-sm text-slate-400">{s.start_time} – {s.end_time}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl" onClick={() => store.removeSlot(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Documents ── */}
          <TabsContent value="documents" className="space-y-4 mt-6">
            <Card className="p-6 border-0 shadow-sm rounded-2xl bg-white">
              <h3 className="font-bold mb-1 flex items-center gap-2 text-[#1a365d]">
                <FileText className="h-5 w-5 text-[#fbbf24]" /> Issue Medical Documents
              </h3>
              <p className="text-sm text-slate-400 mb-5">Create sick notes, prescriptions and referral letters. Patients can download them instantly.</p>
              <MedicalDocsPanel nurse={profile} preselectedPatientId={docPatientId || undefined} />
            </Card>
          </TabsContent>

          {/* ── Patients ── */}
          <TabsContent value="patients" className="mt-6">
            <PatientsTab appointments={allApps} onIssueDoc={(pid) => setDocPatientId(pid)} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Accept / Zoom dialog */}
      <Dialog open={editingMode === "zoom" && !!editing} onOpenChange={closeDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#1a365d] flex items-center gap-2">
              <Video className="h-5 w-5 text-[#fbbf24]" /> Accept Virtual Appointment
            </DialogTitle>
            <DialogDescription>{editing?.service_name} — {editing?.patient_name}</DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs font-semibold uppercase text-slate-500">Zoom Meeting Link</Label>
            <Input value={zoomLink} onChange={(e) => setZoomLink(e.target.value)} placeholder="https://zoom.us/j/..." className="mt-1 rounded-xl" />
            <p className="text-xs text-slate-400 mt-1.5">A demo link is pre-filled. Replace with your real Zoom link.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
            <Button className="bg-[#1a365d] text-white rounded-xl font-semibold" onClick={() => editing && accept(editing)}>
              <Video className="h-4 w-4 mr-1.5" /> Confirm & send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete visit dialog */}
      <Dialog open={editingMode === "complete" && !!editing} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#1a365d] flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Complete Visit — {editing?.patient_name}
            </DialogTitle>
            <DialogDescription>
              {editing?.type === "inclinic" ? "In-Patient visit" : "Virtual outpatient"} · Clinical notes will be visible to the patient.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-500">Diagnoses *</Label>
              <Input value={notes.diagnosis} onChange={(e) => setNotes({ ...notes, diagnosis: e.target.value })} placeholder="e.g. Acute pharyngitis" className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-500">Treatment / Notes</Label>
              <Textarea value={notes.notes} onChange={(e) => setNotes({ ...notes, notes: e.target.value })} placeholder="Treatment plan, medication..." className="mt-1 rounded-xl" rows={3} />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-500">Health Education</Label>
              <Textarea value={notes.health_education} onChange={(e) => setNotes({ ...notes, health_education: e.target.value })} placeholder="Hydration, rest, when to seek care..." className="mt-1 rounded-xl" rows={3} />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-500">Follow-Up Plan (optional)</Label>
              <Input type="date" value={notes.follow_up_date} onChange={(e) => setNotes({ ...notes, follow_up_date: e.target.value })} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-500">Medication (optional)</Label>
              <Textarea value={notes.medication} onChange={(e) => setNotes({ ...notes, medication: e.target.value })} placeholder="e.g. Paracetamol 500mg TDS × 5 days..." className="mt-1 rounded-xl" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-semibold" onClick={() => editing && completeWithNotes(editing)}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Complete visit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue doc dialog */}
      <Dialog open={!!docPatientId} onOpenChange={(o) => !o && setDocPatientId(null)}>
        <DialogContent className="max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1a365d]">Issue Medical Document</DialogTitle>
            <DialogDescription>Create and send a document to this patient.</DialogDescription>
          </DialogHeader>
          {docPatientId && <MedicalDocsPanel nurse={profile} preselectedPatientId={docPatientId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── GroupSection component ────────────────────────────────────────────────────

type AccentColor = "amber" | "blue" | "emerald" | "purple" | "slate";

const accentMap: Record<AccentColor, { dot: string; header: string; empty: string }> = {
  amber:   { dot: "bg-amber-400",   header: "text-amber-700 bg-amber-50 border-amber-100",   empty: "text-amber-400" },
  blue:    { dot: "bg-blue-400",    header: "text-blue-700 bg-blue-50 border-blue-100",       empty: "text-blue-400" },
  emerald: { dot: "bg-emerald-400", header: "text-emerald-700 bg-emerald-50 border-emerald-100", empty: "text-emerald-400" },
  purple:  { dot: "bg-purple-500",  header: "text-purple-700 bg-purple-50 border-purple-100", empty: "text-purple-400" },
  slate:   { dot: "bg-slate-300",   header: "text-slate-500 bg-slate-50 border-slate-100",    empty: "text-slate-300" },
};

const GroupSection = ({
  title, items, actions, muted, icon: Icon, accent = "blue", emptyText,
}: {
  title: string;
  items: Appointment[];
  actions: (a: Appointment) => React.ReactNode;
  muted?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  accent?: AccentColor;
  emptyText: string;
}) => {
  const ac = accentMap[accent];

  return (
    <div className="space-y-2">
      {/* Section header */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-wide ${ac.header}`}>
        <div className={`w-2 h-2 rounded-full ${ac.dot}`} />
        <Icon className="h-3.5 w-3.5" />
        <span>{title}</span>
        <Badge className="ml-auto bg-white/50 text-current border-0 font-bold text-[10px] px-2">{items.length}</Badge>
      </div>

      {items.length === 0 && (
        <div className={`text-xs px-4 py-3 rounded-xl bg-white border border-slate-100 ${muted ? "text-slate-300" : "text-slate-400"}`}>
          {emptyText}
        </div>
      )}

      {items.map((a) => {
        const sc = statusConfig[a.status] ?? statusConfig.pending;
        const dateStr = a.date ? new Date(a.date + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "short", month: "short", day: "numeric" }) : "";
        return (
          <Card key={a.id} className={`overflow-hidden border-0 rounded-2xl transition-all ${muted ? "shadow-none bg-slate-50/60" : "shadow-sm bg-white hover:shadow-md"}`}>
            <div className={`h-1 w-full ${ac.dot}`} />
            <div className="p-4">
              <div className="flex flex-wrap items-start gap-3 justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`font-bold text-sm text-[#1a365d] ${muted ? "opacity-70" : ""}`}>{a.patient_name}</span>
                    <Badge variant="outline" className={`${sc.cls} text-[10px] font-semibold px-2 py-0.5`}>{sc.label}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{a.service_name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    {dateStr && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{dateStr}</span>}
                    {a.time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.time}</span>}
                    <span className="font-semibold text-[#1a365d]">R{a.price}</span>
                  </div>
                  {a.medication && (
                    <p className="text-xs text-slate-500 mt-1"><span className="font-semibold">Medication:</span> {a.medication}</p>
                  )}
                  {a.delivery && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      <span className="font-semibold">{a.delivery === "collect" ? "Collection" : "Courier"}:</span>{" "}
                      {a.delivery_date || ""}
                      {a.delivery === "courier" && a.delivery_address ? ` · ${a.delivery_address}` : ""}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {actions(a)}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

// ── PatientsTab component ─────────────────────────────────────────────────────

const PatientsTab = ({ appointments, onIssueDoc }: { appointments: Appointment[]; onIssueDoc: (pid: string) => void }) => {
  const seen = new Map<string, Appointment>();
  appointments.forEach((a) => { if (!seen.has(a.patient_id)) seen.set(a.patient_id, a); });
  const patients = Array.from(seen.values());

  return (
    <div className="space-y-3">
      {patients.length === 0 && (
        <Card className="p-14 text-center border-dashed border-2 border-slate-200 rounded-2xl bg-white">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Users className="h-7 w-7 text-slate-300" />
          </div>
          <p className="font-bold text-slate-500">No patients yet</p>
          <p className="text-xs text-slate-400 mt-1">Patients who have booked will appear here.</p>
        </Card>
      )}
      {patients.map((a) => {
        const count = appointments.filter((ap) => ap.patient_id === a.patient_id).length;
        return (
          <Card key={a.patient_id} className="p-4 border-0 shadow-sm rounded-2xl bg-white hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-[#1a365d]/10 flex items-center justify-center shrink-0 font-black text-[#1a365d] text-base">
                {a.patient_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[#1a365d] truncate">{a.patient_name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{count} appointment{count !== 1 ? "s" : ""}</div>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl border-[#1a365d]/20 text-[#1a365d] hover:bg-[#1a365d]/5 shrink-0" onClick={() => onIssueDoc(a.patient_id)}>
                <FileText className="h-3.5 w-3.5 mr-1" /> Issue doc
                <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default NursePortal;
