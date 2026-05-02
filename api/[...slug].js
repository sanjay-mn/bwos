const { neon } = require("@neondatabase/serverless");
const crypto = require("crypto");
const https = require("https");

// ── ENV ──────────────────────────────────────────────────────────────────────
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const BRAHMWORKS_HOME_STATE = process.env.BRAHMWORKS_GST_STATE || "Tamil Nadu";
const DEFAULT_GST_RATE = Number(process.env.BRAHMWORKS_GST_RATE || 18);
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const LOGO_PUBLIC_URL = "/assets/bw-logo-white.png";

// ── DATABASE (Neon PostgreSQL via HTTP) ───────────────────────────────────────
// neon() returns a tagged-template SQL function that uses HTTP transport —
// perfect for serverless where TCP connection pooling is unreliable.
// We exploit the tagged-template calling convention:  sql([rawStr]) === sql`rawStr`
let _db = null;
function getDb() {
  if (_db) return _db;
  const url = process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("NEON_DATABASE_URL env var is not set. See VERCEL-DEPLOY.md for setup.");
  _db = neon(url);
  return _db;
}

function sqlValue(v) {
  if (v === null || v === undefined || v === "") return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function execute(rawSql) {
  return getDb()([rawSql]);  // tagged-template trick: db([str]) === db`str`
}

async function getRow(sql) {
  const rows = await execute(sql);
  return rows[0] || null;
}

async function getRows(sql) {
  return execute(sql);
}

async function runSql(sql) {
  const db = getDb();
  const stmts = sql.split(";").map(s => s.trim()).filter(s => s.length > 0);
  for (const stmt of stmts) { await db([stmt]); }
}

// ── PRICING CACHE ─────────────────────────────────────────────────────────────
let _pricingCache = null;
async function getPricingCache() {
  if (_pricingCache) return _pricingCache;
  try {
    const rows = await execute(`SELECT key, rate, difficulty_factor AS df FROM pricing_rate_snapshots`);
    _pricingCache = {};
    for (const r of rows) _pricingCache[r.key] = { rate: Number(r.rate), difficultyFactor: Number(r.df || 1) };
  } catch { _pricingCache = {}; }
  return _pricingCache;
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const DEFAULT_SERVICES = ["Mechanical Design","Electronics Design","Industrial Design","Documentation","Shipping Charges","Integration","Feed Study Analysis"];
const DEFAULT_USD_INR = 84;

const RATE_DEFAULTS = {
  FX_USD_INR: { kind:"fx", label:"USD/INR", currency:"INR", unit:"fx", rate:DEFAULT_USD_INR, sourceUrl:"https://www.xe.com/currencyconverter/convert/?Amount=1&From=USD&To=INR", sourceNote:"Fallback FX rate" },
  MAT_ALUMINUM_6061: { kind:"material", label:"Aluminum 6061", currency:"INR", unit:"kg", rate:260, difficultyFactor:1, sourceUrl:"https://www.made-in-china.com", sourceNote:"Supplier listings" },
  MAT_TITANIUM_GRADE_5: { kind:"material", label:"Titanium Grade 5", currency:"INR", unit:"kg", rate:1550, difficultyFactor:1.55, sourceUrl:"https://www.made-in-china.com", sourceNote:"Supplier listings" },
  PROC_CNC_HOURLY: { kind:"process", label:"CNC Hourly Rate", currency:"INR", unit:"hour", rate:1400, sourceUrl:"https://www.xometry.com", sourceNote:"Calibrated shop hourly burden" },
  PROC_SHEET_HOURLY: { kind:"process", label:"Sheet Metal Hourly Rate", currency:"INR", unit:"hour", rate:950, sourceUrl:"https://www.xometry.com", sourceNote:"Calibrated shop hourly burden" },
  PROC_INJECTION_HOURLY: { kind:"process", label:"Injection Molding Hourly Rate", currency:"INR", unit:"hour", rate:1850, sourceUrl:"https://www.protolabs.com", sourceNote:"Calibrated machine-hour burden" },
  PROC_PRINT_HOURLY: { kind:"process", label:"3D Printing Hourly Rate", currency:"INR", unit:"hour", rate:1100, sourceUrl:"https://www.xometry.com", sourceNote:"Calibrated additive manufacturing burden" },
};

const MATERIAL_RATE_CATALOG = {
  Aluminum:{"6061":{rate:260,difficultyFactor:1},"7075":{rate:420,difficultyFactor:1.12},"5052":{rate:240,difficultyFactor:0.98},"2024":{rate:390,difficultyFactor:1.08}},
  "Stainless Steel":{"304":{rate:290,difficultyFactor:1.2},"316 / 316L":{rate:360,difficultyFactor:1.24},"303":{rate:275,difficultyFactor:1.14},"17-4 PH":{rate:470,difficultyFactor:1.32}},
  Brass:{C360:{rate:540,difficultyFactor:0.95},C260:{rate:570,difficultyFactor:0.98}},
  Copper:{C101:{rate:860,difficultyFactor:1.02},C110:{rate:820,difficultyFactor:1.02}},
  Titanium:{"Grade 2":{rate:1180,difficultyFactor:1.4},"Grade 5":{rate:1550,difficultyFactor:1.55}},
  "Mild Steel":{"1018":{rate:95,difficultyFactor:1.04},A36:{rate:88,difficultyFactor:1.04}},
  "Alloy Steel":{"4140":{rate:145,difficultyFactor:1.16},"4340":{rate:175,difficultyFactor:1.2}},
  "Tool Steel":{D2:{rate:290,difficultyFactor:1.28},A2:{rate:255,difficultyFactor:1.24}},
  ABS:{ABS:{rate:185,difficultyFactor:0.9}},Polycarbonate:{PC:{rate:260,difficultyFactor:0.96}},
  Nylon:{PA6:{rate:240,difficultyFactor:0.95},PA66:{rate:260,difficultyFactor:0.96}},
  Polypropylene:{PP:{rate:165,difficultyFactor:0.88}},POM:{"Delrin / POM":{rate:255,difficultyFactor:0.92}},
  PTFE:{PTFE:{rate:620,difficultyFactor:1}},PMMA:{Acrylic:{rate:210,difficultyFactor:0.9}},
  PEEK:{PEEK:{rate:4200,difficultyFactor:1.15}},FR4:{FR4:{rate:240,difficultyFactor:1.08}},
  "Carbon Fiber":{"Carbon Fiber Plate":{rate:3200,difficultyFactor:1.3}},
  PE:{HDPE:{rate:175,difficultyFactor:0.9},LDPE:{rate:165,difficultyFactor:0.88}},
  PS:{PS:{rate:170,difficultyFactor:0.9}},TPU:{TPU:{rate:330,difficultyFactor:0.95}},
  PLA:{PLA:{rate:165,difficultyFactor:0.84}},PETG:{PETG:{rate:220,difficultyFactor:0.9}},
  Resin:{"Standard Resin":{rate:480,difficultyFactor:0.92},"Tough Resin":{rate:620,difficultyFactor:0.96}},
  PVC:{PVC:{rate:150,difficultyFactor:0.9}},"PC / ABS":{"PC / ABS":{rate:255,difficultyFactor:0.95}},
  PP:{PP:{rate:165,difficultyFactor:0.88}},
};

const YES_NO_OPTIONS = [{value:"No",label:"No"},{value:"Yes",label:"Yes"}];

const QUOTE_CONFIG = {
  designUnits:[{value:"mm",label:"Millimeters (mm)"},{value:"inch",label:"Inches (in)"},{value:"cm",label:"Centimeters (cm)"}],
  quoteUnits:[{value:"pcs",label:"Pieces"},{value:"sets",label:"Sets"}],
  processes:{
    "CNC Machining":{
      materialFamilies:[
        {value:"Aluminum",grades:["6061","7075","5052","2024"]},{value:"Stainless Steel",grades:["304","316 / 316L","303","17-4 PH"]},
        {value:"Brass",grades:["C360","C260"]},{value:"Copper",grades:["C101","C110"]},{value:"Titanium",grades:["Grade 2","Grade 5"]},
        {value:"Mild Steel",grades:["1018","A36"]},{value:"Alloy Steel",grades:["4140","4340"]},{value:"Tool Steel",grades:["D2","A2"]},
        {value:"ABS",grades:["ABS"]},{value:"Polycarbonate",grades:["PC"]},{value:"Nylon",grades:["PA6","PA66"]},
        {value:"Polypropylene",grades:["PP"]},{value:"POM",grades:["Delrin / POM"]},{value:"PTFE",grades:["PTFE"]},
        {value:"PMMA",grades:["Acrylic"]},{value:"PEEK",grades:["PEEK"]},{value:"FR4",grades:["FR4"]},{value:"Carbon Fiber",grades:["Carbon Fiber Plate"]},
      ],
      fields:[
        {key:"manufacturingProcess",label:"Manufacturing Process",type:"select",options:["Milling","Turning","Mill-Turn"]},
        {key:"materialFamily",label:"Material Family",type:"material-family"},{key:"materialGrade",label:"Material Grade",type:"material-grade"},
        {key:"surfaceFinish",label:"Surface Finish",type:"select",options:["Standard (As-Machined)","Anodized","Bead Blast + Anodized","Brushed","Spray Paint - Matt","Spray Paint - High Gloss","#1000 Sanding"]},
        {key:"toleranceClass",label:"Tolerance",type:"select",options:["Standard (ISO 2768-1)","Tight Tolerance Required"]},
        {key:"surfaceRoughness",label:"Surface Roughness",type:"select",options:["Standard","Ra 6.3 um","Ra 3.2 um","Ra 1.6 um"]},
        {key:"threads",label:"Tapped Holes / Threads",type:"select",options:YES_NO_OPTIONS},
        {key:"inserts",label:"Inserts",type:"select",options:YES_NO_OPTIONS},
        {key:"partMarking",label:"Part Marking",type:"select",options:["None","Silkscreen","Laser Engraving"]},
        {key:"inspectionLevel",label:"Inspection",type:"select",options:["Standard Inspection","Standard Inspection with Formal Report","CMM Inspection with Formal Report","Source Material Certification"]},
        {key:"appearanceGrade",label:"Finished Appearance",type:"select",options:["Standard","Premium"]},
      ],
    },
    "Sheet Metal":{
      materialFamilies:[{value:"Aluminum",grades:["5052","6061"]},{value:"Stainless Steel",grades:["304","316"]},{value:"Mild Steel",grades:["CRCA","HRPO"]},{value:"Copper",grades:["C110"]}],
      fields:[
        {key:"manufacturingProcess",label:"Manufacturing Process",type:"select",options:["Laser Cutting","Bending","Laser Cutting + Bending"]},
        {key:"materialFamily",label:"Material Family",type:"material-family"},{key:"materialGrade",label:"Material Grade",type:"material-grade"},
        {key:"sheetThickness",label:"Thickness",type:"select",options:["1.0 mm","1.5 mm","2.0 mm","3.0 mm","4.0 mm","5.0 mm"]},
        {key:"surfaceFinish",label:"Surface Finish",type:"select",options:["As Cut","Powder Coated","Brushed","Bead Blasted","Anodized","Sanded"]},
        {key:"toleranceClass",label:"Tolerance",type:"select",options:["Standard","Tight Tolerance Required"]},
        {key:"welding",label:"Welding",type:"select",options:["None","Spot Weld","Full Weld"]},
        {key:"inserts",label:"PEM Inserts / Tapped Holes",type:"select",options:["None","Required"]},
        {key:"partMarking",label:"Part Marking",type:"select",options:["None","Silkscreen","Laser Engraving"]},
        {key:"inspectionLevel",label:"Inspection",type:"select",options:["Standard Inspection","Standard Inspection with Formal Report","CMM Inspection with Formal Report","Source Material Certification"]},
        {key:"appearanceGrade",label:"Finished Appearance",type:"select",options:["Standard","Premium"]},
      ],
    },
    "Injection Molding":{
      materialFamilies:[{value:"ABS",grades:["ABS"]},{value:"POM",grades:["POM"]},{value:"Nylon",grades:["PA6","PA66"]},{value:"Polycarbonate",grades:["PC"]},{value:"PC / ABS",grades:["PC / ABS"]},{value:"PVC",grades:["PVC"]},{value:"PE",grades:["HDPE","LDPE"]},{value:"PP",grades:["PP"]},{value:"PS",grades:["PS"]},{value:"TPU",grades:["TPU"]}],
      fields:[
        {key:"materialFamily",label:"Material Family",type:"material-family"},{key:"materialGrade",label:"Material Grade",type:"material-grade"},
        {key:"colorChoice",label:"Color",type:"select",options:["Natural","Black","White","Grey","Blue","Red","Custom Match"]},
        {key:"spiFinish",label:"SPI Finish",type:"select",options:["SPI A-1","SPI A-2","SPI B-1","SPI B-2","SPI C-1","SPI C-2","SPI D-2","SPI D-3"]},
        {key:"toolRequirement",label:"Tool Requirement",type:"select",options:["Order a New Mold","Use Existing Mold"]},
        {key:"annualVolume",label:"Expected Annual Volume",type:"select",options:["<= 10,000","10,000 - 50,000","50,000 - 100,000",">= 100,000"]},
        {key:"materialAdditive",label:"Material Additive",type:"select",options:["None","UV Stabilized","Glass Filled","Flame Retardant"]},
        {key:"inspectionLevel",label:"Inspection",type:"select",options:["Standard Inspection","Standard Inspection with Formal Report","CMM Inspection with Formal Report","Source Material Certification"]},
        {key:"appearanceGrade",label:"Finished Appearance",type:"select",options:["Standard","Premium"]},
      ],
    },
    "3D Printing":{
      materialFamilies:[{value:"PLA",grades:["PLA"]},{value:"ABS",grades:["ABS"]},{value:"PETG",grades:["PETG"]},{value:"Nylon",grades:["PA12","PA6"]},{value:"Resin",grades:["Standard Resin","Tough Resin"]},{value:"TPU",grades:["TPU"]}],
      fields:[
        {key:"manufacturingProcess",label:"Printing Technology",type:"select",options:["FDM","SLA","SLS","MJF","DMLS","PolyJet"]},
        {key:"materialFamily",label:"Material Family",type:"material-family"},{key:"materialGrade",label:"Material Grade",type:"material-grade"},
        {key:"layerResolution",label:"Layer Resolution",type:"select",options:["Standard","Fine","High Detail"]},
        {key:"surfaceFinish",label:"Surface Finish",type:"select",options:["As Printed","Sanded","Vapor Smoothed","Painted","Dyed"]},
        {key:"infillDensity",label:"Infill / Build Style",type:"select",options:["Standard","High Strength","Solid","Hollow"]},
        {key:"supportRemoval",label:"Support Removal",type:"select",options:["Standard","Cosmetic"]},
        {key:"inspectionLevel",label:"Inspection",type:"select",options:["Standard Inspection","Standard Inspection with Formal Report","CMM Inspection with Formal Report"]},
        {key:"appearanceGrade",label:"Finished Appearance",type:"select",options:["Standard","Premium"]},
      ],
    },
  },
};

const ROLE_PERMISSIONS = {
  Admin:{screens:["overview","quotes","requests","inventory","suppliers","purchaseOrders","customers","projects","projectWorkspace","reports","profile","users","logistics","blogs"],actions:["profile.view","profile.edit","users.manage","logistics.manage","reports.view","quotes.view","quotes.manage","inventory.view","inventory.create","inventory.edit","inventory.delete","inventory.adjust","suppliers.view","suppliers.create","suppliers.edit","suppliers.delete","suppliers.bank.edit","purchaseOrders.view","purchaseOrders.create","purchaseOrders.edit","purchaseOrders.delete","purchaseOrders.receive","projects.view","projects.manage","documents.export"]},
  Operations:{screens:["overview","quotes","requests","inventory","suppliers","customers","projects","projectWorkspace","reports","profile","blogs"],actions:["profile.view","profile.edit","reports.view","quotes.view","quotes.manage","inventory.view","inventory.create","inventory.edit","inventory.adjust","suppliers.view","suppliers.edit","suppliers.bank.edit","purchaseOrders.view","purchaseOrders.receive","projects.view","projects.manage","documents.export"]},
  Procurement:{screens:["overview","quotes","requests","inventory","suppliers","purchaseOrders","customers","projects","projectWorkspace","reports","profile","blogs"],actions:["profile.view","profile.edit","reports.view","quotes.view","quotes.manage","inventory.view","inventory.edit","suppliers.view","suppliers.create","suppliers.edit","suppliers.delete","suppliers.bank.edit","purchaseOrders.view","purchaseOrders.create","purchaseOrders.edit","purchaseOrders.delete","projects.view","projects.manage","documents.export"]},
  Customer:{screens:["quotes","requests","blogs","profile"],actions:["profile.view","profile.edit","quotes.view"]},
};

// ── AUTH HELPERS ──────────────────────────────────────────────────────────────
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}
function createUser(name, email, role, password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return { id: crypto.randomUUID(), name, email, role, salt, passwordHash: hashPassword(password, salt) };
}
function sanitizeUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, customerId: user.customerId || null };
}
function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || { screens: [], actions: [] };
}

function getBearerToken(event) {
  const auth = event.headers["authorization"] || event.headers["Authorization"] || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return null;
}

async function getSession(event) {
  const token = getBearerToken(event);
  if (!token) return null;
  const expiry = new Date(Date.now() - SESSION_TTL_MS).toISOString();
  const row = await getRow(`
    SELECT u.id, u.name, u.email, u.role, u.customer_id AS customerId
    FROM sessions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.token = ${sqlValue(token)} AND s.created_at > ${sqlValue(expiry)}
    LIMIT 1`);
  if (!row) return null;
  return { token, user: row };
}

// ── PURE HELPERS ──────────────────────────────────────────────────────────────
function deepClone(v) { return JSON.parse(JSON.stringify(v)); }
function optionValueOf(o) { return typeof o === "string" ? o : o?.value; }
function normalizeChoice(value, allowed, fallback = "") {
  const n = String(value || "").trim();
  if (allowed.includes(n)) return n;
  return fallback || allowed[0] || "";
}
function getQuoteConfig() { return deepClone(QUOTE_CONFIG); }
function getProcessQuoteConfig(process) { return QUOTE_CONFIG.processes[process] || QUOTE_CONFIG.processes["CNC Machining"]; }
function getMaterialFamilyConfig(process, familyValue) { return (getProcessQuoteConfig(process).materialFamilies || []).find(f => f.value === familyValue) || null; }
function buildMaterialLabel(mf, mg) { return [String(mf||"").trim(), String(mg||"").trim()].filter(Boolean).join(" - "); }

function normalizeQuoteSelections(process, selections = {}) {
  const pc = getProcessQuoteConfig(process);
  const firstFamily = pc.materialFamilies?.[0]?.value || "";
  const materialFamily = normalizeChoice(selections.materialFamily, (pc.materialFamilies||[]).map(f=>f.value), firstFamily);
  const familyConfig = getMaterialFamilyConfig(process, materialFamily);
  const firstGrade = familyConfig?.grades?.[0] || "";
  const normalized = { materialFamily, materialGrade: normalizeChoice(selections.materialGrade, familyConfig?.grades||[], firstGrade) };
  (pc.fields||[]).forEach(field => {
    if (field.key === "materialFamily" || field.key === "materialGrade") return;
    if (field.type === "select") {
      const allowed = (field.options||[]).map(optionValueOf);
      normalized[field.key] = normalizeChoice(selections[field.key], allowed, allowed[0]||"");
    }
  });
  return normalized;
}

