const state = {
  mode: "login",
  user: null,
  accounts: [],
  plaidAccounts: [],
  items: [],
  transactions: [],
  editingAccountId: null
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
  addAccountBtn: document.getElementById("add-account-btn"),
  syncBtn: document.getElementById("sync-btn"),
  refreshBtn: document.getElementById("refresh-btn"),
  institutionCount: document.getElementById("institution-count"),
  accountCount: document.getElementById("account-count"),
  transactionCount: document.getElementById("transaction-count"),
  accountsList: document.getElementById("accounts-list"),
  transactionsList: document.getElementById("transactions-list"),
  accountModal: document.getElementById("account-modal"),
  accountModalTitle: document.getElementById("account-modal-title"),
  closeAccountModal: document.getElementById("close-account-modal"),
  cancelAccount: document.getElementById("cancel-account"),
  deleteAccount: document.getElementById("delete-account"),
  unlinkAccount: document.getElementById("unlink-account"),
  saveAccount: document.getElementById("save-account"),
  accountForm: document.getElementById("account-form"),
  accountMessage: document.getElementById("account-message"),
  accountName: document.getElementById("account-name"),
  accountInstitution: document.getElementById("account-institution"),
  accountType: document.getElementById("account-type"),
  accountSubtype: document.getElementById("account-subtype"),
  accountCurrency: document.getElementById("account-currency"),
  accountNature: document.getElementById("account-nature"),
  accountOpenedOn: document.getElementById("account-opened-on"),
  accountClosedOn: document.getElementById("account-closed-on"),
  creditFields: document.getElementById("credit-fields"),
  loanFields: document.getElementById("loan-fields"),
  plaidLinkRow: document.getElementById("plaid-link-row"),
  existingPlaidRow: document.getElementById("existing-plaid-row"),
  existingPlaidSelectWrap: document.getElementById("existing-plaid-select-wrap"),
  existingPlaidAccount: document.getElementById("existing-plaid-account"),
  accountCreditLimit: document.getElementById("account-credit-limit"),
  accountStatementDay: document.getElementById("account-statement-day"),
  accountPaymentDueDay: document.getElementById("account-payment-due-day"),
  accountApr: document.getElementById("account-apr"),
  accountPrincipal: document.getElementById("account-principal"),
  accountInterestRate: document.getElementById("account-interest-rate"),
  accountTermMonths: document.getElementById("account-term-months"),
  accountFirstPaymentOn: document.getElementById("account-first-payment-on"),
  accountLinkNone: document.getElementById("account-link-none"),
  accountLinkExisting: document.getElementById("account-link-existing"),
  accountLinkNew: document.getElementById("account-link-new")
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
      } else if (payload.detail.details && payload.detail.details.error_message) {
        message = payload.detail.details.error_message;
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
  els.authCaption.textContent = signup ? "Start your Ardonyx Finance workspace." : "Access your account overview.";
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
  closeAccountModal();
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fieldValue(input) {
  return input.value.trim() || null;
}

function numberValue(input) {
  return input.value === "" ? null : Number(input.value);
}

function dateInputValue(value) {
  return value ? String(value).slice(0, 10) : "";
}

function accountById(accountId) {
  return state.accounts.find((account) => Number(account.id) === Number(accountId)) || null;
}

function renderAccounts() {
  els.accountCount.textContent = state.accounts.length;
  const institutions = new Set(state.items.map((item) => item.institution_name || item.institution_id || item.item_id));
  els.institutionCount.textContent = institutions.size;

  if (!state.accounts.length) {
    els.accountsList.innerHTML = '<div class="empty">No Ardonyx accounts yet. Add an account to start shaping your workspace.</div>';
    return;
  }

  els.accountsList.innerHTML = state.accounts.map((account) => `
    <article class="row-item">
      <div class="row-top">
        <div class="row-title">${escapeHtml(account.name || "Account")}</div>
        <div class="row-actions">
          <span class="amount">${account.plaid_item_id || account.plaid_account_id ? "Linked" : "Manual"}</span>
          <button class="mini-button edit-account" type="button" data-account-id="${account.id}">Edit</button>
        </div>
      </div>
      <div class="row-meta">${escapeHtml(account.institution || "No institution")} - ${escapeHtml(account.subtype || account.type || "account")} - ${escapeHtml(account.nature || "asset")} - ${escapeHtml(account.currency || "USD")}</div>
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
      <div class="row-meta">${dateLabel(transaction.posted_at || transaction.authorized_at)} - ${escapeHtml(transaction.account_name || transaction.institution_name || "Account")}${transaction.pending ? " - pending" : ""}</div>
    </article>
  `).join("");
}

function renderData() {
  renderAccounts();
  renderTransactions();
}

async function loadDashboard() {
  els.statusLine.textContent = "Loading...";
  const [itemsPayload, accountsPayload, plaidAccountsPayload, transactionsPayload] = await Promise.all([
    api("/api/plaid/items"),
    api("/api/accounts"),
    api("/api/plaid/accounts"),
    api("/api/transactions?limit=50")
  ]);
  state.items = itemsPayload.items || [];
  state.accounts = accountsPayload.accounts || [];
  state.plaidAccounts = plaidAccountsPayload.accounts || [];
  state.transactions = transactionsPayload.transactions || [];
  renderData();
  els.statusLine.textContent = "Updated " + new Date().toLocaleTimeString();
}

function renderPlaidAccountOptions() {
  if (!state.plaidAccounts.length) {
    els.existingPlaidAccount.innerHTML = '<option value="">No synced Plaid accounts yet</option>';
    els.existingPlaidRow.classList.add("disabled");
    els.accountLinkExisting.disabled = true;
    if (els.accountLinkExisting.checked) {
      els.accountLinkNone.checked = true;
    }
    return;
  }

  els.existingPlaidRow.classList.remove("disabled");
  els.accountLinkExisting.disabled = false;
  els.existingPlaidAccount.innerHTML = state.plaidAccounts.map((account) => {
    const label = `${account.institution_name || "Institution"} - ${account.name || account.official_name || "Account"}${account.mask ? " -" + account.mask : ""}`;
    return `<option value="${escapeHtml(account.account_id)}">${escapeHtml(label)}</option>`;
  }).join("");
}

function setRadioMode(mode) {
  els.accountLinkNone.checked = mode === "none";
  els.accountLinkExisting.checked = mode === "existing";
  els.accountLinkNew.checked = mode === "new";
}

function openAccountModal(account = null) {
  state.editingAccountId = account ? account.id : null;
  els.accountForm.reset();
  els.accountMessage.textContent = "";
  renderPlaidAccountOptions();
  els.accountModalTitle.textContent = account ? "Edit account" : "Add account";
  els.saveAccount.textContent = account ? "Save changes" : "Save account";
  els.deleteAccount.hidden = !account;
  els.unlinkAccount.hidden = !account || (!account.plaid_item_id && !account.plaid_account_id);

  if (account) {
    els.accountName.value = account.name || "";
    els.accountInstitution.value = account.institution || "";
    els.accountType.value = account.type || "checking";
    els.accountSubtype.value = account.subtype || "";
    els.accountCurrency.value = account.currency || "USD";
    els.accountNature.value = account.nature || "asset";
    els.accountOpenedOn.value = dateInputValue(account.opened_on);
    els.accountClosedOn.value = dateInputValue(account.closed_on);
    els.accountCreditLimit.value = account.credit_limit ?? "";
    els.accountStatementDay.value = account.statement_day ?? "";
    els.accountPaymentDueDay.value = account.payment_due_day ?? "";
    els.accountApr.value = account.apr ?? "";
    els.accountPrincipal.value = account.principal ?? "";
    els.accountInterestRate.value = account.interest_rate ?? "";
    els.accountTermMonths.value = account.term_months ?? "";
    els.accountFirstPaymentOn.value = dateInputValue(account.first_payment_on);
    if (account.plaid_account_id && state.plaidAccounts.some((plaidAccount) => plaidAccount.account_id === account.plaid_account_id)) {
      els.existingPlaidAccount.value = account.plaid_account_id;
      setRadioMode("existing");
    } else {
      setRadioMode("none");
    }
  } else {
    els.accountCurrency.value = "USD";
    els.accountNature.value = "asset";
    setRadioMode("none");
  }

  updateAccountTypeFields();
  els.accountModal.hidden = false;
  els.accountName.focus();
}

function closeAccountModal() {
  if (els.accountModal) {
    els.accountModal.hidden = true;
  }
  state.editingAccountId = null;
}

function updateAccountTypeFields() {
  const type = els.accountType.value;
  const isCredit = type === "credit_card";
  const isLoan = type === "loan" || type === "mortgage";
  const canPlaidLink = type !== "cash";

  els.creditFields.hidden = !isCredit;
  els.loanFields.hidden = !isLoan;
  els.plaidLinkRow.hidden = !canPlaidLink;
  els.existingPlaidSelectWrap.hidden = !canPlaidLink || !els.accountLinkExisting.checked;
  if (!canPlaidLink) {
    els.accountLinkNone.checked = true;
  }

  if (isCredit || isLoan) {
    els.accountNature.value = "liability";
  } else if (type !== "other") {
    els.accountNature.value = "asset";
  }
}

function accountPayload() {
  const existingAccount = state.editingAccountId ? accountById(state.editingAccountId) : null;
  const selectedPlaidAccount = state.plaidAccounts.find((account) => account.account_id === els.existingPlaidAccount.value);
  const useExistingPlaid = els.accountLinkExisting.checked && selectedPlaidAccount;
  const linkNewPlaid = els.accountLinkNew.checked;
  const preserveCurrentPlaid = existingAccount && !useExistingPlaid && !linkNewPlaid;
  const preservedPlaidItemId = preserveCurrentPlaid ? existingAccount.plaid_item_id : null;
  const preservedPlaidAccountId = preserveCurrentPlaid ? existingAccount.plaid_account_id : null;
  return {
    name: els.accountName.value,
    institution: useExistingPlaid ? selectedPlaidAccount.institution_name : fieldValue(els.accountInstitution),
    type: els.accountType.value,
    nature: els.accountNature.value,
    subtype: fieldValue(els.accountSubtype),
    currency: els.accountCurrency.value.toUpperCase(),
    opened_on: fieldValue(els.accountOpenedOn),
    closed_on: fieldValue(els.accountClosedOn),
    credit_limit: numberValue(els.accountCreditLimit),
    statement_day: numberValue(els.accountStatementDay),
    payment_due_day: numberValue(els.accountPaymentDueDay),
    apr: numberValue(els.accountApr),
    principal: numberValue(els.accountPrincipal),
    interest_rate: numberValue(els.accountInterestRate),
    term_months: numberValue(els.accountTermMonths),
    first_payment_on: fieldValue(els.accountFirstPaymentOn),
    plaid_item_id: useExistingPlaid ? selectedPlaidAccount.item_id : preservedPlaidItemId,
    plaid_account_id: useExistingPlaid ? selectedPlaidAccount.account_id : preservedPlaidAccountId,
    link_with_plaid: linkNewPlaid
  };
}

async function submitAccount(event) {
  event.preventDefault();
  els.accountMessage.textContent = "";

  try {
    const editingId = state.editingAccountId;
    const path = editingId ? `/api/accounts/${editingId}` : "/api/accounts";
    const method = editingId ? "PATCH" : "POST";
    const result = await api(path, {
      method,
      body: JSON.stringify(accountPayload())
    });
    closeAccountModal();
    await loadDashboard();
    if (result.link_with_plaid) {
      els.statusLine.textContent = "Account saved. Opening institution link...";
      await startLinkFlow(result.account.id);
    } else {
      els.statusLine.textContent = "Account saved.";
    }
  } catch (err) {
    els.accountMessage.textContent = err.message;
  }
}

async function deleteCurrentAccount() {
  if (!state.editingAccountId) {
    return;
  }
  if (!window.confirm("Delete this Ardonyx account? This will not delete the bank connection itself.")) {
    return;
  }
  try {
    await api(`/api/accounts/${state.editingAccountId}`, { method: "DELETE" });
    closeAccountModal();
    await loadDashboard();
    els.statusLine.textContent = "Account deleted.";
  } catch (err) {
    els.accountMessage.textContent = err.message;
  }
}

async function unlinkCurrentAccount() {
  if (!state.editingAccountId) {
    return;
  }
  try {
    await api(`/api/accounts/${state.editingAccountId}/unlink-plaid`, { method: "POST", body: "{}" });
    closeAccountModal();
    await loadDashboard();
    els.statusLine.textContent = "Plaid mapping removed from account.";
  } catch (err) {
    els.accountMessage.textContent = err.message;
  }
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
  state.plaidAccounts = [];
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

async function getLinkToken(accountId = null) {
  els.statusLine.textContent = "Requesting link token...";
  const payload = await api("/api/plaid/link-token", {
    method: "POST",
    body: "{}"
  });
  const linkToken = payload.link_token || payload.linkToken;
  if (!linkToken) {
    throw new Error("Link token was not returned");
  }
  saveOAuthSession({ linkToken, accountId, createdAt: new Date().toISOString() });
  return linkToken;
}

function openPlaid(params) {
  const handler = Plaid.create({
    token: params.token,
    receivedRedirectUri: params.receivedRedirectUri,
    onSuccess: async (publicToken, metadata) => {
      try {
        els.statusLine.textContent = "Connecting institution...";
        const session = loadOAuthSession();
        await api("/api/plaid/exchange-public-token", {
          method: "POST",
          body: JSON.stringify({
            public_token: publicToken,
            institution: metadata && metadata.institution ? metadata.institution : null,
            canonical_account_id: params.accountId || (session ? session.accountId : null)
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

async function startLinkFlow(accountId = null) {
  try {
    const token = await getLinkToken(accountId);
    els.statusLine.textContent = "Opening Plaid Link...";
    openPlaid({ token, accountId });
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
    accountId: session.accountId || null,
    receivedRedirectUri: window.location.href
  });
}

async function syncNow() {
  try {
    els.statusLine.textContent = "Syncing linked institutions...";
    const accountsResult = await api("/api/plaid/accounts/sync", { method: "POST", body: "{}" });
    els.statusLine.textContent = "Loading recent transaction history...";
    const backfillResult = await api("/api/plaid/transactions/backfill", {
      method: "POST",
      body: JSON.stringify({ days: 3 })
    });
    els.statusLine.textContent = "Syncing transaction changes...";
    const syncResult = await api("/api/plaid/transactions/sync", { method: "POST", body: "{}" });
    await loadDashboard();
    els.statusLine.textContent = `Linked accounts synced: ${accountsResult.accounts_synced}. Recent loaded: ${backfillResult.loaded}. Added: ${syncResult.added}, modified: ${syncResult.modified}, removed: ${syncResult.removed}.`;
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
els.addAccountBtn.addEventListener("click", openAccountModal);
els.closeAccountModal.addEventListener("click", closeAccountModal);
els.cancelAccount.addEventListener("click", closeAccountModal);
els.deleteAccount.addEventListener("click", deleteCurrentAccount);
els.unlinkAccount.addEventListener("click", unlinkCurrentAccount);
els.accountType.addEventListener("change", updateAccountTypeFields);
els.accountLinkNone.addEventListener("change", updateAccountTypeFields);
els.accountLinkExisting.addEventListener("change", updateAccountTypeFields);
els.accountLinkNew.addEventListener("change", updateAccountTypeFields);
els.accountForm.addEventListener("submit", submitAccount);
els.accountsList.addEventListener("click", (event) => {
  const button = event.target.closest(".edit-account");
  if (!button) {
    return;
  }
  const account = accountById(button.dataset.accountId);
  if (account) {
    openAccountModal(account);
  }
});
els.syncBtn.addEventListener("click", syncNow);
els.refreshBtn.addEventListener("click", loadDashboard);

setMode("login");
loadMe();
