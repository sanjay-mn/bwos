const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const PROJECT_FILES_DIR = path.join(DATA_DIR, "project-files");
const LEGACY_JSON_PATH = path.join(DATA_DIR, "brahmworks-db.json");
const SQLITE_PATH = path.join(DATA_DIR, "brahmworks.sqlite");
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const LOGO_PUBLIC_URL = "/assets/bw-logo-white.png";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const DEFAULT_SERVICES = [
  "Mechanical Design",
  "Electronics Design",
  "Industrial Design",
  "Documentation",
  "Shipping Charges",
  "Integration",
  "Feed Study Analysis",
];
const DAILY_RATE_REFRESH_MS = 1000 * 60 * 60 * 24;
const DEFAULT_USD_INR = 84;
const BRAHMWORKS_HOME_STATE = process.env.BRAHMWORKS_GST_STATE || "Tamil Nadu";
const DEFAULT_GST_RATE = Number(process.env.BRAHMWORKS_GST_RATE || 18);
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const RAZORPAY_API_HOST = "api.razorpay.com";

const RATE_DEFAULTS = {
  FX_USD_INR: {
    kind: "fx",
    label: "USD/INR",
    currency: "INR",
    unit: "fx",
    rate: DEFAULT_USD_INR,
    sourceUrl: "https://www.xe.com/currencyconverter/convert/?Amount=1&From=USD&To=INR",
    sourceNote: "Fallback FX rate for supplier-price conversion",
  },
  MAT_ALUMINUM_6061: {
    kind: "material",
    label: "Aluminum 6061",
    currency: "INR",
    unit: "kg",
    rate: 260,
    difficultyFactor: 1,
    sourceUrl: "https://www.made-in-china.com/products-search/hot-china-products/Aluminum_6061_Price.html",
    sourceNote: "Supplier listings around US$2.0-3.8/kg converted to INR",
  },
  MAT_TITANIUM_GRADE_5: {
    kind: "material",
    label: "Titanium Grade 5",
    currency: "INR",
    unit: "kg",
    rate: 1550,
    difficultyFactor: 1.55,
    sourceUrl: "https://www.made-in-china.com/products-search/hot-china-products/Titanium_Bar_Price.html",
    sourceNote: "Supplier listings around US$15-20/kg converted to INR",
  },
  PROC_CNC_HOURLY: {
    kind: "process",
    label: "CNC Hourly Rate",
    currency: "INR",
    unit: "hour",
    rate: 1400,
    sourceUrl: "https://www.xometry.com/resources/calculating-the-cost-of-cnc-machining-custom-parts/",
    sourceNote: "Calibrated shop hourly burden using industry cost-factor guidance",
  },
  PROC_SHEET_HOURLY: {
    kind: "process",
    label: "Sheet Metal Hourly Rate",
    currency: "INR",
    unit: "hour",
    rate: 950,
    sourceUrl: "https://www.xometry.com/resources/sheet/sheet-metal-fabrication-cost-calculator/",
    sourceNote: "Calibrated shop hourly burden using industry cost-factor guidance",
  },
  PROC_INJECTION_HOURLY: {
    kind: "process",
    label: "Injection Molding Hourly Rate",
    currency: "INR",
    unit: "hour",
    rate: 1850,
    sourceUrl: "https://www.protolabs.com/resources/design-tips/11-tips-to-reduce-injection-molding-costs/",
    sourceNote: "Calibrated machine-hour burden using injection cost-factor guidance",
  },
  PROC_PRINT_HOURLY: {
    kind: "process",
    label: "3D Printing Hourly Rate",
    currency: "INR",
    unit: "hour",
    rate: 1100,
    sourceUrl: "https://www.xometry.com/resources/3d-printing/selective-laser-sintering-pricing/",
    sourceNote: "Calibrated additive manufacturing machine-hour burden using industry cost-factor guidance",
  },
};

const MATERIAL_RATE_CATALOG = {
  Aluminum: {
    "6061": { rate: 260, difficultyFactor: 1 },
    "7075": { rate: 420, difficultyFactor: 1.12 },
    "5052": { rate: 240, difficultyFactor: 0.98 },
    "2024": { rate: 390, difficultyFactor: 1.08 },
  },
  "Stainless Steel": {
    "304": { rate: 290, difficultyFactor: 1.2 },
    "316 / 316L": { rate: 360, difficultyFactor: 1.24 },
    "303": { rate: 275, difficultyFactor: 1.14 },
    "17-4 PH": { rate: 470, difficultyFactor: 1.32 },
  },
  Brass: {
    C360: { rate: 540, difficultyFactor: 0.95 },
    C260: { rate: 570, difficultyFactor: 0.98 },
  },
  Copper: {
    C101: { rate: 860, difficultyFactor: 1.02 },
    C110: { rate: 820, difficultyFactor: 1.02 },
  },
  Titanium: {
    "Grade 2": { rate: 1180, difficultyFactor: 1.4 },
    "Grade 5": { rate: 1550, difficultyFactor: 1.55 },
  },
  "Mild Steel": {
    "1018": { rate: 95, difficultyFactor: 1.04 },
    A36: { rate: 88, difficultyFactor: 1.04 },
  },
  "Alloy Steel": {
    "4140": { rate: 145, difficultyFactor: 1.16 },
    "4340": { rate: 175, difficultyFactor: 1.2 },
  },
  "Tool Steel": {
    D2: { rate: 290, difficultyFactor: 1.28 },
    A2: { rate: 255, difficultyFactor: 1.24 },
  },
  ABS: {
    ABS: { rate: 185, difficultyFactor: 0.9 },
  },
  Polycarbonate: {
    PC: { rate: 260, difficultyFactor: 0.96 },
  },
  Nylon: {
    PA6: { rate: 240, difficultyFactor: 0.95 },
    PA66: { rate: 260, difficultyFactor: 0.96 },
  },
  Polypropylene: {
    PP: { rate: 165, difficultyFactor: 0.88 },
  },
  POM: {
    "Delrin / POM": { rate: 255, difficultyFactor: 0.92 },
  },
  PTFE: {
    PTFE: { rate: 620, difficultyFactor: 1 },
  },
  PMMA: {
    Acrylic: { rate: 210, difficultyFactor: 0.9 },
  },
  PEEK: {
    PEEK: { rate: 4200, difficultyFactor: 1.15 },
  },
  FR4: {
    FR4: { rate: 240, difficultyFactor: 1.08 },
  },
  "Carbon Fiber": {
    "Carbon Fiber Plate": { rate: 3200, difficultyFactor: 1.3 },
  },
  POM_GENERIC: {
    POM: { rate: 255, difficultyFactor: 0.92 },
  },
  PP: {
    PP: { rate: 165, difficultyFactor: 0.88 },
  },
  PE: {
    HDPE: { rate: 175, difficultyFactor: 0.9 },
    LDPE: { rate: 165, difficultyFactor: 0.88 },
  },
  PS: {
    PS: { rate: 170, difficultyFactor: 0.9 },
  },
  TPU: {
    TPU: { rate: 330, difficultyFactor: 0.95 },
  },
  PLA: {
    PLA: { rate: 165, difficultyFactor: 0.84 },
  },
  PETG: {
    PETG: { rate: 220, difficultyFactor: 0.9 },
  },
  Resin: {
    "Standard Resin": { rate: 480, difficultyFactor: 0.92 },
    "Tough Resin": { rate: 620, difficultyFactor: 0.96 },
  },
  PVC: {
    PVC: { rate: 150, difficultyFactor: 0.9 },
  },
  "PC / ABS": {
    "PC / ABS": { rate: 255, difficultyFactor: 0.95 },
  },
};

const YES_NO_OPTIONS = [
  { value: "No", label: "No" },
  { value: "Yes", label: "Yes" },
];

const QUOTE_CONFIG = {
  designUnits: [
    { value: "mm", label: "Millimeters (mm)" },
    { value: "inch", label: "Inches (in)" },
    { value: "cm", label: "Centimeters (cm)" },
  ],
  quoteUnits: [
    { value: "pcs", label: "Pieces" },
    { value: "sets", label: "Sets" },
  ],
  processes: {
    "CNC Machining": {
      materialFamilies: [
        { value: "Aluminum", grades: ["6061", "7075", "5052", "2024"] },
        { value: "Stainless Steel", grades: ["304", "316 / 316L", "303", "17-4 PH"] },
        { value: "Brass", grades: ["C360", "C260"] },
        { value: "Copper", grades: ["C101", "C110"] },
        { value: "Titanium", grades: ["Grade 2", "Grade 5"] },
        { value: "Mild Steel", grades: ["1018", "A36"] },
        { value: "Alloy Steel", grades: ["4140", "4340"] },
        { value: "Tool Steel", grades: ["D2", "A2"] },
        { value: "ABS", grades: ["ABS"] },
        { value: "Polycarbonate", grades: ["PC"] },
        { value: "Nylon", grades: ["PA6", "PA66"] },
        { value: "Polypropylene", grades: ["PP"] },
        { value: "POM", grades: ["Delrin / POM"] },
        { value: "PTFE", grades: ["PTFE"] },
        { value: "PMMA", grades: ["Acrylic"] },
        { value: "PEEK", grades: ["PEEK"] },
        { value: "FR4", grades: ["FR4"] },
        { value: "Carbon Fiber", grades: ["Carbon Fiber Plate"] },
      ],
      fields: [
        { key: "manufacturingProcess", label: "Manufacturing Process", type: "select", options: ["Milling", "Turning", "Mill-Turn"] },
        { key: "materialFamily", label: "Material Family", type: "material-family" },
        { key: "materialGrade", label: "Material Grade", type: "material-grade" },
        {
          key: "surfaceFinish",
          label: "Surface Finish",
          type: "select",
          options: ["Standard (As-Machined)", "Anodized", "Bead Blast + Anodized", "Brushed", "Spray Paint - Matt", "Spray Paint - High Gloss", "#1000 Sanding"],
        },
        { key: "toleranceClass", label: "Tolerance", type: "select", options: ["Standard (ISO 2768-1)", "Tight Tolerance Required"] },
        { key: "surfaceRoughness", label: "Surface Roughness", type: "select", options: ["Standard", "Ra 6.3 um", "Ra 3.2 um", "Ra 1.6 um"] },
        { key: "threads", label: "Tapped Holes / Threads", type: "select", options: YES_NO_OPTIONS },
        { key: "inserts", label: "Inserts", type: "select", options: YES_NO_OPTIONS },
        { key: "partMarking", label: "Part Marking", type: "select", options: ["None", "Silkscreen", "Laser Engraving"] },
        {
          key: "inspectionLevel",
          label: "Inspection",
          type: "select",
          options: ["Standard Inspection", "Standard Inspection with Formal Report", "CMM Inspection with Formal Report", "Source Material Certification"],
        },
        { key: "appearanceGrade", label: "Finished Appearance", type: "select", options: ["Standard", "Premium"] },
      ],
    },
    "Sheet Metal": {
      materialFamilies: [
        { value: "Aluminum", grades: ["5052", "6061"] },
        { value: "Stainless Steel", grades: ["304", "316"] },
        { value: "Mild Steel", grades: ["CRCA", "HRPO"] },
        { value: "Copper", grades: ["C110"] },
      ],
      fields: [
        { key: "manufacturingProcess", label: "Manufacturing Process", type: "select", options: ["Laser Cutting", "Bending", "Laser Cutting + Bending"] },
        { key: "materialFamily", label: "Material Family", type: "material-family" },
        { key: "materialGrade", label: "Material Grade", type: "material-grade" },
        { key: "sheetThickness", label: "Thickness", type: "select", options: ["1.0 mm", "1.5 mm", "2.0 mm", "3.0 mm", "4.0 mm", "5.0 mm"] },
        { key: "surfaceFinish", label: "Surface Finish", type: "select", options: ["As Cut", "Powder Coated", "Brushed", "Bead Blasted", "Anodized", "Sanded"] },
        { key: "toleranceClass", label: "Tolerance", type: "select", options: ["Standard", "Tight Tolerance Required"] },
        { key: "welding", label: "Welding", type: "select", options: ["None", "Spot Weld", "Full Weld"] },
        { key: "inserts", label: "PEM Inserts / Tapped Holes", type: "select", options: ["None", "Required"] },
        { key: "partMarking", label: "Part Marking", type: "select", options: ["None", "Silkscreen", "Laser Engraving"] },
        {
          key: "inspectionLevel",
          label: "Inspection",
          type: "select",
          options: ["Standard Inspection", "Standard Inspection with Formal Report", "CMM Inspection with Formal Report", "Source Material Certification"],
        },
        { key: "appearanceGrade", label: "Finished Appearance", type: "select", options: ["Standard", "Premium"] },
      ],
    },
    "Injection Molding": {
      materialFamilies: [
        { value: "ABS", grades: ["ABS"] },
        { value: "POM", grades: ["POM"] },
        { value: "Nylon", grades: ["PA6", "PA66"] },
        { value: "Polycarbonate", grades: ["PC"] },
        { value: "PC / ABS", grades: ["PC / ABS"] },
        { value: "PVC", grades: ["PVC"] },
        { value: "PE", grades: ["HDPE", "LDPE"] },
        { value: "PP", grades: ["PP"] },
        { value: "PS", grades: ["PS"] },
        { value: "TPU", grades: ["TPU"] },
      ],
      fields: [
        { key: "materialFamily", label: "Material Family", type: "material-family" },
        { key: "materialGrade", label: "Material Grade", type: "material-grade" },
        { key: "colorChoice", label: "Color", type: "select", options: ["Natural", "Black", "White", "Grey", "Blue", "Red", "Custom Match"] },
        { key: "spiFinish", label: "SPI Finish", type: "select", options: ["SPI A-1", "SPI A-2", "SPI B-1", "SPI B-2", "SPI C-1", "SPI C-2", "SPI D-2", "SPI D-3"] },
        { key: "toolRequirement", label: "Tool Requirement", type: "select", options: ["Order a New Mold", "Use Existing Mold"] },
        { key: "annualVolume", label: "Expected Annual Volume", type: "select", options: ["<= 10,000", "10,000 - 50,000", "50,000 - 100,000", ">= 100,000"] },
        { key: "materialAdditive", label: "Material Additive", type: "select", options: ["None", "UV Stabilized", "Glass Filled", "Flame Retardant"] },
        {
          key: "inspectionLevel",
          label: "Inspection",
          type: "select",
          options: ["Standard Inspection", "Standard Inspection with Formal Report", "CMM Inspection with Formal Report", "Source Material Certification"],
        },
        { key: "appearanceGrade", label: "Finished Appearance", type: "select", options: ["Standard", "Premium"] },
      ],
    },
    "3D Printing": {
      materialFamilies: [
        { value: "PLA", grades: ["PLA"] },
        { value: "ABS", grades: ["ABS"] },
        { value: "PETG", grades: ["PETG"] },
        { value: "Nylon", grades: ["PA12", "PA6"] },
        { value: "Resin", grades: ["Standard Resin", "Tough Resin"] },
        { value: "TPU", grades: ["TPU"] },
      ],
      fields: [
        { key: "manufacturingProcess", label: "Printing Technology", type: "select", options: ["FDM", "SLA", "SLS", "MJF", "DMLS", "PolyJet"] },
        { key: "materialFamily", label: "Material Family", type: "material-family" },
        { key: "materialGrade", label: "Material Grade", type: "material-grade" },
        { key: "layerResolution", label: "Layer Resolution", type: "select", options: ["Standard", "Fine", "High Detail"] },
        { key: "surfaceFinish", label: "Surface Finish", type: "select", options: ["As Printed", "Sanded", "Vapor Smoothed", "Painted", "Dyed"] },
        { key: "infillDensity", label: "Infill / Build Style", type: "select", options: ["Standard", "High Strength", "Solid", "Hollow"] },
        { key: "supportRemoval", label: "Support Removal", type: "select", options: ["Standard", "Cosmetic"] },
        {
          key: "inspectionLevel",
          label: "Inspection",
          type: "select",
          options: ["Standard Inspection", "Standard Inspection with Formal Report", "CMM Inspection with Formal Report"],
        },
        { key: "appearanceGrade", label: "Finished Appearance", type: "select", options: ["Standard", "Premium"] },
      ],
    },
  },
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".step": "text/plain; charset=utf-8",
  ".stp": "text/plain; charset=utf-8",
  ".stl": "model/stl",
  ".gbr": "text/plain; charset=utf-8",
  ".ger": "text/plain; charset=utf-8",
  ".gtl": "text/plain; charset=utf-8",
  ".gbl": "text/plain; charset=utf-8",
  ".gto": "text/plain; charset=utf-8",
  ".gbo": "text/plain; charset=utf-8",
  ".gts": "text/plain; charset=utf-8",
  ".gbs": "text/plain; charset=utf-8",
  ".drl": "text/plain; charset=utf-8",
  ".bom": "text/plain; charset=utf-8",
  ".jsonl": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const ROLE_PERMISSIONS = {
  Admin: {
    screens: ["overview", "quotes", "requests", "inventory", "suppliers", "purchaseOrders", "customers", "projects", "projectWorkspace", "reports", "profile", "users", "logistics", "blogs"],
    actions: [
      "profile.view",
      "profile.edit",
      "users.manage",
      "logistics.manage",
      "quotes.view",
      "quotes.manage",
      "inventory.view",
      "inventory.create",
      "inventory.edit",
      "inventory.delete",
      "inventory.adjust",
      "suppliers.view",
      "suppliers.create",
      "suppliers.edit",
      "suppliers.delete",
      "suppliers.bank.edit",
      "purchaseOrders.view",
      "purchaseOrders.create",
      "purchaseOrders.edit",
      "purchaseOrders.delete",
      "purchaseOrders.receive",
      "projects.view",
      "projects.manage",
      "documents.export",
    ],
  },
  Operations: {
    screens: ["overview", "quotes", "requests", "inventory", "suppliers", "customers", "projects", "projectWorkspace", "reports", "profile", "blogs"],
    actions: [
      "profile.view",
      "profile.edit",
      "quotes.view",
      "quotes.manage",
      "inventory.view",
      "inventory.create",
      "inventory.edit",
      "inventory.adjust",
      "suppliers.view",
      "suppliers.edit",
      "suppliers.bank.edit",
      "purchaseOrders.view",
      "purchaseOrders.receive",
      "projects.view",
      "projects.manage",
      "documents.export",
    ],
  },
  Procurement: {
    screens: ["overview", "quotes", "requests", "inventory", "suppliers", "purchaseOrders", "customers", "projects", "projectWorkspace", "reports", "profile", "blogs"],
    actions: [
      "profile.view",
      "profile.edit",
      "quotes.view",
      "quotes.manage",
      "inventory.view",
      "inventory.edit",
      "suppliers.view",
      "suppliers.create",
      "suppliers.edit",
      "suppliers.delete",
      "suppliers.bank.edit",
      "purchaseOrders.view",
      "purchaseOrders.create",
      "purchaseOrders.edit",
      "purchaseOrders.delete",
      "projects.view",
      "projects.manage",
      "documents.export",
    ],
  },
  Customer: {
    screens: ["quotes", "requests", "blogs", "profile"],
    actions: ["profile.view", "profile.edit", "quotes.view"],
  },
};

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function createUser(name, email, role, password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    id: crypto.randomUUID(),
    name,
    email,
    role,
    salt,
    passwordHash: hashPassword(password, salt),
  };
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function optionValueOf(option) {
  return typeof option === "string" ? option : option?.value;
}

function normalizeChoice(value, allowedValues, fallback = "") {
  const normalized = String(value || "").trim();
  if (allowedValues.includes(normalized)) return normalized;
  return fallback || allowedValues[0] || "";
}

function getQuoteConfig() {
  return deepClone(QUOTE_CONFIG);
}

function getProcessQuoteConfig(process) {
  return QUOTE_CONFIG.processes[process] || QUOTE_CONFIG.processes["CNC Machining"];
}

function getMaterialFamilyConfig(process, familyValue) {
  return (getProcessQuoteConfig(process).materialFamilies || []).find((family) => family.value === familyValue) || null;
}

function buildMaterialLabel(materialFamily, materialGrade) {
  return [String(materialFamily || "").trim(), String(materialGrade || "").trim()].filter(Boolean).join(" - ");
}

function normalizeQuoteSelections(process, selections = {}) {
  const processConfig = getProcessQuoteConfig(process);
  const normalized = {};
  const firstFamily = processConfig.materialFamilies?.[0]?.value || "";
  const materialFamily = normalizeChoice(
    selections.materialFamily,
    (processConfig.materialFamilies || []).map((family) => family.value),
    firstFamily,
  );
  const familyConfig = getMaterialFamilyConfig(process, materialFamily);
  const firstGrade = familyConfig?.grades?.[0] || "";

  normalized.materialFamily = materialFamily;
  normalized.materialGrade = normalizeChoice(selections.materialGrade, familyConfig?.grades || [], firstGrade);

  (processConfig.fields || []).forEach((field) => {
    if (field.key === "materialFamily" || field.key === "materialGrade") return;
    if (field.type === "select") {
      const allowedValues = (field.options || []).map(optionValueOf);
      normalized[field.key] = normalizeChoice(selections[field.key], allowedValues, allowedValues[0] || "");
    }
  });

  return normalized;
}

function createMaterialRateKey(materialFamily, materialGrade) {
  return `MAT_${String(materialFamily || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")}_${String(materialGrade || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")}`;
}

function getCatalogMaterialRate(materialFamily, materialGrade) {
  const familyCatalog = MATERIAL_RATE_CATALOG[materialFamily] || null;
  if (familyCatalog && familyCatalog[materialGrade]) return familyCatalog[materialGrade];
  return null;
}

function upsertPricingRate(key, value) {
  const now = new Date().toISOString();
  runSql(`
    INSERT INTO pricing_rate_snapshots (
      key, kind, label, currency, unit, rate, difficulty_factor, source_url, source_note, updated_at
    ) VALUES (
      ${sqlValue(key)},
      ${sqlValue(String(value.kind || ""))},
      ${sqlValue(String(value.label || key))},
      ${sqlValue(String(value.currency || "INR"))},
      ${sqlValue(String(value.unit || ""))},
      ${sqlValue(Number(value.rate || 0))},
      ${sqlValue(value.difficultyFactor === undefined ? null : Number(value.difficultyFactor || 0))},
      ${sqlValue(String(value.sourceUrl || ""))},
      ${sqlValue(String(value.sourceNote || ""))},
      ${sqlValue(now)}
    )
    ON CONFLICT(key) DO UPDATE SET
      kind = excluded.kind,
      label = excluded.label,
      currency = excluded.currency,
      unit = excluded.unit,
      rate = excluded.rate,
      difficulty_factor = excluded.difficulty_factor,
      source_url = excluded.source_url,
      source_note = excluded.source_note,
      updated_at = excluded.updated_at;
  `);
}

function seedPricingRates() {
  Object.entries(RATE_DEFAULTS).forEach(([key, value]) => upsertPricingRate(key, value));
}

function getPricingRateSnapshot(key) {
  return getRow(`
    SELECT key, kind, label, currency, unit, rate, difficulty_factor AS difficultyFactor,
      source_url AS sourceUrl, source_note AS sourceNote, updated_at AS updatedAt
    FROM pricing_rate_snapshots
    WHERE key = ${sqlValue(key)}
    LIMIT 1;
  `);
}

function getMaterialRate(materialFamily, materialGrade) {
  const key = createMaterialRateKey(materialFamily, materialGrade);
  const snapshot = getPricingRateSnapshot(key);
  if (snapshot?.rate) {
    return {
      rate: Number(snapshot.rate),
      difficultyFactor: Number(snapshot.difficultyFactor || 1),
      sourceUrl: snapshot.sourceUrl || "",
      sourceNote: snapshot.sourceNote || "",
      updatedAt: snapshot.updatedAt || "",
    };
  }
  const catalogRate = getCatalogMaterialRate(materialFamily, materialGrade);
  if (catalogRate) return { ...catalogRate, sourceUrl: "", sourceNote: "", updatedAt: "" };
  const fallback = getPricingRateSnapshot("MAT_ALUMINUM_6061");
  return {
    rate: Number(fallback?.rate || 260),
    difficultyFactor: Number(fallback?.difficultyFactor || 1),
    sourceUrl: fallback?.sourceUrl || "",
    sourceNote: fallback?.sourceNote || "",
    updatedAt: fallback?.updatedAt || "",
  };
}

function getProcessHourlyRate(process) {
  const key =
    process === "Injection Molding"
      ? "PROC_INJECTION_HOURLY"
      : process === "3D Printing"
        ? "PROC_PRINT_HOURLY"
      : process === "Sheet Metal"
        ? "PROC_SHEET_HOURLY"
        : "PROC_CNC_HOURLY";
  const snapshot = getPricingRateSnapshot(key);
  return Number(snapshot?.rate || RATE_DEFAULTS[key].rate);
}

function fetchUrlText(targetUrl) {
  return new Promise((resolve, reject) => {
    const client = targetUrl.startsWith("https://") ? https : http;
    client
      .get(targetUrl, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          response.resume();
          fetchUrlText(response.headers.location).then(resolve).catch(reject);
          return;
        }
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`Unexpected status ${response.statusCode} for ${targetUrl}`));
          return;
        }
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

function extractUsdPrices(text, limit = 10) {
  const matches = [...String(text || "").matchAll(/US\$\s*([0-9]+(?:\.[0-9]+)?)/g)];
  return matches
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 1000)
    .slice(0, limit);
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function refreshPricingRates() {
  try {
    const [aluminumPage, titaniumPage] = await Promise.all([
      fetchUrlText(RATE_DEFAULTS.MAT_ALUMINUM_6061.sourceUrl),
      fetchUrlText(RATE_DEFAULTS.MAT_TITANIUM_GRADE_5.sourceUrl),
    ]);

    const aluminumPrices = extractUsdPrices(aluminumPage, 8).filter((value) => value >= 2 && value <= 5);
    const titaniumPrices = extractUsdPrices(titaniumPage, 8).filter((value) => value >= 10 && value <= 30);
    const usdInr = Number(getPricingRateSnapshot("FX_USD_INR")?.rate || DEFAULT_USD_INR);

    if (aluminumPrices.length) {
      upsertPricingRate("MAT_ALUMINUM_6061", {
        ...RATE_DEFAULTS.MAT_ALUMINUM_6061,
        rate: Math.round(average(aluminumPrices) * usdInr),
        sourceNote: `Auto-refreshed from supplier listings (${aluminumPrices.length} matches)`,
      });
    }
    if (titaniumPrices.length) {
      upsertPricingRate("MAT_TITANIUM_GRADE_5", {
        ...RATE_DEFAULTS.MAT_TITANIUM_GRADE_5,
        rate: Math.round(average(titaniumPrices) * usdInr),
        sourceNote: `Auto-refreshed from supplier listings (${titaniumPrices.length} matches)`,
      });
    }

    const refreshedAluminum = Number(getPricingRateSnapshot("MAT_ALUMINUM_6061")?.rate || RATE_DEFAULTS.MAT_ALUMINUM_6061.rate);
    const refreshedTitanium = Number(getPricingRateSnapshot("MAT_TITANIUM_GRADE_5")?.rate || RATE_DEFAULTS.MAT_TITANIUM_GRADE_5.rate);

    if (MATERIAL_RATE_CATALOG.Aluminum?.["6061"]) MATERIAL_RATE_CATALOG.Aluminum["6061"].rate = refreshedAluminum;
    if (MATERIAL_RATE_CATALOG.Titanium?.["Grade 5"]) MATERIAL_RATE_CATALOG.Titanium["Grade 5"].rate = refreshedTitanium;
  } catch (error) {
    console.error("Pricing rate refresh failed:", error.message);
  }
}

function seedDatabase() {
  const suppliers = [
    {
      id: crypto.randomUUID(),
      name: "Metro Metals",
      contactPerson: "Nitin Shah",
      email: "orders@metrometals.in",
      phone: "+91 22 4000 2100",
      city: "Mumbai",
      leadTimeDays: 5,
      rating: 4.8,
    },
    {
      id: crypto.randomUUID(),
      name: "Axis Motion",
      contactPerson: "Rhea Kamat",
      email: "supply@axismotion.in",
      phone: "+91 80 4120 8821",
      city: "Bengaluru",
      leadTimeDays: 8,
      rating: 4.5,
    },
    {
      id: crypto.randomUUID(),
      name: "Nova Systems",
      contactPerson: "Aditya Menon",
      email: "parts@novasystems.in",
      phone: "+91 44 3100 1199",
      city: "Chennai",
      leadTimeDays: 6,
      rating: 4.7,
    },
  ];

  const inventory = [
    {
      id: crypto.randomUUID(),
      name: "Copper Coil",
      sku: "BW-CC-101",
      category: "Raw Materials",
      quantity: 42,
      threshold: 15,
      cost: 1250,
      supplierId: suppliers[0].id,
      location: "Rack A1",
      unit: "kg",
      lastUpdated: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: "Servo Motor",
      sku: "BW-SM-208",
      category: "Components",
      quantity: 8,
      threshold: 10,
      cost: 4850,
      supplierId: suppliers[1].id,
      location: "Rack C2",
      unit: "pcs",
      lastUpdated: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: "Control Panel",
      sku: "BW-CP-332",
      category: "Assemblies",
      quantity: 18,
      threshold: 6,
      cost: 9200,
      supplierId: suppliers[2].id,
      location: "Rack F4",
      unit: "pcs",
      lastUpdated: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: "Hydraulic Valve",
      sku: "BW-HV-415",
      category: "Components",
      quantity: 13,
      threshold: 7,
      cost: 3600,
      supplierId: suppliers[2].id,
      location: "Rack D3",
      unit: "pcs",
      lastUpdated: new Date().toISOString(),
    },
  ];

  const users = [
    createUser("Aarav Mehta", "admin@brahmworks.com", "Admin", "brahmworks123"),
    createUser("Ira Nair", "ops@brahmworks.com", "Operations", "ops12345"),
    createUser("Dev Kapoor", "procurement@brahmworks.com", "Procurement", "purchase123"),
  ];

  const purchaseOrders = [
    {
      id: crypto.randomUUID(),
      poNumber: "PO-2026-041",
      supplierId: suppliers[1].id,
      status: "Pending",
      orderDate: "2026-04-03",
      expectedDate: "2026-04-10",
      notes: "Priority replenishment for April builds",
      createdBy: users[2].name,
      items: [{ inventoryId: inventory[1].id, name: inventory[1].name, quantity: 20, cost: 4700 }],
    },
    {
      id: crypto.randomUUID(),
      poNumber: "PO-2026-039",
      supplierId: suppliers[0].id,
      status: "Received",
      orderDate: "2026-03-28",
      expectedDate: "2026-04-02",
      notes: "Received in full",
      createdBy: users[2].name,
      items: [{ inventoryId: inventory[0].id, name: inventory[0].name, quantity: 55, cost: 1180 }],
    },
  ];

  const movements = [
    {
      id: crypto.randomUUID(),
      inventoryId: inventory[1].id,
      itemName: inventory[1].name,
      sku: inventory[1].sku,
      type: "out",
      quantity: 4,
      note: "Allocated to assembly line",
      createdBy: users[1].name,
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      inventoryId: inventory[0].id,
      itemName: inventory[0].name,
      sku: inventory[0].sku,
      type: "in",
      quantity: 12,
      note: "Received from Metro Metals",
      createdBy: users[2].name,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    },
  ];

  return {
    users,
    sessions: [],
    suppliers,
    inventory,
    purchaseOrders,
    movements,
  };
}

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PROJECT_FILES_DIR)) {
    fs.mkdirSync(PROJECT_FILES_DIR, { recursive: true });
  }
}

