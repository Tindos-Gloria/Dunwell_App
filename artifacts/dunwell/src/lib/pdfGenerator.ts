import jsPDF from "jspdf";

const CLINIC_NAME = "DUNWELL YOUTH PRIORITY CLINIC";
const CLINIC_TAGLINE = "Your Health, Our Priority";
const CLINIC_ADDRESS = "38 De Beer Street, Braamfontein, Johannesburg, 2001";
const CLINIC_TEL = "Tel: 072 176 0247";
const CLINIC_EMAIL = "Email: admin@dunwellyouthpriority.co.za";

const LOGO_URL = "/dunwell-logo.jpeg";
const STAMP_URL = "/dunwell-stamp.jpg";

const colors = {
  navy: { r: 26, g: 54, b: 93 },
  navyLight: { r: 41, g: 82, b: 132 },
  yellow: { r: 251, g: 191, b: 36 },
  teal: { r: 56, g: 178, b: 172 },
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
  signatureDataUrl?: string | null;
}

const setColor = (doc: jsPDF, c: { r: number; g: number; b: number }) => doc.setTextColor(c.r, c.g, c.b);
const setDrawColor = (doc: jsPDF, c: { r: number; g: number; b: number }) => doc.setDrawColor(c.r, c.g, c.b);
const setFillColor = (doc: jsPDF, c: { r: number; g: number; b: number }) => doc.setFillColor(c.r, c.g, c.b);

let cachedLogoDataUrl: string | null = null;
let cachedStampDataUrl: string | null = null;

async function loadImage(url: string, cache: { value: string | null }): Promise<string | null> {
  if (cache.value) return cache.value;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cache.value = reader.result as string;
        resolve(cache.value);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const logoCache = { value: null as string | null };
const stampCache = { value: null as string | null };

async function loadLogo(): Promise<string | null> {
  const result = await loadImage(LOGO_URL, logoCache);
  cachedLogoDataUrl = result;
  return result;
}

async function loadStamp(): Promise<string | null> {
  const result = await loadImage(STAMP_URL, stampCache);
  cachedStampDataUrl = result;
  return result;
}

const addProfessionalHeader = async (doc: jsPDF): Promise<number> => {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 0;

  // Top colour bar navy
  setFillColor(doc, colors.navy);
  doc.rect(0, 0, pageWidth, 7, "F");
  // Yellow accent stripe
  setFillColor(doc, colors.yellow);
  doc.rect(0, 7, pageWidth, 2.5, "F");

  y = 16;

  // Try to add logo
  const logoData = await loadLogo();
  const logoSize = 22;
  if (logoData) {
    try {
      doc.addImage(logoData, "JPEG", pageWidth / 2 - logoSize / 2, y, logoSize, logoSize);
    } catch {
      // fallback circle
      setFillColor(doc, colors.navy);
      doc.circle(pageWidth / 2, y + logoSize / 2, logoSize / 2, "F");
    }
  } else {
    setFillColor(doc, colors.navy);
    doc.circle(pageWidth / 2, y + logoSize / 2, logoSize / 2, "F");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    setColor(doc, colors.white);
    doc.text("D", pageWidth / 2, y + logoSize / 2 + 5, { align: "center" });
  }
  y += logoSize + 5;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.navy);
  doc.text(CLINIC_NAME, pageWidth / 2, y, { align: "center" });
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  setColor(doc, colors.muted);
  doc.text(CLINIC_TAGLINE, pageWidth / 2, y, { align: "center" });
  y += 5;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.text);
  doc.text(CLINIC_ADDRESS, pageWidth / 2, y, { align: "center" });
  y += 3.5;
  doc.text(`${CLINIC_TEL}  |  ${CLINIC_EMAIL}`, pageWidth / 2, y, { align: "center" });
  y += 5;

  // Yellow rule
  setFillColor(doc, colors.yellow);
  doc.rect(20, y, pageWidth - 40, 1, "F");
  return y + 6;
};

const addDocumentTitle = (doc: jsPDF, title: string, y: number): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  setFillColor(doc, colors.navy);
  doc.roundedRect(30, y - 5, pageWidth - 60, 14, 2, 2, "F");
  // Yellow left accent
  setFillColor(doc, colors.yellow);
  doc.roundedRect(30, y - 5, 4, 14, 1, 1, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.white);
  doc.text(title.toUpperCase(), pageWidth / 2, y + 4, { align: "center" });
  return y + 18;
};

