const storageKey = 'sncft_admin_api_base';
const tokenKey = 'sncft_admin_auth_token';
const state = {
  apiBaseUrl: localStorage.getItem(storageKey) || 'http://localhost:3000',
  authToken: localStorage.getItem(tokenKey) || '',
  latestScheduleDraftId: null,
  latestFareDraftId: null,
};

const el = {
  apiBaseUrl: document.getElementById('apiBaseUrl'),
  saveApiConfig: document.getElementById('saveApiConfig'),
  authToken: document.getElementById('authToken'),
  refreshActive: document.getElementById('refreshActive'),
  refreshHistory: document.getElementById('refreshHistory'),
  activeOutput: document.getElementById('activeOutput'),
  historyOutput: document.getElementById('historyOutput'),
  scheduleFile: document.getElementById('scheduleFile'),
  scheduleCsv: document.getElementById('scheduleCsv'),
  previewSchedule: document.getElementById('previewSchedule'),
  saveSchedule: document.getElementById('saveSchedule'),
  publishSchedule: document.getElementById('publishSchedule'),
  rollbackSchedule: document.getElementById('rollbackSchedule'),
  scheduleOutput: document.getElementById('scheduleOutput'),
  fareFile: document.getElementById('fareFile'),
  fareCsv: document.getElementById('fareCsv'),
  previewFare: document.getElementById('previewFare'),
  saveFare: document.getElementById('saveFare'),
  publishFare: document.getElementById('publishFare'),
  rollbackFare: document.getElementById('rollbackFare'),
  fareOutput: document.getElementById('fareOutput'),
};

el.apiBaseUrl.value = state.apiBaseUrl;
el.authToken.value = state.authToken;

function jsonOut(node, payload) {
  node.textContent = JSON.stringify(payload, null, 2);
}

async function api(path, options = {}) {
  const response = await fetch(`${state.apiBaseUrl}${path}`, {
    headers: { 'content-type': 'application/json', ...(state.authToken ? { authorization: `Bearer ${state.authToken}` } : {}), ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  let body = text;
  try { body = JSON.parse(text); } catch {}
  if (!response.ok) throw new Error(typeof body === 'string' ? body : JSON.stringify(body));
  return body;
}

async function loadActive() {
  try {
    const data = await api('/admin/imports/active');
    jsonOut(el.activeOutput, data);
  } catch (error) {
    jsonOut(el.activeOutput, { error: String(error) });
  }
}

async function loadHistory() {
  try {
    const data = await api('/admin/imports');
    jsonOut(el.historyOutput, data);
  } catch (error) {
    jsonOut(el.historyOutput, { error: String(error) });
  }
}

async function preview(kind) {
  const csv = kind === 'schedule' ? el.scheduleCsv.value : el.fareCsv.value;
  if (!csv.trim()) return;
  const path = kind === 'schedule' ? '/admin/imports/schedules/preview' : '/admin/imports/fares/preview';
  const target = kind === 'schedule' ? el.scheduleOutput : el.fareOutput;
  try {
    const data = await api(path, { method: 'POST', body: JSON.stringify({ csv }) });
    jsonOut(target, data);
  } catch (error) {
    jsonOut(target, { error: String(error) });
  }
}

async function saveDraft(kind) {
  const csv = kind === 'schedule' ? el.scheduleCsv.value : el.fareCsv.value;
  if (!csv.trim()) return;
  const filename = kind === 'schedule' ? (el.scheduleFile.files?.[0]?.name || 'schedules.csv') : (el.fareFile.files?.[0]?.name || 'fares.csv');
  const path = kind === 'schedule' ? '/admin/imports/schedules' : '/admin/imports/fares';
  const target = kind === 'schedule' ? el.scheduleOutput : el.fareOutput;
  try {
    const data = await api(path, { method: 'POST', body: JSON.stringify({ csv, filename }) });
    if (kind === 'schedule') state.latestScheduleDraftId = data.id;
    else state.latestFareDraftId = data.id;
    jsonOut(target, data);
    await loadHistory();
  } catch (error) {
    jsonOut(target, { error: String(error) });
  }
}

async function publish(kind) {
  const id = kind === 'schedule' ? state.latestScheduleDraftId : state.latestFareDraftId;
  const target = kind === 'schedule' ? el.scheduleOutput : el.fareOutput;
  if (!id) return jsonOut(target, { error: 'Aucun draft disponible.' });
  try {
    const data = await api(`/admin/imports/${id}/publish`, { method: 'POST', body: '{}' });
    jsonOut(target, data);
    await loadActive();
  } catch (error) {
    jsonOut(target, { error: String(error) });
  }
}

async function rollback(kind) {
  const id = kind === 'schedule' ? state.latestScheduleDraftId : state.latestFareDraftId;
  const target = kind === 'schedule' ? el.scheduleOutput : el.fareOutput;
  if (!id) return jsonOut(target, { error: 'Aucun draft connu pour rollback.' });

  const path = kind === 'schedule' ? `/admin/imports/${id}/rollback` : `/admin/imports/fares/${id}/rollback`;
  try {
    const data = await api(path, { method: 'POST', body: '{}' });
    jsonOut(target, data);
    await loadActive();
  } catch (error) {
    jsonOut(target, { error: String(error) });
  }
}

function bindCsvFile(input, textarea) {
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    textarea.value = await file.text();
  });
}

el.saveApiConfig.onclick = () => {
  state.apiBaseUrl = el.apiBaseUrl.value.trim() || 'http://localhost:3000';
  localStorage.setItem(storageKey, state.apiBaseUrl);
  state.authToken = el.authToken.value.trim();
  localStorage.setItem(tokenKey, state.authToken);
  loadActive();
};
el.refreshActive.onclick = loadActive;
el.refreshHistory.onclick = loadHistory;

el.previewSchedule.onclick = () => preview('schedule');
el.saveSchedule.onclick = () => saveDraft('schedule');
el.publishSchedule.onclick = () => publish('schedule');
el.rollbackSchedule.onclick = () => rollback('schedule');

el.previewFare.onclick = () => preview('fare');
el.saveFare.onclick = () => saveDraft('fare');
el.publishFare.onclick = () => publish('fare');
el.rollbackFare.onclick = () => rollback('fare');

bindCsvFile(el.scheduleFile, el.scheduleCsv);
bindCsvFile(el.fareFile, el.fareCsv);

loadActive();
loadHistory();