function sqlValue(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function runSql(sql, jsonMode = false) {
  const args = [];
  if (jsonMode) args.push("-json");
  args.push(SQLITE_PATH);
  const output = execFileSync("sqlite3", args, {
    input: `PRAGMA foreign_keys = ON;\n${sql}`,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 24,
  });
  return jsonMode ? JSON.parse(output || "[]") : output;
}

function getRow(sql) {
  const rows = runSql(sql, true);
  return rows[0] || null;
}

function getRows(sql) {
  return runSql(sql, true);
}

function hasColumn(tableName, columnName) {
  return getRows(`PRAGMA table_info(${tableName});`).some((column) => column.name === columnName);
}

function initSqlite() {
  ensureDataDirectory();
  const shouldCreate = !fs.existsSync(SQLITE_PATH);

  runSql(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        customer_id TEXT,
        salt TEXT NOT NULL,
        password_hash TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        customer_id TEXT,
        status TEXT DEFAULT 'Active',
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS project_services (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS project_documents (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        original_name TEXT NOT NULL,
        storage_name TEXT NOT NULL,
        mime_type TEXT,
        file_size INTEGER,
        notes TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS quote_requests (
        id TEXT PRIMARY KEY,
        reference_code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        company TEXT,
        email TEXT NOT NULL,
        phone TEXT,
        customer_id TEXT,
        process TEXT NOT NULL,
        material TEXT,
        finish TEXT,
        color TEXT,
        tolerance TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        units TEXT,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'New',
        estimate_currency TEXT,
        estimate_low REAL,
        estimate_high REAL,
        estimated_lead_days INTEGER,
        admin_notes TEXT,
        original_name TEXT NOT NULL,
        storage_name TEXT NOT NULL,
        mime_type TEXT,
        file_size INTEGER,
        review_data TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS quote_orders (
        id TEXT PRIMARY KEY,
        quote_request_id TEXT NOT NULL UNIQUE,
        customer_id TEXT,
        status TEXT NOT NULL DEFAULT 'Draft',
        payment_status TEXT NOT NULL DEFAULT 'Pending',
        currency TEXT NOT NULL DEFAULT 'INR',
        review_result TEXT,
        engineering_decision TEXT,
        end_use TEXT,
        delivery_speed TEXT,
        delivery_date TEXT,
        t0_sample_date TEXT,
        production_delivery_date TEXT,
        shipping_method TEXT,
        incoterm TEXT,
        shipping_scope TEXT,
        importer_model TEXT,
        importer_name TEXT,
        importer_tax_id TEXT,
        gstin TEXT,
        tax_mode TEXT,
        billing_name TEXT,
        shipping_name TEXT,
        shipping_phone TEXT,
        shipping_company TEXT,
        address_line1 TEXT,
        address_line2 TEXT,
        city TEXT,
        state TEXT,
        postal_code TEXT,
        country TEXT,
        notes TEXT,
        commercial_notes TEXT,
        part_unit_price REAL,
        part_subtotal REAL,
        moq INTEGER,
        batch_quantity INTEGER,
        inspection_option TEXT,
        finish_confirmation TEXT,
        mold_type TEXT,
        cavity_count INTEGER,
        tool_material TEXT,
        texture_finish TEXT,
        sample_rounds INTEGER,
        t0_sample_plan TEXT,
        production_quantity INTEGER,
        tool_lead_days INTEGER,
        production_lead_days INTEGER,
        tooling_cost REAL,
        manufacturing_subtotal REAL,
        shipping_cost REAL,
        duties_cost REAL,
        duty_rate REAL,
        tax_rate REAL,
        tax_amount REAL,
        total_amount REAL,
        summary_data TEXT,
        razorpay_order_id TEXT,
        razorpay_payment_id TEXT,
        razorpay_signature TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS pricing_rate_snapshots (
        key TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        label TEXT NOT NULL,
        currency TEXT NOT NULL,
        unit TEXT,
        rate REAL NOT NULL,
        difficulty_factor REAL,
        source_url TEXT,
        source_note TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        customer_id TEXT,
        project_id TEXT,
        industry TEXT,
        approval_status TEXT DEFAULT 'Not Approved',
        bank_details TEXT,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        city TEXT,
        lead_time_days INTEGER,
        rating REAL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        customer_id TEXT,
        project_id TEXT,
        quantity INTEGER NOT NULL,
        threshold_value INTEGER NOT NULL,
        cost REAL NOT NULL,
        supplier_id TEXT,
        location TEXT,
        unit TEXT,
        last_updated TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id TEXT PRIMARY KEY,
        po_number TEXT NOT NULL UNIQUE,
        supplier_id TEXT,
        customer_id TEXT,
        project_id TEXT,
        status TEXT NOT NULL,
        order_date TEXT NOT NULL,
        expected_date TEXT,
        notes TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id TEXT PRIMARY KEY,
        po_id TEXT NOT NULL,
        inventory_id TEXT,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        cost REAL NOT NULL
      );
      CREATE TABLE IF NOT EXISTS movements (
        id TEXT PRIMARY KEY,
        inventory_id TEXT,
        item_name TEXT NOT NULL,
        sku TEXT,
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        note TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoice_number TEXT NOT NULL UNIQUE,
        po_id TEXT NOT NULL UNIQUE,
        supplier_id TEXT,
        status TEXT NOT NULL,
        issue_date TEXT NOT NULL,
        due_date TEXT,
        total_value REAL NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS grns (
        id TEXT PRIMARY KEY,
        grn_number TEXT NOT NULL UNIQUE,
        po_id TEXT NOT NULL UNIQUE,
        received_date TEXT NOT NULL,
        received_by TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS delivery_challans (
        id TEXT PRIMARY KEY,
        challan_number TEXT NOT NULL UNIQUE,
        challan_type TEXT NOT NULL,
        po_id TEXT,
        customer_id TEXT,
        project_id TEXT,
        recipient_name TEXT NOT NULL,
        recipient_company TEXT NOT NULL,
        destination TEXT NOT NULL,
        vehicle_number TEXT,
        notes TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS packaging_documents (
        id TEXT PRIMARY KEY,
        packaging_number TEXT NOT NULL UNIQUE,
        challan_id TEXT NOT NULL,
        customer_id TEXT,
        project_id TEXT,
        package_count INTEGER NOT NULL,
        gross_weight REAL,
        net_weight REAL,
        contents TEXT,
        notes TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

  DEFAULT_SERVICES.forEach((serviceName) => {
    const existing = getRow(`SELECT id FROM services WHERE lower(name) = lower(${sqlValue(serviceName)});`);
    if (!existing) {
      const now = new Date().toISOString();
      runSql(`
        INSERT INTO services (id, name, created_at, updated_at)
        VALUES (${sqlValue(crypto.randomUUID())}, ${sqlValue(serviceName)}, ${sqlValue(now)}, ${sqlValue(now)});
      `);
    }
  });

  if (!hasColumn("suppliers", "industry")) {
    runSql(`ALTER TABLE suppliers ADD COLUMN industry TEXT DEFAULT 'General';`);
  }

  if (!hasColumn("suppliers", "approval_status")) {
    runSql(`ALTER TABLE suppliers ADD COLUMN approval_status TEXT DEFAULT 'Not Approved';`);
  }

  if (!hasColumn("suppliers", "bank_details")) {
    runSql(`ALTER TABLE suppliers ADD COLUMN bank_details TEXT;`);
  }

  if (!hasColumn("suppliers", "customer_id")) {
    runSql(`ALTER TABLE suppliers ADD COLUMN customer_id TEXT;`);
  }

  if (!hasColumn("suppliers", "project_id")) {
    runSql(`ALTER TABLE suppliers ADD COLUMN project_id TEXT;`);
  }

  if (!hasColumn("inventory", "customer_id")) {
    runSql(`ALTER TABLE inventory ADD COLUMN customer_id TEXT;`);
  }

  if (!hasColumn("inventory", "project_id")) {
    runSql(`ALTER TABLE inventory ADD COLUMN project_id TEXT;`);
  }

  if (!hasColumn("purchase_orders", "customer_id")) {
    runSql(`ALTER TABLE purchase_orders ADD COLUMN customer_id TEXT;`);
  }

  if (!hasColumn("purchase_orders", "project_id")) {
    runSql(`ALTER TABLE purchase_orders ADD COLUMN project_id TEXT;`);
  }

  if (!hasColumn("delivery_challans", "customer_id")) {
    runSql(`ALTER TABLE delivery_challans ADD COLUMN customer_id TEXT;`);
  }

  if (!hasColumn("delivery_challans", "project_id")) {
    runSql(`ALTER TABLE delivery_challans ADD COLUMN project_id TEXT;`);
  }

  if (!hasColumn("packaging_documents", "customer_id")) {
    runSql(`ALTER TABLE packaging_documents ADD COLUMN customer_id TEXT;`);
  }

  if (!hasColumn("packaging_documents", "project_id")) {
    runSql(`ALTER TABLE packaging_documents ADD COLUMN project_id TEXT;`);
  }

  if (!hasColumn("quote_requests", "review_data")) {
    runSql(`ALTER TABLE quote_requests ADD COLUMN review_data TEXT;`);
  }
  if (!hasColumn("quote_requests", "customer_id")) {
    runSql(`ALTER TABLE quote_requests ADD COLUMN customer_id TEXT;`);
  }
  if (!hasColumn("users", "customer_id")) {
    runSql(`ALTER TABLE users ADD COLUMN customer_id TEXT;`);
  }
  if (!hasColumn("quote_requests", "design_units")) {
    runSql(`ALTER TABLE quote_requests ADD COLUMN design_units TEXT;`);
  }
  if (!hasColumn("quote_requests", "material_family")) {
    runSql(`ALTER TABLE quote_requests ADD COLUMN material_family TEXT;`);
  }
  if (!hasColumn("quote_requests", "material_grade")) {
    runSql(`ALTER TABLE quote_requests ADD COLUMN material_grade TEXT;`);
  }
  if (!hasColumn("quote_requests", "option_selections")) {
    runSql(`ALTER TABLE quote_requests ADD COLUMN option_selections TEXT;`);
  }

  if (!hasColumn("quote_orders", "review_result")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN review_result TEXT;`);
  }

  if (!hasColumn("quote_orders", "engineering_decision")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN engineering_decision TEXT;`);
  }

  if (!hasColumn("quote_orders", "end_use")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN end_use TEXT;`);
  }

  if (!hasColumn("quote_orders", "t0_sample_date")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN t0_sample_date TEXT;`);
  }

  if (!hasColumn("quote_orders", "production_delivery_date")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN production_delivery_date TEXT;`);
  }

  if (!hasColumn("quote_orders", "importer_model")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN importer_model TEXT;`);
  }

  if (!hasColumn("quote_orders", "importer_name")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN importer_name TEXT;`);
  }

  if (!hasColumn("quote_orders", "importer_tax_id")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN importer_tax_id TEXT;`);
  }

  if (!hasColumn("quote_orders", "tax_mode")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN tax_mode TEXT;`);
  }

  if (!hasColumn("quote_orders", "commercial_notes")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN commercial_notes TEXT;`);
  }

  if (!hasColumn("quote_orders", "part_unit_price")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN part_unit_price REAL;`);
  }

  if (!hasColumn("quote_orders", "part_subtotal")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN part_subtotal REAL;`);
  }

  if (!hasColumn("quote_orders", "moq")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN moq INTEGER;`);
  }

  if (!hasColumn("quote_orders", "batch_quantity")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN batch_quantity INTEGER;`);
  }

  if (!hasColumn("quote_orders", "inspection_option")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN inspection_option TEXT;`);
  }

  if (!hasColumn("quote_orders", "finish_confirmation")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN finish_confirmation TEXT;`);
  }

  if (!hasColumn("quote_orders", "mold_type")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN mold_type TEXT;`);
  }

  if (!hasColumn("quote_orders", "cavity_count")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN cavity_count INTEGER;`);
  }

  if (!hasColumn("quote_orders", "tool_material")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN tool_material TEXT;`);
  }

  if (!hasColumn("quote_orders", "texture_finish")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN texture_finish TEXT;`);
  }

  if (!hasColumn("quote_orders", "sample_rounds")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN sample_rounds INTEGER;`);
  }

  if (!hasColumn("quote_orders", "t0_sample_plan")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN t0_sample_plan TEXT;`);
  }

  if (!hasColumn("quote_orders", "production_quantity")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN production_quantity INTEGER;`);
  }

  if (!hasColumn("quote_orders", "tool_lead_days")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN tool_lead_days INTEGER;`);
  }

  if (!hasColumn("quote_orders", "production_lead_days")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN production_lead_days INTEGER;`);
  }

  if (!hasColumn("quote_orders", "duty_rate")) {
    runSql(`ALTER TABLE quote_orders ADD COLUMN duty_rate REAL;`);
  }
  seedPricingRates();

  if (shouldCreate) {
    if (fs.existsSync(LEGACY_JSON_PATH)) {
      importLegacyJson(JSON.parse(fs.readFileSync(LEGACY_JSON_PATH, "utf8")));
    } else {
      importLegacyJson(seedDatabase());
    }
  }
}

function importLegacyJson(db) {
  runSql(`
    DELETE FROM sessions;
    DELETE FROM grns;
    DELETE FROM invoices;
    DELETE FROM purchase_order_items;
    DELETE FROM packaging_documents;
    DELETE FROM delivery_challans;
    DELETE FROM project_documents;
    DELETE FROM project_services;
    DELETE FROM purchase_orders;
    DELETE FROM movements;
    DELETE FROM inventory;
    DELETE FROM services;
    DELETE FROM suppliers;
    DELETE FROM projects;
    DELETE FROM customers;
    DELETE FROM users;
  `);

  const now = new Date().toISOString();

  db.users.forEach((user) => {
    runSql(`
      INSERT INTO users (id, name, email, role, customer_id, salt, password_hash)
      VALUES (${sqlValue(user.id)}, ${sqlValue(user.name)}, ${sqlValue(user.email)}, ${sqlValue(user.role)},
        ${sqlValue(user.customerId || "")}, ${sqlValue(user.salt)}, ${sqlValue(user.passwordHash)});
    `);
  });

  (db.sessions || []).forEach((session) => {
    runSql(`
      INSERT INTO sessions (token, user_id, created_at)
      VALUES (${sqlValue(session.token)}, ${sqlValue(session.userId)}, ${sqlValue(session.createdAt || now)});
    `);
  });

  DEFAULT_SERVICES.forEach((serviceName) => {
    runSql(`
      INSERT INTO services (id, name, created_at, updated_at)
      VALUES (${sqlValue(crypto.randomUUID())}, ${sqlValue(serviceName)}, ${sqlValue(now)}, ${sqlValue(now)});
    `);
  });

  db.suppliers.forEach((supplier) => {
    runSql(`
      INSERT INTO suppliers (id, name, customer_id, project_id, industry, approval_status, bank_details, contact_person, email, phone, city, lead_time_days, rating, created_at, updated_at)
      VALUES (
        ${sqlValue(supplier.id)}, ${sqlValue(supplier.name)}, ${sqlValue(supplier.customerId || "")}, ${sqlValue(supplier.projectId || "")}, ${sqlValue(supplier.industry || "General")},
        ${sqlValue(supplier.approvalStatus || "Not Approved")}, ${sqlValue(supplier.bankDetails ? JSON.stringify(supplier.bankDetails) : null)},
        ${sqlValue(supplier.contactPerson)},
        ${sqlValue(supplier.email)}, ${sqlValue(supplier.phone)}, ${sqlValue(supplier.city)},
        ${sqlValue(supplier.leadTimeDays || 0)}, ${sqlValue(supplier.rating || 0)}, ${sqlValue(now)}, ${sqlValue(now)}
      );
    `);
  });

  db.inventory.forEach((item) => {
    runSql(`
      INSERT INTO inventory (id, name, sku, category, customer_id, project_id, quantity, threshold_value, cost, supplier_id, location, unit, last_updated, created_at, updated_at)
      VALUES (
        ${sqlValue(item.id)}, ${sqlValue(item.name)}, ${sqlValue(item.sku)}, ${sqlValue(item.category)}, ${sqlValue(item.customerId || "")}, ${sqlValue(item.projectId || "")},
        ${sqlValue(item.quantity || 0)}, ${sqlValue(item.threshold || 0)}, ${sqlValue(item.cost || 0)},
        ${sqlValue(item.supplierId)}, ${sqlValue(item.location)}, ${sqlValue(item.unit || "pcs")},
        ${sqlValue(item.lastUpdated || now)}, ${sqlValue(now)}, ${sqlValue(now)}
      );
    `);
  });

  db.purchaseOrders.forEach((order, index) => {
    const createdAt = now;
    runSql(`
      INSERT INTO purchase_orders (id, po_number, supplier_id, customer_id, project_id, status, order_date, expected_date, notes, created_by, created_at, updated_at)
      VALUES (
        ${sqlValue(order.id)}, ${sqlValue(order.poNumber)}, ${sqlValue(order.supplierId)}, ${sqlValue(order.customerId || "")}, ${sqlValue(order.projectId || "")}, ${sqlValue(order.status)},
        ${sqlValue(order.orderDate)}, ${sqlValue(order.expectedDate)}, ${sqlValue(order.notes)},
        ${sqlValue(order.createdBy || "System Seed")}, ${sqlValue(createdAt)}, ${sqlValue(createdAt)}
      );
    `);

    order.items.forEach((item) => {
      runSql(`
        INSERT INTO purchase_order_items (id, po_id, inventory_id, name, quantity, cost)
        VALUES (
          ${sqlValue(crypto.randomUUID())}, ${sqlValue(order.id)}, ${sqlValue(item.inventoryId)},
          ${sqlValue(item.name)}, ${sqlValue(item.quantity)}, ${sqlValue(item.cost)}
        );
      `);
    });

    const totalValue = order.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.cost || 0), 0);
    const invoiceId = crypto.randomUUID();
    const invoiceNumber = `INV-${new Date(order.orderDate || now).getFullYear()}-${String(index + 1).padStart(3, "0")}`;
    runSql(`
      INSERT INTO invoices (id, invoice_number, po_id, supplier_id, status, issue_date, due_date, total_value, notes, created_at, updated_at)
      VALUES (
        ${sqlValue(invoiceId)}, ${sqlValue(invoiceNumber)}, ${sqlValue(order.id)}, ${sqlValue(order.supplierId)},
        ${sqlValue(order.status === "Received" ? "Issued" : "Draft")}, ${sqlValue(order.orderDate || now.slice(0, 10))},
        ${sqlValue(order.expectedDate || order.orderDate || now.slice(0, 10))}, ${sqlValue(totalValue)},
        ${sqlValue(order.notes)}, ${sqlValue(createdAt)}, ${sqlValue(createdAt)}
      );
    `);

    if (order.status === "Received") {
      runSql(`
        INSERT INTO grns (id, grn_number, po_id, received_date, received_by, notes, created_at)
        VALUES (
          ${sqlValue(crypto.randomUUID())},
          ${sqlValue(`GRN-${new Date(order.orderDate || now).getFullYear()}-${String(index + 1).padStart(3, "0")}`)},
          ${sqlValue(order.id)},
          ${sqlValue(order.expectedDate || order.orderDate || now.slice(0, 10))},
          ${sqlValue(order.createdBy || "System Seed")},
          ${sqlValue(`Migrated GRN for ${order.poNumber}`)},
          ${sqlValue(createdAt)}
        );
      `);
    }
  });

  db.movements.forEach((movement) => {
    runSql(`
      INSERT INTO movements (id, inventory_id, item_name, sku, type, quantity, note, created_by, created_at)
      VALUES (
        ${sqlValue(movement.id)}, ${sqlValue(movement.inventoryId)}, ${sqlValue(movement.itemName)},
        ${sqlValue(movement.sku)}, ${sqlValue(movement.type)}, ${sqlValue(movement.quantity)},
        ${sqlValue(movement.note)}, ${sqlValue(movement.createdBy)}, ${sqlValue(movement.createdAt || now)}
      );
    `);
  });
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || "";
  return cookieHeader.split(";").reduce((acc, pair) => {
    const [rawKey, ...rest] = pair.trim().split("=");
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 80_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON payload"));
      }
    });
  });
}

function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, statusCode, html, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    ...headers,
  });
  res.end(html);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { error: "File not found" });
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    customerId: user.customerId || "",
  };
}

function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || { screens: [], actions: [] };
}

function cleanupSessions() {
  const cutoff = new Date(Date.now() - SESSION_TTL_MS).toISOString();
  runSql(`DELETE FROM sessions WHERE created_at < ${sqlValue(cutoff)};`);
}

function sanitizeFilename(filename) {
  const cleaned = String(filename || "document")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "document";
}

function decodeBase64Content(base64) {
  return Buffer.from(String(base64 || ""), "base64");
}

function getSession(req) {
  cleanupSessions();
  // Accept Bearer token (new app.js) OR legacy cookie
  const authHeader = req.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const cookies = parseCookies(req);
  const token = bearerToken || cookies.brahmworks_session;
  if (!token) return null;

  const session = getRow(`
    SELECT s.token, s.user_id, s.created_at, u.id, u.name, u.email, u.role, u.customer_id AS customerId
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${sqlValue(token)}
    LIMIT 1;
  `);

  if (!session) return null;
  return {
    session: {
      token: session.token,
      userId: session.user_id,
      createdAt: session.created_at,
    },
    user: {
      id: session.id,
      name: session.name,
      email: session.email,
      role: session.role,
      customerId: session.customerId || "",
    },
  };
}

function requireAuth(req, res) {
  const auth = getSession(req);
  if (!auth) {
    sendJson(res, 401, { error: "Authentication required" });
    return null;
  }
  return auth;
}

function requirePermission(res, user, permission) {
  const permissions = getRolePermissions(user.role);
  if (!permissions.actions.includes(permission)) {
    sendJson(res, 403, { error: `Missing permission: ${permission}` });
    return false;
  }
  return true;
}

function getSuppliers(filters = {}) {
  const clauses = [];
  if (filters.query) {
    const query = `%${String(filters.query).trim().toLowerCase()}%`;
    clauses.push(`(
      lower(s.name) LIKE ${sqlValue(query)}
      OR lower(COALESCE(s.contact_person, '')) LIKE ${sqlValue(query)}
      OR lower(COALESCE(s.email, '')) LIKE ${sqlValue(query)}
      OR lower(COALESCE(s.phone, '')) LIKE ${sqlValue(query)}
      OR lower(COALESCE(s.city, '')) LIKE ${sqlValue(query)}
      OR lower(COALESCE(s.industry, '')) LIKE ${sqlValue(query)}
      OR lower(COALESCE(c.name, '')) LIKE ${sqlValue(query)}
      OR lower(COALESCE(p.name, '')) LIKE ${sqlValue(query)}
    )`);
  }
  if (filters.industry && filters.industry !== "All") {
    clauses.push(`COALESCE(s.industry, 'General') = ${sqlValue(filters.industry)}`);
  }
  if (filters.approvalStatus && filters.approvalStatus !== "All") {
    clauses.push(`COALESCE(s.approval_status, 'Not Approved') = ${sqlValue(filters.approvalStatus)}`);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limitClause = filters.limit ? `LIMIT ${Math.max(1, Number(filters.limit))}` : "";
  const offsetClause = filters.offset ? `OFFSET ${Math.max(0, Number(filters.offset))}` : "";
  return getRows(`
    SELECT s.id, s.name, s.customer_id AS customerId, c.name AS customerName,
      s.project_id AS projectId, p.name AS projectName,
      COALESCE(s.industry, 'General') AS industry,
      COALESCE(s.approval_status, 'Not Approved') AS approvalStatus, s.bank_details AS bankDetails,
      s.contact_person AS contactPerson, s.email, s.phone, s.city,
      s.lead_time_days AS leadTimeDays, s.rating, s.created_at AS createdAt, s.updated_at AS updatedAt
    FROM suppliers s
    LEFT JOIN customers c ON c.id = s.customer_id
    LEFT JOIN projects p ON p.id = s.project_id
    ${whereClause}
    ORDER BY CASE COALESCE(s.approval_status, 'Not Approved') WHEN 'Approved' THEN 0 ELSE 1 END,
      COALESCE(s.industry, 'General') ASC, s.name ASC
    ${limitClause}
    ${offsetClause}
    ;
  `).map((row) => ({
    ...row,
    leadTimeDays: Number(row.leadTimeDays || 0),
    rating: Number(row.rating || 0),
    bankDetails: row.bankDetails ? JSON.parse(row.bankDetails) : null,
    customer: row.customerId ? { id: row.customerId, name: row.customerName } : null,
    project: row.projectId ? { id: row.projectId, name: row.projectName } : null,
  }));
}

function getSupplierCount(filters = {}) {
  const clauses = [];
  if (filters.query) {
    const query = `%${String(filters.query).trim().toLowerCase()}%`;
    clauses.push(`(
      lower(s.name) LIKE ${sqlValue(query)}
      OR lower(COALESCE(s.contact_person, '')) LIKE ${sqlValue(query)}
      OR lower(COALESCE(s.email, '')) LIKE ${sqlValue(query)}
      OR lower(COALESCE(s.phone, '')) LIKE ${sqlValue(query)}
      OR lower(COALESCE(s.city, '')) LIKE ${sqlValue(query)}
      OR lower(COALESCE(s.industry, '')) LIKE ${sqlValue(query)}
      OR lower(COALESCE(c.name, '')) LIKE ${sqlValue(query)}
      OR lower(COALESCE(p.name, '')) LIKE ${sqlValue(query)}
    )`);
  }
  if (filters.industry && filters.industry !== "All") {
    clauses.push(`COALESCE(s.industry, 'General') = ${sqlValue(filters.industry)}`);
  }
  if (filters.approvalStatus && filters.approvalStatus !== "All") {
    clauses.push(`COALESCE(s.approval_status, 'Not Approved') = ${sqlValue(filters.approvalStatus)}`);
  }
  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const row = getRow(`
    SELECT COUNT(*) AS count
    FROM suppliers s
    LEFT JOIN customers c ON c.id = s.customer_id
    LEFT JOIN projects p ON p.id = s.project_id
    ${whereClause};
  `);
  return Number(row?.count || 0);
}

function getSupplierOptions(limit = 400) {
  return getRows(`
    SELECT id, name, customer_id AS customerId, project_id AS projectId,
      COALESCE(approval_status, 'Not Approved') AS approvalStatus
    FROM suppliers
    ORDER BY CASE COALESCE(approval_status, 'Not Approved') WHEN 'Approved' THEN 0 ELSE 1 END, name ASC
    LIMIT ${Math.max(1, Number(limit))};
  `);
}

function getCustomers() {
  return getRows(`
    SELECT id, name, contact_person AS contactPerson, email, phone, created_at AS createdAt, updated_at AS updatedAt
    FROM customers
    ORDER BY name ASC;
  `);
}

function getCustomerById(customerId) {
  if (!customerId) return null;
  return getRow(`
    SELECT id, name, contact_person AS contactPerson, email, phone, created_at AS createdAt, updated_at AS updatedAt
    FROM customers
    WHERE id = ${sqlValue(customerId)}
    LIMIT 1;
  `);
}

function getProjects() {
  return getRows(`
    SELECT p.id, p.name, p.customer_id AS customerId, c.name AS customerName,
      p.status, p.notes, p.created_at AS createdAt, p.updated_at AS updatedAt,
      (SELECT COUNT(*) FROM project_documents pd WHERE pd.project_id = p.id) AS documentCount
    FROM projects p
    LEFT JOIN customers c ON c.id = p.customer_id
    ORDER BY p.name ASC;
  `).map((row) => ({
    ...row,
    customer: row.customerId ? { id: row.customerId, name: row.customerName } : null,
    services: getRows(`
      SELECT s.id, s.name
      FROM project_services ps
      INNER JOIN services s ON s.id = ps.service_id
      WHERE ps.project_id = ${sqlValue(row.id)}
      ORDER BY s.name ASC;
    `),
  }));
}

function getServices() {
  return getRows(`
    SELECT id, name, created_at AS createdAt, updated_at AS updatedAt
    FROM services
    ORDER BY name ASC;
  `);
}

function getProjectDocuments(projectId) {
  return getRows(`
    SELECT id, project_id AS projectId, category, title,
      original_name AS originalName, storage_name AS storageName,
      mime_type AS mimeType, file_size AS fileSize,
      notes, created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt
    FROM project_documents
    WHERE project_id = ${sqlValue(projectId)}
    ORDER BY created_at DESC;
  `).map((row) => ({
    ...row,
    fileUrl: `/project-files/${row.id}`,
  }));
}

function materialFactor(material) {
  const lower = String(material || "").toLowerCase();
  if (!lower) return 1;
  if (/(titanium|inconel|tool steel|hardened steel)/.test(lower)) return 1.75;
  if (/(stainless|ss 304|ss 316)/.test(lower)) return 1.35;
  if (/(brass|copper)/.test(lower)) return 1.2;
  if (/(abs|pp|polypropylene|nylon|delrin|pom)/.test(lower)) return 0.9;
  if (/(aluminum|aluminium|mild steel|crca)/.test(lower)) return 1.05;
  return 1.1;
}

function finishFactor(finish) {
  const lower = String(finish || "").toLowerCase();
  if (!lower || lower === "as machined") return 1;
  if (/(anod|powder|paint|plating)/.test(lower)) return 1.12;
  if (/(bead|blast|polish|passivat)/.test(lower)) return 1.08;
  return 1.05;
}

function buildQuotePricing(input, overrides = {}) {
  const process = String(overrides.process || input.process || "CNC Machining");
  const normalizedSelections = normalizeQuoteSelections(
    process,
    {
      ...(input.optionSelections || {}),
      ...(overrides.optionSelections || {}),
      materialFamily: overrides.materialFamily ?? input.materialFamily,
      materialGrade: overrides.materialGrade ?? input.materialGrade,
      surfaceFinish: overrides.surfaceFinish ?? input.surfaceFinish ?? overrides.finish ?? input.finish,
    },
  );
  const materialFamily = normalizedSelections.materialFamily || "";
  const materialGrade = normalizedSelections.materialGrade || "";
  const materialRate = getMaterialRate(materialFamily, materialGrade);
  const material = String(overrides.material || input.material || buildMaterialLabel(materialFamily, materialGrade));
  const finish = String(overrides.finish || input.finish || normalizedSelections.surfaceFinish || "");
  const quantity = Math.max(1, Number(overrides.quantity || input.quantity || 1));
  const fileSize = Math.max(1, Number(input.fileSize || 0));
  const sizeFactor = Math.max(1, fileSize / 180000);
  const toleranceClass = normalizedSelections.toleranceClass || "Standard";
  const appearanceGrade = normalizedSelections.appearanceGrade || "Standard";
  const inspectionLevel = normalizedSelections.inspectionLevel || "Standard Inspection";
  const inserts = normalizedSelections.inserts || "No";
  const threads = normalizedSelections.threads || "No";
  const welding = normalizedSelections.welding || "None";
  const toolRequirement = normalizedSelections.toolRequirement || "Order a New Mold";
  const annualVolume = normalizedSelections.annualVolume || "<= 10,000";

  const processBase = {
    "CNC Machining": 3200,
    "Sheet Metal": 1900,
    "Injection Molding": 6800,
    "3D Printing": 2400,
  }[process] || 2500;

  const baseSetupHours =
    overrides.setupHours !== undefined
      ? Number(overrides.setupHours || 0)
      : process === "Injection Molding"
        ? 10
        : process === "3D Printing"
          ? 1.5
        : process === "Sheet Metal"
          ? 2.5
          : 4;
  const baseMachiningHours =
    overrides.machiningHours !== undefined
      ? Number(overrides.machiningHours || 0)
      : Math.max(0.75, sizeFactor * (process === "Sheet Metal" ? 0.7 : process === "Injection Molding" ? 1.4 : process === "3D Printing" ? 0.85 : 1.1) * Number(materialRate.difficultyFactor || 1));
  const hourlyRate =
    overrides.hourlyRate !== undefined
      ? Number(overrides.hourlyRate || 0)
      : getProcessHourlyRate(process);
  const stockMultiplier = overrides.stockMultiplier !== undefined ? Number(overrides.stockMultiplier || 0) : 0.22;
  const toolingCost =
    overrides.toolingCost !== undefined
      ? Number(overrides.toolingCost || 0)
      : process === "Injection Molding"
        ? Math.round(processBase * (toolRequirement === "Use Existing Mold" ? 0.65 : 1.8))
        : process === "3D Printing"
          ? Math.round(processBase * 0.05)
        : Math.round(processBase * 0.18);
  const inspectionCost =
    overrides.inspectionCost !== undefined
      ? Number(overrides.inspectionCost || 0)
      : Math.round(processBase * (inspectionLevel.includes("CMM") ? 0.18 : inspectionLevel.includes("Formal Report") ? 0.11 : 0.08));
  const shippingCost = overrides.shippingCost !== undefined ? Number(overrides.shippingCost || 0) : 250;
  const overheadPercent = overrides.overheadPercent !== undefined ? Number(overrides.overheadPercent || 0) : 12;
  const marginPercent = overrides.marginPercent !== undefined ? Number(overrides.marginPercent || 0) : 18;

  const baseMaterialReferenceRate = Number(getPricingRateSnapshot("MAT_ALUMINUM_6061")?.rate || 260);
  const materialRateFactor = Math.max(0.35, Number(materialRate.rate || baseMaterialReferenceRate) / Math.max(1, baseMaterialReferenceRate));
  const materialCost = Math.round(
    processBase *
      stockMultiplier *
      materialRateFactor *
      (appearanceGrade === "Premium" ? 1.08 : 1) *
      (toleranceClass.includes("Tight") ? 1.12 : 1) *
      (annualVolume === ">= 100,000" ? 0.9 : annualVolume === "50,000 - 100,000" ? 0.94 : 1),
  );
  const setupCost = Math.round(baseSetupHours * hourlyRate);
  const runtimeCostPerPiece = Math.round(
    baseMachiningHours *
      hourlyRate *
      finishFactor(finish) *
      (threads === "Yes" ? 1.08 : 1) *
      (inserts === "Yes" || inserts === "Required" ? 1.06 : 1) *
      (welding === "Full Weld" ? 1.18 : welding === "Spot Weld" ? 1.08 : 1),
  );
  const runtimeTotal =
    process === "Injection Molding"
      ? Math.round(runtimeCostPerPiece * Math.max(1, quantity * 0.22))
      : Math.round(runtimeCostPerPiece * quantity);
  const directSubtotal = materialCost + setupCost + runtimeTotal + toolingCost + inspectionCost + shippingCost;
  const overheadValue = Math.round(directSubtotal * (overheadPercent / 100));
  const marginValue = Math.round((directSubtotal + overheadValue) * (marginPercent / 100));
  const total = directSubtotal + overheadValue + marginValue;
  const low = Math.max(500, Math.round(total * 0.92 / 50) * 50);
  const high = Math.max(low + 250, Math.round(total * 1.1 / 50) * 50);
  const leadDays =
    overrides.leadDays !== undefined
      ? Number(overrides.leadDays || 0)
      : (process === "Injection Molding" ? 18 : process === "Sheet Metal" ? 6 : process === "3D Printing" ? 4 : 9) + Math.min(10, Math.round(sizeFactor));

  return {
    currency: "INR",
    process,
    material,
    finish,
    quantity,
    leadDays,
    low,
    high,
    total,
    settings: {
      process,
      material,
      finish,
      quantity,
      materialFamily,
      materialGrade,
      materialRatePerKg: Number(materialRate.rate || 0),
      materialDifficultyFactor: Number(materialRate.difficultyFactor || 1),
      optionSelections: normalizedSelections,
      setupHours: Number(baseSetupHours.toFixed(2)),
      machiningHours: Number(baseMachiningHours.toFixed(2)),
      hourlyRate,
      stockMultiplier: Number(stockMultiplier.toFixed(2)),
      toolingCost,
      inspectionCost,
      shippingCost,
      overheadPercent,
      marginPercent,
      leadDays,
    },
    breakdown: [
      { key: "material", label: "Material / stock", value: materialCost },
      { key: "setup", label: "Setup", value: setupCost },
      { key: "runtime", label: process === "Injection Molding" ? "Cycle / production" : process === "3D Printing" ? "Printing / post-processing" : "Machining / fabrication", value: runtimeTotal },
      { key: "tooling", label: "Tooling", value: toolingCost },
      { key: "inspection", label: "Inspection / QA", value: inspectionCost },
      { key: "shipping", label: "Packing / shipping", value: shippingCost },
      { key: "overhead", label: `Overhead (${overheadPercent}%)`, value: overheadValue },
      { key: "margin", label: `Margin (${marginPercent}%)`, value: marginValue },
    ],
  };
}

const INJECTION_WALL_GUIDELINES_MM = {
  ABS: "1.14-3.56 mm",
  POM: "0.76-3.05 mm",
  Nylon: "0.76-2.92 mm",
  Polycarbonate: "1.02-3.81 mm",
  "PC / ABS": "1.02-3.81 mm",
  PE: "0.76-5.08 mm",
  PP: "1.02-3.81 mm",
  PS: "0.64-3.18 mm",
  TPU: "0.64-3.18 mm",
  PVC: "0.76-3.18 mm",
};

function classifyDfmStatus(rank) {
  return ["pass", "review", "warn", "hold"].includes(rank) ? rank : "review";
}

function parseMetricThickness(value) {
  const match = String(value || "").match(/(\d+(?:\.\d+)?)\s*mm/i);
  return match ? Number(match[1]) : null;
}

function formatDfmTitle(key) {
  return String(key || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function createDfmItem(status, title, detail, recommendation = "") {
  return {
    status: classifyDfmStatus(status),
    title,
    detail,
    recommendation,
  };
}

function computeQuoteComplexitySignal(quote) {
  const selections = quote.optionSelections || {};
  const settings = quote.reviewData || quote.pricing?.settings || {};
  const lowerName = String(quote.originalName || "").toLowerCase();
  const lowerNotes = String(quote.notes || "").toLowerCase();
  let score = 0;

  if (Number(quote.fileSize || 0) > 4 * 1024 * 1024) score += 2;
  else if (Number(quote.fileSize || 0) > 1.2 * 1024 * 1024) score += 1;

  if ((selections.appearanceGrade || "").includes("Premium")) score += 1;
  if ((selections.inspectionLevel || "").includes("CMM")) score += 2;
  else if ((selections.inspectionLevel || "").includes("Formal Report")) score += 1;
  if ((selections.toleranceClass || "").toLowerCase().includes("tight")) score += 2;
  if ((selections.welding || "").toLowerCase().includes("full")) score += 2;
  else if ((selections.welding || "").toLowerCase().includes("spot")) score += 1;
  if ((selections.inserts || "").toLowerCase() === "required" || (selections.inserts || "").toLowerCase() === "yes") score += 1;
  if ((selections.toolRequirement || "").includes("New Mold")) score += 1;
  if ((selections.materialAdditive || "").match(/glass|flame|uv/i)) score += 1;
  if ((selections.spiFinish || "").match(/A-|B-1/i)) score += 2;
  if ((selections.annualVolume || "").includes("100,000")) score += 1;
  if ((settings.machiningHours || 0) > 6) score += 1;
  if (/(thread|undercut|snap|living hinge|insert|overmold|slide|cam|lifter)/i.test(`${lowerName} ${lowerNotes}`)) score += 2;

  return score;
}

function buildInjectionMoldingDfmAnalysis(quote) {
  const selections = quote.optionSelections || {};
  const materialFamily = quote.materialFamily || selections.materialFamily || "ABS";
  const wallRange = INJECTION_WALL_GUIDELINES_MM[materialFamily] || "0.8-3.5 mm";
  const complexityScore = computeQuoteComplexitySignal(quote);
  const tooComplex = complexityScore >= 6;
  const checklist = [
    createDfmItem(
      "review",
      "Material and nominal wall thickness",
      `${materialFamily} typically performs best when nominal walls are kept in the ${wallRange} range and transitions are blended gradually.`,
      "Keep walls as uniform as possible and avoid abrupt thickness jumps that can create sink, voids, or warpage.",
    ),
    createDfmItem(
      (selections.spiFinish || "").match(/A-|B-1/i) ? "warn" : "review",
      "Draft angle and cosmetic finish",
      "Brahmworks recommends 1-2° draft for smooth faces, ~3° for light texture, and 5°+ for heavier texture.",
      "Add draft to all pull-direction faces and increase draft when premium cosmetic or textured surfaces are required.",
    ),
    createDfmItem(
      "review",
      "Corners, fillets, and section transitions",
      "Rounded corners and blended transitions reduce stress concentration and uneven shrink across the mold.",
      "Replace sharp corners with fillets wherever possible and blend ribs, bosses, and thickness changes into surrounding walls.",
    ),
    createDfmItem(
      "review",
      "Ribs, bosses, and support features",
      "Secondary support features should not overpack the tool or create localized sink on show surfaces.",
      "Size ribs and bosses conservatively and tie them back to the nominal wall instead of thickening cosmetic faces.",
    ),
    createDfmItem(
      "review",
      "Gate, parting line, and ejector strategy",
      "Gate vestige, parting line witness, ejector pin marks, and weld lines need to land on acceptable surfaces.",
      "Move cosmetic faces away from likely gate/eject locations and confirm that the parting line can sit on non-critical geometry.",
    ),
    createDfmItem(
      selections.toolRequirement === "Use Existing Mold" ? "review" : "pass",
      "Tooling strategy",
      selections.toolRequirement === "Use Existing Mold"
        ? "Existing tooling can shorten lead time, but fit, gate, shrink, and cavity assumptions need to be validated."
        : "New tooling allows the mold to be optimized for shrink, ejection, gating, and target production volume.",
      "For new product introduction we typically recommend validating a single-cavity tool before scaling multi-cavity production.",
    ),
    createDfmItem(
      tooComplex ? "hold" : complexityScore >= 4 ? "warn" : "review",
      "Complexity assessment",
      tooComplex
        ? "The selected finish, inspection, tooling, volume, and CAD complexity indicators suggest this mold may require advanced DFM review."
        : "This part appears suitable for a standard DFM review, but final gate, shutoff, and undercut strategy still needs engineering confirmation.",
      tooComplex
        ? "Our engineering team will contact you for next steps, tooling strategy, and any required design updates before mold release."
        : "We will confirm gate location, parting line, weld line risk, and ejection strategy during engineering review.",
    ),
  ];

  return {
    title: "Injection Molding DFM Analysis",
    summary: tooComplex
      ? "This molding RFQ has elevated tooling risk and requires a Brahmworks engineering review before final commercial release."
      : "This molding RFQ has been screened against core injection molding DFM rules and is ready for detailed engineering review.",
    status: tooComplex ? "hold" : complexityScore >= 4 ? "warn" : "review",
    requiresEngineeringContact: tooComplex,
    complexityScore,
    checklist,
    rules: [
      `Nominal wall guidance for ${materialFamily}: ${wallRange}`,
      "Draft: 1-2° smooth, ~3° light texture, 5°+ heavy texture",
      "Rounded corners and blended transitions preferred over sharp internal corners",
      "Gate, parting line, weld line, and ejector marks should be kept off cosmetic faces",
    ],
  };
}

function buildSheetMetalDfmAnalysis(quote) {
  const selections = quote.optionSelections || {};
  const thicknessValue = parseMetricThickness(selections.sheetThickness);
  const complexityScore = computeQuoteComplexitySignal(quote);
  const needsEngineering = complexityScore >= 5;
  const checklist = [
    createDfmItem(
      thicknessValue && thicknessValue <= 5 ? "pass" : "review",
      "Material and thickness suitability",
      thicknessValue
        ? `Selected thickness ${selections.sheetThickness} is within a standard quoting range for rapid sheet metal fabrication.`
        : "Material thickness has not been quantified from geometry, so bend feasibility will be confirmed during engineering review.",
      "Confirm the flat pattern, bend radius, and material temper against the selected thickness before release.",
    ),
    createDfmItem(
      "review",
      "Bend manufacturability",
      "Bend relief, hole-to-bend clearance, flange lengths, and inside bend radii drive manufacturability and cosmetic quality.",
      "Use consistent bend direction where possible and keep hole/slot features clear of bend lines to avoid distortion.",
    ),
    createDfmItem(
      (selections.welding || "").includes("Full") ? "warn" : "review",
      "Secondary operations",
      (selections.welding || "").includes("None")
        ? "No welding is selected, which simplifies fabrication and reduces post-processing variability."
        : `Selected secondary operation: ${selections.welding || "Fabrication review required"}.`,
      "Welded assemblies should be checked for distortion risk, access, and cosmetic cleanup expectations.",
    ),
    createDfmItem(
      (selections.inserts || "").includes("Required") ? "warn" : "review",
      "Hardware insertion and tapped features",
      (selections.inserts || "").includes("Required")
        ? "PEM inserts or tapped features increase setup and require hardware clearance validation."
        : "No hardware insertion has been selected in the configurator.",
      "Confirm hardware clearance from bends, edges, and mating faces before locking the drawing package.",
    ),
    createDfmItem(
      (selections.appearanceGrade || "").includes("Premium") || (selections.toleranceClass || "").toLowerCase().includes("tight") ? "warn" : "review",
      "Tolerance and appearance",
      "Tight tolerances and premium cosmetic requirements increase fixture dependence and may require additional process controls.",
      "Mark only the dimensions that are critical to function so manufacturing can balance cost, speed, and cosmetic quality.",
    ),
    createDfmItem(
      needsEngineering ? "hold" : complexityScore >= 3 ? "warn" : "review",
      "Complexity assessment",
      needsEngineering
        ? "This sheet metal RFQ shows multiple fabrication complexity signals and needs an engineering check before release."
        : "This part appears compatible with a standard sheet metal DFM review, subject to flat-pattern and bend validation.",
      needsEngineering
        ? "Our engineering team will contact you to review bend strategy, secondary operations, and any tolerance risks."
        : "We will still validate bend sequence, fixture access, and finishing assumptions during review.",
    ),
  ];

  return {
    title: "Sheet Metal DFM Analysis",
    summary: needsEngineering
      ? "This fabrication RFQ needs a Brahmworks engineering review before final commercial release."
      : "This fabrication RFQ has been screened against core sheet metal DFM rules and is ready for detailed review.",
    status: needsEngineering ? "hold" : complexityScore >= 3 ? "warn" : "review",
    requiresEngineeringContact: needsEngineering,
    complexityScore,
    checklist,
    rules: [
      "Validate bend radius, hole-to-bend clearance, and flange length",
      "Keep secondary operations clear of bends and cosmetic faces",
      "Confirm flat-pattern feasibility before release",
      "Escalate welded, tight-tolerance, or premium-finish parts for engineering review",
    ],
  };
}

function buildQuoteDfmAnalysis(quote) {
  if (!quote) return null;
  if (quote.process === "Injection Molding") return buildInjectionMoldingDfmAnalysis(quote);
  if (quote.process === "Sheet Metal") return buildSheetMetalDfmAnalysis(quote);
  return null;
}

function getBreakdownValue(pricing, labelPrefix) {
  return Number((pricing?.breakdown || []).find((item) => String(item.label || "").toLowerCase().startsWith(String(labelPrefix || "").toLowerCase()))?.value || 0);
}

function deliverySpeedMultiplier(speed) {
  return speed === "Expedited" ? 1.18 : speed === "Economy" ? 0.96 : 1;
}

function shippingMethodBase(process, shippingMethod, quantity) {
  const qtyFactor = Math.max(1, Number(quantity || 1));
  if (shippingMethod === "Customer Pickup") return 0;
  if (shippingMethod === "EXW / Freight Collect") return 0;
  const baseMap = {
    "CNC Machining": shippingMethod === "Air" ? 1450 : 780,
    "Sheet Metal": shippingMethod === "Air" ? 1680 : 920,
    "3D Printing": shippingMethod === "Air" ? 850 : 520,
    "Injection Molding": shippingMethod === "Air" ? 2950 : 1650,
  };
  const base = baseMap[process] || 900;
  return Math.round(base + Math.min(12, qtyFactor - 1) * (shippingMethod === "Air" ? 65 : 35));
}

function deriveEngineeringDecision(quote, dfm = null) {
  if (!quote) return "Review complete";
  if (quote.process !== "Injection Molding") return "Manufacturing review complete";
  const analysis = dfm || buildQuoteDfmAnalysis(quote);
  if (!analysis) return "DFM review complete";
  if (analysis.requiresEngineeringContact) return "Needs engineering contact";
  if (analysis.status === "warn" || analysis.status === "review") return "DFM Pass with notes";
  return "DFM Pass";
}

function computeQuoteOrderSummary(quote, overrides = {}) {
  const pricing = quote?.pricing || buildQuotePricing(quote, quote?.reviewData || {});
  const dfm = quote?.dfm || buildQuoteDfmAnalysis(quote);
  const isInjection = quote?.process === "Injection Molding";
  const reviewResult = isInjection ? (dfm?.requiresEngineeringContact ? "Engineering review required" : dfm?.status === "warn" || dfm?.status === "review" ? "DFM passed with action items" : "DFM passed") : "Review complete";
  const engineeringDecision = String(overrides.engineeringDecision || deriveEngineeringDecision(quote, dfm));
  const toolingCost = Number(overrides.toolingCost !== undefined ? overrides.toolingCost : getBreakdownValue(pricing, "Tooling"));
  const builtInShipping = getBreakdownValue(pricing, "Packing / shipping");
  const defaultPartUnitPrice = Math.max(0, Math.round((pricing.total - builtInShipping - toolingCost) / Math.max(1, Number(pricing.quantity || 1))));
  const partUnitPrice = Number(overrides.partUnitPrice !== undefined ? overrides.partUnitPrice : defaultPartUnitPrice);
  const orderQuantity = Math.max(
    1,
    Number(
      isInjection
        ? overrides.productionQuantity !== undefined
          ? overrides.productionQuantity
          : overrides.batchQuantity !== undefined
            ? overrides.batchQuantity
            : pricing.quantity
        : overrides.batchQuantity !== undefined
          ? overrides.batchQuantity
          : pricing.quantity,
    ),
  );
  const partSubtotal = Math.round(partUnitPrice * orderQuantity);
  const manufacturingSubtotal = Math.max(0, partSubtotal + (isInjection ? toolingCost : 0));
  const deliverySpeed = String(overrides.deliverySpeed || "Standard");
  const shippingMethod = String(overrides.shippingMethod || (quote?.process === "Injection Molding" ? "Road" : "Air"));
  const incoterm = String(overrides.incoterm || (String(overrides.country || "India").toLowerCase() === "india" ? "DDP" : "EXW"));
  const importerModel = String(overrides.importerModel || (incoterm === "DDP" ? "Brahmworks as importer" : "Customer as importer"));
  const country = String(overrides.country || "India").trim() || "India";
  const shipState = String(overrides.state || "").trim();
  const shippingCost =
    overrides.shippingCost !== undefined
      ? Number(overrides.shippingCost || 0)
      : Math.round(shippingMethodBase(quote.process, shippingMethod, pricing.quantity) * deliverySpeedMultiplier(deliverySpeed));
  const dutyRate =
    overrides.dutyRate !== undefined
      ? Number(overrides.dutyRate || 0)
      : incoterm === "DDP" && country.toLowerCase() !== "india"
        ? 8
        : 0;
  const dutiesCost =
    overrides.dutiesCost !== undefined
      ? Number(overrides.dutiesCost || 0)
      : incoterm === "DDP" && country.toLowerCase() !== "india"
        ? Math.round((manufacturingSubtotal + shippingCost) * (dutyRate / 100))
        : 0;

  let taxMode = "No GST";
  let taxRate = 0;
  if (country.toLowerCase() === "india") {
    taxRate = DEFAULT_GST_RATE;
    taxMode = shipState && shipState.toLowerCase() === BRAHMWORKS_HOME_STATE.toLowerCase() ? "CGST + SGST" : "IGST";
  } else if (incoterm === "DDP") {
    taxMode = "Import duties included";
  } else {
    taxMode = "EXW / taxes excluded";
  }
  if (overrides.taxRate !== undefined) taxRate = Number(overrides.taxRate || 0);
  if (overrides.taxMode) taxMode = String(overrides.taxMode);

  const taxBase = manufacturingSubtotal + shippingCost + dutiesCost;
  const taxAmount = overrides.taxAmount !== undefined ? Number(overrides.taxAmount || 0) : Math.round(taxBase * (taxRate / 100));
  const totalAmount = manufacturingSubtotal + shippingCost + dutiesCost + taxAmount;
  const leadDaysBase = Number(pricing.leadDays || quote?.estimatedLeadDays || 0);
  const toolLeadDays = isInjection ? Math.max(7, Number(overrides.toolLeadDays || 21)) : 0;
  const productionLeadDays = Math.max(1, Number(overrides.productionLeadDays || leadDaysBase || 5));
  const deliveryDate =
    overrides.deliveryDate ||
    new Date(Date.now() + Math.max(productionLeadDays + (deliverySpeed === "Expedited" ? -2 : deliverySpeed === "Economy" ? 3 : 0), 1) * 86400000)
      .toISOString()
      .slice(0, 10);
  const t0SampleDate =
    isInjection
      ? overrides.t0SampleDate ||
        new Date(Date.now() + Math.max(toolLeadDays - 3, 5) * 86400000)
          .toISOString()
          .slice(0, 10)
      : "";
  const productionDeliveryDate =
    isInjection
      ? overrides.productionDeliveryDate ||
        new Date(Date.now() + Math.max(toolLeadDays + productionLeadDays, 10) * 86400000)
          .toISOString()
          .slice(0, 10)
      : deliveryDate;
  const moq = Math.max(1, Number(overrides.moq !== undefined ? overrides.moq : isInjection ? 100 : 1));
  const endUse = String(overrides.endUse || (isInjection ? "Production" : "Prototype"));
  const inspectionOption = String(
    overrides.inspectionOption !== undefined
      ? overrides.inspectionOption
      : quote?.optionSelections?.inspectionLevel || "Standard inspection",
  );
  const finishConfirmation = String(
    overrides.finishConfirmation !== undefined
      ? overrides.finishConfirmation
      : quote?.finish || quote?.optionSelections?.surfaceFinish || "As quoted",
  );
  const moldType = String(overrides.moldType || "Production mold");
  const cavityCount = Math.max(1, Number(overrides.cavityCount || 1));
  const toolMaterial = String(overrides.toolMaterial || "Aluminum");
  const textureFinish = String(overrides.textureFinish || quote?.optionSelections?.spiFinish || quote?.finish || "Standard");
  const sampleRounds = Math.max(1, Number(overrides.sampleRounds || 1));
  const t0SamplePlan = String(overrides.t0SamplePlan || "T0 sample + engineering feedback");
  const shippingScope = incoterm === "DDP" ? "Delivered, duties included" : incoterm === "EXW" ? "Ex Works / freight by customer" : "Freight coordinated after pickup";

  return {
    currency: pricing.currency || "INR",
    reviewResult,
    engineeringDecision,
    endUse,
    deliverySpeed,
    deliveryDate,
    t0SampleDate,
    productionDeliveryDate,
    shippingMethod,
    incoterm,
    shippingScope,
    importerModel,
    dutyRate,
    partUnitPrice,
    partSubtotal,
    orderQuantity,
    moq,
    inspectionOption,
    finishConfirmation,
    moldType,
    cavityCount,
    toolMaterial,
    textureFinish,
    sampleRounds,
    t0SamplePlan,
    toolLeadDays,
    productionLeadDays,
    toolingCost,
    manufacturingSubtotal,
    shippingCost,
    dutiesCost,
    taxMode,
    taxRate,
    taxAmount,
    totalAmount,
    summaryRows: isInjection
      ? [
          ["Tooling cost", toolingCost],
          [`Part price (${orderQuantity} pcs)`, partSubtotal],
          ["Commercial subtotal", manufacturingSubtotal],
          ["Shipping", shippingCost],
          ["Duties / import handling", dutiesCost],
          [`Tax (${taxMode})`, taxAmount],
          ["Total payable", totalAmount],
        ]
      : [
          [`Part price (${orderQuantity} pcs)`, partSubtotal],
          ["Commercial subtotal", manufacturingSubtotal],
          ["Shipping", shippingCost],
          ["Duties / import handling", dutiesCost],
          [`Tax (${taxMode})`, taxAmount],
          ["Total payable", totalAmount],
        ],
  };
}

function shouldBlockCheckoutForQuote(quote) {
  const dfm = quote?.dfm || buildQuoteDfmAnalysis(quote);
  if (!quote) return false;
  if (quote.process !== "Injection Molding") return false;
  return Boolean(dfm?.requiresEngineeringContact);
}

function mapQuoteOrderRow(row, user = null) {
  const quote = getQuoteRequestById(row.quoteRequestId, user);
  if (!quote) return null;
  const summaryData = row.summaryData ? JSON.parse(row.summaryData) : {};
  return {
    ...row,
    quote,
    reviewResult: row.reviewResult || summaryData.reviewResult || "",
    engineeringDecision: row.engineeringDecision || summaryData.engineeringDecision || "",
    endUse: row.endUse || summaryData.endUse || "",
    deliveryDate: row.deliveryDate || summaryData.deliveryDate || "",
    t0SampleDate: row.t0SampleDate || summaryData.t0SampleDate || "",
    productionDeliveryDate: row.productionDeliveryDate || summaryData.productionDeliveryDate || "",
    importerModel: row.importerModel || summaryData.importerModel || "",
    importerName: row.importerName || "",
    importerTaxId: row.importerTaxId || "",
    taxMode: row.taxMode || summaryData.taxMode || "",
    commercialNotes: row.commercialNotes || "",
    partUnitPrice: Number(row.partUnitPrice || summaryData.partUnitPrice || 0),
    partSubtotal: Number(row.partSubtotal || summaryData.partSubtotal || 0),
    moq: Number(row.moq || summaryData.moq || 0),
    batchQuantity: Number(row.batchQuantity || summaryData.orderQuantity || 0),
    inspectionOption: row.inspectionOption || summaryData.inspectionOption || "",
    finishConfirmation: row.finishConfirmation || summaryData.finishConfirmation || "",
    moldType: row.moldType || summaryData.moldType || "",
    cavityCount: Number(row.cavityCount || summaryData.cavityCount || 0),
    toolMaterial: row.toolMaterial || summaryData.toolMaterial || "",
    textureFinish: row.textureFinish || summaryData.textureFinish || "",
    sampleRounds: Number(row.sampleRounds || summaryData.sampleRounds || 0),
    t0SamplePlan: row.t0SamplePlan || summaryData.t0SamplePlan || "",
    productionQuantity: Number(row.productionQuantity || summaryData.orderQuantity || 0),
    toolLeadDays: Number(row.toolLeadDays || summaryData.toolLeadDays || 0),
    productionLeadDays: Number(row.productionLeadDays || summaryData.productionLeadDays || 0),
    toolingCost: Number(row.toolingCost || 0),
    manufacturingSubtotal: Number(row.manufacturingSubtotal || 0),
    shippingCost: Number(row.shippingCost || 0),
    dutiesCost: Number(row.dutiesCost || 0),
    dutyRate: Number(row.dutyRate || summaryData.dutyRate || 0),
    taxRate: Number(row.taxRate || 0),
    taxAmount: Number(row.taxAmount || 0),
    totalAmount: Number(row.totalAmount || 0),
    summaryData,
    checkoutBlocked: shouldBlockCheckoutForQuote(quote),
  };
}

function getQuoteOrderByQuoteId(quoteId, user = null) {
  const row = getRow(`
    SELECT id, quote_request_id AS quoteRequestId, customer_id AS customerId, status, payment_status AS paymentStatus,
      currency, review_result AS reviewResult, engineering_decision AS engineeringDecision, end_use AS endUse,
      delivery_speed AS deliverySpeed, delivery_date AS deliveryDate, t0_sample_date AS t0SampleDate,
      production_delivery_date AS productionDeliveryDate, shipping_method AS shippingMethod,
      incoterm, shipping_scope AS shippingScope, importer_model AS importerModel, importer_name AS importerName,
      importer_tax_id AS importerTaxId, gstin, tax_mode AS taxMode, billing_name AS billingName, shipping_name AS shippingName,
      shipping_phone AS shippingPhone, shipping_company AS shippingCompany, address_line1 AS addressLine1,
      address_line2 AS addressLine2, city, state, postal_code AS postalCode, country, notes,
      commercial_notes AS commercialNotes, part_unit_price AS partUnitPrice, part_subtotal AS partSubtotal,
      moq, batch_quantity AS batchQuantity, inspection_option AS inspectionOption, finish_confirmation AS finishConfirmation,
      mold_type AS moldType, cavity_count AS cavityCount, tool_material AS toolMaterial, texture_finish AS textureFinish,
      sample_rounds AS sampleRounds, t0_sample_plan AS t0SamplePlan, production_quantity AS productionQuantity,
      tool_lead_days AS toolLeadDays, production_lead_days AS productionLeadDays, tooling_cost AS toolingCost,
      manufacturing_subtotal AS manufacturingSubtotal, shipping_cost AS shippingCost, duties_cost AS dutiesCost,
      duty_rate AS dutyRate, tax_rate AS taxRate, tax_amount AS taxAmount, total_amount AS totalAmount,
      summary_data AS summaryData, razorpay_order_id AS razorpayOrderId, razorpay_payment_id AS razorpayPaymentId,
      razorpay_signature AS razorpaySignature, created_at AS createdAt, updated_at AS updatedAt
    FROM quote_orders
    WHERE quote_request_id = ${sqlValue(quoteId)}
    LIMIT 1;
  `);
  return row ? mapQuoteOrderRow(row, user) : null;
}

function upsertQuoteOrder(quote, payload = {}) {
  const existing = getQuoteOrderByQuoteId(quote.id);
  const now = new Date().toISOString();
  const merged = {
    ...existing,
    ...payload,
  };
  const summary = computeQuoteOrderSummary(quote, merged);
  const record = {
    id: existing?.id || crypto.randomUUID(),
    quoteRequestId: quote.id,
    customerId: payload.customerId === undefined ? existing?.customerId || quote.customerId || "" : String(payload.customerId || ""),
    status: String(payload.status || existing?.status || (summary.reviewResult === "Engineering review required" ? "Engineering Review Required" : "Ready for Checkout")),
    paymentStatus: String(payload.paymentStatus || existing?.paymentStatus || "Pending"),
    currency: summary.currency,
    reviewResult: summary.reviewResult,
    engineeringDecision: summary.engineeringDecision,
    endUse: summary.endUse,
    deliverySpeed: summary.deliverySpeed,
    deliveryDate: summary.deliveryDate,
    t0SampleDate: summary.t0SampleDate,
    productionDeliveryDate: summary.productionDeliveryDate,
    shippingMethod: summary.shippingMethod,
    incoterm: summary.incoterm,
    shippingScope: summary.shippingScope,
    importerModel: String(merged.importerModel || summary.importerModel || ""),
    importerName: String(merged.importerName || existing?.importerName || ""),
    importerTaxId: String(merged.importerTaxId || existing?.importerTaxId || ""),
    gstin: String(payload.gstin || existing?.gstin || ""),
    taxMode: summary.taxMode,
    billingName: String(payload.billingName || existing?.billingName || quote.customer?.name || quote.company || quote.name || ""),
    shippingName: String(payload.shippingName || existing?.shippingName || quote.name || ""),
    shippingPhone: String(payload.shippingPhone || existing?.shippingPhone || quote.phone || ""),
    shippingCompany: String(payload.shippingCompany || existing?.shippingCompany || quote.company || quote.customer?.name || ""),
    addressLine1: String(payload.addressLine1 || existing?.addressLine1 || ""),
    addressLine2: String(payload.addressLine2 || existing?.addressLine2 || ""),
    city: String(payload.city || existing?.city || ""),
    state: String(payload.state || existing?.state || ""),
    postalCode: String(payload.postalCode || existing?.postalCode || ""),
    country: String(payload.country || existing?.country || "India"),
    notes: String(payload.notes || existing?.notes || ""),
    commercialNotes: String(merged.commercialNotes || existing?.commercialNotes || ""),
    partUnitPrice: summary.partUnitPrice,
    partSubtotal: summary.partSubtotal,
    moq: summary.moq,
    batchQuantity: quote.process === "Injection Molding" ? summary.orderQuantity : summary.orderQuantity,
    inspectionOption: summary.inspectionOption,
    finishConfirmation: summary.finishConfirmation,
    moldType: summary.moldType,
    cavityCount: summary.cavityCount,
    toolMaterial: summary.toolMaterial,
    textureFinish: summary.textureFinish,
    sampleRounds: summary.sampleRounds,
    t0SamplePlan: summary.t0SamplePlan,
    productionQuantity: summary.orderQuantity,
    toolLeadDays: summary.toolLeadDays,
    productionLeadDays: summary.productionLeadDays,
    toolingCost: summary.toolingCost,
    manufacturingSubtotal: summary.manufacturingSubtotal,
    shippingCost: summary.shippingCost,
    dutiesCost: summary.dutiesCost,
    dutyRate: summary.dutyRate,
    taxRate: summary.taxRate,
    taxAmount: summary.taxAmount,
    totalAmount: summary.totalAmount,
    summaryData: summary,
    razorpayOrderId: existing?.razorpayOrderId || "",
    razorpayPaymentId: existing?.razorpayPaymentId || "",
    razorpaySignature: existing?.razorpaySignature || "",
  };

  if (existing) {
    runSql(`
      UPDATE quote_orders
      SET customer_id = ${sqlValue(record.customerId)},
        status = ${sqlValue(record.status)},
        payment_status = ${sqlValue(record.paymentStatus)},
        currency = ${sqlValue(record.currency)},
        review_result = ${sqlValue(record.reviewResult)},
        engineering_decision = ${sqlValue(record.engineeringDecision)},
        end_use = ${sqlValue(record.endUse)},
        delivery_speed = ${sqlValue(record.deliverySpeed)},
        delivery_date = ${sqlValue(record.deliveryDate)},
        t0_sample_date = ${sqlValue(record.t0SampleDate)},
        production_delivery_date = ${sqlValue(record.productionDeliveryDate)},
        shipping_method = ${sqlValue(record.shippingMethod)},
        incoterm = ${sqlValue(record.incoterm)},
        shipping_scope = ${sqlValue(record.shippingScope)},
        importer_model = ${sqlValue(record.importerModel)},
        importer_name = ${sqlValue(record.importerName)},
        importer_tax_id = ${sqlValue(record.importerTaxId)},
        gstin = ${sqlValue(record.gstin)},
        tax_mode = ${sqlValue(record.taxMode)},
        billing_name = ${sqlValue(record.billingName)},
        shipping_name = ${sqlValue(record.shippingName)},
        shipping_phone = ${sqlValue(record.shippingPhone)},
        shipping_company = ${sqlValue(record.shippingCompany)},
        address_line1 = ${sqlValue(record.addressLine1)},
        address_line2 = ${sqlValue(record.addressLine2)},
        city = ${sqlValue(record.city)},
        state = ${sqlValue(record.state)},
        postal_code = ${sqlValue(record.postalCode)},
        country = ${sqlValue(record.country)},
        notes = ${sqlValue(record.notes)},
        commercial_notes = ${sqlValue(record.commercialNotes)},
        part_unit_price = ${sqlValue(record.partUnitPrice)},
        part_subtotal = ${sqlValue(record.partSubtotal)},
        moq = ${sqlValue(record.moq)},
        batch_quantity = ${sqlValue(record.batchQuantity)},
        inspection_option = ${sqlValue(record.inspectionOption)},
        finish_confirmation = ${sqlValue(record.finishConfirmation)},
        mold_type = ${sqlValue(record.moldType)},
        cavity_count = ${sqlValue(record.cavityCount)},
        tool_material = ${sqlValue(record.toolMaterial)},
        texture_finish = ${sqlValue(record.textureFinish)},
        sample_rounds = ${sqlValue(record.sampleRounds)},
        t0_sample_plan = ${sqlValue(record.t0SamplePlan)},
        production_quantity = ${sqlValue(record.productionQuantity)},
        tool_lead_days = ${sqlValue(record.toolLeadDays)},
        production_lead_days = ${sqlValue(record.productionLeadDays)},
        tooling_cost = ${sqlValue(record.toolingCost)},
        manufacturing_subtotal = ${sqlValue(record.manufacturingSubtotal)},
        shipping_cost = ${sqlValue(record.shippingCost)},
        duties_cost = ${sqlValue(record.dutiesCost)},
        duty_rate = ${sqlValue(record.dutyRate)},
        tax_rate = ${sqlValue(record.taxRate)},
        tax_amount = ${sqlValue(record.taxAmount)},
        total_amount = ${sqlValue(record.totalAmount)},
        summary_data = ${sqlValue(JSON.stringify(record.summaryData))},
        updated_at = ${sqlValue(now)}
      WHERE id = ${sqlValue(record.id)};
    `);
  } else {
    runSql(`
      INSERT INTO quote_orders (
        id, quote_request_id, customer_id, status, payment_status, currency, review_result, engineering_decision,
        end_use, delivery_speed, delivery_date, t0_sample_date, production_delivery_date, shipping_method, incoterm,
        shipping_scope, importer_model, importer_name, importer_tax_id, gstin, tax_mode, billing_name, shipping_name,
        shipping_phone, shipping_company, address_line1, address_line2, city, state, postal_code, country, notes,
        commercial_notes, part_unit_price, part_subtotal, moq, batch_quantity, inspection_option, finish_confirmation,
        mold_type, cavity_count, tool_material, texture_finish, sample_rounds, t0_sample_plan, production_quantity,
        tool_lead_days, production_lead_days, tooling_cost, manufacturing_subtotal, shipping_cost, duties_cost,
        duty_rate, tax_rate, tax_amount, total_amount, summary_data, razorpay_order_id, razorpay_payment_id,
        razorpay_signature, created_at, updated_at
      ) VALUES (
        ${sqlValue(record.id)}, ${sqlValue(record.quoteRequestId)}, ${sqlValue(record.customerId)}, ${sqlValue(record.status)},
        ${sqlValue(record.paymentStatus)}, ${sqlValue(record.currency)}, ${sqlValue(record.reviewResult)},
        ${sqlValue(record.engineeringDecision)}, ${sqlValue(record.endUse)}, ${sqlValue(record.deliverySpeed)},
        ${sqlValue(record.deliveryDate)}, ${sqlValue(record.t0SampleDate)}, ${sqlValue(record.productionDeliveryDate)},
        ${sqlValue(record.shippingMethod)}, ${sqlValue(record.incoterm)}, ${sqlValue(record.shippingScope)},
        ${sqlValue(record.importerModel)}, ${sqlValue(record.importerName)}, ${sqlValue(record.importerTaxId)},
        ${sqlValue(record.gstin)}, ${sqlValue(record.taxMode)}, ${sqlValue(record.billingName)}, ${sqlValue(record.shippingName)},
        ${sqlValue(record.shippingPhone)}, ${sqlValue(record.shippingCompany)}, ${sqlValue(record.addressLine1)},
        ${sqlValue(record.addressLine2)}, ${sqlValue(record.city)}, ${sqlValue(record.state)},
        ${sqlValue(record.postalCode)}, ${sqlValue(record.country)}, ${sqlValue(record.notes)},
        ${sqlValue(record.commercialNotes)}, ${sqlValue(record.partUnitPrice)}, ${sqlValue(record.partSubtotal)},
        ${sqlValue(record.moq)}, ${sqlValue(record.batchQuantity)}, ${sqlValue(record.inspectionOption)},
        ${sqlValue(record.finishConfirmation)}, ${sqlValue(record.moldType)}, ${sqlValue(record.cavityCount)},
        ${sqlValue(record.toolMaterial)}, ${sqlValue(record.textureFinish)}, ${sqlValue(record.sampleRounds)},
        ${sqlValue(record.t0SamplePlan)}, ${sqlValue(record.productionQuantity)}, ${sqlValue(record.toolLeadDays)},
        ${sqlValue(record.productionLeadDays)}, ${sqlValue(record.toolingCost)}, ${sqlValue(record.manufacturingSubtotal)},
        ${sqlValue(record.shippingCost)}, ${sqlValue(record.dutiesCost)}, ${sqlValue(record.dutyRate)},
        ${sqlValue(record.taxRate)}, ${sqlValue(record.taxAmount)}, ${sqlValue(record.totalAmount)},
        ${sqlValue(JSON.stringify(record.summaryData))}, ${sqlValue(record.razorpayOrderId)},
        ${sqlValue(record.razorpayPaymentId)}, ${sqlValue(record.razorpaySignature)}, ${sqlValue(now)}, ${sqlValue(now)}
      );
    `);
  }

  return getQuoteOrderByQuoteId(quote.id);
}

function razorpayRequest(method, pathname, payload = null) {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return Promise.reject(new Error("Razorpay keys are not configured yet."));
  }
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : "";
    const request = https.request(
      {
        hostname: RAZORPAY_API_HOST,
        path: pathname,
        method,
        headers: {
          Authorization: `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (response) => {
        let raw = "";
        response.on("data", (chunk) => {
          raw += chunk;
        });
        response.on("end", () => {
          const data = raw ? JSON.parse(raw) : {};
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(data.error?.description || `Razorpay request failed (${response.statusCode})`));
          }
        });
      },
    );
    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

