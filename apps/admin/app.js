const API_BASE_KEY = 'sncft_api_base';
const DEFAULT_API_BASE = 'http://127.0.0.1:3000';
const TOKEN_KEY = 'sncft_admin_token';
const SESSION_KEY = 'sncft_admin_session';
const ACCOUNT_KEY = 'sncft_admin_accounts';
const MATRICULE_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]+$/;

const state = {
  authMode: 'login',
  currentView: 'home',
  session: null,
  imports: [],
  activeVersions: { scheduleImportId: null, fareImportId: null },
  previewCache: { schedule: null, fare: null },
  publishSuccess: { schedule: null, fare: null },
};

const $ = (id) => document.getElementById(id);

function apiBase() {
  return localStorage.getItem(API_BASE_KEY) || DEFAULT_API_BASE;
}

function shortId(value) {
  if (!value) return '-';
  return String(value).slice(0, 8);
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function accounts() {
  return readJson(ACCOUNT_KEY, []);
}

function saveAccounts(list) {
  writeJson(ACCOUNT_KEY, list);
}

function seedAccounts() {
  const demo = {
    matricule: 'ADM123',
    firstName: 'Ahmed',
    lastName: 'Admin',
    email: 'admin@domain.tn',
    password: 'admin123',
    createdAt: new Date().toISOString(),
  };

  const list = accounts();
  if (list.some((account) => account.email === demo.email)) return;
  saveAccounts([demo, ...list]);
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
    }, 5000);
  });
}

function setAuthMode(mode) {
  state.authMode = mode === 'register' ? 'register' : 'login';
  const registerMode = state.authMode === 'register';
  $('registerFields').classList.toggle('hidden', !registerMode);
  $('authTitle').textContent = registerMode ? 'Creer un compte admin' : 'Connexion admin';
  $('authText').textContent = registerMode
    ? 'Creez un compte local avec matricule, nom, prenom, email et mot de passe.'
    : 'Connectez-vous pour acceder au dashboard SNCFT Navigator.';
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

function renderSession() {
  const firstName = state.session?.firstName || 'Ahmed';
  const greeting = `Salut ${firstName}`;
  $('sessionGreeting').textContent = greeting;
  $('sessionEmail').textContent = state.session?.email || 'admin@domain.tn';
  $('heroGreeting').textContent = greeting;
}

function persistSession(account) {
  state.session = {
    matricule: account.matricule,
    firstName: account.firstName,
    lastName: account.lastName,
    email: account.email,
  };
  writeJson(SESSION_KEY, state.session);
  localStorage.setItem(TOKEN_KEY, 'dev-token');
}

function restoreSession() {
  state.session = readJson(SESSION_KEY, null);
  if (!state.session || !localStorage.getItem(TOKEN_KEY)) {
    state.session = null;
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
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
  showDashboard();
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  state.session = null;
  clearAuthInputs();
  showAuth();
  setAuthMode('login');
}

function showDashboard() {
  $('authPage').classList.add('hidden');
  $('dashboardPage').classList.remove('hidden');
  renderSession();
  refreshData();
}

function showAuth() {
  $('dashboardPage').classList.add('hidden');
  $('authPage').classList.remove('hidden');
}

function setView(viewName) {
  state.currentView = viewName;
  ['home', 'imports', 'history', 'versions'].forEach((view) => {
    $(`${view}View`).classList.toggle('hidden', view !== viewName);
  });

  document.querySelectorAll('.sidebar-link').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === viewName);
  });
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
  return error instanceof Error ? error.message : 'Operation impossible.';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function updateKpis(healthOk) {
  $('apiStatus').textContent = healthOk ? 'OK' : 'Erreur';
  $('apiStatusDetail').textContent = healthOk ? 'Service joignable' : 'Service indisponible';
  $('activeSchedules').textContent = shortId(state.activeVersions.scheduleImportId);
  $('activeFares').textContent = shortId(state.activeVersions.fareImportId);
  $('importsCount').textContent = String(state.imports.length);
  $('activeScheduleFull').textContent = state.activeVersions.scheduleImportId || '-';
  $('activeFareFull').textContent = state.activeVersions.fareImportId || '-';
}