function createMaterialRateKey(mf, mg) {
  return `MAT_${String(mf||"").toUpperCase().replace(/[^A-Z0-9]+/g,"_").replace(/^_|_$/g,"")}_${String(mg||"").toUpperCase().replace(/[^A-Z0-9]+/g,"_").replace(/^_|_$/g,"")}`;
}
function getCatalogMaterialRate(mf, mg) { return (MATERIAL_RATE_CATALOG[mf]||{})[mg] || null; }

function getMaterialRate(mf, mg, pricingCache = {}) {
  const key = createMaterialRateKey(mf, mg);
  const snap = pricingCache[key];
  if (snap?.rate) return { rate: Number(snap.rate), difficultyFactor: Number(snap.difficultyFactor||1) };
  const cat = getCatalogMaterialRate(mf, mg);
  if (cat) return { rate: cat.rate, difficultyFactor: cat.difficultyFactor||1 };
  return { rate: 260, difficultyFactor: 1 };
}

function getProcessHourlyRate(process, pricingCache = {}) {
  const keyMap = { "CNC Machining":"PROC_CNC_HOURLY","Sheet Metal":"PROC_SHEET_HOURLY","Injection Molding":"PROC_INJECTION_HOURLY","3D Printing":"PROC_PRINT_HOURLY" };
  const key = keyMap[process];
  if (key && pricingCache[key]?.rate) return Number(pricingCache[key].rate);
  const defaults = { "CNC Machining":1400,"Sheet Metal":950,"Injection Molding":1850,"3D Printing":1100 };
  return defaults[process] || 1200;
}

function materialFactor(material) {
  const l = String(material||"").toLowerCase();
  if (/(titanium|inconel|tool steel|hardened steel)/.test(l)) return 1.75;
  if (/(stainless|ss 304|ss 316)/.test(l)) return 1.35;
  if (/(brass|copper)/.test(l)) return 1.2;
  if (/(abs|pp|polypropylene|nylon|delrin|pom)/.test(l)) return 0.9;
  if (/(aluminum|aluminium|mild steel|crca)/.test(l)) return 1.05;
  return 1.1;
}
function finishFactor(finish) {
  const l = String(finish||"").toLowerCase();
  if (!l || l==="as machined") return 1;
  if (/(anod|powder|paint|plating)/.test(l)) return 1.12;
  if (/(bead|blast|polish|passivat)/.test(l)) return 1.08;
  return 1.05;
}

function buildQuotePricing(input, overrides = {}, pricingCache = {}) {
  const process = String(overrides.process||input.process||"CNC Machining");
  const ns = normalizeQuoteSelections(process, { ...(input.optionSelections||{}), ...(overrides.optionSelections||{}), materialFamily: overrides.materialFamily??input.materialFamily, materialGrade: overrides.materialGrade??input.materialGrade, surfaceFinish: overrides.surfaceFinish??input.surfaceFinish??overrides.finish??input.finish });
  const mf = ns.materialFamily||""; const mg = ns.materialGrade||"";
  const materialRate = getMaterialRate(mf, mg, pricingCache);
  const material = String(overrides.material||input.material||buildMaterialLabel(mf,mg));
  const finish = String(overrides.finish||input.finish||ns.surfaceFinish||"");
  const quantity = Math.max(1, Number(overrides.quantity||input.quantity||1));
  const fileSize = Math.max(1, Number(input.fileSize||0));
  const sizeFactor = Math.max(1, fileSize/180000);
  const toleranceClass = ns.toleranceClass||"Standard";
  const appearanceGrade = ns.appearanceGrade||"Standard";
  const inspectionLevel = ns.inspectionLevel||"Standard Inspection";
  const inserts = ns.inserts||"No";
  const threads = ns.threads||"No";
  const welding = ns.welding||"None";
  const toolRequirement = ns.toolRequirement||"Order a New Mold";
  const annualVolume = ns.annualVolume||"<= 10,000";
  const processBase = { "CNC Machining":3200,"Sheet Metal":1900,"Injection Molding":6800,"3D Printing":2400 }[process]||2500;
  const baseSetupHours = overrides.setupHours!==undefined ? Number(overrides.setupHours||0) : process==="Injection Molding" ? 10 : process==="3D Printing" ? 1.5 : process==="Sheet Metal" ? 2.5 : 4;
  const baseMachiningHours = overrides.machiningHours!==undefined ? Number(overrides.machiningHours||0) : Math.max(0.75, sizeFactor*(process==="Sheet Metal"?0.7:process==="Injection Molding"?1.4:process==="3D Printing"?0.85:1.1)*Number(materialRate.difficultyFactor||1));
  const hourlyRate = overrides.hourlyRate!==undefined ? Number(overrides.hourlyRate||0) : getProcessHourlyRate(process, pricingCache);
  const stockMultiplier = overrides.stockMultiplier!==undefined ? Number(overrides.stockMultiplier||0) : 0.22;
  const toolingCost = overrides.toolingCost!==undefined ? Number(overrides.toolingCost||0) : process==="Injection Molding" ? Math.round(processBase*(toolRequirement==="Use Existing Mold"?0.65:1.8)) : process==="3D Printing" ? Math.round(processBase*0.05) : Math.round(processBase*0.18);
  const inspectionCost = overrides.inspectionCost!==undefined ? Number(overrides.inspectionCost||0) : Math.round(processBase*(inspectionLevel.includes("CMM")?0.18:inspectionLevel.includes("Formal Report")?0.11:0.08));
  const shippingCost = overrides.shippingCost!==undefined ? Number(overrides.shippingCost||0) : 250;
  const overheadPercent = overrides.overheadPercent!==undefined ? Number(overrides.overheadPercent||0) : 12;
  const marginPercent = overrides.marginPercent!==undefined ? Number(overrides.marginPercent||0) : 18;
  const baseMaterialRef = Number((pricingCache["MAT_ALUMINUM_6061"]||{}).rate||260);
  const materialRateFactor = Math.max(0.35, Number(materialRate.rate||baseMaterialRef)/Math.max(1,baseMaterialRef));
  const materialCost = Math.round(processBase*stockMultiplier*materialRateFactor*(appearanceGrade==="Premium"?1.08:1)*(toleranceClass.includes("Tight")?1.12:1)*(annualVolume===">= 100,000"?0.9:annualVolume==="50,000 - 100,000"?0.94:1));
  const setupCost = Math.round(baseSetupHours*hourlyRate);
  const runtimeCostPerPiece = Math.round(baseMachiningHours*hourlyRate*finishFactor(finish)*(threads==="Yes"?1.08:1)*((inserts==="Yes"||inserts==="Required")?1.06:1)*(welding==="Full Weld"?1.18:welding==="Spot Weld"?1.08:1));
  const runtimeTotal = process==="Injection Molding" ? Math.round(runtimeCostPerPiece*Math.max(1,quantity*0.22)) : Math.round(runtimeCostPerPiece*quantity);
  const directSubtotal = materialCost+setupCost+runtimeTotal+toolingCost+inspectionCost+shippingCost;
  const overheadValue = Math.round(directSubtotal*(overheadPercent/100));
  const marginValue = Math.round((directSubtotal+overheadValue)*(marginPercent/100));
  const total = directSubtotal+overheadValue+marginValue;
  const low = Math.max(500, Math.round(total*0.92/50)*50);
  const high = Math.max(low+250, Math.round(total*1.1/50)*50);
  const leadDays = overrides.leadDays!==undefined ? Number(overrides.leadDays||0) : (process==="Injection Molding"?18:process==="Sheet Metal"?6:process==="3D Printing"?4:9)+Math.min(10,Math.round(sizeFactor));
  return {
    currency:"INR", process, material, finish, quantity, leadDays, low, high, total,
    settings:{ process, material, finish, quantity, materialFamily:mf, materialGrade:mg, materialRatePerKg:Number(materialRate.rate||0), materialDifficultyFactor:Number(materialRate.difficultyFactor||1), optionSelections:ns, setupHours:Number(baseSetupHours.toFixed(2)), machiningHours:Number(baseMachiningHours.toFixed(2)), hourlyRate, stockMultiplier:Number(stockMultiplier.toFixed(2)), toolingCost, inspectionCost, shippingCost, overheadPercent, marginPercent, leadDays },
    breakdown:[
      {key:"material",label:"Material / stock",value:materialCost},{key:"setup",label:"Setup",value:setupCost},
      {key:"runtime",label:process==="Injection Molding"?"Cycle / production":process==="3D Printing"?"Printing / post-processing":"Machining / fabrication",value:runtimeTotal},
      {key:"tooling",label:"Tooling",value:toolingCost},{key:"inspection",label:"Inspection / QA",value:inspectionCost},
      {key:"shipping",label:"Packing / shipping",value:shippingCost},{key:"overhead",label:`Overhead (${overheadPercent}%)`,value:overheadValue},{key:"margin",label:`Margin (${marginPercent}%)`,value:marginValue},
    ],
  };
}

// ── DFM ───────────────────────────────────────────────────────────────────────
const INJECTION_WALL_GUIDELINES_MM = { ABS:"1.14-3.56 mm",POM:"0.76-3.05 mm",Nylon:"0.76-2.92 mm",Polycarbonate:"1.02-3.81 mm","PC / ABS":"1.02-3.81 mm",PE:"0.76-5.08 mm",PP:"1.02-3.81 mm",PS:"0.64-3.18 mm",TPU:"0.64-3.18 mm",PVC:"0.76-3.18 mm" };
function classifyDfmStatus(r){return["pass","review","warn","hold"].includes(r)?r:"review";}
function parseMetricThickness(v){const m=String(v||"").match(/(\d+(?:\.\d+)?)\s*mm/i);return m?Number(m[1]):null;}
function createDfmItem(status,title,detail,recommendation=""){return{status:classifyDfmStatus(status),title,detail,recommendation};}

function computeQuoteComplexitySignal(quote) {
  const s=quote.optionSelections||{}; let score=0;
  if(Number(quote.fileSize||0)>4*1024*1024)score+=2; else if(Number(quote.fileSize||0)>1.2*1024*1024)score+=1;
  if((s.appearanceGrade||"").includes("Premium"))score+=1;
  if((s.inspectionLevel||"").includes("CMM"))score+=2; else if((s.inspectionLevel||"").includes("Formal Report"))score+=1;
  if((s.toleranceClass||"").toLowerCase().includes("tight"))score+=2;
  if((s.welding||"").toLowerCase().includes("full"))score+=2; else if((s.welding||"").toLowerCase().includes("spot"))score+=1;
  if((s.inserts||"").match(/required|yes/i))score+=1;
  if((s.toolRequirement||"").includes("New Mold"))score+=1;
  if((s.materialAdditive||"").match(/glass|flame|uv/i))score+=1;
  if((s.spiFinish||"").match(/A-|B-1/i))score+=2;
  if((s.annualVolume||"").includes("100,000"))score+=1;
  if(/(thread|undercut|snap|living hinge|insert|overmold|slide|cam|lifter)/i.test(`${quote.originalName||""} ${quote.notes||""}`))score+=2;
  return score;
}

function buildInjectionMoldingDfmAnalysis(quote) {
  const s=quote.optionSelections||{}; const mf=quote.materialFamily||s.materialFamily||"ABS";
  const wallRange=INJECTION_WALL_GUIDELINES_MM[mf]||"0.8-3.5 mm"; const cs=computeQuoteComplexitySignal(quote); const tooComplex=cs>=6;
  return {
    title:"Injection Molding DFM Analysis",
    summary:tooComplex?"This molding RFQ has elevated tooling risk and requires a Brahmworks engineering review.":"This molding RFQ has been screened and is ready for detailed engineering review.",
    status:tooComplex?"hold":cs>=4?"warn":"review",
    requiresEngineeringContact:tooComplex,complexityScore:cs,
    checklist:[
      createDfmItem("review","Material and nominal wall thickness",`${mf} typically performs best when nominal walls are kept in the ${wallRange} range.`,"Keep walls as uniform as possible."),
      createDfmItem((s.spiFinish||"").match(/A-|B-1/i)?"warn":"review","Draft angle and cosmetic finish","Brahmworks recommends 1-2° draft for smooth faces, ~3° for light texture, 5°+ for heavier texture.","Add draft to all pull-direction faces."),
      createDfmItem("review","Corners, fillets, and section transitions","Rounded corners and blended transitions reduce stress concentration.","Replace sharp corners with fillets wherever possible."),
      createDfmItem("review","Ribs, bosses, and support features","Secondary features should not overpack the tool or create localized sink.","Size ribs and bosses conservatively."),
      createDfmItem("review","Gate, parting line, and ejector strategy","Gate vestige, parting line witness, and ejector marks need to land on acceptable surfaces.","Move cosmetic faces away from likely gate/eject locations."),
      createDfmItem(tooComplex?"hold":cs>=4?"warn":"review","Complexity assessment",tooComplex?"The selected finish, inspection, and CAD complexity suggest this mold may require advanced DFM review.":"This part appears suitable for a standard DFM review.","Our engineering team will confirm gate, shutoff, and undercut strategy during review."),
    ],
    rules:[`Nominal wall guidance for ${mf}: ${wallRange}`,"Draft: 1-2° smooth, ~3° light texture, 5°+ heavy texture","Rounded corners and blended transitions preferred"],
  };
}

function buildSheetMetalDfmAnalysis(quote) {
  const s=quote.optionSelections||{}; const tv=parseMetricThickness(s.sheetThickness); const cs=computeQuoteComplexitySignal(quote); const ne=cs>=5;
  return {
    title:"Sheet Metal DFM Analysis",
    summary:ne?"This fabrication RFQ needs engineering review.":"This fabrication RFQ has been screened and is ready for detailed review.",
    status:ne?"hold":cs>=3?"warn":"review",requiresEngineeringContact:ne,complexityScore:cs,
    checklist:[
      createDfmItem(tv&&tv<=5?"pass":"review","Material and thickness suitability",tv?`Selected thickness ${s.sheetThickness} is within standard quoting range.`:"Thickness not quantified from geometry.","Confirm flat pattern and bend radius before release."),
      createDfmItem("review","Bend manufacturability","Bend relief, hole-to-bend clearance, and flange lengths drive manufacturability.","Keep hole features clear of bend lines."),
      createDfmItem((s.welding||"").includes("Full")?"warn":"review","Secondary operations",(s.welding||"").includes("None")?"No welding selected.":(`Selected: ${s.welding||"TBD"}.`),"Welded assemblies should be checked for distortion risk."),
      createDfmItem((s.inserts||"").includes("Required")?"warn":"review","Hardware insertion",(s.inserts||"").includes("Required")?"PEM inserts require hardware clearance validation.":"No hardware insertion selected.","Confirm clearance from bends and edges."),
      createDfmItem(ne?"hold":cs>=3?"warn":"review","Complexity assessment",ne?"This RFQ shows multiple fabrication complexity signals.":"Part appears compatible with standard sheet metal DFM.","We will validate bend sequence and finishing assumptions during review."),
    ],
    rules:["Validate bend radius, hole-to-bend clearance, and flange length","Keep secondary operations clear of bends and cosmetic faces"],
  };
}

function buildQuoteDfmAnalysis(quote) {
  if (!quote) return null;
  if (quote.process==="Injection Molding") return buildInjectionMoldingDfmAnalysis(quote);
  if (quote.process==="Sheet Metal") return buildSheetMetalDfmAnalysis(quote);
  return null;
}

// ── QUOTE ORDER ───────────────────────────────────────────────────────────────
function getBreakdownValue(pricing, labelPrefix) { return Number((pricing?.breakdown||[]).find(i=>String(i.label||"").toLowerCase().startsWith(String(labelPrefix||"").toLowerCase()))?.value||0); }
function deliverySpeedMultiplier(speed) { return speed==="Expedited"?1.18:speed==="Economy"?0.96:1; }
function shippingMethodBase(process, shippingMethod, quantity) {
  if(shippingMethod==="Customer Pickup"||shippingMethod==="EXW / Freight Collect") return 0;
  const qf=Math.max(1,Number(quantity||1)); const base={"CNC Machining":shippingMethod==="Air"?1450:780,"Sheet Metal":shippingMethod==="Air"?1680:920,"3D Printing":shippingMethod==="Air"?850:520,"Injection Molding":shippingMethod==="Air"?2950:1650}[process]||900;
  return Math.round(base+Math.min(12,qf-1)*(shippingMethod==="Air"?65:35));
}
function deriveEngineeringDecision(quote, dfm=null) {
  if (!quote) return "Review complete";
  if (quote.process!=="Injection Molding") return "Manufacturing review complete";
  const analysis=dfm||buildQuoteDfmAnalysis(quote);
  if (!analysis) return "DFM review complete";
  if (analysis.requiresEngineeringContact) return "Needs engineering contact";
  if (analysis.status==="warn"||analysis.status==="review") return "DFM Pass with notes";
  return "DFM Pass";
}
function shouldBlockCheckoutForQuote(quote) {
  if (!quote||quote.process!=="Injection Molding") return false;
  const dfm=buildQuoteDfmAnalysis(quote);
  return dfm?.requiresEngineeringContact===true;
}