function mapQuoteRow(row) {
  const optionSelections = row.optionSelections ? JSON.parse(row.optionSelections) : {};
  const pricing = buildQuotePricing(
    {
      process: row.process,
      material: row.material,
      finish: row.finish,
      quantity: row.quantity,
      fileSize: row.fileSize,
      materialFamily: row.materialFamily,
      materialGrade: row.materialGrade,
      optionSelections,
    },
    row.reviewData ? JSON.parse(row.reviewData) : {},
  );
  return {
    ...row,
    quantity: Number(row.quantity || 0),
    estimateLow: Number(row.estimateLow || pricing.low || 0),
    estimateHigh: Number(row.estimateHigh || pricing.high || 0),
    estimatedLeadDays: Number(row.estimatedLeadDays || pricing.leadDays || 0),
    reviewData: pricing.settings,
    materialFamily: row.materialFamily || pricing.settings.materialFamily || "",
    materialGrade: row.materialGrade || pricing.settings.materialGrade || "",
    designUnits: row.designUnits || "mm",
    optionSelections: pricing.settings.optionSelections || optionSelections,
    pricing,
    dfm: buildQuoteDfmAnalysis({
      ...row,
      quantity: Number(row.quantity || 0),
      optionSelections: pricing.settings.optionSelections || optionSelections,
      reviewData: pricing.settings,
    }),
    fileUrl: `/quote-files/${row.id}`,
    customer: row.customerId ? {
      id: row.customerId,
      name: row.customerName || "",
      contactPerson: row.customerContactPerson || "",
      email: row.customerEmail || "",
      phone: row.customerPhone || "",
    } : null,
  };
}

