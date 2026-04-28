const resultEl = document.getElementById('result');
const csvEl = document.getElementById('csv');
const importIdEl = document.getElementById('importId');
const apiBase = window.localStorage.getItem('ADMIN_API_BASE_URL') || 'http://localhost:3000';

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, options);
  const body = await response.json().catch(() => ({}));
  resultEl.textContent = JSON.stringify({ status: response.status, body }, null, 2);
  return body;
}

document.getElementById('previewBtn').addEventListener('click', async () => {
  await request('/admin/imports/schedules/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv' },
    body: csvEl.value,
  });
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  const body = await request('/admin/imports/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'text/csv' },
    body: csvEl.value,
  });
  if (body.importId) {
    importIdEl.value = body.importId;
  }
});

document.getElementById('publishBtn').addEventListener('click', async () => {
  if (!importIdEl.value) return;
  await request(`/admin/imports/${importIdEl.value}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force: true }),
  });
});

document.getElementById('rollbackBtn').addEventListener('click', async () => {
  if (!importIdEl.value) return;
  await request(`/admin/imports/${importIdEl.value}/rollback`, { method: 'POST' });
});