function computeQuoteOrderSummary(quote, overrides={}, pricingCache={}) {
  const pricing=quote?.pricing||buildQuotePricing(quote,quote?.reviewData||{},pricingCache);
  const dfm=quote?.dfm||buildQuoteDfmAnalysis(quote);
  const isInjection=quote?.process==="Injection Molding";
  const reviewResult=isInjection?(dfm?.requiresEngineeringContact?"Engineering review required":dfm?.status==="warn"||dfm?.status==="review"?"DFM passed with action items":"DFM passed"):"Review complete";
  const engineeringDecision=String(overrides.engineeringDecision||deriveEngineeringDecision(quote,dfm));
  const toolingCost=Number(overrides.toolingCost!==undefined?overrides.toolingCost:getBreakdownValue(pricing,"Tooling"));
  const manufacturingSubtotal=Number(overrides.manufacturingSubtotal!==undefined?overrides.manufacturingSubtotal:(pricing?.total||0)-toolingCost-getBreakdownValue(pricing,"Packing"));
  const deliverySpeed=String(overrides.deliverySpeed||"Standard");
  const speedMult=deliverySpeedMultiplier(deliverySpeed);
  const shippingMethod=String(overrides.shippingMethod||"Surface");
  const shippingScope=String(overrides.shippingScope||"Domestic");
  const incoterm=String(overrides.incoterm||"DDP");
  const importerModel=String(overrides.importerModel||"Brahmworks");
  const shippingCost=Number(overrides.shippingCost!==undefined?overrides.shippingCost:shippingMethodBase(quote?.process,shippingMethod,quote?.quantity||1));
  const dutiesAndTaxes=Number(overrides.dutiesAndTaxes||0);
  const dutyRate=Number(overrides.dutyRate||0);
  const taxMode=String(overrides.taxMode||"GST");
  const state=String(overrides.state||"");
  const isInterState=state&&state!==BRAHMWORKS_HOME_STATE;
  const taxRate=Number(overrides.taxRate!==undefined?overrides.taxRate:DEFAULT_GST_RATE);
  const partUnitPrice=Number(overrides.partUnitPrice!==undefined?overrides.partUnitPrice:((pricing?.total||0)/Math.max(1,quote?.quantity||1)));
  const partSubtotal=Number(overrides.partSubtotal!==undefined?overrides.partSubtotal:partUnitPrice*Math.max(1,quote?.quantity||1));
  const moq=Number(overrides.moq||1);
  const batchQuantity=Number(overrides.batchQuantity||quote?.quantity||1);
  const baseAmount=(toolingCost+partSubtotal+shippingCost+dutiesAndTaxes)*speedMult;
  const taxAmount=Math.round(baseAmount*(taxRate/100));
  const totalAmount=Math.round(baseAmount+taxAmount);
  return {
    reviewResult,engineeringDecision,endUse:String(overrides.endUse||""),deliverySpeed,deliveryDate:String(overrides.deliveryDate||""),
    t0SampleDate:String(overrides.t0SampleDate||""),productionDeliveryDate:String(overrides.productionDeliveryDate||""),
    shippingMethod,incoterm,shippingScope,importerModel,importerName:String(overrides.importerName||""),importerTaxId:String(overrides.importerTaxId||""),
    gstin:String(overrides.gstin||""),taxMode,billingName:String(overrides.billingName||""),
    shippingName:String(overrides.shippingName||""),shippingPhone:String(overrides.shippingPhone||""),shippingCompany:String(overrides.shippingCompany||""),
    addressLine1:String(overrides.addressLine1||""),addressLine2:String(overrides.addressLine2||""),city:String(overrides.city||""),
    state,postalCode:String(overrides.postalCode||""),country:String(overrides.country||"India"),
    notes:String(overrides.notes||""),commercialNotes:String(overrides.commercialNotes||""),
    partUnitPrice:Math.round(partUnitPrice),partSubtotal:Math.round(partSubtotal),moq,batchQuantity,
    inspectionOption:String(overrides.inspectionOption||""),finishConfirmation:String(overrides.finishConfirmation||""),
    moldType:String(overrides.moldType||""),cavityCount:Number(overrides.cavityCount||0),toolMaterial:String(overrides.toolMaterial||""),
    textureFinish:String(overrides.textureFinish||""),sampleRounds:Number(overrides.sampleRounds||0),t0SamplePlan:String(overrides.t0SamplePlan||""),
    productionQuantity:Number(overrides.productionQuantity||0),toolLeadDays:Number(overrides.toolLeadDays||0),productionLeadDays:Number(overrides.productionLeadDays||0),
    toolingCost:Math.round(toolingCost),manufacturingSubtotal:Math.round(manufacturingSubtotal*speedMult),
    shippingCost:Math.round(shippingCost),dutiesCost:Math.round(dutiesAndTaxes),dutyRate,taxRate,taxAmount,totalAmount,
  };
}

// ── DATA FUNCTIONS (async) ────────────────────────────────────────────────────
async function getInventory() {
  const rows = await getRows(`
    SELECT i.id, i.name, i.sku, i.category, i.quantity, i.threshold_value AS threshold,
      i.cost, i.supplier_id AS supplierId, i.customer_id AS customerId, i.project_id AS projectId,
      i.location, i.unit, i.last_updated AS lastUpdated,
      s.id AS sid, s.name AS sname, s.contact_person AS scp, s.email AS semail, s.phone AS sphone,
      s.city AS scity, s.lead_time_days AS sltd, s.rating AS srating,
      c.name AS customerName, p.name AS projectName
    FROM inventory i
    LEFT JOIN suppliers s ON s.id=i.supplier_id
    LEFT JOIN customers c ON c.id=i.customer_id
    LEFT JOIN projects p ON p.id=i.project_id
    ORDER BY i.name ASC`);
  return rows.map(r => ({
    id:r.id, name:r.name, sku:r.sku, category:r.category,
    quantity:Number(r.quantity), threshold:Number(r.threshold), cost:Number(r.cost),
    supplierId:r.supplierId, customerId:r.customerId, projectId:r.projectId,
    location:r.location, unit:r.unit, lastUpdated:r.lastUpdated,
    status:Number(r.quantity)<=Number(r.threshold)?"Low Stock":"Healthy",
    customer:r.customerId?{id:r.customerId,name:r.customerName}:null,
    project:r.projectId?{id:r.projectId,name:r.projectName}:null,
    supplier:r.sid?{id:r.sid,name:r.sname,contactPerson:r.scp,email:r.semail,phone:r.sphone,city:r.scity,leadTimeDays:Number(r.sltd||0),rating:Number(r.srating||0)}:null,
  }));
}

async function getMovements() {
  const rows = await getRows(`
    SELECT m.id, m.inventory_id AS inventoryId, m.item_name AS itemName, m.sku, m.type, m.quantity, m.note,
      m.created_by AS createdBy, m.created_at AS createdAt,
      i.project_id AS projectId, p.name AS projectName, i.customer_id AS customerId, c.name AS customerName
    FROM movements m
    LEFT JOIN inventory i ON i.id=m.inventory_id
    LEFT JOIN projects p ON p.id=i.project_id
    LEFT JOIN customers c ON c.id=i.customer_id
    ORDER BY m.created_at DESC`);
  return rows.map(r => ({ ...r, quantity:Number(r.quantity), customer:r.customerId?{id:r.customerId,name:r.customerName}:null, project:r.projectId?{id:r.projectId,name:r.projectName}:null }));
}

async function getPurchaseOrders() {
  const orders = await getRows(`
    SELECT po.id, po.po_number AS poNumber, po.supplier_id AS supplierId, po.status,
      po.customer_id AS customerId, po.project_id AS projectId,
      po.order_date AS orderDate, po.expected_date AS expectedDate, po.notes, po.created_by AS createdBy,
      po.created_at AS createdAt, po.updated_at AS updatedAt,
      s.id AS sid, s.name AS sname, s.contact_person AS scp, s.email AS semail, s.phone AS sphone,
      s.city AS scity, s.lead_time_days AS sltd, s.rating AS srating,
      c.name AS customerName, p.name AS projectName,
      inv.id AS invoiceId, inv.invoice_number AS invoiceNumber, inv.status AS invoiceStatus,
      grn.id AS grnId, grn.grn_number AS grnNumber, grn.received_date AS grnReceivedDate
    FROM purchase_orders po
    LEFT JOIN suppliers s ON s.id=po.supplier_id
    LEFT JOIN customers c ON c.id=po.customer_id
    LEFT JOIN projects p ON p.id=po.project_id
    LEFT JOIN invoices inv ON inv.po_id=po.id
    LEFT JOIN grns grn ON grn.po_id=po.id
    ORDER BY po.created_at DESC`);
  const items = await getRows(`SELECT id, po_id AS poId, inventory_id AS inventoryId, name, quantity, cost FROM purchase_order_items`);
  return orders.map(o => {
    const lines = items.filter(i=>i.poId===o.id).map(i=>({id:i.id,inventoryId:i.inventoryId,name:i.name,quantity:Number(i.quantity),cost:Number(i.cost)}));
    return { id:o.id, poNumber:o.poNumber, supplierId:o.supplierId, customerId:o.customerId, projectId:o.projectId, status:o.status, orderDate:o.orderDate, expectedDate:o.expectedDate, notes:o.notes, createdBy:o.createdBy, createdAt:o.createdAt, updatedAt:o.updatedAt,
      supplier:o.sid?{id:o.sid,name:o.sname,contactPerson:o.scp,email:o.semail,phone:o.sphone,city:o.scity,leadTimeDays:Number(o.sltd||0),rating:Number(o.srating||0)}:null,
      customer:o.customerId?{id:o.customerId,name:o.customerName}:null, project:o.projectId?{id:o.projectId,name:o.projectName}:null,
      items:lines, totalValue:lines.reduce((s,i)=>s+i.quantity*i.cost,0),
      invoiceId:o.invoiceId, invoiceNumber:o.invoiceNumber, invoiceStatus:o.invoiceStatus,
      grnId:o.grnId, grnNumber:o.grnNumber, grnReceivedDate:o.grnReceivedDate };
  });
}

async function getSuppliers(filters={}) {
  const clauses=[];
  if(filters.query){const q=`%${String(filters.query).trim().toLowerCase()}%`;clauses.push(`(s.name ILIKE ${sqlValue(q)} OR COALESCE(s.contact_person,'') ILIKE ${sqlValue(q)} OR COALESCE(s.email,'') ILIKE ${sqlValue(q)} OR COALESCE(s.city,'') ILIKE ${sqlValue(q)} OR COALESCE(s.industry,'') ILIKE ${sqlValue(q)})`)}
  if(filters.industry&&filters.industry!=="All")clauses.push(`COALESCE(s.industry,'General')=${sqlValue(filters.industry)}`);
  if(filters.approvalStatus&&filters.approvalStatus!=="All")clauses.push(`COALESCE(s.approval_status,'Not Approved')=${sqlValue(filters.approvalStatus)}`);
  const where=clauses.length?`WHERE ${clauses.join(" AND ")}`:"";
  const limitClause=filters.limit?`LIMIT ${Math.max(1,Number(filters.limit))}`:"";
  const offsetClause=filters.offset?`OFFSET ${Math.max(0,Number(filters.offset))}`:"";
  const rows=await getRows(`SELECT s.id, s.name, s.customer_id AS customerId, c.name AS customerName, s.project_id AS projectId, p.name AS projectName, COALESCE(s.industry,'General') AS industry, COALESCE(s.approval_status,'Not Approved') AS approvalStatus, s.bank_details AS bankDetails, s.contact_person AS contactPerson, s.email, s.phone, s.city, s.lead_time_days AS leadTimeDays, s.rating, s.created_at AS createdAt, s.updated_at AS updatedAt FROM suppliers s LEFT JOIN customers c ON c.id=s.customer_id LEFT JOIN projects p ON p.id=s.project_id ${where} ORDER BY CASE COALESCE(s.approval_status,'Not Approved') WHEN 'Approved' THEN 0 ELSE 1 END, COALESCE(s.industry,'General') ASC, s.name ASC ${limitClause} ${offsetClause}`);
  return rows.map(r=>({...r,leadTimeDays:Number(r.leadTimeDays||0),rating:Number(r.rating||0),bankDetails:r.bankDetails?JSON.parse(r.bankDetails):null,customer:r.customerId?{id:r.customerId,name:r.customerName}:null,project:r.projectId?{id:r.projectId,name:r.projectName}:null}));
}

async function getSupplierCount(filters={}) {
  const clauses=[];
  if(filters.query){const q=`%${String(filters.query).trim().toLowerCase()}%`;clauses.push(`(s.name ILIKE ${sqlValue(q)} OR COALESCE(s.contact_person,'') ILIKE ${sqlValue(q)} OR COALESCE(s.city,'') ILIKE ${sqlValue(q)})`)}
  if(filters.industry&&filters.industry!=="All")clauses.push(`COALESCE(s.industry,'General')=${sqlValue(filters.industry)}`);
  if(filters.approvalStatus&&filters.approvalStatus!=="All")clauses.push(`COALESCE(s.approval_status,'Not Approved')=${sqlValue(filters.approvalStatus)}`);
  const where=clauses.length?`WHERE ${clauses.join(" AND ")}`:"";
  const row=await getRow(`SELECT COUNT(*) AS count FROM suppliers s LEFT JOIN customers c ON c.id=s.customer_id LEFT JOIN projects p ON p.id=s.project_id ${where}`);
  return Number(row?.count||0);
}

async function getSupplierOptions(limit=400) {
  return getRows(`SELECT id, name, customer_id AS customerId, project_id AS projectId, COALESCE(approval_status,'Not Approved') AS approvalStatus FROM suppliers ORDER BY CASE COALESCE(approval_status,'Not Approved') WHEN 'Approved' THEN 0 ELSE 1 END, name ASC LIMIT ${Math.max(1,Number(limit))}`);
}

async function getCustomers() { return getRows(`SELECT id, name, contact_person AS contactPerson, email, phone, created_at AS createdAt, updated_at AS updatedAt FROM customers ORDER BY name ASC`); }
async function getCustomerById(customerId) { if(!customerId)return null; return getRow(`SELECT id, name, contact_person AS contactPerson, email, phone FROM customers WHERE id=${sqlValue(customerId)} LIMIT 1`); }

async function getProjects() {
  const rows=await getRows(`SELECT p.id, p.name, p.customer_id AS customerId, c.name AS customerName, p.status, p.notes, p.created_at AS createdAt, p.updated_at AS updatedAt, (SELECT COUNT(*) FROM project_documents pd WHERE pd.project_id=p.id) AS documentCount FROM projects p LEFT JOIN customers c ON c.id=p.customer_id ORDER BY p.name ASC`);
  const result=[];
  for(const r of rows){
    const services=await getRows(`SELECT s.id, s.name FROM project_services ps INNER JOIN services s ON s.id=ps.service_id WHERE ps.project_id=${sqlValue(r.id)} ORDER BY s.name ASC`);
    result.push({...r,documentCount:Number(r.documentCount||0),customer:r.customerId?{id:r.customerId,name:r.customerName}:null,services});
  }
  return result;
}

async function getServices() { return getRows(`SELECT id, name, created_at AS createdAt, updated_at AS updatedAt FROM services ORDER BY name ASC`); }

async function getProjectDocuments(projectId) {
  const rows=await getRows(`SELECT id, project_id AS projectId, category, title, original_name AS originalName, storage_name AS storageName, mime_type AS mimeType, file_size AS fileSize, notes, created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt FROM project_documents WHERE project_id=${sqlValue(projectId)} ORDER BY created_at DESC`);
  return rows.map(r=>({...r,fileUrl:`/api/project-files/${r.id}`}));
}

async function getUsers() { return getRows(`SELECT id, name, email, role FROM users ORDER BY name ASC`); }

async function getDeliveryChallans() {
  const rows=await getRows(`SELECT dc.id, dc.challan_number AS challanNumber, dc.challan_type AS challanType, dc.po_id AS poId, dc.customer_id AS customerId, dc.project_id AS projectId, dc.recipient_name AS recipientName, dc.recipient_company AS recipientCompany, dc.destination, dc.vehicle_number AS vehicleNumber, dc.notes, dc.created_by AS createdBy, dc.created_at AS createdAt, dc.updated_at AS updatedAt, po.po_number AS poNumber, c.name AS customerName, p.name AS projectName FROM delivery_challans dc LEFT JOIN purchase_orders po ON po.id=dc.po_id LEFT JOIN customers c ON c.id=dc.customer_id LEFT JOIN projects p ON p.id=dc.project_id ORDER BY dc.created_at DESC`);
  return rows.map(r=>({...r,customer:r.customerId?{id:r.customerId,name:r.customerName}:null,project:r.projectId?{id:r.projectId,name:r.projectName}:null}));
}

async function getPackagingDocuments() {
  const rows=await getRows(`SELECT pd.id, pd.packaging_number AS packagingNumber, pd.challan_id AS challanId, pd.customer_id AS customerId, pd.project_id AS projectId, pd.package_count AS packageCount, pd.gross_weight AS grossWeight, pd.net_weight AS netWeight, pd.contents, pd.notes, pd.created_by AS createdBy, pd.created_at AS createdAt, pd.updated_at AS updatedAt, dc.challan_number AS challanNumber, dc.recipient_company AS recipientCompany, c.name AS customerName, p.name AS projectName FROM packaging_documents pd JOIN delivery_challans dc ON dc.id=pd.challan_id LEFT JOIN customers c ON c.id=pd.customer_id LEFT JOIN projects p ON p.id=pd.project_id ORDER BY pd.created_at DESC`);
  return rows.map(r=>({...r,packageCount:Number(r.packageCount),grossWeight:Number(r.grossWeight||0),netWeight:Number(r.netWeight||0),customer:r.customerId?{id:r.customerId,name:r.customerName}:null,project:r.projectId?{id:r.projectId,name:r.projectName}:null}));
}

async function getPricingRates() {
  const rows=await getRows(`SELECT key, kind, label, currency, unit, rate, difficulty_factor AS difficultyFactor, source_url AS sourceUrl, source_note AS sourceNote, updated_at AS updatedAt FROM pricing_rate_snapshots ORDER BY kind ASC, label ASC`);
  return rows.map(r=>({...r,rate:Number(r.rate||0),difficultyFactor:r.difficultyFactor===null||r.difficultyFactor===undefined?null:Number(r.difficultyFactor||0)}));
}

async function createQuoteReference() {
  const row=await getRow(`SELECT COUNT(*) AS count FROM quote_requests`);
  return `BWQ-${new Date().getFullYear()}-${String(Number(row?.count||0)+1).padStart(4,"0")}`;
}

async function createPoNumber() { const r=await getRow(`SELECT COUNT(*) AS count FROM purchase_orders`); return `PO-${new Date().getFullYear()}-${String(Number(r?.count||0)+41).padStart(3,"0")}`; }
async function createInvoiceNumber() { const r=await getRow(`SELECT COUNT(*) AS count FROM invoices`); return `INV-${new Date().getFullYear()}-${String(Number(r?.count||0)+1).padStart(3,"0")}`; }
async function createGrnNumber() { const r=await getRow(`SELECT COUNT(*) AS count FROM grns`); return `GRN-${new Date().getFullYear()}-${String(Number(r?.count||0)+1).padStart(3,"0")}`; }
async function createChallanNumber() { const r=await getRow(`SELECT COUNT(*) AS count FROM delivery_challans`); return `DC-${new Date().getFullYear()}-${String(Number(r?.count||0)+1).padStart(3,"0")}`; }
async function createPackagingNumber() { const r=await getRow(`SELECT COUNT(*) AS count FROM packaging_documents`); return `PKG-${new Date().getFullYear()}-${String(Number(r?.count||0)+1).padStart(3,"0")}`; }

function getQuoteRequestScopeClause(user) {
  if(!user||user.role!=="Customer") return "";
  const email=String(user.email||"").trim().toLowerCase(); const cid=String(user.customerId||"").trim();
  const filters=[]; if(cid)filters.push(`qr.customer_id=${sqlValue(cid)}`); if(email)filters.push(`lower(qr.email)=${sqlValue(email)}`);
  return filters.length?`WHERE (${filters.join(" OR ")})`:"WHERE 1=0";
}
function canAccessQuoteRequest(user, quote) {
  if(!user||!quote)return false; if(user.role!=="Customer")return true;
  const email=String(user.email||"").trim().toLowerCase(); const cid=String(user.customerId||"").trim();
  return (cid&&quote.customerId===cid)||(email&&String(quote.email||"").trim().toLowerCase()===email);
}

function mapQuoteRow(row, pricingCache={}) {
  const optionSelections=row.optionSelections?JSON.parse(row.optionSelections):{};
  const pricing=buildQuotePricing({process:row.process,material:row.material,finish:row.finish,quantity:row.quantity,fileSize:row.fileSize,materialFamily:row.materialFamily,materialGrade:row.materialGrade,optionSelections},row.reviewData?JSON.parse(row.reviewData):{},pricingCache);
  return {
    ...row, quantity:Number(row.quantity||0), estimateLow:Number(row.estimateLow||pricing.low||0), estimateHigh:Number(row.estimateHigh||pricing.high||0),
    estimatedLeadDays:Number(row.estimatedLeadDays||pricing.leadDays||0), reviewData:pricing.settings,
    materialFamily:row.materialFamily||pricing.settings.materialFamily||"", materialGrade:row.materialGrade||pricing.settings.materialGrade||"",
    designUnits:row.designUnits||"mm", optionSelections:pricing.settings.optionSelections||optionSelections,
    pricing, dfm:buildQuoteDfmAnalysis({...row,quantity:Number(row.quantity||0),optionSelections:pricing.settings.optionSelections||optionSelections,reviewData:pricing.settings}),
    fileUrl:`/api/quote-files/${row.id}`,
    customer:row.customerId?{id:row.customerId,name:row.customerName||"",contactPerson:row.customerContactPerson||"",email:row.customerEmail||"",phone:row.customerPhone||""}:null,
  };
}