function getQuoteRequestScopeClause(user) {
  if (!user || user.role !== "Customer") return "";
  const email = String(user.email || "").trim().toLowerCase();
  const customerId = String(user.customerId || "").trim();
  const filters = [];
  if (customerId) {
    filters.push(`qr.customer_id = ${sqlValue(customerId)}`);
  }
  if (email) {
    filters.push(`lower(qr.email) = ${sqlValue(email)}`);
  }
  return filters.length ? `WHERE (${filters.join(" OR ")})` : "WHERE 1 = 0";
}

function canAccessQuoteRequest(user, quote) {
  if (!user || !quote) return false;
  if (user.role !== "Customer") return true;
  const email = String(user.email || "").trim().toLowerCase();
  const customerId = String(user.customerId || "").trim();
  return (customerId && quote.customerId === customerId) || (email && String(quote.email || "").trim().toLowerCase() === email);
}

function getQuoteRequests(user = null) {
  return getRows(`
    SELECT qr.id, qr.reference_code AS referenceCode, qr.name, qr.company, qr.email, qr.phone,
      qr.customer_id AS customerId, c.name AS customerName, c.contact_person AS customerContactPerson, c.email AS customerEmail, c.phone AS customerPhone,
      qr.process, qr.material, qr.material_family AS materialFamily, qr.material_grade AS materialGrade,
      qr.finish, qr.color, qr.tolerance, qr.quantity, qr.units, qr.design_units AS designUnits, qr.notes,
      qr.status, qr.estimate_currency AS estimateCurrency,
      qr.estimate_low AS estimateLow, qr.estimate_high AS estimateHigh,
      qr.estimated_lead_days AS estimatedLeadDays, qr.admin_notes AS adminNotes,
      qr.original_name AS originalName, qr.storage_name AS storageName,
      qr.mime_type AS mimeType, qr.file_size AS fileSize, qr.review_data AS reviewData, qr.option_selections AS optionSelections,
      qr.created_at AS createdAt, qr.updated_at AS updatedAt
    FROM quote_requests qr
    LEFT JOIN customers c ON c.id = qr.customer_id
    ${getQuoteRequestScopeClause(user)}
    ORDER BY datetime(qr.created_at) DESC;
  `).map(mapQuoteRow);
}

