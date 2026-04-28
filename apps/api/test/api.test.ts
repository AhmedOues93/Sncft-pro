import assert from 'node:assert/strict';
import test from 'node:test';

import { app } from '../src/app.js';

const scheduleCsv = `line,line_name,season,valid_from,valid_to,direction,train_number,service_code,station_order,station,arrival_time,departure_time
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,101,DAILY,1,Tunis Ville,05:02,05:02
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,101,DAILY,2,Hammam Lif,05:28,05:28
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,102,DAILY,1,Tunis Ville,05:22,05:22
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,102,DAILY,2,Hammam Lif,05:49,05:49
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,103,DAILY,1,Tunis Ville,05:42,05:42
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,103,DAILY,2,Hammam Lif,06:08,06:08
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,104,DAILY,1,Tunis Ville,06:01,06:01
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,104,DAILY,2,Hammam Lif,06:28,06:28
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,105,DAILY,1,Tunis Ville,06:20,06:20
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,105,DAILY,2,Hammam Lif,06:45,06:45
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,501,DAILY,1,Ezzouhour 2,18:24,18:24
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,501,DAILY,2,Tunis Ville,18:40,18:40
D,Ligne D,HIVER,2025-12-01,2026-03-31,aller,601,DAILY,1,Tunis Ville,18:52,18:52
D,Ligne D,HIVER,2025-12-01,2026-03-31,aller,601,DAILY,2,Mellassine,19:10,19:10
E,Ligne E,HIVER,2025-12-01,2026-03-31,aller,701,DAILY,1,Ezzouhour 2,18:10,18:10
E,Ligne E,HIVER,2025-12-01,2026-03-31,aller,701,DAILY,2,Barcelone,18:32,18:32
D,Ligne D,HIVER,2025-12-01,2026-03-31,aller,702,DAILY,1,Barcelone,18:38,18:38
D,Ligne D,HIVER,2025-12-01,2026-03-31,aller,702,DAILY,2,Mellassine,18:57,18:57`;

const faresCsv = `line,origin,destination,amount,currency,fare_type
A,tunis ville,hammam lif,1.200,TND,normal
A,tunis ville,hammam lif,2.900,TND,business
A,ezzouhour 2,tunis ville,0.900,TND,normal
D,tunis ville,mellassine,0.800,TND,normal
E,ezzouhour 2,barcelone,0.700,TND,normal
D,barcelone,mellassine,0.600,TND,normal`;

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

test('health + stations + direct/transfer journey search with pagination and fare logic', async () => {
  await withServer(async (base) => {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);

    const createSchedule = await fetch(`${base}/admin/imports/schedules`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ csv: scheduleCsv }),
    });
    const scheduleJson = await createSchedule.json() as { id: string };
    await fetch(`${base}/admin/imports/${scheduleJson.id}/publish`, { method: 'POST' });

    const createFare = await fetch(`${base}/admin/imports/fares`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ csv: faresCsv }),
    });
    const fareJson = await createFare.json() as { id: string };
    await fetch(`${base}/admin/imports/fares/${fareJson.id}/publish`, { method: 'POST' });

    const stations = await fetch(`${base}/stations/search?q=tu`);
    const stationsJson = await stations.json() as { count: number; items: Array<{ id: string; name: string }> };
    assert.ok(stationsJson.count > 0);
    assert.equal(stationsJson.items[0]?.id, 'tunis ville');

    const directPage1 = await fetch(`${base}/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Hammam%20Lif&datetime=2025-09-02T05:00:00&passengers=1&offset=0&limit=5`);
    const directPage1Json = await directPage1.json() as {
      total: number;
      hasNext: boolean;
      nextOffset: number | null;
      items: Array<{ departureTime: string; fare: { amount: number }; type: string }>;
    };

    assert.equal(directPage1Json.items.length, 5);
    assert.equal(directPage1Json.items[0]?.departureTime, '05:02');
    assert.equal(directPage1Json.items[1]?.departureTime, '05:22');
    assert.equal(directPage1Json.items[4]?.departureTime, '06:20');
    assert.equal(directPage1Json.items[0]?.fare.amount, 1.2);
    assert.equal(directPage1Json.total >= 5, true);
    assert.equal(directPage1Json.hasNext, false);
    assert.equal(directPage1Json.nextOffset, null);

    const transfer = await fetch(`${base}/journeys/search?originStationId=Ezzouhour%202&destinationStationId=Mellassine&datetime=2026-01-04T18:00:00Z&passengers=2&offset=0&limit=5`);
    const transferJson = await transfer.json() as {
      items: Array<{
        type: string;
        transferStationId?: string;
        transferWaitMinutes?: number;
        fare: { amount: number };
      }>;
    };

    assert.ok(transferJson.items.some((item) => item.type === 'transfer' && item.transferStationId === 'tunis ville'));
    assert.ok(transferJson.items.some((item) => item.type === 'transfer' && item.transferStationId === 'barcelone'));
    assert.ok(transferJson.items.every((item) => (item.transferWaitMinutes ?? 5) >= 5));
    assert.ok(transferJson.items.every((item) => (item.transferWaitMinutes ?? 90) <= 90));

    const tunisTransfer = transferJson.items.find((item) => item.transferStationId === 'tunis ville');
    assert.equal(tunisTransfer?.fare.amount, 3.4);
  });
});