function summaryRows(item) {
  return item?.summary?.total_rows
    || item?.summary?.fare_rows_count
    || item?.summary?.stop_times_count
    || item?.summary?.trips_count
    || '—';
}

function renderHistoryTable() {
  if (!state.imports.length) {
    $('historyTable').innerHTML = '<tr><td colspan="6">Aucun import charge.</td></tr>';
    return;
  }

  $('historyTable').innerHTML = state.imports.map((item) => {
    const isActive = item.kind === 'schedule'
      ? item.id === state.activeVersions.scheduleImportId
      : item.id === state.activeVersions.fareImportId;

    return `
      <tr>
        <td>${item.kind || '—'}</td>
        <td>${shortId(item.id)}</td>
        <td>${item.status || '—'}</td>
        <td>${item.createdAt ? new Date(item.createdAt).toLocaleString('fr-FR') : '—'}</td>
        <td>${summaryRows(item)}</td>
        <td><span class="row-badge ${isActive ? 'active' : 'idle'}">${isActive ? 'Oui' : 'Non'}</span></td>
      </tr>
    `;
  }).join('');
}

function uniqueCount(rows, key) {
  return new Set(rows.map((row) => row?.[key]).filter(Boolean)).size;
}

function previewRows(kind, data) {
  const candidates = kind === 'schedule'
    ? [data?.stops, data?.rows, data?.items, data?.validRows, data?.preview, data?.normalizedRows, data?.schedules]
    : [data?.fares, data?.rows, data?.items, data?.validRows, data?.preview, data?.normalizedRows];
  return candidates.find(Array.isArray) || [];
}

function previewIssues(data) {
  const issues = Array.isArray(data?.issues) ? data.issues : [];
  const warnings = Array.isArray(data?.warnings) ? data.warnings : [];
  const errors = Array.isArray(data?.errors) ? data.errors : [];
  return [...issues, ...warnings, ...errors];
}

function scheduleSummary(data, rows) {
  return [
    ['Total lignes', data?.summary?.total_rows ?? rows.length],
    ['Trains detectes', data?.summary?.trips_count ?? uniqueCount(rows, 'trainNumber')],
    ['Gares detectees', data?.stations?.length ?? uniqueCount(rows, 'station')],
    ['Erreurs', data?.summary?.errors_count ?? previewIssues(data).filter((issue) => issue?.severity === 'error').length],
    ['Avertissements', data?.summary?.warnings_count ?? previewIssues(data).filter((issue) => issue?.severity === 'warning').length],
  ];
}

function fareSummary(data, rows) {
  return [
    ['Total lignes', data?.summary?.total_rows ?? rows.length],
    ['Tarifs detectes', data?.summary?.fare_rows_count ?? rows.length],
    ['Lignes detectees', uniqueCount(rows, 'lineCode')],
    ['Erreurs', data?.summary?.errors_count ?? previewIssues(data).filter((issue) => issue?.severity === 'error').length],
    ['Avertissements', data?.summary?.warnings_count ?? previewIssues(data).filter((issue) => issue?.severity === 'warning').length],
  ];
}

function previewColumns(kind) {
  return kind === 'schedule'
    ? [
        ['lineCode', 'Ligne'],
        ['trainNumber', 'Train'],
        ['station', 'Gare'],
        ['arrivalTime', 'Arrivee'],
        ['departureTime', 'Depart'],
        ['direction', 'Direction'],
        ['stationOrder', 'Ordre'],
      ]
    : [
        ['lineCode', 'Ligne'],
        ['fareType', 'Type tarif'],
        ['sections', 'Sections'],
        ['amount', 'Montant'],
        ['currency', 'Devise'],
      ];
}

