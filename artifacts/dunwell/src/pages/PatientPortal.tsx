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
import {
  store, useCurrentUser, useAppointments, useSlots, useNurses,
  useMedicalDocuments, useCatalogue,
  type Appointment, type PaymentMethod, type MedicalDocument,
} from "@/lib/store";
import { SERVICES, CAMPAIGNS } from "@/lib/data";
import { toast } from "sonner";
import {
  Calendar, CreditCard, Pill, Star, Video, Truck, MapPin, FileText, Sparkles,
  Clock, CheckCircle2, Building2, Download, FileHeart, Heart, Stethoscope, Activity,
  ChevronRight, AlertCircle, XCircle, UserCheck, ClipboardList, RefreshCw,
} from "lucide-react";
import { generateSickNotePDF, generatePrescriptionPDF, generateReferralLetterPDF } from "@/lib/pdfGenerator";

type BookMode = "virtual" | "inclinic" | null;

const statusConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  pending:    { label: "Pending",     icon: Clock,        cls: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed:  { label: "Confirmed",   icon: CheckCircle2, cls: "bg-blue-50 text-blue-700 border-blue-200" },
  completed:  { label: "Completed",   icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  OutPatient: { label: "OutPatient",  icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled:  { label: "Cancelled",   icon: XCircle,      cls: "bg-slate-100 text-slate-500 border-slate-200" },
  InPatient:  { label: "In-Patient",  icon: UserCheck,    cls: "bg-purple-50 text-purple-700 border-purple-200" },
};

const PatientPortal = () => {
  const { profile, loading } = useCurrentUser();
  const navigate = useNavigate();

  const apps = useAppointments({ patientId: profile?.id });
  const slots = useSlots();
  const nurses = useNurses();
  const documents = useMedicalDocuments({ patientId: profile?.id });
  const catalogue = useCatalogue();

  const [mode, setMode] = useState<BookMode>(null);
  const [apptTab, setApptTab] = useState<"upcoming" | "past">("upcoming");
  // Virtual booking
  const [serviceId, setServiceId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [vTime, setVTime] = useState("");
  // In-clinic booking
  const [icService, setIcService] = useState("");
  const [icNurse, setIcNurse] = useState("");
  const [icDate, setIcDate] = useState("");
  const [icTime, setIcTime] = useState("09:00");
  const [icPayment, setIcPayment] = useState<PaymentMethod>("cash");
  const [icStudent, setIcStudent] = useState(false);
  const [ma, setMa] = useState({ name: "", number: "", option: "", mainMember: "", mainMemberId: "" });
  // Dialogs
  const [payOpen, setPayOpen] = useState<Appointment | null>(null);
  const [payTab, setPayTab] = useState<"card" | "eft">("card");
  const [detailOpen, setDetailOpen] = useState<Appointment | null>(null);
  const [rateOpen, setRateOpen] = useState<Appointment | null>(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  // Modify booking
  const [modifyOpen, setModifyOpen] = useState<Appointment | null>(null);
  const [modDate, setModDate] = useState("");
  const [modTime, setModTime] = useState("09:00");
  // Delivery dialog
  const [deliveryOpen, setDeliveryOpen] = useState<Appointment | null>(null);
  const [deliveryType, setDeliveryType] = useState<"collect" | "courier" | null>(null);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  // Follow-up booking
  const [followUpOpen, setFollowUpOpen] = useState<Appointment | null>(null);
  const [followUpTime, setFollowUpTime] = useState("09:00");

  useEffect(() => {
    if (!loading && !profile) navigate("/auth");
  }, [profile, loading, navigate]);

  const displayServices = useMemo(() => {
    if (catalogue.length > 0) {
      return catalogue.map((c) => ({ id: c.id, name: c.name, price: c.price, discount: c.discount, category: c.type, description: "" }));
    }
    return SERVICES.map((s) => ({ ...s, discount: 0, category: s.category as string }));
  }, [catalogue]);

  const selectedSlot = useMemo(() => slots.find((s) => s.id === slotId), [slots, slotId]);
  useEffect(() => { if (selectedSlot) setVTime(selectedSlot.start_time); }, [selectedSlot]);

  const icServiceData = useMemo(() => displayServices.find((s) => s.id === icService), [displayServices, icService]);
  const STUDENT_PRICE = 50;
  const icPrice = useMemo(() => {
    if (!icServiceData) return 0;
    if (icStudent) {
      const cat = icServiceData.category?.toLowerCase() || "";
      if (cat.includes("clinical") || cat === "clinical") return STUDENT_PRICE;
    }
    return icServiceData.price;
  }, [icServiceData, icStudent]);

  if (!profile) return null;

  const fullName = `${profile.name}${profile.surname ? " " + profile.surname : ""}`;
  const today = new Date().toISOString().slice(0, 10);

  const submitVirtual = async () => {
    const service = displayServices.find((s) => s.id === serviceId);
    const slot = slots.find((s) => s.id === slotId);
    if (!service || !slot || !vTime) { toast.error("Please select a service, slot and time"); return; }
    try {
      const ap = await store.createAppointment({
        patient_id: profile.id, patient_name: fullName,
        service_id: service.id, service_name: service.name, price: service.price,
        date: slot.date, time: vTime, start_time: `${slot.date}T${vTime}:00`,
        type: "virtual", nurse_id: slot.nurse_id, nurse_name: slot.nurse_name, payment_method: "online",
      });
      setMode(null); setServiceId(""); setSlotId(""); setVTime("");
      setPayTab("card"); setPayOpen(ap);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "An error occurred"); }
  };

  const submitInClinic = async () => {
    if (!icServiceData) { toast.error("Please select a service"); return; }
    if (!icNurse) { toast.error("Please select a nurse"); return; }
    if (!icDate) { toast.error("Please select a date"); return; }
    if (!icTime) { toast.error("Please select a time"); return; }
    if (icPayment === "medical-aid" && (!ma.name || !ma.number || !ma.option || !ma.mainMember || !ma.mainMemberId)) {
      toast.error("Please fill in all medical aid fields"); return;
    }
    const nurse = nurses.find((n) => n.id === icNurse);
    const startTime = `${icDate}T${icTime}:00`;
    try {
      await store.createAppointment({
        patient_id: profile.id, patient_name: fullName,
        service_id: icServiceData.id, service_name: icServiceData.name, price: icPrice,
        date: icDate, time: icTime, start_time: startTime, end_time: null,
        type: "inclinic", nurse_id: nurse?.id ?? null,
        nurse_name: nurse ? `${nurse.name}${nurse.surname ? " " + nurse.surname : ""}` : null,
        payment_method: icPayment, is_student: icStudent,
        medical_aid: icPayment === "medical-aid" ? ma : null, status: "InPatient",
      });
      toast.success(`Booked for ${new Date(icDate + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "long", month: "long", day: "numeric" })} at ${icTime}. See you at reception!`);
      setMode(null); setIcService(""); setIcNurse(""); setIcDate(""); setIcTime("09:00"); setIcPayment("cash"); setIcStudent(false);
      setMa({ name: "", number: "", option: "", mainMember: "", mainMemberId: "" });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "An error occurred"); }
  };

  const pay = async () => {
    if (!payOpen) return;
    try {
      await store.updateAppointment(payOpen.id, { paid: true, payment_method: payTab === "eft" ? "eft" : "online" });
      toast.success(payTab === "eft" ? "EFT noted! Awaiting nurse confirmation." : "Payment received! Awaiting nurse confirmation.");
      setPayOpen(null);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "An error occurred"); }
  };

  const confirmReceived = async (a: Appointment) => {
    await store.updateAppointment(a.id, { medication_received: true });
    toast.success("Marked as received");
  };

  const cancelAppointment = async (a: Appointment) => {
    if (!confirm("Cancel this appointment? This cannot be undone.")) return;
    try {
      await store.deleteAppointment(a.id);
      toast.success("Appointment cancelled");
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to cancel"); }
  };

  const submitModify = async () => {
    if (!modifyOpen) return;
    if (!modDate || !modTime) { toast.error("Select a date and time"); return; }
    try {
      await store.updateAppointment(modifyOpen.id, { date: modDate, time: modTime });
      toast.success("Appointment rescheduled");
      setModifyOpen(null);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to modify"); }
  };

  const submitDelivery = async () => {
    if (!deliveryOpen || !deliveryType) return;
    if (!deliveryDate) { toast.error("Please select a date"); return; }
    if (deliveryType === "courier" && !deliveryAddress.trim()) { toast.error("Please enter delivery address"); return; }
    try {
      await store.updateAppointment(deliveryOpen.id, {
        delivery: deliveryType,
        delivery_date: deliveryDate,
        delivery_address: deliveryType === "courier" ? deliveryAddress : null,
      });
      toast.success(deliveryType === "collect" ? "Collection date set" : "Courier delivery arranged");
      setDeliveryOpen(null); setDeliveryType(null); setDeliveryDate(""); setDeliveryAddress("");
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to save delivery"); }
  };

  const submitRating = async () => {
    if (!rateOpen) return;
    await store.updateAppointment(rateOpen.id, { rating, feedback });
    toast.success("Thank you for your feedback!");
    setRateOpen(null); setRating(5); setFeedback("");
  };

  const bookFollowUp = async () => {
    if (!followUpOpen || !followUpTime) { toast.error("Please select a time"); return; }
    if (!followUpOpen.follow_up_date) { toast.error("No follow-up date set"); return; }
    try {
      const consultPrice = displayServices.find((s) =>
        s.name.toLowerCase().includes("consult")
      )?.price ?? 250;
      await store.createAppointment({
        patient_id: profile!.id,
        patient_name: fullName,
        service_id: "followup-consultation",
        service_name: "Follow-Up Consultation",
        price: consultPrice,
        date: followUpOpen.follow_up_date,
        time: followUpTime,
        start_time: `${followUpOpen.follow_up_date}T${followUpTime}:00`,
        type: followUpOpen.type,
        nurse_id: followUpOpen.nurse_id ?? null,
        nurse_name: followUpOpen.nurse_name ?? null,
        payment_method: followUpOpen.type === "virtual" ? "online" : "cash",
        is_student: followUpOpen.is_student ?? false,
        status: followUpOpen.type === "inclinic" ? "InPatient" : "pending",
      });
      toast.success(`Follow-up booked for ${new Date(followUpOpen.follow_up_date + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "long", month: "long", day: "numeric" })} at ${followUpTime}`);
      setFollowUpOpen(null);
      setFollowUpTime("09:00");
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed to book follow-up"); }
  };

  const downloadDoc = async (d: MedicalDocument) => {
    const patientInfo = { name: profile.name, surname: profile.surname || "", dob: profile.dob || "", email: profile.email || "" };
    const [nFirst, ...nRest] = (d.nurse_name || "").split(" ");
    const storedSig = (d.data as { signatureDataUrl?: string | null }).signatureDataUrl ?? null;
    const nurseInfo = { name: nFirst || "Nurse", surname: nRest.join(" "), sancNumber: "DUNWELL", signatureDataUrl: storedSig };
    let pdf, fname: string;
    if (d.type === "sick_note") { pdf = await generateSickNotePDF(patientInfo, nurseInfo, d.data as unknown as Parameters<typeof generateSickNotePDF>[2]); fname = `SickNote_${d.patient_name}.pdf`; }
    else if (d.type === "prescription") { pdf = await generatePrescriptionPDF(patientInfo, nurseInfo, String((d.data as { text?: unknown }).text ?? "")); fname = `Prescription_${d.patient_name}.pdf`; }
    else { pdf = await generateReferralLetterPDF(patientInfo, nurseInfo, String((d.data as { notes?: unknown }).notes ?? "")); fname = `ReferralLetter_${d.patient_name}.pdf`; }
    pdf.save(fname);
  };

  const upcoming = apps.filter((a) => ["pending", "confirmed", "InPatient"].includes(a.status));
  const past = apps.filter((a) => ["completed", "OutPatient", "cancelled"].includes(a.status));
  const shownApps = apptTab === "upcoming" ? upcoming : past;

  const statCards = [
    { label: "Upcoming", value: upcoming.length, icon: Clock, color: "text-[#1a365d]", bg: "bg-[#1a365d]/10" },
    { label: "Completed", value: past.filter((a) => ["completed","OutPatient"].includes(a.status)).length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Documents", value: documents.length, icon: FileText, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total visits", value: apps.length, icon: Activity, color: "text-[#b45309]", bg: "bg-amber-50" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #fffbeb 100%)" }}>
      <Header />
      <div className="container py-8 space-y-6 animate-fade-in-up">

        {/* Hero Banner */}
        <div className="rounded-3xl overflow-hidden shadow-xl relative" style={{ background: "linear-gradient(135deg, #1a365d 0%, #2a5298 60%, #1a365d 100%)" }}>
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle, #fbbf24, transparent)", transform: "translate(30%, -30%)" }} />
          <div className="p-8 relative">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-1">Patient Portal</p>
                <h1 className="text-3xl font-black text-white">Hi, {profile.name.split(" ")[0]} 👋</h1>
                <p className="text-blue-200 text-sm mt-1">How would you like to be seen today?</p>
              </div>
              <img src="/dunwell-logo.jpeg" alt="Dunwell" className="h-16 w-16 rounded-2xl object-contain bg-white/10 p-1 hidden sm:block shadow-lg" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                className="bg-[#fbbf24] text-[#1a365d] hover:bg-[#f59e0b] font-black rounded-2xl shadow-lg shadow-[#fbbf24]/30 hover:scale-105 transition-transform px-6"
                size="lg"
                onClick={() => setMode("virtual")}
              >
                <Video className="mr-2 h-5 w-5" /> Book Virtual
              </Button>
              <Button
                className="bg-white/15 text-white hover:bg-white/25 border-2 border-white/30 font-bold rounded-2xl hover:scale-105 transition-transform px-6"
                size="lg"
                onClick={() => setMode("inclinic")}
              >
                <Building2 className="mr-2 h-5 w-5" /> Book In-Clinic
              </Button>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.label} className="p-5 border-0 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-default">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon className={`${s.color} h-4.5 w-4.5`} />
              </div>
              <div className="text-2xl font-black text-[#1a365d]">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5 font-medium">{s.label}</div>
            </Card>
          ))}
        </div>

        {/* Main tabs */}
        <Tabs defaultValue="appointments">
          <TabsList className="bg-white border border-slate-200 shadow-sm rounded-2xl p-1 gap-1 flex-wrap h-auto">
            {[
              { value: "appointments", label: "My Appointments", icon: Calendar },
              { value: "summaries", label: `Visit Summaries${apps.filter(a => ["completed","OutPatient"].includes(a.status) && (a.diagnosis || a.medication)).length > 0 ? ` (${apps.filter(a => ["completed","OutPatient"].includes(a.status) && (a.diagnosis || a.medication)).length})` : ""}`, icon: ClipboardList },
              { value: "documents", label: `Documents${documents.length > 0 ? ` (${documents.length})` : ""}`, icon: FileText },
              { value: "catalogue", label: "Services", icon: Stethoscope },
              { value: "campaigns", label: "Campaigns", icon: Sparkles },
            ].map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="rounded-xl font-semibold data-[state=active]:bg-[#1a365d] data-[state=active]:text-white gap-1.5 text-sm px-4">
                <t.icon className="h-4 w-4" /> {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Appointments Tab ── */}
          <TabsContent value="appointments" className="mt-6 space-y-4">
            {/* Sub-tab: Upcoming / Past */}
            <div className="flex items-center gap-3">
              {(["upcoming", "past"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setApptTab(t)}
                  className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all ${apptTab === t ? "bg-[#1a365d] text-white shadow-md" : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"}`}
                >
                  {t === "upcoming" ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
                </button>
              ))}
            </div>

            {apptTab === "upcoming" && upcoming.length === 0 && (
              <Card className="p-14 text-center border-dashed border-2 border-slate-200 rounded-2xl bg-white">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-slate-300" />
                </div>
                <p className="font-bold text-[#1a365d] text-lg">No upcoming appointments</p>
                <p className="text-sm text-slate-400 mb-5 mt-1">Book your first appointment to get started.</p>
                <div className="flex justify-center gap-2">
                  <Button className="bg-[#1a365d] text-white rounded-xl" onClick={() => setMode("virtual")}><Video className="mr-1.5 h-4 w-4" /> Book Virtual</Button>
                  <Button variant="outline" className="border-[#1a365d]/30 text-[#1a365d] rounded-xl" onClick={() => setMode("inclinic")}><Building2 className="mr-1.5 h-4 w-4" /> In-Clinic</Button>
                </div>
              </Card>
            )}

            {/* ── UPCOMING: full interactive cards ── */}
            {apptTab === "upcoming" && upcoming.map((a) => {
              const sc = statusConfig[a.status] ?? statusConfig.pending;
              const StatusIcon = sc.icon;
              const isVirtual = a.type === "virtual";
              const dateStr = a.date ? new Date(a.date + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "short", month: "short", day: "numeric" }) : "";
              return (
                <Card key={a.id} className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl">
                  <div className={`h-1.5 w-full ${isVirtual ? "bg-gradient-to-r from-[#1a365d] to-blue-400" : "bg-gradient-to-r from-[#fbbf24] to-amber-400"}`} />
                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex gap-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isVirtual ? "bg-[#1a365d]" : "bg-[#fbbf24]"}`}>
                          {isVirtual ? <Video className="text-white h-5 w-5" /> : <Building2 className="text-[#1a365d] h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <h3 className="font-bold text-[#1a365d] text-base leading-tight">{a.service_name}</h3>
                            <Badge variant="outline" className={`${sc.cls} font-semibold text-[10px] px-2 py-0.5 flex items-center gap-1`}>
                              <StatusIcon className="h-2.5 w-2.5" /> {sc.label}
                            </Badge>
                            {isVirtual && !a.paid && a.status !== "cancelled" && (
                              <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[10px] px-2 py-0.5 flex items-center gap-1">
                                <AlertCircle className="h-2.5 w-2.5" /> Unpaid
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-500">
                            {dateStr && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {dateStr}</span>}
                            {a.time && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {a.time}</span>}
                            <span className="font-bold text-[#1a365d]">R{a.price}</span>
                            {a.nurse_name && <span className="text-slate-400">{a.nurse_name}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap items-center shrink-0">
                        {isVirtual && !a.paid && a.status !== "cancelled" && (
                          <Button size="sm" className="bg-[#fbbf24] text-[#1a365d] hover:bg-[#f59e0b] rounded-xl font-bold" onClick={() => { setPayTab("card"); setPayOpen(a); }}>
                            <CreditCard className="h-3.5 w-3.5 mr-1" /> Pay R{a.price}
                          </Button>
                        )}
                        {a.zoom_link && a.status === "confirmed" && (
                          <Button size="sm" className="bg-[#1a365d] text-white hover:bg-[#1a365d]/90 rounded-xl font-semibold" asChild>
                            <a href={a.zoom_link} target="_blank" rel="noreferrer"><Video className="h-3.5 w-3.5 mr-1" /> Join Zoom</a>
                          </Button>
                        )}
                        {["pending", "confirmed"].includes(a.status) && (
                          <Button size="sm" variant="outline" className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => { setModDate(a.date); setModTime(a.time); setModifyOpen(a); }}>
                            Modify
                          </Button>
                        )}
                        {["pending", "confirmed", "InPatient"].includes(a.status) && (
                          <Button size="sm" variant="outline" className="rounded-xl border-red-200 text-red-600 hover:bg-red-50" onClick={() => cancelAppointment(a)}>
                            Cancel
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-slate-600 hover:border-[#1a365d]/20 hover:text-[#1a365d]" onClick={() => setDetailOpen(a)}>
                          Details <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Visit summary — shown before delivery */}
                    {(a.diagnosis || a.health_education || a.follow_up_date) && (
                      <div className={`mt-4 p-4 rounded-xl border space-y-2 ${isVirtual ? "bg-blue-50/60 border-blue-100" : "bg-emerald-50/60 border-emerald-100"}`}>
                        <div className={`text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${isVirtual ? "text-blue-700" : "text-emerald-700"}`}>
                          <Activity className="h-3.5 w-3.5" /> {isVirtual ? "Outpatient Visit Summary" : "Visit Summary"}
                        </div>
                        {a.diagnosis && <p className="text-sm"><span className={`font-semibold ${isVirtual ? "text-blue-700" : "text-emerald-700"}`}>Diagnosis: </span><span className="text-slate-700">{a.diagnosis}</span></p>}
                        {a.health_education && <p className="text-sm"><span className={`font-semibold ${isVirtual ? "text-blue-700" : "text-emerald-700"}`}>Health Education: </span><span className="text-slate-600">{a.health_education}</span></p>}
                        {a.medication && <p className="text-sm"><span className={`font-semibold ${isVirtual ? "text-blue-700" : "text-emerald-700"}`}>Medication: </span><span className="text-slate-600">{a.medication}</span></p>}
                        {a.follow_up_date && <p className="text-sm"><span className={`font-semibold ${isVirtual ? "text-blue-700" : "text-emerald-700"}`}>Follow-up: </span><span className="text-slate-600">{a.follow_up_date}</span></p>}
                      </div>
                    )}

                    {/* Medication delivery */}
                    {["completed","OutPatient"].includes(a.status) && a.delivery == null && !!a.medication && (
                      <div className="mt-4 p-4 rounded-xl bg-[#1a365d]/5 border border-[#1a365d]/10">
                        <p className="text-sm font-semibold text-[#1a365d] mb-2.5">How would you like your medication?</p>
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" variant="outline" className="rounded-xl border-[#1a365d]/30 text-[#1a365d] hover:bg-[#1a365d]/5"
                            onClick={() => { setDeliveryOpen(a); setDeliveryType("collect"); setDeliveryDate(today); setDeliveryAddress(""); }}>
                            <MapPin className="h-3.5 w-3.5 mr-1" /> Collect at clinic
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-xl border-[#1a365d]/30 text-[#1a365d] hover:bg-[#1a365d]/5"
                            onClick={() => { setDeliveryOpen(a); setDeliveryType("courier"); setDeliveryDate(today); setDeliveryAddress(profile.address || ""); }}>
                            <Truck className="h-3.5 w-3.5 mr-1" /> Courier delivery
                          </Button>
                        </div>
                      </div>
                    )}

                    {a.delivery && !a.medication_received && (
                      <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm flex items-center gap-2 text-emerald-700 font-semibold">
                            {a.delivery === "collect" ? <MapPin className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                            {a.delivery === "collect" ? "Clinic Collection" : "Courier Delivery"}
                          </div>
                          <Button size="sm" className="bg-emerald-600 text-white rounded-xl hover:bg-emerald-700" onClick={() => confirmReceived(a)}>
                            <Pill className="h-3.5 w-3.5 mr-1" /> I received it
                          </Button>
                        </div>
                        {a.delivery_date && <p className="text-xs text-emerald-600 flex items-center gap-1"><Calendar className="h-3 w-3" /> {a.delivery === "collect" ? "Collection date" : "Delivery date"}: {a.delivery_date}</p>}
                        {a.delivery === "courier" && a.delivery_address && <p className="text-xs text-emerald-600 flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.delivery_address}</p>}
                      </div>
                    )}

                    {a.medication_received && a.rating == null && (
                      <div className="mt-4 flex items-center justify-between p-4 rounded-xl bg-[#fbbf24]/10 border border-[#fbbf24]/30">
                        <div className="text-sm font-semibold text-[#b45309]">How was your visit?</div>
                        <Button size="sm" className="bg-[#fbbf24] text-[#1a365d] hover:bg-[#f59e0b] rounded-xl font-bold" onClick={() => setRateOpen(a)}>
                          <Star className="h-3.5 w-3.5 mr-1" /> Rate visit
                        </Button>
                      </div>
                    )}

                    {a.rating != null && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3.5 w-3.5 ${i < a.rating! ? "fill-[#fbbf24] text-[#fbbf24]" : "text-slate-200"}`} />
                          ))}
                        </div>
                        <span>{a.feedback || "Rated"}</span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}

            {/* ── PAST: read-only summary cards ── */}
            {apptTab === "past" && past.length === 0 && (
              <Card className="p-14 text-center border-dashed border-2 border-slate-200 rounded-2xl bg-white">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-slate-300" />
                </div>
                <p className="font-bold text-[#1a365d] text-lg">No past appointments</p>
                <p className="text-sm text-slate-400 mt-1">Completed and cancelled appointments will appear here.</p>
              </Card>
            )}

            {apptTab === "past" && past.filter((a) => ["completed","OutPatient"].includes(a.status)).map((a) => {
              const sc = statusConfig[a.status] ?? statusConfig.pending;
              const StatusIcon = sc.icon;
              const isVirtual = a.type === "virtual";
              const dateStr = a.date ? new Date(a.date + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "short", month: "short", day: "numeric" }) : "";
              return (
                <Card key={a.id} className="overflow-hidden border-0 shadow-sm bg-white rounded-2xl opacity-90">
                  <div className={`h-1 w-full ${isVirtual ? "bg-blue-200" : "bg-amber-200"}`} />
                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div className="flex gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isVirtual ? "bg-[#1a365d]/10" : "bg-amber-50"}`}>
                          {isVirtual ? <Video className="text-[#1a365d] h-4 w-4" /> : <Building2 className="text-amber-600 h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-bold text-[#1a365d] text-sm leading-tight">{a.service_name}</h3>
                            <Badge variant="outline" className={`${sc.cls} font-semibold text-[10px] px-2 py-0.5 flex items-center gap-1`}>
                              <StatusIcon className="h-2.5 w-2.5" /> {sc.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                            {dateStr && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {dateStr}</span>}
                            {a.time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.time}</span>}
                            <span className="font-semibold text-[#1a365d]">R{a.price}</span>
                            {a.nurse_name && <span>{a.nurse_name}</span>}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-slate-500 text-xs" onClick={() => setDetailOpen(a)}>
                        Details <ChevronRight className="h-3 w-3 ml-0.5" />
                      </Button>
                    </div>

                    {/* Visit summary — read-only */}
                    {(a.diagnosis || a.health_education || a.medication || a.follow_up_date) && (
                      <div className={`p-4 rounded-xl border space-y-1.5 ${isVirtual ? "bg-blue-50/50 border-blue-100" : "bg-emerald-50/50 border-emerald-100"}`}>
                        <div className={`text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 mb-2 ${isVirtual ? "text-blue-700" : "text-emerald-700"}`}>
                          <ClipboardList className="h-3.5 w-3.5" /> Visit Summary
                        </div>
                        {a.diagnosis && <p className="text-xs"><span className="font-semibold text-slate-700">Diagnosis: </span><span className="text-slate-600">{a.diagnosis}</span></p>}
                        {a.health_education && <p className="text-xs"><span className="font-semibold text-slate-700">Health Education: </span><span className="text-slate-600">{a.health_education}</span></p>}
                        {a.medication && <p className="text-xs"><span className="font-semibold text-slate-700">Medication: </span><span className="text-slate-600">{a.medication}</span></p>}
                        {a.delivery && (
                          <p className="text-xs"><span className="font-semibold text-slate-700">{a.delivery === "collect" ? "Collection" : "Courier"}: </span>
                          <span className="text-slate-600">{a.delivery_date || ""}{a.delivery === "courier" && a.delivery_address ? ` · ${a.delivery_address}` : ""}</span></p>
                        )}
                        {a.follow_up_date && (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 mt-1">
                            <p className="text-xs"><span className="font-semibold text-slate-700">Follow-up: </span><span className="text-slate-600">{a.follow_up_date}</span></p>
                            <Button size="sm" className="bg-[#1a365d] text-white rounded-xl text-xs h-7 px-3 hover:bg-[#1a365d]/90"
                              onClick={() => { setFollowUpOpen(a); setFollowUpTime("09:00"); }}>
                              <RefreshCw className="h-3 w-3 mr-1" /> Book Follow-Up
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {a.rating != null && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < a.rating! ? "fill-[#fbbf24] text-[#fbbf24]" : "text-slate-200"}`} />
                          ))}
                        </div>
                        <span>{a.feedback || "Rated"}</span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}

            {/* Cancelled appointments in past — minimal display */}
            {apptTab === "past" && past.filter((a) => a.status === "cancelled").map((a) => {
              const dateStr = a.date ? new Date(a.date + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "short", month: "short", day: "numeric" }) : "";
              return (
                <Card key={a.id} className="p-4 border-0 rounded-2xl bg-slate-50 border border-slate-100 opacity-60">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-slate-500 text-sm">{a.service_name}</span>
                      <span className="text-xs text-slate-400 ml-2">{dateStr}</span>
                    </div>
                    <Badge variant="outline" className="bg-slate-100 text-slate-400 border-slate-200 text-[10px]">Cancelled</Badge>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          {/* ── Visit Summaries Tab ── */}
          <TabsContent value="summaries" className="mt-6 space-y-4">
            {apps.filter((a) => ["completed","OutPatient"].includes(a.status) && (a.diagnosis || a.medication || a.health_education)).length === 0 && (
              <Card className="p-14 text-center border-dashed border-2 border-slate-200 rounded-2xl bg-white">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="h-8 w-8 text-slate-300" />
                </div>
                <p className="font-bold text-[#1a365d] text-lg">No visit summaries yet</p>
                <p className="text-sm text-slate-400 mt-1">After a consultation, your clinical notes will appear here.</p>
              </Card>
            )}

            {apps.filter((a) => ["completed","OutPatient"].includes(a.status) && (a.diagnosis || a.medication || a.health_education)).map((a) => {
              const isVirtual = a.type === "virtual";
              const dateStr = a.date ? new Date(a.date + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "";
              return (
                <Card key={a.id} className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl">
                  <div className={`h-1.5 w-full ${isVirtual ? "bg-gradient-to-r from-[#1a365d] to-blue-400" : "bg-gradient-to-r from-emerald-500 to-emerald-300"}`} />
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                      <div className="flex gap-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isVirtual ? "bg-[#1a365d]" : "bg-emerald-600"}`}>
                          <ClipboardList className="text-white h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-[#1a365d] text-base">{a.service_name}</h3>
                          <div className="flex items-center gap-2 text-sm text-slate-400 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {dateStr}</span>
                            {a.time && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {a.time}</span>}
                            {a.nurse_name && <span>· {a.nurse_name}</span>}
                          </div>
                        </div>
                      </div>
                      {a.rating != null && (
                        <div className="flex gap-0.5 items-center shrink-0">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < a.rating! ? "fill-[#fbbf24] text-[#fbbf24]" : "text-slate-200"}`} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Clinical info grid */}
                    <div className="grid sm:grid-cols-2 gap-3">
                      {a.diagnosis && (
                        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                          <div className="text-xs font-bold uppercase tracking-wide text-blue-600 mb-1.5 flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> Diagnosis</div>
                          <p className="text-sm text-slate-700">{a.diagnosis}</p>
                        </div>
                      )}
                      {a.health_education && (
                        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                          <div className="text-xs font-bold uppercase tracking-wide text-emerald-600 mb-1.5 flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> Health Education</div>
                          <p className="text-sm text-slate-700">{a.health_education}</p>
                        </div>
                      )}
                      {a.medication && (
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                          <div className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-1.5 flex items-center gap-1"><Pill className="h-3.5 w-3.5" /> Medication</div>
                          <p className="text-sm text-slate-700">{a.medication}</p>
                          {a.delivery && (
                            <div className="mt-2 pt-2 border-t border-amber-100 flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                              {a.delivery === "collect" ? <MapPin className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />}
                              {a.delivery === "collect" ? "Collect" : "Courier"}{a.delivery_date ? ` · ${a.delivery_date}` : ""}{a.delivery === "courier" && a.delivery_address ? ` · ${a.delivery_address}` : ""}
                              {a.medication_received && <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-0 text-[10px]">Received</Badge>}
                            </div>
                          )}
                        </div>
                      )}
                      {a.follow_up_date && (
                        <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                          <div className="text-xs font-bold uppercase tracking-wide text-purple-600 mb-1.5 flex items-center gap-1"><RefreshCw className="h-3.5 w-3.5" /> Follow-Up</div>
                          <p className="text-sm text-slate-700 mb-3">{a.follow_up_date}</p>
                          {!upcoming.some((u) => u.service_name === "Follow-Up Consultation" && u.date === a.follow_up_date) ? (
                            <Button size="sm" className="w-full bg-[#1a365d] text-white rounded-xl hover:bg-[#1a365d]/90 font-semibold text-xs h-8"
                              onClick={() => { setFollowUpOpen(a); setFollowUpTime("09:00"); }}>
                              <RefreshCw className="h-3 w-3 mr-1.5" /> Book Follow-Up Appointment
                            </Button>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Follow-up booked</Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {a.notes && (
                      <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Treatment Notes</div>
                        <p className="text-sm text-slate-600">{a.notes}</p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          {/* ── Documents Tab ── */}
          <TabsContent value="documents" className="space-y-3 mt-6">
            {documents.length === 0 && (
              <Card className="p-14 text-center border-dashed border-2 border-slate-200 rounded-2xl bg-white">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-slate-300" />
                </div>
                <p className="font-bold text-[#1a365d] text-lg">No documents yet</p>
                <p className="text-sm text-slate-400 mt-1">Your nurse will issue documents after your appointment.</p>
              </Card>
            )}
            {documents.map((d) => (
              <Card key={d.id} className="p-5 border-0 shadow-sm rounded-2xl bg-white hover:shadow-md transition-all">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      d.type === "sick_note" ? "bg-[#1a365d]" : d.type === "prescription" ? "bg-[#fbbf24]" : "bg-[#38b2ac]"
                    }`}>
                      {d.type === "sick_note" && <FileText className="text-white h-5 w-5" />}
                      {d.type === "prescription" && <Pill className="text-[#1a365d] h-5 w-5" />}
                      {d.type === "referral" && <FileHeart className="text-white h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1a365d]">
                        {d.type === "sick_note" ? "Sick Note" : d.type === "prescription" ? "Prescription" : "Referral Letter"}
                      </h3>
                      <p className="text-sm text-slate-400 mt-0.5">
                        Issued by {d.nurse_name} · {new Date(d.created_at).toLocaleDateString("en-ZA", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <Button className="bg-[#1a365d] text-white hover:bg-[#1a365d]/90 rounded-xl" size="sm" onClick={() => downloadDoc(d)}>
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Download PDF
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* ── Services Catalogue Tab ── */}
          <TabsContent value="catalogue" className="space-y-5 mt-6">
            {Array.from(new Set(displayServices.map((s) => s.category))).map((cat) => {
              const catItems = displayServices.filter((s) => s.category === cat);
              return (
                <Card key={cat} className="p-6 border-0 shadow-sm rounded-2xl bg-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1.5 h-6 rounded-full bg-[#fbbf24]" />
                    <h3 className="font-black text-[#1a365d] text-lg">{cat}</h3>
                    <Badge className="bg-[#1a365d]/10 text-[#1a365d] border-0 font-semibold">{catItems.length}</Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {catItems.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { setServiceId(s.id); setMode("virtual"); }}
                        className="flex justify-between items-center p-4 rounded-xl hover:bg-[#1a365d]/5 border border-slate-100 hover:border-[#1a365d]/20 transition-all text-left group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-full bg-[#fbbf24] group-hover:scale-110 transition-transform" />
                          <span className="text-sm font-medium text-slate-700 group-hover:text-[#1a365d]">{s.name}</span>
                        </div>
                        <span className="font-black text-[#1a365d] text-sm">R{s.price}</span>
                      </button>
                    ))}
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          {/* ── Campaigns Tab ── */}
          <TabsContent value="campaigns" className="grid md:grid-cols-3 gap-4 mt-6">
            {CAMPAIGNS.map((c) => (
              <Card key={c.id} className="overflow-hidden border-0 shadow-sm rounded-2xl hover:-translate-y-1.5 transition-all duration-300 hover:shadow-xl bg-white">
                <div className={`h-28 relative overflow-hidden ${
                  c.color === "primary" ? "bg-[#1a365d]" : c.color === "accent" ? "bg-[#fbbf24]" : "bg-[#38b2ac]"
                }`}>
                  <img src={c.image} alt={c.title} className="w-full h-full object-cover opacity-60" />
                  <div className="absolute inset-0 flex items-end p-3">
                    <Badge className={`font-bold text-xs ${c.color === "accent" ? "bg-[#1a365d] text-white" : "bg-[#fbbf24] text-[#1a365d]"}`}>{c.tag}</Badge>
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-xs text-slate-400 mb-1.5 font-medium">{c.month}</div>
                  <h4 className="font-black text-[#1a365d] mb-2 text-sm leading-tight">{c.title}</h4>
                  <p className="text-xs text-slate-500">{c.description}</p>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Modify booking dialog ─── */}
      <Dialog open={!!modifyOpen} onOpenChange={(o) => !o && setModifyOpen(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1a365d]"><Calendar className="h-5 w-5 text-[#fbbf24]" /> Reschedule Appointment</DialogTitle>
            <DialogDescription>{modifyOpen?.service_name} — choose a new date and time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-500">New Date</Label>
              <Input type="date" min={today} value={modDate} onChange={(e) => setModDate(e.target.value)} className="mt-1 rounded-xl h-11" />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-500">New Time</Label>
              <Input type="time" min="07:00" max="17:00" value={modTime} onChange={(e) => setModTime(e.target.value)} className="mt-1 rounded-xl h-11" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModifyOpen(null)}>Cancel</Button>
            <Button className="bg-[#1a365d] text-white rounded-xl font-bold" onClick={submitModify}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delivery dialog ─── */}
      <Dialog open={!!deliveryOpen} onOpenChange={(o) => !o && (setDeliveryOpen(null), setDeliveryType(null))}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1a365d]">
              {deliveryType === "collect" ? <MapPin className="h-5 w-5 text-[#fbbf24]" /> : <Truck className="h-5 w-5 text-[#fbbf24]" />}
              {deliveryType === "collect" ? "Clinic Collection" : "Courier Delivery"}
            </DialogTitle>
            <DialogDescription>
              {deliveryType === "collect" ? "Choose a collection date." : "Choose a delivery date and confirm your address."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-500">{deliveryType === "collect" ? "Collection Date" : "Delivery Date"}</Label>
              <Input type="date" min={today} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="mt-1 rounded-xl h-11" />
            </div>
            {deliveryType === "courier" && (
              <div>
                <Label className="text-xs font-semibold uppercase text-slate-500">Delivery Address *</Label>
                <Textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Enter your full delivery address..."
                  className="mt-1 rounded-xl"
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setDeliveryOpen(null); setDeliveryType(null); }}>Cancel</Button>
            <Button className="bg-[#1a365d] text-white rounded-xl font-bold" onClick={submitDelivery}>
              {deliveryType === "collect" ? <><MapPin className="h-4 w-4 mr-1.5" /> Confirm collection</> : <><Truck className="h-4 w-4 mr-1.5" /> Confirm delivery</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Virtual booking dialog ─── */}
      <Dialog open={mode === "virtual"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1a365d]"><Video className="h-5 w-5 text-[#1a365d]" /> Book Virtual Appointment</DialogTitle>
            <DialogDescription>Pay online, get a Zoom link once your nurse accepts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-500">Service</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger className="mt-1 rounded-xl h-11"><SelectValue placeholder="Choose a service" /></SelectTrigger>
                <SelectContent>
                  {displayServices.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} — R{s.price}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-500">Available Slot</Label>
              <Select value={slotId} onValueChange={setSlotId}>
                <SelectTrigger className="mt-1 rounded-xl h-11"><SelectValue placeholder="Choose a slot" /></SelectTrigger>
                <SelectContent>
                  {slots.length === 0 && <div className="px-3 py-2 text-sm text-slate-400">No slots available yet</div>}
                  {slots.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {new Date(s.date + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "short", month: "short", day: "numeric" })} · {s.start_time}–{s.end_time} · {s.nurse_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {slotId && (
              <div>
                <Label className="text-xs font-semibold uppercase text-slate-500">Time (pre-filled from slot)</Label>
                <Input type="time" value={vTime} onChange={(e) => setVTime(e.target.value)} className="mt-1 rounded-xl" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
            <Button className="bg-[#1a365d] text-white rounded-xl font-bold" onClick={submitVirtual}>Continue to payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── In-clinic booking dialog ─── */}
      <Dialog open={mode === "inclinic"} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1a365d]">
              <Building2 className="h-5 w-5 text-[#fbbf24]" /> Book In-Clinic Appointment
            </DialogTitle>
            <DialogDescription>Visit us at 38 De Beer Street, Braamfontein. Choose your date and time.</DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold uppercase text-slate-500">Service *</Label>
                <Select value={icService} onValueChange={setIcService}>
                  <SelectTrigger className="h-11 mt-1 rounded-xl"><SelectValue placeholder="Choose a service" /></SelectTrigger>
                  <SelectContent>
                    {displayServices.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} — R{s.price}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase text-slate-500">Nurse *</Label>
                <Select value={icNurse} onValueChange={setIcNurse}>
                  <SelectTrigger className="h-11 mt-1 rounded-xl"><SelectValue placeholder="Select nurse" /></SelectTrigger>
                  <SelectContent>
                    {nurses.length === 0 && <div className="px-3 py-2 text-sm text-slate-400">No nurses available</div>}
                    {nurses.map((n) => <SelectItem key={n.id} value={n.id}>{n.name}{n.surname ? " " + n.surname : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold uppercase text-slate-500">Date *</Label>
                  <Input type="date" min={today} value={icDate} onChange={(e) => setIcDate(e.target.value)} className="mt-1 rounded-xl h-11" />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase text-slate-500">Time *</Label>
                  <Input type="time" value={icTime} onChange={(e) => setIcTime(e.target.value)} className="mt-1 rounded-xl h-11" min="07:00" max="17:00" />
                </div>
              </div>
              <label className="flex items-center gap-2 p-3 rounded-xl bg-[#fbbf24]/10 border border-[#fbbf24]/30 cursor-pointer">
                <input type="checkbox" checked={icStudent} onChange={(e) => setIcStudent(e.target.checked)} className="h-4 w-4 accent-[#1a365d]" />
                <span className="text-sm font-medium text-[#1a365d]">Student — R50 flat rate on clinical services</span>
              </label>
              {icServiceData && (
                <div className="p-4 rounded-2xl bg-[#1a365d] text-white">
                  <div className="text-xs text-blue-200 font-semibold uppercase mb-1">Price Summary</div>
                  <div className="text-3xl font-black">R{icPrice}</div>
                  {icDate && icTime && (
                    <div className="text-blue-200 text-sm mt-1 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(icDate + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "long", month: "long", day: "numeric" })} at {icTime}
                    </div>
                  )}
                  {icStudent && <div className="text-[#fbbf24] text-xs font-semibold mt-1">Student discount applied</div>}
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold uppercase text-slate-500">Payment Method *</Label>
                <Select value={icPayment} onValueChange={(v) => setIcPayment(v as PaymentMethod)}>
                  <SelectTrigger className="h-11 mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="eft">EFT</SelectItem>
                    <SelectItem value="medical-aid">Medical Aid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {icPayment === "medical-aid" && (
                <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold uppercase text-slate-500 mb-1">Medical Aid Details</div>
                  <Input placeholder="Medical Aid name" value={ma.name} onChange={(e) => setMa({ ...ma, name: e.target.value })} className="rounded-xl" />
                  <Input placeholder="Member number" value={ma.number} onChange={(e) => setMa({ ...ma, number: e.target.value })} className="rounded-xl" />
                  <Input placeholder="Option / Plan" value={ma.option} onChange={(e) => setMa({ ...ma, option: e.target.value })} className="rounded-xl" />
                  <Input placeholder="Main member name" value={ma.mainMember} onChange={(e) => setMa({ ...ma, mainMember: e.target.value })} className="rounded-xl" />
                  <Input placeholder="Main member ID no." value={ma.mainMemberId} onChange={(e) => setMa({ ...ma, mainMemberId: e.target.value })} className="rounded-xl" />
                </div>
              )}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm space-y-2">
                <div className="font-bold text-[#1a365d] flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#fbbf24]" /> Visit us at
                </div>
                <div className="text-slate-600">38 De Beer Street, Braamfontein, Johannesburg</div>
                <div className="text-slate-500 text-xs">Mon – Fri: 08:00 – 17:00 · Sat: 08:00 – 13:00</div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
            <Button className="bg-[#fbbf24] text-[#1a365d] hover:bg-[#f59e0b] rounded-xl font-black" onClick={submitInClinic}>
              <Building2 className="h-4 w-4 mr-1.5" /> Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Payment dialog ─── */}
      <Dialog open={!!payOpen} onOpenChange={(o) => !o && setPayOpen(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#1a365d]">Pay R{payOpen?.price}</DialogTitle>
            <DialogDescription>{payOpen?.service_name} — your appointment is held for 15 minutes.</DialogDescription>
          </DialogHeader>
          <Tabs value={payTab} onValueChange={(v) => setPayTab(v as "card" | "eft")}>
            <TabsList className="w-full rounded-xl bg-slate-100 p-1">
              <TabsTrigger value="card" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Card / Online</TabsTrigger>
              <TabsTrigger value="eft" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">EFT</TabsTrigger>
            </TabsList>
            <TabsContent value="card" className="pt-4">
              <div className="p-4 rounded-2xl bg-[#1a365d]/5 border border-[#1a365d]/10 text-sm">
                <p className="font-bold text-[#1a365d] mb-1">Demo payment</p>
                <p className="text-slate-500">Click confirm to simulate a card payment.</p>
              </div>
            </TabsContent>
            <TabsContent value="eft" className="pt-4">
              <div className="p-4 rounded-2xl bg-[#fbbf24]/10 border border-[#fbbf24]/30 space-y-2 text-sm">
                <div className="font-bold text-[#1a365d]">EFT Banking Details</div>
                <div><span className="text-slate-500">Bank:</span> <strong>FNB</strong></div>
                <div><span className="text-slate-500">Account:</span> <strong>62123456789</strong></div>
                <div><span className="text-slate-500">Reference:</span> <strong>DW-{payOpen?.id?.slice(-6).toUpperCase()}</strong></div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayOpen(null)}>Cancel</Button>
            <Button className="bg-[#fbbf24] text-[#1a365d] font-black rounded-xl" onClick={pay}>
              <CreditCard className="h-4 w-4 mr-1.5" /> Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Details dialog ─── */}
      <Dialog open={!!detailOpen} onOpenChange={(o) => !o && setDetailOpen(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#1a365d]">{detailOpen?.service_name}</DialogTitle>
            <DialogDescription>{detailOpen?.type === "virtual" ? "Virtual appointment" : "In-clinic appointment"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1 text-sm">
            {([
              ["Status", detailOpen?.status],
              ["Date", detailOpen?.date ? new Date(detailOpen.date + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "long", month: "long", day: "numeric" }) : ""],
              ["Time", detailOpen?.time],
              ["Price", `R${detailOpen?.price}`],
              ["Nurse", detailOpen?.nurse_name || "TBA"],
              ["Payment", detailOpen?.payment_method],
            ] as [string, string | undefined][]).map(([l, v]) => v ? (
              <div key={l} className="flex justify-between py-2.5 border-b border-slate-100">
                <span className="text-slate-500 font-medium">{l}</span>
                <span className="font-bold text-[#1a365d] capitalize">{v}</span>
              </div>
            ) : null)}
            {detailOpen?.zoom_link && (
              <div className="pt-3">
                <Button className="w-full bg-[#1a365d] text-white rounded-xl" asChild>
                  <a href={detailOpen.zoom_link} target="_blank" rel="noreferrer"><Video className="h-4 w-4 mr-1.5" /> Join Zoom</a>
                </Button>
              </div>
            )}
            {detailOpen?.diagnosis && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 mt-3 space-y-1.5">
                <div className="font-bold text-emerald-700 text-xs uppercase tracking-wide">Clinical Notes</div>
                <div><strong>Diagnosis:</strong> {detailOpen.diagnosis}</div>
                {detailOpen.health_education && <div><strong>Health Education:</strong> {detailOpen.health_education}</div>}
                {detailOpen.follow_up_date && <div><strong>Follow-up:</strong> {detailOpen.follow_up_date}</div>}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Rating dialog ─── */}
      <Dialog open={!!rateOpen} onOpenChange={(o) => !o && setRateOpen(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#1a365d]">Rate your visit</DialogTitle>
            <DialogDescription>{rateOpen?.service_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center gap-3 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} onClick={() => setRating(i + 1)} className="transition-transform hover:scale-125 active:scale-95">
                  <Star className={`h-9 w-9 transition-colors ${i < rating ? "fill-[#fbbf24] text-[#fbbf24]" : "text-slate-200"}`} />
                </button>
              ))}
            </div>
            <Textarea placeholder="Tell us about your experience..." rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} className="rounded-xl" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRateOpen(null)}>Skip</Button>
            <Button className="bg-[#fbbf24] text-[#1a365d] font-black rounded-xl" onClick={submitRating}>
              <Heart className="h-4 w-4 mr-1.5 fill-current" /> Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Follow-Up Booking dialog ─── */}
      <Dialog open={!!followUpOpen} onOpenChange={(o) => !o && setFollowUpOpen(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1a365d]">
              <RefreshCw className="h-5 w-5 text-[#fbbf24]" /> Book Follow-Up Appointment
            </DialogTitle>
            <DialogDescription>
              {followUpOpen?.service_name} follow-up · scheduled for {followUpOpen?.follow_up_date
                ? new Date(followUpOpen.follow_up_date + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "long", month: "long", day: "numeric" })
                : ""
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Pre-filled summary */}
            <div className="p-4 rounded-xl bg-[#1a365d]/5 border border-[#1a365d]/10 space-y-2 text-sm">
              <div className="text-xs font-bold uppercase tracking-wide text-[#1a365d] mb-2">Appointment Details</div>
              <div className="flex justify-between">
                <span className="text-slate-500">Service</span>
                <span className="font-semibold text-[#1a365d]">Follow-Up Consultation</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span className="font-semibold text-[#1a365d] capitalize">{followUpOpen?.type === "virtual" ? "Virtual" : "In-Clinic"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold text-[#1a365d]">
                  {followUpOpen?.follow_up_date
                    ? new Date(followUpOpen.follow_up_date + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "short", month: "short", day: "numeric" })
                    : ""}
                </span>
              </div>
              {followUpOpen?.nurse_name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Nurse</span>
                  <span className="font-semibold text-[#1a365d]">{followUpOpen.nurse_name}</span>
                </div>
              )}
              {followUpOpen?.diagnosis && (
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-slate-500 text-xs">Reason: </span>
                  <span className="text-slate-700 text-xs">{followUpOpen.diagnosis}</span>
                </div>
              )}
            </div>

            {/* Time picker */}
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-500">Preferred Time *</Label>
              <Input
                type="time"
                min="07:00"
                max="17:00"
                value={followUpTime}
                onChange={(e) => setFollowUpTime(e.target.value)}
                className="mt-1 rounded-xl h-11"
              />
              <p className="text-xs text-slate-400 mt-1.5">Clinic hours: 07:00 – 17:00</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setFollowUpOpen(null)}>Cancel</Button>
            <Button className="bg-[#1a365d] text-white rounded-xl font-bold hover:bg-[#1a365d]/90" onClick={bookFollowUp}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Confirm Follow-Up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientPortal;
