const API_BASE_KEY = 'sncft_api_base';
const DEFAULT_API_BASE = 'http://127.0.0.1:3000';
const TOKEN_KEY = 'sncft_admin_token';
const SESSION_KEY = 'sncft_admin_session';
const ACCOUNT_KEY = 'sncft_admin_accounts';
const MATRICULE_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]+$/;

const state = {
  authMode: 'login',
  session: null,
};

const $ = (id) => document.getElementById(id);

function apiBase() {
  return localStorage.getItem(API_BASE_KEY) || DEFAULT_API_BASE;
}

function setHero(container, index) {
  const slides = Array.from(container.querySelectorAll('.hero-slide'));
  if (!slides.length) return;
  const safeIndex = (index + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => slide.classList.toggle('active', slideIndex === safeIndex));
  container.dataset.heroIndex = String(safeIndex);
}

function initHeroRotations() {
  document.querySelectorAll('.auth-hero, .dashboard-hero').forEach((container) => {
    setHero(container, 0);
    window.setInterval(() => {
      const current = Number(container.dataset.heroIndex || 0);
      setHero(container, current + 1);
    }, 5600);
  });
}

function accounts() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAccounts(list) {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(list));
}

function seedAccounts() {
  const demo = {
    matricule: 'ADM123',
    firstName: 'Admin',
    lastName: 'Local',
    email: 'admin@domain.tn',
    password: 'admin123',
  };

  const list = accounts();
  if (list.some((account) => account.email === demo.email)) return;
  saveAccounts([demo, ...list]);
}

function setAuthMode(mode) {
  state.authMode = mode === 'register' ? 'register' : 'login';
  const registerMode = state.authMode === 'register';

  $('registerFields').classList.toggle('hidden', !registerMode);
  $('authTitle').textContent = registerMode ? 'Creer un compte admin' : 'Connexion admin';
  $('authText').textContent = registerMode
    ? 'Créez un compte local admin avec matricule, nom, prenom, email et mot de passe.'
    : 'Connectez-vous pour gerer les imports et les versions publiees.';
  $('authSubmit').textContent = registerMode ? 'Creer mon compte' : 'Se connecter';
  $('loginTab').classList.toggle('active', !registerMode);
  $('registerTab').classList.toggle('active', registerMode);
  setAuthMessage('');
}

function setAuthMessage(message, tone = 'default') {
  $('authMessage').textContent = message || '';
  $('authMessage').style.color = tone === 'error' ? '#EF4444' : tone === 'success' ? '#16A34A' : '#6B7280';
}

function setDashboardMessage(message, tone = 'default') {
  $('dashboardMessage').textContent = message || '';
  $('dashboardMessage').style.color = tone === 'error' ? '#EF4444' : tone === 'success' ? '#16A34A' : '#6B7280';
}

function persistSession(account) {
  state.session = {
    matricule: account.matricule,
    firstName: account.firstName,
    lastName: account.lastName,
    email: account.email,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
  localStorage.setItem(TOKEN_KEY, 'dev-token');
}

function restoreSession() {
  try {
    state.session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    state.session = null;
  }

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || !state.session) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    state.session = null;
  }
}

function renderSession() {
  $('sessionName').textContent = state.session ? `${state.session.firstName} ${state.session.lastName}`.trim() : 'Admin';
  $('sessionEmail').textContent = state.session?.email || 'admin@domain.tn';
}

function showDashboard() {
  $('authPage').classList.add('hidden');
  $('dashboardPage').classList.remove('hidden');
  renderSession();
  $('apiBaseInput').value = apiBase();
  refreshDashboard();
}

function showAuth() {
  $('dashboardPage').classList.add('hidden');
  $('authPage').classList.remove('hidden');
}

function clearAuthInputs() {
  ['matricule', 'firstName', 'lastName', 'email', 'password'].forEach((id) => {
    const field = $(id);
    if (field) field.value = '';
  });
}

function register() {
  const matricule = $('matricule').value.trim();
  const firstName = $('firstName').value.trim();
  const lastName = $('lastName').value.trim();
  const email = $('email').value.trim().toLowerCase();
  const password = $('password').value.trim();

  if (!matricule || !firstName || !lastName || !email || !password) {
    setAuthMessage('Remplissez tous les champs pour creer le compte.', 'error');
    return;
  }

  if (!MATRICULE_REGEX.test(matricule)) {
    setAuthMessage('Le matricule doit contenir au moins une lettre et un chiffre.', 'error');
    return;
  }

  const list = accounts();
  if (list.some((account) => account.email === email)) {
    setAuthMessage('Un compte avec cet email existe deja.', 'error');
    return;
  }

  list.push({
    matricule,
    firstName,
    lastName,
    email,
    password,
    createdAt: new Date().toISOString(),
  });

  saveAccounts(list);
  setAuthMode('login');
  $('email').value = email;
  $('password').value = '';
  setAuthMessage('Compte cree. Connectez-vous maintenant.', 'success');
}

