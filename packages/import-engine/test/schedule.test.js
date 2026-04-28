import assert from 'node:assert/strict';
import test from 'node:test';

import {
  detectOvernightStops,
  normalizeStationName,
  normalizeTime,
  parseAndValidateFares,
  parseFareCsv,
  parseScheduleCsv,
  validateScheduleRows,
} from '../src/index.js';

const scheduleCsv = `line,line_name,season,valid_from,valid_to,direction,train_number,service_code,station_order,station,arrival_time,departure_time
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,500,DAILY,1,Tunis Ville,18:00,18:00
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,500,DAILY,2,Erriadh,18:45,18:45
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,501,DAILY,1,Tunis Ville,19:00,19:00
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,501,DAILY,2,Hammam Lif,19:30,19:30
D,Ligne D,HIVER,2025-12-01,2026-03-31,aller,645,DAILY,1,Tunis Ville,20:05,20:05
D,Ligne D,HIVER,2025-12-01,2026-03-31,aller,645,DAILY,2,Mellassine,20:42,20:42
E,Ligne E,HIVER,2025-12-01,2026-03-31,aller,651,DAILY,1,Ezzouhour 2,20:40,20:40
E,Ligne E,HIVER,2025-12-01,2026-03-31,aller,651,DAILY,2,Tunis Ville,21:22,21:22
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,700,DAILY,1,Tunis Ville,23:30,23:30
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,700,DAILY,2,Erriadh,00:11,00:11`;

const faresCsv = `line,origin,destination,amount,currency
A,tunis ville,erriadh,1.700,TND
A,tunis ville,hammam lif,1.500,TND
D,tunis ville,mellassine,0.800,TND`;

const faresCsv = `line,origin,destination,amount,currency
A,tunis ville,erriadh,1.700,TND
A,tunis ville,hammam lif,1.500,TND
D,tunis ville,mellassine,0.800,TND`;

test('detectOvernightStops handles overnight 23:30 -> 00:11', () => {
  const rows = parseScheduleCsv(scheduleCsv);
  const normalized = detectOvernightStops(rows).filter((item) => item.trainNumber === '700');
  assert.equal(normalized[0].arrivalMinutes, 1410);
  assert.equal(normalized[1].arrivalMinutes, 1451);
  assert.equal(normalized[1].dayOffset, 1);
  assert.equal(normalized[1].arrivalDisplayTime, '00:11');
});

test('Ligne A direct Tunis Ville -> Erriadh and partial trip Tunis Ville -> Hammam Lif are valid', () => {
  const rows = parseScheduleCsv(scheduleCsv);
  const result = validateScheduleRows(rows);
  assert.equal(result.issues.length, 0);

  const direct = result.validRows.filter((r) => r.lineCode === 'A' && r.stationName === 'Erriadh');
  const partial = result.validRows.filter((r) => r.lineCode === 'A' && r.stationName === 'Hammam Lif');
  assert.ok(direct.length > 0);
  assert.ok(partial.length > 0);
});

test('Ligne D and Ligne E stops are parsed', () => {
  const rows = parseScheduleCsv(scheduleCsv);
  const result = validateScheduleRows(rows);
  assert.ok(result.validRows.some((r) => r.lineCode === 'D' && r.stationName === 'Mellassine'));
  assert.ok(result.validRows.some((r) => r.lineCode === 'E' && r.stationName === 'Ezzouhour 2'));
});

test('fare parsing works for 1 and 2 passengers multipliers', () => {
  const fareRows = parseFareCsv(faresCsv);
  const fareResult = parseAndValidateFares(fareRows);
  assert.equal(fareResult.issues.length, 0);

  const aFare = fareResult.fares.find((f) => f.destination === 'erriadh');
  assert.equal(aFare.amount, 1.7);
  assert.equal(Number((aFare.amount * 2).toFixed(3)), 3.4);
});

test('invalid row handling returns errors', () => {
  const rows = parseScheduleCsv('line,station_order,station\nA,1,');
  const result = validateScheduleRows(rows);
  assert.equal(result.issues.length > 0, true);
});

test('invalid row handling returns errors', () => {
  const rows = parseScheduleCsv('line,station_order,station\nA,1,');
  const result = validateScheduleRows(rows);
  assert.equal(result.issues.length > 0, true);
});

test('normalizeTime and normalizeStationName remain stable', () => {
  assert.equal(normalizeTime('23:30'), 1410);
  assert.equal(normalizeStationName('Tunis-Ville SNCFT'), 'tunis ville sncft');
});
