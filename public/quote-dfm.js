const params = new URLSearchParams(window.location.search);
const quoteId = params.get("id") || "";

const dfmTitle = document.querySelector("#dfmTitle");
const dfmMeta = document.querySelector("#dfmMeta");
const dfmFileInlineLink = document.querySelector("#dfmFileInlineLink");
const dfmDownloadButton = document.querySelector("#dfmDownloadButton");
const dfmCheckoutButton = document.querySelector("#dfmCheckoutButton");
const dfmReviewButton = document.querySelector("#dfmReviewButton");
const dfmDashboardButton = document.querySelector("#dfmDashboardButton");
const dfmFileViewer = document.querySelector("#dfmFileViewer");
const dfmSummary = document.querySelector("#dfmSummary");
const dfmRules = document.querySelector("#dfmRules");
const dfmChecklist = document.querySelector("#dfmChecklist");

let currentQuote = null;
let stepViewerCleanup = null;
let stepViewerLibrariesPromise = null;
let occtInstancePromise = null;

function quoteReviewUrl(id) {
  return `/quote-review.html?id=${encodeURIComponent(id)}`;
}

function dfmDocumentUrl(id) {
  return `/api/documents/quote-dfm/${encodeURIComponent(id)}`;
}

function checkoutUrl(id) {
  return `/quote-checkout.html?id=${encodeURIComponent(id)}`;
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

function dfmStatusClass(status) {
  return status === "pass" ? "good" : status === "hold" ? "low" : "pending";
}

function dfmIcon(kind) {
  const label = kind === "pass" ? "P" : kind === "fail" ? "F" : kind === "review" ? "R" : kind === "rules" ? "L" : "D";
  return `<span class="dfm-icon dfm-icon-${kind}" aria-hidden="true">${label}</span>`;
}

function summarizeDfm(dfm) {
  const checklist = dfm?.checklist || [];
  const passed = checklist.filter((item) => item.status === "pass");
  const failed = checklist.filter((item) => item.status === "warn" || item.status === "hold");
  const review = checklist.filter((item) => item.status === "review");
  return {
    passed,
    failed,
    review,
    overall: failed.length || dfm?.requiresEngineeringContact ? "Fail" : "Pass",
  };
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
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
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
    dfmFileViewer.className = "document-viewer workspace-viewer";
    dfmFileViewer.innerHTML = `<img class="document-image" src="${quote.fileUrl}" alt="${escapeHtml(quote.originalName)}" />`;
    return;
  }

  if (isPdf) {
    dfmFileViewer.className = "document-viewer workspace-viewer";
    dfmFileViewer.innerHTML = `<iframe class="document-frame" src="${quote.fileUrl}" title="${escapeHtml(quote.originalName)}"></iframe>`;
    return;
  }

  if (!isStep && !isStl) {
    const response = await fetch(quote.fileUrl, { headers: localStorage.getItem("bw_token") ? { Authorization: `Bearer ${localStorage.getItem("bw_token")}` } : {} });
    const text = await response.text();
    dfmFileViewer.className = "document-viewer workspace-viewer";
    dfmFileViewer.innerHTML = `<pre class="document-source">${escapeHtml(text.slice(0, 30000) || "File is empty.")}</pre>`;
    return;
  }

  dfmFileViewer.className = "document-viewer workspace-viewer";
  dfmFileViewer.innerHTML = `
    <div class="engineering-viewer">
      <div class="viewer-meta">${isStl ? "STL 3D model" : "STEP 3D model"} • ${escapeHtml(quote.originalName)}</div>
      <div class="engineering-viewer-card">
        <div class="engineering-viewer-status">Loading 3D preview...</div>
        <div class="step-viewer-stage"></div>
      </div>
    </div>
  `;
  const stage = dfmFileViewer.querySelector(".step-viewer-stage");
  const status = dfmFileViewer.querySelector(".engineering-viewer-status");

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
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
        else object.material?.dispose?.();
      });
    };
  } catch (error) {
    dfmFileViewer.className = "document-viewer workspace-viewer empty-state";
    dfmFileViewer.innerHTML = `Could not preview this file in-browser. Use <a class="inline-link" href="${quote.fileUrl}" target="_blank" rel="noreferrer">Open source file</a>.`;
  }
}

