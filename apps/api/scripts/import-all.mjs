import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
const csvDir = process.env.CSV_DIR ?? path.resolve(process.cwd(), 'data/csv');
const adminToken = process.env.ADMIN_TOKEN ?? 'dev-token';

const schedulePattern = /^schedules_.*\.csv$/i;
const farePattern = /^fares_.*\.csv$/i;

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed ${response.status} ${response.statusText}: ${text}`);
  }

  return response.json();
}

function parseCsvRows(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });
    return row;
  });
}

function rowsToCsv(rows) {
  if (rows.length === 0) return '';
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    const values = headers.map((header) => String(row[header] ?? '').replace(/\r?\n/g, ' ').trim());
    if (values.every((value) => value === '')) return;
    lines.push(values.join(','));
  });
  return lines.join('\n');
}

async function mergeCsvFiles(files) {
  const allRows = [];
  for (const file of files) {
    const csv = await readFile(path.join(csvDir, file), 'utf8');
    const rows = parseCsvRows(csv);
    const nonBlankRows = rows.filter((row) => Object.values(row).some((value) => String(value).trim().length > 0));
    allRows.push(...nonBlankRows);
  }
  return rowsToCsv(allRows);
}

async function importBatch(kind, files) {
  if (!files.length) {
    console.log(`[${kind}] no files found, skipping publish`);
    return null;
  }

  const mergedCsv = await mergeCsvFiles(files);
  if (!mergedCsv.trim()) throw new Error(`[${kind}] merged CSV is empty`);

  const filename = kind === 'schedules' ? 'schedules_merged.csv' : 'fares_merged.csv';
  const draft = await postJson(`${apiBaseUrl}/admin/imports/${kind}`, { csv: mergedCsv, filename });
  console.log(`[${kind}] merged draft ${draft.id} created from ${files.length} files: ${files.join(', ')}`);
  if (draft.status === 'failed') {
    throw new Error(`Draft ${draft.id} has validation errors. Resolve CSV issues before publish.`);
  }

  const published = await postJson(`${apiBaseUrl}/admin/imports/${draft.id}/publish`, {});
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
  console.log(`API base URL: ${apiBaseUrl}`);

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
