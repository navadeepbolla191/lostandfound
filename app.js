const STORAGE_KEY = "findit-app-state-v1";

const seedImage = (label, colorA, colorB) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${colorA}" />
          <stop offset="100%" stop-color="${colorB}" />
        </linearGradient>
      </defs>
      <rect width="600" height="400" rx="28" fill="url(#g)" />
      <circle cx="490" cy="80" r="54" fill="rgba(255,255,255,0.2)" />
      <circle cx="140" cy="320" r="76" fill="rgba(255,255,255,0.14)" />
      <text x="48" y="210" font-size="42" font-family="Arial, sans-serif" fill="white">${label}</text>
    </svg>
  `)}`;

const defaultState = {
  users: [
    {
      id: "u-demo",
      name: "Demo Student",
      email: "demo@cvr.ac.in",
      password: "password",
      role: "user",
    },
    {
      id: "u-admin",
      name: "Campus Admin",
      email: "admin@cvr.ac.in",
      password: "password",
      role: "admin",
    },
  ],
  currentUserId: null,
  reports: [
    {
      id: "rep-101",
      type: "lost",
      itemName: "Silver MacBook Air",
      category: "Electronics",
      location: "Library Level 2",
      date: "2026-04-20",
      description: "13-inch laptop with a small sticker near the trackpad and a faint scratch on the lid.",
      image: seedImage("Lost Laptop", "#0f766e", "#155e75"),
      status: "Matched",
      ownerUserId: "u-demo",
      matchId: "match-501",
      createdAt: "2026-04-20T10:30:00.000Z",
    },
    {
      id: "rep-102",
      type: "found",
      itemName: "Laptop near reading bay",
      category: "Electronics",
      location: "Library Level 2",
      date: "2026-04-20",
      description: "Silver laptop found near the reading bay with a minor lid scratch.",
      image: seedImage("Found Laptop", "#ea580c", "#f59e0b"),
      status: "Matched",
      ownerUserId: "u-admin",
      matchId: "match-501",
      createdAt: "2026-04-20T11:10:00.000Z",
    },
    {
      id: "rep-103",
      type: "lost",
      itemName: "Keyring with blue tag",
      category: "Keys",
      location: "Engineering Block",
      date: "2026-04-19",
      description: "Three keys on a ring with a blue rectangular access tag.",
      image: seedImage("Blue Keyring", "#1d4ed8", "#60a5fa"),
      status: "Verified",
      ownerUserId: "u-demo",
      matchId: "match-502",
      createdAt: "2026-04-19T08:00:00.000Z",
    },
    {
      id: "rep-104",
      type: "found",
      itemName: "Blue-tag keyring",
      category: "Keys",
      location: "Engineering Block",
      date: "2026-04-19",
      description: "Keyring with an attached blue tag found near the north entrance.",
      image: seedImage("Found Keys", "#2563eb", "#0891b2"),
      status: "Verified",
      ownerUserId: "u-admin",
      matchId: "match-502",
      createdAt: "2026-04-19T08:40:00.000Z",
    },
    {
      id: "rep-105",
      type: "found",
      itemName: "Black hoodie",
      category: "Clothing",
      location: "Cafeteria",
      date: "2026-04-18",
      description: "Plain black hoodie, medium size, found on a chair near the south corner.",
      image: seedImage("Black Hoodie", "#111827", "#4b5563"),
      status: "Pending",
      ownerUserId: "u-admin",
      matchId: null,
      createdAt: "2026-04-18T14:05:00.000Z",
    },
    {
      id: "rep-106",
      type: "lost",
      itemName: "Student ID wallet",
      category: "Documents",
      location: "Admin Office",
      date: "2026-04-17",
      description: "Brown wallet containing student ID and library card.",
      image: seedImage("ID Wallet", "#7c2d12", "#c2410c"),
      status: "Returned",
      ownerUserId: "u-demo",
      matchId: "match-503",
      createdAt: "2026-04-17T09:15:00.000Z",
    },
    {
      id: "rep-107",
      type: "found",
      itemName: "Brown wallet with ID cards",
      category: "Documents",
      location: "Admin Office",
      date: "2026-04-17",
      description: "Brown wallet found at the admin desk containing an ID card and library card.",
      image: seedImage("Found Wallet", "#92400e", "#f97316"),
      status: "Returned",
      ownerUserId: "u-admin",
      matchId: "match-503",
      createdAt: "2026-04-17T10:05:00.000Z",
    },
  ],
  matches: [
    {
      id: "match-501",
      lostReportId: "rep-101",
      foundReportId: "rep-102",
      confidence: 92,
      status: "Pending",
      verifiedAt: null,
      returnedAt: null,
    },
    {
      id: "match-502",
      lostReportId: "rep-103",
      foundReportId: "rep-104",
      confidence: 88,
      status: "Verified",
      verifiedAt: "2026-04-19T12:20:00.000Z",
      returnedAt: null,
    },
    {
      id: "match-503",
      lostReportId: "rep-106",
      foundReportId: "rep-107",
      confidence: 95,
      status: "Returned",
      verifiedAt: "2026-04-17T11:00:00.000Z",
      returnedAt: "2026-04-17T18:20:00.000Z",
    },
  ],
};

