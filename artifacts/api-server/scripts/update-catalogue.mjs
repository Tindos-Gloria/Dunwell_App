import sql from "mssql";
import { readFileSync } from "fs";

const config = {
  server: process.env["DB_SERVER"] || "dunwell.database.windows.net",
  port: Number(process.env["DB_PORT"] || 1433),
  database: process.env["DB_DATABASE"] || "Dunwell_Clinic",
  user: process.env["DB_USER"] || "dunwell",
  password: process.env["DB_PASSWORD"] || "",
  options: { encrypt: true, trustServerCertificate: false, connectTimeout: 30000, requestTimeout: 30000 },
};

const services = [
  // Contraception
  { type: "Contraception", name: "Family Planning (Injection)", price: 150, discount: 50 },
  { type: "Contraception", name: "Family Planning Pills",        price: 200, discount: 50 },
  { type: "Contraception", name: "Implanon Insertion",           price: 300, discount: 50 },
  { type: "Contraception", name: "Implanon Removal",             price: 350, discount: 50 },
  { type: "Contraception", name: "Emergency Pills",              price: 350, discount: 50 },

  // Sexual Health & HIV
  { type: "Sexual Health & HIV", name: "HIV PrEP",      price: 350, discount: 50 },
  { type: "Sexual Health & HIV", name: "HIV PEP",       price: 300, discount: 50 },
  { type: "Sexual Health & HIV", name: "HIV Test",      price: 100, discount: 50 },
  { type: "Sexual Health & HIV", name: "STI Treatment", price: 350, discount: 50 },
  { type: "Sexual Health & HIV", name: "HIV Care",      price: 300, discount: 50 },
  { type: "Sexual Health & HIV", name: "Pap Smear",     price: 300, discount: 50 },
  { type: "Sexual Health & HIV", name: "Prostate",      price: 300, discount: 50 },

  // General Health
  { type: "General Health", name: "Consultation",                price: 300, discount: 50 },
  { type: "General Health", name: "Follow-Up Consultation",      price: 150, discount: 50 },
  { type: "General Health", name: "Chronic Illness Management",  price: 300, discount: 50 },
  { type: "General Health", name: "Wound Care",                  price: 300, discount: 50 },
  { type: "General Health", name: "Stitch Removal",              price: 300, discount: 50 },
  { type: "General Health", name: "Pregnancy Test",              price: 50,  discount: 0  },
  { type: "General Health", name: "BP / Glucose Test",           price: 50,  discount: 0  },

  // Wellness & IV Therapy
  { type: "Wellness & IV Therapy", name: "Detox Drip",          price: 600, discount: 0 },
  { type: "Wellness & IV Therapy", name: "Glow Drip",           price: 500, discount: 0 },
  { type: "Wellness & IV Therapy", name: "Recovery Drip",       price: 400, discount: 0 },
  { type: "Wellness & IV Therapy", name: "Energy Drip",         price: 450, discount: 0 },
  { type: "Wellness & IV Therapy", name: "Glutathione Shots",   price: 200, discount: 0 },
  { type: "Wellness & IV Therapy", name: "Vitamins (B12/C)",    price: 50,  discount: 0 },
  { type: "Wellness & IV Therapy", name: "Acne Care / Skin Care", price: 300, discount: 0 },

  // Mental Health
  { type: "Mental Health", name: "Individual Session (1 Hour)",              price: 200, discount: 0 },
  { type: "Mental Health", name: "Couples Session (Per Hour)",               price: 350, discount: 0 },
  { type: "Mental Health", name: "Family Package — 4+ People (Per Hour)",   price: 150, discount: 0 },
];

async function run() {
  console.log("Connecting to Azure SQL...");
  const pool = await sql.connect(config);
  console.log("Connected.");

  // Clear existing catalogue
  await pool.request().query("DELETE FROM Catalogue");
  console.log("Cleared existing catalogue.");

  // Insert new services
  for (const svc of services) {
    await pool.request()
      .input("type",     sql.NVarChar(100), svc.type)
      .input("name",     sql.NVarChar(200), svc.name)
      .input("price",    sql.Decimal(10,2),  svc.price)
      .input("discount", sql.Decimal(10,2),  svc.discount)
      .query("INSERT INTO Catalogue (Type, Name, Price, discount) VALUES (@type, @name, @price, @discount)");
    console.log(`  ✓ ${svc.type} — ${svc.name} (R${svc.price})`);
  }

  console.log(`\nDone! Inserted ${services.length} services.`);
  await pool.close();
}

run().catch((err) => { console.error("Error:", err.message); process.exit(1); });
