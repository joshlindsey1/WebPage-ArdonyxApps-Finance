const state = {
  mode: "login",
  user: null,
  accounts: [],
  items: [],
  transactions: []
};

const oauthStorageKey = "ardonyx_plaid_oauth";
const apiBase = window.ARDONYX_API_BASE || "";

const els = {
  authView: document.getElementById("auth-view"),
  dashboard: document.getElementById("dashboard"),
  sessionBar: document.getElementById("session-bar"),
  sessionEmail: document.getElementById("session-email"),
  logoutBtn: document.getElementById("logout-btn"),
  loginTab: document.getElementById("login-tab"),
  signupTab: document.getElementById("signup-tab"),
  authTitle: document.getElementById("auth-title"),
  authCaption: document.getElementById("auth-caption"),
  authForm: document.getElementById("auth-form"),
  authSubmit: document.getElementById("auth-submit"),
  authMessage: document.getElementById("auth-message"),
  nameFields: document.getElementById("name-fields"),
  usernameField: document.getElementById("username-field"),
  firstName: document.getElementById("first-name"),
  middleInitial: document.getElementById("middle-initial"),
  lastName: document.getElementById("last-name"),
  username: document.getElementById("username"),
  identifierLabel: document.getElementById("identifier-label"),
  identifier: document.getElementById("identifier"),
  password: document.getElementById("password"),
  confirmPasswordWrap: document.getElementById("confirm-password-wrap"),
  confirmPassword: document.getElementById("confirm-password"),
  togglePassword: document.getElementById("toggle-password"),
  toggleConfirmPassword: document.getElementById("toggle-confirm-password"),
  dashboardSubtitle: document.getElementById("dashboard-subtitle"),
  statusLine: document.getElementById("status-line"),
  connectBtn: document.getElementById("connect-btn"),
  syncBtn: document.getElementById("sync-btn"),
  refreshBtn: document.getElementById("refresh-btn"),
  institutionCount: document.getElementById("institution-count"),
  accountCount: document.getElementById("account-count"),
  transactionCount: document.getElementById("transaction-count"),
  accountsList: document.getElementById("accounts-list"),
  transactionsList: document.getElementById("transactions-list")
};

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
  } catch (err) {
    const target = apiBase || "the current site";
    throw new Error(`Unable to reach Ardonyx Finance API at ${target}. Make sure the FastAPI server is running and CORS allows this page.`);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    if (payload && payload.detail) {
      if (typeof payload.detail === "string") {
        message = payload.detail;
      } else if (payload.detail.error) {
        message = payload.detail.error;
      }
    }
    throw new Error(message);
  }
  return payload;
}

function setMode(mode) {
  state.mode = mode;
  const signup = mode === "signup";
  els.loginTab.classList.toggle("active", !signup);
  els.signupTab.classList.toggle("active", signup);
  els.nameFields.hidden = !signup;
  els.usernameField.hidden = !signup;
  els.confirmPasswordWrap.hidden = !signup;
  els.authTitle.textContent = signup ? "Create account" : "Sign in";
  els.authCaption.textContent = signup ? "Start your Ardonyx Finance workspace." : "Access your connected account dashboard.";
  els.authSubmit.textContent = signup ? "Create account" : "Sign in";
  els.identifierLabel.textContent = signup ? "Email" : "Email or username";
  els.identifier.type = signup ? "email" : "text";
  els.identifier.autocomplete = signup ? "email" : "username";
  els.firstName.required = signup;
  els.lastName.required = signup;
  els.confirmPassword.required = signup;
  els.password.autocomplete = signup ? "new-password" : "current-password";
  els.authMessage.textContent = "";
}

function showAuth() {
  els.authView.hidden = false;
  els.dashboard.hidden = true;
  els.sessionBar.hidden = true;
}

function showDashboard() {
  els.authView.hidden = true;
  els.dashboard.hidden = false;
  els.sessionBar.hidden = false;
  els.sessionEmail.textContent = state.user.username || state.user.email;
  els.dashboardSubtitle.textContent = state.user.display_name || state.user.email;
}

