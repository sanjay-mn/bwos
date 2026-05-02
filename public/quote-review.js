const params = new URLSearchParams(window.location.search);
const quoteId = params.get("id") || "";

const reviewTitle = document.querySelector("#reviewTitle");
const reviewMeta = document.querySelector("#reviewMeta");
const reviewFileInlineLink = document.querySelector("#reviewFileInlineLink");
const reviewDfmButton = document.querySelector("#reviewDfmButton");
const reviewCheckoutButton = document.querySelector("#reviewCheckoutButton");
const reviewEstimateButton = document.querySelector("#reviewEstimateButton");
const reviewBackButton = document.querySelector("#reviewBackButton");
const reviewFileViewer = document.querySelector("#reviewFileViewer");
const pricingSummary = document.querySelector("#pricingSummary");
const pricingBreakdown = document.querySelector("#pricingBreakdown");
const dfmAnalysisPanel = document.querySelector("#dfmAnalysisPanel");
const quoteQuickControls = document.querySelector("#quoteQuickControls");
const quoteQuickProcess = document.querySelector("#quoteQuickProcess");
const quoteQuickDesignUnits = document.querySelector("#quoteQuickDesignUnits");
const quoteQuickOptionFields = document.querySelector("#quoteQuickOptionFields");
const quoteQuickControlsStatus = document.querySelector("#quoteQuickControlsStatus");
const quoteReviewDetailForm = document.querySelector("#quoteReviewDetailForm");
const quoteReviewDetailStatus = document.querySelector("#quoteReviewDetailStatus");

let currentQuote = null;
let quoteConfig = null;
let stepViewerCleanup = null;
let stepViewerLibrariesPromise = null;
let occtInstancePromise = null;
let autoSaveTimer = null;
let saveRequestId = 0;

if (reviewDfmButton) reviewDfmButton.style.display = "none";

function estimateDocumentUrl(id) {
  return `/api/documents/quote-estimate/${encodeURIComponent(id)}`;
}

function customerEstimateUrl(id) {
  return `/customer-estimate.html?id=${encodeURIComponent(id)}`;
}

function checkoutUrl(id) {
  return `/quote-checkout.html?id=${encodeURIComponent(id)}`;
}

function dfmAnalysisUrl(id) {
  return `/quote-dfm.html?id=${encodeURIComponent(id)}`;
}

function dfmDocumentUrl(id) {
  return `/api/documents/quote-dfm/${encodeURIComponent(id)}`;
}