function getQuoteRequestById(quoteId, user = null) {
  const row = getRow(`
    SELECT qr.id, qr.reference_code AS referenceCode, qr.name, qr.company, qr.email, qr.phone,
      qr.customer_id AS customerId, c.name AS customerName, c.contact_person AS customerContactPerson, c.email AS customerEmail, c.phone AS customerPhone,
      qr.process, qr.material, qr.material_family AS materialFamily, qr.material_grade AS materialGrade,
      qr.finish, qr.color, qr.tolerance, qr.quantity, qr.units, qr.design_units AS designUnits, qr.notes,
      qr.status, qr.estimate_currency AS estimateCurrency,
      qr.estimate_low AS estimateLow, qr.estimate_high AS estimateHigh,
      qr.estimated_lead_days AS estimatedLeadDays, qr.admin_notes AS adminNotes,
      qr.original_name AS originalName, qr.storage_name AS storageName,
      qr.mime_type AS mimeType, qr.file_size AS fileSize, qr.review_data AS reviewData, qr.option_selections AS optionSelections,
      qr.created_at AS createdAt, qr.updated_at AS updatedAt
    FROM quote_requests qr
    LEFT JOIN customers c ON c.id = qr.customer_id
    WHERE qr.id = ${sqlValue(quoteId)}
    LIMIT 1;
  `);
  const quote = row ? mapQuoteRow(row) : null;
  if (!quote || !user) return quote;
  return canAccessQuoteRequest(user, quote) ? quote : null;
}

function getPricingRates() {
  return getRows(`
    SELECT key, kind, label, currency, unit, rate, difficulty_factor AS difficultyFactor,
      source_url AS sourceUrl, source_note AS sourceNote, updated_at AS updatedAt
    FROM pricing_rate_snapshots
    ORDER BY kind ASC, label ASC;
  `).map((row) => ({
    ...row,
    rate: Number(row.rate || 0),
    difficultyFactor: row.difficultyFactor === null || row.difficultyFactor === undefined ? null : Number(row.difficultyFactor || 0),
  }));
}

function createQuoteReference() {
  const count = getRow(`SELECT COUNT(*) AS count FROM quote_requests;`);
  return `BWQ-${new Date().getFullYear()}-${String(Number(count?.count || 0) + 1).padStart(4, "0")}`;
}

function getSupplierIndustryList() {
  return getRows(`
    SELECT DISTINCT COALESCE(industry, 'General') AS industry
    FROM suppliers
    ORDER BY industry ASC;
  `).map((row) => row.industry);
}

function tokenizeRequirement(text) {
  return [...new Set(String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2))];
}

function scoreSupplierMatch(supplier, tokens, guidance = {}) {
  const haystack = [
    supplier.name,
    supplier.industry,
    supplier.contactPerson,
    supplier.city,
    supplier.email,
    supplier.phone,
    supplier.approvalStatus,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;
  tokens.forEach((token) => {
    if (supplier.name?.toLowerCase().includes(token)) score += 5;
    if (supplier.industry?.toLowerCase().includes(token)) score += 4;
    if (haystack.includes(token)) score += 2;
  });
  if (guidance.preferredIndustries?.length) {
    const industry = String(supplier.industry || "").toLowerCase();
    if (guidance.preferredIndustries.some((entry) => industry.includes(String(entry).toLowerCase()))) score += 8;
  }
  if (guidance.preferredCities?.length) {
    const city = String(supplier.city || "").toLowerCase();
    if (guidance.preferredCities.some((entry) => city.includes(String(entry).toLowerCase()))) score += 5;
  }
  if (supplier.approvalStatus === "Approved") score += 3;
  if (supplier.bankDetails?.accountNumber) score += 1;
  return score;
}

function uniqueList(values = []) {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))];
}

function findRelevantSuppliers(requirement, scope = "local", guidance = {}) {
  const tokens = uniqueList([
    ...tokenizeRequirement(requirement),
    ...tokenizeRequirement(guidance.localSearchText || ""),
    ...tokenizeRequirement((guidance.mustHaveTerms || []).join(" ")),
  ]);
  if (!tokens.length) {
    return {
      message: "Describe the requirement in a bit more detail so I can suggest relevant vendors.",
      suppliers: [],
    };
  }

  const suppliers = getSuppliers({ limit: 2500 });
  const scored = suppliers
    .map((supplier) => ({ supplier, score: scoreSupplierMatch(supplier, tokens, guidance) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.supplier.name.localeCompare(right.supplier.name))
    .slice(0, 25)
    .map((entry) => entry.supplier);

  const localityLabel = scope === "global" ? "global search with local shortlist" : "local search";
  const baseMessage = scored.length
    ? `I found ${scored.length} relevant vendors for this ${localityLabel}. Approved vendors are ranked first.`
    : `I could not find a strong ${localityLabel} match in the supplier master yet.`;
  const message = guidance.responseIntro ? `${guidance.responseIntro} ${baseMessage}`.trim() : baseMessage;

  return { message, suppliers: scored };
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  const texts = [];
  (payload?.output || []).forEach((item) => {
    (item?.content || []).forEach((entry) => {
      if (typeof entry?.text === "string" && entry.text.trim()) {
        texts.push(entry.text.trim());
      }
    });
  });
  return texts.join("\n").trim();
}

function extractJsonObject(text) {
  const source = String(text || "").trim();
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (_error) {
    const start = source.indexOf("{");
    const end = source.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(source.slice(start, end + 1));
      } catch (_nestedError) {
        return null;
      }
    }
    return null;
  }
}

function postJson(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body));
    const request = https.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": payload.length,
          ...headers,
        },
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let parsed = null;
          try {
            parsed = text ? JSON.parse(text) : null;
          } catch (_error) {
            parsed = null;
          }
          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(parsed?.error?.message || `Request failed with status ${response.statusCode}`));
            return;
          }
          resolve(parsed || {});
        });
      }
    );
    request.on("error", reject);
    request.setTimeout(15000, () => request.destroy(new Error("Request timed out")));
    request.write(payload);
    request.end();
  });
}

async function analyzeSupplierRequirement(requirement, scope) {
  if (!OPENAI_API_KEY) {
    return {
      available: false,
      fallback: true,
      responseIntro: "Using the built-in supplier matcher right now.",
      localSearchText: requirement,
      onlineSearchText: `${requirement} industrial supplier vendor`,
      preferredIndustries: [],
      preferredCities: [],
      mustHaveTerms: [],
    };
  }

  const payload = {
    model: OPENAI_MODEL,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You help shortlist industrial suppliers. Return strict JSON only with keys: summary, responseIntro, localSearchText, onlineSearchText, preferredIndustries, preferredCities, mustHaveTerms. Keep arrays short. Do not include markdown.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Requirement: ${requirement}\nScope: ${scope}\nKnown industries: ${getSupplierIndustryList().join(", ")}`,
          },
        ],
      },
    ],
  };

  const response = await postJson("https://api.openai.com/v1/responses", payload, {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  });
  const parsed = extractJsonObject(extractResponseText(response));
  if (!parsed) {
    throw new Error("OpenAI returned an unreadable supplier plan");
  }

  return {
    available: true,
    fallback: false,
    summary: String(parsed.summary || "").trim(),
    responseIntro: String(parsed.responseIntro || "").trim(),
    localSearchText: String(parsed.localSearchText || requirement).trim() || requirement,
    onlineSearchText: String(parsed.onlineSearchText || `${requirement} industrial supplier vendor`).trim() || `${requirement} industrial supplier vendor`,
    preferredIndustries: uniqueList(parsed.preferredIndustries || []),
    preferredCities: uniqueList(parsed.preferredCities || []),
    mustHaveTerms: uniqueList(parsed.mustHaveTerms || []),
  };
}

function fetchWebText(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 Brahmworks Vendor Assistant",
        },
      },
      (response) => {
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`Search returned status ${response.statusCode}`));
          response.resume();
          return;
        }
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      }
    );
    request.on("error", reject);
    request.setTimeout(8000, () => request.destroy(new Error("Search timed out")));
  });
}

function parseDuckDuckGoResults(html) {
  const results = [];
  const pattern = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g;
  let match;
  while ((match = pattern.exec(html))) {
    const title = match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const link = match[1];
    if (!title || !link) continue;
    results.push({ title, url: link });
    if (results.length >= 8) break;
  }
  return results;
}

async function searchOnlineVendors(requirement) {
  const query = encodeURIComponent(requirement);
  const html = await fetchWebText(`https://html.duckduckgo.com/html/?q=${query}`);
  return parseDuckDuckGoResults(html);
}

function getInventory() {
  return getRows(`
    SELECT
      i.id, i.name, i.sku, i.category, i.quantity, i.threshold_value AS threshold,
      i.cost, i.supplier_id AS supplierId, i.customer_id AS customerId, i.project_id AS projectId,
      i.location, i.unit, i.last_updated AS lastUpdated,
      s.id AS supplier_join_id, s.name AS supplier_name, s.contact_person AS supplier_contact_person,
      s.email AS supplier_email, s.phone AS supplier_phone, s.city AS supplier_city,
      s.lead_time_days AS supplier_lead_time_days, s.rating AS supplier_rating,
      c.name AS customerName, p.name AS projectName
    FROM inventory i
    LEFT JOIN suppliers s ON s.id = i.supplier_id
    LEFT JOIN customers c ON c.id = i.customer_id
    LEFT JOIN projects p ON p.id = i.project_id
    ORDER BY i.name ASC;
  `).map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    quantity: Number(row.quantity),
    threshold: Number(row.threshold),
    cost: Number(row.cost),
    supplierId: row.supplierId,
    customerId: row.customerId,
    projectId: row.projectId,
    location: row.location,
    unit: row.unit,
    lastUpdated: row.lastUpdated,
    status: Number(row.quantity) <= Number(row.threshold) ? "Low Stock" : "Healthy",
    customer: row.customerId ? { id: row.customerId, name: row.customerName } : null,
    project: row.projectId ? { id: row.projectId, name: row.projectName } : null,
    supplier: row.supplier_join_id
      ? {
          id: row.supplier_join_id,
          name: row.supplier_name,
          contactPerson: row.supplier_contact_person,
          email: row.supplier_email,
          phone: row.supplier_phone,
          city: row.supplier_city,
          leadTimeDays: Number(row.supplier_lead_time_days || 0),
          rating: Number(row.supplier_rating || 0),
        }
      : null,
  }));
}

function getMovements() {
  return getRows(`
    SELECT m.id, m.inventory_id AS inventoryId, m.item_name AS itemName, m.sku, m.type, m.quantity, m.note,
      m.created_by AS createdBy, m.created_at AS createdAt,
      i.project_id AS projectId, p.name AS projectName, i.customer_id AS customerId, c.name AS customerName
    FROM movements m
    LEFT JOIN inventory i ON i.id = m.inventory_id
    LEFT JOIN projects p ON p.id = i.project_id
    LEFT JOIN customers c ON c.id = i.customer_id
    ORDER BY datetime(m.created_at) DESC;
  `).map((row) => ({
    ...row,
    quantity: Number(row.quantity),
    customer: row.customerId ? { id: row.customerId, name: row.customerName } : null,
    project: row.projectId ? { id: row.projectId, name: row.projectName } : null,
  }));
}

function getPurchaseOrders() {
  const orders = getRows(`
    SELECT
      po.id, po.po_number AS poNumber, po.supplier_id AS supplierId, po.status,
      po.customer_id AS customerId, po.project_id AS projectId,
      po.order_date AS orderDate, po.expected_date AS expectedDate, po.notes, po.created_by AS createdBy,
      po.created_at AS createdAt, po.updated_at AS updatedAt,
      s.id AS supplier_join_id, s.name AS supplier_name, s.contact_person AS supplier_contact_person,
      s.email AS supplier_email, s.phone AS supplier_phone, s.city AS supplier_city,
      s.lead_time_days AS supplier_lead_time_days, s.rating AS supplier_rating,
      c.name AS customerName, p.name AS projectName,
      inv.id AS invoiceId, inv.invoice_number AS invoiceNumber, inv.status AS invoiceStatus,
      grn.id AS grnId, grn.grn_number AS grnNumber, grn.received_date AS grnReceivedDate
    FROM purchase_orders po
    LEFT JOIN suppliers s ON s.id = po.supplier_id
    LEFT JOIN customers c ON c.id = po.customer_id
    LEFT JOIN projects p ON p.id = po.project_id
    LEFT JOIN invoices inv ON inv.po_id = po.id
    LEFT JOIN grns grn ON grn.po_id = po.id
    ORDER BY datetime(po.created_at) DESC;
  `);

  const items = getRows(`
    SELECT id, po_id AS poId, inventory_id AS inventoryId, name, quantity, cost
    FROM purchase_order_items;
  `);

  return orders.map((order) => {
    const lines = items.filter((item) => item.poId === order.id).map((item) => ({
      id: item.id,
      inventoryId: item.inventoryId,
      name: item.name,
      quantity: Number(item.quantity),
      cost: Number(item.cost),
    }));

    return {
      id: order.id,
      poNumber: order.poNumber,
      supplierId: order.supplierId,
      customerId: order.customerId,
      projectId: order.projectId,
      status: order.status,
      orderDate: order.orderDate,
      expectedDate: order.expectedDate,
      notes: order.notes,
      createdBy: order.createdBy,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      supplier: order.supplier_join_id
        ? {
            id: order.supplier_join_id,
            name: order.supplier_name,
            contactPerson: order.supplier_contact_person,
            email: order.supplier_email,
            phone: order.supplier_phone,
            city: order.supplier_city,
            leadTimeDays: Number(order.supplier_lead_time_days || 0),
            rating: Number(order.supplier_rating || 0),
          }
        : null,
      customer: order.customerId ? { id: order.customerId, name: order.customerName } : null,
      project: order.projectId ? { id: order.projectId, name: order.projectName } : null,
      items: lines,
      totalValue: lines.reduce((sum, item) => sum + item.quantity * item.cost, 0),
      invoiceId: order.invoiceId,
      invoiceNumber: order.invoiceNumber,
      invoiceStatus: order.invoiceStatus,
      grnId: order.grnId,
      grnNumber: order.grnNumber,
      grnReceivedDate: order.grnReceivedDate,
    };
  });
}

function getUsers() {
  return getRows(`
    SELECT id, name, email, role
    FROM users
    ORDER BY name ASC;
  `);
}

function getDeliveryChallans() {
  return getRows(`
    SELECT
      dc.id, dc.challan_number AS challanNumber, dc.challan_type AS challanType, dc.po_id AS poId,
      dc.customer_id AS customerId, dc.project_id AS projectId,
      dc.recipient_name AS recipientName, dc.recipient_company AS recipientCompany, dc.destination,
      dc.vehicle_number AS vehicleNumber, dc.notes, dc.created_by AS createdBy,
      dc.created_at AS createdAt, dc.updated_at AS updatedAt,
      po.po_number AS poNumber, c.name AS customerName, p.name AS projectName
    FROM delivery_challans dc
    LEFT JOIN purchase_orders po ON po.id = dc.po_id
    LEFT JOIN customers c ON c.id = dc.customer_id
    LEFT JOIN projects p ON p.id = dc.project_id
    ORDER BY datetime(dc.created_at) DESC;
  `).map((row) => ({
    ...row,
    customer: row.customerId ? { id: row.customerId, name: row.customerName } : null,
    project: row.projectId ? { id: row.projectId, name: row.projectName } : null,
  }));
}

function getPackagingDocuments() {
  return getRows(`
    SELECT
      pd.id, pd.packaging_number AS packagingNumber, pd.challan_id AS challanId,
      pd.customer_id AS customerId, pd.project_id AS projectId,
      pd.package_count AS packageCount, pd.gross_weight AS grossWeight, pd.net_weight AS netWeight,
      pd.contents, pd.notes, pd.created_by AS createdBy, pd.created_at AS createdAt, pd.updated_at AS updatedAt,
      dc.challan_number AS challanNumber, dc.recipient_company AS recipientCompany,
      c.name AS customerName, p.name AS projectName
    FROM packaging_documents pd
    JOIN delivery_challans dc ON dc.id = pd.challan_id
    LEFT JOIN customers c ON c.id = pd.customer_id
    LEFT JOIN projects p ON p.id = pd.project_id
    ORDER BY datetime(pd.created_at) DESC;
  `).map((row) => ({
    ...row,
    packageCount: Number(row.packageCount),
    grossWeight: Number(row.grossWeight || 0),
    netWeight: Number(row.netWeight || 0),
    customer: row.customerId ? { id: row.customerId, name: row.customerName } : null,
    project: row.projectId ? { id: row.projectId, name: row.projectName } : null,
  }));
}

function buildReports() {
  const inventory = getInventory();
  const purchaseOrders = getPurchaseOrders();
  const movements = getMovements();
  const quotes = getQuoteRequests();
  const lowStock = inventory.filter((item) => item.quantity <= item.threshold);
  const approvedSupplierCount = getSupplierCount({ approvalStatus: "Approved" });
  const projects = getProjects();
  const customers = getCustomers();
  const suppliers = getSuppliers({ limit: 10000 });

  return {
    metrics: {
      quoteCount: quotes.length,
      newQuoteCount: quotes.filter((quote) => quote.status === "New").length,
      skuCount: inventory.length,
      unitsOnHand: inventory.reduce((sum, item) => sum + item.quantity, 0),
      lowStockCount: lowStock.length,
      totalInventoryValue: inventory.reduce((sum, item) => sum + item.quantity * item.cost, 0),
      supplierCount: approvedSupplierCount,
      openPurchaseOrders: purchaseOrders.filter((order) => order.status !== "Received").length,
      projectCount: projects.length,
      customerCount: customers.length,
    },
    lowStock,
    topValueItems: [...inventory]
      .sort((a, b) => b.quantity * b.cost - a.quantity * a.cost)
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        value: item.quantity * item.cost,
        quantity: item.quantity,
      })),
    recentMovements: movements.slice(0, 8),
    projectBreakdown: projects.map((project) => ({
      id: project.id,
      name: project.name,
      customerName: project.customer?.name || "No customer",
      inventoryCount: inventory.filter((item) => item.projectId === project.id).length,
      supplierCount: suppliers.filter((supplier) => supplier.projectId === project.id).length,
      poCount: purchaseOrders.filter((order) => order.projectId === project.id).length,
    })),
  };
}

function createPoNumber() {
  const count = getRow(`SELECT COUNT(*) AS count FROM purchase_orders;`);
  return `PO-${new Date().getFullYear()}-${String(Number(count.count) + 41).padStart(3, "0")}`;
}

function createInvoiceNumber() {
  const count = getRow(`SELECT COUNT(*) AS count FROM invoices;`);
  return `INV-${new Date().getFullYear()}-${String(Number(count.count) + 1).padStart(3, "0")}`;
}

function createGrnNumber() {
  const count = getRow(`SELECT COUNT(*) AS count FROM grns;`);
  return `GRN-${new Date().getFullYear()}-${String(Number(count.count) + 1).padStart(3, "0")}`;
}

function createChallanNumber() {
  const count = getRow(`SELECT COUNT(*) AS count FROM delivery_challans;`);
  return `DC-${new Date().getFullYear()}-${String(Number(count.count) + 1).padStart(3, "0")}`;
}

function createPackagingNumber() {
  const count = getRow(`SELECT COUNT(*) AS count FROM packaging_documents;`);
  return `PKG-${new Date().getFullYear()}-${String(Number(count.count) + 1).padStart(3, "0")}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function documentShell(title, body) {
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(title)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #1d1d1f; }
        .doc { max-width: 920px; margin: 0 auto; }
        .header { display:flex; justify-content:space-between; align-items:start; margin-bottom: 28px; }
        h1,h2,h3,p { margin: 0; }
        .muted { color: #5f6767; }
        .grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px; }
        .panel { border: 1px solid #ddd; border-radius: 12px; padding: 16px; }
        table { width:100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border-bottom:1px solid #ddd; padding: 12px 10px; text-align:left; }
        .right { text-align:right; }
        .footer { margin-top: 24px; color:#5f6767; font-size: 13px; }
        .letterhead { border-bottom: 3px solid #7f3116; padding-bottom: 16px; margin-bottom: 24px; display:flex; gap:18px; align-items:center; }
        .letterhead img { width: 160px; height: auto; object-fit: contain; display:block; }
        .letterhead-copy { display:grid; gap:4px; }
        .letterhead h2 { color:#7f3116; margin-bottom: 4px; }
      </style>
    </head>
    <body>
      <div class="doc">${body}</div>
      <script>window.print && window.print();</script>
    </body>
  </html>`;
}

function renderLetterhead(title, subtitle, contact) {
  return `
    <div class="letterhead">
      <img src="${LOGO_PUBLIC_URL}" alt="Brahmworks logo" />
      <div class="letterhead-copy">
        <h2>${escapeHtml(title)}</h2>
        <p class="muted">${escapeHtml(subtitle)}</p>
        <p class="muted">${escapeHtml(contact)}</p>
      </div>
    </div>
  `;
}

function renderProjectReference(customer, project) {
  return `
    <div class="panel">
      <h3>Project Mapping</h3>
      <p><strong>Customer:</strong> ${escapeHtml(customer?.name || "Not linked")}</p>
      <p><strong>Project:</strong> ${escapeHtml(project?.name || "Not linked")}</p>
    </div>
  `;
}

function generatePurchaseOrderDocument(order) {
  const rows = order.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.inventoryId || "-")}</td>
          <td class="right">${item.quantity}</td>
          <td class="right">${formatCurrency(item.cost)}</td>
          <td class="right">${formatCurrency(item.quantity * item.cost)}</td>
        </tr>`
    )
    .join("");

  return documentShell(
    `${order.poNumber} Purchase Order`,
    `
      ${renderLetterhead("Brahmworks", "Industrial Systems, Procurement and Dispatch", "Bengaluru, Karnataka • dispatch@brahmworks.com • +91 80 4000 5500")}
      <div class="header">
        <div>
          <h1>Brahmworks Purchase Order</h1>
          <p class="muted">${escapeHtml(order.poNumber)}</p>
        </div>
        <div class="panel">
          <p><strong>Status:</strong> ${escapeHtml(order.status)}</p>
          <p><strong>Order Date:</strong> ${escapeHtml(order.orderDate)}</p>
          <p><strong>Expected:</strong> ${escapeHtml(order.expectedDate || "-")}</p>
        </div>
      </div>
      <div class="grid">
        <div class="panel">
          <h3>Supplier</h3>
          <p>${escapeHtml(order.supplier?.name || "N/A")}</p>
          <p class="muted">${escapeHtml(order.supplier?.contactPerson || "")}</p>
          <p class="muted">${escapeHtml(order.supplier?.email || "")}</p>
          <p class="muted">${escapeHtml(order.supplier?.phone || "")}</p>
        </div>
        <div class="panel">
          <h3>Prepared By</h3>
          <p>${escapeHtml(order.createdBy || "System")}</p>
          <p class="muted">Brahmworks Procurement</p>
          <p class="muted">${escapeHtml(order.notes || "No notes")}</p>
        </div>
        ${renderProjectReference(order.customer, order.project)}
      </div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Inventory Ref</th>
            <th class="right">Qty</th>
            <th class="right">Unit Cost</th>
            <th class="right">Line Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">Total Order Value: ${formatCurrency(order.totalValue)}</div>
    `
  );
}

function generateInvoiceDocument(order) {
  return documentShell(
    `${order.invoiceNumber} Invoice`,
    `
      ${renderLetterhead("Brahmworks", "Industrial Systems, Procurement and Dispatch", "Bengaluru, Karnataka • accounts@brahmworks.com • +91 80 4000 5500")}
      <div class="header">
        <div>
          <h1>Brahmworks Supplier Invoice</h1>
          <p class="muted">${escapeHtml(order.invoiceNumber || "Pending invoice")}</p>
        </div>
        <div class="panel">
          <p><strong>PO:</strong> ${escapeHtml(order.poNumber)}</p>
          <p><strong>Status:</strong> ${escapeHtml(order.invoiceStatus || "Draft")}</p>
          <p><strong>Issue Date:</strong> ${escapeHtml(order.orderDate)}</p>
        </div>
      </div>
      <div class="panel">
        <h3>Supplier</h3>
        <p>${escapeHtml(order.supplier?.name || "N/A")}</p>
        <p class="muted">${escapeHtml(order.supplier?.city || "")}</p>
      </div>
      <div class="grid" style="margin-top: 16px;">
        ${renderProjectReference(order.customer, order.project)}
      </div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th class="right">Qty</th>
            <th class="right">Unit Cost</th>
            <th class="right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${order.items
            .map(
              (item) => `
              <tr>
                <td>${escapeHtml(item.name)}</td>
                <td class="right">${item.quantity}</td>
                <td class="right">${formatCurrency(item.cost)}</td>
                <td class="right">${formatCurrency(item.quantity * item.cost)}</td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>
      <div class="footer">Invoice Total: ${formatCurrency(order.totalValue)}</div>
    `
  );
}

