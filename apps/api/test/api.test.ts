import assert from 'node:assert/strict';
import test from 'node:test';

process.env.ADMIN_AUTH_REQUIRED = 'true';
process.env.SNCFT_DEV_ADMIN_ROLE = 'superadmin';
process.env.NODE_ENV = 'test';

const { app } = await import('../src/app.js');
const { resetImportStoreForTests } = await import('../src/store/index.js');

const adminHeaders = {
  'content-type': 'application/json',
  authorization: 'Bearer dev-token',
};

const scheduleCsv = `line,line_name,season,valid_from,valid_to,direction,train_number,service_code,station_order,station,arrival_time,departure_time
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,100,DAILY,1,Tunis Ville,05:02,05:02
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,100,DAILY,2,Hammam Lif,05:30,05:30
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,100,DAILY,3,Erriadh,05:44,05:44
E,Ligne E,HIVER,2025-09-01,2025-12-31,aller,701,DAILY,1,Ezzouhour 2,18:10,18:10
E,Ligne E,HIVER,2025-09-01,2025-12-31,aller,701,DAILY,2,Barcelone,18:32,18:32
D,Ligne D,HIVER,2025-09-01,2025-12-31,aller,702,DAILY,1,Barcelone,18:38,18:38
D,Ligne D,HIVER,2025-09-01,2025-12-31,aller,702,DAILY,2,Mellassine,18:57,18:57`;

const faresCsv = `line,origin,destination,amount,currency,fare_type
A,tunis ville,hammam lif,1.200,TND,normal
E,ezzouhour 2,barcelone,0.700,TND,normal
D,barcelone,mellassine,0.600,TND,normal`;

async function withServer(run: (baseUrl: string) => Promise<void>) {
  resetImportStoreForTests();
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

async function post(base: string, path: string, body: unknown, headers = adminHeaders) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

test('public routes stay public and admin routes require auth', async () => {
  await withServer(async (base) => {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);

    const stations = await fetch(`${base}/stations/search?q=tun&limit=10`);
    assert.equal(stations.status, 200);

    const journeysBadDatetime = await fetch(`${base}/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Hammam%20Lif&datetime=bad-date&passengers=1&offset=0&limit=5`);
    assert.equal(journeysBadDatetime.status, 400);

    const adminNoToken = await fetch(`${base}/admin/imports/schedules/preview`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ csv: scheduleCsv }),
    });
    assert.equal(adminNoToken.status, 401);
  });
});

test('role checks: viewer/editor/publisher permissions', async () => {
  await withServer(async (base) => {
    const viewerPreview = await post(base, '/admin/imports/schedules/preview', { csv: scheduleCsv }, { 'content-type': 'application/json', authorization: 'Bearer dev-viewer' });
    assert.equal(viewerPreview.status, 403);

    const editorPreview = await post(base, '/admin/imports/schedules/preview', { csv: scheduleCsv }, { 'content-type': 'application/json', authorization: 'Bearer dev-editor' });
    assert.equal(editorPreview.status, 200);

    const editorDraft = await post(base, '/admin/imports/schedules', { csv: scheduleCsv }, { 'content-type': 'application/json', authorization: 'Bearer dev-editor' });
    const editorDraftJson = await editorDraft.json() as { id: string };
    assert.equal(editorDraft.status, 201);

    const editorPublish = await post(base, `/admin/imports/${editorDraftJson.id}/publish`, {}, { 'content-type': 'application/json', authorization: 'Bearer dev-editor' });
    assert.equal(editorPublish.status, 403);

    const publisherPublish = await post(base, `/admin/imports/${editorDraftJson.id}/publish`, {}, { 'content-type': 'application/json', authorization: 'Bearer dev-publisher' });
    assert.equal(publisherPublish.status, 200);
  });
});

test('admin workflow + journey pagination payload preserved', async () => {
  await withServer(async (base) => {
    const scheduleDraftResponse = await post(base, '/admin/imports/schedules', { csv: scheduleCsv, filename: 'schedules.csv' });
    const scheduleDraft = await scheduleDraftResponse.json() as { id: string };

    const fareDraftResponse = await post(base, '/admin/imports/fares', { csv: faresCsv, filename: 'fares.csv' });
    const fareDraft = await fareDraftResponse.json() as { id: string };

    await post(base, `/admin/imports/${scheduleDraft.id}/publish`, {});
    await post(base, `/admin/imports/${fareDraft.id}/publish`, {});

    const historyRes = await fetch(`${base}/admin/imports`, { headers: { authorization: 'Bearer dev-viewer' } });
    assert.equal(historyRes.status, 200);

    const activeRes = await fetch(`${base}/admin/imports/active`, { headers: { authorization: 'Bearer dev-viewer' } });
    const active = await activeRes.json() as { scheduleImportId?: string; fareImportId?: string };
    assert.equal(active.scheduleImportId, scheduleDraft.id);
    assert.equal(active.fareImportId, fareDraft.id);

    const journeys = await fetch(`${base}/journeys/search?originStationId=Ezzouhour%202&destinationStationId=Mellassine&datetime=2025-09-02T18:00:00&passengers=2&offset=0&limit=50`);
    const journeysJson = await journeys.json() as { limit: number; total: number; hasNext: boolean; hasPrevious: boolean; nextOffset: number | null; previousOffset: number; items: Array<{ type: string }> };
    assert.equal(journeys.status, 200);
    assert.equal(journeysJson.limit, 5);
    assert.equal(typeof journeysJson.total, 'number');
    assert.equal(typeof journeysJson.hasNext, 'boolean');
    assert.equal(typeof journeysJson.hasPrevious, 'boolean');
    assert.equal(journeysJson.items.some((item) => item.type === 'transfer'), true);
  });
});
