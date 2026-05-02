const params = new URLSearchParams(window.location.search);
const quoteId = params.get("id") || "";

const checkoutTitle = document.querySelector("#checkoutTitle");
const checkoutMeta = document.querySelector("#checkoutMeta");
const checkoutBackButton = document.querySelector("#checkoutBackButton");
const checkoutCustomerId = document.querySelector("#checkoutCustomerId");
const checkoutStatus = document.querySelector("#checkoutStatus");
const checkoutGateNote = document.querySelector("#checkoutGateNote");
const checkoutReviewBanner = document.querySelector("#checkoutReviewBanner");
const checkoutReviewBadge = document.querySelector("#checkoutReviewBadge");
const checkoutReviewResult = document.querySelector("#checkoutReviewResult");
const checkoutEngineeringDecision = document.querySelector("#checkoutEngineeringDecision");
const checkoutProcessRoute = document.querySelector("#checkoutProcessRoute");
const checkoutCommercialForm = document.querySelector("#checkoutCommercialForm");
const checkoutCommercialStatus = document.querySelector("#checkoutCommercialStatus");
const checkoutDeliveryForm = document.querySelector("#checkoutDeliveryForm");
const checkoutDeliveryStatus = document.querySelector("#checkoutDeliveryStatus");
const checkoutShippingForm = document.querySelector("#checkoutShippingForm");
const checkoutShippingStatus = document.querySelector("#checkoutShippingStatus");
const checkoutTaxForm = document.querySelector("#checkoutTaxForm");
const checkoutTaxStatus = document.querySelector("#checkoutTaxStatus");
const checkoutInjectionFields = document.querySelector("#checkoutInjectionFields");
const checkoutStandardFields = document.querySelector("#checkoutStandardFields");
const checkoutInjectionDeliveryFields = document.querySelector("#checkoutInjectionDeliveryFields");
const checkoutPaymentGate = document.querySelector("#checkoutPaymentGate");
const checkoutPayButton = document.querySelector("#checkoutPayButton");
const checkoutPaymentStatus = document.querySelector("#checkoutPaymentStatus");
const checkoutSummaryStatus = document.querySelector("#checkoutSummaryStatus");
const checkoutSummaryPayment = document.querySelector("#checkoutSummaryPayment");
const checkoutSummaryIncoterm = document.querySelector("#checkoutSummaryIncoterm");
const checkoutSummaryDelivery = document.querySelector("#checkoutSummaryDelivery");
const checkoutSummaryChips = document.querySelector("#checkoutSummaryChips");
const checkoutSummaryCards = document.querySelector("#checkoutSummaryCards");
const checkoutSummaryRows = document.querySelector("#checkoutSummaryRows");

let currentQuote = null;
let currentOrder = null;
let customers = [];
let razorpayConfig = { enabled: false, keyId: "" };
let checkoutBlocked = false;

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setStatus(element, message, tone = "default") {
  if (!element) return;
  element.textContent = message || "";
  element.classList.remove("is-error", "is-success");
  if (tone === "error") element.classList.add("is-error");
  if (tone === "success") element.classList.add("is-success");
}

function getProcessRoute(quote) {
  if (!quote) return "-";
  return quote.process === "Injection Molding" ? "DFM review -> tooling + production checkout" : "Manufacturing review -> direct order checkout";
}

function isInjectionMolding() {
  return currentQuote?.process === "Injection Molding";
}

function renderCustomerOptions(selectedId = "") {
  if (!checkoutCustomerId) return;
  checkoutCustomerId.innerHTML = '<option value="">Choose customer</option>';
  customers.forEach((customer) => {
    const option = document.createElement("option");
    option.value = customer.id;
    option.textContent = customer.name;
    if (customer.id === selectedId) option.selected = true;
    checkoutCustomerId.appendChild(option);
  });
}