function generateGrnDocument(order) {
  return documentShell(
    `${order.grnNumber} Goods Receipt Note`,
    `
      ${renderLetterhead("Brahmworks", "Industrial Systems, Procurement and Dispatch", "Bengaluru, Karnataka • stores@brahmworks.com • +91 80 4000 5500")}
      <div class="header">
        <div>
          <h1>Brahmworks GRN</h1>
          <p class="muted">${escapeHtml(order.grnNumber || "No GRN yet")}</p>
        </div>
        <div class="panel">
          <p><strong>PO:</strong> ${escapeHtml(order.poNumber)}</p>
          <p><strong>Received:</strong> ${escapeHtml(order.grnReceivedDate || "-")}</p>
          <p><strong>Status:</strong> ${escapeHtml(order.status)}</p>
        </div>
      </div>
      <div class="panel">
        <h3>Received From</h3>
        <p>${escapeHtml(order.supplier?.name || "N/A")}</p>
        <p class="muted">${escapeHtml(order.supplier?.contactPerson || "")}</p>
      </div>
      <div class="grid" style="margin-top: 16px;">
        ${renderProjectReference(order.customer, order.project)}
      </div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th class="right">Received Qty</th>
            <th class="right">Reference Cost</th>
          </tr>
        </thead>
        <tbody>
          ${order.items
            .map(
              (item) => `
              <tr>
                <td>${escapeHtml(item.name)}</td>
                <td class="right">${item.quantity}</td>
                <td class="right">${formatCurrency(item.cost)}</td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>
      <div class="footer">Generated for Brahmworks receiving operations.</div>
    `
  );
}

function generateInventoryReportDocument() {
  const inventory = getInventory();
  const reports = buildReports();
  return documentShell(
    "Brahmworks Inventory Report",
    `
      ${renderLetterhead("Brahmworks", "Inventory Control and Operational Reporting", "Bengaluru, Karnataka • reports@brahmworks.com • +91 80 4000 5500")}
      <div class="header">
        <div>
          <h1>Brahmworks Inventory Report</h1>
          <p class="muted">Generated ${escapeHtml(new Date().toISOString().slice(0, 10))}</p>
        </div>
        <div class="panel">
          <p><strong>SKUs:</strong> ${reports.metrics.skuCount}</p>
          <p><strong>Units:</strong> ${reports.metrics.unitsOnHand}</p>
          <p><strong>Inventory Value:</strong> ${formatCurrency(reports.metrics.totalInventoryValue)}</p>
          <p><strong>Customers:</strong> ${reports.metrics.customerCount || 0}</p>
          <p><strong>Projects:</strong> ${reports.metrics.projectCount || 0}</p>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Customer</th>
            <th>Project</th>
            <th class="right">Qty</th>
            <th class="right">Threshold</th>
            <th class="right">Cost</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${inventory
            .map(
              (item) => `
              <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.sku)}</td>
                <td>${escapeHtml(item.category)}</td>
                <td>${escapeHtml(item.customer?.name || "-")}</td>
                <td>${escapeHtml(item.project?.name || "-")}</td>
                <td class="right">${item.quantity}</td>
                <td class="right">${item.threshold}</td>
                <td class="right">${formatCurrency(item.cost)}</td>
                <td>${escapeHtml(item.status)}</td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>
    `
  );
}

function generateQuoteEstimateDocument(quote) {
  const pricing = quote.pricing || buildQuotePricing(quote, quote.reviewData || {});
  const selections = quote.optionSelections || pricing.settings?.optionSelections || {};
  const customerName = quote.customer?.name || quote.name;
  const customerCompany = quote.customer?.name || quote.company || "Independent buyer";
  const customerEmail = quote.customer?.email || quote.email;
  const customerPhone = quote.customer?.phone || quote.phone || "-";
  const customerContact = quote.customer?.contactPerson || "-";
  const rows = [
    ["Quotation Ref", quote.referenceCode],
    ["Customer", customerName],
    ["Company", customerCompany],
    ["Contact Person", customerContact],
    ["Email", customerEmail],
    ["Phone", customerPhone],
    ["Process", pricing.process],
    ["Material", pricing.material || "Configured material"],
    ["Finish", pricing.finish || selections.surfaceFinish || "As specified"],
    ["Quantity", `${pricing.quantity} ${quote.units || "pcs"}`],
    ["Lead Time", `${pricing.leadDays} working days`],
  ];

  return documentShell(
    `${quote.referenceCode} Brahmworks Estimate`,
    `
      ${renderLetterhead("Brahmworks", "Rapid Manufacturing Estimate", "Bengaluru, Karnataka • sales@brahmworks.com • +91 80 4000 5500")}
      <div class="header">
        <div>
          <h1>Commercial Estimate</h1>
          <p class="muted">${escapeHtml(quote.referenceCode)}</p>
        </div>
        <div class="panel">
          <p><strong>Date:</strong> ${escapeHtml(new Date().toISOString().slice(0, 10))}</p>
          <p><strong>Status:</strong> ${escapeHtml(quote.status || "Quoted")}</p>
          <p><strong>Prepared By:</strong> Brahmworks Estimation Team</p>
        </div>
      </div>

      <div class="grid">
        <div class="panel">
          <h3>Customer Details</h3>
          ${rows
            .slice(0, 5)
            .map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(String(value || "-"))}</p>`)
            .join("")}
        </div>
        <div class="panel">
          <h3>Part Overview</h3>
          ${rows
            .slice(5)
            .map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(String(value || "-"))}</p>`)
            .join("")}
          <p><strong>Uploaded File:</strong> ${escapeHtml(quote.originalName || "-")}</p>
        </div>
      </div>

      <div class="panel" style="margin-bottom: 20px;">
        <h3>Estimated Price Range</h3>
        <p><strong>Budgetary Range:</strong> ${formatCurrency(pricing.low)} to ${formatCurrency(pricing.high)}</p>
        <p><strong>Estimated Commercial Total:</strong> ${formatCurrency(pricing.total)}</p>
        <p class="muted">This estimate is based on the supplied CAD data and selected manufacturing assumptions. Final pricing is subject to engineering review and commercial confirmation.</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Cost Element</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${pricing.breakdown
            .map(
              (item) => `
                <tr>
                  <td>${escapeHtml(item.label)}</td>
                  <td class="right">${formatCurrency(item.value)}</td>
                </tr>`,
            )
            .join("")}
          <tr>
            <td><strong>Total Estimated Commercial Value</strong></td>
            <td class="right"><strong>${formatCurrency(pricing.total)}</strong></td>
          </tr>
        </tbody>
      </table>

      <div class="grid" style="margin-top: 20px;">
        <div class="panel">
          <h3>Manufacturing Selections</h3>
          ${Object.entries(selections)
            .filter(([, value]) => value)
            .map(([key, value]) => `<p><strong>${escapeHtml(key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()))}:</strong> ${escapeHtml(String(value))}</p>`)
            .join("")}
        </div>
        <div class="panel">
          <h3>Commercial Notes</h3>
          <p>${escapeHtml(quote.notes || "No customer-facing notes added.")}</p>
          <p class="muted" style="margin-top: 12px;">Validity: 15 days from issue date.</p>
          <p class="muted">Taxes, freight, tooling revisions, and special inspection requirements may be quoted separately where applicable.</p>
        </div>
      </div>

      <div class="footer">
        This Brahmworks estimate is intended for customer review and commercial alignment. Save as PDF from the browser print dialog before sharing.
      </div>
    `,
  );
}

function generateQuoteDfmDocument(quote) {
  const pricing = quote.pricing || buildQuotePricing(quote, quote.reviewData || {});
  const dfm = quote.dfm || buildQuoteDfmAnalysis({ ...quote, pricing });
  const customerName = quote.customer?.name || quote.name || "Independent buyer";
  const customerEmail = quote.customer?.email || quote.email || "-";
  const checklist = dfm?.checklist || [];
  const passedChecks = checklist.filter((item) => item.status === "pass");
  const failedChecks = checklist.filter((item) => item.status === "warn" || item.status === "hold");
  const reviewChecks = checklist.filter((item) => item.status === "review");
  const overallDecision = failedChecks.length || dfm?.requiresEngineeringContact ? "FAIL" : "PASS";
  const reviewRows = (dfm?.checklist || [])
    .map(
      (item) => `
        <tr>
          <td><strong>${escapeHtml(item.title)}</strong><br /><span class="muted">${escapeHtml(item.detail)}</span></td>
          <td>${escapeHtml(item.status.toUpperCase())}</td>
          <td>${escapeHtml(item.recommendation || "-")}</td>
        </tr>`
    )
    .join("");

  return documentShell(
    `${quote.referenceCode} Brahmworks DFM Review`,
    `
      ${renderLetterhead("Brahmworks", "Design for Manufacturability Review", "Bengaluru, Karnataka • engineering@brahmworks.com • +91 80 4000 5500")}
      <div class="header">
        <div>
          <h1>DFM Analysis Report</h1>
          <p class="muted">${escapeHtml(quote.referenceCode)}</p>
        </div>
        <div class="panel">
          <p><strong>Date:</strong> ${escapeHtml(new Date().toISOString().slice(0, 10))}</p>
          <p><strong>Process:</strong> ${escapeHtml(quote.process || "-")}</p>
          <p><strong>Prepared By:</strong> Brahmworks Engineering</p>
        </div>
      </div>

      <div class="grid">
        <div class="panel">
          <h3>Customer Details</h3>
          <p><strong>Customer:</strong> ${escapeHtml(customerName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>
          <p><strong>Uploaded File:</strong> ${escapeHtml(quote.originalName || "-")}</p>
        </div>
        <div class="panel">
          <h3>Part Overview</h3>
          <p><strong>Material:</strong> ${escapeHtml(pricing.material || quote.material || "-")}</p>
          <p><strong>Quantity:</strong> ${escapeHtml(String(pricing.quantity || quote.quantity || 1))} ${escapeHtml(quote.units || "pcs")}</p>
          <p><strong>Budgetary Range:</strong> ${escapeHtml(formatCurrency(pricing.low))} to ${escapeHtml(formatCurrency(pricing.high))}</p>
        </div>
      </div>

      <div class="panel" style="margin-bottom: 20px;">
        <h3>${escapeHtml(dfm?.title || "DFM Review")}</h3>
        <p><strong>Summary:</strong> ${escapeHtml(dfm?.summary || "No formal DFM checklist is configured for this process.")}</p>
        <p><strong>Customer DFM Result:</strong> ${overallDecision}</p>
        <p><strong>Passed Checks:</strong> ${passedChecks.length} &nbsp; <strong>Failed Checks:</strong> ${failedChecks.length} &nbsp; <strong>Needs Review:</strong> ${reviewChecks.length}</p>
        ${
          dfm?.requiresEngineeringContact
            ? '<p style="margin-top: 12px;"><strong>Engineering escalation:</strong> This part appears complex enough that our engineering team will contact you for the next steps before final mold/tool release.</p>'
            : '<p style="margin-top: 12px;">This review is intended to highlight manufacturability risks early. Final tool and process release is subject to engineering confirmation.</p>'
        }
      </div>

      <div class="grid" style="margin-bottom: 20px;">
        <div class="panel">
          <h3>Checks Passed</h3>
          ${
            passedChecks.length
              ? passedChecks.map((item) => `<p><strong>${escapeHtml(item.title)}:</strong> ${escapeHtml(item.detail)}</p>`).join("")
              : "<p>No checks were marked as passed automatically in this review.</p>"
          }
        </div>
        <div class="panel">
          <h3>Checks Failed / Need Action</h3>
          ${
            failedChecks.length
              ? failedChecks
                  .map(
                    (item) =>
                      `<p><strong>${escapeHtml(item.title)}:</strong> ${escapeHtml(item.detail)}${item.recommendation ? ` Recommended action: ${escapeHtml(item.recommendation)}` : ""}</p>`,
                  )
                  .join("")
              : "<p>No failed checks were identified in this automated DFM screen.</p>"
          }
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>DFM Check</th>
            <th>Status</th>
            <th>Recommendation</th>
          </tr>
        </thead>
        <tbody>
          ${reviewRows || '<tr><td colspan="3">No detailed DFM checklist is available for this process.</td></tr>'}
        </tbody>
      </table>

      <div class="grid" style="margin-top: 20px;">
        <div class="panel">
          <h3>Applied Rules</h3>
          ${(dfm?.rules || [])
            .map((rule) => `<p>${escapeHtml(rule)}</p>`)
            .join("")}
        </div>
        <div class="panel">
          <h3>Commercial Note</h3>
          <p>${escapeHtml(quote.notes || "No additional customer notes were provided.")}</p>
          <p class="muted" style="margin-top: 12px;">This Brahmworks DFM report is a design-screening document and should be saved as PDF before being shared externally.</p>
        </div>
      </div>

      <div class="footer">
        Brahmworks DFM reports combine automated rule checks with engineering review. Complex mold and fabrication programs may require follow-up before tooling release.
      </div>
    `,
  );
}

