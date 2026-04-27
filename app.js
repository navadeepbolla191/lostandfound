const STORAGE_KEY = "findit-state-v4-clean";
const SESSION_KEY = "findit-session-v4";
const ID_PATTERN = /^\d{2}B81A[A-Za-z0-9]{4}$/;
const CATEGORY_OPTIONS = ["Electronics", "Stationery", "Personal Items", "Documents", "Accessories"];
const LOCATION_OPTIONS = [
  "Main Library",
  "Canteen",
  "Block A",
  "Block B",
  "Admin Office",
  "Seminar Hall",
];

const uiState = {
  authMode: "login",
  reportStep: 1,
  reportType: "lost",
  pendingPhoto: "",
  passwordReset: {
    step: "request",
    institutionalId: "",
    email: "",
  },
  publicFilters: {
    query: "",
    type: "all",
    category: "all",
    location: "all",
  },
  reportStatusFilter: "all",
  adminSearch: "",
  lastSyncAt: null,
  isSyncing: false,
  lastServerError: null,
};

const app = document.querySelector("#app");
let state;

init();

async function init() {
  state = await loadState();
  renderApp();
  
  // Periodic sync every 60 seconds to keep devices consistent
  setInterval(syncStateFromServer, 60000);
}

function seedImage(label, colorA, colorB) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${colorA}" />
          <stop offset="100%" stop-color="${colorB}" />
        </linearGradient>
      </defs>
      <rect width="600" height="400" rx="28" fill="url(#g)" />
      <circle cx="490" cy="82" r="54" fill="rgba(255,255,255,0.22)" />
      <circle cx="120" cy="318" r="70" fill="rgba(255,255,255,0.12)" />
      <text x="48" y="210" font-size="40" font-family="Arial, sans-serif" fill="white">${label}</text>
    </svg>
  `)}`;
}

async function loadState(options = {}) {
  const { localFallback = true, createDefaultIfMissing = true } = options;

  try {
    const remoteState = await loadRemoteState();
    if (remoteState) {
      return remoteState;
    }
  } catch (error) {
    uiState.lastServerError = error.message;
    console.error("Failed to load remote FindIt data", error);
  }

  if (localFallback) {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const localState = normalizeState(JSON.parse(saved));
        // If we are here and remoteState failed, we use local but notify the UI if possible
        // For now, just return it but prioritize remote next time
        console.warn("Using local fallback for FindIt state. Data might be out of sync.");
        return localState;
      } catch (error) {
        console.error("Failed to parse stored FindIt data", error);
      }
    }
  }

  if (!createDefaultIfMissing) {
    return null;
  }

  const defaultState = normalizeState(createDefaultState());
  await saveState(defaultState);
  return defaultState;
}

async function loadRemoteState() {
  try {
    const response = await fetch(`/api/state?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      let errorMessage = `Server error: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.error) errorMessage = errorData.error;
      } catch (e) {
        // Fallback to status text
      }
      throw new Error(errorMessage);
    }
    const payload = await response.json();
    if (payload.state) {
      const remoteState = normalizeState(payload.state);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteState));
      return remoteState;
    }
    return null;
  } catch (error) {
    console.error("Failed to load remote FindIt data", error);
    throw error;
  }
}

async function syncStateFromServer() {
  if (uiState.isSyncing) return;
  uiState.isSyncing = true;
  renderApp();
  
  try {
    const remoteState = await loadRemoteState();
    if (remoteState) {
      state = remoteState;
      uiState.lastSyncAt = new Date();
      uiState.lastServerError = null;
    }
  } catch (err) {
    uiState.lastServerError = err.message;
    console.warn("Sync failed, operating in offline mode.", err);
  } finally {
    uiState.isSyncing = false;
    // Only perform full render if the user is not actively typing in a form
    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT");
    
    if (isTyping) {
      updatePublicResults();
      updateAdminResults();
    } else {
      renderApp();
    }
  }
}

function createDefaultState() {
  const accounts = [
    {
      id: "acc-admin-1",
      username: "navadeep",
      institutionalId: "26B81A0001",
      passwordSalt: "salt-navadeep-2026",
      passwordHash: "b1a0ccb6327aa5c4f8e30fe66d9a2ca380da99af1ea0f0c77ef09b157ec8af8b",
      role: "admin",
      profileId: "profile-admin-1",
      createdAt: "2026-04-20T08:00:00.000Z",
    },
    {
      id: "acc-admin-2",
      username: "cvr_college",
      institutionalId: "26B81A0002",
      passwordSalt: "salt-cvr-admin-2026",
      passwordHash: "684ced9ab7cc1c1232f7c7506e0d3dc30b447badfd6b3c0bf0318df7f4a1e8b2",
      role: "admin",
      profileId: "profile-admin-2",
      createdAt: "2026-04-20T08:02:00.000Z",
    },
  ];

  const userProfiles = [
    {
      id: "profile-admin-1",
      fullName: "Navadeep Bolla",
      department: "Administration",
      email: "26b81a0001@cvr.ac.in",
      phone: "Redacted",
    },
    {
      id: "profile-admin-2",
      fullName: "CVR Campus Operations",
      department: "Institutional Security",
      email: "26b81a0002@cvr.ac.in",
      phone: "Redacted",
    },
  ];

  const reportMedia = [];
  const visualFingerprints = [];

  const reports = [];
  const matches = [];
  const adminNotes = [];
  const auditHistory = [];

  return {
    accounts,
    userProfiles,
    reportMedia,
    visualFingerprints,
    reports,
    matches,
    adminNotes,
    auditHistory,
    passwordResetRequests: [],
    mailQueue: [],
    claims: [],
    currentSessionAccountId: null,
  };
}

function normalizeState(rawState) {
  if (!rawState) return createDefaultState();
  
  const nextState = {
    ...rawState,
    accounts: Array.isArray(rawState.accounts) ? rawState.accounts : [],
    reports: (Array.isArray(rawState.reports) ? rawState.reports : []).filter(r => !r.id.startsWith("report-")),
    matches: (Array.isArray(rawState.matches) ? rawState.matches : []).filter(m => !m.id.startsWith("match-")),
    userProfiles: (Array.isArray(rawState.userProfiles) ? rawState.userProfiles : []).filter(p => !p.id.startsWith("profile-user-")),
    accounts: (Array.isArray(rawState.accounts) ? rawState.accounts : []).filter(a => !a.id.startsWith("acc-user-")),
    reportMedia: (Array.isArray(rawState.reportMedia) ? rawState.reportMedia : []).filter(m => !m.id.startsWith("media-")),
    visualFingerprints: (Array.isArray(rawState.visualFingerprints) ? rawState.visualFingerprints : []).filter(f => !f.id.startsWith("fp-")),
    adminNotes: (Array.isArray(rawState.adminNotes) ? rawState.adminNotes : []).filter(n => !n.id.startsWith("note-")),
    auditHistory: (Array.isArray(rawState.auditHistory) ? rawState.auditHistory : []).filter(h => !h.id.startsWith("audit-")),
    passwordResetRequests: Array.isArray(rawState.passwordResetRequests) ? rawState.passwordResetRequests : [],
    mailQueue: Array.isArray(rawState.mailQueue) ? rawState.mailQueue : [],
    claims: Array.isArray(rawState.claims) ? rawState.claims : [],
  };

  const profileEmailByInstitutionalId = {
    "26B81A0001": "26b81a0001@cvr.ac.in",
    "26B81A0002": "26b81a0002@cvr.ac.in",
  };

  nextState.userProfiles = (nextState.userProfiles || []).map((profile) => {
    const linkedAccount = (nextState.accounts || []).find((account) => account.profileId === profile.id);
    if (!linkedAccount) return profile;
    const enforcedEmail = profileEmailByInstitutionalId[linkedAccount.institutionalId];
    return enforcedEmail ? { ...profile, email: enforcedEmail } : profile;
  });

  return nextState;
}

