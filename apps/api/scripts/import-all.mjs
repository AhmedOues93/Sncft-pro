import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
const csvDir = process.env.CSV_DIR ?? path.resolve(process.cwd(), 'data/csv');

const schedulePattern = /^schedules_.*\.csv$/i;
const farePattern = /^fares_.*\.csv$/i;

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed ${response.status} ${response.statusText}: ${text}`);
  }

  return response.json();
}

async function importBatch(kind, files) {
  let lastDraftId = null;
  for (const file of files) {
    const csv = await readFile(path.join(csvDir, file), 'utf8');
    const draft = await postJson(`${apiBaseUrl}/admin/imports/${kind}`, { csv, filename: file });
    console.log(`[${kind}] draft ${draft.id} created from ${file} with status ${draft.status}`);
    if (draft.status === 'failed') {
      throw new Error(`Draft ${draft.id} has validation errors. Resolve CSV issues before publish.`);
    }
    lastDraftId = draft.id;
  }

  if (!lastDraftId) {
    console.log(`[${kind}] no files found, skipping publish`);
    return null;
  }

  const published = await postJson(`${apiBaseUrl}/admin/imports/${lastDraftId}/publish`, {});
  console.log(`[${kind}] published import ${published.id}`);
  return published.id;
}

async function main() {
  const files = await readdir(csvDir);
  const scheduleFiles = files.filter((name) => schedulePattern.test(name)).sort();
  const fareFiles = files.filter((name) => farePattern.test(name)).sort();

  console.log(`CSV folder: ${csvDir}`);
  console.log(`Schedule files: ${scheduleFiles.length}`);
  console.log(`Fare files: ${fareFiles.length}`);

  const scheduleImportId = await importBatch('schedules', scheduleFiles);
  const fareImportId = await importBatch('fares', fareFiles);

  console.log('Import summary');
  console.log(JSON.stringify({ scheduleImportId, fareImportId }, null, 2));
}

main().catch((error) => {
  console.error('import:all failed');
  console.error(error);
  process.exitCode = 1;
});