function setImportButtons(kind, phase = 'idle') {
  const previewButton = kind === 'schedule' ? $('previewSchedules') : $('previewFares');
  const publishButton = kind === 'schedule' ? $('publishSchedules') : $('publishFares');
  const previewLoading = phase === 'preview';
  const publishLoading = phase === 'publish';
  previewButton.disabled = previewLoading || publishLoading;
  publishButton.disabled = previewLoading || publishLoading;
  previewButton.textContent = previewLoading ? 'Previsualisation...' : 'Previsualiser';
  publishButton.textContent = publishLoading ? 'Publication...' : 'Importer et publier';
}

function renderPreview(kind, data) {
  const container = kind === 'schedule' ? $('schedulePreview') : $('farePreview');
  const rows = previewRows(kind, data);
  const columns = previewColumns(kind);
  const summary = kind === 'schedule' ? scheduleSummary(data, rows) : fareSummary(data, rows);
  const issues = previewIssues(data).slice(0, 8);
  const visibleRows = rows.slice(0, 50);
  const success = state.publishSuccess[kind];
  const caption = rows.length > 50 ? `50 premieres lignes affichees sur ${rows.length}.` : `${rows.length} ligne${rows.length > 1 ? 's' : ''} affichee${rows.length > 1 ? 's' : ''}.`;
  const issueHtml = issues.length
    ? `<div class="issue-list">${issues.map((issue) => {
        const tone = issue?.severity === 'error' ? 'error' : 'warning';
        const message = issue?.message || issue?.code || 'Avertissement';
        const detail = issue?.rowNumber ? `Ligne ${issue.rowNumber}` : issue?.sourceFile || '';
        return `<span class="issue-badge ${tone}">${escapeHtml(detail ? `${detail} · ${message}` : message)}</span>`;
      }).join('')}</div>`
    : '';
  const successHtml = success
    ? `
      <div class="success-card">
        <strong>Import publie avec succes</strong>
        <span>${kind === 'schedule' ? 'Horaires' : 'Tarifs'} · ${escapeHtml(shortId(success.id))}</span>
      </div>
    `
    : '';

  container.innerHTML = `
    ${successHtml}
    <div class="preview-summary">
      ${summary.map(([label, value]) => `
        <div class="preview-stat">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join('')}
    </div>
    ${issueHtml}

    ${rows.length ? `
      <p class="preview-caption">${caption}</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>${columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${visibleRows.map((row) => `
              <tr>
                ${columns.map(([key]) => `<td>${escapeHtml(row?.[key] ?? '—')}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '<div class="preview-empty">Aucune ligne exploitable n a ete detectee dans cette previsualisation.</div>'}

    <details class="json-details">
      <summary>Details techniques</summary>
      <pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>
    </details>
  `;
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

async function previewImport(kind) {
  const fileInput = kind === 'schedule' ? $('scheduleFile') : $('fareFile');
  const textarea = kind === 'schedule' ? $('scheduleCsv') : $('fareCsv');
  const status = kind === 'schedule' ? $('scheduleStatus') : $('fareStatus');
  const csv = await readCsv(fileInput, textarea);

  if (!csv) {
    status.textContent = 'Choisissez un fichier CSV ou collez son contenu.';
    return;
  }

  setImportButtons(kind, 'preview');
  status.textContent = 'Previsualisation en cours...';

  try {
    const path = kind === 'schedule' ? '/admin/imports/schedules/preview' : '/admin/imports/fares/preview';
    const data = await api(path, {
      method: 'POST',
      body: JSON.stringify({ csv }),
    });
    state.previewCache[kind] = data;
    state.publishSuccess[kind] = null;
    renderPreview(kind, data);
    status.textContent = 'Previsualisation chargee.';
    setDashboardMessage(`Previsualisation ${kind === 'schedule' ? 'horaires' : 'tarifs'} chargee.`, 'success');
  } catch (error) {
    status.textContent = `Erreur: ${formatError(error)}`;
    setDashboardMessage(formatError(error), 'error');
  } finally {
    setImportButtons(kind, 'idle');
  }
}

async function publishImport(kind) {
  const fileInput = kind === 'schedule' ? $('scheduleFile') : $('fareFile');
  const textarea = kind === 'schedule' ? $('scheduleCsv') : $('fareCsv');
  const status = kind === 'schedule' ? $('scheduleStatus') : $('fareStatus');
  const csv = await readCsv(fileInput, textarea);

  if (!csv) {
    status.textContent = 'Choisissez un fichier CSV ou collez son contenu.';
    return;
  }

  setImportButtons(kind, 'publish');
  status.textContent = 'Creation du draft...';

  try {
    const createPath = kind === 'schedule' ? '/admin/imports/schedules' : '/admin/imports/fares';
    const draft = await api(createPath, {
      method: 'POST',
      body: JSON.stringify({ csv, filename: `${kind}.csv` }),
    });

    status.textContent = `Draft cree: ${shortId(draft.id)}. Publication en cours...`;

    await api(`/admin/imports/${draft.id}/publish`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    state.publishSuccess[kind] = { id: draft.id, kind };
    if (state.previewCache[kind]) renderPreview(kind, state.previewCache[kind]);
    status.textContent = 'Import publie avec succes.';
    setDashboardMessage(`Import ${kind === 'schedule' ? 'horaires' : 'tarifs'} publie avec succes.`, 'success');
    await refreshData();
  } catch (error) {
    status.textContent = `Erreur: ${formatError(error)}`;
    setDashboardMessage(formatError(error), 'error');
  } finally {
    setImportButtons(kind, 'idle');
  }
}

async function refreshData() {
  setDashboardMessage('');

  const healthPromise = fetch(`${apiBase()}/health`);
  const activePromise = api('/admin/imports/active');
  const importsPromise = api('/admin/imports');

  const [healthResult, activeResult, importsResult] = await Promise.allSettled([
    healthPromise,
    activePromise,
    importsPromise,
  ]);

  const healthOk = healthResult.status === 'fulfilled' && healthResult.value.ok;

  if (activeResult.status === 'fulfilled') {
    state.activeVersions = activeResult.value;
  } else {
    state.activeVersions = { scheduleImportId: null, fareImportId: null };
  }

  if (importsResult.status === 'fulfilled') {
    state.imports = Array.isArray(importsResult.value.items) ? importsResult.value.items : [];
  } else {
    state.imports = [];
    setDashboardMessage(formatError(importsResult.reason), 'error');
  }

  if (!healthOk && !$('dashboardMessage').textContent) {
    setDashboardMessage('Connexion API impossible pour le moment.', 'error');
  }

  updateKpis(healthOk);
  renderHistoryTable();
}

function bind() {
  $('loginTab').addEventListener('click', () => setAuthMode('login'));
  $('registerTab').addEventListener('click', () => setAuthMode('register'));
  $('authSubmit').addEventListener('click', () => {
    if (state.authMode === 'register') register();
    else login();
  });

  document.querySelectorAll('.sidebar-link').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });

  $('logoutBtn').addEventListener('click', logout);
  $('previewSchedules').addEventListener('click', () => previewImport('schedule'));
  $('previewFares').addEventListener('click', () => previewImport('fare'));
  $('publishSchedules').addEventListener('click', () => publishImport('schedule'));
  $('publishFares').addEventListener('click', () => publishImport('fare'));
  $('refreshHistoryBtn').addEventListener('click', refreshData);
  $('refreshVersionsBtn').addEventListener('click', refreshData);
}

window.addEventListener('DOMContentLoaded', () => {
  seedAccounts();
  restoreSession();
  initHeroRotations();
  bind();
  setAuthMode('login');
  setView('home');

  if (state.session && localStorage.getItem(TOKEN_KEY)) {
    showDashboard();
  } else {
    showAuth();
  }
});
