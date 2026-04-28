import assert from 'node:assert/strict';
import test from 'node:test';

import { app } from '../src/app.js';
import { resetImportStoreForTests } from '../src/store/index.js';

const scheduleCsvV1 = `line,line_name,season,valid_from,valid_to,direction,train_number,service_code,station_order,station,arrival_time,departure_time
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,100,DAILY,1,Tunis Ville,05:02,05:02
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,100,DAILY,2,Hammam Lif,05:30,05:30
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,100,DAILY,3,Erriadh,05:44,05:44
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,101,DAILY,1,Tunis Ville,05:22,05:22
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,101,DAILY,2,Hammam Lif,05:50,05:50
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,101,DAILY,3,Erriadh,06:05,06:05
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,102,DAILY,1,Tunis Ville,05:42,05:42
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,102,DAILY,2,Hammam Lif,06:11,06:11
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,102,DAILY,3,Erriadh,06:25,06:25
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,103,DAILY,1,Tunis Ville,06:02,06:02
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,103,DAILY,2,Hammam Lif,06:29,06:29
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,103,DAILY,3,Erriadh,06:43,06:43
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,104,DAILY,1,Tunis Ville,06:22,06:22
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,104,DAILY,2,Hammam Lif,06:52,06:52
D,Ligne D,HIVER,2025-09-01,2025-12-31,aller,601,DAILY,1,Tunis Ville,18:52,18:52
D,Ligne D,HIVER,2025-09-01,2025-12-31,aller,601,DAILY,2,Mellassine,19:10,19:10
E,Ligne E,HIVER,2025-09-01,2025-12-31,aller,701,DAILY,1,Ezzouhour 2,18:10,18:10
E,Ligne E,HIVER,2025-09-01,2025-12-31,aller,701,DAILY,2,Barcelone,18:32,18:32
D,Ligne D,HIVER,2025-09-01,2025-12-31,aller,702,DAILY,1,Barcelone,18:38,18:38
D,Ligne D,HIVER,2025-09-01,2025-12-31,aller,702,DAILY,2,Mellassine,18:57,18:57
E,Ligne E,HIVER,2025-09-01,2025-12-31,aller,801,DAILY,1,Tunis Ville,07:10,07:10
E,Ligne E,HIVER,2025-09-01,2025-12-31,aller,801,DAILY,2,Bougatfa,07:45,07:45
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,901,DAILY,1,Tunis Ville,21:10,21:10
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,901,DAILY,2,Gobaa Ville,21:40,21:40`;

const scheduleCsvV2 = `line,line_name,season,valid_from,valid_to,direction,train_number,service_code,station_order,station,arrival_time,departure_time
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,200,DAILY,1,Tunis Ville,05:05,05:05
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,200,DAILY,2,Hammam Lif,05:38,05:38`;

const faresCsv = `line,origin,destination,amount,currency,fare_type,sections
A,tunis ville,hammam lif,1.200,TND,normal,2
A,tunis ville,hammam lif,2.900,TND,abonnement,2
A,tunis ville,erriadh,1.500,TND,normal,3
D,tunis ville,mellassine,0.800,TND,normal,1
E,ezzouhour 2,barcelone,0.700,TND,normal,1
D,barcelone,mellassine,0.600,TND,normal,1
E,tunis ville,bougatfa,1.100,TND,normal,2
A,,,,0.650,TND,normal,1`;

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