function login() {
  const email = $('email').value.trim().toLowerCase();
  const password = $('password').value.trim();

  if (!email || !password) {
    setAuthMessage('Entrez votre email et votre mot de passe.', 'error');
    return;
  }

  const account = accounts().find((item) => item.email === email && item.password === password);
  if (!account) {
    setAuthMessage('Compte introuvable. Utilisez admin@domain.tn / admin123 ou creez un compte.', 'error');
    return;
  }

  persistSession(account);
  setAuthMessage('');
  showDashboard();
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  state.session = null;
  clearAuthInputs();
  setDashboardMessage('');
  showAuth();
  setAuthMode('login');
}

async function api(path, options = {}) {
  const init = {
    ...options,
    headers: {
      Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || 'dev-token'}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  };

  const response = await fetch(`${apiBase()}${path}`, init);
  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message = typeof data === 'string' ? data : data.error || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

function formatError(error) {
  if (error instanceof Error) return error.message;
  return 'Operation impossible.';
}

async function readCsv(fileInput, textarea) {
  const files = Array.from(fileInput.files || []);
  if (files.length) {
    const parts = [];
    for (const file of files) {
      parts.push(await file.text());
    }
    return parts.join('\n');
  }
  return textarea.value.trim();
}

function summaryRows(item) {
  return item?.summary?.total_rows
    || item?.summary?.fare_rows_count
    || item?.summary?.stop_times_count
    || item?.summary?.trips_count
    || '—';
}

function formatPreviewResult(data) {
  return JSON.stringify(data, null, 2);
}

async function previewImport(kind) {
  const output = kind === 'schedule' ? $('scheduleOut') : $('fareOut');
  const csv = kind === 'schedule'
    ? await readCsv($('scheduleFile'), $('scheduleCsv'))
    : await readCsv($('fareFile'), $('fareCsv'));

  if (!csv) {
    output.textContent = 'Choisissez un fichier CSV ou collez son contenu.';
    return;
  }

  output.textContent = 'Preview en cours...';

  try {
    const path = kind === 'schedule' ? '/admin/imports/schedules/preview' : '/admin/imports/fares/preview';
    const data = await api(path, {
      method: 'POST',
      body: JSON.stringify({ csv }),
    });
    output.textContent = formatPreviewResult(data);
    setDashboardMessage(`Preview ${kind === 'schedule' ? 'horaires' : 'tarifs'} chargee.`, 'success');
  } catch (error) {
    output.textContent = `Erreur: ${formatError(error)}`;
    setDashboardMessage(formatError(error), 'error');
  }
}

async function publishImport(kind) {
  const output = kind === 'schedule' ? $('scheduleOut') : $('fareOut');
  const csv = kind === 'schedule'
    ? await readCsv($('scheduleFile'), $('scheduleCsv'))
    : await readCsv($('fareFile'), $('fareCsv'));

  if (!csv) {
    output.textContent = 'Choisissez un fichier CSV ou collez son contenu.';
    return;
  }

  output.textContent = 'Creation du draft...';

  try {
    const createPath = kind === 'schedule' ? '/admin/imports/schedules' : '/admin/imports/fares';
    const draft = await api(createPath, {
      method: 'POST',
      body: JSON.stringify({
        csv,
        filename: `${kind}.csv`,
      }),
    });

    output.textContent = `Draft cree: ${draft.id}\nPublication en cours...`;

    const published = await api(`/admin/imports/${draft.id}/publish`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    output.textContent = formatPreviewResult({ draft, published });
    setDashboardMessage(`Import ${kind === 'schedule' ? 'horaires' : 'tarifs'} publie avec succes.`, 'success');
    await refreshDashboard();
  } catch (error) {
    output.textContent = `Erreur: ${formatError(error)}`;
    setDashboardMessage(formatError(error), 'error');
  }
}

function renderImportsTable(items, activeVersions) {
  if (!items.length) {
    $('importsTable').innerHTML = '<tr><td colspan="6">Aucun import charge.</td></tr>';
    return;
  }

  $('importsTable').innerHTML = items.map((item) => {
    const isActive = item.kind === 'schedule'
      ? item.id === activeVersions.scheduleImportId
      : item.id === activeVersions.fareImportId;

    return `
      <tr>
        <td>${item.kind || '—'}</td>
        <td>${item.id || '—'}</td>
        <td>${item.status || '—'}</td>
        <td>${item.createdAt ? new Date(item.createdAt).toLocaleString('fr-FR') : '—'}</td>
        <td>${summaryRows(item)}</td>
        <td><span class="row-badge ${isActive ? 'active' : 'idle'}">${isActive ? 'Oui' : 'Non'}</span></td>
      </tr>
    `;
  }).join('');
}

async function refreshDashboard() {
  $('apiBaseInput').value = apiBase();
  $('sidebarApiBase').textContent = apiBase();
  setDashboardMessage('');

  const healthPromise = fetch(`${apiBase()}/health`);
  const activePromise = api('/admin/imports/active');
  const importsPromise = api('/admin/imports');

  const [healthResult, activeResult, importsResult] = await Promise.allSettled([
    healthPromise,
    activePromise,
    importsPromise,
  ]);

  if (healthResult.status === 'fulfilled') {
    $('apiStatus').textContent = healthResult.value.ok ? 'API OK' : 'API erreur';
    $('apiStatusDetail').textContent = healthResult.value.ok ? 'Service joignable' : `HTTP ${healthResult.value.status}`;
    $('sidebarApiStatus').textContent = healthResult.value.ok ? 'Connectee' : 'Erreur';
    $('sidebarApiStatus').style.color = healthResult.value.ok ? '#BBF7D0' : '#FECACA';
  } else {
    $('apiStatus').textContent = 'API indisponible';
    $('apiStatusDetail').textContent = 'Impossible de joindre le service';
    $('sidebarApiStatus').textContent = 'Indisponible';
    $('sidebarApiStatus').style.color = '#FECACA';
    setDashboardMessage(`Connexion API impossible sur ${apiBase()}.`, 'error');
  }

  const activeVersions = activeResult.status === 'fulfilled'
    ? activeResult.value
    : { scheduleImportId: null, fareImportId: null };

  $('activeSchedules').textContent = activeVersions.scheduleImportId || '-';
  $('activeFares').textContent = activeVersions.fareImportId || '-';
  $('activeScheduleInline').textContent = activeVersions.scheduleImportId || '-';
  $('activeFareInline').textContent = activeVersions.fareImportId || '-';

  if (importsResult.status === 'fulfilled') {
    const items = Array.isArray(importsResult.value.items) ? importsResult.value.items : [];
    $('importsCount').textContent = String(items.length);
    renderImportsTable(items, activeVersions);
  } else {
    $('importsCount').textContent = '0';
    $('importsTable').innerHTML = `<tr><td colspan="6">Erreur: ${formatError(importsResult.reason)}</td></tr>`;
    if (!$('dashboardMessage').textContent) setDashboardMessage(formatError(importsResult.reason), 'error');
  }
}

function saveApiBase() {
  const value = $('apiBaseInput').value.trim() || DEFAULT_API_BASE;
  localStorage.setItem(API_BASE_KEY, value);
  $('sidebarApiBase').textContent = value;
  setDashboardMessage('API base mise a jour.', 'success');
  refreshDashboard();
}

function bind() {
  $('loginTab').addEventListener('click', () => setAuthMode('login'));
  $('registerTab').addEventListener('click', () => setAuthMode('register'));
  $('authSubmit').addEventListener('click', () => {
    if (state.authMode === 'register') register();
    else login();
  });

  $('logoutBtn').addEventListener('click', logout);
  $('saveApiBase').addEventListener('click', saveApiBase);
  $('refreshBtn').addEventListener('click', refreshDashboard);
  $('previewSchedules').addEventListener('click', () => previewImport('schedule'));
  $('publishSchedules').addEventListener('click', () => publishImport('schedule'));
  $('previewFares').addEventListener('click', () => previewImport('fare'));
  $('publishFares').addEventListener('click', () => publishImport('fare'));
}

window.addEventListener('DOMContentLoaded', () => {
  seedAccounts();
  restoreSession();
  initHeroRotations();
  bind();
  setAuthMode('login');

  if (state.session && localStorage.getItem(TOKEN_KEY)) {
    showDashboard();
  } else {
    showAuth();
  }
});
