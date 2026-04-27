import assert from 'node:assert/strict';
import test from 'node:test';

import { app } from '../src/app.js';

const scheduleCsv = `line,line_name,season,valid_from,valid_to,direction,train_number,service_code,station_order,station,arrival_time,departure_time
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,508,DAILY,1,Ezzouhour 2,18:24,18:24
A,Ligne A,HIVER,2025-12-01,2026-03-31,aller,508,DAILY,2,Tunis Ville,19:35,19:35
D,Ligne D,HIVER,2025-12-01,2026-03-31,aller,645,DAILY,1,Tunis Ville,20:05,20:05
D,Ligne D,HIVER,2025-12-01,2026-03-31,aller,645,DAILY,2,Mellassine,20:42,20:42`;

const faresCsv = `line,origin,destination,amount,currency
A,ezzouhour 2,tunis ville,0.900,TND
D,tunis ville,mellassine,0.800,TND`;

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

test('health + import + search flow', async () => {
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

    const stations = await fetch(`${base}/stations/search?q=tunis`);
    const stationsJson = await stations.json() as { items: unknown[] };
    assert.ok(stationsJson.items.length > 0);

    const journeys = await fetch(`${base}/journeys/search?originStationId=Ezzouhour%202&destinationStationId=Mellassine&datetime=2026-01-04T18:00:00Z&passengers=2&offset=0&limit=5`);
    const journeysJson = await journeys.json() as { items: unknown[] };
    assert.ok(journeysJson.items.length > 0);
  });
});