let state = loadState();
let authMode = "login";
let reportWizardStep = 1;
let pendingPhoto = "";
let selectedReportType = "lost";

const app = document.querySelector("#app");

renderApp();

function loadState() {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);

  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error("Failed to parse saved state", error);
    return structuredClone(defaultState);
  }
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderApp() {
  app.innerHTML = "";
  if (!getCurrentUser()) {
    renderAuthView();
    return;
  }

  renderDashboardView();
}

function renderAuthView() {
  const template = document.querySelector("#auth-template");
  app.appendChild(template.content.cloneNode(true));

  const authForm = document.querySelector("#auth-form");
  const toggleButtons = document.querySelectorAll(".toggle-button");

  updateAuthModeUI();

  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      authMode = button.dataset.mode;
      updateAuthModeUI();
    });
  });

  authForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(authForm);
    const message = document.querySelector("#auth-message");
    message.textContent = "";

    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "").trim();

    if (!email.endsWith("@cvr.ac.in")) {
      message.textContent = "Use a valid institutional email ending in @cvr.ac.in.";
      return;
    }

    if (authMode === "login") {
      const user = state.users.find(
        (candidate) => candidate.email === email && candidate.password === password,
      );

      if (!user) {
        message.textContent = "Invalid credentials. Try one of the demo accounts.";
        return;
      }

      state.currentUserId = user.id;
      saveState();
      renderApp();
      return;
    }

    const name = String(formData.get("name") || "").trim();
    const role = String(formData.get("role") || "user");

    if (!name) {
      message.textContent = "Add your full name to create an account.";
      return;
    }

    if (password.length < 8) {
      message.textContent = "Password must be at least 8 characters.";
      return;
    }

    if (state.users.some((user) => user.email === email)) {
      message.textContent = "An account with that email already exists.";
      return;
    }

    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      password,
      role,
    };

    state.users.push(newUser);
    state.currentUserId = newUser.id;
    saveState();
    renderApp();
  });
}

function updateAuthModeUI() {
  const registerFields = document.querySelectorAll(".register-only");
  const toggleButtons = document.querySelectorAll(".toggle-button");

  toggleButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === authMode);
  });

  registerFields.forEach((field) => {
    field.classList.toggle("hidden", authMode !== "register");
  });
}

function renderDashboardView() {
  const template = document.querySelector("#dashboard-template");
  app.appendChild(template.content.cloneNode(true));

  const currentUser = getCurrentUser();
  document.querySelector("#user-role-badge").textContent =
    currentUser.role === "admin" ? "Administrator" : "Standard user";
  document.querySelector("#user-name").textContent = currentUser.name;
  document.querySelector("#user-email").textContent = currentUser.email;

  bindDashboardEvents();
  fillDashboardMetrics();
  renderReports();
  renderAdminArea();
  updateWizardUI();
}