async function saveState(nextState = state) {
  const persistedState = {
    ...nextState,
    currentSessionAccountId: null,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));

  try {
    const response = await fetch("/api/state", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({ state: persistedState }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Shared state save failed with status ${response.status}`);
    }
  } catch (error) {
    console.error("Failed to persist FindIt state", error);
    // Notify user if possible (requires UI context)
    throw error;
  }
}

function renderApp() {
  const account = getCurrentAccount();
  app.innerHTML = `
    <main class="shell">
      ${renderTopbar(account)}
      ${renderHero(account)}
      ${renderPublicExplorer()}
      ${account ? renderDashboard(account) : ""}
    </main>
  `;
  bindEvents();
}

function renderTopbar(account) {
  const syncTime = uiState.lastSyncAt ? uiState.lastSyncAt.toLocaleTimeString() : "Never";
  return `
    <header class="topbar card">
      <div>
        <span class="eyebrow">Institutional Lost & Found</span>
        <div style="display: flex; align-items: center; gap: 12px;">
          <h2>FindIt</h2>
          <div class="meta-pill" style="font-size: 0.65rem; display: flex; align-items: center; gap: 6px;" title="${uiState.lastServerError || "No server errors"}">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${uiState.isSyncing ? "#f59e0b" : uiState.lastSyncAt ? "#10b981" : "#ef4444"};"></span>
            ${uiState.isSyncing ? "Syncing..." : uiState.lastSyncAt ? `Last Sync: ${syncTime}` : `Offline: ${uiState.lastServerError || "Token Missing"}`}
            <button class="text-button" data-action="sync-now" style="font-size: 0.8rem; text-decoration: none; padding: 0 4px; color: inherit;">🔄</button>
          </div>
        </div>
      </div>
      <div class="topbar-actions">
        ${
          account
            ? `
              <div class="user-badge" style="border-left: 2px solid var(--accent); padding-left: 1rem;">
                <span class="eyebrow" style="color: var(--accent); font-weight: 700;">SIGNED IN AS</span>
                <div style="display: flex; flex-direction: column;">
                  <strong style="font-size: 1.1rem;">${escapeHtml(account.username)}</strong>
                  <code style="font-size: 0.75rem; opacity: 0.8;">${escapeHtml(account.institutionalId)} (${account.role})</code>
                </div>
              </div>
              <button class="primary-button" onclick="document.getElementById('report-form').scrollIntoView({behavior:'smooth'})" style="padding: 0.5rem 1rem; font-size: 0.8rem;">+ Report Item</button>
              <button class="ghost-button" data-action="logout">Log Out</button>
            `
            : `
              <div class="user-badge">
                <span>Public access</span>
                <strong>Search without login</strong>
                <small>Login required only for restricted actions</small>
              </div>
            `
        }
      </div>
    </header>
  `;
}

function renderHero(account) {
  return `
    <section class="hero-grid">
      <section class="hero-panel card">
        <span class="eyebrow">Open public discovery</span>
        <h1>Search lost and found items before you ever sign in.</h1>
        <p class="hero-copy">
          Public visitors can browse reported items by category and location,
          while protected workflows use institutional IDs, hashed credentials,
          and admin-controlled visual verification before release.
        </p>
        <div class="security-strip">
          <article class="security-tile">
            <span>Public search</span>
            <strong>Lost and found gallery with category and location filters</strong>
          </article>
          <article class="security-tile">
            <span>Restricted identity</span>
            <strong>XXB81AXXXX institutional ID validation with one-way password hashing</strong>
          </article>
          <article class="security-tile">
            <span>Admin oversight</span>
            <strong>Visual fingerprint suggestions plus side-by-side verification authority</strong>
          </article>
        </div>
      </section>
      <aside class="auth-panel card">
        <span class="eyebrow">Restricted access</span>
        <h3>${account ? "Protected access is active" : "Login for reports and admin actions"}</h3>
        <p class="muted-copy">
          Institutional IDs must match the pattern <strong>XXB81AXXXX</strong>.
          Passwords are stored only as salted one-way hashes.
        </p>
        ${
          account
            ? `
              <div class="demo-admins">
                <span>Current session</span>
                <strong>${escapeHtml(account.username)} • ${escapeHtml(account.institutionalId)}</strong>
                <small>${account.role === "admin" ? "Admin verification controls unlocked." : "You can submit reports and monitor your own items."}</small>
              </div>
            `
            : `
              <div class="auth-tabs">
                <button class="tab-button ${uiState.authMode === "login" ? "is-active" : ""}" data-auth-mode="login">Sign In</button>
                <button class="tab-button ${uiState.authMode === "register" ? "is-active" : ""}" data-auth-mode="register">Register</button>
              </div>
              <div class="demo-admins">
                <span>Admin accounts for this update</span>
                <strong>navadeep • 26B81A0001</strong>
                <strong>cvr_college • 26B81A0002</strong>
                <small>Default admin passwords are supported for login, but only salted hashes are stored in app state.</small>
              </div>
              ${
                uiState.authMode === "login"
                  ? renderLoginForm()
                  : uiState.authMode === "register"
                    ? renderRegisterForm()
                    : renderForgotPasswordForm()
              }
            `
        }
      </aside>
    </section>
  `;
}

function renderLoginForm() {
  return `
    <form class="auth-form" id="login-form">
      <div class="field-group">
        <label for="login-id">Institutional ID</label>
        <input id="login-id" name="institutionalId" placeholder="26B81A0001" required />
      </div>
      <div class="field-group">
        <label for="login-password">Password</label>
        <input id="login-password" name="password" type="password" placeholder="Enter your password" required />
      </div>
      <button class="primary-button" type="submit">Authenticate</button>
      <button class="text-button" type="button" data-action="show-forgot-password">Forgot password?</button>
      <p class="inline-message" id="login-message"></p>
    </form>
  `;
}

function renderRegisterForm() {
  return `
    <form class="auth-form" id="register-form">
      <div class="form-grid">
        <div class="field-group">
          <label for="register-name">Full name</label>
          <input id="register-name" name="fullName" placeholder="Student name" required />
        </div>
        <div class="field-group">
          <label for="register-username">Username</label>
          <input id="register-username" name="username" placeholder="student_alias" required />
        </div>
      </div>
      <div class="form-grid">
        <div class="field-group">
          <label for="register-id">Institutional ID</label>
          <input id="register-id" name="institutionalId" placeholder="26B81A1038" required />
        </div>
        <div class="field-group">
          <label for="register-email">Institutional email</label>
          <input id="register-email" name="email" type="email" placeholder="26B81A1038@cvr.ac.in" required />
        </div>
      </div>
      <div class="form-grid">
        <div class="field-group">
          <label for="register-dept">Department</label>
          <input id="register-dept" name="department" placeholder="Computer Science" required />
        </div>
        <div class="field-group">
          <label for="register-password">Password</label>
          <input id="register-password" name="password" type="password" minlength="10" placeholder="Minimum 10 characters" required />
        </div>
      </div>
      <button class="primary-button" type="submit">Create user account</button>
      <p class="inline-message" id="register-message"></p>
    </form>
  `;
}

function renderForgotPasswordForm() {
  const latestMail = getLatestResetMail();
  const isVerifyStep = uiState.passwordReset.step === "verify";

  return `
    <form class="auth-form" id="forgot-password-form">
      <div class="field-group">
        <label for="forgot-id">Institutional ID</label>
        <input
          id="forgot-id"
          name="institutionalId"
          value="${escapeAttr(uiState.passwordReset.institutionalId)}"
          placeholder="26B81A1024"
          required
          ${isVerifyStep ? "readonly" : ""}
        />
      </div>
      <div class="field-group">
        <label for="forgot-email">Institutional email</label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          value="${escapeAttr(uiState.passwordReset.email)}"
          placeholder="26B81A1024@cvr.ac.in"
          required
          ${isVerifyStep ? "readonly" : ""}
        />
      </div>
      ${
        isVerifyStep
          ? `
            <div class="field-group">
              <label for="forgot-otp">OTP</label>
              <input id="forgot-otp" name="otp" inputmode="numeric" placeholder="6-digit OTP" required />
            </div>
            <div class="field-group">
              <label for="forgot-new-password">New password</label>
              <input id="forgot-new-password" name="newPassword" type="password" minlength="10" placeholder="Set a new password" required />
            </div>
          `
          : ""
      }
      <button class="primary-button" type="submit">${isVerifyStep ? "Verify OTP and reset password" : "Send OTP to institutional email"}</button>
      <button class="text-button" type="button" data-action="back-to-login">Back to login</button>
      <p class="inline-message" id="forgot-message"></p>
    </form>
    ${
      latestMail
        ? `
          <div class="mail-preview">
            <span class="eyebrow">Delivery log</span>
            <h3>Latest OTP dispatch</h3>
            <p class="muted-copy">
              The app attempted a live email delivery to ${escapeHtml(latestMail.email)}.
              OTP values are no longer exposed in the UI.
            </p>
            <div class="mail-preview-body">
              <strong>Channel:</strong> ${escapeHtml(latestMail.channel)}<br />
              <strong>Status:</strong> ${escapeHtml(latestMail.status)}<br />
              <strong>Requested:</strong> ${escapeHtml(formatDateTime(latestMail.createdAt))}<br />
              <strong>Expires:</strong> ${escapeHtml(formatDateTime(latestMail.expiresAt))}
            </div>
          </div>
        `
        : ""
    }
  `;
}

function updatePublicResults() {
  const container = document.querySelector(".public-list");
  const head = document.querySelector(".public-results-head h3");
  if (!container || !head) return;
  
  const visibleReports = getPublicReports();
  const viewer = getCurrentAccount();
  
  head.textContent = `${visibleReports.length} active items visible`;
  container.innerHTML = visibleReports.length
    ? visibleReports.map((report) => renderPublicCard(report, viewer)).join("")
    : `<div class="empty-state">No active items match the selected filters right now.</div>`;
    
  bindEvents(); // Re-bind events for new cards
}

function updateAdminResults() {
  const container = document.querySelector(".detail-list");
  if (!container) return;
  
  const searchableReports = getAdminSearchResults();
  container.innerHTML = searchableReports.length 
    ? searchableReports.map((report) => renderAdminDetail(report)).join("") 
    : `<div class="empty-state">No internal records match the admin search.</div>`;
    
  bindEvents(); // Re-bind events for new details
}

function renderPublicExplorer() {
  const visibleReports = getPublicReports();
  const viewer = getCurrentAccount();
  const categories = ["all", ...CATEGORY_OPTIONS];
  const locations = ["all", ...LOCATION_OPTIONS];

  return `
    <section class="public-grid">
      <aside class="filters-panel card">
        <span class="eyebrow">Public search</span>
        <h3>Browse by category and location</h3>
        <p class="muted-copy">
          Public visitors can inspect item photos, categories, and general locations.
          Reporter identity and contact information remain hidden.
        </p>
        <div class="field-group">
          <label for="public-query">Search title or description</label>
          <input id="public-query" value="${escapeAttr(uiState.publicFilters.query)}" placeholder="Earbuds, notebook, charger..." />
        </div>
        <div class="field-group">
          <label for="public-category">Category</label>
          <select id="public-category">
            ${categories.map((category) => `<option value="${category}" ${uiState.publicFilters.category === category ? "selected" : ""}>${category === "all" ? "All categories" : category}</option>`).join("")}
          </select>
        </div>
        <div class="field-group">
          <label for="public-location">Location</label>
          <select id="public-location">
            ${locations.map((location) => `<option value="${location}" ${uiState.publicFilters.location === location ? "selected" : ""}>${location === "all" ? "All locations" : location}</option>`).join("")}
          </select>
        </div>
        <div class="field-group">
          <span>Item type</span>
          <div class="type-filter-row">
            ${["all", "lost", "found"].map((type) => `
              <button class="type-chip ${uiState.publicFilters.type === type ? "is-active" : ""}" type="button" data-filter-type="${type}">
                ${type === "all" ? "All items" : capitalize(type)}
              </button>
            `).join("")}
          </div>
        </div>
      </aside>
      <section class="public-results card">
        <div class="public-results-head">
          <div>
            <span class="eyebrow">Public gallery</span>
            <h3>${visibleReports.length} active items visible</h3>
          </div>
          <div class="meta-pill">Returned items remain only in audit history</div>
        </div>
        <div class="public-list">
          ${
            visibleReports.length
              ? visibleReports.map((report) => renderPublicCard(report, viewer)).join("")
              : `<div class="empty-state">No active items match the selected filters right now.</div>`
          }
        </div>
      </section>
    </section>
  `;
}

function renderPublicCard(report, viewer) {
  const media = getMedia(report.mediaId);
  const existingClaim = viewer
    ? state.claims.find(
        (claim) => claim.reportId === report.id && claim.claimantAccountId === viewer.id,
      )
    : null;
  return `
    <article class="public-card">
      <img class="public-image" src="${media.image}" alt="${escapeAttr(report.itemName)}" />
      <div class="public-card-body">
        <div class="report-head">
          <div>
            <h4>${escapeHtml(report.itemName)}</h4>
            <p class="detail-copy">Reporter identity hidden • internal contact redacted</p>
          </div>
          <span class="status-badge ${statusClass(report.status)}">${report.status}</span>
        </div>
        <div class="meta-row">
          <span class="meta-pill">${capitalize(report.type)}</span>
          <span class="meta-pill">${escapeHtml(report.category)}</span>
          <span class="meta-pill">${escapeHtml(report.generalLocation)}</span>
        </div>
        <p class="report-description">${escapeHtml(report.description)}</p>
        <div class="meta-row">
          ${
            !viewer
              ? `<span class="meta-pill">Login required to claim</span>`
              : viewer.id === report.reporterAccountId
                ? `<span class="meta-pill">You posted this record</span>`
                : existingClaim
                  ? `<span class="meta-pill">Claim submitted: ${escapeHtml(existingClaim.status)}</span>`
                  : `<button class="ghost-button" data-action="claim-report" data-report-id="${report.id}">Claim this item</button>`
          }
        </div>
      </div>
    </article>
  `;
}

function renderDashboard(account) {
  const reports = getVisibleReportsForAccount(account);
  const matches = getVisibleMatchesForAccount(account);
  const highestConfidence = matches.reduce((max, match) => Math.max(max, match.confidence), 0);

  return `
    <section class="summary-grid">
      <article class="summary-card card">
        <span>Tracked records</span>
        <strong>${reports.length}</strong>
        <p class="detail-copy">Relationally linked reports visible to this session.</p>
      </article>
      <article class="summary-card card">
        <span>Visual matches</span>
        <strong>${matches.filter((match) => match.status === "Matched").length}</strong>
        <p class="detail-copy">Pending side-by-side admin review.</p>
      </article>
      <article class="summary-card card">
        <span>Verified items</span>
        <strong>${reports.filter((report) => report.status === "Verified").length}</strong>
        <p class="detail-copy">Ready for controlled handover.</p>
      </article>
      <article class="summary-card card">
        <span>Top confidence</span>
        <strong>${highestConfidence}%</strong>
        <p class="detail-copy">Highest active visual fingerprint similarity.</p>
      </article>
    </section>

    <section class="dashboard-grid">
      <section class="dashboard-panel card">
        <div class="section-head">
          <div>
            <span class="eyebrow">Restricted workflow</span>
            <h3>Submit a lost or found report</h3>
          </div>
          <div class="meta-pill">Login required</div>
        </div>
        ${renderReportForm()}
      </section>
      <section class="dashboard-panel card">
        <div class="section-head">
          <div>
            <span class="eyebrow">${account.role === "admin" ? "Institutional records" : "Your records"}</span>
            <h3>${account.role === "admin" ? "All item records" : "My submitted reports"}</h3>
          </div>
          <select id="report-status-filter">
            <option value="all" ${uiState.reportStatusFilter === "all" ? "selected" : ""}>All statuses</option>
            <option value="Pending" ${uiState.reportStatusFilter === "Pending" ? "selected" : ""}>Pending</option>
            <option value="Matched" ${uiState.reportStatusFilter === "Matched" ? "selected" : ""}>Matched</option>
            <option value="Verified" ${uiState.reportStatusFilter === "Verified" ? "selected" : ""}>Verified</option>
            <option value="Returned" ${uiState.reportStatusFilter === "Returned" ? "selected" : ""}>Returned</option>
          </select>
        </div>
        <div class="reports-list">
          ${renderReportCards(reports, account)}
        </div>
      </section>
    </section>

    ${
      account.role === "admin"
        ? renderAdminArea()
        : ""
    }
  `;
}

function renderReportForm() {
  return `
    <form class="report-form" id="report-form">
      <div class="field-group">
        <span>Report type</span>
        <div class="type-selector">
          ${["lost", "found"].map((type) => `
            <button class="type-chip ${uiState.reportType === type ? "is-active" : ""}" data-report-type="${type}" type="button">
              ${capitalize(type)}
            </button>
          `).join("")}
        </div>
      </div>
      <div class="form-grid">
        <div class="field-group">
          <label for="report-item">Item name</label>
          <input id="report-item" name="itemName" placeholder="Grey earbuds case" required />
        </div>
        <div class="field-group">
          <label for="report-category">Category</label>
          <input id="report-category" name="category" placeholder="Electronics, Stationery, etc." list="category-suggestions" required />
          <datalist id="category-suggestions">
            ${CATEGORY_OPTIONS.map((category) => `<option value="${category}"></option>`).join("")}
          </datalist>
        </div>
      </div>
      <div class="form-grid">
        <div class="field-group">
          <label for="report-location">Specific location</label>
          <input id="report-location" name="location" placeholder="Library Floor 2, Room 301, etc." list="location-suggestions" required />
          <datalist id="location-suggestions">
            ${LOCATION_OPTIONS.map((location) => `<option value="${location}"></option>`).join("")}
          </datalist>
        </div>
        <div class="field-group">
          <label for="report-date">Date</label>
          <input id="report-date" name="date" type="date" required />
        </div>
      </div>
      <div class="field-group">
        <label for="report-general-location">General location shown publicly</label>
        <input id="report-general-location" name="generalLocation" placeholder="Main Library, floor 1" required />
      </div>
      <div class="field-group">
        <label for="report-description">Description</label>
        <textarea id="report-description" name="description" placeholder="Describe scratches, labels, case texture, or distinctive marks." required></textarea>
      </div>
      <div class="field-group">
        <label class="upload-box" for="report-photo">
          <input id="report-photo" name="photo" type="file" accept="image/*" required />
          <span>Upload an item image</span>
          <small>Used to generate a visual fingerprint for internal matching.</small>
        </label>
      </div>
      <div id="report-preview-wrap">
        ${uiState.pendingPhoto ? `<img class="preview-image" src="${uiState.pendingPhoto}" alt="Uploaded preview" />` : ""}
      </div>
      <div class="wizard-actions" style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--surface-border);">
        <button class="primary-button" type="submit" style="width: 100%; padding: 1rem;">Submit Protected Report to Database</button>
      </div>
      <p class="inline-message" id="report-message"></p>
    </form>
  `;
}

function renderReportCards(reports, account) {
  const filtered = reports
    .filter((report) => uiState.reportStatusFilter === "all" || report.status === uiState.reportStatusFilter)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (!filtered.length) {
    return `<div class="empty-state">No reports match the selected status filter.</div>`;
  }

  return filtered.map((report) => {
    const media = getMedia(report.mediaId);
    const fingerprint = getFingerprint(report.fingerprintId);
    const owner = getAccount(report.reporterAccountId);
    const profile = owner ? getProfile(owner.profileId) : null;
    const reportMatches = getMatchesForReport(report.id);
    const topMatch = reportMatches.sort((a, b) => b.confidence - a.confidence)[0];

    return `
      <article class="report-card">
        <img class="report-image" src="${media.image}" alt="${escapeAttr(report.itemName)}" />
        <div class="report-body">
          <div class="report-head">
            <div>
              <h4>${escapeHtml(report.itemName)}</h4>
              <div class="meta-row">
                <span class="meta-pill">${capitalize(report.type)}</span>
                <span class="meta-pill">${escapeHtml(report.category)}</span>
                <span class="meta-pill">${escapeHtml(report.location)}</span>
                <span class="meta-pill">${escapeHtml(report.date)}</span>
              </div>
            </div>
            <span class="status-badge ${statusClass(report.status)}">${report.status}</span>
          </div>
          <p class="report-description">${escapeHtml(report.description)}</p>
          <div class="fingerprint-grid">
            <article class="fingerprint-card">
              <span>Palette</span>
              <strong>${escapeHtml(fingerprint.palette)}</strong>
            </article>
            <article class="fingerprint-card">
              <span>Texture</span>
              <strong>${escapeHtml(fingerprint.texture)}</strong>
            </article>
            <article class="fingerprint-card">
              <span>Contour</span>
              <strong>${escapeHtml(fingerprint.contour)}</strong>
            </article>
          </div>
          <div class="meta-row">
            <span class="confidence-badge">${topMatch ? `${topMatch.confidence}% pipeline score` : "Awaiting visual match"}</span>
            ${
              account.role === "admin"
                ? `<span class="meta-pill">Reporter: ${escapeHtml(profile.fullName)} • ${escapeHtml(owner.institutionalId)}</span>`
                : ""
            }
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderAdminArea() {
  const queue = state.matches
    .filter((match) => match.status === "Matched")
    .sort((a, b) => b.confidence - a.confidence);
  const searchableReports = getAdminSearchResults();
  const auditEvents = [...state.auditHistory].sort((a, b) => new Date(b.at) - new Date(a.at));

  return `
    <section class="admin-grid">
      <section class="admin-panel card">
        <div class="section-head">
          <div>
            <span class="eyebrow">Visual Verification Pipeline</span>
            <h3>Suggested match queue</h3>
          </div>
          <div class="meta-pill">${queue.length} awaiting admin decision</div>
        </div>
        <div class="matches-list">
          ${queue.length ? queue.map((match) => renderMatchCard(match)).join("") : `<div class="empty-state">No open match suggestions. The queue is clear.</div>`}
        </div>
      </section>
      <section class="admin-panel card">
        <div class="section-head">
          <div>
            <span class="eyebrow">Master access</span>
            <h3>Full item, profile, and audit view</h3>
          </div>
          <input id="admin-search" class="admin-search" value="${escapeAttr(uiState.adminSearch)}" placeholder="Search report, reporter, note, ID, location..." />
        </div>
        <div class="detail-list">
          ${searchableReports.length ? searchableReports.map((report) => renderAdminDetail(report)).join("") : `<div class="empty-state">No internal records match the admin search.</div>`}
        </div>
        <div class="audit-list">
          <div class="card-head">
            <div>
              <span class="eyebrow">Audit history</span>
              <h3>Lifecycle archive</h3>
            </div>
          </div>
          ${auditEvents.map((event) => renderAuditCard(event)).join("")}
        </div>
      </section>
    </section>
  `;
}

function renderMatchCard(match) {
  const lostReport = getReport(match.lostReportId);
  const foundReport = getReport(match.foundReportId);
  const lostProfile = getProfile(getAccount(lostReport.reporterAccountId).profileId);
  const foundProfile = getProfile(getAccount(foundReport.reporterAccountId).profileId);
  const lostFingerprint = getFingerprint(lostReport.fingerprintId);
  const foundFingerprint = getFingerprint(foundReport.fingerprintId);

  return `
    <article class="match-card">
      <div class="match-body">
        <div class="match-head">
          <div>
            <h4>${escapeHtml(lostReport.itemName)} ↔ ${escapeHtml(foundReport.itemName)}</h4>
            <p class="detail-copy">${escapeHtml(match.verificationNotes)}</p>
          </div>
          <span class="confidence-badge">${match.confidence}% similarity</span>
        </div>
        <div class="match-comparison">
          <figure class="compare-panel">
            <img class="compare-image" src="${getMedia(lostReport.mediaId).image}" alt="Lost report image" />
            <figcaption>
              Lost report • ${escapeHtml(lostProfile.fullName)} • ${escapeHtml(lostReport.location)}
            </figcaption>
          </figure>
          <figure class="compare-panel">
            <img class="compare-image" src="${getMedia(foundReport.mediaId).image}" alt="Found report image" />
            <figcaption>
              Found report • ${escapeHtml(foundProfile.fullName)} • ${escapeHtml(foundReport.location)}
            </figcaption>
          </figure>
        </div>
        <div class="fingerprint-grid">
          <article class="fingerprint-card">
            <span>Lost fingerprint</span>
            <strong>${escapeHtml(lostFingerprint.palette)} / ${escapeHtml(lostFingerprint.texture)}</strong>
          </article>
          <article class="fingerprint-card">
            <span>Found fingerprint</span>
            <strong>${escapeHtml(foundFingerprint.palette)} / ${escapeHtml(foundFingerprint.texture)}</strong>
          </article>
          <article class="fingerprint-card">
            <span>Hash signature</span>
            <strong>${escapeHtml(lostFingerprint.imageHash)} ↔ ${escapeHtml(foundFingerprint.imageHash)}</strong>
          </article>
        </div>
        <div class="match-actions">
          <button class="primary-button" data-action="verify-match" data-match-id="${match.id}">Verify ownership</button>
        </div>
      </div>
    </article>
  `;
}

function renderAdminDetail(report) {
  const account = getAccount(report.reporterAccountId);
  const profile = getProfile(account.profileId);
  const fingerprint = getFingerprint(report.fingerprintId);
  const notes = state.adminNotes.filter((note) => note.reportId === report.id);
  const matches = getMatchesForReport(report.id);
  const verifiedMatch = matches.find((match) => match.status === "Verified");
  const claims = state.claims.filter((claim) => claim.reportId === report.id);

  return `
    <article class="detail-card">
      <div class="card-head">
        <div>
          <h4>${escapeHtml(report.itemName)}</h4>
          <p class="detail-copy">${capitalize(report.type)} • ${escapeHtml(report.category)} • ${escapeHtml(report.location)}</p>
        </div>
        <span class="status-badge ${statusClass(report.status)}">${report.status}</span>
      </div>
      <div class="detail-grid">
        <div class="meta-row">
          <span class="meta-pill">Reporter: ${escapeHtml(profile.fullName)}</span>
          <span class="meta-pill">Institutional ID: ${escapeHtml(account.institutionalId)}</span>
          <span class="meta-pill">Profile email: ${escapeHtml(profile.email)}</span>
        </div>
        <p class="report-description">${escapeHtml(report.description)}</p>
        <ul>
          <li>General public location: ${escapeHtml(report.generalLocation)}</li>
          <li>Visual fingerprint: ${escapeHtml(fingerprint.palette)}, ${escapeHtml(fingerprint.texture)}, ${escapeHtml(fingerprint.contour)}</li>
          <li>Internal fingerprint keywords: ${fingerprint.keywords.map(escapeHtml).join(", ")}</li>
          <li>Related matches: ${matches.length ? matches.map((match) => `${match.status} (${match.confidence}%)`).join(", ") : "None yet"}</li>
        </ul>
        ${
          claims.length
            ? `
              <div class="audit-card">
                <strong>Claims</strong>
                <ul>${claims.map((claim) => {
                  const claimant = getAccount(claim.claimantAccountId);
                  const claimantProfile = claimant ? getProfile(claimant.profileId) : null;
                  return `<li>${escapeHtml(claimantProfile?.fullName || claimant?.username || "Unknown")} • ${escapeHtml(claim.status)} • ${escapeHtml(claim.createdAt.slice(0, 10))}</li>`;
                }).join("")}</ul>
              </div>
            `
            : ""
        }
        ${
          verifiedMatch
            ? `
              <div class="report-actions">
                <button class="ghost-button" data-action="return-match" data-match-id="${verifiedMatch.id}">
                  Mark item as returned
                </button>
                <button class="ghost-button" data-action="delete-report" data-report-id="${report.id}">
                  Delete post
                </button>
              </div>
            `
            : `
              <div class="report-actions">
                <button class="ghost-button" data-action="delete-report" data-report-id="${report.id}">
                  Delete post
                </button>
              </div>
            `
        }
        ${
          notes.length
            ? `
              <div class="audit-card">
                <strong>Internal notes</strong>
                <ul>${notes.map((note) => `<li>${escapeHtml(note.body)}</li>`).join("")}</ul>
              </div>
            `
            : ""
        }
      </div>
    </article>
  `;
}

function renderAuditCard(event) {
  const actor =
    event.actorAccountId === "system"
      ? { label: "system pipeline" }
      : getAccount(event.actorAccountId);
  const subject = event.reportId
    ? getReport(event.reportId)?.itemName || "Record"
    : event.subject || "Account activity";

  return `
    <article class="audit-card">
      <span>${escapeHtml(event.action)}</span>
      <strong>${escapeHtml(subject)}</strong>
      <p class="detail-copy">${escapeHtml(event.details)}</p>
      <p class="detail-copy">${formatDateTime(event.at)} • ${escapeHtml(actor.label || actor.username)}</p>
    </article>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      uiState.authMode = button.dataset.authMode;
      resetPasswordUiState();
      renderApp();
    });
  });

  document.querySelector("#public-query")?.addEventListener("input", (event) => {
    uiState.publicFilters.query = event.target.value;
    updatePublicResults();
  });

  document.querySelector("#public-category")?.addEventListener("change", (event) => {
    uiState.publicFilters.category = event.target.value;
    updatePublicResults();
  });

  document.querySelector("#public-location")?.addEventListener("change", (event) => {
    uiState.publicFilters.location = event.target.value;
    updatePublicResults();
  });

  document.querySelectorAll("[data-filter-type]").forEach((button) => {
    button.addEventListener("click", () => {
      uiState.publicFilters.type = button.dataset.filterType;
      renderApp();
    });
  });

  document.querySelector("[data-action='logout']")?.addEventListener("click", () => {
    clearSessionAccountId();
    uiState.pendingPhoto = "";
    renderApp();
  });

  document.querySelector("#login-form")?.addEventListener("submit", handleLogin);
  document.querySelector("#register-form")?.addEventListener("submit", handleRegister);
  document.querySelector("#forgot-password-form")?.addEventListener("submit", handleForgotPassword);
  document.querySelector("[data-action='show-forgot-password']")?.addEventListener("click", () => {
    uiState.authMode = "forgot";
    resetPasswordUiState();
    renderApp();
  });
  document.querySelector("[data-action='back-to-login']")?.addEventListener("click", () => {
    uiState.authMode = "login";
    resetPasswordUiState();
    renderApp();
  });
  document.querySelectorAll("[data-report-type]").forEach((button) => {
    button.addEventListener("click", () => {
      uiState.reportType = button.dataset.reportType;
      document.querySelectorAll("[data-report-type]").forEach((chip) => {
        chip.classList.toggle("is-active", chip.dataset.reportType === uiState.reportType);
      });
    });
  });
  document.querySelector("#report-photo")?.addEventListener("change", handlePhotoChange);
  document.querySelector("#report-form")?.addEventListener("submit", handleReportSubmit);
  document.querySelector("#report-status-filter")?.addEventListener("change", (event) => {
    uiState.reportStatusFilter = event.target.value;
    renderApp();
  });
  document.querySelector("#admin-search")?.addEventListener("input", (event) => {
    uiState.adminSearch = event.target.value;
    updateAdminResults();
  });
  document.querySelectorAll("[data-action='verify-match']").forEach((button) => {
    button.addEventListener("click", async () => updateMatchLifecycle(button.dataset.matchId, "Verified"));
  });
  document.querySelectorAll("[data-action='return-match']").forEach((button) => {
    button.addEventListener("click", async () => updateMatchLifecycle(button.dataset.matchId, "Returned"));
  });
  document.querySelectorAll("[data-action='claim-report']").forEach((button) => {
    button.addEventListener("click", async () => claimReport(button.dataset.reportId));
  });
  document.querySelectorAll("[data-action='delete-report']").forEach((button) => {
    button.addEventListener("click", async () => deleteReport(button.dataset.reportId));
  });
  document.querySelectorAll("[data-action='sync-now']").forEach((button) => {
    button.addEventListener("click", syncStateFromServer);
  });
}

async function handleLogin(event) {
  event.preventDefault();
  const message = document.querySelector("#login-message");
  const formData = new FormData(event.currentTarget);
  const institutionalId = String(formData.get("institutionalId") || "").trim().toUpperCase();
  const password = String(formData.get("password") || "");

  if (!ID_PATTERN.test(institutionalId)) {
    setMessage(message, "Institutional ID must match the XXB81AXXXX format.", "error");
    return;
  }

  await syncStateFromServer();

  const account = state.accounts.find((candidate) => candidate.institutionalId === institutionalId);
  if (!account) {
    setMessage(message, "No account found for that institutional ID.", "error");
    return;
  }

  const passwordHash = await hashPassword(password, account.passwordSalt);
  if (passwordHash !== account.passwordHash) {
    setMessage(message, "Invalid password for that institutional ID.", "error");
    return;
  }

  setSessionAccountId(account.id);
  renderApp();
}

async function handleRegister(event) {
  event.preventDefault();
  const message = document.querySelector("#register-message");
  const formData = new FormData(event.currentTarget);
  const fullName = String(formData.get("fullName") || "").trim();
  const username = String(formData.get("username") || "").trim();
  const institutionalId = String(formData.get("institutionalId") || "").trim().toUpperCase();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const department = String(formData.get("department") || "").trim();
  const password = String(formData.get("password") || "");

  if (!ID_PATTERN.test(institutionalId)) {
    setMessage(message, "Institutional ID must follow the XXB81AXXXX format.", "error");
    return;
  }

  const expectedEmail = `${institutionalId.toLowerCase()}@cvr.ac.in`;
  if (email !== expectedEmail) {
    setMessage(
      message,
      `Institutional email must exactly match ${expectedEmail}.`,
      "error",
    );
    return;
  }

  if (password.length < 10) {
    setMessage(message, "Choose a password with at least 10 characters.", "error");
    return;
  }

  await syncStateFromServer();

  if (state.accounts.some((account) => account.institutionalId === institutionalId || account.username === username)) {
    setMessage(message, "That institutional ID or username is already registered.", "error");
    return;
  }

  const profileId = crypto.randomUUID();
  const accountId = crypto.randomUUID();
  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(password, salt);

  state.userProfiles.push({
    id: profileId,
    fullName,
    department,
    email,
    phone: "Private",
  });

  state.accounts.push({
    id: accountId,
    username,
    institutionalId,
    passwordSalt: salt,
    passwordHash,
    role: "user",
    profileId,
    createdAt: new Date().toISOString(),
  });

  setSessionAccountId(accountId);
  await saveState();
  renderApp();
}

async function handleForgotPassword(event) {
  event.preventDefault();
  const message = document.querySelector("#forgot-message");
  const formData = new FormData(event.currentTarget);
  const institutionalId = String(formData.get("institutionalId") || "").trim().toUpperCase();
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!ID_PATTERN.test(institutionalId)) {
    setMessage(message, "Institutional ID must follow the XXB81AXXXX format.", "error");
    return;
  }

  await syncStateFromServer();

  const expectedEmail = `${institutionalId.toLowerCase()}@cvr.ac.in`;
  if (email !== expectedEmail) {
    setMessage(message, `Institutional email must exactly match ${expectedEmail}.`, "error");
    return;
  }

  const account = state.accounts.find((candidate) => candidate.institutionalId === institutionalId);
  if (!account) {
    setMessage(message, "No existing user is registered for that institutional ID.", "error");
    return;
  }

  const profile = getProfile(account.profileId);
  if (!profile || profile.email.toLowerCase() !== email) {
    setMessage(message, "The provided institutional email does not match our stored record.", "error");
    return;
  }

  if (uiState.passwordReset.step === "request") {
    const otp = generateOtp();
    const otpSalt = crypto.randomUUID();
    const otpHash = await hashPassword(otp, otpSalt);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    state.passwordResetRequests = state.passwordResetRequests.filter(
      (request) => request.accountId !== account.id,
    );
    state.passwordResetRequests.unshift({
      id: crypto.randomUUID(),
      accountId: account.id,
      email,
      otpSalt,
      otpHash,
      expiresAt,
      consumed: false,
      createdAt: new Date().toISOString(),
    });

    try {
      const delivery = await sendOtpEmail({
        email,
        institutionalId,
        otp,
        expiresAt,
      });

      state.mailQueue.unshift({
        id: crypto.randomUUID(),
        accountId: account.id,
        email,
        expiresAt,
        createdAt: new Date().toISOString(),
        purpose: "PASSWORD_RESET",
        channel: "vercel-email",
        status: delivery.status || "sent",
        providerMessageId: delivery.id || "",
      });
    } catch (error) {
      state.passwordResetRequests = state.passwordResetRequests.filter(
        (request) => request.accountId !== account.id,
      );
      await saveState();
      setMessage(
        message,
        error instanceof Error ? error.message : "OTP delivery failed. Please try again.",
        "error",
      );
      return;
    }

    uiState.passwordReset = {
      step: "verify",
      institutionalId,
      email,
    };
    await saveState();
    renderApp();
    const refreshedMessage = document.querySelector("#forgot-message");
    setMessage(
      refreshedMessage,
      "OTP sent to the stored institutional email record. Check your inbox and enter the code below.",
      "success",
    );
    return;
  }

  const otp = String(formData.get("otp") || "").trim();
  const newPassword = String(formData.get("newPassword") || "");

  if (!/^\d{6}$/.test(otp)) {
    setMessage(message, "Enter the 6-digit OTP sent to the institutional email.", "error");
    return;
  }

  if (newPassword.length < 10) {
    setMessage(message, "New password must be at least 10 characters.", "error");
    return;
  }

  const resetRequest = state.passwordResetRequests.find(
    (request) => request.accountId === account.id && !request.consumed,
  );

  if (!resetRequest) {
    setMessage(message, "No active OTP request was found. Please request a new OTP.", "error");
    return;
  }

  if (new Date(resetRequest.expiresAt).getTime() < Date.now()) {
    setMessage(message, "The OTP has expired. Request a new one.", "error");
    return;
  }

  const otpHash = await hashPassword(otp, resetRequest.otpSalt);
  if (otpHash !== resetRequest.otpHash) {
    setMessage(message, "Invalid OTP for this reset request.", "error");
    return;
  }

  const newSalt = crypto.randomUUID();
  account.passwordSalt = newSalt;
  account.passwordHash = await hashPassword(newPassword, newSalt);
  resetRequest.consumed = true;

  state.auditHistory.unshift({
    id: crypto.randomUUID(),
    reportId: null,
    subject: account.institutionalId,
    action: "PASSWORD_RESET",
    actorAccountId: account.id,
    at: new Date().toISOString(),
    details: "User completed OTP-based password reset through institutional email verification.",
  });

  await saveState();
  uiState.authMode = "login";
  resetPasswordUiState();
  renderApp();
  const loginMessage = document.querySelector("#login-message");
  setMessage(loginMessage, "Password updated. You can now sign in with the new password.", "success");
}

async function handlePhotoChange(event) {
  const [file] = event.target.files || [];
  if (!file) return;
  uiState.pendingPhoto = await readFileAsDataURL(file);
  const previewWrap = document.querySelector("#report-preview-wrap");
  if (previewWrap) {
    previewWrap.innerHTML = `<img class="preview-image" src="${uiState.pendingPhoto}" alt="Uploaded preview" />`;
  }
}

async function handleReportSubmit(event) {
  event.preventDefault();
  const message = document.querySelector("#report-message");
  const account = getCurrentAccount();

  if (!account) {
    setMessage(message, "Login is required before you can submit a protected report.", "error");
    return;
  }

  if (!uiState.pendingPhoto) {
    setMessage(message, "Upload an item image so the Visual Verification Pipeline can fingerprint it.", "error");
    return;
  }

  const formData = new FormData(event.currentTarget);
  const itemName = String(formData.get("itemName") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const date = String(formData.get("date") || "").trim();
  const generalLocation = String(formData.get("generalLocation") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!itemName || !category || !location || !date || !generalLocation || !description) {
    setMessage(message, "Complete all report fields before submitting.", "error");
    return;
  }

  const mediaId = crypto.randomUUID();
  const fingerprintId = crypto.randomUUID();
  const reportId = crypto.randomUUID();
  const fingerprint = buildFingerprint(uiState.pendingPhoto, description, itemName);

  state.reportMedia.push({ id: mediaId, image: uiState.pendingPhoto });
  state.visualFingerprints.push({ id: fingerprintId, ...fingerprint });

  const report = {
    id: reportId,
    itemName,
    type: uiState.reportType,
    category,
    location,
    date,
    description,
    status: "Pending",
    reporterAccountId: account.id,
    mediaId,
    fingerprintId,
    generalLocation,
    createdAt: new Date().toISOString(),
  };

  state.reports.unshift(report);
  state.auditHistory.unshift({
    id: crypto.randomUUID(),
    reportId,
    action: "CREATED",
    actorAccountId: account.id,
    at: new Date().toISOString(),
    details: "Protected report submitted into the pending institutional queue.",
  });

  const newMatch = tryCreateVisualMatch(report);
  if (newMatch) {
    setMessage(message, "Report submitted. A high-confidence visual match was suggested for admin review.", "success");
  } else {
    setMessage(message, "Report submitted. It is now visible in public search as a pending record.", "success");
  }

  await saveState();
  uiState.pendingPhoto = "";
  event.currentTarget.reset();
  renderApp();
}

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 120000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );

  return [...new Uint8Array(bits)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function buildFingerprint(imageData, description, itemName) {
  const source = `${itemName}|${description}|${imageData.slice(0, 64)}`;
  const hash = simpleHash(source);
  const paletteOptions = ["teal-slate", "cobalt-sky", "amber-white", "charcoal-silver", "crimson-black"];
  const textureOptions = ["matte-plastic", "paper-soft", "hard-shell", "fabric-knit", "laminated"];
  const contourOptions = ["rounded-case", "flat-book", "looped", "rectangular", "card-flat"];

  return {
    palette: paletteOptions[hash % paletteOptions.length],
    texture: textureOptions[(hash >> 2) % textureOptions.length],
    contour: contourOptions[(hash >> 4) % contourOptions.length],
    imageHash: `${hash.toString(16).slice(0, 4)}-${simpleHash(description).toString(16).slice(0, 4)}-${simpleHash(itemName).toString(16).slice(0, 2)}`,
    keywords: description.toLowerCase().split(/\W+/).filter(Boolean).slice(0, 4),
  };
}

function tryCreateVisualMatch(newReport) {
  const oppositeType = newReport.type === "lost" ? "found" : "lost";
  const candidates = state.reports.filter((report) => {
    return (
      report.id !== newReport.id &&
      report.type === oppositeType &&
      report.status !== "Returned" &&
      report.category === newReport.category &&
      report.location === newReport.location
    );
  });

  if (!candidates.length) return null;

  const best = candidates
    .map((candidate) => ({
      candidate,
      confidence: computeVisualConfidence(newReport, candidate),
    }))
    .sort((left, right) => right.confidence - left.confidence)[0];

  if (best.confidence < 72) return null;

  const lostReport = newReport.type === "lost" ? newReport : best.candidate;
  const foundReport = newReport.type === "found" ? newReport : best.candidate;
  const match = {
    id: crypto.randomUUID(),
    lostReportId: lostReport.id,
    foundReportId: foundReport.id,
    confidence: best.confidence,
    status: "Matched",
    reviewedByAccountId: null,
    createdAt: new Date().toISOString(),
    verificationNotes: "Visual Verification Pipeline aligned category, location, temporal proximity, and fingerprint traits.",
  };

  state.matches.unshift(match);
  lostReport.status = "Matched";
  foundReport.status = "Matched";
  state.auditHistory.unshift({
    id: crypto.randomUUID(),
    reportId: newReport.id,
    action: "MATCH_SUGGESTED",
    actorAccountId: "system",
    at: new Date().toISOString(),
    details: `Pipeline suggested a ${best.confidence}% similarity for admin review.`,
  });
  return match;
}

function computeVisualConfidence(reportA, reportB) {
  const fpA = getFingerprint(reportA.fingerprintId);
  const fpB = getFingerprint(reportB.fingerprintId);
  let score = 50;

  if (reportA.category === reportB.category) score += 12;
  if (reportA.location === reportB.location) score += 10;
  if (fpA.palette === fpB.palette) score += 9;
  if (fpA.texture === fpB.texture) score += 7;
  if (fpA.contour === fpB.contour) score += 7;

  const keywordsA = new Set(fpA.keywords);
  const overlap = fpB.keywords.filter((word) => keywordsA.has(word)).length;
  score += Math.min(overlap * 3, 9);

  const dayDifference =
    Math.abs(new Date(reportA.date).getTime() - new Date(reportB.date).getTime()) /
    (1000 * 60 * 60 * 24);
  if (dayDifference <= 1) score += 6;
  else if (dayDifference <= 3) score += 3;

  return Math.min(score, 98);
}

async function updateMatchLifecycle(matchId, nextStatus) {
  const account = getCurrentAccount();
  if (!account || account.role !== "admin") return;

  const match = state.matches.find((item) => item.id === matchId);
  if (!match) return;
  if (nextStatus === "Returned" && match.status !== "Verified") return;

  match.status = nextStatus;
  match.reviewedByAccountId = account.id;

  const relatedReports = [getReport(match.lostReportId), getReport(match.foundReportId)].filter(Boolean);
  relatedReports.forEach((report) => {
    report.status = nextStatus;
    state.auditHistory.unshift({
      id: crypto.randomUUID(),
      reportId: report.id,
      action: nextStatus.toUpperCase(),
      actorAccountId: account.id,
      at: new Date().toISOString(),
      details:
        nextStatus === "Verified"
          ? "Admin performed side-by-side photo review and verified ownership."
          : "Item was physically returned and archived out of public search.",
    });
  });

  await saveState();
  renderApp();
}

function getPublicReports() {
  const query = uiState.publicFilters.query.trim().toLowerCase();
  return state.reports
    .filter((report) => report.status !== "Returned")
    .filter((report) => uiState.publicFilters.type === "all" || report.type === uiState.publicFilters.type)
    .filter((report) => uiState.publicFilters.category === "all" || report.category === uiState.publicFilters.category)
    .filter((report) => uiState.publicFilters.location === "all" || report.location === uiState.publicFilters.location)
    .filter((report) => {
      if (!query) return true;
      return [report.itemName, report.description, report.generalLocation]
        .some((value) => value.toLowerCase().includes(query));
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getVisibleReportsForAccount(account) {
  const reports =
    account.role === "admin"
      ? state.reports
      : state.reports.filter((report) => report.reporterAccountId === account.id);
  return [...reports];
}

function getVisibleMatchesForAccount(account) {
  if (account.role === "admin") return [...state.matches];
  return state.matches.filter((match) => {
    const lostReport = getReport(match.lostReportId);
    const foundReport = getReport(match.foundReportId);
    return [lostReport?.reporterAccountId, foundReport?.reporterAccountId].includes(account.id);
  });
}

function getMatchesForReport(reportId) {
  return state.matches.filter((match) => match.lostReportId === reportId || match.foundReportId === reportId);
}

function getAdminSearchResults() {
  const query = uiState.adminSearch.trim().toLowerCase();
  const reports = [...state.reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (!query) return reports;

  return reports.filter((report) => {
    const account = getAccount(report.reporterAccountId);
    const profile = getProfile(account.profileId);
    const notes = state.adminNotes.filter((note) => note.reportId === report.id);
    return [
      report.itemName,
      report.category,
      report.location,
      report.description,
      account.username,
      account.institutionalId,
      profile.fullName,
      profile.email,
      ...notes.map((note) => note.body),
    ]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });
}

function getCurrentAccount() {
  return state.accounts.find((account) => account.id === getSessionAccountId()) || null;
}

function getAccount(accountId) {
  return state.accounts.find((account) => account.id === accountId);
}

function getProfile(profileId) {
  return state.userProfiles.find((profile) => profile.id === profileId);
}

function getReport(reportId) {
  return state.reports.find((report) => report.id === reportId);
}

function getMedia(mediaId) {
  return state.reportMedia.find((media) => media.id === mediaId);
}

function getFingerprint(fingerprintId) {
  return state.visualFingerprints.find((fingerprint) => fingerprint.id === fingerprintId);
}

async function claimReport(reportId) {
  const account = getCurrentAccount();
  if (!account) {
    uiState.authMode = "login";
    renderApp();
    const loginMessage = document.querySelector("#login-message");
    setMessage(loginMessage, "Login before submitting a claim request.", "error");
    return;
  }

  const report = getReport(reportId);
  if (!report || report.reporterAccountId === account.id) return;
  if (state.claims.some((claim) => claim.reportId === reportId && claim.claimantAccountId === account.id)) {
    return;
  }

  state.claims.unshift({
    id: crypto.randomUUID(),
    reportId,
    claimantAccountId: account.id,
    status: "Pending",
    createdAt: new Date().toISOString(),
  });

  state.auditHistory.unshift({
    id: crypto.randomUUID(),
    reportId,
    action: "CLAIM_REQUESTED",
    actorAccountId: account.id,
    at: new Date().toISOString(),
    details: "A claimant requested access to this lost or found item.",
  });

  await saveState();
  renderApp();
}

async function deleteReport(reportId) {
  const account = getCurrentAccount();
  if (!account || account.role !== "admin") return;

  const report = getReport(reportId);
  if (!report) return;

  const relatedMatchIds = getMatchesForReport(reportId).map((match) => match.id);
  state.matches = state.matches.filter((match) => !relatedMatchIds.includes(match.id));
  state.claims = state.claims.filter((claim) => claim.reportId !== reportId);
  state.adminNotes = state.adminNotes.filter((note) => note.reportId !== reportId);
  state.auditHistory = state.auditHistory.filter((audit) => audit.reportId !== reportId);
  state.reportMedia = state.reportMedia.filter((media) => media.id !== report.mediaId);
  state.visualFingerprints = state.visualFingerprints.filter(
    (fingerprint) => fingerprint.id !== report.fingerprintId,
  );
  state.reports = state.reports.filter((item) => item.id !== reportId);

  await saveState();
  renderApp();
}

function setMessage(node, text, type) {
  if (!node) return;
  node.textContent = text;
  node.className = `inline-message ${type}`;
}

function resetPasswordUiState() {
  uiState.passwordReset = {
    step: "request",
    institutionalId: "",
    email: "",
  };
}

function getLatestResetMail() {
  return state.mailQueue.find((entry) => entry.purpose === "PASSWORD_RESET") || null;
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function setSessionAccountId(accountId) {
  window.localStorage.setItem(SESSION_KEY, accountId);
}

function getSessionAccountId() {
  return window.localStorage.getItem(SESSION_KEY);
}

function clearSessionAccountId() {
  window.localStorage.removeItem(SESSION_KEY);
}

async function sendOtpEmail({ email, institutionalId, otp, expiresAt }) {
  const response = await fetch("/api/send-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      institutionalId,
      otp,
      expiresAt,
    }),
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload.error || "Unable to send OTP email right now.");
  }

  return payload;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClass(status) {
  return `status-${status.toLowerCase()}`;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function simpleHash(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
