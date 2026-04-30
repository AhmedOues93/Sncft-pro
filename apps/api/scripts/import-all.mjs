import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const API_BASE = process.env.API_BASE_URL || process.env.SNCFT_API_BASE_URL || 'http://127.0.0.1:3000';
const CSV_DIR = resolve(process.argv[2] || process.env.CSV_DIR || `${process.env.HOME}/Desktop/csv`);
const AUTH_TOKEN = process.env.ADMIN_TOKEN || process.env.SNCFT_ADMIN_TOKEN || 'dev-token';

function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (AUTH_TOKEN) h.Authorization = `Bearer ${AUTH_TOKEN}`;
  return h;
}

async function postJson(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload ?? {}),
  });

  const text = await response.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Request failed ${response.status} ${response.statusText}: ${text}`);
  }

  return json;
}

async function postJsonAny(paths, payload) {
  let lastError;
  for (const path of paths) {
    try {
      return await postJson(path, payload);
    } catch (error) {
      lastError = error;
      if (!String(error?.message || '').includes('404')) {
        throw error;
      }
    }
  }
  throw lastError;
}

function splitCsvLine(line) {
  const out = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      out.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  out.push(current);
  return out;
}

function parseCsvLoose(content) {
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (!lines.length) return [];

  const sourceHeaders = splitCsvLine(lines[0]).map((h) => h.trim().replace(/^\uFEFF/, ''));

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};
    sourceHeaders.forEach((header, index) => {
      row[header] = (values[index] ?? '').trim();
    });
    return row;
  });
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function normalizeScheduleRows(filesWithContent) {
  const rows = [];

  for (const { filename, content } of filesWithContent) {
    for (const row of parseCsvLoose(content)) {
      const line = row.line || row.line_code || row.lineCode || '';
      const station = row.station || row.station_name || row.stationName || '';
      const stationOrder = row.station_order || row.stop_sequence || row.stopSequence || '';
      const time = row.time || row.arrival_time || row.departure_time || row.arrivalTime || row.departureTime || '';

      // Source CSVs sometimes have trailing notes/empty rows. They are not stops.
      if (!line || !station || !stationOrder) continue;

      rows.push({
        line,
        line_code: row.line_code || row.lineCode || line,
        line_name: row.line_name || row.lineName || line,
        season: row.season || 'all',
        valid_from: row.valid_from || row.validFrom || '',
        valid_to: row.valid_to || row.validTo || '',
        direction: row.direction || '',
        train_number: row.train_number || row.trainNumber || '',
        service_code: row.service_code || row.serviceCode || 'all',
        station_order: stationOrder,
        station,
        arrival_time: row.arrival_time || row.arrivalTime || time,
        departure_time: row.departure_time || row.departureTime || time,
        time,
        source_file: filename,
      });
    }
  }

  return rows;
}

function normalizeFareRows(filesWithContent) {
  const rows = [];

  for (const { filename, content } of filesWithContent) {
    for (const row of parseCsvLoose(content)) {
      const line = row.line || row.line_code || row.lineCode || '';
      const origin = row.origin || row.origin_station || row.originStation || row.from || '';
      const destination = row.destination || row.destination_station || row.destinationStation || row.to || '';
      const sections = row.sections || row.section || '';
      const amount = row.amount || row.price_tnd || row.price || row.fare || row.tarif || '';

      // Keep either OD fares or section fares. Skip totally empty fare rows.
      if (!line && !origin && !destination && !sections && !amount) continue;
      if (!amount) continue;

      rows.push({
        line,
        line_code: row.line_code || row.lineCode || line,
        line_name: row.line_name || row.lineName || line,
        origin,
        destination,
        sections,
        amount,
        price_tnd: row.price_tnd || row.price || row.amount || amount,
        currency: row.currency || 'TND',
        fare_type: row.fare_type || row.ticket_type || row.fare_class || row.type || 'Plein tarif',
        ticket_type: row.ticket_type || row.fare_type || row.fare_class || 'Plein tarif',
        fare_class: row.fare_class || row.fare_type || row.ticket_type || 'Plein tarif',
        valid_from: row.valid_from || row.validFrom || '',
        valid_to: row.valid_to || row.validTo || '',
        source_file: filename,
      });
    }
  }

  return rows;
}

function rowsToCsv(headers, rows) {
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n') + '\n';
}

async function readGroup(files) {
  const result = [];
  for (const filename of files) {
    result.push({
      filename,
      content: await readFile(resolve(CSV_DIR, filename), 'utf8'),
    });
  }
  return result;
}

async function main() {
  const files = await readdir(CSV_DIR);

  let scheduleFiles = files
    .filter((file) => /^schedules_.*\.csv$/i.test(file) || /^line_.*schedules.*\.csv$/i.test(file))
    .sort();

  // Prefer canonical schedules_*.csv names and avoid importing duplicate line_A files twice.
  const canonicalLineA = scheduleFiles.find((file) => /^schedules_line_A_banlieue_sud\.csv$/i.test(file));
  if (canonicalLineA) {
    scheduleFiles = scheduleFiles.filter((file) => {
      const lower = file.toLowerCase();
      return file === canonicalLineA || !lower.includes("line_a_banlieue_sud");
    });
  }

  const fareFiles = files
    .filter((file) => /^fares_.*\.csv$/i.test(file))
    .sort();

  console.log(`CSV folder: ${CSV_DIR}`);
  console.log(`Schedule files: ${scheduleFiles.length}`);
  scheduleFiles.forEach((file) => console.log(`  - ${file}`));
  console.log(`Fare files: ${fareFiles.length}`);
  fareFiles.forEach((file) => console.log(`  - ${file}`));

  if (!scheduleFiles.length) throw new Error('No schedule CSV files found');
  if (!fareFiles.length) throw new Error('No fare CSV files found');

  const scheduleRows = normalizeScheduleRows(await readGroup(scheduleFiles));
  const fareRows = normalizeFareRows(await readGroup(fareFiles));

  if (!scheduleRows.length) throw new Error('No valid schedule rows found after normalization');
  if (!fareRows.length) throw new Error('No valid fare rows found after normalization');

  const scheduleHeaders = [
    'line',
    'line_code',
    'line_name',
    'season',
    'valid_from',
    'valid_to',
    'direction',
    'train_number',
    'service_code',
    'station_order',
    'station',
    'arrival_time',
    'departure_time',
    'time',
    'source_file',
  ];

  const fareHeaders = [
    'line',
    'line_code',
    'line_name',
    'origin',
    'destination',
    'sections',
    'amount',
    'price_tnd',
    'currency',
    'fare_type',
    'ticket_type',
    'fare_class',
    'valid_from',
    'valid_to',
    'source_file',
  ];

  const scheduleCsv = rowsToCsv(scheduleHeaders, scheduleRows);
  const fareCsv = rowsToCsv(fareHeaders, fareRows);

  console.log(`[schedules] merged valid rows: ${scheduleRows.length}`);
  const scheduleDraft = await postJson('/admin/imports/schedules', {
    csv: scheduleCsv,
    sourceFilename: 'merged_schedules_A_D_E.csv',
  });
  console.log(`[schedules] draft ${scheduleDraft.id} status ${scheduleDraft.status}`);

  const schedulePublish = await postJsonAny([`/admin/imports/${scheduleDraft.id}/publish`, `/admin/imports/schedules/${scheduleDraft.id}/publish`], { force: true });
  console.log(`[schedules] published import ${schedulePublish.id ?? scheduleDraft.id}`);

  console.log(`[fares] merged valid rows: ${fareRows.length}`);
  const fareDraft = await postJson('/admin/imports/fares', {
    csv: fareCsv,
    sourceFilename: 'merged_fares_A_D_E.csv',
  });
  console.log(`[fares] draft ${fareDraft.id} status ${fareDraft.status}`);

  const farePublish = await postJsonAny([`/admin/imports/fares/${fareDraft.id}/publish`, `/admin/imports/${fareDraft.id}/publish`], { force: true });
  console.log(`[fares] published import ${farePublish.id ?? fareDraft.id}`);

  console.log('Import summary');
  console.log(JSON.stringify({
    scheduleImportId: scheduleDraft.id,
    fareImportId: fareDraft.id,
    scheduleRows: scheduleRows.length,
    fareRows: fareRows.length,
  }, null, 2));
}

main().catch((error) => {
  console.error('import:all failed');
  console.error(error);
  process.exitCode = 1;
});
