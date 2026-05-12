import jsPDF from "jspdf";

const CLINIC_NAME = "DUNWELL EXECUTIVE WELLNESS & HEALTHCARE";
const CLINIC_TAGLINE = "Compassionate Care for a Healthier Tomorrow";
const CLINIC_ADDRESS = "38 De Beer Street, Braamfontein, Johannesburg, 2001";
const CLINIC_TEL = "Tel: 072 176 0247";
const CLINIC_EMAIL = "Email: admin@dunwellyouthpriority.co.za";

const colors = {
  navy: { r: 26, g: 54, b: 93 },
  navyLight: { r: 41, g: 82, b: 132 },
  accent: { r: 70, g: 130, b: 180 },
  text: { r: 30, g: 41, b: 59 },
  muted: { r: 100, g: 116, b: 139 },
  light: { r: 241, g: 245, b: 249 },
  border: { r: 203, g: 213, b: 225 },
  white: { r: 255, g: 255, b: 255 },
};

export interface PatientInfo {
  name: string;
  surname: string;
  dob?: string;
  email?: string;
}

export interface NurseInfo {
  name: string;
  surname: string;
  sancNumber: string;
}

const setColor = (doc: jsPDF, c: { r: number; g: number; b: number }) => doc.setTextColor(c.r, c.g, c.b);
const setDrawColor = (doc: jsPDF, c: { r: number; g: number; b: number }) => doc.setDrawColor(c.r, c.g, c.b);
const setFillColor = (doc: jsPDF, c: { r: number; g: number; b: number }) => doc.setFillColor(c.r, c.g, c.b);

const addProfessionalHeader = (doc: jsPDF): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 0;

  setFillColor(doc, colors.navy);
  doc.rect(0, 0, pageWidth, 6, "F");
  setFillColor(doc, colors.accent);
  doc.rect(0, 6, pageWidth, 1.5, "F");

  y = 18;

  // Logo placeholder circle with monogram
  const cx = pageWidth / 2;
  setFillColor(doc, colors.navy);
  doc.circle(cx, y + 6, 9, "F");
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.white);
  doc.text("D", cx, y + 8.5, { align: "center" });

  y += 22;

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.navy);
  doc.text(CLINIC_NAME, pageWidth / 2, y, { align: "center" });
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  setColor(doc, colors.muted);
  doc.text(CLINIC_TAGLINE, pageWidth / 2, y, { align: "center" });
  y += 6;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.text);
  doc.text(CLINIC_ADDRESS, pageWidth / 2, y, { align: "center" });
  y += 3.5;
  doc.text(`${CLINIC_TEL}  |  ${CLINIC_EMAIL}`, pageWidth / 2, y, { align: "center" });
  y += 5;

  setDrawColor(doc, colors.border);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);
  return y + 6;
};

const addDocumentTitle = (doc: jsPDF, title: string, y: number): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  setFillColor(doc, colors.navy);
  doc.roundedRect(40, y - 5, pageWidth - 80, 14, 2, 2, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.white);
  doc.text(title.toUpperCase(), pageWidth / 2, y + 4, { align: "center" });
  return y + 18;
};

const addSectionHeader = (doc: jsPDF, title: string, y: number, margin: number): number => {
  setFillColor(doc, colors.navy);
  doc.rect(margin, y - 1, 2, 7, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.navy);
  doc.text(title, margin + 5, y + 4);
  return y + 12;
};

const addInfoRow = (doc: jsPDF, label: string, value: string, y: number, margin: number, labelWidth = 50): number => {
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.muted);
  doc.text(label, margin, y);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.text);
  doc.text(value || "N/A", margin + labelWidth, y);
  return y + 6;
};