async function post(base: string, path: string, body: unknown) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('patch7 behavior + admin import/publish/rollback workflow', async () => {
  await withServer(async (base) => {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);

    const scheduleDraftResponse = await post(base, '/admin/imports/schedules', { csv: scheduleCsvV1, filename: 'schedules_line_A_banlieue_sud.csv' });
    assert.equal(scheduleDraftResponse.status, 201);
    const scheduleDraft = await scheduleDraftResponse.json() as { id: string; status: string };
    assert.equal(scheduleDraft.status, 'ready');

    const fareDraftResponse = await post(base, '/admin/imports/fares', { csv: faresCsv, filename: 'fares_line_A_banlieue_sud.csv' });
    assert.equal(fareDraftResponse.status, 201);
    const fareDraft = await fareDraftResponse.json() as { id: string; status: string };
    assert.equal(fareDraft.status, 'ready');

    await post(base, `/admin/imports/${scheduleDraft.id}/publish`, {});
    await post(base, `/admin/imports/${fareDraft.id}/publish`, {});

    const activeVersionsRes = await fetch(`${base}/admin/active-versions`);
    const activeVersions = await activeVersionsRes.json() as { scheduleImportId?: string; fareImportId?: string };
    assert.equal(activeVersions.scheduleImportId, scheduleDraft.id);
    assert.equal(activeVersions.fareImportId, fareDraft.id);

    const historyRes = await fetch(`${base}/admin/imports`);
    const history = await historyRes.json() as { count: number };
    assert.equal(history.count >= 2, true);

    for (const query of ['tun', 'ham', 'mel', 'bou', 'err']) {
      const stationsRes = await fetch(`${base}/stations/search?q=${query}&limit=10`);
      const stationsJson = await stationsRes.json() as { count: number; items: Array<{ id: string }> };
      assert.equal(stationsJson.count > 0, true);
      assert.equal(stationsJson.items.length <= 10, true);
    }

    const hamRes = await fetch(`${base}/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Hammam%20Lif&datetime=2025-09-02T05:00:00&passengers=1&offset=0&limit=5`);
    const hamJson = await hamRes.json() as {
      items: Array<{ departureTime: string; fare: { amount: number }; type: string }>;
      total: number;
      hasNext: boolean;
      nextOffset: number | null;
    };
    assert.equal(hamJson.items[0]?.departureTime, '05:02');
    assert.equal(hamJson.items[0]?.fare.amount, 1.2);
    assert.equal(hamJson.items[0]?.type, 'direct');
    assert.equal(hamJson.total > 5, false);
    assert.equal(hamJson.hasNext, false);
    assert.equal(hamJson.nextOffset, null);

    const hamPage2Res = await fetch(`${base}/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Hammam%20Lif&datetime=2025-09-02T05:00:00&passengers=1&offset=5&limit=5`);
    const hamPage2 = await hamPage2Res.json() as { count: number; hasPrevious: boolean; previousOffset: number; nextOffset: number | null };
    assert.equal(hamPage2.count, 0);
    assert.equal(hamPage2.hasPrevious, true);
    assert.equal(hamPage2.previousOffset, 0);
    assert.equal(hamPage2.nextOffset, null);

    const erriadhRes = await fetch(`${base}/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Erriadh&datetime=2025-09-02T05:00:00&passengers=1&offset=0&limit=5`);
    const erriadh = await erriadhRes.json() as { count: number };
    assert.equal(erriadh.count > 0, true);

    const bougatfaRes = await fetch(`${base}/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Bougatfa&datetime=2025-09-02T05:00:00&passengers=1&offset=0&limit=5`);
    const bougatfa = await bougatfaRes.json() as { count: number };
    assert.equal(bougatfa.count > 0, true);

    const gobaaRes = await fetch(`${base}/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Gobaa%20Ville&datetime=2025-09-02T20:00:00&passengers=1&offset=0&limit=5`);
    const gobaa = await gobaaRes.json() as { count: number };
    assert.equal(gobaa.count > 0, true);

    const transferRes = await fetch(`${base}/journeys/search?originStationId=Ezzouhour%202&destinationStationId=Mellassine&datetime=2025-09-02T18:00:00&passengers=2&offset=0&limit=5`);
    const transferJson = await transferRes.json() as { items: Array<{ type: string; transferStationId?: string; fare: { amount: number } }> };
    assert.equal(transferJson.items.some((item) => item.type === 'transfer'), true);
    assert.equal(transferJson.items.some((item) => item.transferStationId === 'barcelone'), true);

    const transferViaBarcelone = transferJson.items.find((item) => item.transferStationId === 'barcelone');
    assert.equal(transferViaBarcelone?.fare.amount, 2.6);

    const scheduleDraftV2Response = await post(base, '/admin/imports/schedules', { csv: scheduleCsvV2, filename: 'schedules_line_A_banlieue_sud_v2.csv' });
    const scheduleDraftV2 = await scheduleDraftV2Response.json() as { id: string };
    await post(base, `/admin/imports/${scheduleDraftV2.id}/publish`, {});

    const afterPublishRes = await fetch(`${base}/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Hammam%20Lif&datetime=2025-09-02T05:00:00&passengers=1&offset=0&limit=5`);
    const afterPublish = await afterPublishRes.json() as { items: Array<{ departureTime: string }> };
    assert.equal(afterPublish.items[0]?.departureTime, '05:05');

    await post(base, `/admin/imports/${scheduleDraftV2.id}/rollback`, {});

    const afterRollbackRes = await fetch(`${base}/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Hammam%20Lif&datetime=2025-09-02T05:00:00&passengers=1&offset=0&limit=5`);
    const afterRollback = await afterRollbackRes.json() as { items: Array<{ departureTime: string }> };
    assert.equal(afterRollback.items[0]?.departureTime, '05:02');
  });
});