function renderReviewState() {
  if (!currentOrder || !currentQuote) return;
  const reviewResult = currentOrder.reviewResult || (checkoutBlocked ? "Engineering review required" : "Review complete");
  const engineeringDecision = currentOrder.engineeringDecision || "-";
  checkoutReviewResult.textContent = reviewResult;
  checkoutEngineeringDecision.textContent = engineeringDecision;
  checkoutProcessRoute.textContent = getProcessRoute(currentQuote);
  checkoutReviewBadge.textContent = reviewResult;

  if (checkoutBlocked) {
    checkoutReviewBadge.className = "status-chip status-chip-warning";
    checkoutReviewBanner.className = "checkout-callout checkout-callout-warning";
    checkoutReviewBanner.innerHTML = `
      <strong>Engineering review required</strong>
      <p>This mold needs a deeper Brahmworks engineering release before tooling payment can be accepted.</p>
    `;
    setStatus(
      checkoutGateNote,
      "DFM indicates higher mold complexity. We will contact the customer with the next steps instead of taking direct tooling payment.",
      "error",
    );
  } else if (isInjectionMolding()) {
    checkoutReviewBadge.className = "status-chip status-chip-success";
    checkoutReviewBanner.className = "checkout-callout";
    checkoutReviewBanner.innerHTML = `
      <strong>${escapeHtml(engineeringDecision || "DFM pass")}</strong>
      <p>Tooling assumptions, sample plan, delivery, shipping model, and tax treatment should be locked before checkout.</p>
    `;
    setStatus(checkoutGateNote, "Injection molding orders move from DFM release into tooling + production setup before payment.", "success");
  } else {
    checkoutReviewBadge.className = "status-chip";
    checkoutReviewBanner.className = "checkout-callout";
    checkoutReviewBanner.innerHTML = `
      <strong>Review complete</strong>
      <p>Finalize delivery, shipping, tax treatment, and order summary before the customer pays.</p>
    `;
    setStatus(checkoutGateNote, "Manufacturing review is complete. Confirm commercial terms and proceed to payment.", "success");
  }
}

function applyOrderToForms() {
  if (!currentOrder || !currentQuote) return;
  renderCustomerOptions(currentOrder.customerId || currentQuote.customer?.id || "");
  checkoutStatus.value = currentOrder.status || "Draft";

  checkoutInjectionFields.hidden = !isInjectionMolding();
  checkoutInjectionDeliveryFields.hidden = !isInjectionMolding();
  checkoutStandardFields.hidden = isInjectionMolding();

  if (checkoutCommercialForm) {
    checkoutCommercialForm.elements.endUse.value = currentOrder.endUse || "Prototype";
    checkoutCommercialForm.elements.moq.value = currentOrder.moq || "";

    if (isInjectionMolding()) {
      checkoutCommercialForm.elements.moldType.value = currentOrder.moldType || "Pilot mold";
      checkoutCommercialForm.elements.cavityCount.value = currentOrder.cavityCount || "";
      checkoutCommercialForm.elements.toolMaterial.value = currentOrder.toolMaterial || "Aluminum";
      checkoutCommercialForm.elements.textureFinish.value = currentOrder.textureFinish || "";
      checkoutCommercialForm.elements.t0SamplePlan.value = currentOrder.t0SamplePlan || "";
      checkoutCommercialForm.elements.sampleRounds.value = currentOrder.sampleRounds || "";
      checkoutCommercialForm.elements.productionQuantity.value = currentOrder.productionQuantity || currentQuote.quantity || "";
      checkoutCommercialForm.elements.toolingCost.value = currentOrder.toolingCost || "";
      checkoutCommercialForm.elements.partUnitPrice.value = currentOrder.partUnitPrice || "";
      checkoutCommercialForm.elements.toolLeadDays.value = currentOrder.toolLeadDays || "";
      checkoutCommercialForm.elements.productionLeadDays.value = currentOrder.productionLeadDays || "";
      checkoutCommercialForm.elements.commercialNotes.value = currentOrder.commercialNotes || "";
    } else {
      checkoutCommercialForm.elements.batchQuantity.value = currentOrder.batchQuantity || currentQuote.quantity || "";
      checkoutCommercialForm.elements.partUnitPriceStandard.value = currentOrder.partUnitPrice || "";
      checkoutCommercialForm.elements.finishConfirmation.value = currentOrder.finishConfirmation || currentQuote.finish || "";
      checkoutCommercialForm.elements.inspectionOption.value = currentOrder.inspectionOption || "Standard inspection";
      checkoutCommercialForm.elements.commercialNotesStandard.value = currentOrder.commercialNotes || "";
    }
  }

  if (checkoutDeliveryForm) {
    checkoutDeliveryForm.elements.deliverySpeed.value = currentOrder.deliverySpeed || "Standard";
    checkoutDeliveryForm.elements.deliveryDate.value = currentOrder.deliveryDate || "";
    if (isInjectionMolding()) {
      checkoutDeliveryForm.elements.t0SampleDate.value = currentOrder.t0SampleDate || "";
      checkoutDeliveryForm.elements.productionDeliveryDate.value = currentOrder.productionDeliveryDate || "";
    }
  }

  if (checkoutShippingForm) {
    checkoutShippingForm.elements.shippingMethod.value = currentOrder.shippingMethod || "Air";
    checkoutShippingForm.elements.incoterm.value = currentOrder.incoterm || "DDP";
    checkoutShippingForm.elements.importerModel.value = currentOrder.importerModel || (currentOrder.country && currentOrder.country !== "India" ? "Customer importer" : "N/A - domestic");
    checkoutShippingForm.elements.shippingCost.value = currentOrder.shippingCost || "";
    checkoutShippingForm.elements.shippingName.value = currentOrder.shippingName || currentQuote.name || "";
    checkoutShippingForm.elements.shippingPhone.value = currentOrder.shippingPhone || currentQuote.phone || "";
    checkoutShippingForm.elements.country.value = currentOrder.country || "India";
    checkoutShippingForm.elements.state.value = currentOrder.state || "";
    checkoutShippingForm.elements.city.value = currentOrder.city || "";
    checkoutShippingForm.elements.postalCode.value = currentOrder.postalCode || "";
    checkoutShippingForm.elements.addressLine1.value = currentOrder.addressLine1 || "";
    checkoutShippingForm.elements.importerName.value = currentOrder.importerName || "";
    checkoutShippingForm.elements.importerTaxId.value = currentOrder.importerTaxId || "";
  }

  if (checkoutTaxForm) {
    checkoutTaxForm.elements.gstin.value = currentOrder.gstin || "";
    checkoutTaxForm.elements.taxMode.value = currentOrder.taxMode || "Auto GST";
    checkoutTaxForm.elements.taxRate.value = currentOrder.taxRate || "";
    checkoutTaxForm.elements.dutyRate.value = currentOrder.dutyRate || "";
  }
}