function bindDashboardEvents() {
  document.querySelector("#logout-button").addEventListener("click", () => {
    state.currentUserId = null;
    saveState();
    reportWizardStep = 1;
    pendingPhoto = "";
    selectedReportType = "lost";
    renderApp();
  });

  document.querySelectorAll(".type-card").forEach((button) => {
    button.addEventListener("click", () => {
      selectedReportType = button.dataset.type;
      document
        .querySelectorAll(".type-card")
        .forEach((card) => card.classList.toggle("is-selected", card.dataset.type === selectedReportType));
    });
  });

  document.querySelector("#next-button").addEventListener("click", () => {
    if (!validateCurrentStep()) return;
    reportWizardStep += 1;
    updateWizardUI();
  });

  document.querySelector("#back-button").addEventListener("click", () => {
    reportWizardStep = Math.max(1, reportWizardStep - 1);
    updateWizardUI();
  });

  document.querySelector("#photo").addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;

    pendingPhoto = await readFileAsDataURL(file);
    const previewCard = document.querySelector("#preview-card");
    const previewImage = document.querySelector("#preview-image");
    previewImage.src = pendingPhoto;
    previewCard.classList.remove("hidden");
  });

  document.querySelector("#report-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateCurrentStep()) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const currentUser = getCurrentUser();
    const reportMessage = document.querySelector("#report-message");

    if (!pendingPhoto) {
      reportMessage.textContent = "Upload a photo before submitting the report.";
      return;
    }

    const report = {
      id: crypto.randomUUID(),
      type: selectedReportType,
      itemName: String(formData.get("itemName") || "").trim(),
      category: String(formData.get("category") || "").trim(),
      location: String(formData.get("location") || "").trim(),
      date: String(formData.get("date") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      image: pendingPhoto,
      status: "Pending",
      ownerUserId: currentUser.id,
      matchId: null,
      createdAt: new Date().toISOString(),
    };

    state.reports.unshift(report);
    const match = tryCreateMatch(report);

    if (match) {
      reportMessage.textContent =
        "Report submitted. A potential match was found and sent to the admin review queue.";
    } else {
      reportMessage.textContent = "Report submitted and added to the active tracking queue.";
    }

    saveState();
    form.reset();
    pendingPhoto = "";
    selectedReportType = "lost";
    reportWizardStep = 1;
    renderApp();
  });

  document.querySelector("#status-filter").addEventListener("change", renderReports);

  const searchInput = document.querySelector("#admin-search");
  if (searchInput) {
    searchInput.addEventListener("input", renderAdminTable);
  }
}

function validateCurrentStep() {
  const message = document.querySelector("#report-message");
  message.textContent = "";

  if (reportWizardStep === 2) {
    const requiredSelectors = ["#item-name", "#category", "#location", "#date", "#description"];
    const missing = requiredSelectors.some((selector) => !document.querySelector(selector).value.trim());
    if (missing) {
      message.textContent = "Complete all item details before moving to the next step.";
      return false;
    }
  }

  if (reportWizardStep === 3 && !pendingPhoto) {
    message.textContent = "Upload a clear photo to continue.";
    return false;
  }

  if (reportWizardStep === 4) {
    const reviewPanel = document.querySelector("#review-panel");
    reviewPanel.innerHTML = buildReviewMarkup();
  }

  return true;
}

function updateWizardUI() {
  document.querySelectorAll(".wizard-pane").forEach((pane) => {
    pane.classList.toggle("hidden", Number(pane.dataset.step) !== reportWizardStep);
  });

  document.querySelector("#wizard-step-label").textContent = `Step ${reportWizardStep} of 4`;
  document.querySelector("#back-button").classList.toggle("hidden", reportWizardStep === 1);
  document.querySelector("#next-button").classList.toggle("hidden", reportWizardStep === 4);
  document.querySelector("#submit-button").classList.toggle("hidden", reportWizardStep !== 4);

  if (reportWizardStep === 4) {
    document.querySelector("#review-panel").innerHTML = buildReviewMarkup();
  }
}

function buildReviewMarkup() {
  const readValue = (selector) => document.querySelector(selector).value.trim();

  return `
    <article class="review-item">
      <span>Report type</span>
      <strong>${capitalize(selectedReportType)}</strong>
    </article>
    <article class="review-item">
      <span>Item</span>
      <strong>${readValue("#item-name") || "Not provided"}</strong>
    </article>
    <article class="review-item">
      <span>Category and location</span>
      <strong>${readValue("#category") || "-"} at ${readValue("#location") || "-"}</strong>
    </article>
    <article class="review-item">
      <span>Date</span>
      <strong>${readValue("#date") || "-"}</strong>
    </article>
    <article class="review-item">
      <span>Description</span>
      <strong>${readValue("#description") || "-"}</strong>
    </article>
  `;
}