const addProfessionalFooter = (doc: jsPDF, docType: string) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = pageHeight - 25;

  setDrawColor(doc, colors.border);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.muted);
  doc.text(`REF: DW-${docType}-${Date.now().toString().slice(-8)}`, margin, y);
  doc.text("CONFIDENTIAL MEDICAL DOCUMENT", pageWidth / 2, y, { align: "center" });
  doc.text("Page 1 of 1", pageWidth - margin, y, { align: "right" });
  y += 5;

  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  setColor(doc, { r: 140, g: 140, b: 140 });
  doc.text(
    "This document is confidential and protected by law. For verification, contact Dunwell Youth Priority Clinic.",
    pageWidth / 2,
    y,
    { align: "center" }
  );

  setFillColor(doc, colors.navy);
  doc.rect(0, pageHeight - 4, pageWidth, 4, "F");
};

const signatureBlock = (doc: jsPDF, nurse: NurseInfo, yIn: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = yIn;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.text);
  doc.text(`Issued by: ${nurse.name} ${nurse.surname}`, margin, y);
  doc.text(`HPCSA/SANC No: ${nurse.sancNumber}`, pageWidth / 2, y);
  y += 5;
  doc.text(`Date: ${new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" })}`, margin, y);
  y += 8;

  const boxWidth = 70;
  const boxHeight = 30;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.muted);
  doc.text("Signature:", margin, y);
  doc.text("Official Stamp:", pageWidth - margin - boxWidth, y);
  y += 3;

  setDrawColor(doc, colors.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, boxWidth, boxHeight, 2, 2, "S");
  doc.roundedRect(pageWidth - margin - boxWidth, y, boxWidth, boxHeight, 2, 2, "S");
  setDrawColor(doc, colors.muted);
  doc.line(margin + 5, y + boxHeight - 6, margin + boxWidth - 5, y + boxHeight - 6);
};

export interface SickNoteData {
  accompaniedBy: string;
  consultedFor: string;
  fromTime: string;
  toTime: string;
  returningTo: string;
  bookedOffFrom: string;
  bookedOffTo: string;
}

export const generateSickNotePDF = (patient: PatientInfo, nurse: NurseInfo, data: SickNoteData): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  let y = addProfessionalHeader(doc);
  y = addDocumentTitle(doc, "Medical Sick Note", y);

  y = addSectionHeader(doc, "PATIENT INFORMATION", y, margin);
  y = addInfoRow(doc, "Full Name:", `${patient.name} ${patient.surname}`, y, margin);
  y = addInfoRow(doc, "Date of Birth:", patient.dob || "N/A", y, margin);
  y = addInfoRow(doc, "Accompanied By:", data.accompaniedBy, y, margin);
  y += 6;

  y = addSectionHeader(doc, "CONSULTATION DETAILS", y, margin);
  y = addInfoRow(doc, "Reason for Visit:", data.consultedFor, y, margin);
  y = addInfoRow(doc, "Consultation Time:", `${data.fromTime} - ${data.toTime}`, y, margin);
  y = addInfoRow(doc, "Return to Work/School:", data.returningTo, y, margin);
  y += 6;

  y = addSectionHeader(doc, "AUTHORIZED LEAVE PERIOD", y, margin);
  setFillColor(doc, colors.light);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 18, 2, 2, "F");
  setDrawColor(doc, colors.navy);
  doc.setLineWidth(1);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 18, 2, 2, "S");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.navy);
  doc.text(`FROM: ${data.bookedOffFrom}     TO: ${data.bookedOffTo}`, pageWidth / 2, y + 11, { align: "center" });
  y += 28;

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  setColor(doc, colors.text);
  doc.text(
    "I hereby certify that the above-named patient was examined and found to be unfit for work/school for the period indicated above.",
    margin,
    y,
    { maxWidth: pageWidth - 2 * margin }
  );
  y += 12;

  signatureBlock(doc, nurse, y);
  addProfessionalFooter(doc, "SN");
  return doc;
};