async function api(path, options = {}) {
  const token = localStorage.getItem("bw_token") || "";
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : {};
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(value, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function optionValue(option) {
  return typeof option === "string" ? option : option?.value;
}

function optionLabel(option) {
  return typeof option === "string" ? option : option?.label || option?.value;
}

function fillSimpleSelect(select, options, selectedValue = "") {
  if (!select) return;
  select.innerHTML = "";
  (options || []).forEach((optionEntry) => {
    const option = document.createElement("option");
    option.value = optionValue(optionEntry);
    option.textContent = optionLabel(optionEntry);
    if (option.value === selectedValue) option.selected = true;
    select.appendChild(option);
  });
}

function getProcessConfig(process) {
  return quoteConfig?.processes?.[process] || null;
}

function getMaterialFamilyConfig(process, familyValue) {
  return (getProcessConfig(process)?.materialFamilies || []).find((family) => family.value === familyValue) || null;
}

function buildMaterialLabel(materialFamily, materialGrade) {
  return [String(materialFamily || "").trim(), String(materialGrade || "").trim()].filter(Boolean).join(" - ");
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

function calculatePricing(baseQuote, overrides = {}) {
  const process = String(overrides.process || baseQuote.process || "CNC Machining");
  const material = String(overrides.material || baseQuote.material || "");
  const finish = String(overrides.finish || baseQuote.finish || "");
  const quantity = Math.max(1, Number(overrides.quantity || baseQuote.quantity || 1));
  const fileSize = Math.max(1, Number(baseQuote.fileSize || 0));
  const sizeFactor = Math.max(1, fileSize / 180000);

  const processBase = {
    "CNC Machining": 3200,
    "Sheet Metal": 1900,
    "Injection Molding": 6800,
    "3D Printing": 2400,
  }[process] || 2500;

  const setupHours = overrides.setupHours !== undefined ? Number(overrides.setupHours || 0) : process === "Injection Molding" ? 10 : process === "3D Printing" ? 1.5 : process === "Sheet Metal" ? 2.5 : 4;
  const machiningHours = overrides.machiningHours !== undefined ? Number(overrides.machiningHours || 0) : Math.max(0.75, sizeFactor * (process === "Sheet Metal" ? 0.7 : process === "Injection Molding" ? 1.4 : process === "3D Printing" ? 0.85 : 1.1));
  const hourlyRate = overrides.hourlyRate !== undefined ? Number(overrides.hourlyRate || 0) : process === "Injection Molding" ? 1850 : process === "3D Printing" ? 1100 : process === "Sheet Metal" ? 950 : 1250;
  const stockMultiplier = overrides.stockMultiplier !== undefined ? Number(overrides.stockMultiplier || 0) : 0.22;
  const toolingCost = overrides.toolingCost !== undefined ? Number(overrides.toolingCost || 0) : process === "Injection Molding" ? Math.round(processBase * 1.8) : process === "3D Printing" ? Math.round(processBase * 0.05) : Math.round(processBase * 0.18);
  const inspectionCost = overrides.inspectionCost !== undefined ? Number(overrides.inspectionCost || 0) : Math.round(processBase * 0.08);
  const shippingCost = overrides.shippingCost !== undefined ? Number(overrides.shippingCost || 0) : 250;
  const overheadPercent = overrides.overheadPercent !== undefined ? Number(overrides.overheadPercent || 0) : 12;
  const marginPercent = overrides.marginPercent !== undefined ? Number(overrides.marginPercent || 0) : 18;
  const leadDays = overrides.leadDays !== undefined ? Number(overrides.leadDays || 0) : (process === "Injection Molding" ? 18 : process === "3D Printing" ? 4 : process === "Sheet Metal" ? 6 : 9) + Math.min(10, Math.round(sizeFactor));

  const materialCost = Math.round(processBase * materialFactor(material) * stockMultiplier);
  const setupCost = Math.round(setupHours * hourlyRate);
  const runtimeCostPerPiece = Math.round(machiningHours * hourlyRate * finishFactor(finish));
  const runtimeTotal = process === "Injection Molding" ? Math.round(runtimeCostPerPiece * Math.max(1, quantity * 0.22)) : Math.round(runtimeCostPerPiece * quantity);
  const directSubtotal = materialCost + setupCost + runtimeTotal + toolingCost + inspectionCost + shippingCost;
  const overheadValue = Math.round(directSubtotal * (overheadPercent / 100));
  const marginValue = Math.round((directSubtotal + overheadValue) * (marginPercent / 100));
  const total = directSubtotal + overheadValue + marginValue;

  return {
    currency: "INR",
    process,
    material,
    finish,
    quantity,
    leadDays,
    total,
    low: Math.max(500, Math.round(total * 0.92 / 50) * 50),
    high: Math.max(750, Math.round(total * 1.1 / 50) * 50),
    settings: {
      process,
      material,
      finish,
      quantity,
      leadDays,
      setupHours,
      machiningHours,
      hourlyRate,
      stockMultiplier,
      toolingCost,
      inspectionCost,
      shippingCost,
      overheadPercent,
      marginPercent,
    },
    breakdown: [
      { label: "Material / stock", value: materialCost },
      { label: "Setup", value: setupCost },
      { label: process === "Injection Molding" ? "Cycle / production" : process === "3D Printing" ? "Printing / post-processing" : "Machining / fabrication", value: runtimeTotal },
      { label: "Tooling", value: toolingCost },
      { label: "Inspection / QA", value: inspectionCost },
      { label: "Packing / shipping", value: shippingCost },
      { label: `Overhead (${overheadPercent}%)`, value: overheadValue },
      { label: `Margin (${marginPercent}%)`, value: marginValue },
    ],
  };
}

function readFormOverrides() {
  const formData = new FormData(quoteReviewDetailForm);
  return {
    process: String(formData.get("process") || ""),
    quantity: Number(formData.get("quantity") || 1),
    material: String(formData.get("material") || ""),
    finish: String(formData.get("finish") || ""),
    leadDays: Number(formData.get("leadDays") || 1),
    setupHours: Number(formData.get("setupHours") || 0),
    machiningHours: Number(formData.get("machiningHours") || 0),
    hourlyRate: Number(formData.get("hourlyRate") || 0),
    stockMultiplier: Number(formData.get("stockMultiplier") || 0),
    toolingCost: Number(formData.get("toolingCost") || 0),
    inspectionCost: Number(formData.get("inspectionCost") || 0),
    shippingCost: Number(formData.get("shippingCost") || 0),
    overheadPercent: Number(formData.get("overheadPercent") || 0),
    marginPercent: Number(formData.get("marginPercent") || 0),
  };
}

function getQuickControlSelections() {
  const process = quoteQuickProcess?.value || currentQuote?.process || "CNC Machining";
  const selections = {};
  quoteQuickOptionFields?.querySelectorAll("[data-quote-option]").forEach((field) => {
    selections[field.name] = field.value;
  });
  const family = selections.materialFamily || currentQuote?.materialFamily || getProcessConfig(process)?.materialFamilies?.[0]?.value || "";
  const familyConfig = getMaterialFamilyConfig(process, family);
  return {
    ...selections,
    materialFamily: family,
    materialGrade: selections.materialGrade || currentQuote?.materialGrade || familyConfig?.grades?.[0] || "",
  };
}

function readQuickControlOverrides() {
  const formData = new FormData(quoteQuickControls);
  const optionSelections = getQuickControlSelections();
  const material = buildMaterialLabel(optionSelections.materialFamily, optionSelections.materialGrade);
  return {
    process: String(formData.get("process") || ""),
    quantity: Number(formData.get("quantity") || 1),
    designUnits: String(formData.get("designUnits") || currentQuote?.designUnits || "mm"),
    material,
    materialFamily: optionSelections.materialFamily,
    materialGrade: optionSelections.materialGrade,
    finish: String(optionSelections.surfaceFinish || ""),
    optionSelections,
  };
}

function setStatusText(element, message, tone = "default") {
  if (!element) return;
  element.textContent = message;
  element.style.color = tone === "error" ? "var(--danger)" : tone === "success" ? "var(--success)" : "";
}

function renderDfmAnalysis(quote) {
  if (!dfmAnalysisPanel) return;
  const dfm = quote?.dfm || null;
  if (!dfm) {
    dfmAnalysisPanel.innerHTML = "";
    if (reviewDfmButton) reviewDfmButton.style.display = "none";
    return;
  }

  if (reviewDfmButton) reviewDfmButton.style.display = "";
  const checklist = (dfm.checklist || [])
    .map(
      (item) => `
        <div class="list-item">
          <div class="list-title-row">
            <h3>${escapeHtml(item.title)}</h3>
            <span class="status-badge ${item.status === "pass" ? "good" : item.status === "hold" ? "low" : "pending"}">${escapeHtml(item.status)}</span>
          </div>
          <p>${escapeHtml(item.detail)}</p>
          ${item.recommendation ? `<p class="notes-line"><strong>Recommended:</strong> ${escapeHtml(item.recommendation)}</p>` : ""}
        </div>`
    )
    .join("");

  dfmAnalysisPanel.innerHTML = `
    <div class="list-item">
      <div class="list-title-row">
        <h3>${escapeHtml(dfm.title || "DFM Analysis")}</h3>
        <span class="status-badge ${dfm.status === "hold" ? "low" : dfm.status === "pass" ? "good" : "pending"}">${escapeHtml(dfm.status || "review")}</span>
      </div>
      <p>${escapeHtml(dfm.summary || "")}</p>
      ${dfm.requiresEngineeringContact ? '<p class="notes-line"><strong>Engineering note:</strong> Our engineering team will contact you for further steps before final mold or fabrication release.</p>' : ""}
      <div class="action-strip">
        <a class="table-button" href="${dfmAnalysisUrl(quote.id)}" target="_blank" rel="noreferrer">Open DFM Analysis</a>
        <a class="table-button secondary" href="${dfmDocumentUrl(quote.id)}" target="_blank" rel="noreferrer">Download DFM Report</a>
      </div>
    </div>
    ${checklist}
  `;
}

function copySharedFields(sourceForm, targetForm) {
  if (!sourceForm || !targetForm) return;
  ["process", "quantity"].forEach((fieldName) => {
    if (sourceForm.elements[fieldName] && targetForm.elements[fieldName]) {
      targetForm.elements[fieldName].value = sourceForm.elements[fieldName].value;
    }
  });
}

function renderQuickControlOptionFields(quote) {
  if (!quoteQuickOptionFields || !quoteConfig) return;
  const process = quoteQuickProcess?.value || quote?.process || "CNC Machining";
  const processConfig = getProcessConfig(process);
  if (!processConfig) return;
  const existingSelections = quote?.optionSelections || quote?.reviewData?.optionSelections || {};

  quoteQuickOptionFields.innerHTML = "";
  (processConfig.fields || []).forEach((field) => {
    const label = document.createElement("label");
    label.innerHTML = `<span>${escapeHtml(field.label)}</span>`;
    const select = document.createElement("select");
    select.name = field.key;
    select.dataset.quoteOption = field.key;

    if (field.type === "material-family") {
      fillSimpleSelect(select, processConfig.materialFamilies.map((family) => ({ value: family.value, label: family.value })), existingSelections.materialFamily || quote?.materialFamily || processConfig.materialFamilies?.[0]?.value || "");
    } else if (field.type === "material-grade") {
      const familyValue = existingSelections.materialFamily || quote?.materialFamily || processConfig.materialFamilies?.[0]?.value || "";
      const familyConfig = getMaterialFamilyConfig(process, familyValue);
      fillSimpleSelect(select, (familyConfig?.grades || []).map((grade) => ({ value: grade, label: grade })), existingSelections.materialGrade || quote?.materialGrade || familyConfig?.grades?.[0] || "");
    } else {
      fillSimpleSelect(select, field.options || [], existingSelections[field.key] || "");
    }

    label.appendChild(select);
    quoteQuickOptionFields.appendChild(label);
  });
}

function renderPricing(pricing, status) {
  pricingSummary.innerHTML = `
    <div class="list-item">
      <div class="list-title-row">
        <h3>Total</h3>
        <span class="status-badge good">${escapeHtml(formatCurrency(pricing.total, pricing.currency))}</span>
      </div>
      <p>${escapeHtml(pricing.process)} • ${escapeHtml(pricing.material || "Material TBD")} • Qty ${escapeHtml(pricing.quantity)}</p>
      <div class="list-meta">
        <span class="pill">Estimate ${escapeHtml(formatCurrency(pricing.low, pricing.currency))} - ${escapeHtml(formatCurrency(pricing.high, pricing.currency))}</span>
        <span class="pill">${escapeHtml(String(pricing.leadDays))} day lead</span>
        <span class="pill">${escapeHtml(status || "New")}</span>
      </div>
    </div>
  `;

  pricingBreakdown.innerHTML = pricing.breakdown
    .map(
      (item) => `
        <div class="list-item">
          <div class="list-title-row">
            <h3>${escapeHtml(item.label)}</h3>
            <span class="status-badge pending">${escapeHtml(formatCurrency(item.value, pricing.currency))}</span>
          </div>
        </div>
      `,
    )
    .join("");
}

function syncPricingFromForm() {
  if (!currentQuote) return;
  const pricing = calculatePricing(currentQuote, readFormOverrides());
  renderPricing(pricing, quoteReviewDetailForm.elements.status.value);
  setStatusText(quoteReviewDetailStatus, "Pricing updated locally. Changes are auto-saving.");
  setStatusText(quoteQuickControlsStatus, "Pricing updated. Saving quote...");
}

function syncPricingFromQuickControls() {
  if (!currentQuote) return;
  copySharedFields(quoteQuickControls, quoteReviewDetailForm);
  const quickOverrides = readQuickControlOverrides();
  quoteReviewDetailForm.elements.material.value = quickOverrides.material;
  quoteReviewDetailForm.elements.finish.value = quickOverrides.finish;
  syncPricingFromForm();
}

async function saveQuoteReview({ silent = false } = {}) {
  if (!currentQuote) return;
  const requestId = ++saveRequestId;
  const formData = new FormData(quoteReviewDetailForm);
  if (!silent) {
    setStatusText(quoteReviewDetailStatus, "Saving quote review...");
    setStatusText(quoteQuickControlsStatus, "Saving quote review...");
  }
  try {
    const quickOverrides = readQuickControlOverrides();
    const response = await api(`/api/quote-requests/${quoteId}`, {
      method: "PUT",
      body: JSON.stringify({
        process: String(formData.get("process") || ""),
        quantity: Number(formData.get("quantity") || 1),
        material: quickOverrides.material,
        materialFamily: quickOverrides.materialFamily,
        materialGrade: quickOverrides.materialGrade,
        finish: quickOverrides.finish,
        designUnits: quickOverrides.designUnits,
        optionSelections: quickOverrides.optionSelections,
        status: String(formData.get("status") || "New"),
        adminNotes: String(formData.get("adminNotes") || ""),
        reviewData: readFormOverrides(),
      }),
    });
    if (requestId !== saveRequestId) return;
    currentQuote = response.quoteRequest;
    renderPricing(currentQuote.pricing, currentQuote.status);
    fillForm(currentQuote);
    fillQuickControls(currentQuote);
    setStatusText(quoteReviewDetailStatus, "Quote review saved automatically.", "success");
    setStatusText(quoteQuickControlsStatus, "Quote updated automatically.", "success");
    if (!silent) {
      window.open(customerEstimateUrl(currentQuote.id), "_blank", "noopener,noreferrer");
    }
  } catch (error) {
    if (requestId !== saveRequestId) return;
    setStatusText(quoteReviewDetailStatus, error.message, "error");
    setStatusText(quoteQuickControlsStatus, error.message, "error");
  }
}

function queueAutoSave() {
  window.clearTimeout(autoSaveTimer);
  autoSaveTimer = window.setTimeout(() => {
    saveQuoteReview({ silent: true });
  }, 450);
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-external-src="${src}"]`);
    if (existing?.dataset.loaded === "true") return resolve();
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.externalSrc = src;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

async function loadStepViewerLibraries() {
  if (!stepViewerLibrariesPromise) {
    stepViewerLibrariesPromise = (async () => {
      await loadScriptOnce("https://unpkg.com/three@0.128.0/build/three.min.js");
      await loadScriptOnce("https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js");
      await loadScriptOnce("https://unpkg.com/three@0.128.0/examples/js/loaders/STLLoader.js");
      await loadScriptOnce("https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/occt-import-js.js");
      if (!window.THREE || !window.THREE.OrbitControls || !window.THREE.STLLoader || !window.occtimportjs) {
        throw new Error("STEP viewer libraries are not available.");
      }
    })();
  }
  await stepViewerLibrariesPromise;
}

async function getOcctInstance() {
  await loadStepViewerLibraries();
  if (!occtInstancePromise) occtInstancePromise = window.occtimportjs();
  return occtInstancePromise;
}

function disposeStepViewer() {
  if (typeof stepViewerCleanup === "function") stepViewerCleanup();
  stepViewerCleanup = null;
}

async function renderFilePreview(quote) {
  disposeStepViewer();
  const lowerName = String(quote.originalName || "").toLowerCase();
  const isStep = /\.(step|stp)$/i.test(lowerName);
  const isStl = /\.stl$/i.test(lowerName);
  const isPdf = String(quote.mimeType || "") === "application/pdf";
  const isImage = String(quote.mimeType || "").startsWith("image/");

  if (isImage) {
    reviewFileViewer.className = "document-viewer workspace-viewer";
    reviewFileViewer.innerHTML = `<img class="document-image" src="${quote.fileUrl}" alt="${escapeHtml(quote.originalName)}" />`;
    return;
  }

  if (isPdf) {
    reviewFileViewer.className = "document-viewer workspace-viewer";
    reviewFileViewer.innerHTML = `<iframe class="document-frame" src="${quote.fileUrl}" title="${escapeHtml(quote.originalName)}"></iframe>`;
    return;
  }

  if (!isStep && !isStl) {
    const response = await fetch(quote.fileUrl, { headers: localStorage.getItem("bw_token") ? { Authorization: `Bearer ${localStorage.getItem("bw_token")}` } : {} });
    const text = await response.text();
    reviewFileViewer.className = "document-viewer workspace-viewer";
    reviewFileViewer.innerHTML = `<pre class="document-source">${escapeHtml(text.slice(0, 30000) || "File is empty.")}</pre>`;
    return;
  }

  reviewFileViewer.className = "document-viewer workspace-viewer";
  reviewFileViewer.innerHTML = `
    <div class="engineering-viewer">
      <div class="viewer-meta">${isStl ? "STL 3D model" : "STEP 3D model"} • ${escapeHtml(quote.originalName)}</div>
      <div class="engineering-viewer-card">
        <div class="engineering-viewer-status">Loading 3D preview...</div>
        <div class="step-viewer-stage"></div>
      </div>
    </div>
  `;
  const stage = reviewFileViewer.querySelector(".step-viewer-stage");
  const status = reviewFileViewer.querySelector(".engineering-viewer-status");

  try {
    await loadStepViewerLibraries();
    const THREE = window.THREE;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f5ef);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    stage.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(6, 8, 10);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
    fillLight.position.set(-8, -4, -6);
    scene.add(fillLight);

    const root = new THREE.Group();
    const meshMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.77, 0.52, 0.34),
      metalness: 0.08,
      roughness: 0.68,
      side: THREE.DoubleSide,
    });
    const response = await fetch(quote.fileUrl, { headers: localStorage.getItem("bw_token") ? { Authorization: `Bearer ${localStorage.getItem("bw_token")}` } : {} });
    if (!response.ok) throw new Error(`Could not load ${isStl ? "STL" : "STEP"} file.`);

    if (isStl) {
      const loader = new THREE.STLLoader();
      const geometry = loader.parse(await response.arrayBuffer());
      if (!geometry) throw new Error("This STL file could not be parsed for preview.");
      geometry.computeVertexNormals();
      root.add(new THREE.Mesh(geometry, meshMaterial));
    } else {
      const occt = await getOcctInstance();
      const result = occt.ReadStepFile(new Uint8Array(await response.arrayBuffer()), {
        linearUnit: "millimeter",
        linearDeflectionType: "bounding_box_ratio",
        linearDeflection: 0.001,
        angularDeflection: 0.5,
      });
      if (!result?.success || !result.meshes?.length) throw new Error("This STEP file could not be triangulated for preview.");
      result.meshes.forEach((meshData) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(meshData.attributes.position.array, 3));
        if (meshData.attributes.normal?.array?.length) {
          geometry.setAttribute("normal", new THREE.Float32BufferAttribute(meshData.attributes.normal.array, 3));
        } else {
          geometry.computeVertexNormals();
        }
        if (meshData.index?.array?.length) geometry.setIndex(meshData.index.array);
        root.add(new THREE.Mesh(geometry, meshMaterial.clone()));
      });
    }
    scene.add(root);

    const bounds = new THREE.Box3().setFromObject(root);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z) || 1;
    root.position.sub(center);

    camera.near = Math.max(maxDimension / 1000, 0.1);
    camera.far = maxDimension * 200;
    camera.position.set(maxDimension * 1.6, maxDimension * 1.25, maxDimension * 1.6);
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.update();

    const grid = new THREE.GridHelper(maxDimension * 1.8, 12, 0xd7c5b3, 0xe8ddd0);
    grid.position.y = -size.y / 2;
    scene.add(grid);

    const resize = () => {
      const width = Math.max(stage.clientWidth, 320);
      const height = Math.max(stage.clientHeight, 520);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);

    let animationFrame = 0;
    const animate = () => {
      animationFrame = window.requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    status.innerHTML = `<span>3D preview ready</span><span class="engineering-viewer-actions"><a class="table-button" href="${quote.fileUrl}" target="_blank" rel="noreferrer">Open ${isStl ? "STL" : "STEP"} File</a></span>`;

    stepViewerCleanup = () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      controls.dispose();
      root.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          if (Array.isArray(node.material)) node.material.forEach((material) => material.dispose());
          else node.material.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === stage) stage.removeChild(renderer.domElement);
    };
  } catch (error) {
    reviewFileViewer.innerHTML = `
      <div class="engineering-viewer">
        <div class="viewer-meta">${isStl ? "STL 3D model" : "STEP 3D model"} • ${escapeHtml(quote.originalName)}</div>
        <div class="engineering-viewer-card">
          <h3>3D preview could not be loaded</h3>
          <p>${escapeHtml(error.message || "The browser could not initialize the STEP viewer.")}</p>
          <div class="engineering-viewer-actions">
            <a class="table-button" href="${quote.fileUrl}" target="_blank" rel="noreferrer">Open ${isStl ? "STL" : "STEP"} File</a>
          </div>
        </div>
      </div>
    `;
  }
}

function fillForm(quote) {
  const settings = quote.reviewData || quote.pricing?.settings || {};
  quoteReviewDetailForm.elements.process.value = quote.process || "CNC Machining";
  quoteReviewDetailForm.elements.quantity.value = String(quote.quantity || 1);
  quoteReviewDetailForm.elements.material.value = quote.material || "";
  quoteReviewDetailForm.elements.finish.value = quote.finish || "";
  quoteReviewDetailForm.elements.status.value = quote.status || "New";
  quoteReviewDetailForm.elements.leadDays.value = String(settings.leadDays ?? quote.estimatedLeadDays ?? 1);
  quoteReviewDetailForm.elements.setupHours.value = String(settings.setupHours ?? "");
  quoteReviewDetailForm.elements.machiningHours.value = String(settings.machiningHours ?? "");
  quoteReviewDetailForm.elements.hourlyRate.value = String(settings.hourlyRate ?? "");
  quoteReviewDetailForm.elements.stockMultiplier.value = String(settings.stockMultiplier ?? "");
  quoteReviewDetailForm.elements.toolingCost.value = String(settings.toolingCost ?? "");
  quoteReviewDetailForm.elements.inspectionCost.value = String(settings.inspectionCost ?? "");
  quoteReviewDetailForm.elements.shippingCost.value = String(settings.shippingCost ?? "");
  quoteReviewDetailForm.elements.overheadPercent.value = String(settings.overheadPercent ?? "");
  quoteReviewDetailForm.elements.marginPercent.value = String(settings.marginPercent ?? "");
  quoteReviewDetailForm.elements.adminNotes.value = quote.adminNotes || "";
}

function fillQuickControls(quote) {
  quoteQuickControls.elements.process.value = quote.process || "CNC Machining";
  quoteQuickControls.elements.quantity.value = String(quote.quantity || 1);
  if (quoteQuickDesignUnits && quoteConfig?.designUnits) {
    fillSimpleSelect(quoteQuickDesignUnits, quoteConfig.designUnits, quote.designUnits || "mm");
  }
  renderQuickControlOptionFields(quote);
}

async function renderQuote(quote) {
  currentQuote = quote;
  document.title = `${quote.referenceCode} Quote Review`;
  reviewTitle.textContent = quote.referenceCode;
  reviewMeta.textContent = `${quote.name}${quote.company ? ` • ${quote.company}` : ""} • ${quote.process} • ${quote.originalName}`;
  if (reviewFileInlineLink) reviewFileInlineLink.href = quote.fileUrl;
  fillForm(quote);
  fillQuickControls(quote);
  renderPricing(quote.pricing, quote.status);
  await renderFilePreview(quote);
  renderDfmAnalysis(quote);
}

async function loadQuote() {
  if (!quoteId) throw new Error("Quote id is missing.");
  const [configData, quoteData] = await Promise.all([api("/api/quote-config"), api(`/api/quote-requests/${quoteId}`)]);
  quoteConfig = configData.quoteConfig;
  if (quoteQuickProcess && quoteConfig?.processes) {
    fillSimpleSelect(quoteQuickProcess, Object.keys(quoteConfig.processes).map((process) => ({ value: process, label: process })), "");
  }
  await renderQuote(quoteData.quoteRequest);
}

quoteReviewDetailForm.addEventListener("input", () => {
  copySharedFields(quoteReviewDetailForm, quoteQuickControls);
  syncPricingFromForm();
  queueAutoSave();
});

quoteReviewDetailForm.addEventListener("change", () => {
  copySharedFields(quoteReviewDetailForm, quoteQuickControls);
  syncPricingFromForm();
  queueAutoSave();
});

quoteQuickControls.addEventListener("input", () => {
  syncPricingFromQuickControls();
  queueAutoSave();
});

quoteQuickControls.addEventListener("change", (event) => {
  if (event?.target?.name === "process") {
    renderQuickControlOptionFields({ ...currentQuote, process: quoteQuickProcess.value });
  }
  if (event?.target?.name === "materialFamily") {
    renderQuickControlOptionFields({
      ...currentQuote,
      process: quoteQuickProcess.value,
      materialFamily: event.target.value,
      optionSelections: {
        ...(currentQuote?.optionSelections || {}),
        ...getQuickControlSelections(),
        materialFamily: event.target.value,
      },
    });
  }
  syncPricingFromQuickControls();
  queueAutoSave();
});

quoteReviewDetailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveQuoteReview();
});

reviewDfmButton?.addEventListener("click", () => {
  if (!currentQuote?.id) return;
  window.open(dfmAnalysisUrl(currentQuote.id), "_blank", "noopener,noreferrer");
});

reviewEstimateButton?.addEventListener("click", () => {
  if (!currentQuote) return;
  window.open(customerEstimateUrl(currentQuote.id), "_blank", "noopener,noreferrer");
});

reviewCheckoutButton?.addEventListener("click", () => {
  if (!currentQuote) return;
  window.open(checkoutUrl(currentQuote.id), "_blank", "noopener,noreferrer");
});

reviewBackButton?.addEventListener("click", () => {
  window.location.href = "/";
});

loadQuote().catch((error) => {
  reviewTitle.textContent = "Quote review could not be loaded";
  reviewMeta.textContent = error.message;
});