function renderDfm(quote) {
  const dfm = quote?.dfm;
  if (!dfm) {
    dfmSummary.innerHTML = '<div class="empty-state">DFM analysis is available for Injection Molding and Sheet Metal requests.</div>';
    dfmRules.innerHTML = "";
    dfmChecklist.innerHTML = "";
    dfmDownloadButton.style.display = "none";
    return;
  }

  const estimate = `${quote.estimateCurrency || "INR"} ${Number(quote.estimateLow || 0).toLocaleString("en-IN")} - ${Number(
    quote.estimateHigh || 0,
  ).toLocaleString("en-IN")}`;
  const summary = summarizeDfm(dfm);

  dfmSummary.innerHTML = `
    <div class="list-item">
      <div class="list-title-row">
        <h3 class="dfm-heading">${dfmIcon("dfm")}${escapeHtml(dfm.title || "DFM Analysis")}</h3>
        <span class="status-badge ${dfmStatusClass(dfm.status)}">${escapeHtml(dfm.status || "review")}</span>
      </div>
      <p>${escapeHtml(dfm.summary || "")}</p>
      <div class="list-meta">
        <span class="pill">${escapeHtml(quote.process)}</span>
        <span class="pill">${escapeHtml(quote.material || "Configured material")}</span>
        <span class="pill">${escapeHtml(estimate)}</span>
        <span class="pill">Complexity ${escapeHtml(dfm.complexityScore ?? "n/a")}</span>
        <span class="pill">${escapeHtml(summary.overall)} for customer release</span>
      </div>
      <div class="dfm-overview-grid">
        <div class="dfm-overview-card">
          <div class="dfm-heading">${dfmIcon("pass")}Passed</div>
          <strong>${summary.passed.length}</strong>
          <p>Checks cleared for customer release.</p>
        </div>
        <div class="dfm-overview-card">
          <div class="dfm-heading">${dfmIcon("fail")}Failed</div>
          <strong>${summary.failed.length}</strong>
          <p>Checks that need design action.</p>
        </div>
        <div class="dfm-overview-card">
          <div class="dfm-heading">${dfmIcon("review")}Needs Review</div>
          <strong>${summary.review.length}</strong>
          <p>Checks that still need engineering judgment.</p>
        </div>
      </div>
      ${dfm.requiresEngineeringContact ? '<p class="notes-line"><strong>Engineering note:</strong> This part needs deeper mold engineering. Brahmworks engineering will contact you for next steps before tooling release.</p>' : ""}
    </div>
  `;

  dfmRules.innerHTML = `
    <div class="list-item dfm-section-card">
      <div class="list-title-row">
        <h3 class="dfm-heading">${dfmIcon("rules")}Rule Set Applied</h3>
        <span class="status-badge pending">${(dfm.rules || []).length} rules</span>
      </div>
      <div class="dfm-rule-list">
        ${(dfm.rules || []).map((rule) => `<p class="dfm-rule-item"><span class="dfm-bullet"></span>${escapeHtml(rule)}</p>`).join("")}
      </div>
    </div>
  `;

  dfmChecklist.innerHTML = (dfm.checklist || [])
    .map(
      (item) => `
        <div class="list-item">
          <div class="list-title-row">
            <h3>${escapeHtml(item.title)}</h3>
            <span class="status-badge ${dfmStatusClass(item.status)}">${escapeHtml(item.status)}</span>
          </div>
          <p>${escapeHtml(item.detail)}</p>
          ${item.recommendation ? `<p class="notes-line"><strong>Recommended:</strong> ${escapeHtml(item.recommendation)}</p>` : ""}
        </div>
      `,
    )
    .join("");

  if (summary.passed.length || summary.failed.length) {
    dfmChecklist.innerHTML = `
      <div class="list-item dfm-section-card">
        <div class="list-title-row">
          <h3 class="dfm-heading">${dfmIcon("pass")}Passed Checks</h3>
          <span class="status-badge good">${summary.passed.length}</span>
        </div>
        ${
          summary.passed.length
            ? summary.passed
                .map(
                  (item) =>
                    `<div class="dfm-check-row"><div class="dfm-check-title">${escapeHtml(item.title)}</div><p class="notes-line">${escapeHtml(item.detail)}</p></div>`,
                )
                .join("")
            : '<p class="notes-line">No checks were marked as passed automatically in this review.</p>'
        }
      </div>
      <div class="list-item dfm-section-card">
        <div class="list-title-row">
          <h3 class="dfm-heading">${dfmIcon("fail")}Failed Checks / Needs Action</h3>
          <span class="status-badge low">${summary.failed.length}</span>
        </div>
        ${
          summary.failed.length
            ? summary.failed
                .map(
                  (item) =>
                    `<div class="dfm-check-row"><div class="dfm-check-title">${escapeHtml(item.title)}</div><p class="notes-line">${escapeHtml(item.detail)}</p>${item.recommendation ? `<p class="notes-line"><strong>Recommended action:</strong> ${escapeHtml(item.recommendation)}</p>` : ""}</div>`,
                )
                .join("")
            : '<p class="notes-line">No failed checks were identified in this automated DFM screen.</p>'
        }
      </div>
      <div class="list-item dfm-section-card">
        <div class="list-title-row">
          <h3 class="dfm-heading">${dfmIcon("review")}Needs Review</h3>
          <span class="status-badge pending">${summary.review.length}</span>
        </div>
        ${
          summary.review.length
            ? summary.review
                .map(
                  (item) =>
                    `<div class="dfm-check-row"><div class="dfm-check-title">${escapeHtml(item.title)}</div><p class="notes-line">${escapeHtml(item.detail)}</p>${item.recommendation ? `<p class="notes-line"><strong>Recommended action:</strong> ${escapeHtml(item.recommendation)}</p>` : ""}</div>`,
                )
                .join("")
            : '<p class="notes-line">No additional manual-review checks are pending.</p>'
        }
      </div>
    `;
  }
}

