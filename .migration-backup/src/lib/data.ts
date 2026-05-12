import dripImg from "@/assets/dunwell-logo.jpeg";
import srhImg from "@/assets/campaigns/srh-april.png";
import tbImg from "@/assets/campaigns/tb-awareness.png";
import studentImg from "@/assets/campaigns/student-discount.jpg";

export const NURSE_INVITE_CODE = "DUNWELL-NURSE-2026";

export type ServiceCategory = "Prevention" | "Clinical" | "Wellness";

export interface Service {
  id: string;
  name: string;
  price: number;
  category: ServiceCategory;
  description?: string;
}

export const SERVICES: Service[] = [
  // Prevention
  { id: "fp", name: "Family Planning", price: 150, category: "Prevention", description: "Contraception counselling & methods" },
  { id: "imp-in", name: "Implanon Insertion", price: 300, category: "Prevention" },
  { id: "imp-out", name: "Implanon Removal", price: 350, category: "Prevention" },
  { id: "prep", name: "HIV PrEP", price: 350, category: "Prevention", description: "Pre-exposure prophylaxis" },
  { id: "pep", name: "HIV PEP", price: 350, category: "Prevention", description: "Post-exposure prophylaxis" },
  { id: "ec", name: "Emergency Pills", price: 150, category: "Prevention" },
  { id: "pap", name: "Pap Smear", price: 300, category: "Prevention" },
  { id: "prostate", name: "Prostate", price: 300, category: "Prevention" },
  // Clinical
  { id: "consult", name: "Consultation", price: 250, category: "Clinical", description: "General consultation incl. meds" },
  { id: "sti", name: "STI Treatment", price: 350, category: "Clinical" },
  { id: "hiv-care", name: "HIV Care", price: 300, category: "Clinical" },
  { id: "chronic", name: "Chronic Illness", price: 300, category: "Clinical" },
  { id: "stitch", name: "Stitch Removal", price: 300, category: "Clinical" },
  // Wellness
  { id: "preg", name: "Pregnancy Test", price: 50, category: "Wellness" },
  { id: "bp", name: "BP / Glucose Test", price: 50, category: "Wellness" },
  { id: "hivt", name: "HIV Test", price: 100, category: "Wellness" },
  { id: "vit", name: "Vit B-co / B12 / C", price: 50, category: "Wellness" },
  { id: "glut", name: "Glutathione", price: 200, category: "Wellness" },
  { id: "acne", name: "Acne / Skin Care", price: 300, category: "Wellness" },
  { id: "detox", name: "Detox Drip", price: 600, category: "Wellness" },
  { id: "glow", name: "Glow Drip", price: 500, category: "Wellness" },
  { id: "recovery", name: "Recovery Drip", price: 400, category: "Wellness" },
  { id: "energy", name: "Energy Drip", price: 450, category: "Wellness" },
];

export interface Campaign {
  id: string;
  title: string;
  tag: string;
  month: string;
  description: string;
  image: string;
  color: "primary" | "accent" | "success";
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: "srh",
    title: "Sexual & Reproductive Health Awareness Month",
    tag: "SRH Awareness",
    month: "April 2026",
    description: "Your Health, Your Future. Tap to learn more about contraception, family planning and safe practices.",
    image: srhImg,
    color: "primary",
  },
  {
    id: "tb",
    title: "World TB Awareness — Learn. Protect. Prevent.",
    tag: "World TB Day",
    month: "March 2026",
    description: "Learn the signs of Tuberculosis, get screened and protect your community.",
    image: tbImg,
    color: "success",
  },
  {
    id: "student",
    title: "All Clinical Services — Only R50",
    tag: "R50 Student Special",
    month: "Year-round",
    description: "Show your valid university student card and access any clinical service for just R50. T&Cs apply.",
    image: studentImg,
    color: "accent",
  },
];

export { dripImg };