function generateDeliveryChallanDocument(challan) {
  const order = challan.poId ? getPurchaseOrderById(challan.poId) : null;
  const items = order?.items || [];
  const totalAmount = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.cost || 0), 0);
  const rows = items.length
    ? items
        .map(
          (item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(item.name)}</td>
              <td>${item.quantity}</td>
              <td>-</td>
              <td>${formatCurrency(item.cost)}</td>
              <td>${formatCurrency(item.quantity * item.cost)}</td>
            </tr>`
        )
        .join("")
    : `
      <tr>
        <td>1</td>
        <td>Shipment as per challan notes</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
      </tr>`;

  return documentShell(
    `${challan.challanNumber} Delivery Challan`,
    `
      ${renderLetterhead("Brahmworks", "Dispatch and Logistics", "Bengaluru, Karnataka • logistics@brahmworks.com • +91 80 4000 5500")}
      <div class="header">
        <div>
          <h1>Delivery Challan</h1>
          <p class="muted">${escapeHtml(challan.challanNumber)}</p>
        </div>
        <div class="panel">
          <p><strong>Type:</strong> ${escapeHtml(challan.challanType)}</p>
          <p><strong>Date:</strong> ${escapeHtml((challan.createdAt || "").slice(0, 10))}</p>
          <p><strong>Vehicle:</strong> ${escapeHtml(challan.vehicleNumber || "-")}</p>
        </div>
      </div>
      <p><strong>Customer Information:</strong></p>
      <div class="grid">
        <div class="panel">
          <h3>Shipped To</h3>
          <p>${escapeHtml(challan.recipientCompany)}</p>
          <p class="muted">${escapeHtml(challan.destination)}</p>
          <p class="muted">ATTN: ${escapeHtml(challan.recipientName)}</p>
        </div>
        <div class="panel">
          <h3>Shipped From</h3>
          <p>Brahmworks Pvt Ltd.</p>
          <p class="muted">Brahmworks GSTIN: 29AAHCB3680K1Z9</p>
          <p class="muted">No A, 177, 4th Cross Rd, Peenya 1st Stage, Bengaluru, Karnataka 560058</p>
          <p class="muted">Dispatch Contact: Prince Gupta, Sourcing Manager</p>
          <p class="muted">M: +91-8892801886</p>
        </div>
      </div>
      <div class="panel" style="margin-bottom: 20px;">
        <p><strong>Dispatch Reference:</strong> ${escapeHtml(challan.poNumber || "No PO linked")}</p>
        <p><strong>Customer:</strong> ${escapeHtml(challan.customer?.name || "Not linked")}</p>
        <p><strong>Project:</strong> ${escapeHtml(challan.project?.name || "Not linked")}</p>
        <p><strong>Created By:</strong> ${escapeHtml(challan.createdBy)}</p>
        <p><strong>Notes:</strong> ${escapeHtml(challan.notes || "No notes")}</p>
      </div>
      <p><strong>Shipment Contents</strong></p>
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Description</th>
            <th>Quantity</th>
            <th>kg (net weight)</th>
            <th>Price per tonne / unit (INR)</th>
            <th>Amount (INR)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="panel" style="margin-top: 20px;">
        <p><strong>Total:</strong> ${formatCurrency(totalAmount)}</p>
        <p><strong>INCO terms:</strong> Ex works</p>
        <p>The above-mentioned items are for operational / dispatch reference only.</p>
        <p>The value of the items mentioned above is for documentation and customs / logistics evaluation purposes only and does not itself imply cash settlement through this challan.</p>
      </div>
      <div class="footer">
        <p>For Shipper</p>
        <p>Authorized Signatory</p>
        <p>Date: ____________________</p>
        <p>${challan.challanType === "Returnable" ? "Returnable challan: material acknowledgment and return tracking required." : "Non-returnable challan."}</p>
        <p>Save as PDF from the browser print dialog.</p>
      </div>
    `
  );
}

function generatePackagingDocument(packaging) {
  return documentShell(
    `${packaging.packagingNumber} Packaging Document`,
    `
      ${renderLetterhead("Brahmworks", "Dispatch and Packaging Control", "Bengaluru, Karnataka • packaging@brahmworks.com • +91 80 4000 5500")}
      <div class="header">
        <div>
          <h1>Packaging Document</h1>
          <p class="muted">${escapeHtml(packaging.packagingNumber)}</p>
        </div>
        <div class="panel">
          <p><strong>Challan:</strong> ${escapeHtml(packaging.challanNumber)}</p>
          <p><strong>Packages:</strong> ${packaging.packageCount}</p>
          <p><strong>Date:</strong> ${escapeHtml((packaging.createdAt || "").slice(0, 10))}</p>
        </div>
      </div>
      <div class="grid">
        <div class="panel">
          <h3>Destination Party</h3>
          <p>${escapeHtml(packaging.recipientCompany || "-")}</p>
          <p class="muted">${escapeHtml(packaging.contents || "No contents listed")}</p>
        </div>
        <div class="panel">
          <h3>Weight Summary</h3>
          <p>Gross Weight: ${escapeHtml(String(packaging.grossWeight || 0))} kg</p>
          <p>Net Weight: ${escapeHtml(String(packaging.netWeight || 0))} kg</p>
          <p class="muted">${escapeHtml(packaging.notes || "No notes")}</p>
        </div>
        ${renderProjectReference(packaging.customer, packaging.project)}
      </div>
      <table>
        <thead>
          <tr>
            <th>Packaging Ref</th>
            <th>Package Count</th>
            <th>Contents</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${escapeHtml(packaging.packagingNumber)}</td>
            <td>${packaging.packageCount}</td>
            <td>${escapeHtml(packaging.contents || "-")}</td>
          </tr>
        </tbody>
      </table>
      <div class="footer">Use the browser print dialog to save this letterhead document as a PDF.</div>
    `
  );
}

function getPurchaseOrderById(orderId) {
  return getPurchaseOrders().find((order) => order.id === orderId) || null;
}

function getDeliveryChallanById(challanId) {
  return getDeliveryChallans().find((entry) => entry.id === challanId) || null;
}

function getPackagingDocumentById(packagingId) {
  const challans = getDeliveryChallans();
  return getPackagingDocuments()
    .map((doc) => ({
      ...doc,
      recipientCompany: challans.find((challan) => challan.id === doc.challanId)?.recipientCompany || "",
    }))
    .find((entry) => entry.id === packagingId) || null;
}

async function handleApi(req, res, url) {
  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    try {
      const body = await collectBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const user = getRow(`
        SELECT id, name, email, role, customer_id AS customerId, salt, password_hash AS passwordHash
        FROM users
        WHERE lower(email) = ${sqlValue(email)}
        LIMIT 1;
      `);

      if (!user || hashPassword(password, user.salt) !== user.passwordHash) {
        sendJson(res, 401, { error: "Invalid email or password" });
        return;
      }

      const token = crypto.randomBytes(24).toString("hex");
      runSql(`
        INSERT INTO sessions (token, user_id, created_at)
        VALUES (${sqlValue(token)}, ${sqlValue(user.id)}, ${sqlValue(new Date().toISOString())});
      `);

      sendJson(
        res,
        200,
        { user: sanitizeUser(user), token },
        {
          "Set-Cookie": `brahmworks_session=${token}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_MS / 1000}; SameSite=Lax`,
        }
      );
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/customer-signup") {
    try {
      const body = await collectBody(req);
      const name = String(body.name || "").trim();
      const company = String(body.company || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const phone = String(body.phone || "").trim();
      const password = String(body.password || "");

      if (!name || !email || password.length < 8) {
        sendJson(res, 400, { error: "Name, email, and a password with at least 8 characters are required." });
        return;
      }

      const existingUser = getRow(`SELECT id FROM users WHERE lower(email) = ${sqlValue(email)} LIMIT 1;`);
      if (existingUser) {
        sendJson(res, 400, { error: "An account with this email already exists. Please sign in instead." });
        return;
      }

      const now = new Date().toISOString();
      const customerId = crypto.randomUUID();
      const user = createUser(name, email, "Customer", password);
      const requestedCustomerName = company || name;
      const duplicateCustomer = getRow(`SELECT id FROM customers WHERE lower(name) = ${sqlValue(requestedCustomerName.toLowerCase())} LIMIT 1;`);
      const customerName = duplicateCustomer ? `${requestedCustomerName} (${email})` : requestedCustomerName;

      runSql(`
        INSERT INTO customers (id, name, contact_person, email, phone, created_at, updated_at)
        VALUES (
          ${sqlValue(customerId)},
          ${sqlValue(customerName)},
          ${sqlValue(name)},
          ${sqlValue(email)},
          ${sqlValue(phone)},
          ${sqlValue(now)},
          ${sqlValue(now)}
        );
      `);
      runSql(`
        INSERT INTO users (id, name, email, role, customer_id, salt, password_hash)
        VALUES (
          ${sqlValue(user.id)},
          ${sqlValue(user.name)},
          ${sqlValue(user.email)},
          ${sqlValue(user.role)},
          ${sqlValue(customerId)},
          ${sqlValue(user.salt)},
          ${sqlValue(user.passwordHash)}
        );
      `);
      runSql(`
        UPDATE quote_requests
        SET customer_id = ${sqlValue(customerId)}, updated_at = ${sqlValue(now)}
        WHERE (customer_id IS NULL OR customer_id = '')
          AND lower(email) = ${sqlValue(email)};
      `);

      const token = crypto.randomBytes(24).toString("hex");
      runSql(`
        INSERT INTO sessions (token, user_id, created_at)
        VALUES (${sqlValue(token)}, ${sqlValue(user.id)}, ${sqlValue(now)});
      `);

      sendJson(
        res,
        201,
        { user: sanitizeUser({ ...user, customerId }), token },
        {
          "Set-Cookie": `brahmworks_session=${token}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_MS / 1000}; SameSite=Lax`,
        }
      );
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    const authHeader = req.headers.authorization || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const cookies = parseCookies(req);
    const tokenToDelete = bearerToken || cookies.brahmworks_session;
    if (tokenToDelete) runSql(`DELETE FROM sessions WHERE token = ${sqlValue(tokenToDelete)};`);
    sendJson(
      res,
      200,
      { ok: true },
      { "Set-Cookie": "brahmworks_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax" }
    );
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/session") {
    const auth = getSession(req);
    sendJson(res, 200, { user: auth ? sanitizeUser(auth.user) : null });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/quote-config") {
    sendJson(res, 200, { quoteConfig: getQuoteConfig() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/public/quote-requests") {
    try {
      const auth = getSession(req);
      const body = await collectBody(req);
      const linkedCustomer = auth?.user?.customerId ? getCustomerById(auth.user.customerId) : null;
      const name = String(body.name || linkedCustomer?.contactPerson || auth?.user?.name || "").trim();
      const email = String(body.email || linkedCustomer?.email || auth?.user?.email || "").trim().toLowerCase();
      const process = String(body.process || "").trim();
      const quantity = Math.max(1, Number(body.quantity || 1));
      const optionSelections = normalizeQuoteSelections(process, body.optionSelections || {});
      const originalName = sanitizeFilename(body.originalName || body.filename || "quote-file");
      const extension = path.extname(originalName);
      const fileBuffer = decodeBase64Content(body.contentBase64);

      if (!name || !email || !process) {
        sendJson(res, 400, { error: "Name, email, process, and file are required." });
        return;
      }
      if (!fileBuffer.length) {
        sendJson(res, 400, { error: "A STEP, STL, CAD, drawing, or reference file is required." });
        return;
      }

      const storageName = `${crypto.randomUUID()}${extension}`;
      fs.writeFileSync(path.join(PROJECT_FILES_DIR, storageName), fileBuffer);

      const pricing = buildQuotePricing({
        ...body,
        quantity,
        fileSize: fileBuffer.length,
        materialFamily: optionSelections.materialFamily,
        materialGrade: optionSelections.materialGrade,
        optionSelections,
      });
      const now = new Date().toISOString();
      const quoteId = crypto.randomUUID();
      const referenceCode = createQuoteReference();
      runSql(`
        INSERT INTO quote_requests (
          id, reference_code, name, company, email, phone, process, material,
          material_family, material_grade, finish, color, tolerance, quantity, units, design_units, notes, status,
          estimate_currency, estimate_low, estimate_high, estimated_lead_days,
          admin_notes, original_name, storage_name, mime_type, file_size, option_selections, review_data, customer_id,
          created_at, updated_at
        ) VALUES (
          ${sqlValue(quoteId)}, ${sqlValue(referenceCode)}, ${sqlValue(name)},
          ${sqlValue(String(body.company || linkedCustomer?.name || "").trim())}, ${sqlValue(email)},
          ${sqlValue(String(body.phone || linkedCustomer?.phone || "").trim())}, ${sqlValue(process)},
          ${sqlValue(pricing.material)}, ${sqlValue(optionSelections.materialFamily)}, ${sqlValue(optionSelections.materialGrade)},
          ${sqlValue(pricing.finish)}, ${sqlValue(String(optionSelections.colorChoice || "").trim())},
          ${sqlValue(String(optionSelections.toleranceClass || "").trim())}, ${sqlValue(quantity)},
          ${sqlValue(String(body.units || "pcs").trim() || "pcs")},
          ${sqlValue(String(body.designUnits || "mm").trim() || "mm")},
          ${sqlValue(String(body.notes || "").trim())}, 'New',
          ${sqlValue(pricing.currency)}, ${sqlValue(pricing.low)}, ${sqlValue(pricing.high)},
          ${sqlValue(pricing.leadDays)}, NULL,
          ${sqlValue(originalName)}, ${sqlValue(storageName)},
          ${sqlValue(String(body.mimeType || MIME_TYPES[extension.toLowerCase()] || "application/octet-stream"))},
          ${sqlValue(fileBuffer.length)}, ${sqlValue(JSON.stringify(optionSelections))}, ${sqlValue(JSON.stringify(pricing.settings))},
          ${sqlValue(auth?.user?.customerId || "")}, ${sqlValue(now)}, ${sqlValue(now)}
        );
      `);
      sendJson(res, 201, {
        ok: true,
        quoteRequest: {
          id: quoteId,
          referenceCode,
          process: pricing.process,
          material: pricing.material,
          quantity: pricing.quantity,
          estimateCurrency: pricing.currency,
          estimateLow: pricing.low,
          estimateHigh: pricing.high,
          estimatedLeadDays: pricing.leadDays,
        },
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  const auth = requireAuth(req, res);
  if (!auth) return;

  if (req.method === "GET" && url.pathname === "/api/bootstrap") {
    const isCustomer = auth.user.role === "Customer";
    const linkedCustomer = isCustomer && auth.user.customerId ? getCustomerById(auth.user.customerId) : null;
    sendJson(res, 200, {
      user: sanitizeUser(auth.user),
      permissions: getRolePermissions(auth.user.role),
      quoteConfig: getQuoteConfig(),
      pricingRates: isCustomer ? [] : getPricingRates(),
      customers: linkedCustomer ? [linkedCustomer] : isCustomer ? [] : getCustomers(),
      projects: isCustomer ? [] : getProjects(),
      services: isCustomer ? [] : getServices(),
      quoteRequests: getQuoteRequests(auth.user),
      inventory: isCustomer ? [] : getInventory(),
      suppliers: [],
      supplierOptions: isCustomer ? [] : getSupplierOptions(),
      supplierIndustries: isCustomer ? [] : getSupplierIndustryList(),
      supplierTotalCount: isCustomer ? 0 : getSupplierCount(),
      purchaseOrders: isCustomer ? [] : getPurchaseOrders(),
      deliveryChallans: isCustomer ? [] : getDeliveryChallans(),
      packagingDocuments: isCustomer ? [] : getPackagingDocuments(),
      movements: isCustomer ? [] : getMovements(),
      reports: isCustomer ? { metrics: {} } : buildReports(),
      users: isCustomer ? [] : getUsers(),
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/pricing-rates") {
    if (!requirePermission(res, auth.user, "quotes.manage")) return;
    sendJson(res, 200, { pricingRates: getPricingRates() });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/pricing-rates/refresh") {
    if (!requirePermission(res, auth.user, "quotes.manage")) return;
    await refreshPricingRates();
    sendJson(res, 200, { ok: true, pricingRates: getPricingRates() });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/quote-requests") {
    if (!requirePermission(res, auth.user, "quotes.view")) return;
    sendJson(res, 200, { quoteRequests: getQuoteRequests(auth.user) });
    return;
  }

  const quoteRequestMatch = url.pathname.match(/^\/api\/quote-requests\/([^/]+)$/);
  if (quoteRequestMatch && req.method === "GET") {
    if (!requirePermission(res, auth.user, "quotes.view")) return;
    const quoteRequest = getQuoteRequestById(quoteRequestMatch[1], auth.user);
    if (!quoteRequest) {
      sendJson(res, 404, { error: "Quote request not found" });
      return;
    }
    sendJson(res, 200, { quoteRequest });
    return;
  }

  const quoteOrderByQuoteMatch = url.pathname.match(/^\/api\/quote-orders\/quote\/([^/]+)$/);
  if (quoteOrderByQuoteMatch && req.method === "GET") {
    if (!requirePermission(res, auth.user, "quotes.view")) return;
    const quote = getQuoteRequestById(quoteOrderByQuoteMatch[1], auth.user);
    if (!quote) {
      sendJson(res, 404, { error: "Quote request not found" });
      return;
    }
    const quoteOrder = upsertQuoteOrder(quote, {
      customerId: quote.customerId || "",
      status: shouldBlockCheckoutForQuote(quote) ? "Engineering Review Required" : "Ready for Checkout",
    });
    sendJson(res, 200, {
      quoteRequest: quote,
      quoteOrder,
      checkoutBlocked: shouldBlockCheckoutForQuote(quote),
      razorpay: { enabled: Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET), keyId: RAZORPAY_KEY_ID || "" },
      checkoutFlow: {
        nextStep: quote.process === "Injection Molding" ? "DFM-reviewed tooling checkout" : "Commercial checkout",
      },
    });
    return;
  }

  if (quoteRequestMatch && req.method === "PUT") {
    if (!requirePermission(res, auth.user, "quotes.manage")) return;
    try {
      const body = await collectBody(req);
      const existing = getQuoteRequestById(quoteRequestMatch[1]);
      if (!existing) {
        sendJson(res, 404, { error: "Quote request not found" });
        return;
      }
      const nextSelections = normalizeQuoteSelections(
        body.process === undefined ? existing.process : body.process,
        body.optionSelections === undefined ? existing.optionSelections || {} : body.optionSelections,
      );
      const reviewData = {
        ...(existing.reviewData || {}),
        ...(body.reviewData && typeof body.reviewData === "object" ? body.reviewData : {}),
        process: body.process === undefined ? existing.process : body.process,
        quantity: body.quantity === undefined ? existing.quantity : body.quantity,
        materialFamily: nextSelections.materialFamily,
        materialGrade: nextSelections.materialGrade,
        material: buildMaterialLabel(nextSelections.materialFamily, nextSelections.materialGrade),
        finish: nextSelections.surfaceFinish || "",
        optionSelections: nextSelections,
      };
      const pricing = buildQuotePricing(
        {
          process: body.process === undefined ? existing.process : body.process,
          materialFamily: body.materialFamily === undefined ? existing.materialFamily : body.materialFamily,
          materialGrade: body.materialGrade === undefined ? existing.materialGrade : body.materialGrade,
          material: buildMaterialLabel(nextSelections.materialFamily, nextSelections.materialGrade),
          finish: nextSelections.surfaceFinish || "",
          quantity: body.quantity === undefined ? existing.quantity : body.quantity,
          fileSize: existing.fileSize,
          optionSelections: nextSelections,
        },
        reviewData,
      );
      const now = new Date().toISOString();
      runSql(`
        UPDATE quote_requests
        SET
          process = ${sqlValue(pricing.process)},
          material = ${sqlValue(pricing.material)},
          material_family = ${sqlValue(pricing.settings.materialFamily)},
          material_grade = ${sqlValue(pricing.settings.materialGrade)},
          finish = ${sqlValue(pricing.finish)},
          quantity = ${sqlValue(pricing.quantity)},
          customer_id = ${sqlValue(body.customerId === undefined ? existing.customerId || "" : String(body.customerId || "").trim())},
          tolerance = ${sqlValue(pricing.settings.optionSelections?.toleranceClass || "")},
          design_units = ${sqlValue(String(body.designUnits || existing.designUnits || "mm"))},
          option_selections = ${sqlValue(JSON.stringify(pricing.settings.optionSelections || {}))},
          status = ${sqlValue(String(body.status || "New").trim() || "New")},
          admin_notes = ${sqlValue(String(body.adminNotes || "").trim())},
          estimate_currency = ${sqlValue(pricing.currency)},
          estimate_low = ${sqlValue(pricing.low)},
          estimate_high = ${sqlValue(pricing.high)},
          estimated_lead_days = ${sqlValue(pricing.leadDays)},
          review_data = ${sqlValue(JSON.stringify(pricing.settings))},
          updated_at = ${sqlValue(now)}
        WHERE id = ${sqlValue(quoteRequestMatch[1])};
      `);
      sendJson(res, 200, { ok: true, quoteRequest: getQuoteRequestById(quoteRequestMatch[1]) });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  const quoteOrderMatch = url.pathname.match(/^\/api\/quote-orders\/([^/]+)$/);
  if (quoteOrderMatch && req.method === "PUT") {
    if (!requirePermission(res, auth.user, "quotes.view")) return;
    try {
      const existingOrder = getRow(`SELECT quote_request_id AS quoteRequestId FROM quote_orders WHERE id = ${sqlValue(quoteOrderMatch[1])} LIMIT 1;`);
      if (!existingOrder) {
        sendJson(res, 404, { error: "Order draft not found" });
        return;
      }
      const quote = getQuoteRequestById(existingOrder.quoteRequestId, auth.user);
      if (!quote) {
        sendJson(res, 404, { error: "Quote request not found" });
        return;
      }
      const body = await collectBody(req);
      const quoteOrder = upsertQuoteOrder(quote, body);
      sendJson(res, 200, { ok: true, quoteOrder });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  const quoteOrderRazorpayMatch = url.pathname.match(/^\/api\/quote-orders\/([^/]+)\/razorpay-order$/);
  if (quoteOrderRazorpayMatch && req.method === "POST") {
    if (!requirePermission(res, auth.user, "quotes.view")) return;
    try {
      const existingOrder = getRow(`
        SELECT id, quote_request_id AS quoteRequestId
        FROM quote_orders
        WHERE id = ${sqlValue(quoteOrderRazorpayMatch[1])}
        LIMIT 1;
      `);
      if (!existingOrder) {
        sendJson(res, 404, { error: "Order draft not found" });
        return;
      }
      const quote = getQuoteRequestById(existingOrder.quoteRequestId, auth.user);
      if (!quote) {
        sendJson(res, 404, { error: "Quote request not found" });
        return;
      }
      if (shouldBlockCheckoutForQuote(quote)) {
        sendJson(res, 400, { error: "This injection molding order needs Brahmworks engineering review before tooling payment can proceed." });
        return;
      }
      const quoteOrder = getQuoteOrderByQuoteId(quote.id, auth.user);
      if (!quoteOrder) {
        sendJson(res, 404, { error: "Order draft not found" });
        return;
      }
      const razorpayOrder = await razorpayRequest("POST", "/v1/orders", {
        amount: Math.max(100, Math.round(Number(quoteOrder.totalAmount || 0) * 100)),
        currency: quoteOrder.currency || "INR",
        receipt: quote.referenceCode,
        notes: {
          quoteId: quote.id,
          quoteReference: quote.referenceCode,
          process: quote.process,
        },
      });
      runSql(`
        UPDATE quote_orders
        SET razorpay_order_id = ${sqlValue(razorpayOrder.id)},
            updated_at = ${sqlValue(new Date().toISOString())}
        WHERE id = ${sqlValue(quoteOrder.id)};
      `);
      sendJson(res, 200, {
        ok: true,
        razorpay: {
          keyId: RAZORPAY_KEY_ID,
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: "Brahmworks",
          description: `${quote.referenceCode} order payment`,
          prefill: {
            name: quoteOrder.shippingName || quote.name || "",
            email: quote.customer?.email || quote.email || "",
            contact: quoteOrder.shippingPhone || quote.phone || "",
          },
        },
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  const quoteOrderRazorpayVerifyMatch = url.pathname.match(/^\/api\/quote-orders\/([^/]+)\/razorpay-verify$/);
  if (quoteOrderRazorpayVerifyMatch && req.method === "POST") {
    if (!requirePermission(res, auth.user, "quotes.view")) return;
    try {
      const existingOrder = getRow(`
        SELECT id, quote_request_id AS quoteRequestId, razorpay_order_id AS razorpayOrderId
        FROM quote_orders
        WHERE id = ${sqlValue(quoteOrderRazorpayVerifyMatch[1])}
        LIMIT 1;
      `);
      if (!existingOrder) {
        sendJson(res, 404, { error: "Order draft not found" });
        return;
      }
      const quote = getQuoteRequestById(existingOrder.quoteRequestId, auth.user);
      if (!quote) {
        sendJson(res, 404, { error: "Quote request not found" });
        return;
      }
      const body = await collectBody(req);
      const razorpayPaymentId = String(body.razorpay_payment_id || "").trim();
      const razorpayOrderId = String(body.razorpay_order_id || "").trim();
      const razorpaySignature = String(body.razorpay_signature || "").trim();
      if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
        sendJson(res, 400, { error: "Razorpay payment details are incomplete." });
        return;
      }
      const expectedSignature = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");
      if (!RAZORPAY_KEY_SECRET || expectedSignature !== razorpaySignature) {
        sendJson(res, 400, { error: "Razorpay signature verification failed." });
        return;
      }
      runSql(`
        UPDATE quote_orders
        SET payment_status = 'Paid',
            status = 'Confirmed',
            razorpay_order_id = ${sqlValue(razorpayOrderId)},
            razorpay_payment_id = ${sqlValue(razorpayPaymentId)},
            razorpay_signature = ${sqlValue(razorpaySignature)},
            updated_at = ${sqlValue(new Date().toISOString())}
        WHERE id = ${sqlValue(existingOrder.id)};
      `);
      sendJson(res, 200, { ok: true, quoteOrder: getQuoteOrderByQuoteId(quote.id, auth.user) });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/customers") {
    if (!requirePermission(res, auth.user, "quotes.manage")) return;
    try {
      const body = await collectBody(req);
      const name = String(body.name || "").trim();
      if (!name) {
        sendJson(res, 400, { error: "Customer name is required" });
        return;
      }
      const now = new Date().toISOString();
      runSql(`
        INSERT INTO customers (id, name, contact_person, email, phone, created_at, updated_at)
        VALUES (
          ${sqlValue(crypto.randomUUID())}, ${sqlValue(name)}, ${sqlValue(String(body.contactPerson || "").trim())},
          ${sqlValue(String(body.email || "").trim())}, ${sqlValue(String(body.phone || "").trim())},
          ${sqlValue(now)}, ${sqlValue(now)}
        );
      `);
      sendJson(res, 201, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/projects") {
    if (!requirePermission(res, auth.user, "projects.manage")) return;
    try {
      const body = await collectBody(req);
      const name = String(body.name || "").trim();
      if (!name) {
        sendJson(res, 400, { error: "Project name is required" });
        return;
      }
      const now = new Date().toISOString();
      const projectId = crypto.randomUUID();
      runSql(`
        INSERT INTO projects (id, name, customer_id, status, notes, created_at, updated_at)
        VALUES (
          ${sqlValue(projectId)}, ${sqlValue(name)}, ${sqlValue(String(body.customerId || ""))},
          ${sqlValue(String(body.status || "Active").trim() || "Active")},
          ${sqlValue(String(body.notes || "").trim())}, ${sqlValue(now)}, ${sqlValue(now)}
        );
      `);
      const serviceIds = Array.isArray(body.serviceIds)
        ? body.serviceIds
        : String(body.serviceIds || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
      serviceIds.forEach((serviceId) => {
        runSql(`
          INSERT INTO project_services (id, project_id, service_id, created_at)
          VALUES (${sqlValue(crypto.randomUUID())}, ${sqlValue(projectId)}, ${sqlValue(serviceId)}, ${sqlValue(now)});
        `);
      });
      sendJson(res, 201, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  const projectDocsMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/documents$/);
  if (projectDocsMatch && req.method === "GET") {
    if (!requirePermission(res, auth.user, "projects.view")) return;
    sendJson(res, 200, { documents: getProjectDocuments(projectDocsMatch[1]) });
    return;
  }

  if (projectDocsMatch && req.method === "POST") {
    if (!requirePermission(res, auth.user, "projects.manage")) return;
    try {
      const projectId = projectDocsMatch[1];
      const project = getRow(`SELECT id, name FROM projects WHERE id = ${sqlValue(projectId)} LIMIT 1;`);
      if (!project) {
        sendJson(res, 404, { error: "Project not found" });
        return;
      }
      const body = await collectBody(req);
      const originalName = sanitizeFilename(body.originalName || body.filename || "document");
      const extension = path.extname(originalName);
      const storageName = `${crypto.randomUUID()}${extension}`;
      const fileBuffer = decodeBase64Content(body.contentBase64);
      if (!fileBuffer.length) {
        sendJson(res, 400, { error: "Document file is required" });
        return;
      }
      fs.writeFileSync(path.join(PROJECT_FILES_DIR, storageName), fileBuffer);
      const now = new Date().toISOString();
      runSql(`
        INSERT INTO project_documents (
          id, project_id, category, title, original_name, storage_name,
          mime_type, file_size, notes, created_by, created_at, updated_at
        ) VALUES (
          ${sqlValue(crypto.randomUUID())}, ${sqlValue(projectId)}, ${sqlValue(String(body.category || "Other").trim() || "Other")},
          ${sqlValue(String(body.title || originalName).trim() || originalName)}, ${sqlValue(originalName)}, ${sqlValue(storageName)},
          ${sqlValue(String(body.mimeType || MIME_TYPES[extension.toLowerCase()] || "application/octet-stream"))}, ${sqlValue(fileBuffer.length)},
          ${sqlValue(String(body.notes || "").trim())}, ${sqlValue(auth.user.name)}, ${sqlValue(now)}, ${sqlValue(now)}
        );
      `);
      sendJson(res, 201, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/services") {
    if (!requirePermission(res, auth.user, "projects.manage")) return;
    try {
      const body = await collectBody(req);
      const name = String(body.name || "").trim();
      if (!name) {
        sendJson(res, 400, { error: "Service name is required" });
        return;
      }
      const existing = getRow(`SELECT id FROM services WHERE lower(name) = lower(${sqlValue(name)});`);
      if (existing) {
        sendJson(res, 409, { error: "Service already exists" });
        return;
      }
      const now = new Date().toISOString();
      runSql(`
        INSERT INTO services (id, name, created_at, updated_at)
        VALUES (${sqlValue(crypto.randomUUID())}, ${sqlValue(name)}, ${sqlValue(now)}, ${sqlValue(now)});
      `);
      sendJson(res, 201, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/suppliers") {
    if (!requirePermission(res, auth.user, "suppliers.view")) return;
    const query = String(url.searchParams.get("query") || "");
    const industry = String(url.searchParams.get("industry") || "All");
    const approvalStatus = String(url.searchParams.get("approvalStatus") || "All");
    const limit = Number(url.searchParams.get("limit") || 50);
    const offset = Number(url.searchParams.get("offset") || 0);
    const filters = { query, industry, approvalStatus, limit, offset };
    sendJson(res, 200, {
      suppliers: getSuppliers(filters),
      totalCount: getSupplierCount(filters),
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/supplier-assistant") {
    if (!requirePermission(res, auth.user, "suppliers.view")) return;
    try {
      const body = await collectBody(req);
      const requirement = String(body.requirement || "").trim();
      const scope = String(body.scope || "local").trim().toLowerCase() === "global" ? "global" : "local";
      const aiPlan = await analyzeSupplierRequirement(requirement, scope).catch((error) => ({
        available: false,
        fallback: true,
        responseIntro: `OpenAI copilot is unavailable right now, so I used the built-in matcher instead. ${error.message}`.trim(),
        localSearchText: requirement,
        onlineSearchText: `${requirement} industrial supplier vendor`,
        preferredIndustries: [],
        preferredCities: [],
        mustHaveTerms: [],
      }));
      const localResult = findRelevantSuppliers(requirement, scope, aiPlan);
      let onlineVendors = [];
      let onlineNote = "";
      if (scope === "global") {
        try {
          onlineVendors = await searchOnlineVendors(aiPlan.onlineSearchText || `${requirement} industrial supplier vendor`);
          onlineNote = onlineVendors.length
            ? "I also found a few global web results outside your supplier master."
            : "I did not find clear global web results for that query.";
        } catch (error) {
          onlineNote = `Online lookup is currently unavailable: ${error.message}`;
        }
      }

      sendJson(res, 200, {
        message: [aiPlan.summary, localResult.message].filter(Boolean).join(" ").trim(),
        suppliers: localResult.suppliers,
        totalCount: localResult.suppliers.length,
        onlineVendors,
        onlineNote,
        assistantMode: aiPlan.available ? "openai" : "fallback",
        assistantModel: aiPlan.available ? OPENAI_MODEL : null,
      });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/supplier-options") {
    if (!requirePermission(res, auth.user, "suppliers.view")) return;
    sendJson(res, 200, { suppliers: getSupplierOptions(500) });
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/profile") {
    if (!requirePermission(res, auth.user, "profile.edit")) return;
    try {
      const body = await collectBody(req);
      const updates = [];
      if (body.name) {
        updates.push(`name = ${sqlValue(String(body.name).trim())}`);
      }
      if (body.password) {
        const salt = crypto.randomBytes(16).toString("hex");
        updates.push(`salt = ${sqlValue(salt)}`);
        updates.push(`password_hash = ${sqlValue(hashPassword(String(body.password), salt))}`);
      }
      if (!updates.length) {
        sendJson(res, 400, { error: "Nothing to update" });
        return;
      }
      runSql(`UPDATE users SET ${updates.join(", ")} WHERE id = ${sqlValue(auth.user.id)};`);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/users") {
    if (!requirePermission(res, auth.user, "users.manage")) return;
    try {
      const body = await collectBody(req);
      const existing = getRow(`SELECT id FROM users WHERE lower(email) = lower(${sqlValue(String(body.email || "").trim())}) LIMIT 1;`);
      if (existing) {
        sendJson(res, 409, { error: "Email already exists" });
        return;
      }
      const newUser = createUser(
        String(body.name || "").trim(),
        String(body.email || "").trim(),
        String(body.role || "Operations").trim(),
        String(body.password || "welcome123")
      );
      runSql(`
        INSERT INTO users (id, name, email, role, customer_id, salt, password_hash)
        VALUES (
          ${sqlValue(newUser.id)}, ${sqlValue(newUser.name)}, ${sqlValue(newUser.email)},
          ${sqlValue(newUser.role)}, '', ${sqlValue(newUser.salt)}, ${sqlValue(newUser.passwordHash)}
        );
      `);
      sendJson(res, 201, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch && req.method === "PUT") {
    if (!requirePermission(res, auth.user, "users.manage")) return;
    try {
      const body = await collectBody(req);
      const assignments = [
        `name = ${sqlValue(String(body.name || "").trim())}`,
        `email = ${sqlValue(String(body.email || "").trim())}`,
        `role = ${sqlValue(String(body.role || "Operations").trim())}`,
      ];
      if (body.password) {
        const salt = crypto.randomBytes(16).toString("hex");
        assignments.push(`salt = ${sqlValue(salt)}`);
        assignments.push(`password_hash = ${sqlValue(hashPassword(String(body.password), salt))}`);
      }
      runSql(`UPDATE users SET ${assignments.join(", ")} WHERE id = ${sqlValue(userMatch[1])};`);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/reports") {
    if (!requirePermission(res, auth.user, "documents.export")) return;
    sendJson(res, 200, buildReports());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/inventory") {
    if (!requirePermission(res, auth.user, "inventory.create")) return;
    try {
      const body = await collectBody(req);
      const sku = String(body.sku || "").trim();
      const existing = getRow(`SELECT id FROM inventory WHERE lower(sku) = lower(${sqlValue(sku)}) LIMIT 1;`);
      if (existing) {
        sendJson(res, 409, { error: "SKU already exists" });
        return;
      }

      const now = new Date().toISOString();
      runSql(`
        INSERT INTO inventory (id, name, sku, category, customer_id, project_id, quantity, threshold_value, cost, supplier_id, location, unit, last_updated, created_at, updated_at)
        VALUES (
          ${sqlValue(crypto.randomUUID())}, ${sqlValue(String(body.name || "").trim())}, ${sqlValue(sku)},
          ${sqlValue(String(body.category || "").trim())},
          ${sqlValue(String(body.customerId || ""))}, ${sqlValue(String(body.projectId || ""))},
          ${sqlValue(Number(body.quantity || 0))},
          ${sqlValue(Number(body.threshold || 0))}, ${sqlValue(Number(body.cost || 0))},
          ${sqlValue(String(body.supplierId || ""))}, ${sqlValue(String(body.location || "").trim())},
          ${sqlValue(String(body.unit || "pcs").trim())}, ${sqlValue(now)}, ${sqlValue(now)}, ${sqlValue(now)}
        );
      `);
      sendJson(res, 201, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  const inventoryMatch = url.pathname.match(/^\/api\/inventory\/([^/]+)$/);
  if (inventoryMatch && req.method === "PUT") {
    if (!requirePermission(res, auth.user, "inventory.edit")) return;
    try {
      const inventoryId = inventoryMatch[1];
      const body = await collectBody(req);
      const now = new Date().toISOString();
      runSql(`
        UPDATE inventory
        SET
          name = ${sqlValue(String(body.name || "").trim())},
          sku = ${sqlValue(String(body.sku || "").trim())},
          category = ${sqlValue(String(body.category || "").trim())},
          customer_id = ${sqlValue(String(body.customerId || ""))},
          project_id = ${sqlValue(String(body.projectId || ""))},
          quantity = ${sqlValue(Number(body.quantity || 0))},
          threshold_value = ${sqlValue(Number(body.threshold || 0))},
          cost = ${sqlValue(Number(body.cost || 0))},
          supplier_id = ${sqlValue(String(body.supplierId || ""))},
          location = ${sqlValue(String(body.location || "").trim())},
          unit = ${sqlValue(String(body.unit || "pcs").trim())},
          last_updated = ${sqlValue(now)},
          updated_at = ${sqlValue(now)}
        WHERE id = ${sqlValue(inventoryId)};
      `);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (inventoryMatch && req.method === "DELETE") {
    if (!requirePermission(res, auth.user, "inventory.delete")) return;
    const inventoryId = inventoryMatch[1];
    const linked = getRow(`
      SELECT
        (SELECT COUNT(*) FROM purchase_order_items WHERE inventory_id = ${sqlValue(inventoryId)}) AS poCount,
        (SELECT COUNT(*) FROM movements WHERE inventory_id = ${sqlValue(inventoryId)}) AS movementCount;
    `);
    if (Number(linked.poCount) > 0 || Number(linked.movementCount) > 0) {
      sendJson(res, 409, { error: "Inventory item cannot be deleted because it has linked purchase orders or movements" });
      return;
    }
    runSql(`DELETE FROM inventory WHERE id = ${sqlValue(inventoryId)};`);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/inventory/adjust") {
    if (!requirePermission(res, auth.user, "inventory.adjust")) return;
    try {
      const body = await collectBody(req);
      const inventoryId = String(body.inventoryId || "");
      const type = String(body.type || "in");
      const quantity = Number(body.quantity || 0);
      const note = String(body.note || "").trim();
      const item = getRow(`
        SELECT id, name, sku, quantity
        FROM inventory
        WHERE id = ${sqlValue(inventoryId)}
        LIMIT 1;
      `);

      if (!item) {
        sendJson(res, 404, { error: "Inventory item not found" });
        return;
      }
      if (quantity <= 0) {
        sendJson(res, 400, { error: "Quantity must be greater than zero" });
        return;
      }
      if (type === "out" && Number(item.quantity) < quantity) {
        sendJson(res, 400, { error: "Not enough stock available" });
        return;
      }

      const nextQuantity = type === "in" ? Number(item.quantity) + quantity : Number(item.quantity) - quantity;
      const now = new Date().toISOString();
      runSql(`
        UPDATE inventory
        SET quantity = ${sqlValue(nextQuantity)}, last_updated = ${sqlValue(now)}, updated_at = ${sqlValue(now)}
        WHERE id = ${sqlValue(inventoryId)};
        INSERT INTO movements (id, inventory_id, item_name, sku, type, quantity, note, created_by, created_at)
        VALUES (
          ${sqlValue(crypto.randomUUID())}, ${sqlValue(inventoryId)}, ${sqlValue(item.name)}, ${sqlValue(item.sku)},
          ${sqlValue(type)}, ${sqlValue(quantity)}, ${sqlValue(note)}, ${sqlValue(auth.user.name)}, ${sqlValue(now)}
        );
      `);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/suppliers") {
    if (!requirePermission(res, auth.user, "suppliers.create")) return;
    try {
      const body = await collectBody(req);
      const now = new Date().toISOString();
      runSql(`
        INSERT INTO suppliers (id, name, customer_id, project_id, industry, approval_status, bank_details, contact_person, email, phone, city, lead_time_days, rating, created_at, updated_at)
        VALUES (
          ${sqlValue(crypto.randomUUID())}, ${sqlValue(String(body.name || "").trim())},
          ${sqlValue(String(body.customerId || ""))}, ${sqlValue(String(body.projectId || ""))},
          ${sqlValue(String(body.industry || "General").trim() || "General")},
          ${sqlValue("Not Approved")}, ${sqlValue(null)},
          ${sqlValue(String(body.contactPerson || "").trim())}, ${sqlValue(String(body.email || "").trim())},
          ${sqlValue(String(body.phone || "").trim())}, ${sqlValue(String(body.city || "").trim())},
          ${sqlValue(Number(body.leadTimeDays || 0))}, ${sqlValue(Number(body.rating || 0))},
          ${sqlValue(now)}, ${sqlValue(now)}
        );
      `);
      sendJson(res, 201, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  const supplierMatch = url.pathname.match(/^\/api\/suppliers\/([^/]+)$/);
  if (supplierMatch && req.method === "PUT") {
    if (!requirePermission(res, auth.user, "suppliers.edit")) return;
    try {
      const supplierId = supplierMatch[1];
      const body = await collectBody(req);
      const existingSupplier = getRow(`
        SELECT id, name, customer_id AS customerId, project_id AS projectId, COALESCE(industry, 'General') AS industry,
          COALESCE(approval_status, 'Not Approved') AS approvalStatus,
          contact_person AS contactPerson, email, phone, city,
          lead_time_days AS leadTimeDays, rating
        FROM suppliers
        WHERE id = ${sqlValue(supplierId)}
        LIMIT 1;
      `);
      if (!existingSupplier) {
        sendJson(res, 404, { error: "Supplier not found" });
        return;
      }
      const now = new Date().toISOString();
      const merged = {
        name: body.name === undefined ? existingSupplier.name : String(body.name || "").trim(),
        customerId: body.customerId === undefined ? existingSupplier.customerId || "" : String(body.customerId || ""),
        projectId: body.projectId === undefined ? existingSupplier.projectId || "" : String(body.projectId || ""),
        industry:
          body.industry === undefined
            ? existingSupplier.industry
            : String(body.industry || "General").trim() || "General",
        approvalStatus:
          body.approvalStatus === undefined
            ? existingSupplier.approvalStatus
            : String(body.approvalStatus || "Not Approved").trim() || "Not Approved",
        contactPerson:
          body.contactPerson === undefined ? existingSupplier.contactPerson || "" : String(body.contactPerson || "").trim(),
        email: body.email === undefined ? existingSupplier.email || "" : String(body.email || "").trim(),
        phone: body.phone === undefined ? existingSupplier.phone || "" : String(body.phone || "").trim(),
        city: body.city === undefined ? existingSupplier.city || "" : String(body.city || "").trim(),
        leadTimeDays:
          body.leadTimeDays === undefined ? Number(existingSupplier.leadTimeDays || 0) : Number(body.leadTimeDays || 0),
        rating: body.rating === undefined ? Number(existingSupplier.rating || 0) : Number(body.rating || 0),
      };
      runSql(`
        UPDATE suppliers
        SET
          name = ${sqlValue(merged.name)},
          customer_id = ${sqlValue(merged.customerId)},
          project_id = ${sqlValue(merged.projectId)},
          industry = ${sqlValue(merged.industry)},
          approval_status = ${sqlValue(merged.approvalStatus)},
          contact_person = ${sqlValue(merged.contactPerson)},
          email = ${sqlValue(merged.email)},
          phone = ${sqlValue(merged.phone)},
          city = ${sqlValue(merged.city)},
          lead_time_days = ${sqlValue(merged.leadTimeDays)},
          rating = ${sqlValue(merged.rating)},
          updated_at = ${sqlValue(now)}
        WHERE id = ${sqlValue(supplierId)};
      `);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  const supplierBankDetailsMatch = url.pathname.match(/^\/api\/suppliers\/([^/]+)\/bank-details$/);
  if (supplierBankDetailsMatch && req.method === "PUT") {
    if (!requirePermission(res, auth.user, "suppliers.bank.edit")) return;
    try {
      const supplierId = supplierBankDetailsMatch[1];
      const body = await collectBody(req);
      const now = new Date().toISOString();
      runSql(`
        UPDATE suppliers
        SET
          bank_details = ${sqlValue(JSON.stringify({
            accountName: String(body.accountName || "").trim(),
            bankName: String(body.bankName || "").trim(),
            accountNumber: String(body.accountNumber || "").trim(),
            ifscCode: String(body.ifscCode || "").trim(),
            branch: String(body.branch || "").trim(),
            notes: String(body.notes || "").trim(),
            updatedBy: auth.user.name,
            updatedAt: now,
          }))},
          updated_at = ${sqlValue(now)}
        WHERE id = ${sqlValue(supplierId)};
      `);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (supplierMatch && req.method === "DELETE") {
    if (!requirePermission(res, auth.user, "suppliers.delete")) return;
    const supplierId = supplierMatch[1];
    const linked = getRow(`
      SELECT
        (SELECT COUNT(*) FROM inventory WHERE supplier_id = ${sqlValue(supplierId)}) AS inventoryCount,
        (SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = ${sqlValue(supplierId)}) AS poCount;
    `);
    if (Number(linked.inventoryCount) > 0 || Number(linked.poCount) > 0) {
      sendJson(res, 409, { error: "Supplier cannot be deleted because it is linked to inventory items or purchase orders" });
      return;
    }
    runSql(`DELETE FROM suppliers WHERE id = ${sqlValue(supplierId)};`);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/purchase-orders") {
    if (!requirePermission(res, auth.user, "purchaseOrders.create")) return;
    try {
      const body = await collectBody(req);
      const inventoryId = String(body.inventoryId || "");
      const inventoryItem = getRow(`
        SELECT id, name, cost, supplier_id AS supplierId, customer_id AS customerId, project_id AS projectId
        FROM inventory WHERE id = ${sqlValue(inventoryId)} LIMIT 1;
      `);
      if (!inventoryItem) {
        sendJson(res, 404, { error: "Inventory item not found" });
        return;
      }

      const poId = crypto.randomUUID();
      const invoiceId = crypto.randomUUID();
      const poNumber = createPoNumber();
      const invoiceNumber = createInvoiceNumber();
      const quantity = Number(body.quantity || 0);
      const cost = Number(body.cost || inventoryItem.cost || 0);
      const totalValue = quantity * cost;
      const now = new Date().toISOString();
      const orderDate = String(body.orderDate || now.slice(0, 10));
      const expectedDate = String(body.expectedDate || "");
      const supplierId = String(body.supplierId || inventoryItem.supplierId || "");
      const customerId = String(body.customerId || inventoryItem.customerId || "");
      const projectId = String(body.projectId || inventoryItem.projectId || "");
      const status = String(body.status || "Pending");
      const notes = String(body.notes || "").trim();

      runSql(`
        INSERT INTO purchase_orders (id, po_number, supplier_id, customer_id, project_id, status, order_date, expected_date, notes, created_by, created_at, updated_at)
        VALUES (
          ${sqlValue(poId)}, ${sqlValue(poNumber)}, ${sqlValue(supplierId)}, ${sqlValue(customerId)}, ${sqlValue(projectId)}, ${sqlValue(status)},
          ${sqlValue(orderDate)}, ${sqlValue(expectedDate)}, ${sqlValue(notes)}, ${sqlValue(auth.user.name)},
          ${sqlValue(now)}, ${sqlValue(now)}
        );
        INSERT INTO purchase_order_items (id, po_id, inventory_id, name, quantity, cost)
        VALUES (
          ${sqlValue(crypto.randomUUID())}, ${sqlValue(poId)}, ${sqlValue(inventoryId)}, ${sqlValue(inventoryItem.name)},
          ${sqlValue(quantity)}, ${sqlValue(cost)}
        );
        INSERT INTO invoices (id, invoice_number, po_id, supplier_id, status, issue_date, due_date, total_value, notes, created_at, updated_at)
        VALUES (
          ${sqlValue(invoiceId)}, ${sqlValue(invoiceNumber)}, ${sqlValue(poId)}, ${sqlValue(supplierId)},
          ${sqlValue(status === "Received" ? "Issued" : "Draft")}, ${sqlValue(orderDate)}, ${sqlValue(expectedDate)},
          ${sqlValue(totalValue)}, ${sqlValue(notes)}, ${sqlValue(now)}, ${sqlValue(now)}
        );
      `);
      sendJson(res, 201, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  const purchaseOrderMatch = url.pathname.match(/^\/api\/purchase-orders\/([^/]+)$/);
  if (purchaseOrderMatch && req.method === "PUT") {
    if (!requirePermission(res, auth.user, "purchaseOrders.edit")) return;
    try {
      const orderId = purchaseOrderMatch[1];
      const existing = getPurchaseOrderById(orderId);
      if (!existing) {
        sendJson(res, 404, { error: "Purchase order not found" });
        return;
      }
      if (existing.status === "Received") {
        sendJson(res, 409, { error: "Received purchase orders cannot be edited" });
        return;
      }
      const body = await collectBody(req);
      const quantity = Number(body.quantity || existing.items[0].quantity);
      const cost = Number(body.cost || existing.items[0].cost);
      const totalValue = quantity * cost;
      const now = new Date().toISOString();
      runSql(`
        UPDATE purchase_orders
        SET
          supplier_id = ${sqlValue(String(body.supplierId || existing.supplierId || ""))},
          customer_id = ${sqlValue(String(body.customerId || existing.customerId || ""))},
          project_id = ${sqlValue(String(body.projectId || existing.projectId || ""))},
          status = ${sqlValue(String(body.status || existing.status))},
          order_date = ${sqlValue(String(body.orderDate || existing.orderDate))},
          expected_date = ${sqlValue(String(body.expectedDate || existing.expectedDate || ""))},
          notes = ${sqlValue(String(body.notes || existing.notes || ""))},
          updated_at = ${sqlValue(now)}
        WHERE id = ${sqlValue(orderId)};
        UPDATE purchase_order_items
        SET
          quantity = ${sqlValue(quantity)},
          cost = ${sqlValue(cost)}
        WHERE po_id = ${sqlValue(orderId)};
        UPDATE invoices
        SET
          supplier_id = ${sqlValue(String(body.supplierId || existing.supplierId || ""))},
          status = ${sqlValue(String(body.status || existing.status) === "Received" ? "Issued" : "Draft")},
          issue_date = ${sqlValue(String(body.orderDate || existing.orderDate))},
          due_date = ${sqlValue(String(body.expectedDate || existing.expectedDate || ""))},
          total_value = ${sqlValue(totalValue)},
          notes = ${sqlValue(String(body.notes || existing.notes || ""))},
          updated_at = ${sqlValue(now)}
        WHERE po_id = ${sqlValue(orderId)};
      `);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (purchaseOrderMatch && req.method === "DELETE") {
    if (!requirePermission(res, auth.user, "purchaseOrders.delete")) return;
    const orderId = purchaseOrderMatch[1];
    const existing = getPurchaseOrderById(orderId);
    if (!existing) {
      sendJson(res, 404, { error: "Purchase order not found" });
      return;
    }
    if (existing.status === "Received") {
      sendJson(res, 409, { error: "Received purchase orders cannot be deleted" });
      return;
    }
    runSql(`
      DELETE FROM invoices WHERE po_id = ${sqlValue(orderId)};
      DELETE FROM purchase_order_items WHERE po_id = ${sqlValue(orderId)};
      DELETE FROM purchase_orders WHERE id = ${sqlValue(orderId)};
    `);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/purchase-orders/receive") {
    if (!requirePermission(res, auth.user, "purchaseOrders.receive")) return;
    try {
      const body = await collectBody(req);
      const orderId = String(body.orderId || "");
      const order = getPurchaseOrderById(orderId);
      if (!order) {
        sendJson(res, 404, { error: "Purchase order not found" });
        return;
      }
      if (order.status === "Received") {
        sendJson(res, 409, { error: "Purchase order is already received" });
        return;
      }

      const receivedDate = new Date().toISOString();
      const grnId = crypto.randomUUID();
      const grnNumber = createGrnNumber();
      const movementStatements = order.items
        .map((item) => {
          const inventory = getRow(`
            SELECT id, quantity, name, sku FROM inventory WHERE id = ${sqlValue(item.inventoryId)} LIMIT 1;
          `);
          const nextQuantity = Number(inventory.quantity) + Number(item.quantity);
          return `
            UPDATE inventory
            SET quantity = ${sqlValue(nextQuantity)}, last_updated = ${sqlValue(receivedDate)}, updated_at = ${sqlValue(receivedDate)}
            WHERE id = ${sqlValue(item.inventoryId)};
            INSERT INTO movements (id, inventory_id, item_name, sku, type, quantity, note, created_by, created_at)
            VALUES (
              ${sqlValue(crypto.randomUUID())}, ${sqlValue(item.inventoryId)}, ${sqlValue(inventory.name)}, ${sqlValue(inventory.sku)},
              'in', ${sqlValue(item.quantity)}, ${sqlValue(`PO received: ${order.poNumber}`)},
              ${sqlValue(auth.user.name)}, ${sqlValue(receivedDate)}
            );
          `;
        })
        .join("\n");

      runSql(`
        UPDATE purchase_orders
        SET status = 'Received', updated_at = ${sqlValue(receivedDate)}
        WHERE id = ${sqlValue(orderId)};
        UPDATE invoices
        SET status = 'Issued', updated_at = ${sqlValue(receivedDate)}
        WHERE po_id = ${sqlValue(orderId)};
        INSERT INTO grns (id, grn_number, po_id, received_date, received_by, notes, created_at)
        VALUES (
          ${sqlValue(grnId)}, ${sqlValue(grnNumber)}, ${sqlValue(orderId)},
          ${sqlValue(receivedDate.slice(0, 10))}, ${sqlValue(auth.user.name)},
          ${sqlValue(`Goods received for ${order.poNumber}`)}, ${sqlValue(receivedDate)}
        );
        ${movementStatements}
      `);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/delivery-challans") {
    if (!requirePermission(res, auth.user, "logistics.manage")) return;
    try {
      const body = await collectBody(req);
      const linkedOrder = body.poId ? getPurchaseOrderById(String(body.poId || "")) : null;
      const now = new Date().toISOString();
      runSql(`
        INSERT INTO delivery_challans (
          id, challan_number, challan_type, po_id, customer_id, project_id, recipient_name, recipient_company,
          destination, vehicle_number, notes, created_by, created_at, updated_at
        )
        VALUES (
          ${sqlValue(crypto.randomUUID())}, ${sqlValue(createChallanNumber())}, ${sqlValue(String(body.challanType || "Non-Returnable"))},
          ${sqlValue(String(body.poId || ""))},
          ${sqlValue(String(body.customerId || linkedOrder?.customerId || ""))},
          ${sqlValue(String(body.projectId || linkedOrder?.projectId || ""))},
          ${sqlValue(String(body.recipientName || "").trim())},
          ${sqlValue(String(body.recipientCompany || "").trim())}, ${sqlValue(String(body.destination || "").trim())},
          ${sqlValue(String(body.vehicleNumber || "").trim())}, ${sqlValue(String(body.notes || "").trim())},
          ${sqlValue(auth.user.name)}, ${sqlValue(now)}, ${sqlValue(now)}
        );
      `);
      sendJson(res, 201, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/packaging-documents") {
    if (!requirePermission(res, auth.user, "logistics.manage")) return;
    try {
      const body = await collectBody(req);
      const challan = getDeliveryChallanById(String(body.challanId || ""));
      if (!challan) {
        sendJson(res, 404, { error: "Delivery challan not found" });
        return;
      }
      const now = new Date().toISOString();
      runSql(`
        INSERT INTO packaging_documents (
          id, packaging_number, challan_id, customer_id, project_id, package_count, gross_weight, net_weight,
          contents, notes, created_by, created_at, updated_at
        )
        VALUES (
          ${sqlValue(crypto.randomUUID())}, ${sqlValue(createPackagingNumber())}, ${sqlValue(challan.id)},
          ${sqlValue(String(body.customerId || challan.customerId || ""))}, ${sqlValue(String(body.projectId || challan.projectId || ""))},
          ${sqlValue(Number(body.packageCount || 0))}, ${sqlValue(Number(body.grossWeight || 0))},
          ${sqlValue(Number(body.netWeight || 0))}, ${sqlValue(String(body.contents || "").trim())},
          ${sqlValue(String(body.notes || "").trim())}, ${sqlValue(auth.user.name)},
          ${sqlValue(now)}, ${sqlValue(now)}
        );
      `);
      sendJson(res, 201, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

function maybeDownloadHeaders(url, filename) {
  return url.searchParams.get("download") === "1"
    ? { "Content-Disposition": `attachment; filename="${filename}"` }
    : {};
}

function handleDocumentRequest(req, res, url) {
  const auth = requireAuth(req, res);
  if (!auth) return true;
  if (!requirePermission(res, auth.user, "documents.export")) return true;

  if (req.method === "GET" && url.pathname === "/documents/inventory-report") {
    sendHtml(res, 200, generateInventoryReportDocument(), maybeDownloadHeaders(url, "inventory-report.html"));
    return true;
  }

  const poDoc = url.pathname.match(/^\/documents\/purchase-order\/([^/]+)$/);
  if (req.method === "GET" && poDoc) {
    const order = getPurchaseOrderById(poDoc[1]);
    if (!order) {
      sendHtml(res, 404, "<h1>Purchase order not found</h1>");
      return true;
    }
    sendHtml(res, 200, generatePurchaseOrderDocument(order), maybeDownloadHeaders(url, `${order.poNumber}.html`));
    return true;
  }

  const invoiceDoc = url.pathname.match(/^\/documents\/invoice\/([^/]+)$/);
  if (req.method === "GET" && invoiceDoc) {
    const order = getPurchaseOrders().find((entry) => entry.invoiceId === invoiceDoc[1]);
    if (!order) {
      sendHtml(res, 404, "<h1>Invoice not found</h1>");
      return true;
    }
    sendHtml(res, 200, generateInvoiceDocument(order), maybeDownloadHeaders(url, `${order.invoiceNumber}.html`));
    return true;
  }

  const grnDoc = url.pathname.match(/^\/documents\/grn\/([^/]+)$/);
  if (req.method === "GET" && grnDoc) {
    const order = getPurchaseOrders().find((entry) => entry.grnId === grnDoc[1]);
    if (!order) {
      sendHtml(res, 404, "<h1>GRN not found</h1>");
      return true;
    }
    sendHtml(res, 200, generateGrnDocument(order), maybeDownloadHeaders(url, `${order.grnNumber}.html`));
    return true;
  }

  const challanDoc = url.pathname.match(/^\/documents\/delivery-challan\/([^/]+)$/);
  if (req.method === "GET" && challanDoc) {
    if (!requirePermission(res, auth.user, "logistics.manage")) return true;
    const challan = getDeliveryChallanById(challanDoc[1]);
    if (!challan) {
      sendHtml(res, 404, "<h1>Delivery challan not found</h1>");
      return true;
    }
    sendHtml(res, 200, generateDeliveryChallanDocument(challan), maybeDownloadHeaders(url, `${challan.challanNumber}.html`));
    return true;
  }

  const packagingDoc = url.pathname.match(/^\/documents\/packaging-document\/([^/]+)$/);
  if (req.method === "GET" && packagingDoc) {
    if (!requirePermission(res, auth.user, "logistics.manage")) return true;
    const packaging = getPackagingDocumentById(packagingDoc[1]);
    if (!packaging) {
      sendHtml(res, 404, "<h1>Packaging document not found</h1>");
      return true;
    }
    sendHtml(res, 200, generatePackagingDocument(packaging), maybeDownloadHeaders(url, `${packaging.packagingNumber}.html`));
    return true;
  }

  const quoteEstimateDoc = url.pathname.match(/^\/documents\/quote-estimate\/([^/]+)$/);
  if (req.method === "GET" && quoteEstimateDoc) {
    const quote = getQuoteRequestById(quoteEstimateDoc[1]);
    if (!quote) {
      sendHtml(res, 404, "<h1>Quote estimate not found</h1>");
      return true;
    }
    sendHtml(res, 200, generateQuoteEstimateDocument(quote), maybeDownloadHeaders(url, `${quote.referenceCode}-estimate.html`));
    return true;
  }

  const quoteDfmDoc = url.pathname.match(/^\/documents\/quote-dfm\/([^/]+)$/);
  if (req.method === "GET" && quoteDfmDoc) {
    const quote = getQuoteRequestById(quoteDfmDoc[1]);
    if (!quote) {
      sendHtml(res, 404, "<h1>Quote DFM report not found</h1>");
      return true;
    }
    sendHtml(res, 200, generateQuoteDfmDocument(quote), maybeDownloadHeaders(url, `${quote.referenceCode}-dfm.html`));
    return true;
  }

  return false;
}

function handleProjectFileRequest(req, res, url) {
  const match = url.pathname.match(/^\/project-files\/([^/]+)$/);
  if (!match) return false;

  const auth = requireAuth(req, res);
  if (!auth) return true;
  if (!requirePermission(res, auth.user, "projects.view")) return true;

  const document = getRow(`
    SELECT id, storage_name AS storageName
    FROM project_documents
    WHERE id = ${sqlValue(match[1])}
    LIMIT 1;
  `);
  if (!document) {
    sendJson(res, 404, { error: "Project document not found" });
    return true;
  }

  sendFile(res, path.join(PROJECT_FILES_DIR, document.storageName));
  return true;
}

function handleQuoteFileRequest(req, res, url) {
  const match = url.pathname.match(/^\/quote-files\/([^/]+)$/);
  if (!match) return false;

  const auth = requireAuth(req, res);
  if (!auth) return true;
  if (!requirePermission(res, auth.user, "quotes.view")) return true;

  const quote = getRow(`
    SELECT id, storage_name AS storageName, customer_id AS customerId, email
    FROM quote_requests
    WHERE id = ${sqlValue(match[1])}
    LIMIT 1;
  `);
  if (!quote) {
    sendJson(res, 404, { error: "Quote file not found" });
    return true;
  }
  if (auth.user.role === "Customer") {
    const sameCustomer = auth.user.customerId && quote.customerId === auth.user.customerId;
    const sameEmail = String(quote.email || "").trim().toLowerCase() === String(auth.user.email || "").trim().toLowerCase();
    if (!sameCustomer && !sameEmail) {
      sendJson(res, 403, { error: "Quote file not available for this account" });
      return true;
    }
  }

  sendFile(res, path.join(PROJECT_FILES_DIR, quote.storageName));
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    if (url.pathname.startsWith("/documents/")) {
      const handled = handleDocumentRequest(req, res, url);
      if (handled) return;
    }

    if (url.pathname.startsWith("/project-files/")) {
      const handled = handleProjectFileRequest(req, res, url);
      if (handled) return;
    }

    if (url.pathname.startsWith("/quote-files/")) {
      const handled = handleQuoteFileRequest(req, res, url);
      if (handled) return;
    }

    let filePath = path.join(PUBLIC_DIR, url.pathname === "/" ? "index.html" : url.pathname);
    if (!filePath.startsWith(PUBLIC_DIR)) {
      sendJson(res, 403, { error: "Forbidden" });
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    if (!fs.existsSync(filePath)) {
      filePath = path.join(PUBLIC_DIR, "index.html");
    }

    sendFile(res, filePath);
  } catch (error) {
    sendJson(res, 500, { error: "Internal server error", detail: error.message });
  }
});

initSqlite();
server.listen(PORT, HOST, () => {
  console.log(`Brahmworks inventory server running at http://${HOST}:${PORT}`);
});

refreshPricingRates().catch((error) => {
  console.error("Initial pricing rate refresh failed:", error.message);
});

setInterval(() => {
  refreshPricingRates().catch((error) => {
    console.error("Scheduled pricing rate refresh failed:", error.message);
  });
}, DAILY_RATE_REFRESH_MS);
