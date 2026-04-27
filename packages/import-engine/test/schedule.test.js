import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  detectOvernightStops,
  normalizeStationName,
  normalizeTime,
  parseScheduleCsv,
  validateScheduleRows,
} from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('normalizeTime parses HH:MM into absolute minutes', () => {
  assert.equal(normalizeTime('23:30'), 1410);
  assert.equal(normalizeTime('00:11'), 11);
});

test('detectOvernightStops flags next-day arrival for 23:30 -> 00:11', () => {
  const csvPath = path.join(__dirname, 'fixtures', 'schedules_sample.csv');
  const rows = parseScheduleCsv(fs.readFileSync(csvPath, 'utf8'));
  const normalized = detectOvernightStops(rows).filter((item) => item.tripId === 'A-100');

  assert.equal(normalized[0].arrivalMinutes, 1410);
  assert.equal(normalized[1].arrivalMinutes, 1451);
  assert.equal(normalized[1].dayOffset, 1);
});

test('partial trips are valid (e.g. Tunis Ville -> Hammam Lif)', () => {
  const csvPath = path.join(__dirname, 'fixtures', 'schedules_sample.csv');
  const rows = parseScheduleCsv(fs.readFileSync(csvPath, 'utf8')).filter((row) => row.trip_id === 'A-200');

  const result = validateScheduleRows(rows);

  assert.equal(result.issues.length, 0);
  assert.equal(result.validRows.length, 2);
  assert.equal(result.validRows[0].stationId, 'TVL');
  assert.equal(result.validRows[1].stationId, 'HLI');
});

test('normalizeStationName normalizes punctuation and casing', () => {
  assert.equal(normalizeStationName('Tunis-Ville SNCFT'), 'tunis ville sncft');
});