function renderHeader() {
  if (!currentQuote) return;
  checkoutTitle.textContent = `${currentQuote.referenceCode} Checkout`;
  checkoutMeta.textContent = `${currentQuote.process} • ${currentQuote.originalName} • ${currentQuote.name}`;
}

function renderSummary() {
  if (!currentQuote || !currentOrder) return;
  const summary = currentOrder.summaryData || {};

  checkoutSummaryStatus.textContent = currentOrder.status || "Draft";
  checkoutSummaryPayment.textContent = currentOrder.paymentStatus || "Pending";
  checkoutSummaryIncoterm.textContent = currentOrder.incoterm || "-";
  checkoutSummaryDelivery.textContent = isInjectionMolding()
    ? `${currentOrder.t0SampleDate || "-"} / ${currentOrder.productionDeliveryDate || currentOrder.deliveryDate || "-"}`
    : currentOrder.deliveryDate || "-";

  const chips = [
    currentQuote.process,
    currentOrder.endUse,
    currentOrder.shippingMethod,
    currentOrder.taxMode || summary.taxMode,
    currentOrder.importerModel,
  ].filter(Boolean);
  checkoutSummaryChips.innerHTML = chips.map((item) => `<span class="summary-chip">${escapeHtml(item)}</span>`).join("");

  checkoutSummaryCards.innerHTML = `
    <div class="list-item">
      <strong>Part / file</strong>
      <p>${escapeHtml(currentQuote.originalName || "-")}</p>
    </div>
    <div class="list-item">
      <strong>Quantity</strong>
      <p>${escapeHtml(String(summary.orderQuantity || currentQuote.quantity || "-"))}</p>
    </div>
    <div class="list-item">
      <strong>Material / finish</strong>
      <p>${escapeHtml(currentOrder.finishConfirmation || currentQuote.material || "As reviewed")}</p>
    </div>
    <div class="list-item">
      <strong>Shipping scope</strong>
      <p>${escapeHtml(summary.shippingScope || currentOrder.incoterm || "-")}</p>
    </div>
  `;

  checkoutSummaryRows.innerHTML = (summary.summaryRows || [])
    .map(
      ([label, value]) => `
        <div class="list-item">
          <strong>${escapeHtml(label)}</strong>
          <p>${formatCurrency(value, currentOrder.currency || "INR")}</p>
        </div>
      `,
    )
    .join("");

  if (checkoutBlocked) {
    checkoutPaymentGate.className = "checkout-callout checkout-callout-warning";
    checkoutPaymentGate.innerHTML = `
      <strong>Engineering review required</strong>
      <p>Payment is blocked for this tooling program. Brahmworks engineering will contact the customer with the revised release plan.</p>
    `;
    checkoutPayButton.disabled = true;
  } else {
    checkoutPaymentGate.className = "checkout-callout";
    checkoutPaymentGate.innerHTML = `
      <strong>Ready for payment</strong>
      <p>Once commercial setup, shipping, and tax values are confirmed, the customer can pay through Razorpay Standard Checkout.</p>
    `;
    checkoutPayButton.disabled = false;
  }
}