const addSectionHeader = (doc: jsPDF, title: string, y: number, margin: number): number => {
  setFillColor(doc, colors.yellow);
  doc.rect(margin, y - 1, 3, 7, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.navy);
  doc.text(title, margin + 6, y + 4);
  return y + 11;
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
  let y = pageHeight - 22;

  setFillColor(doc, colors.yellow);
  doc.rect(margin, y, pageWidth - 2 * margin, 0.8, "F");
  y += 4;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.muted);
  doc.text(`REF: DW-${docType}-${Date.now().toString().slice(-8)}`, margin, y);
  doc.text("CONFIDENTIAL MEDICAL DOCUMENT", pageWidth / 2, y, { align: "center" });
  doc.text("Page 1 of 1", pageWidth - margin, y, { align: "right" });
  y += 4;

  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  setColor(doc, { r: 150, g: 150, b: 150 });
  doc.text(
    "This document is confidential. For verification contact Dunwell Youth Priority Clinic.",
    pageWidth / 2, y, { align: "center" }
  );

  setFillColor(doc, colors.navy);
  doc.rect(0, pageHeight - 4, pageWidth, 4, "F");
};

const signatureBlock = async (doc: jsPDF, nurse: NurseInfo, yIn: number) => {
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

  const boxWidth = 75;
  const boxHeight = 32;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.muted);
  doc.text("Nurse Signature:", margin, y);
  doc.text("Official Stamp:", pageWidth - margin - boxWidth, y);
  y += 3;

  setDrawColor(doc, colors.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, boxWidth, boxHeight, 2, 2, "S");
  doc.roundedRect(pageWidth - margin - boxWidth, y, boxWidth, boxHeight, 2, 2, "S");

  // Draw yellow underline inside sig box
  setDrawColor(doc, colors.yellow);
  doc.setLineWidth(0.8);
  doc.line(margin + 5, y + boxHeight - 6, margin + boxWidth - 5, y + boxHeight - 6);

  // Embed nurse signature if available
  if (nurse.signatureDataUrl) {
    try {
      doc.addImage(nurse.signatureDataUrl, "PNG", margin + 2, y + 2, boxWidth - 4, boxHeight - 4);
    } catch { /* ignore */ }
  }

  // Embed clinic stamp image inside the Official Stamp box
  const stampData = await loadStamp();
  if (stampData) {
    try {
      const stampX = pageWidth - margin - boxWidth;
      const padding = 2;
      doc.addImage(stampData, "JPEG", stampX + padding, y + padding, boxWidth - padding * 2, boxHeight - padding * 2);
    } catch { /* ignore */ }
  }
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

export const generateSickNotePDF = async (patient: PatientInfo, nurse: NurseInfo, data: SickNoteData): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  let y = await addProfessionalHeader(doc);
  y = addDocumentTitle(doc, "Medical Sick Note", y);

  y = addSectionHeader(doc, "PATIENT INFORMATION", y, margin);
  y = addInfoRow(doc, "Full Name:", `${patient.name} ${patient.surname}`, y, margin);
  y = addInfoRow(doc, "Date of Birth:", patient.dob || "N/A", y, margin);
  y = addInfoRow(doc, "Accompanied By:", data.accompaniedBy || "Self", y, margin);
  y += 4;

  y = addSectionHeader(doc, "CONSULTATION DETAILS", y, margin);
  y = addInfoRow(doc, "Reason for Visit:", data.consultedFor, y, margin);
  y = addInfoRow(doc, "Consultation Time:", `${data.fromTime} - ${data.toTime}`, y, margin);
  y = addInfoRow(doc, "Return to Work/School:", data.returningTo, y, margin);
  y += 4;

  y = addSectionHeader(doc, "AUTHORIZED LEAVE PERIOD", y, margin);
  setFillColor(doc, colors.light);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 18, 2, 2, "F");
  setDrawColor(doc, colors.yellow);
  doc.setLineWidth(1.5);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 18, 2, 2, "S");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.navy);
  doc.text(`FROM: ${data.bookedOffFrom}     TO: ${data.bookedOffTo}`, pageWidth / 2, y + 11, { align: "center" });
  y += 26;

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  setColor(doc, colors.text);
  doc.text(
    "I hereby certify that the above-named patient was examined and found to be unfit for work/school for the period indicated above.",
    margin, y, { maxWidth: pageWidth - 2 * margin }
  );
  y += 14;

  await signatureBlock(doc, nurse, y);
  addProfessionalFooter(doc, "SN");
  return doc;
};