function money(value, currency = "USD") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD"
  }).format(Number(value));
}

function dateLabel(value) {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function balanceFor(account) {
  const balances = account.balances || {};
  return balances.current ?? balances.available ?? null;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderAccounts() {
  els.accountCount.textContent = state.accounts.length;
  const institutions = new Set(state.items.map((item) => item.institution_name || item.institution_id || item.item_id));
  els.institutionCount.textContent = institutions.size;

  if (!state.accounts.length) {
    els.accountsList.innerHTML = '<div class="empty">No connected accounts yet.</div>';
    return;
  }

  els.accountsList.innerHTML = state.accounts.map((account) => `
    <article class="row-item">
      <div class="row-top">
        <div class="row-title">${escapeHtml(account.name || account.official_name || "Account")}</div>
        <div class="amount">${money(balanceFor(account))}</div>
      </div>
      <div class="row-meta">${escapeHtml(account.institution_name || "Institution")} · ${escapeHtml(account.subtype || account.type || "account")} ${account.mask ? "··" + escapeHtml(account.mask) : ""}</div>
    </article>
  `).join("");
}

function renderTransactions() {
  els.transactionCount.textContent = state.transactions.length;

  if (!state.transactions.length) {
    els.transactionsList.innerHTML = '<div class="empty">No transactions synced yet.</div>';
    return;
  }

  els.transactionsList.innerHTML = state.transactions.map((transaction) => `
    <article class="row-item">
      <div class="row-top">
        <div class="row-title">${escapeHtml(transaction.merchant_name || transaction.description || "Transaction")}</div>
        <div class="amount">${money(transaction.amount, transaction.currency)}</div>
      </div>
      <div class="row-meta">${dateLabel(transaction.posted_at || transaction.authorized_at)} · ${escapeHtml(transaction.account_name || transaction.institution_name || "Account")}${transaction.pending ? " · pending" : ""}</div>
    </article>
  `).join("");
}

function renderData() {
  renderAccounts();
  renderTransactions();
}

async function loadDashboard() {
  els.statusLine.textContent = "Loading...";
  const [itemsPayload, accountsPayload, transactionsPayload] = await Promise.all([
    api("/api/plaid/items"),
    api("/api/accounts"),
    api("/api/transactions?limit=50")
  ]);
  state.items = itemsPayload.items || [];
  state.accounts = accountsPayload.accounts || [];
  state.transactions = transactionsPayload.transactions || [];
  renderData();
  els.statusLine.textContent = "Updated " + new Date().toLocaleTimeString();
}

async function loadMe() {
  try {
    const payload = await api("/api/auth/me");
    state.user = payload.user;
    showDashboard();
    await resumeOAuthIfNeeded();
    await loadDashboard();
  } catch (err) {
    state.user = null;
    showAuth();
  }
}

async function submitAuth(event) {
  event.preventDefault();
  els.authMessage.textContent = "";
  const path = state.mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
  const body = { password: els.password.value };

  if (state.mode === "signup") {
    if (els.password.value !== els.confirmPassword.value) {
      els.authMessage.textContent = "Passwords do not match.";
      return;
    }
    body.email = els.identifier.value;
    body.username = els.username.value || null;
    body.first_name = els.firstName.value;
    body.middle_initial = els.middleInitial.value || null;
    body.last_name = els.lastName.value;
  } else {
    body.identifier = els.identifier.value;
  }

  try {
    const payload = await api(path, {
      method: "POST",
      body: JSON.stringify(body)
    });
    state.user = payload.user;
    showDashboard();
    await loadDashboard();
  } catch (err) {
    els.authMessage.textContent = err.message;
  }
}

async function logout() {
  await api("/api/auth/logout", { method: "POST", body: "{}" }).catch(() => null);
  state.user = null;
  state.accounts = [];
  state.items = [];
  state.transactions = [];
  showAuth();
}

function saveOAuthSession(session) {
  localStorage.setItem(oauthStorageKey, JSON.stringify(session));
}

function loadOAuthSession() {
  try {
    return JSON.parse(localStorage.getItem(oauthStorageKey) || "null");
  } catch (err) {
    return null;
  }
}

function clearOAuthSession() {
  localStorage.removeItem(oauthStorageKey);
}

async function getLinkToken() {
  els.statusLine.textContent = "Requesting link token...";
  const payload = await api("/api/plaid/link-token", {
    method: "POST",
    body: "{}"
  });
  const linkToken = payload.link_token || payload.linkToken;
  if (!linkToken) {
    throw new Error("Link token was not returned");
  }
  saveOAuthSession({ linkToken, createdAt: new Date().toISOString() });
  return linkToken;
}

function openPlaid(params) {
  const handler = Plaid.create({
    token: params.token,
    receivedRedirectUri: params.receivedRedirectUri,
    onSuccess: async (publicToken, metadata) => {
      try {
        els.statusLine.textContent = "Connecting institution...";
        await api("/api/plaid/exchange-public-token", {
          method: "POST",
          body: JSON.stringify({
            public_token: publicToken,
            institution: metadata && metadata.institution ? metadata.institution : null
          })
        });
        clearOAuthSession();
        await syncNow();
      } catch (err) {
        els.statusLine.textContent = err.message;
      }
    },
    onExit: (err) => {
      els.statusLine.textContent = err ? "Plaid Link closed with an error." : "Plaid Link closed.";
    }
  });
  handler.open();
}

async function startLinkFlow() {
  try {
    const token = await getLinkToken();
    els.statusLine.textContent = "Opening Plaid Link...";
    openPlaid({ token });
  } catch (err) {
    els.statusLine.textContent = err.message;
  }
}

async function resumeOAuthIfNeeded() {
  const params = new URLSearchParams(window.location.search);
  const session = loadOAuthSession();
  if (!params.has("oauth_state_id") || !session || !session.linkToken) {
    return;
  }
  els.statusLine.textContent = "Completing OAuth...";
  openPlaid({
    token: session.linkToken,
    receivedRedirectUri: window.location.href
  });
}

async function syncNow() {
  try {
    els.statusLine.textContent = "Syncing accounts...";
    const accountsResult = await api("/api/plaid/accounts/sync", { method: "POST", body: "{}" });
    els.statusLine.textContent = "Loading recent transaction history...";
    const backfillResult = await api("/api/plaid/transactions/backfill", {
      method: "POST",
      body: JSON.stringify({ days: 3 })
    });
    els.statusLine.textContent = "Syncing transaction changes...";
    const syncResult = await api("/api/plaid/transactions/sync", { method: "POST", body: "{}" });
    await loadDashboard();
    els.statusLine.textContent = `Accounts synced: ${accountsResult.accounts_synced}. Recent loaded: ${backfillResult.loaded}. Added: ${syncResult.added}, modified: ${syncResult.modified}, removed: ${syncResult.removed}.`;
  } catch (err) {
    els.statusLine.textContent = err.message;
  }
}

function bindPasswordToggle(button, input) {
  button.addEventListener("click", () => {
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    button.setAttribute("aria-pressed", String(!showing));
    button.setAttribute("aria-label", showing ? "Show password" : "Hide password");
  });
}

els.loginTab.addEventListener("click", () => setMode("login"));
els.signupTab.addEventListener("click", () => setMode("signup"));
bindPasswordToggle(els.togglePassword, els.password);
bindPasswordToggle(els.toggleConfirmPassword, els.confirmPassword);
els.authForm.addEventListener("submit", submitAuth);
els.logoutBtn.addEventListener("click", logout);
els.connectBtn.addEventListener("click", startLinkFlow);
els.syncBtn.addEventListener("click", syncNow);
els.refreshBtn.addEventListener("click", loadDashboard);

setMode("login");
loadMe();