async function saveOrder(payload) {
  if (!currentOrder?.id) return;
  const response = await api(`/api/quote-orders/${encodeURIComponent(currentOrder.id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  currentOrder = response.quoteOrder;
  checkoutBlocked = Boolean(currentOrder.reviewResult === "Engineering review required" || currentOrder.status === "Engineering Review Required");
  renderReviewState();
  applyOrderToForms();
  renderSummary();
}

function getCommercialPayload() {
  const formData = new FormData(checkoutCommercialForm);
  const base = {
    customerId: checkoutCustomerId?.value || currentOrder.customerId || "",
    status: checkoutStatus?.value || currentOrder.status || "Draft",
    endUse: String(formData.get("endUse") || "Prototype"),
    moq: Number(formData.get("moq") || 0) || null,
  };

  if (isInjectionMolding()) {
    return {
      ...base,
      moldType: String(formData.get("moldType") || ""),
      cavityCount: Number(formData.get("cavityCount") || 0) || null,
      toolMaterial: String(formData.get("toolMaterial") || ""),
      textureFinish: String(formData.get("textureFinish") || ""),
      t0SamplePlan: String(formData.get("t0SamplePlan") || ""),
      sampleRounds: Number(formData.get("sampleRounds") || 0) || null,
      productionQuantity: Number(formData.get("productionQuantity") || 0) || null,
      toolingCost: Number(formData.get("toolingCost") || 0) || 0,
      partUnitPrice: Number(formData.get("partUnitPrice") || 0) || 0,
      toolLeadDays: Number(formData.get("toolLeadDays") || 0) || null,
      productionLeadDays: Number(formData.get("productionLeadDays") || 0) || null,
      commercialNotes: String(formData.get("commercialNotes") || ""),
    };
  }

  return {
    ...base,
    batchQuantity: Number(formData.get("batchQuantity") || 0) || null,
    partUnitPrice: Number(formData.get("partUnitPriceStandard") || 0) || 0,
    finishConfirmation: String(formData.get("finishConfirmation") || ""),
    inspectionOption: String(formData.get("inspectionOption") || ""),
    commercialNotes: String(formData.get("commercialNotesStandard") || ""),
  };
}

checkoutCommercialForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    setStatus(checkoutCommercialStatus, "Saving commercial setup...");
    await saveOrder(getCommercialPayload());
    setStatus(checkoutCommercialStatus, "Commercial setup saved.", "success");
  } catch (error) {
    setStatus(checkoutCommercialStatus, error.message, "error");
  }
});

checkoutDeliveryForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(checkoutDeliveryForm);
  try {
    setStatus(checkoutDeliveryStatus, "Saving delivery dates...");
    await saveOrder({
      deliverySpeed: String(formData.get("deliverySpeed") || "Standard"),
      deliveryDate: String(formData.get("deliveryDate") || ""),
      t0SampleDate: String(formData.get("t0SampleDate") || ""),
      productionDeliveryDate: String(formData.get("productionDeliveryDate") || ""),
    });
    setStatus(checkoutDeliveryStatus, "Delivery schedule saved.", "success");
  } catch (error) {
    setStatus(checkoutDeliveryStatus, error.message, "error");
  }
});

checkoutShippingForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(checkoutShippingForm);
  try {
    setStatus(checkoutShippingStatus, "Saving shipping terms...");
    await saveOrder({
      shippingMethod: String(formData.get("shippingMethod") || "Air"),
      incoterm: String(formData.get("incoterm") || "DDP"),
      importerModel: String(formData.get("importerModel") || ""),
      shippingCost: Number(formData.get("shippingCost") || 0) || 0,
      shippingName: String(formData.get("shippingName") || ""),
      shippingPhone: String(formData.get("shippingPhone") || ""),
      country: String(formData.get("country") || ""),
      state: String(formData.get("state") || ""),
      city: String(formData.get("city") || ""),
      postalCode: String(formData.get("postalCode") || ""),
      addressLine1: String(formData.get("addressLine1") || ""),
      importerName: String(formData.get("importerName") || ""),
      importerTaxId: String(formData.get("importerTaxId") || ""),
    });
    setStatus(checkoutShippingStatus, "Shipping terms saved.", "success");
  } catch (error) {
    setStatus(checkoutShippingStatus, error.message, "error");
  }
});

checkoutTaxForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(checkoutTaxForm);
  try {
    setStatus(checkoutTaxStatus, "Saving tax setup...");
    await saveOrder({
      gstin: String(formData.get("gstin") || ""),
      taxMode: String(formData.get("taxMode") || "Auto GST"),
      taxRate: Number(formData.get("taxRate") || 0) || 0,
      dutyRate: Number(formData.get("dutyRate") || 0) || 0,
    });
    setStatus(checkoutTaxStatus, "Tax setup saved.", "success");
  } catch (error) {
    setStatus(checkoutTaxStatus, error.message, "error");
  }
});

checkoutPayButton?.addEventListener("click", async () => {
  if (!currentOrder?.id) return;
  if (checkoutBlocked) {
    setStatus(checkoutPaymentStatus, "Engineering must release this order before customer payment.", "error");
    return;
  }
  if (!razorpayConfig.enabled) {
    setStatus(checkoutPaymentStatus, "Razorpay is not configured yet. Add API keys on the server to enable payment.", "error");
    return;
  }
  if (!window.Razorpay) {
    setStatus(checkoutPaymentStatus, "Razorpay checkout library did not load.", "error");
    return;
  }

  try {
    setStatus(checkoutPaymentStatus, "Creating Razorpay order...");
    const response = await api(`/api/quote-orders/${encodeURIComponent(currentOrder.id)}/razorpay-order`, { method: "POST" });
    const options = {
      key: response.razorpay.keyId,
      amount: response.razorpay.amount,
      currency: response.razorpay.currency,
      name: response.razorpay.name,
      description: response.razorpay.description,
      order_id: response.razorpay.orderId,
      prefill: response.razorpay.prefill,
      theme: { color: "#b85c38" },
      handler: async (paymentResponse) => {
        try {
          setStatus(checkoutPaymentStatus, "Verifying Razorpay payment...");
          const verifyResponse = await api(`/api/quote-orders/${encodeURIComponent(currentOrder.id)}/razorpay-verify`, {
            method: "POST",
            body: JSON.stringify(paymentResponse),
          });
          currentOrder = verifyResponse.quoteOrder;
          renderSummary();
          setStatus(checkoutPaymentStatus, "Payment captured and verified.", "success");
        } catch (error) {
          setStatus(checkoutPaymentStatus, error.message, "error");
        }
      },
    };
    const razorpay = new window.Razorpay(options);
    razorpay.on("payment.failed", (event) => {
      setStatus(checkoutPaymentStatus, event.error?.description || "Payment failed.", "error");
    });
    razorpay.open();
  } catch (error) {
    setStatus(checkoutPaymentStatus, error.message, "error");
  }
});

checkoutBackButton?.addEventListener("click", () => {
  window.location.href = reviewUrl(quoteId);
});

async function loadContext() {
  if (!quoteId) throw new Error("Quote id is missing");
  const [bootstrap, checkoutData] = await Promise.all([
    api("/api/bootstrap"),
    api(`/api/quote-orders/quote/${encodeURIComponent(quoteId)}`),
  ]);

  customers = bootstrap.customers || [];
  currentQuote = checkoutData.quoteRequest;
  currentOrder = checkoutData.quoteOrder;
  razorpayConfig = checkoutData.razorpay || razorpayConfig;
  checkoutBlocked = Boolean(checkoutData.checkoutBlocked);

  renderHeader();
  renderReviewState();
  applyOrderToForms();
  renderSummary();
}

loadContext().catch((error) => {
  checkoutTitle.textContent = "Checkout unavailable";
  checkoutMeta.textContent = error.message;
  setStatus(checkoutPaymentStatus, error.message, "error");
});