const QUOTE_SELECT = `SELECT qr.id, qr.reference_code AS referenceCode, qr.name, qr.company, qr.email, qr.phone, qr.customer_id AS customerId, c.name AS customerName, c.contact_person AS customerContactPerson, c.email AS customerEmail, c.phone AS customerPhone, qr.process, qr.material, qr.material_family AS materialFamily, qr.material_grade AS materialGrade, qr.finish, qr.color, qr.tolerance, qr.quantity, qr.units, qr.design_units AS designUnits, qr.notes, qr.status, qr.estimate_currency AS estimateCurrency, qr.estimate_low AS estimateLow, qr.estimate_high AS estimateHigh, qr.estimated_lead_days AS estimatedLeadDays, qr.admin_notes AS adminNotes, qr.original_name AS originalName, qr.storage_name AS storageName, qr.mime_type AS mimeType, qr.file_size AS fileSize, qr.review_data AS reviewData, qr.option_selections AS optionSelections, qr.created_at AS createdAt, qr.updated_at AS updatedAt FROM quote_requests qr LEFT JOIN customers c ON c.id=qr.customer_id`;

async function getQuoteRequests(user=null, pricingCache={}) {
  const rows=await getRows(`${QUOTE_SELECT} ${getQuoteRequestScopeClause(user)} ORDER BY qr.created_at DESC`);
  return rows.map(r=>mapQuoteRow(r,pricingCache));
}
async function getQuoteRequestById(quoteId, user=null, pricingCache={}) {
  const row=await getRow(`${QUOTE_SELECT} WHERE qr.id=${sqlValue(quoteId)} LIMIT 1`);
  const quote=row?mapQuoteRow(row,pricingCache):null;
  if(!quote||!user)return quote;
  return canAccessQuoteRequest(user,quote)?quote:null;
}

async function getQuoteOrderByQuoteId(quoteId, user=null, pricingCache={}) {
  const row=await getRow(`SELECT id, quote_request_id AS quoteRequestId, customer_id AS customerId, status, payment_status AS paymentStatus, currency, review_result AS reviewResult, engineering_decision AS engineeringDecision, end_use AS endUse, delivery_speed AS deliverySpeed, delivery_date AS deliveryDate, t0_sample_date AS t0SampleDate, production_delivery_date AS productionDeliveryDate, shipping_method AS shippingMethod, incoterm, shipping_scope AS shippingScope, importer_model AS importerModel, importer_name AS importerName, importer_tax_id AS importerTaxId, gstin, tax_mode AS taxMode, billing_name AS billingName, shipping_name AS shippingName, shipping_phone AS shippingPhone, shipping_company AS shippingCompany, address_line1 AS addressLine1, address_line2 AS addressLine2, city, state, postal_code AS postalCode, country, notes, commercial_notes AS commercialNotes, part_unit_price AS partUnitPrice, part_subtotal AS partSubtotal, moq, batch_quantity AS batchQuantity, inspection_option AS inspectionOption, finish_confirmation AS finishConfirmation, mold_type AS moldType, cavity_count AS cavityCount, tool_material AS toolMaterial, texture_finish AS textureFinish, sample_rounds AS sampleRounds, t0_sample_plan AS t0SamplePlan, production_quantity AS productionQuantity, tool_lead_days AS toolLeadDays, production_lead_days AS productionLeadDays, tooling_cost AS toolingCost, manufacturing_subtotal AS manufacturingSubtotal, shipping_cost AS shippingCost, duties_cost AS dutiesCost, duty_rate AS dutyRate, tax_rate AS taxRate, tax_amount AS taxAmount, total_amount AS totalAmount, summary_data AS summaryData, razorpay_order_id AS razorpayOrderId, razorpay_payment_id AS razorpayPaymentId, razorpay_signature AS razorpaySignature, created_at AS createdAt, updated_at AS updatedAt FROM quote_orders WHERE quote_request_id=${sqlValue(quoteId)} LIMIT 1`);
  return row||null;
}

async function upsertQuoteOrder(quote, payload={}, pricingCache={}) {
  const existing=await getQuoteOrderByQuoteId(quote.id);
  const summary=computeQuoteOrderSummary(quote,{...existing,...payload},pricingCache);
  const now=new Date().toISOString();
  if(existing){
    await runSql(`UPDATE quote_orders SET customer_id=${sqlValue(summary.shippingName?quote.customerId||"":"")}, status=${sqlValue(String(payload.status||existing.status||"Draft"))}, payment_status=${sqlValue(existing.paymentStatus||"Pending")}, review_result=${sqlValue(summary.reviewResult)}, engineering_decision=${sqlValue(summary.engineeringDecision)}, end_use=${sqlValue(summary.endUse)}, delivery_speed=${sqlValue(summary.deliverySpeed)}, delivery_date=${sqlValue(summary.deliveryDate)}, t0_sample_date=${sqlValue(summary.t0SampleDate)}, production_delivery_date=${sqlValue(summary.productionDeliveryDate)}, shipping_method=${sqlValue(summary.shippingMethod)}, incoterm=${sqlValue(summary.incoterm)}, shipping_scope=${sqlValue(summary.shippingScope)}, importer_model=${sqlValue(summary.importerModel)}, importer_name=${sqlValue(summary.importerName)}, importer_tax_id=${sqlValue(summary.importerTaxId)}, gstin=${sqlValue(summary.gstin)}, tax_mode=${sqlValue(summary.taxMode)}, billing_name=${sqlValue(summary.billingName)}, shipping_name=${sqlValue(summary.shippingName)}, shipping_phone=${sqlValue(summary.shippingPhone)}, shipping_company=${sqlValue(summary.shippingCompany)}, address_line1=${sqlValue(summary.addressLine1)}, address_line2=${sqlValue(summary.addressLine2)}, city=${sqlValue(summary.city)}, state=${sqlValue(summary.state)}, postal_code=${sqlValue(summary.postalCode)}, country=${sqlValue(summary.country)}, notes=${sqlValue(summary.notes)}, commercial_notes=${sqlValue(summary.commercialNotes)}, part_unit_price=${sqlValue(summary.partUnitPrice)}, part_subtotal=${sqlValue(summary.partSubtotal)}, moq=${sqlValue(summary.moq)}, batch_quantity=${sqlValue(summary.batchQuantity)}, inspection_option=${sqlValue(summary.inspectionOption)}, finish_confirmation=${sqlValue(summary.finishConfirmation)}, mold_type=${sqlValue(summary.moldType)}, cavity_count=${sqlValue(summary.cavityCount)}, tool_material=${sqlValue(summary.toolMaterial)}, texture_finish=${sqlValue(summary.textureFinish)}, sample_rounds=${sqlValue(summary.sampleRounds)}, t0_sample_plan=${sqlValue(summary.t0SamplePlan)}, production_quantity=${sqlValue(summary.productionQuantity)}, tool_lead_days=${sqlValue(summary.toolLeadDays)}, production_lead_days=${sqlValue(summary.productionLeadDays)}, tooling_cost=${sqlValue(summary.toolingCost)}, manufacturing_subtotal=${sqlValue(summary.manufacturingSubtotal)}, shipping_cost=${sqlValue(summary.shippingCost)}, duties_cost=${sqlValue(summary.dutiesCost)}, duty_rate=${sqlValue(summary.dutyRate)}, tax_rate=${sqlValue(summary.taxRate)}, tax_amount=${sqlValue(summary.taxAmount)}, total_amount=${sqlValue(summary.totalAmount)}, updated_at=${sqlValue(now)} WHERE id=${sqlValue(existing.id)}`);
    return {...existing,...summary,id:existing.id};
  }
  const id=crypto.randomUUID();
  const status=shouldBlockCheckoutForQuote(quote)?"Engineering Review Required":"Ready for Checkout";
  await runSql(`INSERT INTO quote_orders (id,quote_request_id,customer_id,status,payment_status,currency,review_result,engineering_decision,end_use,delivery_speed,delivery_date,t0_sample_date,production_delivery_date,shipping_method,incoterm,shipping_scope,importer_model,importer_name,importer_tax_id,gstin,tax_mode,billing_name,shipping_name,shipping_phone,shipping_company,address_line1,address_line2,city,state,postal_code,country,notes,commercial_notes,part_unit_price,part_subtotal,moq,batch_quantity,inspection_option,finish_confirmation,mold_type,cavity_count,tool_material,texture_finish,sample_rounds,t0_sample_plan,production_quantity,tool_lead_days,production_lead_days,tooling_cost,manufacturing_subtotal,shipping_cost,duties_cost,duty_rate,tax_rate,tax_amount,total_amount,created_at,updated_at) VALUES (${sqlValue(id)},${sqlValue(quote.id)},${sqlValue(quote.customerId||"")},${sqlValue(String(payload.status||status))},${sqlValue("Pending")},${sqlValue("INR")},${sqlValue(summary.reviewResult)},${sqlValue(summary.engineeringDecision)},${sqlValue(summary.endUse)},${sqlValue(summary.deliverySpeed)},${sqlValue(summary.deliveryDate)},${sqlValue(summary.t0SampleDate)},${sqlValue(summary.productionDeliveryDate)},${sqlValue(summary.shippingMethod)},${sqlValue(summary.incoterm)},${sqlValue(summary.shippingScope)},${sqlValue(summary.importerModel)},${sqlValue(summary.importerName)},${sqlValue(summary.importerTaxId)},${sqlValue(summary.gstin)},${sqlValue(summary.taxMode)},${sqlValue(summary.billingName)},${sqlValue(summary.shippingName)},${sqlValue(summary.shippingPhone)},${sqlValue(summary.shippingCompany)},${sqlValue(summary.addressLine1)},${sqlValue(summary.addressLine2)},${sqlValue(summary.city)},${sqlValue(summary.state)},${sqlValue(summary.postalCode)},${sqlValue(summary.country)},${sqlValue(summary.notes)},${sqlValue(summary.commercialNotes)},${sqlValue(summary.partUnitPrice)},${sqlValue(summary.partSubtotal)},${sqlValue(summary.moq)},${sqlValue(summary.batchQuantity)},${sqlValue(summary.inspectionOption)},${sqlValue(summary.finishConfirmation)},${sqlValue(summary.moldType)},${sqlValue(summary.cavityCount)},${sqlValue(summary.toolMaterial)},${sqlValue(summary.textureFinish)},${sqlValue(summary.sampleRounds)},${sqlValue(summary.t0SamplePlan)},${sqlValue(summary.productionQuantity)},${sqlValue(summary.toolLeadDays)},${sqlValue(summary.productionLeadDays)},${sqlValue(summary.toolingCost)},${sqlValue(summary.manufacturingSubtotal)},${sqlValue(summary.shippingCost)},${sqlValue(summary.dutiesCost)},${sqlValue(summary.dutyRate)},${sqlValue(summary.taxRate)},${sqlValue(summary.taxAmount)},${sqlValue(summary.totalAmount)},${sqlValue(now)},${sqlValue(now)})`);
  return {...summary,id,quoteRequestId:quote.id,status:String(payload.status||status),paymentStatus:"Pending",currency:"INR"};
}

async function buildReports() {
  const [inventory,purchaseOrders,movements,quotes,customers,approvedCount,projects,suppliers]=await Promise.all([getInventory(),getPurchaseOrders(),getMovements(),getQuoteRequests(),getCustomers(),getSupplierCount({approvalStatus:"Approved"}),getProjects(),getSuppliers({limit:10000})]);
  const lowStock=inventory.filter(i=>i.quantity<=i.threshold);
  return {
    metrics:{quoteCount:quotes.length,newQuoteCount:quotes.filter(q=>q.status==="New").length,skuCount:inventory.length,unitsOnHand:inventory.reduce((s,i)=>s+i.quantity,0),lowStockCount:lowStock.length,totalInventoryValue:inventory.reduce((s,i)=>s+i.quantity*i.cost,0),supplierCount:approvedCount,openPurchaseOrders:purchaseOrders.filter(o=>o.status!=="Received").length,projectCount:projects.length,customerCount:customers.length},
    lowStock,
    topValueItems:[...inventory].sort((a,b)=>b.quantity*b.cost-a.quantity*a.cost).slice(0,5).map(i=>({id:i.id,name:i.name,sku:i.sku,value:i.quantity*i.cost,quantity:i.quantity})),
    recentMovements:movements.slice(0,8),
    projectBreakdown:projects.map(p=>({id:p.id,name:p.name,customerName:p.customer?.name||"No customer",inventoryCount:inventory.filter(i=>i.projectId===p.id).length,supplierCount:suppliers.filter(s=>s.projectId===p.id).length,poCount:purchaseOrders.filter(o=>o.projectId===p.id).length})),
  };
}

// ── SUPPLIER ASSISTANT ────────────────────────────────────────────────────────
function getSupplierIndustryList() { return ["General","Metals","Plastics","Electronics","Machining","Sheet Metal","Casting","Fabrication","Chemical","Packaging","Logistics","Tooling","3D Printing","Testing","Assembly"]; }
function tokenizeRequirement(text) { return String(text||"").toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(t=>t.length>2); }
function scoreSupplierMatch(supplier, tokens, guidance={}) {
  let score=0;
  const text=`${supplier.name||""} ${supplier.industry||""} ${supplier.city||""} ${supplier.contactPerson||""}`.toLowerCase();
  tokens.forEach(t=>{if(text.includes(t))score+=1;});
  if(guidance.preferredIndustries?.some&&guidance.preferredIndustries.some(i=>String(supplier.industry||"").toLowerCase().includes(i.toLowerCase())))score+=3;
  if(guidance.preferredCities?.some&&guidance.preferredCities.some(c=>String(supplier.city||"").toLowerCase().includes(c.toLowerCase())))score+=2;
  if(supplier.approvalStatus==="Approved")score+=2;
  score+=Math.min(2,Number(supplier.rating||0)/2.5);
  return score;
}

async function findRelevantSuppliers(requirement, scope="local", guidance={}) {
  const tokens=tokenizeRequirement(guidance.localSearchText||requirement);
  const all=await getSuppliers({limit:500});
  const scored=all.map(s=>({...s,_score:scoreSupplierMatch(s,tokens,guidance)})).filter(s=>s._score>0).sort((a,b)=>b._score-a._score).slice(0,12);
  return { suppliers:scored, message:scored.length?`Found ${scored.length} relevant supplier(s) from your master.`:"No close matches found in your supplier master for that requirement." };
}

