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

function readFixture(name) {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
}

test('parse and validate normal Tunis Ville -> Erriadh trip', () => {
  const rows = parseScheduleCsv(readFixture('sncft_normal_trip.csv'));
  const result = validateScheduleRows(rows);

  assert.equal(result.issues.length, 0);
  assert.equal(result.validRows.length, 3);
  assert.equal(result.validRows[0].stationName, 'Tunis Ville');
  assert.equal(result.validRows[2].stationName, 'Erriadh');
  assert.equal(result.validRows[0].arrivalMinutes, 430);
  assert.ok(result.normalizedOutput);
  assert.equal(result.normalizedOutput.trips.length, 1);
  assert.equal(result.normalizedOutput.stopTimes.length, 3);
});

test('overnight Tunis Ville 23:30 -> Erriadh 00:11 is detected as next day', () => {
  const rows = parseScheduleCsv(readFixture('sncft_overnight_trip.csv'));
  const normalized = detectOvernightStops(rows);

  assert.equal(normalized[0].arrivalMinutes, 1410);
  assert.equal(normalized[1].arrivalMinutes, 1451);
  assert.equal(normalized[1].dayOffset, 1);
  assert.equal(normalized[1].arrivalDisplayTime, '00:11');
});

test('partial trip Tunis Ville -> Hammam Lif is valid', () => {
  const rows = parseScheduleCsv(readFixture('sncft_partial_trip.csv'));
  const result = validateScheduleRows(rows);

  assert.equal(result.issues.length, 0);
  assert.equal(result.validRows.length, 2);
  assert.equal(result.validRows[0].stationName, 'Tunis Ville');
  assert.equal(result.validRows[1].stationName, 'Hammam Lif');
});

test('normalizeTime and normalizeStationName remain stable', () => {
  assert.equal(normalizeTime('23:30'), 1410);
  assert.equal(normalizeStationName('Tunis-Ville SNCFT'), 'tunis ville sncft');
});
