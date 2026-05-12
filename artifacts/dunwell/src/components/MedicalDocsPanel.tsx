import { useMemo, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Pill, FileHeart, Download } from "lucide-react";
import { toast } from "sonner";
import { store, usePatients, type Profile } from "@/lib/store";
import { SignaturePad } from "@/components/SignaturePad";
import type { jsPDF } from "jspdf";
import {
  generateSickNotePDF,
  generatePrescriptionPDF,
  generateReferralLetterPDF,
  type NurseInfo,
} from "@/lib/pdfGenerator";

type Kind = "sick_note" | "prescription" | "referral" | null;

export const MedicalDocsPanel = ({ nurse, preselectedPatientId }: { nurse: Profile; preselectedPatientId?: string }) => {
  const patients = usePatients();
  const [kind, setKind] = useState<Kind>(null);
  const [patientId, setPatientId] = useState(preselectedPatientId || "");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [sn, setSn] = useState({
    accompaniedBy: "",
    consultedFor: "",
    fromTime: "09:00",
    toTime: "09:30",
    returningTo: "",
    bookedOffFrom: new Date().toISOString().slice(0, 10),
    bookedOffTo: new Date().toISOString().slice(0, 10),
  });

  const [rx, setRx] = useState("");
  const [ref, setRef] = useState("");

  const patient = useMemo(() => patients.find((p) => p.id === patientId), [patients, patientId]);

  const reset = () => {
    setKind(null);
    if (!preselectedPatientId) setPatientId("");
    setRx(""); setRef(""); setSignatureDataUrl(null); setBusy(false);
    setSn({ accompaniedBy: "", consultedFor: "", fromTime: "09:00", toTime: "09:30", returningTo: "",
      bookedOffFrom: new Date().toISOString().slice(0, 10), bookedOffTo: new Date().toISOString().slice(0, 10) });
  };

  const handleSignature = useCallback((url: string | null) => setSignatureDataUrl(url), []);

  const nurseInfo: NurseInfo = {
    name: nurse.name,
    surname: nurse.surname || "",
    sancNumber: nurse.sanc_hpcsa || "DUNWELL",
    signatureDataUrl,
  };

  const generate = async () => {
    if (!patient) { toast.error("Select a patient"); return; }
    setBusy(true);
    const patientInfo = {
      name: patient.name,
      surname: patient.surname || "",
      dob: patient.dob || "",
      email: patient.email || "",
    };
    const patientName = `${patient.name} ${patient.surname || ""}`.trim();

    try {
      let pdf: jsPDF | undefined;
      let data: Record<string, unknown> | undefined;
      let filename: string | undefined;
      if (kind === "sick_note") {
        pdf = await generateSickNotePDF(patientInfo, nurseInfo, sn);
        data = sn;
        filename = `SickNote_${patientName}.pdf`;
      } else if (kind === "prescription") {
        if (!rx.trim()) { toast.error("Enter prescription"); setBusy(false); return; }
        pdf = await generatePrescriptionPDF(patientInfo, nurseInfo, rx);
        data = { text: rx };
        filename = `Prescription_${patientName}.pdf`;
      } else if (kind === "referral") {
        if (!ref.trim()) { toast.error("Enter clinical notes"); setBusy(false); return; }
        pdf = await generateReferralLetterPDF(patientInfo, nurseInfo, ref);
        data = { notes: ref };
        filename = `ReferralLetter_${patientName}.pdf`;
      } else { setBusy(false); return; }

      if (!pdf || !data || !filename) { setBusy(false); return; }

      await store.createMedicalDocument({
        patient_id: patient.id,
        patient_name: patientName,
        nurse_id: nurse.id,
        nurse_name: `${nurse.name} ${nurse.surname || ""}`.trim(),
        type: kind!,
        data,
      });
      pdf.save(filename);
      toast.success("Document created and sent to patient");
      reset();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create document");
    } finally {
      setBusy(false);
    }
  };

  const tiles = [
    { kind: "sick_note" as const, title: "Sick Note", desc: "Issue a medical sick note", icon: FileText, gradient: "from-[#1a365d] to-[#2a5298]" },
    { kind: "prescription" as const, title: "Prescription", desc: "Write a prescription", icon: Pill, gradient: "from-[#fbbf24] to-[#f59e0b]" },
    { kind: "referral" as const, title: "Referral Letter", desc: "Refer to a specialist", icon: FileHeart, gradient: "from-[#38b2ac] to-[#2c7a7b]" },
  ];

  return (
    <>
      <div className="grid sm:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <button key={t.kind} onClick={() => setKind(t.kind)} className="text-left group">
            <Card className="p-5 border-2 hover:border-primary/40 hover:-translate-y-1.5 transition-all duration-300 hover:shadow-xl h-full">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${t.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                <t.icon className="text-white h-5 w-5" />
              </div>
              <h4 className="font-bold mb-1">{t.title}</h4>
              <p className="text-sm text-muted-foreground">{t.desc}</p>
            </Card>
          </button>
        ))}
      </div>

      <Dialog open={!!kind} onOpenChange={(o) => !o && reset()}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {kind === "sick_note" && <><FileText className="text-primary" /> New Sick Note</>}
              {kind === "prescription" && <><Pill className="text-primary" /> New Prescription</>}
              {kind === "referral" && <><FileHeart className="text-primary" /> New Referral Letter</>}
            </DialogTitle>
            <DialogDescription>Patient details auto-populate from their profile.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!preselectedPatientId && (
              <div>
                <Label>Patient *</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select a patient" /></SelectTrigger>
                  <SelectContent>
                    {patients.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No patients yet</div>}
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} {p.surname ?? ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {preselectedPatientId && patient && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm font-medium">
                Patient: {patient.name} {patient.surname || ""}
              </div>
            )}

            {kind === "sick_note" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Booked off from</Label><Input type="date" value={sn.bookedOffFrom} onChange={(e) => setSn({ ...sn, bookedOffFrom: e.target.value })} /></div>
                  <div><Label>Booked off to</Label><Input type="date" value={sn.bookedOffTo} onChange={(e) => setSn({ ...sn, bookedOffTo: e.target.value })} /></div>
                </div>
                <div><Label>Reason for consultation</Label><Input value={sn.consultedFor} onChange={(e) => setSn({ ...sn, consultedFor: e.target.value })} placeholder="e.g. Influenza" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Consulted from</Label><Input type="time" value={sn.fromTime} onChange={(e) => setSn({ ...sn, fromTime: e.target.value })} /></div>
                  <div><Label>Consulted to</Label><Input type="time" value={sn.toTime} onChange={(e) => setSn({ ...sn, toTime: e.target.value })} /></div>
                </div>
                <div><Label>Accompanied by</Label><Input value={sn.accompaniedBy} onChange={(e) => setSn({ ...sn, accompaniedBy: e.target.value })} placeholder="Optional" /></div>
                <div><Label>Returning to</Label><Input value={sn.returningTo} onChange={(e) => setSn({ ...sn, returningTo: e.target.value })} placeholder="e.g. Work / School" /></div>
              </>
            )}

            {kind === "prescription" && (
              <div>
                <Label>Prescription *</Label>
                <Textarea rows={7} value={rx} onChange={(e) => setRx(e.target.value)}
                  placeholder="Rx:&#10;1. Paracetamol 500mg — 1 tablet TDS for 5 days&#10;2. ..." />
              </div>
            )}

            {kind === "referral" && (
              <div>
                <Label>Clinical notes & reason for referral *</Label>
                <Textarea rows={7} value={ref} onChange={(e) => setRef(e.target.value)}
                  placeholder="Reason for referral, clinical findings, current treatment..." />
              </div>
            )}

            <SignaturePad onSignature={handleSignature} label="Nurse Signature (optional)" />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={reset}>Cancel</Button>
            <Button variant="hero" onClick={generate} disabled={busy}>
              <Download className="h-4 w-4 mr-1" /> {busy ? "Generating..." : "Generate & save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
