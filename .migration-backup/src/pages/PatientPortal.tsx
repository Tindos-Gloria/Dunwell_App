import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { store, useCurrentUser, useAppointments, useSlots, useNurses, useMedicalDocuments, type Appointment, type PaymentMethod, type MedicalDocument } from "@/lib/store";
import { SERVICES, CAMPAIGNS } from "@/lib/data";
import { toast } from "sonner";
import { Calendar, CreditCard, Pill, Star, Video, Truck, MapPin, FileText, Sparkles, Clock, CheckCircle2, Building2, GraduationCap, Banknote, Download, FileHeart } from "lucide-react";
import { generateSickNotePDF, generatePrescriptionPDF, generateReferralLetterPDF } from "@/lib/pdfGenerator";

const statusColors: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  confirmed: "bg-primary/15 text-primary border-primary/30",
  completed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

type BookMode = "virtual" | "inclinic" | null;

const PatientPortal = () => {
  const { profile, loading } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => { if (!loading && !profile) navigate("/auth"); }, [profile, loading, navigate]);

  const apps = useAppointments({ patientId: profile?.id });
  const slots = useSlots();
  const nurses = useNurses();
  const documents = useMedicalDocuments({ patientId: profile?.id });

  const [mode, setMode] = useState<BookMode>(null);

  // Virtual
  const [serviceId, setServiceId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [time, setTime] = useState("");
  const [vPayMethod, setVPayMethod] = useState<"card" | "eft">("card");

  // In-clinic
  const [icService, setIcService] = useState("");
  const [icDate, setIcDate] = useState("");
  const [icTime, setIcTime] = useState("");
  const [icNurse, setIcNurse] = useState("");
  const [icPayment, setIcPayment] = useState<PaymentMethod>("cash");
  const [icStudent, setIcStudent] = useState(profile?.is_student ?? false);
  const [ma, setMa] = useState({ name: "", number: "", option: "", mainMember: "", mainMemberId: "" });

  const [payOpen, setPayOpen] = useState<Appointment | null>(null);
  const [payTab, setPayTab] = useState<"card" | "eft">("card");
  const [detailOpen, setDetailOpen] = useState<Appointment | null>(null);
  const [rateOpen, setRateOpen] = useState<Appointment | null>(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");

  const icServiceData = useMemo(() => SERVICES.find((s) => s.id === icService), [icService]);
  const STUDENT_PRICE = 50;
  const icPrice = useMemo(() => {
    if (!icServiceData) return 0;
    if (icStudent && icServiceData.category === "Clinical") return STUDENT_PRICE;
    return icServiceData.price;
  }, [icServiceData, icStudent]);

  if (!profile) return null;
  const fullName = `${profile.name}${profile.surname ? " " + profile.surname : ""}`;

  const submitVirtual = async () => {
    const service = SERVICES.find((s) => s.id === serviceId);
    const slot = slots.find((s) => s.id === slotId);
    if (!service || !slot || !time) { toast.error("Please select a service, slot and time"); return; }
    try {
      const ap = await store.createAppointment({
        patient_id: profile.id,
        patient_name: fullName,
        service_id: service.id,
        service_name: service.name,
        price: service.price,
        date: slot.date,
        time,
        type: "virtual",
        nurse_id: slot.nurse_id,
        nurse_name: slot.nurse_name,
        payment_method: "online",
      });
      setMode(null); setServiceId(""); setSlotId(""); setTime("");
      setPayTab("card");
      setPayOpen(ap);
    } catch (e: any) { toast.error(e.message); }
  };

  const submitInClinic = async () => {
    if (!icServiceData || !icDate || !icTime || !icNurse) { toast.error("Please complete all fields"); return; }
    if (icPayment === "medical-aid" && (!ma.name || !ma.number || !ma.option || !ma.mainMember || !ma.mainMemberId)) {
      toast.error("Please fill in all medical aid fields"); return;
    }
    const nurse = nurses.find((n) => n.id === icNurse);
    try {
      await store.createAppointment({
        patient_id: profile.id,
        patient_name: fullName,
        service_id: icServiceData.id,
        service_name: icServiceData.name,
        price: icPrice,
        date: icDate,
        time: icTime,
        type: "inclinic",
        nurse_id: nurse?.id ?? null,
        nurse_name: nurse?.name ?? null,
        payment_method: icPayment,
        is_student: icStudent,
        medical_aid: icPayment === "medical-aid" ? ma as any : null,
        status: "confirmed", // in-clinic is auto-confirmed (no nurse acceptance)
      });
      toast.success("✅ In-clinic appointment booked! See you at reception.");
      setMode(null); setIcService(""); setIcDate(""); setIcTime(""); setIcNurse(""); setIcPayment("cash");
      setMa({ name: "", number: "", option: "", mainMember: "", mainMemberId: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  const pay = async () => {
    if (!payOpen) return;
    try {
      await store.updateAppointment(payOpen.id, { paid: true, payment_method: payTab === "eft" ? "eft" : "online" });
      toast.success(payTab === "eft" ? "EFT payment received! Awaiting nurse confirmation." : "Payment received! Awaiting nurse confirmation.");
      setPayOpen(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const confirmReceived = async (a: Appointment) => {
    await store.updateAppointment(a.id, { medication_received: true });
    toast.success("Marked as received");
  };

  const submitRating = async () => {
    if (!rateOpen) return;
    await store.updateAppointment(rateOpen.id, { rating, feedback });
    toast.success("Thank you for your feedback!");
    setRateOpen(null); setRating(5); setFeedback("");
  };

  const downloadDoc = (d: MedicalDocument) => {
    const patientInfo = { name: profile.name, surname: profile.surname || "", dob: profile.dob || "", email: profile.email || "" };
    const [nFirst, ...nRest] = (d.nurse_name || "").split(" ");
    const nurseInfo = { name: nFirst || "Nurse", surname: nRest.join(" "), sancNumber: "DUNWELL-NURSE" };
    let pdf, fname: string;
    if (d.type === "sick_note") { pdf = generateSickNotePDF(patientInfo, nurseInfo, d.data); fname = `SickNote_${d.patient_name}.pdf`; }
    else if (d.type === "prescription") { pdf = generatePrescriptionPDF(patientInfo, nurseInfo, d.data?.text ?? ""); fname = `Prescription_${d.patient_name}.pdf`; }
    else { pdf = generateReferralLetterPDF(patientInfo, nurseInfo, d.data?.notes ?? ""); fname = `ReferralLetter_${d.patient_name}.pdf`; }
    pdf.save(fname);
  };

  const upcoming = apps.filter((a) => a.status === "pending" || a.status === "confirmed");

  return (
    <div className="min-h-screen bg-gradient-soft">
      <Header />
      <div className="container py-8 space-y-8 animate-fade-in-up">
        <Card className="p-6 md:p-8 border-2 bg-gradient-card overflow-hidden relative">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary/10 blur-3xl animate-pulse-glow" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Welcome back</p>
              <h1 className="text-3xl md:text-4xl font-extrabold">Hi {profile.name.split(" ")[0]} 👋</h1>
              <p className="text-sm text-muted-foreground mt-1">Choose how you'd like to be seen today.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="hero" size="lg" onClick={() => setMode("virtual")} className="hover:scale-105 transition-bounce">
                <Video /> Virtual booking
              </Button>
              <Button variant="accent" size="lg" onClick={() => setMode("inclinic")} className="hover:scale-105 transition-bounce">
                <Building2 /> In-clinic booking
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Upcoming", value: upcoming.length, icon: Clock, color: "text-primary", bg: "bg-primary/10" },
            { label: "Completed", value: apps.filter((a) => a.status === "completed").length, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
            { label: "Pending payment", value: apps.filter((a) => !a.paid && a.type === "virtual" && a.status !== "cancelled").length, icon: CreditCard, color: "text-warning", bg: "bg-warning/10" },
            { label: "Total visits", value: apps.length, icon: FileText, color: "text-accent-foreground", bg: "bg-accent/15" },
          ].map((s) => (
            <Card key={s.label} className="p-5 border-2 hover:border-primary/30 transition-bounce hover:-translate-y-1 hover:shadow-card">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
                <s.icon className={s.color} />
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="appointments">
          <TabsList>
            <TabsTrigger value="appointments">My Appointments</TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-4 w-4" />Documents{documents.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{documents.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="space-y-3 mt-6">
            {apps.length === 0 && (
              <Card className="p-12 text-center border-dashed border-2">
                <Calendar className="mx-auto mb-3 text-muted-foreground h-10 w-10" />
                <p className="font-semibold">No appointments yet</p>
                <p className="text-sm text-muted-foreground mb-4">Book your first appointment to get started.</p>
                <div className="flex justify-center gap-2">
                  <Button variant="hero" onClick={() => setMode("virtual")}><Video /> Virtual</Button>
                  <Button variant="accent" onClick={() => setMode("inclinic")}><Building2 /> In-clinic</Button>
                </div>
              </Card>
            )}

            {apps.map((a) => (
              <Card key={a.id} className="p-5 border-2 hover:border-primary/30 transition-smooth hover:shadow-card animate-fade-in-up">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="flex gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${a.type === "virtual" ? "bg-gradient-primary" : "bg-gradient-accent"}`}>
                      {a.type === "virtual" ? <Video className="text-primary-foreground" /> : <Building2 className="text-accent-foreground" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-lg">{a.service_name}</h3>
                        <Badge variant="outline" className={statusColors[a.status]}>{a.status}</Badge>
                        <Badge variant="outline" className="bg-muted/50">{a.type === "virtual" ? "Virtual" : "In-clinic"}</Badge>
                        {a.type === "virtual" && !a.paid && a.status !== "cancelled" && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Unpaid</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(a.date).toLocaleDateString("en-ZA", { weekday: "short", month: "short", day: "numeric" })} · {a.time} · R{a.price}
                        {a.nurse_name && ` · ${a.nurse_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {a.type === "virtual" && !a.paid && a.status !== "cancelled" && (
                      <Button variant="accent" size="sm" onClick={() => { setPayTab("card"); setPayOpen(a); }}><CreditCard /> Pay R{a.price}</Button>
                    )}
                    {a.zoom_link && a.status === "confirmed" && (
                      <Button variant="hero" size="sm" asChild><a href={a.zoom_link} target="_blank" rel="noreferrer"><Video /> Join Zoom</a></Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setDetailOpen(a)}><FileText /> Details</Button>
                  </div>
                </div>

                {a.status === "completed" && a.delivery == null && (
                  <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm font-medium mb-2">How would you like to receive your medication?</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="soft" onClick={async () => { await store.updateAppointment(a.id, { delivery: "collect" }); toast.success("Set to clinic collection"); }}>
                        <MapPin /> Collect at clinic
                      </Button>
                      <Button size="sm" variant="soft" onClick={async () => { await store.updateAppointment(a.id, { delivery: "courier" }); toast.success("Set to courier"); }}>
                        <Truck /> Courier
                      </Button>
                    </div>
                  </div>
                )}

                {a.delivery && !a.medication_received && (
                  <div className="mt-3 flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20">
                    <div className="text-sm flex items-center gap-2">
                      {a.delivery === "collect" ? <MapPin className="h-4 w-4 text-success" /> : <Truck className="h-4 w-4 text-success" />}
                      <span>Medication: {a.delivery === "collect" ? "Collect at clinic" : "Courier delivery"}</span>
                    </div>
                    <Button size="sm" variant="default" onClick={() => confirmReceived(a)}><Pill /> I received it</Button>
                  </div>
                )}

                {a.medication_received && a.rating == null && (
                  <div className="mt-3 flex items-center justify-between p-3 rounded-lg bg-accent/10 border border-accent/30">
                    <div className="text-sm font-medium">How was your visit?</div>
                    <Button size="sm" variant="accent" onClick={() => setRateOpen(a)}><Star /> Rate appointment</Button>
                  </div>
                )}

                {a.rating != null && (
                  <div className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < a.rating! ? "fill-accent text-accent" : "text-muted"}`} />
                    ))}
                    <span className="ml-2">You rated this visit</span>
                  </div>
                )}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="documents" className="space-y-3 mt-6">
            {documents.length === 0 && (
              <Card className="p-12 text-center border-dashed border-2">
                <FileText className="mx-auto mb-3 text-muted-foreground h-10 w-10" />
                <p className="font-semibold">No medical documents yet</p>
                <p className="text-sm text-muted-foreground">Sick notes, prescriptions and referral letters from your nurse will appear here.</p>
              </Card>
            )}
            {documents.map((d) => (
              <Card key={d.id} className="p-5 border-2 hover:border-primary/30 transition-smooth hover:shadow-card animate-fade-in-up">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      d.type === "sick_note" ? "bg-gradient-primary" :
                      d.type === "prescription" ? "bg-gradient-accent" : "bg-gradient-to-br from-success to-primary"
                    }`}>
                      {d.type === "sick_note" && <FileText className="text-primary-foreground" />}
                      {d.type === "prescription" && <Pill className="text-primary-foreground" />}
                      {d.type === "referral" && <FileHeart className="text-primary-foreground" />}
                    </div>
                    <div>
                      <h3 className="font-bold">
                        {d.type === "sick_note" ? "Sick Note" : d.type === "prescription" ? "Prescription" : "Referral Letter"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Issued by {d.nurse_name} · {new Date(d.created_at).toLocaleDateString("en-ZA", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <Button variant="hero" size="sm" onClick={() => downloadDoc(d)}><Download /> Download PDF</Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="catalogue" className="space-y-6 mt-6">
            {(["Prevention", "Clinical", "Wellness"] as const).map((cat) => (
              <Card key={cat} className="p-6 border-2">
                <h3 className="font-bold text-xl mb-3">{cat}</h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {SERVICES.filter((s) => s.category === cat).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setIcService(s.id); setServiceId(s.id); setMode("virtual"); }}
                      className="flex justify-between items-center p-3 rounded-lg hover:bg-primary/5 border transition-smooth text-left hover:scale-[1.02] hover:border-primary/30"
                    >
                      <span className="text-sm">{s.name}</span>
                      <span className="font-bold text-primary text-sm">R{s.price}</span>
                    </button>
                  ))}
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="campaigns" className="grid md:grid-cols-3 gap-4 mt-6">
            {CAMPAIGNS.map((c) => (
              <Card key={c.id} className="overflow-hidden border-2 hover:-translate-y-1 transition-bounce hover:shadow-card">
                <div className={`h-24 ${c.color === "primary" ? "bg-gradient-primary" : c.color === "accent" ? "bg-gradient-accent" : "bg-gradient-to-br from-success to-primary"} flex items-center justify-center`}>
                  <Sparkles className="text-white/60 h-10 w-10" />
                </div>
                <div className="p-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="font-bold uppercase text-primary">{c.tag}</span>
                    <span className="text-muted-foreground">{c.month}</span>
                  </div>
                  <h4 className="font-bold mb-2">{c.title}</h4>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Virtual Book dialog */}
      <Dialog open={mode === "virtual"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Video className="text-primary" /> Book a virtual appointment</DialogTitle>
            <DialogDescription>Pay online, get a Zoom link once your nurse accepts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Service</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger><SelectValue placeholder="Choose a service" /></SelectTrigger>
                <SelectContent>
                  {SERVICES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — R{s.price}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Available slot</Label>
              <Select value={slotId} onValueChange={setSlotId}>
                <SelectTrigger><SelectValue placeholder="Choose a slot" /></SelectTrigger>
                <SelectContent>
                  {slots.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No slots available yet</div>}
                  {slots.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {new Date(s.date).toLocaleDateString("en-ZA", { weekday: "short", month: "short", day: "numeric" })} · {s.start_time}–{s.end_time} · {s.nurse_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {slotId && (
              <div>
                <Label>Time</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
            <Button variant="hero" onClick={submitVirtual}>Continue to payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* In-clinic Book */}
      <Dialog open={mode === "inclinic"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Building2 className="text-accent-foreground" /> Book in-clinic appointment</DialogTitle>
            <DialogDescription>Visit us at 38 De Beer Street, Braamfontein.</DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label>Service *</Label>
                <Select value={icService} onValueChange={setIcService}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Choose a service" /></SelectTrigger>
                  <SelectContent>
                    {SERVICES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} — R{s.price}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Select available nurse *</Label>
                <Select value={icNurse} onValueChange={setIcNurse}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select nurse/doctor" /></SelectTrigger>
                  <SelectContent>
                    {nurses.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No nurses available</div>}
                    {nurses.map((n) => (
                      <SelectItem key={n.id} value={n.id}>{n.name}{n.surname ? ` ${n.surname}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date *</Label>
                  <Input type="date" className="h-11" value={icDate} onChange={(e) => setIcDate(e.target.value)} />
                </div>
                <div>
                  <Label>Time *</Label>
                  <Input type="time" className="h-11" value={icTime} onChange={(e) => setIcTime(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/30">
                <input type="checkbox" id="student" checked={icStudent} onChange={(e) => setIcStudent(e.target.checked)} className="h-4 w-4" />
                <Label htmlFor="student" className="cursor-pointer flex items-center gap-2 text-sm">
                  <GraduationCap className="h-4 w-4" /> Wits / University Student (R50 on clinical services)
                </Label>
              </div>

              <div>
                <Label>Payment Method *</Label>
                <Select value={icPayment} onValueChange={(v) => setIcPayment(v as PaymentMethod)}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash (at reception)</SelectItem>
                    <SelectItem value="card">Card Payment</SelectItem>
                    <SelectItem value="medical-aid">Medical Aid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {icPayment === "medical-aid" && (
                <div className="space-y-2 p-3 rounded-lg bg-muted/30 border">
                  <Input placeholder="Medical Aid Name *" value={ma.name} onChange={(e) => setMa({ ...ma, name: e.target.value })} />
                  <Input placeholder="Medical Aid Number *" value={ma.number} onChange={(e) => setMa({ ...ma, number: e.target.value })} />
                  <Input placeholder="Medical Aid Option *" value={ma.option} onChange={(e) => setMa({ ...ma, option: e.target.value })} />
                  <Input placeholder="Main Member Name *" value={ma.mainMember} onChange={(e) => setMa({ ...ma, mainMember: e.target.value })} />
                  <Input placeholder="Main Member ID Number *" value={ma.mainMemberId} onChange={(e) => setMa({ ...ma, mainMemberId: e.target.value })} />
                </div>
              )}
            </div>

            <Card className="p-5 h-fit bg-gradient-soft border-2 border-primary/20 sticky top-0">
              <h4 className="font-bold mb-3">Booking Summary</h4>
              <div className="space-y-2 text-sm">
                <Row label="Patient" value={fullName} />
                <Row label="Nurse/Doctor" value={nurses.find((n) => n.id === icNurse)?.name ?? "-"} />
                <Row label="Service" value={icServiceData?.name ?? "-"} />
                <Row label="Date" value={icDate || "-"} />
                <Row label="Time" value={icTime || "-"} />
                <Row label="Student" value={icStudent ? "Yes" : "No"} />
                <Row label="Payment" value={icPayment.replace("-", " ")} />
                <div className="pt-3 border-t flex justify-between items-center">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary">R{icPrice.toFixed(2)}</span>
                </div>
                {icStudent && icServiceData?.category === "Clinical" && (
                  <p className="text-xs text-success">🎓 Student discount applied!</p>
                )}
                <p className="text-xs text-muted-foreground pt-2">In-clinic visits are auto-confirmed — just walk in at your time.</p>
              </div>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
            <Button variant="accent" onClick={submitInClinic}>Confirm booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay dialog (Virtual) — Card or EFT */}
      <Dialog open={!!payOpen} onOpenChange={() => setPayOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay for your appointment</DialogTitle>
            <DialogDescription>Demo payment — no real money is taken.</DialogDescription>
          </DialogHeader>
          {payOpen && (
            <Card className="p-4 bg-gradient-soft border-2 border-primary/20">
              <div className="flex justify-between mb-2"><span className="text-muted-foreground text-sm">Service</span><span className="font-medium">{payOpen.service_name}</span></div>
              <div className="flex justify-between mb-2"><span className="text-muted-foreground text-sm">Date</span><span className="font-medium">{payOpen.date} {payOpen.time}</span></div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t mt-2"><span>Total</span><span className="text-primary">R{payOpen.price}</span></div>
            </Card>
          )}

          <Tabs value={payTab} onValueChange={(v) => setPayTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="card" className="gap-2"><CreditCard className="h-4 w-4" /> Card</TabsTrigger>
              <TabsTrigger value="eft" className="gap-2"><Banknote className="h-4 w-4" /> Instant EFT</TabsTrigger>
            </TabsList>
            <TabsContent value="card" className="mt-4">
              <Card className="p-4 border-dashed space-y-2">
                <Label className="text-xs">Card number (demo)</Label>
                <Input placeholder="4242 4242 4242 4242" />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="MM/YY" />
                  <Input placeholder="CVC" />
                </div>
                <p className="text-xs text-muted-foreground">Powered by PayFast (demo)</p>
              </Card>
            </TabsContent>
            <TabsContent value="eft" className="mt-4">
              <Card className="p-4 border-dashed space-y-2">
                <p className="text-sm font-medium">Instant EFT</p>
                <p className="text-xs text-muted-foreground">You'll be redirected to your bank to authorise an EFT to:</p>
                <div className="text-sm bg-muted/30 p-3 rounded-lg space-y-1">
                  <div><span className="text-muted-foreground">Bank:</span> <span className="font-medium">FNB</span></div>
                  <div><span className="text-muted-foreground">Account:</span> <span className="font-medium">62XXXXXXXXX</span></div>
                  <div><span className="text-muted-foreground">Reference:</span> <span className="font-medium">DUNWELL-{payOpen?.id.slice(0, 6).toUpperCase()}</span></div>
                </div>
                <p className="text-xs text-muted-foreground">Powered by Ozow (demo)</p>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayOpen(null)}>Pay later</Button>
            <Button variant="accent" onClick={pay}>{payTab === "eft" ? <><Banknote /> Pay via EFT</> : <><CreditCard /> Pay now</>}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailOpen?.service_name}</DialogTitle>
            <DialogDescription>{detailOpen?.date} · {detailOpen?.time}</DialogDescription>
          </DialogHeader>
          {detailOpen && (
            <div className="space-y-3 text-sm">
              <Row label="Type" value={detailOpen.type === "virtual" ? "Virtual (Zoom)" : "In-clinic"} />
              <Row label="Status" value={<Badge variant="outline" className={statusColors[detailOpen.status]}>{detailOpen.status}</Badge>} />
              <Row label="Payment" value={`${detailOpen.payment_method} · ${detailOpen.paid ? "Paid" : "Unpaid"}`} />
              {detailOpen.nurse_name && <Row label="Nurse" value={detailOpen.nurse_name} />}
              {detailOpen.zoom_link && <Row label="Zoom link" value={<a className="text-primary underline" href={detailOpen.zoom_link} target="_blank" rel="noreferrer">Join meeting</a>} />}
              {detailOpen.diagnosis && <Row label="Diagnosis" value={detailOpen.diagnosis} />}
              {detailOpen.notes && <Row label="Nurse notes" value={detailOpen.notes} />}
              {detailOpen.health_education && <Row label="Health education" value={detailOpen.health_education} />}
              {detailOpen.follow_up_date && <Row label="Follow-up date" value={new Date(detailOpen.follow_up_date).toLocaleDateString("en-ZA")} />}
              {detailOpen.delivery && <Row label="Medication" value={detailOpen.delivery === "collect" ? "Collect at clinic" : "Courier"} />}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rate dialog */}
      <Dialog open={!!rateOpen} onOpenChange={() => setRateOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate your appointment</DialogTitle>
            <DialogDescription>Your feedback helps us serve you better.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-1 my-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} onClick={() => setRating(i)}>
                <Star className={`h-10 w-10 transition-bounce ${i <= rating ? "fill-accent text-accent scale-110" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <Textarea placeholder="Tell us about your experience..." value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={500} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRateOpen(null)}>Skip</Button>
            <Button variant="hero" onClick={submitRating}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between gap-4 py-2 border-b last:border-0">
    <span className="text-muted-foreground capitalize">{label}</span>
    <span className="text-right font-medium capitalize">{value}</span>
  </div>
);

export default PatientPortal;
