import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { previewSchedulesFromPayload } from '../src/services/importPreview.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readFixture(name: string): string {
  return fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'packages', 'import-engine', 'test', 'fixtures', name),
    'utf8',
  );
}

test('preview endpoint behavior for normal trip is ready', () => {
  const response = previewSchedulesFromPayload(readFixture('sncft_normal_trip.csv'));

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.importStatus, 'ready');
  assert.equal(response.body.summary.totalRows, 3);
  assert.equal(response.body.summary.errorsCount, 0);
  assert.equal(response.body.preview.length, 1);
});

test('preview endpoint behavior for overnight trip keeps dayOffset in preview', () => {
  const response = previewSchedulesFromPayload({
    csvText: readFixture('sncft_overnight_trip.csv'),
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.importStatus, 'ready');
  assert.equal(response.body.preview[0]?.stops[1]?.arrivalDisplayTime, '00:11');
  assert.equal(response.body.preview[0]?.stops[1]?.dayOffset, 1);
});

test('preview endpoint behavior for invalid CSV is failed', () => {
  const response = previewSchedulesFromPayload(readFixture('sncft_invalid_trip.csv'));

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.importStatus, 'failed');
  assert.ok(response.body.summary.errorsCount > 0);
});

test('preview endpoint returns 400 when payload is empty', () => {
  const response = previewSchedulesFromPayload({});

  assert.equal(response.statusCode, 400);
});
