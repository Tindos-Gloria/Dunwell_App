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
import { Calendar, CheckCircle2, Clock, Plus, Trash2, Video, Stethoscope, Building2, FileText } from "lucide-react";
import { MedicalDocsPanel } from "@/components/MedicalDocsPanel";

const NursePortal = () => {
  const { profile, loading } = useCurrentUser();
  const navigate = useNavigate();
  const allApps = useAppointments({ allForNurse: true });
  const slots = useSlots({ nurseId: profile?.id });

  const [slotForm, setSlotForm] = useState({ date: "", start_time: "09:00", end_time: "12:00" });
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [zoomLink, setZoomLink] = useState("");
  const [notes, setNotes] = useState({ diagnosis: "", notes: "", health_education: "", follow_up_date: "" });

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
    } catch (e: any) { toast.error(e.message); }
  };

  const accept = async (a: Appointment) => {
    if (!zoomLink.trim()) { toast.error("Add a Zoom link to confirm"); return; }
    await store.updateAppointment(a.id, { status: "confirmed", zoom_link: zoomLink });
    toast.success("Appointment confirmed and Zoom link sent");
    setEditing(null); setZoomLink("");
  };

  const completeWithNotes = async (a: Appointment) => {
    await store.updateAppointment(a.id, {
      status: "completed",
      diagnosis: notes.diagnosis,
      notes: notes.notes,
      health_education: notes.health_education,
      follow_up_date: notes.follow_up_date || null,
    });
    toast.success("Appointment completed with notes");
    setEditing(null);
    setNotes({ diagnosis: "", notes: "", health_education: "", follow_up_date: "" });
  };

  const cancel = async (a: Appointment) => {
    await store.updateAppointment(a.id, { status: "cancelled" });
    toast.success("Appointment cancelled");
  };

  const virtualPending = allApps.filter((a) => a.type === "virtual" && a.status === "pending" && a.paid);
  const inclinicUpcoming = allApps.filter((a) => a.type === "inclinic" && a.status === "confirmed" && !a.diagnosis);
  const confirmed = allApps.filter((a) => a.status === "confirmed" && a.type === "virtual");
  const completed = allApps.filter((a) => a.status === "completed");
  const awaiting = allApps.filter((a) => a.type === "virtual" && a.status === "pending" && !a.paid);

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      <div className="container py-8 space-y-8 animate-fade-in-up">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Nurse Portal</p>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Stethoscope className="text-primary" /> {profile.name}
            </h1>
          </div>
          <Badge variant="secondary" className="text-sm py-1.5 px-3">{allApps.length} total bookings</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Awaiting payment", value: awaiting.length, color: "text-muted-foreground", bg: "bg-muted" },
            { label: "Pending acceptance", value: virtualPending.length, color: "text-warning", bg: "bg-warning/15" },
            { label: "In-clinic upcoming", value: inclinicUpcoming.length, color: "text-accent-foreground", bg: "bg-accent/20" },
            { label: "Completed", value: completed.length, color: "text-success", bg: "bg-success/10" },
          ].map((s) => (
            <Card key={s.label} className="p-5 border-2 hover:border-primary/30 transition-bounce hover:-translate-y-1 hover:shadow-card">
              <div className={`w-10 h-1.5 rounded-full ${s.bg} mb-3`} />
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="bookings">
          <TabsList>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-4 w-4" /> Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-6 mt-6">
            <Section title="Virtual — pending Zoom link" icon={Video} items={virtualPending}>
              {(a) => (
                <Button variant="hero" size="sm" onClick={() => { setEditing(a); setZoomLink("https://us04web.zoom.us/j/" + Math.floor(Math.random() * 9e9)); }}>
                  <Video /> Accept & send link
                </Button>
              )}
            </Section>

            <Section title="In-clinic — upcoming visits" icon={Building2} items={inclinicUpcoming}>
              {(a) => (
                <>
                  <Button variant="accent" size="sm" onClick={() => { setEditing(a); setNotes({ diagnosis: "", notes: "", health_education: "", follow_up_date: "" }); }}>
                    Add notes & complete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => cancel(a)}>Cancel</Button>
                </>
              )}
            </Section>

            <Section title="Virtual — confirmed" icon={CheckCircle2} items={confirmed}>
              {(a) => (
                <>
                  {a.zoom_link && <Button variant="outline" size="sm" asChild><a href={a.zoom_link} target="_blank" rel="noreferrer"><Video /> Join</a></Button>}
                  <Button variant="accent" size="sm" onClick={() => { setEditing(a); setNotes({ diagnosis: "", notes: "", health_education: "", follow_up_date: "" }); }}>
                    Add notes & complete
                  </Button>
                </>
              )}
            </Section>

            <Section title="Awaiting virtual payment" icon={Clock} items={awaiting}>
              {(a) => (<Button variant="outline" size="sm" onClick={() => cancel(a)}>Cancel</Button>)}
            </Section>

            <Section title="Completed" icon={CheckCircle2} items={completed} muted>
              {(a) => (
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  {a.rating ? `${a.rating}★` : "Done"}
                </Badge>
              )}
            </Section>
          </TabsContent>

          <TabsContent value="availability" className="space-y-4 mt-6">
            <Card className="p-6 border-2">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Plus className="h-5 w-5 text-primary" /> Add available time frame</h3>
              <div className="grid md:grid-cols-4 gap-3">
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={slotForm.date} onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })} />
                </div>
                <div>
                  <Label>Start</Label>
                  <Input type="time" value={slotForm.start_time} onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })} />
                </div>
                <div>
                  <Label>End</Label>
                  <Input type="time" value={slotForm.end_time} onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })} />
                </div>
                <div className="flex items-end">
                  <Button variant="hero" className="w-full" onClick={addSlot}><Plus /> Add slot</Button>
                </div>
              </div>
            </Card>

            <div className="space-y-2">
              {slots.length === 0 && <Card className="p-8 text-center border-dashed border-2 text-muted-foreground">No availability set yet</Card>}
              {slots.map((s) => (
                <Card key={s.id} className="p-4 flex justify-between items-center border-2 animate-fade-in-up">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-primary" />
                    <div>
                      <div className="font-medium">{new Date(s.date).toLocaleDateString("en-ZA", { weekday: "long", month: "long", day: "numeric" })}</div>
                      <div className="text-sm text-muted-foreground">{s.start_time} – {s.end_time}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => store.removeSlot(s.id)}><Trash2 className="text-destructive" /></Button>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4 mt-6">
            <Card className="p-6 border-2 bg-gradient-soft">
              <h3 className="font-bold mb-1 flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Issue medical documents</h3>
              <p className="text-sm text-muted-foreground mb-4">Create sick notes, prescriptions and referral letters. Patients receive them instantly in their portal.</p>
              <MedicalDocsPanel nurse={profile} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Accept (zoom link) */}
      <Dialog open={!!editing && editing.status === "pending"} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept appointment</DialogTitle>
            <DialogDescription>{editing?.service_name} — {editing?.patient_name}</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Zoom meeting link</Label>
            <Input value={zoomLink} onChange={(e) => setZoomLink(e.target.value)} placeholder="https://zoom.us/j/..." />
            <p className="text-xs text-muted-foreground mt-1">A demo link is pre-filled. Replace with your real Zoom link.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="hero" onClick={() => editing && accept(editing)}><Video /> Confirm & send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete with notes */}
      <Dialog open={!!editing && editing.status === "confirmed"} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete appointment</DialogTitle>
            <DialogDescription>Add diagnosis, notes, education and follow-up.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Diagnosis</Label>
              <Input value={notes.diagnosis} onChange={(e) => setNotes({ ...notes, diagnosis: e.target.value })} placeholder="e.g. Acute pharyngitis" />
            </div>
            <div>
              <Label>Nurse notes</Label>
              <Textarea value={notes.notes} onChange={(e) => setNotes({ ...notes, notes: e.target.value })} placeholder="Treatment plan, prescription..." />
            </div>
            <div>
              <Label>Health education</Label>
              <Textarea value={notes.health_education} onChange={(e) => setNotes({ ...notes, health_education: e.target.value })} placeholder="Hydration, rest, when to seek further care..." />
            </div>
            <div>
              <Label>Follow-up date (optional)</Label>
              <Input type="date" value={notes.follow_up_date} onChange={(e) => setNotes({ ...notes, follow_up_date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="hero" onClick={() => editing && completeWithNotes(editing)}><CheckCircle2 /> Complete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Section = ({
  title, items, children, muted, icon: Icon = Clock,
}: { title: string; items: Appointment[]; children: (a: Appointment) => React.ReactNode; muted?: boolean; icon?: React.ComponentType<any> }) => (
  <div>
    <h3 className="font-bold mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" /> {title} <Badge variant="secondary">{items.length}</Badge>
    </h3>
    {items.length === 0 && (
      <Card className="p-6 text-center border-dashed border-2 text-muted-foreground text-sm">Nothing here</Card>
    )}
    <div className="space-y-2">
      {items.map((a) => (
        <Card key={a.id} className={`p-4 border-2 hover:border-primary/30 transition-smooth animate-fade-in-up ${muted ? "opacity-80" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${a.type === "virtual" ? "bg-primary/10 text-primary" : "bg-accent/20 text-accent-foreground"}`}>
                {a.type === "virtual" ? <Video className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
              </div>
              <div>
                <div className="font-bold flex items-center gap-2 flex-wrap">
                  {a.service_name}
                  <span className="text-muted-foreground font-normal text-sm">· R{a.price}</span>
                  <Badge variant="outline" className="text-[10px]">{a.type === "virtual" ? "Virtual" : "In-clinic"}</Badge>
                  {a.payment_method && a.payment_method !== "online" && <Badge variant="outline" className="text-[10px] capitalize">{a.payment_method}</Badge>}
                </div>
                <div className="text-sm text-muted-foreground">
                  {a.patient_name} · {new Date(a.date).toLocaleDateString("en-ZA", { weekday: "short", month: "short", day: "numeric" })} · {a.time}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">{children(a)}</div>
          </div>
          {a.diagnosis && <div className="mt-2 text-xs text-muted-foreground border-t pt-2">Dx: {a.diagnosis}</div>}
        </Card>
      ))}
    </div>
  </div>
);

export default NursePortal;