async function analyzeSupplierRequirement(requirement, scope) {
  if(!OPENAI_API_KEY) throw new Error("OpenAI API key not configured.");
  const body=JSON.stringify({model:OPENAI_MODEL,messages:[{role:"system",content:"You are a procurement assistant for a manufacturing company. Analyze the supplier requirement and return JSON with: available (true), summary, localSearchText, onlineSearchText, preferredIndustries (array), preferredCities (array), mustHaveTerms (array)."},{role:"user",content:`Find suppliers for: ${requirement}. Scope: ${scope}`}],response_format:{type:"json_object"},max_tokens:400});
  return new Promise((resolve,reject)=>{
    const req=https.request({hostname:"api.openai.com",path:"/v1/chat/completions",method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${OPENAI_API_KEY}`,"Content-Length":Buffer.byteLength(body)}},(res)=>{
      let data=""; res.on("data",d=>{data+=d;}); res.on("end",()=>{
        try{const parsed=JSON.parse(data); const content=parsed.choices?.[0]?.message?.content||"{}"; resolve({available:true,...JSON.parse(content)});}
        catch(e){reject(e);}
      });
    });
    req.on("error",reject); req.write(body); req.end();
  });
}

// ── RAZORPAY ──────────────────────────────────────────────────────────────────
function razorpayRequest(method, pathname, payload=null) {
  return new Promise((resolve,reject)=>{
    const auth=Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
    const body=payload?JSON.stringify(payload):null;
    const req=https.request({hostname:"api.razorpay.com",path:pathname,method,headers:{"Authorization":`Basic ${auth}`,"Content-Type":"application/json",...(body?{"Content-Length":Buffer.byteLength(body)}:{})}},(res)=>{
      let data=""; res.on("data",d=>{data+=d;}); res.on("end",()=>{try{resolve(JSON.parse(data));}catch(e){reject(e);}});
    });
    req.on("error",reject); if(body)req.write(body); req.end();
  });
}

// ── DOCUMENT GENERATION ───────────────────────────────────────────────────────
function escapeHtml(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function formatCurrency(v){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(v||0));}
function documentShell(title,body){return`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#1d1d1f;}.doc{max-width:920px;margin:0 auto}.header{display:flex;justify-content:space-between;align-items:start;margin-bottom:28px}h1,h2,h3,p{margin:0}.muted{color:#5f6767}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:24px}.panel{border:1px solid #ddd;border-radius:12px;padding:16px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border-bottom:1px solid #ddd;padding:12px 10px;text-align:left}.right{text-align:right}.footer{margin-top:24px;color:#5f6767;font-size:13px}.letterhead{border-bottom:3px solid #7f3116;padding-bottom:16px;margin-bottom:24px;display:flex;gap:18px;align-items:center}.letterhead img{width:160px;height:auto;object-fit:contain;display:block}.letterhead-copy{display:grid;gap:4px}.letterhead h2{color:#7f3116;margin-bottom:4px}</style></head><body><div class="doc">${body}</div><script>window.print&&window.print()</script></body></html>`;}
function renderLetterhead(title,subtitle,contact){return`<div class="letterhead"><img src="${LOGO_PUBLIC_URL}" alt="Brahmworks logo"/><div class="letterhead-copy"><h2>${escapeHtml(title)}</h2><p class="muted">${escapeHtml(subtitle)}</p><p class="muted">${escapeHtml(contact)}</p></div></div>`;}

function generatePurchaseOrderDocument(order){
  const rows=order.items.map(i=>`<tr><td>${escapeHtml(i.name)}</td><td>${escapeHtml(i.inventoryId||"-")}</td><td class="right">${i.quantity}</td><td class="right">${formatCurrency(i.cost)}</td><td class="right">${formatCurrency(i.quantity*i.cost)}</td></tr>`).join("");
  return documentShell(`${order.poNumber} Purchase Order`,`${renderLetterhead("Brahmworks","Industrial Systems, Procurement and Dispatch","Bengaluru, Karnataka • dispatch@brahmworks.com")}<div class="header"><div><h1>Purchase Order</h1><p class="muted">${escapeHtml(order.poNumber)}</p></div><div class="right"><p>Order Date: ${escapeHtml(order.orderDate||"")}</p><p>Expected: ${escapeHtml(order.expectedDate||"")}</p></div></div><div class="grid"><div class="panel"><h3>Supplier</h3><p><strong>${escapeHtml(order.supplier?.name||"Not assigned")}</strong></p><p class="muted">${escapeHtml(order.supplier?.city||"")}</p></div><div class="panel"><h3>Status</h3><p>${escapeHtml(order.status)}</p></div></div><table><thead><tr><th>Item</th><th>ID</th><th class="right">Qty</th><th class="right">Unit Cost</th><th class="right">Total</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="4"><strong>Total</strong></td><td class="right"><strong>${formatCurrency(order.totalValue)}</strong></td></tr></tfoot></table><div class="footer">Use the browser print dialog to save this document as a PDF.</div>`);}

function generateInvoiceDocument(order){
  const rows=order.items.map(i=>`<tr><td>${escapeHtml(i.name)}</td><td class="right">${i.quantity}</td><td class="right">${formatCurrency(i.cost)}</td><td class="right">${formatCurrency(i.quantity*i.cost)}</td></tr>`).join("");
  return documentShell(`${order.invoiceNumber||"Invoice"}`,`${renderLetterhead("Brahmworks","Invoice","accounts@brahmworks.com")}<div class="header"><div><h1>Tax Invoice</h1><p class="muted">${escapeHtml(order.invoiceNumber||"")}</p></div></div><table><thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Unit Cost</th><th class="right">Total</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="3"><strong>Total</strong></td><td class="right"><strong>${formatCurrency(order.totalValue)}</strong></td></tr></tfoot></table><div class="footer">This is a computer-generated invoice.</div>`);}

function generateGrnDocument(order){
  const rows=order.items.map(i=>`<tr><td>${escapeHtml(i.name)}</td><td class="right">${i.quantity}</td></tr>`).join("");
  return documentShell(`${order.grnNumber||"GRN"}`,`${renderLetterhead("Brahmworks","Goods Received Note","warehouse@brahmworks.com")}<div class="header"><div><h1>Goods Received Note</h1><p class="muted">${escapeHtml(order.grnNumber||"")}</p></div><div><p>Received: ${escapeHtml(order.grnReceivedDate||"")}</p></div></div><table><thead><tr><th>Item</th><th class="right">Qty Received</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">Verified and signed by warehouse team.</div>`);}

function generateDeliveryChallanDocument(challan){
  return documentShell(`${challan.challanNumber||"DC"}`,`${renderLetterhead("Brahmworks","Delivery Challan","dispatch@brahmworks.com")}<div class="header"><div><h1>Delivery Challan</h1><p class="muted">${escapeHtml(challan.challanNumber||"")}</p></div></div><div class="grid"><div class="panel"><h3>Recipient</h3><p><strong>${escapeHtml(challan.recipientName||"")}</strong></p><p>${escapeHtml(challan.recipientCompany||"")}</p></div><div class="panel"><h3>Destination</h3><p>${escapeHtml(challan.destination||"")}</p><p>Vehicle: ${escapeHtml(challan.vehicleNumber||"—")}</p></div></div><div class="footer">This is a delivery challan — not a tax invoice.</div>`);}

function generatePackagingDocument(packaging){
  return documentShell(`${packaging.packagingNumber||"PKG"}`,`${renderLetterhead("Brahmworks","Packaging List","logistics@brahmworks.com")}<div class="header"><div><h1>Packaging List</h1><p class="muted">${escapeHtml(packaging.packagingNumber||"")}</p></div></div><div class="grid"><div class="panel"><h3>Package Details</h3><p>Packages: ${packaging.packageCount}</p><p>Gross: ${packaging.grossWeight} kg</p><p>Net: ${packaging.netWeight} kg</p></div><div class="panel"><h3>Contents</h3><p>${escapeHtml(packaging.contents||"See packing list")}</p></div></div><div class="footer">Packing list for logistics reference only.</div>`);}

function generateInventoryReportDocument(inventory,movements){
  const rows=inventory.map(i=>`<tr><td>${escapeHtml(i.name)}</td><td>${escapeHtml(i.sku)}</td><td>${escapeHtml(i.category)}</td><td class="right">${i.quantity}</td><td class="right">${i.threshold}</td><td>${escapeHtml(i.status)}</td><td class="right">${formatCurrency(i.cost)}</td></tr>`).join("");
  return documentShell("Inventory Report",`${renderLetterhead("Brahmworks","Inventory Report",`Generated ${new Date().toLocaleDateString("en-IN")}`)}<table><thead><tr><th>Name</th><th>SKU</th><th>Category</th><th class="right">Qty</th><th class="right">Threshold</th><th>Status</th><th class="right">Cost</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">Generated by Brahmworks Inventory OS.</div>`);}

function generateQuoteEstimateDocument(quote){
  return documentShell(`${quote.referenceCode||"Quote"} Estimate`,`${renderLetterhead("Brahmworks","Manufacturing Quote Estimate","quotes@brahmworks.com")}<div class="header"><div><h1>${escapeHtml(quote.referenceCode||"Quote")}</h1><p class="muted">Prepared for ${escapeHtml(quote.name||"")}</p></div></div><div class="grid"><div class="panel"><h3>Process</h3><p>${escapeHtml(quote.process)}</p></div><div class="panel"><h3>Material</h3><p>${escapeHtml(quote.material||"")}</p></div><div class="panel"><h3>Quantity</h3><p>${quote.quantity}</p></div><div class="panel"><h3>Budget Range (INR)</h3><p><strong>${formatCurrency(quote.estimateLow)} – ${formatCurrency(quote.estimateHigh)}</strong></p></div></div><div class="footer">This is a budget estimate only. Final pricing subject to engineering review.</div>`);}

function generateQuoteDfmDocument(quote){
  const dfm=quote.dfm||buildQuoteDfmAnalysis(quote);
  const items=(dfm?.checklist||[]).map(i=>`<tr><td>${escapeHtml(i.status.toUpperCase())}</td><td>${escapeHtml(i.title)}</td><td>${escapeHtml(i.detail)}</td><td>${escapeHtml(i.recommendation||"")}</td></tr>`).join("");
  return documentShell(`${quote.referenceCode||"Quote"} DFM Report`,`${renderLetterhead("Brahmworks","Design for Manufacturability Report","engineering@brahmworks.com")}<h1>${escapeHtml(dfm?.title||"DFM Analysis")}</h1><p>${escapeHtml(dfm?.summary||"")}</p><table><thead><tr><th>Status</th><th>Check</th><th>Detail</th><th>Recommendation</th></tr></thead><tbody>${items}</tbody></table><div class="footer">DFM report generated by Brahmworks engineering tools.</div>`);}

// ── RESPONSE HELPERS ──────────────────────────────────────────────────────────
function jsonResponse(statusCode, body, extraHeaders={}) {
  return { statusCode, headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*",...extraHeaders}, body:JSON.stringify(body) };
}
function htmlResponse(statusCode, html, extraHeaders={}) {
  return { statusCode, headers:{"Content-Type":"text/html; charset=utf-8",...extraHeaders}, body:html };
}

// ── DB INITIALISATION ─────────────────────────────────────────────────────────
let _dbInitialized = false;
async function initDb() {
  if (_dbInitialized) return;
  const db = getDb();
  const stmts = [
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL, customer_id TEXT, salt TEXT NOT NULL, password_hash TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, contact_person TEXT, email TEXT, phone TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, customer_id TEXT, status TEXT DEFAULT 'Active', notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS services (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS project_services (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, service_id TEXT NOT NULL, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS project_documents (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, category TEXT NOT NULL, title TEXT NOT NULL, original_name TEXT NOT NULL, storage_name TEXT NOT NULL, mime_type TEXT, file_size INTEGER, file_content TEXT, notes TEXT, created_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS quote_requests (id TEXT PRIMARY KEY, reference_code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, company TEXT, email TEXT NOT NULL, phone TEXT, customer_id TEXT, process TEXT NOT NULL, material TEXT, material_family TEXT, material_grade TEXT, finish TEXT, color TEXT, tolerance TEXT, quantity INTEGER NOT NULL DEFAULT 1, units TEXT, design_units TEXT, notes TEXT, status TEXT NOT NULL DEFAULT 'New', estimate_currency TEXT, estimate_low REAL, estimate_high REAL, estimated_lead_days INTEGER, admin_notes TEXT, original_name TEXT NOT NULL, storage_name TEXT NOT NULL, mime_type TEXT, file_size INTEGER, file_content TEXT, review_data TEXT, option_selections TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS quote_orders (id TEXT PRIMARY KEY, quote_request_id TEXT NOT NULL UNIQUE, customer_id TEXT, status TEXT NOT NULL DEFAULT 'Draft', payment_status TEXT NOT NULL DEFAULT 'Pending', currency TEXT NOT NULL DEFAULT 'INR', review_result TEXT, engineering_decision TEXT, end_use TEXT, delivery_speed TEXT, delivery_date TEXT, t0_sample_date TEXT, production_delivery_date TEXT, shipping_method TEXT, incoterm TEXT, shipping_scope TEXT, importer_model TEXT, importer_name TEXT, importer_tax_id TEXT, gstin TEXT, tax_mode TEXT, billing_name TEXT, shipping_name TEXT, shipping_phone TEXT, shipping_company TEXT, address_line1 TEXT, address_line2 TEXT, city TEXT, state TEXT, postal_code TEXT, country TEXT, notes TEXT, commercial_notes TEXT, part_unit_price REAL, part_subtotal REAL, moq INTEGER, batch_quantity INTEGER, inspection_option TEXT, finish_confirmation TEXT, mold_type TEXT, cavity_count INTEGER, tool_material TEXT, texture_finish TEXT, sample_rounds INTEGER, t0_sample_plan TEXT, production_quantity INTEGER, tool_lead_days INTEGER, production_lead_days INTEGER, tooling_cost REAL, manufacturing_subtotal REAL, shipping_cost REAL, duties_cost REAL, duty_rate REAL, tax_rate REAL, tax_amount REAL, total_amount REAL, summary_data TEXT, razorpay_order_id TEXT, razorpay_payment_id TEXT, razorpay_signature TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS pricing_rate_snapshots (key TEXT PRIMARY KEY, kind TEXT NOT NULL, label TEXT NOT NULL, currency TEXT NOT NULL, unit TEXT, rate REAL NOT NULL, difficulty_factor REAL, source_url TEXT, source_note TEXT, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS suppliers (id TEXT PRIMARY KEY, name TEXT NOT NULL, customer_id TEXT, project_id TEXT, industry TEXT DEFAULT 'General', approval_status TEXT DEFAULT 'Not Approved', bank_details TEXT, contact_person TEXT, email TEXT, phone TEXT, city TEXT, lead_time_days INTEGER, rating REAL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY, name TEXT NOT NULL, sku TEXT NOT NULL UNIQUE, category TEXT NOT NULL, customer_id TEXT, project_id TEXT, quantity INTEGER NOT NULL, threshold_value INTEGER NOT NULL, cost REAL NOT NULL, supplier_id TEXT, location TEXT, unit TEXT, last_updated TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS purchase_orders (id TEXT PRIMARY KEY, po_number TEXT NOT NULL UNIQUE, supplier_id TEXT, customer_id TEXT, project_id TEXT, status TEXT NOT NULL, order_date TEXT NOT NULL, expected_date TEXT, notes TEXT, created_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS purchase_order_items (id TEXT PRIMARY KEY, po_id TEXT NOT NULL, inventory_id TEXT, name TEXT NOT NULL, quantity INTEGER NOT NULL, cost REAL NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS movements (id TEXT PRIMARY KEY, inventory_id TEXT, item_name TEXT NOT NULL, sku TEXT, type TEXT NOT NULL, quantity INTEGER NOT NULL, note TEXT, created_by TEXT, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, invoice_number TEXT NOT NULL UNIQUE, po_id TEXT NOT NULL UNIQUE, supplier_id TEXT, status TEXT NOT NULL, issue_date TEXT NOT NULL, due_date TEXT, total_value REAL NOT NULL, notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS grns (id TEXT PRIMARY KEY, grn_number TEXT NOT NULL UNIQUE, po_id TEXT NOT NULL UNIQUE, received_date TEXT NOT NULL, received_by TEXT NOT NULL, notes TEXT, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS delivery_challans (id TEXT PRIMARY KEY, challan_number TEXT NOT NULL UNIQUE, challan_type TEXT NOT NULL, po_id TEXT, customer_id TEXT, project_id TEXT, recipient_name TEXT NOT NULL, recipient_company TEXT NOT NULL, destination TEXT NOT NULL, vehicle_number TEXT, notes TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS packaging_documents (id TEXT PRIMARY KEY, packaging_number TEXT NOT NULL UNIQUE, challan_id TEXT NOT NULL, customer_id TEXT, project_id TEXT, package_count INTEGER NOT NULL, gross_weight REAL, net_weight REAL, contents TEXT, notes TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  ];
  // Run DDL sequentially — neon() HTTP transport, one statement at a time
  for (const stmt of stmts) { await db([stmt]); }
  // Seed default pricing rates
  const now = new Date().toISOString();
  for (const [key, v] of Object.entries(RATE_DEFAULTS)) {
    await db([`INSERT INTO pricing_rate_snapshots (key,kind,label,currency,unit,rate,difficulty_factor,source_url,source_note,updated_at) VALUES (${sqlValue(key)},${sqlValue(v.kind)},${sqlValue(v.label)},${sqlValue(v.currency)},${sqlValue(v.unit)},${sqlValue(v.rate)},${sqlValue(v.difficultyFactor??null)},${sqlValue(v.sourceUrl)},${sqlValue(v.sourceNote)},${sqlValue(now)}) ON CONFLICT(key) DO NOTHING`]).catch(()=>{});
  }
  // Seed default services
  for (const svcName of DEFAULT_SERVICES) {
    const id = crypto.randomUUID();
    await db([`INSERT INTO services (id,name,created_at,updated_at) VALUES (${sqlValue(id)},${sqlValue(svcName)},${sqlValue(now)},${sqlValue(now)}) ON CONFLICT(name) DO NOTHING`]).catch(()=>{});
  }
  // Seed demo users if none exist
  const userCount = await getRow(`SELECT COUNT(*) AS count FROM users`);
  if (!Number(userCount?.count)) {
    const demo = [
      createUser("Aarav Mehta","admin@brahmworks.com","Admin","brahmworks123"),
      createUser("Ira Nair","ops@brahmworks.com","Operations","ops12345"),
      createUser("Dev Kapoor","procurement@brahmworks.com","Procurement","purchase123"),
    ];
    for (const u of demo) {
      await db([`INSERT INTO users (id,name,email,role,customer_id,salt,password_hash) VALUES (${sqlValue(u.id)},${sqlValue(u.name)},${sqlValue(u.email)},${sqlValue(u.role)},NULL,${sqlValue(u.salt)},${sqlValue(u.passwordHash)}) ON CONFLICT DO NOTHING`]).catch(()=>{});
    }
    // Seed demo suppliers & inventory
    const suppIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
    const suppData = [["Metro Metals","Nitin Shah","orders@metrometals.in","+91 22 4000 2100","Mumbai","Metals",5,4.8],["Axis Motion","Rhea Kamat","supply@axismotion.in","+91 80 4120 8821","Bengaluru","Machining",8,4.5],["Nova Systems","Aditya Menon","parts@novasystems.in","+91 44 3100 1199","Chennai","Electronics",6,4.7]];
    for (let i=0;i<3;i++) {
      const [name,cp,email,phone,city,industry,ltd,rating]=suppData[i];
      await db([`INSERT INTO suppliers (id,name,customer_id,project_id,industry,approval_status,bank_details,contact_person,email,phone,city,lead_time_days,rating,created_at,updated_at) VALUES (${sqlValue(suppIds[i])},${sqlValue(name)},NULL,NULL,${sqlValue(industry)},'Approved',NULL,${sqlValue(cp)},${sqlValue(email)},${sqlValue(phone)},${sqlValue(city)},${sqlValue(ltd)},${sqlValue(rating)},${sqlValue(now)},${sqlValue(now)}) ON CONFLICT DO NOTHING`]).catch(()=>{});
    }
    const invData = [["Copper Coil","BW-CC-101","Raw Materials",42,15,1250,suppIds[0],"Rack A1","kg"],["Servo Motor","BW-SM-208","Components",8,10,4850,suppIds[1],"Rack C2","pcs"],["Control Panel","BW-CP-332","Assemblies",18,6,9200,suppIds[2],"Rack F4","pcs"],["Hydraulic Valve","BW-HV-415","Components",13,7,3600,suppIds[2],"Rack D3","pcs"]];
    for (const [name,sku,cat,qty,thresh,cost,sid,loc,unit] of invData) {
      await db([`INSERT INTO inventory (id,name,sku,category,customer_id,project_id,quantity,threshold_value,cost,supplier_id,location,unit,last_updated,created_at,updated_at) VALUES (${sqlValue(crypto.randomUUID())},${sqlValue(name)},${sqlValue(sku)},${sqlValue(cat)},NULL,NULL,${sqlValue(qty)},${sqlValue(thresh)},${sqlValue(cost)},${sqlValue(sid)},${sqlValue(loc)},${sqlValue(unit)},${sqlValue(now)},${sqlValue(now)},${sqlValue(now)}) ON CONFLICT DO NOTHING`]).catch(()=>{});
    }
  }
  _dbInitialized = true;
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
async function routeRequest(event) {
  // OPTIONS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,PUT,DELETE,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization"} };
  }

  try {
    await initDb();
    _pricingCache = null; // refresh cache per request in dev; in prod cold-start cache persists
    const pc = await getPricingCache();
  } catch (err) {
    return jsonResponse(500, { error: `DB init failed: ${err.message}` });
  }

  const pricingCache = await getPricingCache();
  const method = event.httpMethod;
  const rawPath = event.path || "/";
  // Strip any legacy prefix (safety strip — pathname is the plain request path on Vercel)
  const pathname = rawPath.replace(/^\/.netlify\/functions\/api/, "") || "/";
  const qs = new URLSearchParams(event.queryStringParameters || {});
  const body = event.body ? (event.isBase64Encoded ? Buffer.from(event.body,"base64").toString() : event.body) : null;

  function parseBody() {
    if (!body) return {};
    try { return JSON.parse(body); } catch { return {}; }
  }

  async function requireAuth() {
    const sess = await getSession(event);
    if (!sess) return null;
    return sess;
  }

  function requirePermission(auth, permission) {
    if (!auth) return false;
    return getRolePermissions(auth.user.role).actions.includes(permission);
  }

  // ── PUBLIC ROUTES ───────────────────────────────────────────────────────────
  if (method === "POST" && pathname === "/api/auth/login") {
    const data = parseBody();
    const email = String(data.email||"").trim().toLowerCase();
    const password = String(data.password||"");
    const user = await getRow(`SELECT id,name,email,role,customer_id AS customerId,salt,password_hash AS passwordHash FROM users WHERE lower(email)=${sqlValue(email)} LIMIT 1`);
    if (!user || hashPassword(password, user.salt) !== user.passwordHash) return jsonResponse(401, {error:"Invalid email or password"});
    const token = crypto.randomBytes(24).toString("hex");
    await runSql(`INSERT INTO sessions (token,user_id,created_at) VALUES (${sqlValue(token)},${sqlValue(user.id)},${sqlValue(new Date().toISOString())})`);
    return jsonResponse(200, { user: sanitizeUser(user), token });
  }

  if (method === "POST" && pathname === "/api/auth/customer-signup") {
    const data = parseBody();
    const name = String(data.name||"").trim(); const company = String(data.company||"").trim();
    const email = String(data.email||"").trim().toLowerCase(); const phone = String(data.phone||"").trim();
    const password = String(data.password||"");
    if (!name||!email||password.length<8) return jsonResponse(400,{error:"Name, email, and a password with at least 8 characters are required."});
    const existing = await getRow(`SELECT id FROM users WHERE lower(email)=${sqlValue(email)} LIMIT 1`);
    if (existing) return jsonResponse(400,{error:"An account with this email already exists. Please sign in instead."});
    const now = new Date().toISOString(); const customerId = crypto.randomUUID();
    const newUser = createUser(name, email, "Customer", password);
    const requestedName = company||name;
    const dupCheck = await getRow(`SELECT id FROM customers WHERE lower(name)=${sqlValue(requestedName.toLowerCase())} LIMIT 1`);
    const customerName = dupCheck ? `${requestedName} (${email})` : requestedName;
    await runSql(`INSERT INTO customers (id,name,contact_person,email,phone,created_at,updated_at) VALUES (${sqlValue(customerId)},${sqlValue(customerName)},${sqlValue(name)},${sqlValue(email)},${sqlValue(phone)},${sqlValue(now)},${sqlValue(now)})`);
    await runSql(`INSERT INTO users (id,name,email,role,customer_id,salt,password_hash) VALUES (${sqlValue(newUser.id)},${sqlValue(newUser.name)},${sqlValue(newUser.email)},'Customer',${sqlValue(customerId)},${sqlValue(newUser.salt)},${sqlValue(newUser.passwordHash)})`);
    await runSql(`UPDATE quote_requests SET customer_id=${sqlValue(customerId)},updated_at=${sqlValue(now)} WHERE (customer_id IS NULL OR customer_id='') AND lower(email)=${sqlValue(email)}`);
    const token = crypto.randomBytes(24).toString("hex");
    await runSql(`INSERT INTO sessions (token,user_id,created_at) VALUES (${sqlValue(token)},${sqlValue(newUser.id)},${sqlValue(now)})`);
    return jsonResponse(201, { user: sanitizeUser({...newUser, customerId}), token });
  }

  if (method === "POST" && pathname === "/api/auth/logout") {
    const token = event.headers["authorization"]?.replace("Bearer ","").trim();
    if (token) await runSql(`DELETE FROM sessions WHERE token=${sqlValue(token)}`).catch(()=>{});
    return jsonResponse(200, {ok:true});
  }

  if (method === "GET" && pathname === "/api/auth/session") {
    const sess = await getSession(event);
    return jsonResponse(200, { user: sess ? sanitizeUser(sess.user) : null });
  }

  if (method === "GET" && pathname === "/api/quote-config") {
    return jsonResponse(200, { quoteConfig: getQuoteConfig() });
  }

  // Public quote submission
  if (method === "POST" && pathname === "/api/public/quote-requests") {
    const data = parseBody();
    const sess = await getSession(event);
    const name = String(data.name||"").trim(); const email = String(data.email||"").trim().toLowerCase();
    const process = String(data.process||"CNC Machining");
    if (!name||!email) return jsonResponse(400,{error:"Name and email are required"});
    if (!data.originalName) return jsonResponse(400,{error:"CAD file is required"});
    const now = new Date().toISOString();
    const quoteId = crypto.randomUUID();
    const refCode = await createQuoteReference();
    const ns = normalizeQuoteSelections(process, data.optionSelections||{});
    const pricing = buildQuotePricing({process, material:buildMaterialLabel(ns.materialFamily,ns.materialGrade), finish:ns.surfaceFinish||"", quantity:Number(data.quantity||1), fileSize:Number(data.fileSize||0), materialFamily:ns.materialFamily, materialGrade:ns.materialGrade, optionSelections:ns},{},pricingCache);
    const storageName = `${quoteId}_${String(data.originalName||"file").replace(/[^a-zA-Z0-9._-]/g,"_")}`;
    let customerId = sess?.user?.customerId||"";
    if (!customerId&&email) { const cu=await getRow(`SELECT id FROM customers WHERE email=${sqlValue(email)} LIMIT 1`); customerId=cu?.id||""; }
    await runSql(`INSERT INTO quote_requests (id,reference_code,name,company,email,phone,customer_id,process,material,material_family,material_grade,finish,color,tolerance,quantity,units,design_units,notes,status,estimate_currency,estimate_low,estimate_high,estimated_lead_days,admin_notes,original_name,storage_name,mime_type,file_size,file_content,review_data,option_selections,created_at,updated_at) VALUES (${sqlValue(quoteId)},${sqlValue(refCode)},${sqlValue(name)},${sqlValue(String(data.company||"").trim())},${sqlValue(email)},${sqlValue(String(data.phone||"").trim())},${sqlValue(customerId)},${sqlValue(process)},${sqlValue(pricing.material)},${sqlValue(ns.materialFamily)},${sqlValue(ns.materialGrade)},${sqlValue(pricing.finish)},${sqlValue(String(data.color||"").trim())},${sqlValue(ns.toleranceClass||"")},${sqlValue(Number(data.quantity||1))},${sqlValue(String(data.units||"pcs"))},${sqlValue(String(data.designUnits||"mm"))},${sqlValue(String(data.notes||"").trim())},'New',${sqlValue(pricing.currency)},${sqlValue(pricing.low)},${sqlValue(pricing.high)},${sqlValue(pricing.leadDays)},'',${sqlValue(String(data.originalName||"file"))},${sqlValue(storageName)},${sqlValue(String(data.mimeType||"application/octet-stream"))},${sqlValue(Number(data.fileSize||0))},${sqlValue(data.contentBase64||null)},${sqlValue(JSON.stringify(pricing.settings))},${sqlValue(JSON.stringify(ns))},${sqlValue(now)},${sqlValue(now)})`);
    return jsonResponse(201, { ok:true, referenceCode:refCode, quoteId });
  }

  // ── AUTHENTICATED ROUTES ────────────────────────────────────────────────────
  const auth = await requireAuth();
  if (!auth && pathname.startsWith("/api/") && pathname !== "/api/auth/login" && pathname !== "/api/auth/customer-signup" && pathname !== "/api/quote-config" && pathname !== "/api/public/quote-requests" && pathname !== "/api/auth/session") {
    return jsonResponse(401, {error:"Not authenticated"});
  }
  // Document routes don't require auth prefix check above, handle separately below

  if (method === "GET" && pathname === "/api/bootstrap") {
    if (!auth) return jsonResponse(401,{error:"Not authenticated"});
    const perms = getRolePermissions(auth.user.role);
    const isCustomer = auth.user.role === "Customer";
    const [inv,supp,pos,challans,pkgs,mvts,users,customers,projects,services,quotes,supplierOptions,reports]=await Promise.all([
      isCustomer?Promise.resolve([]):getInventory(),
      isCustomer?Promise.resolve([]):getSuppliers({limit:500}),
      isCustomer?Promise.resolve([]):getPurchaseOrders(),
      isCustomer?Promise.resolve([]):getDeliveryChallans(),
      isCustomer?Promise.resolve([]):getPackagingDocuments(),
      isCustomer?Promise.resolve([]):getMovements(),
      isCustomer?Promise.resolve([]):getUsers(),
      getCustomers(),
      isCustomer?Promise.resolve([]):getProjects(),
      isCustomer?Promise.resolve([]):getServices(),
      getQuoteRequests(auth.user,pricingCache),
      isCustomer?Promise.resolve([]):getSupplierOptions(),
      isCustomer?Promise.resolve({metrics:{}}):buildReports(),
    ]);
    return jsonResponse(200,{user:sanitizeUser(auth.user),permissions:perms,inventory:inv,suppliers:supp,purchaseOrders:pos,deliveryChallans:challans,packagingDocuments:pkgs,movements:mvts,users,customers,projects,services,quoteRequests:quotes,supplierOptions,supplierIndustries:isCustomer?[]:getSupplierIndustryList(),quoteConfig:getQuoteConfig(),reports});
  }

  if (method === "GET" && pathname === "/api/pricing-rates") {
    if (!auth||!requirePermission(auth,"quotes.manage")) return jsonResponse(403,{error:"Forbidden"});
    return jsonResponse(200,{pricingRates:await getPricingRates()});
  }

  if (method === "GET" && pathname === "/api/quote-requests") {
    if (!auth||!requirePermission(auth,"quotes.view")) return jsonResponse(403,{error:"Forbidden"});
    return jsonResponse(200,{quoteRequests:await getQuoteRequests(auth.user,pricingCache)});
  }

  // GET /api/quote-requests/:id
  const qrMatch = pathname.match(/^\/api\/quote-requests\/([^/]+)$/);
  if (qrMatch && method==="GET") {
    if (!auth||!requirePermission(auth,"quotes.view")) return jsonResponse(403,{error:"Forbidden"});
    const quote = await getQuoteRequestById(qrMatch[1],auth.user,pricingCache);
    if (!quote) return jsonResponse(404,{error:"Quote request not found"});
    return jsonResponse(200,{quoteRequest:quote});
  }

  // PUT /api/quote-requests/:id
  if (qrMatch && method==="PUT") {
    if (!auth||!requirePermission(auth,"quotes.manage")) return jsonResponse(403,{error:"Forbidden"});
    const data = parseBody();
    const existing = await getQuoteRequestById(qrMatch[1],null,pricingCache);
    if (!existing) return jsonResponse(404,{error:"Quote request not found"});
    const ns = normalizeQuoteSelections(data.process===undefined?existing.process:data.process,data.optionSelections===undefined?existing.optionSelections||{}:data.optionSelections);
    const pricing = buildQuotePricing({process:data.process===undefined?existing.process:data.process,material:buildMaterialLabel(ns.materialFamily,ns.materialGrade),finish:ns.surfaceFinish||"",quantity:data.quantity===undefined?existing.quantity:data.quantity,fileSize:existing.fileSize,materialFamily:ns.materialFamily,materialGrade:ns.materialGrade,optionSelections:ns},{...existing.reviewData||{},...(data.reviewData&&typeof data.reviewData==="object"?data.reviewData:{})},pricingCache);
    const now = new Date().toISOString();
    await runSql(`UPDATE quote_requests SET process=${sqlValue(pricing.process)},material=${sqlValue(pricing.material)},material_family=${sqlValue(ns.materialFamily)},material_grade=${sqlValue(ns.materialGrade)},finish=${sqlValue(pricing.finish)},quantity=${sqlValue(pricing.quantity)},customer_id=${sqlValue(String(data.customerId===undefined?existing.customerId||"":data.customerId||""))},tolerance=${sqlValue(ns.toleranceClass||"")},design_units=${sqlValue(String(data.designUnits||existing.designUnits||"mm"))},option_selections=${sqlValue(JSON.stringify(ns))},status=${sqlValue(String(data.status||"New"))},admin_notes=${sqlValue(String(data.adminNotes||""))},estimate_currency=${sqlValue(pricing.currency)},estimate_low=${sqlValue(pricing.low)},estimate_high=${sqlValue(pricing.high)},estimated_lead_days=${sqlValue(pricing.leadDays)},review_data=${sqlValue(JSON.stringify(pricing.settings))},updated_at=${sqlValue(now)} WHERE id=${sqlValue(qrMatch[1])}`);
    return jsonResponse(200,{ok:true,quoteRequest:await getQuoteRequestById(qrMatch[1],null,pricingCache)});
  }

  // GET /api/quote-orders/quote/:quoteId
  const qoByQuoteMatch = pathname.match(/^\/api\/quote-orders\/quote\/([^/]+)$/);
  if (qoByQuoteMatch && method==="GET") {
    if (!auth||!requirePermission(auth,"quotes.view")) return jsonResponse(403,{error:"Forbidden"});
    const quote = await getQuoteRequestById(qoByQuoteMatch[1],auth.user,pricingCache);
    if (!quote) return jsonResponse(404,{error:"Quote request not found"});
    const quoteOrder = await upsertQuoteOrder(quote,{customerId:quote.customerId||"",status:shouldBlockCheckoutForQuote(quote)?"Engineering Review Required":"Ready for Checkout"},pricingCache);
    return jsonResponse(200,{quoteRequest:quote,quoteOrder,checkoutBlocked:shouldBlockCheckoutForQuote(quote),razorpay:{enabled:Boolean(RAZORPAY_KEY_ID&&RAZORPAY_KEY_SECRET),keyId:RAZORPAY_KEY_ID||""},checkoutFlow:{nextStep:quote.process==="Injection Molding"?"DFM-reviewed tooling checkout":"Commercial checkout"}});
  }

  // PUT /api/quote-orders/:id
  const qoMatch = pathname.match(/^\/api\/quote-orders\/([^/]+)$/);
  if (qoMatch && method==="PUT") {
    if (!auth||!requirePermission(auth,"quotes.view")) return jsonResponse(403,{error:"Forbidden"});
    const data = parseBody();
    const existingOrder = await getRow(`SELECT quote_request_id AS quoteRequestId FROM quote_orders WHERE id=${sqlValue(qoMatch[1])} LIMIT 1`);
    if (!existingOrder) return jsonResponse(404,{error:"Order draft not found"});
    const quote = await getQuoteRequestById(existingOrder.quoteRequestId,auth.user,pricingCache);
    if (!quote) return jsonResponse(404,{error:"Quote request not found"});
    const quoteOrder = await upsertQuoteOrder(quote,data,pricingCache);
    return jsonResponse(200,{ok:true,quoteOrder});
  }

  // Razorpay order
  const rzpOrderMatch = pathname.match(/^\/api\/quote-orders\/([^/]+)\/razorpay-order$/);
  if (rzpOrderMatch && method==="POST") {
    if (!auth||!requirePermission(auth,"quotes.view")) return jsonResponse(403,{error:"Forbidden"});
    const existingOrder = await getRow(`SELECT id,quote_request_id AS quoteRequestId FROM quote_orders WHERE id=${sqlValue(rzpOrderMatch[1])} LIMIT 1`);
    if (!existingOrder) return jsonResponse(404,{error:"Order draft not found"});
    const quote = await getQuoteRequestById(existingOrder.quoteRequestId,auth.user,pricingCache);
    if (!quote) return jsonResponse(404,{error:"Quote not found"});
    if (shouldBlockCheckoutForQuote(quote)) return jsonResponse(400,{error:"This injection molding order needs engineering review before payment."});
    const quoteOrder = await getQuoteOrderByQuoteId(quote.id);
    if (!quoteOrder) return jsonResponse(404,{error:"Order not found"});
    try {
      const rz = await razorpayRequest("POST","/v1/orders",{amount:Math.max(100,Math.round(Number(quoteOrder.totalAmount||0)*100)),currency:quoteOrder.currency||"INR",receipt:quote.referenceCode,notes:{quoteId:quote.id,process:quote.process}});
      await runSql(`UPDATE quote_orders SET razorpay_order_id=${sqlValue(rz.id)},updated_at=${sqlValue(new Date().toISOString())} WHERE id=${sqlValue(quoteOrder.id)}`);
      return jsonResponse(200,{ok:true,razorpay:{keyId:RAZORPAY_KEY_ID,orderId:rz.id,amount:rz.amount,currency:rz.currency,name:"Brahmworks",description:`${quote.referenceCode} order payment`,prefill:{name:quoteOrder.shippingName||quote.name||"",email:quote.email||"",contact:quoteOrder.shippingPhone||quote.phone||""}}});
    } catch(e){return jsonResponse(400,{error:e.message});}
  }

  // Razorpay verify
  const rzpVerifyMatch = pathname.match(/^\/api\/quote-orders\/([^/]+)\/razorpay-verify$/);
  if (rzpVerifyMatch && method==="POST") {
    if (!auth||!requirePermission(auth,"quotes.view")) return jsonResponse(403,{error:"Forbidden"});
    const data = parseBody();
    const existingOrder = await getRow(`SELECT id,quote_request_id AS quoteRequestId,razorpay_order_id AS razorpayOrderId FROM quote_orders WHERE id=${sqlValue(rzpVerifyMatch[1])} LIMIT 1`);
    if (!existingOrder) return jsonResponse(404,{error:"Order not found"});
    const rzPid=String(data.razorpay_payment_id||""); const rzOid=String(data.razorpay_order_id||""); const rzSig=String(data.razorpay_signature||"");
    if (!rzPid||!rzOid||!rzSig) return jsonResponse(400,{error:"Razorpay payment details are incomplete."});
    const expected=crypto.createHmac("sha256",RAZORPAY_KEY_SECRET).update(`${rzOid}|${rzPid}`).digest("hex");
    if (!RAZORPAY_KEY_SECRET||expected!==rzSig) return jsonResponse(400,{error:"Razorpay signature verification failed."});
    await runSql(`UPDATE quote_orders SET payment_status='Paid',status='Confirmed',razorpay_order_id=${sqlValue(rzOid)},razorpay_payment_id=${sqlValue(rzPid)},razorpay_signature=${sqlValue(rzSig)},updated_at=${sqlValue(new Date().toISOString())} WHERE id=${sqlValue(existingOrder.id)}`);
    const quote = await getQuoteRequestById(existingOrder.quoteRequestId,auth.user,pricingCache);
    return jsonResponse(200,{ok:true,quoteOrder:await getQuoteOrderByQuoteId(existingOrder.quoteRequestId)});
  }

  // Customers
  if (method==="POST" && pathname==="/api/customers") {
    if (!auth||!requirePermission(auth,"quotes.manage")) return jsonResponse(403,{error:"Forbidden"});
    const data=parseBody(); const name=String(data.name||"").trim();
    if (!name) return jsonResponse(400,{error:"Customer name is required"});
    const now=new Date().toISOString();
    await runSql(`INSERT INTO customers (id,name,contact_person,email,phone,created_at,updated_at) VALUES (${sqlValue(crypto.randomUUID())},${sqlValue(name)},${sqlValue(String(data.contactPerson||"").trim())},${sqlValue(String(data.email||"").trim())},${sqlValue(String(data.phone||"").trim())},${sqlValue(now)},${sqlValue(now)})`);
    return jsonResponse(201,{ok:true});
  }

  // Projects
  if (method==="POST" && pathname==="/api/projects") {
    if (!auth||!requirePermission(auth,"projects.manage")) return jsonResponse(403,{error:"Forbidden"});
    const data=parseBody(); const name=String(data.name||"").trim();
    if (!name) return jsonResponse(400,{error:"Project name is required"});
    const now=new Date().toISOString(); const pid=crypto.randomUUID();
    await runSql(`INSERT INTO projects (id,name,customer_id,status,notes,created_at,updated_at) VALUES (${sqlValue(pid)},${sqlValue(name)},${sqlValue(String(data.customerId||""))},${sqlValue(String(data.status||"Active"))},${sqlValue(String(data.notes||"").trim())},${sqlValue(now)},${sqlValue(now)})`);
    const sids=Array.isArray(data.serviceIds)?data.serviceIds:String(data.serviceIds||"").split(",").map(s=>s.trim()).filter(Boolean);
    for(const sid of sids){await runSql(`INSERT INTO project_services (id,project_id,service_id,created_at) VALUES (${sqlValue(crypto.randomUUID())},${sqlValue(pid)},${sqlValue(sid)},${sqlValue(now)})`).catch(()=>{});}
    return jsonResponse(201,{ok:true});
  }

  // Project documents
  const pdMatch = pathname.match(/^\/api\/projects\/([^/]+)\/documents$/);
  if (pdMatch && method==="GET") {
    if (!auth||!requirePermission(auth,"projects.view")) return jsonResponse(403,{error:"Forbidden"});
    return jsonResponse(200,{documents:await getProjectDocuments(pdMatch[1])});
  }
  if (pdMatch && method==="POST") {
    if (!auth||!requirePermission(auth,"projects.manage")) return jsonResponse(403,{error:"Forbidden"});
    const data=parseBody(); const proj=await getRow(`SELECT id FROM projects WHERE id=${sqlValue(pdMatch[1])} LIMIT 1`);
    if (!proj) return jsonResponse(404,{error:"Project not found"});
    const originalName=String(data.originalName||data.filename||"document"); const ext=originalName.includes(".")?"."+originalName.split(".").pop():"";
    const storageName=`${crypto.randomUUID()}${ext}`; const now=new Date().toISOString();
    if (!data.contentBase64) return jsonResponse(400,{error:"Document file is required"});
    const fileSize=Math.round(data.contentBase64.length*0.75);
    await runSql(`INSERT INTO project_documents (id,project_id,category,title,original_name,storage_name,mime_type,file_size,file_content,notes,created_by,created_at,updated_at) VALUES (${sqlValue(crypto.randomUUID())},${sqlValue(pdMatch[1])},${sqlValue(String(data.category||"Other").trim())},${sqlValue(String(data.title||originalName).trim())},${sqlValue(originalName)},${sqlValue(storageName)},${sqlValue(String(data.mimeType||"application/octet-stream"))},${sqlValue(fileSize)},${sqlValue(data.contentBase64)},${sqlValue(String(data.notes||"").trim())},${sqlValue(auth.user.name)},${sqlValue(now)},${sqlValue(now)})`);
    return jsonResponse(201,{ok:true});
  }

  // Services
  if (method==="POST" && pathname==="/api/services") {
    if (!auth||!requirePermission(auth,"projects.manage")) return jsonResponse(403,{error:"Forbidden"});
    const data=parseBody(); const name=String(data.name||"").trim();
    if (!name) return jsonResponse(400,{error:"Service name is required"});
    const ex=await getRow(`SELECT id FROM services WHERE lower(name)=lower(${sqlValue(name)})`);
    if (ex) return jsonResponse(409,{error:"Service already exists"});
    const now=new Date().toISOString();
    await runSql(`INSERT INTO services (id,name,created_at,updated_at) VALUES (${sqlValue(crypto.randomUUID())},${sqlValue(name)},${sqlValue(now)},${sqlValue(now)})`);
    return jsonResponse(201,{ok:true});
  }

  // Suppliers
  if (method==="GET" && pathname==="/api/suppliers") {
    if (!auth||!requirePermission(auth,"suppliers.view")) return jsonResponse(403,{error:"Forbidden"});
    const query=String(qs.get("query")||""); const industry=String(qs.get("industry")||"All"); const approvalStatus=String(qs.get("approvalStatus")||"All");
    const limit=Number(qs.get("limit")||50); const offset=Number(qs.get("offset")||0);
    const filters={query,industry,approvalStatus,limit,offset};
    return jsonResponse(200,{suppliers:await getSuppliers(filters),totalCount:await getSupplierCount(filters)});
  }
  if (method==="POST" && pathname==="/api/supplier-assistant") {
    if (!auth||!requirePermission(auth,"suppliers.view")) return jsonResponse(403,{error:"Forbidden"});
    const data=parseBody(); const requirement=String(data.requirement||"").trim(); const scope=String(data.scope||"local").toLowerCase()==="global"?"global":"local";
    let aiPlan; try{aiPlan=await analyzeSupplierRequirement(requirement,scope);}catch(e){aiPlan={available:false,fallback:true,localSearchText:requirement,onlineSearchText:`${requirement} industrial supplier`,preferredIndustries:[],preferredCities:[],mustHaveTerms:[]};}
    const local=await findRelevantSuppliers(requirement,scope,aiPlan);
    return jsonResponse(200,{message:local.message,suppliers:local.suppliers,totalCount:local.suppliers.length,onlineVendors:[],assistantMode:aiPlan.available?"openai":"fallback"});
  }
  if (method==="GET" && pathname==="/api/supplier-options") {
    if (!auth||!requirePermission(auth,"suppliers.view")) return jsonResponse(403,{error:"Forbidden"});
    return jsonResponse(200,{suppliers:await getSupplierOptions(500)});
  }
  if (method==="POST" && pathname==="/api/suppliers") {
    if (!auth||!requirePermission(auth,"suppliers.create")) return jsonResponse(403,{error:"Forbidden"});
    const data=parseBody(); const now=new Date().toISOString();
    await runSql(`INSERT INTO suppliers (id,name,customer_id,project_id,industry,approval_status,bank_details,contact_person,email,phone,city,lead_time_days,rating,created_at,updated_at) VALUES (${sqlValue(crypto.randomUUID())},${sqlValue(String(data.name||"").trim())},${sqlValue(String(data.customerId||""))},${sqlValue(String(data.projectId||""))},${sqlValue(String(data.industry||"General").trim())},'Not Approved',NULL,${sqlValue(String(data.contactPerson||"").trim())},${sqlValue(String(data.email||"").trim())},${sqlValue(String(data.phone||"").trim())},${sqlValue(String(data.city||"").trim())},${sqlValue(Number(data.leadTimeDays||0))},${sqlValue(Number(data.rating||0))},${sqlValue(now)},${sqlValue(now)})`);
    return jsonResponse(201,{ok:true});
  }
  const supMatch = pathname.match(/^\/api\/suppliers\/([^/]+)$/);
  if (supMatch && method==="PUT") {
    if (!auth||!requirePermission(auth,"suppliers.edit")) return jsonResponse(403,{error:"Forbidden"});
    const data=parseBody(); const sid=supMatch[1]; const ex=await getRow(`SELECT id,name,customer_id AS customerId,project_id AS projectId,COALESCE(industry,'General') AS industry,COALESCE(approval_status,'Not Approved') AS approvalStatus,contact_person AS contactPerson,email,phone,city,lead_time_days AS leadTimeDays,rating FROM suppliers WHERE id=${sqlValue(sid)} LIMIT 1`);
    if (!ex) return jsonResponse(404,{error:"Supplier not found"});
    const now=new Date().toISOString();
    const m={name:data.name===undefined?ex.name:String(data.name||"").trim(),customerId:data.customerId===undefined?ex.customerId||"":String(data.customerId||""),projectId:data.projectId===undefined?ex.projectId||"":String(data.projectId||""),industry:data.industry===undefined?ex.industry:String(data.industry||"General").trim()||"General",approvalStatus:data.approvalStatus===undefined?ex.approvalStatus:String(data.approvalStatus||"Not Approved").trim()||"Not Approved",contactPerson:data.contactPerson===undefined?ex.contactPerson||"":String(data.contactPerson||"").trim(),email:data.email===undefined?ex.email||"":String(data.email||"").trim(),phone:data.phone===undefined?ex.phone||"":String(data.phone||"").trim(),city:data.city===undefined?ex.city||"":String(data.city||"").trim(),leadTimeDays:data.leadTimeDays===undefined?Number(ex.leadTimeDays||0):Number(data.leadTimeDays||0),rating:data.rating===undefined?Number(ex.rating||0):Number(data.rating||0)};
    await runSql(`UPDATE suppliers SET name=${sqlValue(m.name)},customer_id=${sqlValue(m.customerId)},project_id=${sqlValue(m.projectId)},industry=${sqlValue(m.industry)},approval_status=${sqlValue(m.approvalStatus)},contact_person=${sqlValue(m.contactPerson)},email=${sqlValue(m.email)},phone=${sqlValue(m.phone)},city=${sqlValue(m.city)},lead_time_days=${sqlValue(m.leadTimeDays)},rating=${sqlValue(m.rating)},updated_at=${sqlValue(now)} WHERE id=${sqlValue(sid)}`);
    return jsonResponse(200,{ok:true});
  }
  if (supMatch && method==="DELETE") {
    if (!auth||!requirePermission(auth,"suppliers.delete")) return jsonResponse(403,{error:"Forbidden"});
    const sid=supMatch[1]; const linked=await getRow(`SELECT (SELECT COUNT(*) FROM inventory WHERE supplier_id=${sqlValue(sid)}) AS ic,(SELECT COUNT(*) FROM purchase_orders WHERE supplier_id=${sqlValue(sid)}) AS pc`);
    if (Number(linked.ic)>0||Number(linked.pc)>0) return jsonResponse(409,{error:"Supplier is linked to inventory or purchase orders"});
    await runSql(`DELETE FROM suppliers WHERE id=${sqlValue(sid)}`);
    return jsonResponse(200,{ok:true});
  }
  const supBankMatch = pathname.match(/^\/api\/suppliers\/([^/]+)\/bank-details$/);
  if (supBankMatch && method==="PUT") {
    if (!auth||!requirePermission(auth,"suppliers.bank.edit")) return jsonResponse(403,{error:"Forbidden"});
    const data=parseBody(); const now=new Date().toISOString();
    await runSql(`UPDATE suppliers SET bank_details=${sqlValue(JSON.stringify({accountName:String(data.accountName||"").trim(),bankName:String(data.bankName||"").trim(),accountNumber:String(data.accountNumber||"").trim(),ifscCode:String(data.ifscCode||"").trim(),branch:String(data.branch||"").trim(),notes:String(data.notes||"").trim(),updatedBy:auth.user.name,updatedAt:now}))},updated_at=${sqlValue(now)} WHERE id=${sqlValue(supBankMatch[1])}`);
    return jsonResponse(200,{ok:true});
  }

  // Inventory
  if (method==="POST" && pathname==="/api/inventory") {
    if (!auth||!requirePermission(auth,"inventory.create")) return jsonResponse(403,{error:"Forbidden"});
    const data=parseBody(); const now=new Date().toISOString(); const id=crypto.randomUUID();
    await runSql(`INSERT INTO inventory (id,name,sku,category,quantity,unit,min_stock,reorder_qty,unit_price,supplier_id,location,description,created_at,updated_at) VALUES (${sqlValue(id)},${sqlValue(String(data.name||"").trim())},${sqlValue(String(data.sku||"").trim())},${sqlValue(String(data.category||"General").trim())},${sqlValue(Number(data.quantity||0))},${sqlValue(String(data.unit||"pcs").trim())},${sqlValue(Number(data.minStock||0))},${sqlValue(Number(data.reorderQty||0))},${sqlValue(Number(data.unitPrice||0))},${sqlValue(String(data.supplierId||""))},${sqlValue(String(data.location||"").trim())},${sqlValue(String(data.description||"").trim())},${sqlValue(now)},${sqlValue(now)})`);
    return jsonResponse(201,{ok:true,id});
  }
  const invMatch = pathname.match(/^\/api\/inventory\/([^/]+)$/);
  if (invMatch && method==="PUT") {
    if (!auth||!requirePermission(auth,"inventory.edit")) return jsonResponse(403,{error:"Forbidden"});
    const data=parseBody(); const iid=invMatch[1]; const ex=await getRow(`SELECT * FROM inventory WHERE id=${sqlValue(iid)} LIMIT 1`);
    if (!ex) return jsonResponse(404,{error:"Item not found"});
    const now=new Date().toISOString();
    await runSql(`UPDATE inventory SET name=${sqlValue(data.name!==undefined?String(data.name||"").trim():ex.name)},sku=${sqlValue(data.sku!==undefined?String(data.sku||"").trim():ex.sku||"")},category=${sqlValue(data.category!==undefined?String(data.category||"General").trim():ex.category||"General")},unit=${sqlValue(data.unit!==undefined?String(data.unit||"pcs").trim():ex.unit||"pcs")},min_stock=${sqlValue(data.minStock!==undefined?Number(data.minStock):Number(ex.min_stock||0))},reorder_qty=${sqlValue(data.reorderQty!==undefined?Number(data.reorderQty):Number(ex.reorder_qty||0))},unit_price=${sqlValue(data.unitPrice!==undefined?Number(data.unitPrice):Number(ex.unit_price||0))},supplier_id=${sqlValue(data.supplierId!==undefined?String(data.supplierId||""):ex.supplier_id||"")},location=${sqlValue(data.location!==undefined?String(data.location||"").trim():ex.location||"")},description=${sqlValue(data.description!==undefined?String(data.description||"").trim():ex.description||"")},updated_at=${sqlValue(now)} WHERE id=${sqlValue(iid)}`);
    return jsonResponse(200,{ok:true});
  }
  if (invMatch && method==="DELETE") {
    if (!auth||!requirePermission(auth,"inventory.delete")) return jsonResponse(403,{error:"Forbidden"});
    const iid=invMatch[1]; await runSql(`DELETE FROM inventory WHERE id=${sqlValue(iid)}`);
    return jsonResponse(200,{ok:true});
  }
  if (method==="POST" && pathname==="/api/inventory/adjust") {
    if (!auth||!requirePermission(auth,"inventory.adjust")) return jsonResponse(403,{error:"Forbidden"});
    const data=parseBody(); const iid=String(data.itemId||""); const adjQty=Number(data.quantity||0); const mvType=String(data.type||"adjustment"); const notes=String(data.notes||"").trim();
    if (!iid) return jsonResponse(400,{error:"itemId required"});
    const item=await getRow(`SELECT id,quantity FROM inventory WHERE id=${sqlValue(iid)} LIMIT 1`);
    if (!item) return jsonResponse(404,{error:"Item not found"});
    const newQty=Number(item.quantity||0)+adjQty; if (newQty<0) return jsonResponse(400,{error:"Insufficient stock"});
    const now=new Date().toISOString(); const mvId=crypto.randomUUID();
    await runSql(`UPDATE inventory SET quantity=${sqlValue(newQty)},updated_at=${sqlValue(now)} WHERE id=${sqlValue(iid)}`);
    await runSql(`INSERT INTO inventory_movements (id,inventory_item_id,movement_type,quantity,notes,created_by,created_at) VALUES (${sqlValue(mvId)},${sqlValue(iid)},${sqlValue(mvType)},${sqlValue(adjQty)},${sqlValue(notes)},${sqlValue(auth.user.name)},${sqlValue(now)})`);
    return jsonResponse(200,{ok:true,newQuantity:newQty});
  }

  // Purchase Orders
  if (method==="POST" && pathname==="/api/purchase-orders") {
    if (!auth||!requirePermission(auth,"purchaseOrders.create")) return jsonResponse(403,{error:"Forbidden"});
    const data=parseBody(); const now=new Date().toISOString(); const id=crypto.randomUUID();
    const poNumber=await createPoNumber();
    const items=Array.isArray(data.items)?data.items:[];
    const totalAmount=items.reduce((s,it)=>s+Number(it.unitPrice||0)*Number(it.quantity||0),0);
    await runSql(`INSERT INTO purchase_orders (id,po_number,supplier_id,status,order_date,expected_delivery,total_amount,notes,created_by,created_at,updated_at) VALUES (${sqlValue(id)},${sqlValue(poNumber)},${sqlValue(String(data.supplierId||""))},${sqlValue("Draft")},${sqlValue(String(data.orderDate||now.slice(0,10)))},${sqlValue(String(data.expectedDelivery||""))},${sqlValue(totalAmount)},${sqlValue(String(data.notes||"").trim())},${sqlValue(auth.user.name)},${sqlValue(now)},${sqlValue(now)})`);
    for (const it of items) {
      await runSql(`INSERT INTO po_items (id,po_id,inventory_item_id,quantity,unit_price,received_qty,created_at) VALUES (${sqlValue(crypto.randomUUID())},${sqlValue(id)},${sqlValue(String(it.itemId||""))},${sqlValue(Number(it.quantity||0))},${sqlValue(Number(it.unitPrice||0))},0,${sqlValue(now)})`);
    }
    return jsonResponse(201,{ok:true,id,poNumber});
  }
  const poMatch = pathname.match(/^\/api\/purchase-orders\/([^/]+)$/);
  if (poMatch && method==="PUT") {
    if (!auth||!requirePermission(auth,"purchaseOrders.edit")) return jsonResponse(403,{error:"Forbidden"});
    const data=parseBody(); const pid=poMatch[1]; const ex=await getRow(`SELECT * FROM purchase_orders WHERE id=${sqlValue(pid)} LIMIT 1`);
    if (!ex) return jsonResponse(404,{error:"PO not found"});
    const now=new Date().toISOString();
    await runSql(`UPDATE purchase_orders SET supplier_id=${sqlValue(data.supplierId!==undefined?String(data.supplierId||""):ex.supplier_id||"")},status=${sqlValue(data.status!==undefined?String(data.status||"Draft"):ex.status||"Draft")},order_date=${sqlValue(data.orderDate!==undefined?String(data.orderDate||""):ex.order_date||"")},expected_delivery=${sqlValue(data.expectedDelivery!==undefined?String(data.expectedDelivery||""):ex.expected_delivery||"")},notes=${sqlValue(data.notes!==undefined?String(data.notes||"").trim():ex.notes||"")},updated_at=${sqlValue(now)} WHERE id=${sqlValue(pid)}`);
    return jsonResponse(200,{ok:true});
  }
  if (poMatch && method==="DELETE") {
    if (!auth||!requirePermission(auth,"purchaseOrders.delete")) return jsonResponse(403,{error:"Forbidden"});
    const pid=poMatch[1]; const ex=await getRow(`SELECT status FROM purchase_orders WHERE id=${sqlValue(pid)} LIMIT 1`);
    if (!ex) return jsonResponse(404,{error:"PO not found"});
    if (ex.status==="Received") return jsonResponse(409,{error:"Cannot delete received PO"});
    await runSql(`DELETE FROM po_items WHERE po_id=${sqlValue(pid)}`);
    await runSql(`DELETE FROM purchase_orders WHERE id=${sqlValue(pid)}`);
    return jsonResponse(200,{ok:true});
  }
  if (method==="POST" && pathname==="/api/purchase-orders/receive") {
    if (!auth||!requirePermission(auth,"purchaseOrders.receive")) return jsonResponse(403,{error:"Forbidden"});
    const data=parseBody(); const pid=String(data.poId||""); const receivedItems=Array.isArray(data.items)?data.items:[];
    if (!pid) return jsonResponse(400,{error:"poId required"});
    const po=await getRow(`SELECT * FROM purchase_orders WHERE id=${sqlValue(pid)} LIMIT 1`);
    if (!po) return jsonResponse(404,{error:"PO not found"});
    if (po.status==="Received") return jsonResponse(409,{error:"PO already received"});
    const now=new Date().toISOString(); const grnNumber=await createGrnNumber();
    for (const ri of receivedItems) {
      const poItem=await getRow(`SELECT * FROM po_items WHERE id=${sqlValue(String(ri.poItemId||""))} AND po_id=${sqlValue(pid)} LIMIT 1`);
      if (!poItem) continue;
      const qty=Number(ri.quantity||0); if (qty<=0) continue;
      const newRec=Number(poItem.received_qty||0)+qty;
      await runSql(`UPDATE po_items SET received_qty=${sqlValue(newRec)} WHERE id=${sqlValue(poItem.id)}`);
      if (poItem.inventory_item_id) {
        const inv=await getRow(`SELECT id,quantity FROM inventory WHERE id=${sqlValue(poItem.inventory_item_id)} LIMIT 1`);
        if (inv) {
          await runSql(`UPDATE inventory SET quantity=${sqlValue(Number(inv.quantity||0)+qty)},updated_at=${sqlValue(now)} WHERE id=${sqlValue(inv.id)}`);
          await runSql(`INSERT INTO inventory_movements (id,inventory_item_id,movement_type,quantity,notes,created_by,created_at) VALUES (${sqlValue(crypto.randomUUID())},${sqlValue(inv.id)},'grn',${sqlValue(qty)},${sqlValue("GRN: "+grnNumber)},${sqlValue(auth.user.name)},${sqlValue(now)})`);
        }
      }
    }
    await runSql(`UPDATE purchase_orders SET status='Received',grn_number=${sqlValue(grnNumber)},received_date=${sqlValue(now.slice(0,10))},received_by=${sqlValue(auth.user.name)},updated_at=${sqlValue(now)} WHERE id=${sqlValue(pid)}`);
    return jsonResponse(200,{ok:true,grnNumber});
  }

  // Delivery Challans
  if (method==="POST" && pathname==="/api/delivery-challans") {
    if (!auth||!requirePermission(auth,"logistics.manage")) return jsonResponse(403,{error:"Forbidden"});
    const data=parseBody(); const now=new Date().toISOString(); const id=crypto.randomUUID();
    const dcNumber=await createDcNumber();
    const items=Array.isArray(data.items)?data.items:[];
    await runSql(`INSERT INTO delivery_challans (id,dc_number,customer_id,project_id,delivery_date,vehicle_number,driver_name,notes,created_by,created_at,updated_at) VALUES (${sqlValue(id)},${sqlValue(dcNumber)},${sqlValue(String(data.customerId||""))},${sqlValue(String(data.projectId||""))},${sqlValue(String(data.deliveryDate||now.slice(0,10)))},${sqlValue(String(data.vehicleNumber||"").trim())},${sqlValue(String(data.driverName||"").trim())},${sqlValue(String(data.notes||"").trim())},${sqlValue(auth.user.name)},${sqlValue(now)},${sqlValue(now)})`);
    for (const it of items) {
      await runSql(`INSERT INTO dc_items (id,dc_id,inventory_item_id,description,quantity,unit,created_at) VALUES (${sqlValue(crypto.randomUUID())},${sqlValue(id)},${sqlValue(String(it.itemId||""))},${sqlValue(String(it.description||"").trim())},${sqlValue(Number(it.quantity||0))},${sqlValue(String(it.unit||"pcs").trim())},${sqlValue(now)})`);
    }
    return jsonResponse(201,{ok:true,id,dcNumber});
  }

  // Packaging Documents
  if (method==="POST" && pathname==="/api/packaging-documents") {
    if (!auth||!requirePermission(auth,"logistics.manage")) return jsonResponse(403,{error:"Forbidden"});
    const data=parseBody(); const now=new Date().toISOString(); const id=crypto.randomUUID();
    const pkgNumber=await createPkgNumber();
    const items=Array.isArray(data.items)?data.items:[];
    await runSql(`INSERT INTO packaging_documents (id,pkg_number,customer_id,project_id,packaging_date,notes,created_by,created_at,updated_at) VALUES (${sqlValue(id)},${sqlValue(pkgNumber)},${sqlValue(String(data.customerId||""))},${sqlValue(String(data.projectId||""))},${sqlValue(String(data.packagingDate||now.slice(0,10)))},${sqlValue(String(data.notes||"").trim())},${sqlValue(auth.user.name)},${sqlValue(now)},${sqlValue(now)})`);
    for (const it of items) {
      await runSql(`INSERT INTO pkg_items (id,pkg_id,description,quantity,unit,weight_kg,dimensions,created_at) VALUES (${sqlValue(crypto.randomUUID())},${sqlValue(id)},${sqlValue(String(it.description||"").trim())},${sqlValue(Number(it.quantity||0))},${sqlValue(String(it.unit||"pcs").trim())},${sqlValue(Number(it.weightKg||0))},${sqlValue(String(it.dimensions||"").trim())},${sqlValue(now)})`);
    }
    return jsonResponse(201,{ok:true,id,pkgNumber});
  }

  // Profile
  if (method==="PUT" && pathname==="/api/profile") {
    if (!auth) return jsonResponse(401,{error:"Unauthorized"});
    const data=parseBody(); const now=new Date().toISOString(); const uid=auth.user.id;
    const ex=await getRow(`SELECT id,name,email FROM users WHERE id=${sqlValue(uid)} LIMIT 1`);
    if (!ex) return jsonResponse(404,{error:"User not found"});
    const newName=data.name!==undefined?String(data.name||"").trim():ex.name;
    const newEmail=data.email!==undefined?String(data.email||"").trim():ex.email;
    if (newEmail!==ex.email) {
      const dup=await getRow(`SELECT id FROM users WHERE lower(email)=lower(${sqlValue(newEmail)}) AND id!=${sqlValue(uid)} LIMIT 1`);
      if (dup) return jsonResponse(409,{error:"Email already in use"});
    }
    if (data.newPassword) {
      const newSalt=crypto.randomBytes(16).toString("hex");
      const hashedNew=hashPassword(String(data.newPassword),newSalt);
      await runSql(`UPDATE users SET name=${sqlValue(newName)},email=${sqlValue(newEmail)},salt=${sqlValue(newSalt)},password_hash=${sqlValue(hashedNew)} WHERE id=${sqlValue(uid)}`);
    } else {
      await runSql(`UPDATE users SET name=${sqlValue(newName)},email=${sqlValue(newEmail)} WHERE id=${sqlValue(uid)}`);
    }
    return jsonResponse(200,{ok:true,user:{id:uid,name:newName,email:newEmail,role:auth.user.role}});
  }

  // Users management
  if (method==="POST" && pathname==="/api/users") {
    if (!auth||!requirePermission(auth,"users.manage")) return jsonResponse(403,{error:"Forbidden"});
    const data=parseBody(); const email=String(data.email||"").trim(); const name=String(data.name||"").trim(); const role=String(data.role||"viewer").trim(); const password=String(data.password||"").trim();
    if (!email||!name||!password) return jsonResponse(400,{error:"name, email, password required"});
    const dup=await getRow(`SELECT id FROM users WHERE lower(email)=lower(${sqlValue(email)}) LIMIT 1`);
    if (dup) return jsonResponse(409,{error:"Email already exists"});
    const u=createUser(name,email,role,password);
    await runSql(`INSERT INTO users (id,name,email,role,customer_id,salt,password_hash) VALUES (${sqlValue(u.id)},${sqlValue(u.name)},${sqlValue(u.email)},${sqlValue(u.role)},NULL,${sqlValue(u.salt)},${sqlValue(u.passwordHash)})`);
    return jsonResponse(201,{ok:true,id:u.id});
  }
  const userMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch && method==="PUT") {
    if (!auth||!requirePermission(auth,"users.manage")) return jsonResponse(403,{error:"Forbidden"});
    const data=parseBody(); const uid=userMatch[1]; const ex=await getRow(`SELECT id,name,email,role FROM users WHERE id=${sqlValue(uid)} LIMIT 1`);
    if (!ex) return jsonResponse(404,{error:"User not found"});
    const now=new Date().toISOString();
    const newName=data.name!==undefined?String(data.name||"").trim():ex.name;
    const newEmail=data.email!==undefined?String(data.email||"").trim():ex.email;
    const newRole=data.role!==undefined?String(data.role||ex.role).trim():ex.role;
    if (newEmail!==ex.email) {
      const dup=await getRow(`SELECT id FROM users WHERE lower(email)=lower(${sqlValue(newEmail)}) AND id!=${sqlValue(uid)} LIMIT 1`);
      if (dup) return jsonResponse(409,{error:"Email already in use"});
    }
    if (data.password) {
      const uSalt=crypto.randomBytes(16).toString("hex");
      const uHash=hashPassword(String(data.password),uSalt);
      await runSql(`UPDATE users SET name=${sqlValue(newName)},email=${sqlValue(newEmail)},role=${sqlValue(newRole)},salt=${sqlValue(uSalt)},password_hash=${sqlValue(uHash)} WHERE id=${sqlValue(uid)}`);
    } else {
      await runSql(`UPDATE users SET name=${sqlValue(newName)},email=${sqlValue(newEmail)},role=${sqlValue(newRole)} WHERE id=${sqlValue(uid)}`);
    }
    return jsonResponse(200,{ok:true});
  }
  if (userMatch && method==="DELETE") {
    if (!auth||!requirePermission(auth,"users.manage")) return jsonResponse(403,{error:"Forbidden"});
    const uid=userMatch[1];
    if (auth.user.id===uid) return jsonResponse(409,{error:"Cannot delete your own account"});
    await runSql(`DELETE FROM users WHERE id=${sqlValue(uid)}`);
    return jsonResponse(200,{ok:true});
  }

  // Reports
  if (method==="GET" && pathname==="/api/reports") {
    if (!auth||!requirePermission(auth,"reports.view")) return jsonResponse(403,{error:"Forbidden"});
    return jsonResponse(200,{reports:await buildReports()});
  }

  // Quote requests remaining (customers)
  if (method==="GET" && pathname==="/api/customers") {
    if (!auth||!requirePermission(auth,"projects.view")) return jsonResponse(403,{error:"Forbidden"});
    const query=String(qs.get("query")||""); const limit=Number(qs.get("limit")||50); const offset=Number(qs.get("offset")||0);
    return jsonResponse(200,{customers:await getCustomers({query,limit,offset})});
  }
  const custMatch = pathname.match(/^\/api\/customers\/([^/]+)$/);
  if (custMatch && method==="GET") {
    if (!auth||!requirePermission(auth,"projects.view")) return jsonResponse(403,{error:"Forbidden"});
    const c=await getCustomerById(custMatch[1]);
    if (!c) return jsonResponse(404,{error:"Customer not found"});
    return jsonResponse(200,{customer:c});
  }

  // Document generation routes
  if (method==="GET" && pathname==="/api/documents/inventory-report") {
    if (!auth||!requirePermission(auth,"reports.view")) return jsonResponse(403,{error:"Forbidden"});
    const inv=await getInventory({query:"",category:"All",stockStatus:"All",limit:1000,offset:0});
    const html=generateInventoryReportDocument(inv.items);
    return htmlResponse(html,"inventory-report.html");
  }
  const docPoMatch = pathname.match(/^\/api\/documents\/purchase-order\/([^/]+)$/);
  if (docPoMatch && method==="GET") {
    if (!auth||!requirePermission(auth,"purchaseOrders.view")) return jsonResponse(403,{error:"Forbidden"});
    const po=await getRow(`SELECT po.*,s.name AS supplierName,s.email AS supplierEmail,s.phone AS supplierPhone,s.city AS supplierCity,s.contact_person AS supplierContact FROM purchase_orders po LEFT JOIN suppliers s ON s.id=po.supplier_id WHERE po.id=${sqlValue(docPoMatch[1])} LIMIT 1`);
    if (!po) return jsonResponse(404,{error:"PO not found"});
    const items=await getRows(`SELECT poi.*,inv.name AS itemName,inv.unit FROM po_items poi LEFT JOIN inventory inv ON inv.id=poi.inventory_item_id WHERE poi.po_id=${sqlValue(po.id)}`);
    const html=generatePurchaseOrderDocument(po,items);
    return htmlResponse(html,`po-${po.po_number}.html`);
  }
  const docInvMatch = pathname.match(/^\/api\/documents\/invoice\/([^/]+)$/);
  if (docInvMatch && method==="GET") {
    if (!auth||!requirePermission(auth,"purchaseOrders.view")) return jsonResponse(403,{error:"Forbidden"});
    const po=await getRow(`SELECT po.*,s.name AS supplierName,s.email AS supplierEmail,s.phone AS supplierPhone,s.city AS supplierCity FROM purchase_orders po LEFT JOIN suppliers s ON s.id=po.supplier_id WHERE po.id=${sqlValue(docInvMatch[1])} LIMIT 1`);
    if (!po) return jsonResponse(404,{error:"PO not found"});
    const items=await getRows(`SELECT poi.*,inv.name AS itemName,inv.unit FROM po_items poi LEFT JOIN inventory inv ON inv.id=poi.inventory_item_id WHERE poi.po_id=${sqlValue(po.id)}`);
    const html=generateInvoiceDocument(po,items);
    return htmlResponse(html,`invoice-${po.po_number}.html`);
  }
  const docGrnMatch = pathname.match(/^\/api\/documents\/grn\/([^/]+)$/);
  if (docGrnMatch && method==="GET") {
    if (!auth||!requirePermission(auth,"purchaseOrders.view")) return jsonResponse(403,{error:"Forbidden"});
    const po=await getRow(`SELECT po.*,s.name AS supplierName,s.email AS supplierEmail,s.phone AS supplierPhone,s.city AS supplierCity FROM purchase_orders po LEFT JOIN suppliers s ON s.id=po.supplier_id WHERE po.id=${sqlValue(docGrnMatch[1])} LIMIT 1`);
    if (!po) return jsonResponse(404,{error:"PO not found"});
    const items=await getRows(`SELECT poi.*,inv.name AS itemName,inv.unit FROM po_items poi LEFT JOIN inventory inv ON inv.id=poi.inventory_item_id WHERE poi.po_id=${sqlValue(po.id)}`);
    const html=generateGrnDocument(po,items);
    return htmlResponse(html,`grn-${po.grn_number||po.po_number}.html`);
  }
  const docDcMatch = pathname.match(/^\/api\/documents\/delivery-challan\/([^/]+)$/);
  if (docDcMatch && method==="GET") {
    if (!auth||!requirePermission(auth,"logistics.manage")) return jsonResponse(403,{error:"Forbidden"});
    const dc=await getRow(`SELECT dc.*,c.name AS customerName,c.email AS customerEmail,c.phone AS customerPhone,p.name AS projectName FROM delivery_challans dc LEFT JOIN customers c ON c.id=dc.customer_id LEFT JOIN projects p ON p.id=dc.project_id WHERE dc.id=${sqlValue(docDcMatch[1])} LIMIT 1`);
    if (!dc) return jsonResponse(404,{error:"DC not found"});
    const items=await getRows(`SELECT dci.*,inv.name AS itemName FROM dc_items dci LEFT JOIN inventory inv ON inv.id=dci.inventory_item_id WHERE dci.dc_id=${sqlValue(dc.id)}`);
    const html=generateDeliveryChallanDocument(dc,items);
    return htmlResponse(html,`dc-${dc.dc_number}.html`);
  }
  const docPkgMatch = pathname.match(/^\/api\/documents\/packaging-document\/([^/]+)$/);
  if (docPkgMatch && method==="GET") {
    if (!auth||!requirePermission(auth,"logistics.manage")) return jsonResponse(403,{error:"Forbidden"});
    const pkg=await getRow(`SELECT pd.*,c.name AS customerName,p.name AS projectName FROM packaging_documents pd LEFT JOIN customers c ON c.id=pd.customer_id LEFT JOIN projects p ON p.id=pd.project_id WHERE pd.id=${sqlValue(docPkgMatch[1])} LIMIT 1`);
    if (!pkg) return jsonResponse(404,{error:"Package doc not found"});
    const items=await getRows(`SELECT * FROM pkg_items WHERE pkg_id=${sqlValue(pkg.id)}`);
    const html=generatePackagingDocument(pkg,items);
    return htmlResponse(html,`pkg-${pkg.pkg_number}.html`);
  }
  const docQeMatch = pathname.match(/^\/api\/documents\/quote-estimate\/([^/]+)$/);
  if (docQeMatch && method==="GET") {
    if (!auth||!requirePermission(auth,"quotes.view")) return jsonResponse(403,{error:"Forbidden"});
    const qr=await getQuoteRequestById(docQeMatch[1]);
    if (!qr) return jsonResponse(404,{error:"Quote not found"});
    const pc=await getPricingCache(); const pricing=buildQuotePricing(qr,pc);
    const html=generateQuoteEstimateDocument(qr,pricing);
    return htmlResponse(html,`quote-estimate-${qr.referenceNumber||qr.id}.html`);
  }
  const docDfmMatch = pathname.match(/^\/api\/documents\/quote-dfm\/([^/]+)$/);
  if (docDfmMatch && method==="GET") {
    if (!auth||!requirePermission(auth,"quotes.view")) return jsonResponse(403,{error:"Forbidden"});
    const qr=await getQuoteRequestById(docDfmMatch[1]);
    if (!qr) return jsonResponse(404,{error:"Quote not found"});
    const dfm=buildQuoteDfmAnalysis(qr);
    const html=generateQuoteDfmDocument(qr,dfm);
    return htmlResponse(html,`quote-dfm-${qr.referenceNumber||qr.id}.html`);
  }

  // Project file downloads (base64 stored in DB)
  const pfMatch = pathname.match(/^\/api\/project-files\/([^/]+)$/);
  if (pfMatch && method==="GET") {
    if (!auth) return jsonResponse(401,{error:"Unauthorized"});
    const doc=await getRow(`SELECT file_name,file_type,file_content FROM project_documents WHERE id=${sqlValue(pfMatch[1])} LIMIT 1`);
    if (!doc) return jsonResponse(404,{error:"File not found"});
    const buf=doc.file_content?Buffer.from(String(doc.file_content),"base64"):Buffer.alloc(0);
    return {statusCode:200,headers:{"Content-Type":String(doc.file_type||"application/octet-stream"),"Content-Disposition":`attachment; filename="${String(doc.file_name||"file")}"`,"Access-Control-Allow-Origin":"*"},body:buf.toString("base64"),isBase64Encoded:true};
  }

  // Quote file downloads
  const qfMatch = pathname.match(/^\/api\/quote-files\/([^/]+)$/);
  if (qfMatch && method==="GET") {
    if (!auth) return jsonResponse(401,{error:"Unauthorized"});
    const qr=await getRow(`SELECT reference_number,file_name,file_type,file_content FROM quote_requests WHERE id=${sqlValue(qfMatch[1])} LIMIT 1`);
    if (!qr) return jsonResponse(404,{error:"File not found"});
    const buf=qr.file_content?Buffer.from(String(qr.file_content),"base64"):Buffer.alloc(0);
    return {statusCode:200,headers:{"Content-Type":String(qr.file_type||"application/octet-stream"),"Content-Disposition":`attachment; filename="${String(qr.file_name||"file")}"`,"Access-Control-Allow-Origin":"*"},body:buf.toString("base64"),isBase64Encoded:true};
  }

  return jsonResponse(404,{error:"Not found"});
}

// ── VERCEL HANDLER ADAPTER ────────────────────────────────────────────────────
// Reads raw body (bypasses Vercel's built-in JSON parser so file uploads work),
// constructs a Netlify-compatible event object, calls routeRequest(), then
// writes the response via Node's res object.

function collectRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function vercelHandler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    return res.status(204).end();
  }

  // Collect raw body (needed for JSON + base64 file uploads)
  let rawBody = null;
  try {
    const buf = await collectRawBody(req);
    rawBody = buf.length > 0 ? buf.toString("utf8") : null;
  } catch {
    rawBody = null;
  }

  // Parse URL — req.url is the ORIGINAL client-facing path (Vercel preserves it)
  const baseUrl = "http://localhost";
  const parsedUrl = new URL(req.url, baseUrl);
  const pathname = parsedUrl.pathname;
  const qsObj = {};
  parsedUrl.searchParams.forEach((v, k) => { qsObj[k] = v; });

  // Build a Netlify-compatible event object so routeRequest() needs zero changes
  const event = {
    httpMethod: req.method,
    path: pathname,
    queryStringParameters: qsObj,
    headers: req.headers,
    body: rawBody,
    isBase64Encoded: false,
  };

  let result;
  try {
    result = await routeRequest(event);
  } catch (err) {
    result = {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }

  // Write response headers
  const headers = result.headers || {};
  for (const [k, v] of Object.entries(headers)) {
    res.setHeader(k, String(v));
  }

  res.status(result.statusCode || 200);

  if (result.isBase64Encoded) {
    // Binary response (file download)
    res.send(Buffer.from(result.body || "", "base64"));
  } else {
    res.end(result.body || "");
  }
}

// Disable Vercel's body parser — we handle raw body ourselves
vercelHandler.config = { api: { bodyParser: false, responseLimit: "10mb" } };

module.exports = vercelHandler;