function fillDashboardMetrics() {
  const currentUser = getCurrentUser();
  const visibleReports =
    currentUser.role === "admin"
      ? state.reports
      : state.reports.filter((report) => report.ownerUserId === currentUser.id);
  const relevantMatches =
    currentUser.role === "admin"
      ? state.matches
      : state.matches.filter((match) => {
          const lost = getReport(match.lostReportId);
          const found = getReport(match.foundReportId);
          return [lost?.ownerUserId, found?.ownerUserId].includes(currentUser.id);
        });

  const highestConfidence = relevantMatches.reduce(
    (max, match) => Math.max(max, Number(match.confidence || 0)),
    0,
  );

  document.querySelector("#metric-active").textContent = visibleReports.filter(
    (report) => report.status !== "Returned",
  ).length;
  document.querySelector("#metric-matches").textContent = relevantMatches.filter(
    (match) => match.status === "Pending",
  ).length;
  document.querySelector("#metric-returned").textContent = visibleReports.filter(
    (report) => report.status === "Returned",
  ).length;
  document.querySelector("#metric-confidence").textContent = `${highestConfidence}%`;
}

function renderReports() {
  const currentUser = getCurrentUser();
  const reportsList = document.querySelector("#reports-list");
  const filter = document.querySelector("#status-filter").value;
  const reportsTitle = document.querySelector("#reports-title");

  const reports =
    currentUser.role === "admin"
      ? [...state.reports]
      : state.reports.filter((report) => report.ownerUserId === currentUser.id);

  reportsTitle.textContent = currentUser.role === "admin" ? "All reports snapshot" : "My reports";

  const filtered = reports.filter((report) => filter === "all" || report.status === filter);

  if (!filtered.length) {
    reportsList.innerHTML = `<p class="inline-message">No reports match the selected filter yet.</p>`;
    return;
  }

  reportsList.innerHTML = filtered
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((report) => {
      const match = report.matchId ? state.matches.find((item) => item.id === report.matchId) : null;
      const confidence = match ? `${match.confidence}% confidence` : "Awaiting match";

      return `
        <article class="report-card">
          <div class="report-top">
            <div>
              <h4>${escapeHtml(report.itemName)}</h4>
              <div class="report-meta">
                <span>${capitalize(report.type)}</span>
                <span>${escapeHtml(report.category)}</span>
                <span>${escapeHtml(report.location)}</span>
                <span>${escapeHtml(report.date)}</span>
              </div>
            </div>
            <span class="status-badge ${statusClass(report.status)}">${report.status}</span>
          </div>
          <p class="report-description">${escapeHtml(report.description)}</p>
          <div class="report-meta">
            <span>${confidence}</span>
            ${
              currentUser.role === "admin"
                ? `<span>Owner: ${escapeHtml(getUser(report.ownerUserId)?.name || "Unknown")}</span>`
                : ""
            }
          </div>
          <div class="report-image">
            <img src="${report.image}" alt="${escapeHtml(report.itemName)}" />
          </div>
        </article>
      `;
    })
    .join("");
}

function renderAdminArea() {
  const currentUser = getCurrentUser();
  const adminPanel = document.querySelector("#admin-panel");

  if (currentUser.role !== "admin") {
    adminPanel.classList.add("hidden");
    return;
  }

  adminPanel.classList.remove("hidden");
  renderMatches();
  renderAdminTable();
}

