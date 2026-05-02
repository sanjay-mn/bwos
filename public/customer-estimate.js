const params = new URLSearchParams(window.location.search);
const quoteId = params.get("id") || "";

const customerEstimateTitle = document.querySelector("#customerEstimateTitle");
const customerEstimateMeta = document.querySelector("#customerEstimateMeta");
const customerEstimateBackButton = document.querySelector("#customerEstimateBackButton");
const customerEstimateForm = document.querySelector("#customerEstimateForm");
const customerSelect = document.querySelector("#customerSelect");
const customerEstimateStatus = document.querySelector("#customerEstimateStatus");
const customerAddForm = document.querySelector("#customerAddForm");
const customerAddStatus = document.querySelector("#customerAddStatus");
const estimateSelectedCustomer = document.querySelector("#estimateSelectedCustomer");

const estimateSummaryReference = document.querySelector("#estimateSummaryReference");
const estimateSummaryProcess = document.querySelector("#estimateSummaryProcess");
const estimateSummaryMaterial = document.querySelector("#estimateSummaryMaterial");
const estimateSummaryQuantity = document.querySelector("#estimateSummaryQuantity");
const estimateSummaryLead = document.querySelector("#estimateSummaryLead");
const estimateSummaryRange = document.querySelector("#estimateSummaryRange");

let currentQuote = null;
let customers = [];

function estimateDocumentUrl(id) {
  return `/api/documents/quote-estimate/${encodeURIComponent(id)}`;
}

function reviewUrl(id) {
  return `/quote-review.html?id=${encodeURIComponent(id)}`;
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

function formatCurrency(value, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function setStatus(element, message, tone = "default") {
  if (!element) return;
  element.textContent = message;
  element.style.color = tone === "error" ? "var(--danger)" : tone === "success" ? "var(--success)" : "";
}

function renderCustomerOptions(selectedCustomerId = "") {
  if (!customerSelect) return;
  customerSelect.innerHTML = '<option value="">Choose customer</option>';
  customers.forEach((customer) => {
    const option = document.createElement("option");
    option.value = customer.id;
    option.textContent = customer.name;
    if (customer.id === selectedCustomerId) option.selected = true;
    customerSelect.appendChild(option);
  });
}

function selectedCustomer() {
  return customers.find((customer) => customer.id === customerSelect?.value) || null;
}

function renderSelectedCustomer() {
  const customer = selectedCustomer() || currentQuote?.customer || null;
  if (!estimateSelectedCustomer) return;
  if (!customer) {
    estimateSelectedCustomer.innerHTML = `
      <div class="list-item">
        <strong>Customer on estimate</strong>
        <p>Select an existing customer or add a new one before generating the official document.</p>
      </div>
    `;
    return;
  }
  estimateSelectedCustomer.innerHTML = `
    <div class="list-item">
      <strong>Customer on estimate</strong>
      <p>${customer.name || "-"}</p>
      <p>${customer.contactPerson || "No contact person yet"}</p>
      <p>${customer.email || "No email yet"}${customer.phone ? ` • ${customer.phone}` : ""}</p>
    </div>
  `;
}

function renderQuoteSummary() {
  if (!currentQuote) return;
  const pricing = currentQuote.pricing || {};
  customerEstimateTitle.textContent = `Customer Estimate · ${currentQuote.referenceCode}`;
  customerEstimateMeta.textContent = `${currentQuote.process} • ${currentQuote.originalName} • ${currentQuote.name}`;
  estimateSummaryReference.textContent = currentQuote.referenceCode;
  estimateSummaryProcess.textContent = currentQuote.process || "-";
  estimateSummaryMaterial.textContent = pricing.material || currentQuote.material || "-";
  estimateSummaryQuantity.textContent = `${pricing.quantity || currentQuote.quantity || 1} ${currentQuote.units || "pcs"}`;
  estimateSummaryLead.textContent = `${pricing.leadDays || currentQuote.estimatedLeadDays || "-"} working days`;
  estimateSummaryRange.textContent = `${formatCurrency(currentQuote.estimateLow || pricing.low)} - ${formatCurrency(currentQuote.estimateHigh || pricing.high)}`;
}

async function loadContext() {
  if (!quoteId) throw new Error("Quote id is missing");
  const [bootstrapData, quoteData] = await Promise.all([api("/api/bootstrap"), api(`/api/quote-requests/${encodeURIComponent(quoteId)}`)]);
  customers = bootstrapData.customers || [];
  currentQuote = quoteData.quoteRequest;
  renderCustomerOptions(currentQuote.customer?.id || "");
  renderQuoteSummary();
  renderSelectedCustomer();
}

customerSelect?.addEventListener("change", () => {
  renderSelectedCustomer();
  setStatus(customerEstimateStatus, "Customer selected. Generate the official estimate when ready.");
});

customerEstimateForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const customerId = String(customerSelect?.value || "").trim();
  if (!customerId) {
    setStatus(customerEstimateStatus, "Choose a customer before generating the estimate.", "error");
    return;
  }
  try {
    setStatus(customerEstimateStatus, "Saving customer selection...");
    const response = await api(`/api/quote-requests/${encodeURIComponent(quoteId)}`, {
      method: "PUT",
      body: JSON.stringify({
        process: currentQuote.process,
        quantity: currentQuote.quantity,
        designUnits: currentQuote.designUnits,
        status: currentQuote.status || "Quoted",
        customerId,
        optionSelections: currentQuote.optionSelections || {},
        reviewData: currentQuote.reviewData || {},
        adminNotes: currentQuote.adminNotes || "",
      }),
    });
    currentQuote = response.quoteRequest;
    renderCustomerOptions(currentQuote.customer?.id || customerId);
    renderQuoteSummary();
    renderSelectedCustomer();
    setStatus(customerEstimateStatus, "Official estimate generated in a new tab.", "success");
    window.open(estimateDocumentUrl(quoteId), "_blank", "noopener,noreferrer");
  } catch (error) {
    setStatus(customerEstimateStatus, error.message, "error");
  }
});

customerAddForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(customerAddForm);
  const payload = {
    name: String(formData.get("name") || "").trim(),
    contactPerson: String(formData.get("contactPerson") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
  };
  if (!payload.name) {
    setStatus(customerAddStatus, "Customer name is required.", "error");
    return;
  }
  try {
    setStatus(customerAddStatus, "Adding customer...");
    await api("/api/customers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const bootstrapData = await api("/api/bootstrap");
    customers = bootstrapData.customers || [];
    const createdCustomer = customers.find((customer) => customer.name === payload.name && customer.email === payload.email) || customers.find((customer) => customer.name === payload.name) || null;
    renderCustomerOptions(createdCustomer?.id || "");
    renderSelectedCustomer();
    customerAddForm.reset();
    setStatus(customerAddStatus, "Customer added. They are now selected for this estimate.", "success");
    setStatus(customerEstimateStatus, "Customer added. Generate the official estimate when ready.");
  } catch (error) {
    setStatus(customerAddStatus, error.message, "error");
  }
});

customerEstimateBackButton?.addEventListener("click", () => {
  window.location.href = reviewUrl(quoteId);
});

loadContext().catch((error) => {
  customerEstimateTitle.textContent = "Customer estimate could not be loaded";
  customerEstimateMeta.textContent = error.message;
  setStatus(customerEstimateStatus, error.message, "error");
});