export const generatePrescriptionPDF = async (patient: PatientInfo, nurse: NurseInfo, prescriptionText: string): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  let y = await addProfessionalHeader(doc);
  y = addDocumentTitle(doc, "Medical Prescription", y);

  y = addSectionHeader(doc, "PATIENT DETAILS", y, margin);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.muted);
  doc.text("Full Name:", margin, y);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.text);
  doc.text(`${patient.name} ${patient.surname}`, margin + 26, y);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.muted);
  doc.text("DOB:", pageWidth / 2 + 10, y);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.text);
  doc.text(patient.dob || "N/A", pageWidth / 2 + 24, y);
  y += 8;

  const signatureHeight = 65;
  const footerHeight = 30;
  const availableHeight = pageHeight - y - signatureHeight - footerHeight - 15;
  const boxHeight = Math.min(Math.max(availableHeight, 60), 100);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.navy);
  doc.text("PRESCRIPTION", margin, y);
  y += 4;

  setDrawColor(doc, colors.yellow);
  doc.setLineWidth(1);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, boxHeight, 2, 2, "S");
  // Rx symbol
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.yellow);
  doc.text("Rx", margin + 4, y + 8);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.text);
  const lines = doc.splitTextToSize(prescriptionText || "No prescription provided.", pageWidth - 2 * margin - 18);
  doc.text(lines, margin + 14, y + 8);
  y += boxHeight + 6;

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  setColor(doc, colors.muted);
  doc.text("Follow prescribed medication as directed. Consult a pharmacist for questions.", margin, y);
  y += 8;

  await signatureBlock(doc, nurse, y);
  addProfessionalFooter(doc, "RX");
  return doc;
};

export const generateReferralLetterPDF = async (patient: PatientInfo, nurse: NurseInfo, clinicalNotes: string): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  let y = await addProfessionalHeader(doc);
  y = addDocumentTitle(doc, "Medical Referral Letter", y);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.text);
  doc.text("Dear Colleague,", margin, y);
  doc.text(
    `Date: ${new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" })}`,
    pageWidth - margin, y, { align: "right" }
  );
  y += 8;

  y = addSectionHeader(doc, "PATIENT INFORMATION", y, margin);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.muted);
  doc.text("Full Name:", margin, y);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.text);
  doc.text(`${patient.name} ${patient.surname}`, margin + 26, y);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.muted);
  doc.text("DOB:", pageWidth / 2 + 10, y);
  doc.setFont("helvetica", "normal");
  setColor(doc, colors.text);
  doc.text(patient.dob || "N/A", pageWidth / 2 + 24, y);
  y += 8;

  const signatureHeight = 65;
  const footerHeight = 30;
  const closingHeight = 15;
  const availableHeight = pageHeight - y - signatureHeight - footerHeight - closingHeight - 10;
  const boxHeight = Math.min(Math.max(availableHeight, 50), 80);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, colors.navy);
  doc.text("CLINICAL NOTES & REASON FOR REFERRAL", margin, y);
  y += 4;

  setDrawColor(doc, colors.yellow);
  doc.setLineWidth(1);
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

  await signatureBlock(doc, nurse, y);
  addProfessionalFooter(doc, "REF");
  return doc;
};

export type SavedDoc = {
  id: string;
  type: "sick_note" | "prescription" | "referral";
  patient_name: string;
  nurse_name: string;
  data: Record<string, unknown>;
  created_at: string;
};

export const renderSavedDoc = async (
  doc: SavedDoc,
  patient: PatientInfo,
  nurse: NurseInfo
): Promise<jsPDF> => {
  if (doc.type === "sick_note") return generateSickNotePDF(patient, nurse, doc.data as unknown as SickNoteData);
  if (doc.type === "prescription") return generatePrescriptionPDF(patient, nurse, String((doc.data as { text?: unknown }).text ?? ""));
  return generateReferralLetterPDF(patient, nurse, String((doc.data as { notes?: unknown }).notes ?? ""));
};