export const generatePrescriptionPDF = (patient: PatientInfo, nurse: NurseInfo, prescriptionText: string): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  let y = addProfessionalHeader(doc);
  y = addDocumentTitle(doc, "Medical Prescription", y);

  y = addSectionHeader(doc, "PATIENT DETAILS", y, margin);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.muted);
  doc.text("Full Name:", margin, y);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.text);
  doc.text(`${patient.name} ${patient.surname}`, margin + 28, y);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.muted);
  doc.text("DOB:", pageWidth / 2 + 10, y);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.text);
  doc.text(patient.dob || "N/A", pageWidth / 2 + 25, y);
  y += 8;

  const signatureHeight = 60;
  const footerHeight = 30;
  const availableHeight = pageHeight - y - signatureHeight - footerHeight - 15;
  const boxHeight = Math.min(Math.max(availableHeight, 60), 100);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.navy);
  doc.text("PRESCRIPTION", margin, y);
  y += 4;

  setDrawColor(doc, colors.navy);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, boxHeight, 2, 2, "S");

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.text);
  const lines = doc.splitTextToSize(prescriptionText || "No prescription provided.", pageWidth - 2 * margin - 10);
  doc.text(lines, margin + 5, y + 6);
  y += boxHeight + 6;

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  setColor(doc, colors.muted);
  doc.text("Please follow the prescribed medication as directed. Consult with a pharmacist for any questions.", margin, y);
  y += 8;

  signatureBlock(doc, nurse, y);
  addProfessionalFooter(doc, "RX");
  return doc;
};

export const generateReferralLetterPDF = (patient: PatientInfo, nurse: NurseInfo, clinicalNotes: string): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  let y = addProfessionalHeader(doc);
  y = addDocumentTitle(doc, "Medical Referral Letter", y);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.text);
  doc.text("Dear Colleague,", margin, y);
  doc.text(
    `Date: ${new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" })}`,
    pageWidth - margin,
    y,
    { align: "right" }
  );
  y += 8;

  y = addSectionHeader(doc, "PATIENT INFORMATION", y, margin);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.muted);
  doc.text("Full Name:", margin, y);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.text);
  doc.text(`${patient.name} ${patient.surname}`, margin + 28, y);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.muted);
  doc.text("DOB:", pageWidth / 2 + 10, y);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.text);
  doc.text(patient.dob || "N/A", pageWidth / 2 + 25, y);
  y += 8;

  const signatureHeight = 60;
  const footerHeight = 30;
  const closingHeight = 15;
  const availableHeight = pageHeight - y - signatureHeight - footerHeight - closingHeight - 10;
  const boxHeight = Math.min(Math.max(availableHeight, 50), 80);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.navy);
  doc.text("CLINICAL NOTES & REASON FOR REFERRAL", margin, y);
  y += 4;

  setDrawColor(doc, colors.navy);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, boxHeight, 2, 2, "S");

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.text);
  const lines = doc.splitTextToSize(clinicalNotes || "No clinical notes provided.", pageWidth - 2 * margin - 10);
  doc.text(lines, margin + 5, y + 6);
  y += boxHeight + 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.text);
  doc.text("Thank you for your attention to this referral. Kind regards,", margin, y);
  y += 8;

  signatureBlock(doc, nurse, y);
  addProfessionalFooter(doc, "REF");
  return doc;
};

// --- Re-render helpers from saved document records ---
export type SavedDoc = {
  id: string;
  type: "sick_note" | "prescription" | "referral";
  patient_name: string;
  nurse_name: string;
  data: any;
  created_at: string;
};

export const renderSavedDoc = (
  doc: SavedDoc,
  patient: PatientInfo,
  nurse: NurseInfo
): jsPDF => {
  if (doc.type === "sick_note") return generateSickNotePDF(patient, nurse, doc.data);
  if (doc.type === "prescription") return generatePrescriptionPDF(patient, nurse, doc.data?.text ?? "");
  return generateReferralLetterPDF(patient, nurse, doc.data?.notes ?? "");
};