async function loadQuote() {
  if (!quoteId) throw new Error("Quote id is missing.");
  const data = await api(`/api/quote-requests/${quoteId}`);
  currentQuote = data.quoteRequest;
  document.title = `${currentQuote.referenceCode} DFM Analysis`;
  dfmTitle.textContent = currentQuote.referenceCode;
  dfmMeta.textContent = `${currentQuote.name}${currentQuote.company ? ` • ${currentQuote.company}` : ""} • ${currentQuote.process} • ${currentQuote.originalName}`;
  if (dfmFileInlineLink) dfmFileInlineLink.href = currentQuote.fileUrl;
  renderDfm(currentQuote);
  await renderFilePreview(currentQuote);
}

dfmDownloadButton?.addEventListener("click", () => {
  if (!currentQuote?.id) return;
  window.open(dfmDocumentUrl(currentQuote.id), "_blank", "noopener,noreferrer");
});

dfmCheckoutButton?.addEventListener("click", () => {
  if (!currentQuote?.id) return;
  window.location.href = checkoutUrl(currentQuote.id);
});

dfmReviewButton?.addEventListener("click", () => {
  if (!currentQuote?.id) return;
  window.location.href = quoteReviewUrl(currentQuote.id);
});

dfmDashboardButton?.addEventListener("click", () => {
  window.location.href = "/";
});

loadQuote().catch((error) => {
  dfmTitle.textContent = "DFM analysis unavailable";
  dfmMeta.textContent = error.message;
  dfmFileViewer.className = "document-viewer workspace-viewer empty-state";
  dfmFileViewer.textContent = "We could not load this quote analysis.";
  dfmSummary.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  dfmRules.innerHTML = "";
  dfmChecklist.innerHTML = "";
});