function renderMatches() {
  const matchesList = document.querySelector("#matches-list");
  const pendingMatches = state.matches
    .filter((match) => match.status === "Pending")
    .sort((a, b) => b.confidence - a.confidence);

  if (!pendingMatches.length) {
    matchesList.innerHTML = `<p class="inline-message">No pending matches. The queue is clear.</p>`;
    return;
  }

  matchesList.innerHTML = pendingMatches
    .map((match) => {
      const lostReport = getReport(match.lostReportId);
      const foundReport = getReport(match.foundReportId);
      if (!lostReport || !foundReport) return "";

      return `
        <article class="match-card">
          <div class="match-top">
            <div>
              <h4>${escapeHtml(lostReport.itemName)} vs ${escapeHtml(foundReport.itemName)}</h4>
              <div class="report-meta">
                <span>${escapeHtml(lostReport.category)}</span>
                <span>${escapeHtml(lostReport.location)}</span>
                <span>Lost by ${escapeHtml(getUser(lostReport.ownerUserId)?.name || "Unknown")}</span>
              </div>
            </div>
            <span class="confidence-badge">${match.confidence}% match</span>
          </div>

          <div class="match-images">
            <figure>
              <img src="${lostReport.image}" alt="Lost report image" />
              <figcaption>Lost report</figcaption>
            </figure>
            <figure>
              <img src="${foundReport.image}" alt="Found report image" />
              <figcaption>Found report</figcaption>
            </figure>
          </div>

          <p class="report-description">
            Admin review should confirm unique markers before approving the handover.
          </p>

          <div class="match-actions">
            <button class="primary-button" data-action="verify-match" data-match-id="${match.id}">
              Verify Match
            </button>
            <button class="ghost-button" data-action="mark-returned" data-match-id="${match.id}">
              Mark Returned
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  matchesList.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const { action, matchId } = button.dataset;
      if (action === "verify-match") {
        updateMatchStatus(matchId, "Verified");
      }
      if (action === "mark-returned") {
        updateMatchStatus(matchId, "Returned");
      }
    });
  });
}

function renderAdminTable() {
  const container = document.querySelector("#admin-table");
  if (!container) return;

  const query = String(document.querySelector("#admin-search")?.value || "")
    .trim()
    .toLowerCase();

  const rows = state.reports.filter((report) => {
    if (!query) return true;

    const user = getUser(report.ownerUserId);
    return [report.itemName, report.category, report.location, report.description, user?.name, user?.email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Type</th>
          <th>Category</th>
          <th>Owner</th>
          <th>Location</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((report) => {
            const user = getUser(report.ownerUserId);
            return `
              <tr>
                <td>${escapeHtml(report.itemName)}</td>
                <td>${capitalize(report.type)}</td>
                <td>${escapeHtml(report.category)}</td>
                <td>${escapeHtml(user?.name || "Unknown")}</td>
                <td>${escapeHtml(report.location)}</td>
                <td><span class="status-badge ${statusClass(report.status)}">${report.status}</span></td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function tryCreateMatch(newReport) {
  const oppositeType = newReport.type === "lost" ? "found" : "lost";
  const candidates = state.reports.filter(
    (report) =>
      report.id !== newReport.id &&
      report.type === oppositeType &&
      report.status !== "Returned" &&
      report.category.toLowerCase() === newReport.category.toLowerCase() &&
      report.location.toLowerCase() === newReport.location.toLowerCase(),
  );

  if (!candidates.length) return null;

  const bestCandidate = candidates
    .map((candidate) => ({
      candidate,
      score: computeConfidence(newReport, candidate),
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (bestCandidate.score < 60) return null;

  const lostReport = newReport.type === "lost" ? newReport : bestCandidate.candidate;
  const foundReport = newReport.type === "found" ? newReport : bestCandidate.candidate;
  const match = {
    id: crypto.randomUUID(),
    lostReportId: lostReport.id,
    foundReportId: foundReport.id,
    confidence: bestCandidate.score,
    status: "Pending",
    verifiedAt: null,
    returnedAt: null,
  };

  state.matches.unshift(match);
  lostReport.status = "Matched";
  foundReport.status = "Matched";
  lostReport.matchId = match.id;
  foundReport.matchId = match.id;
  return match;
}

function computeConfidence(reportA, reportB) {
  let score = 45;
  if (reportA.category === reportB.category) score += 18;
  if (reportA.location.toLowerCase() === reportB.location.toLowerCase()) score += 16;

  const dateDifference = Math.abs(
    new Date(reportA.date).getTime() - new Date(reportB.date).getTime(),
  );
  const dayDifference = dateDifference / (1000 * 60 * 60 * 24);
  if (dayDifference <= 1) score += 8;
  else if (dayDifference <= 3) score += 4;

  const descriptionWordsA = new Set(reportA.description.toLowerCase().split(/\W+/).filter(Boolean));
  const descriptionWordsB = new Set(reportB.description.toLowerCase().split(/\W+/).filter(Boolean));
  const overlap = [...descriptionWordsA].filter((word) => descriptionWordsB.has(word)).length;
  score += Math.min(overlap * 2, 13);

  return Math.min(score, 98);
}

function updateMatchStatus(matchId, status) {
  const match = state.matches.find((item) => item.id === matchId);
  if (!match) return;

  match.status = status;
  if (status === "Verified") {
    match.verifiedAt = new Date().toISOString();
  }
  if (status === "Returned") {
    match.returnedAt = new Date().toISOString();
  }

  [match.lostReportId, match.foundReportId].forEach((reportId) => {
    const report = getReport(reportId);
    if (report) report.status = status;
  });

  saveState();
  renderApp();
}

function getCurrentUser() {
  return state.users.find((user) => user.id === state.currentUserId) || null;
}

function getUser(userId) {
  return state.users.find((user) => user.id === userId) || null;
}

function getReport(reportId) {
  return state.reports.find((report) => report.id === reportId) || null;
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function statusClass(status) {
  return `status-${String(status).toLowerCase()}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
