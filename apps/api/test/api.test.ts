import assert from 'node:assert/strict';
import test from 'node:test';

process.env.ADMIN_AUTH_REQUIRED = 'true';
process.env.SNCFT_DEV_ADMIN_ROLE = 'superadmin';
process.env.NODE_ENV = 'test';

const { app } = await import('../src/app.js');
const { config } = await import('../src/config.js');
const { resetImportStoreForTests, getImportStore } = await import('../src/store/index.js');
const { authService } = await import('../src/services/auth.js');

const scheduleCsv = `line,line_name,season,valid_from,valid_to,direction,train_number,service_code,station_order,station,arrival_time,departure_time
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,100,DAILY,1,Tunis Ville,05:02,05:02
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,100,DAILY,2,Hammam Lif,05:30,05:30
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,101,DAILY,1,Tunis Ville,05:35,05:35
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,101,DAILY,2,Erriadh,06:01,06:01
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,102,DAILY,1,Ezzahra,18:02,18:02
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,102,DAILY,2,Tunis Ville,18:24,18:24
D,Ligne D,HIVER,2025-09-01,2025-12-31,aller,220,DAILY,1,Tunis Ville,18:34,18:34
D,Ligne D,HIVER,2025-09-01,2025-12-31,aller,220,DAILY,2,Mellassine,18:54,18:54
E,Ligne E,HIVER,2025-09-01,2025-12-31,aller,310,DAILY,1,Tunis Ville,07:15,07:15
E,Ligne E,HIVER,2025-09-01,2025-12-31,aller,310,DAILY,2,Bougatfa,07:44,07:44`;

const faresCsv = `line,origin,destination,amount,currency,fare_type
A,tunis ville,hammam lif,1.200,TND,normal
A,tunis ville,erriadh,1.100,TND,normal
A,ezzahra,tunis ville,0.900,TND,Plein tarif
A,ezzahra,tunis ville,0.450,TND,abonnement
D,tunis ville,mellassine,0.600,TND,normal
E,tunis ville,bougatfa,0.800,TND,normal`;

const scheduleCsvLineCodeOnly = `line_code,line_name,season,valid_from,valid_to,direction,train_number,service_code,station_order,station,departure_time,arrival_time
D,Ligne D,HIVER,2025-09-01,2025-12-31,aller,901,DAILY,1,Tunis Ville,09:10,09:10
D,Ligne D,HIVER,2025-09-01,2025-12-31,aller,901,DAILY,2,Mellassine,09:34,09:34`;

async function withServer(run: (baseUrl: string) => Promise<void>) {
  resetImportStoreForTests();
  authService.resetForTests();
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

async function post(base: string, path: string, body: unknown, token?: string) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

test('public endpoints stay public + station suggestions + invalid datetime rejected', async () => {
  await withServer(async (base) => {
    const sched = await post(base, '/admin/imports/schedules', { csv: scheduleCsv }, 'dev-token');
    const schedJson = await sched.json() as { id: string };
    await post(base, `/admin/imports/${schedJson.id}/publish`, {}, 'dev-token');

    assert.equal((await fetch(`${base}/health`)).status, 200);

    for (const q of ['tun', 'ham', 'mel', 'bou', 'err']) {
      const res = await fetch(`${base}/stations/search?q=${encodeURIComponent(q)}&limit=10`);
      assert.equal(res.status, 200);
      const body = await res.json() as { count: number; items: Array<{ id: string; name: string }> };
      assert.ok(body.count >= 1);
      assert.ok(body.items.length >= 1);
    }

    assert.equal((await fetch(`${base}/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Hammam%20Lif&datetime=invalid&passengers=1&offset=0&limit=5`)).status, 400);
  });
});

test('admin register/login/me with role/status checks', async () => {
  await withServer(async (base) => {
    const register = await post(base, '/admin/auth/register', {
      employeeNumber: 'E-1001', firstName: 'Admin', lastName: 'One', email: 'admin1@sncft.local', password: 'secret123',
    });
    assert.equal(register.status, 201);

    const pendingLogin = await post(base, '/admin/auth/login', { email: 'admin1@sncft.local', password: 'secret123' });
    assert.equal(pendingLogin.status, 403);

    const users = await fetch(`${base}/admin/users`, { headers: { authorization: 'Bearer dev-token' } });
    const usersJson = await users.json() as { items: Array<{ id: string }> };
    const userId = usersJson.items[0].id;

    const activate = await fetch(`${base}/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: 'Bearer dev-token' },
      body: JSON.stringify({ status: 'active' }),
    });
    assert.equal(activate.status, 200);

    const setPublisher = await fetch(`${base}/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: 'Bearer dev-token' },
      body: JSON.stringify({ role: 'publisher' }),
    });
    assert.equal(setPublisher.status, 200);

    const login = await post(base, '/admin/auth/login', { email: 'admin1@sncft.local', password: 'secret123' });
    assert.equal(login.status, 200);
    const loginJson = await login.json() as { accessToken: string };

    const me = await fetch(`${base}/admin/auth/me`, { headers: { authorization: `Bearer ${loginJson.accessToken}` } });
    assert.equal(me.status, 200);

    const noTokenWrite = await post(base, '/admin/imports/schedules/preview', { csv: scheduleCsv });
    assert.equal(noTokenWrite.status, 401);
  });
});

test('passenger register/login/me + favorites/saved journeys', async () => {
  await withServer(async (base) => {
    const register = await post(base, '/auth/register', { displayName: 'Alice', email: 'alice@sncft.local', password: 'secret123' });
    assert.equal(register.status, 201);

    const login = await post(base, '/auth/login', { email: 'alice@sncft.local', password: 'secret123' });
    assert.equal(login.status, 200);
    const loginJson = await login.json() as { accessToken: string };

    const me = await fetch(`${base}/auth/me`, { headers: { authorization: `Bearer ${loginJson.accessToken}` } });
    assert.equal(me.status, 200);

    assert.equal((await fetch(`${base}/me/favorites`)).status, 401);

    const favorite = await fetch(`${base}/me/favorites`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${loginJson.accessToken}` },
      body: JSON.stringify({ originStationId: 'tunis ville', destinationStationId: 'hammam lif', label: 'Maison' }),
    });
    assert.equal(favorite.status, 201);

    const saved = await fetch(`${base}/me/saved-journeys`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${loginJson.accessToken}` },
      body: JSON.stringify({
        originStationId: 'ezzahra',
        destinationStationId: 'mellassine',
        departureTime: '18:02',
        arrivalTime: '18:54',
        trainNumbers: ['102', '220'],
        journeyPayload: { foo: 'bar' },
        travelDate: '2025-09-02',
      }),
    });
    assert.equal(saved.status, 201);
  });
});

test('import/publish + chronological direct + transfer fare + pagination metadata', async () => {
  await withServer(async (base) => {
    const sched = await post(base, '/admin/imports/schedules', { csv: scheduleCsv }, 'dev-token');
    const schedJson = await sched.json() as { id: string };
    const fare = await post(base, '/admin/imports/fares', { csv: faresCsv }, 'dev-token');
    const fareJson = await fare.json() as { id: string };

    await post(base, `/admin/imports/${schedJson.id}/publish`, {}, 'dev-token');
    await post(base, `/admin/imports/${fareJson.id}/publish`, {}, 'dev-token');

    const active = await fetch(`${base}/admin/imports/active`, { headers: { authorization: 'Bearer dev-token' } });
    const activeJson = await active.json() as { scheduleImportId?: string; fareImportId?: string };
    assert.equal(active.status, 200);
    assert.equal(activeJson.scheduleImportId, schedJson.id);
    assert.equal(activeJson.fareImportId, fareJson.id);

    const direct = await fetch(`${base}/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Hammam%20Lif&datetime=2025-09-02T05:00:00&passengers=1&offset=0&limit=5`);
    const directJson = await direct.json() as { items: Array<{ departureTime: string; type: string; fare: { amount: number } }>; total: number; hasNext: boolean; hasPrevious: boolean; nextOffset: number | null; previousOffset: number };
    assert.equal(direct.status, 200);
    assert.ok(directJson.total >= 1);
    assert.equal(directJson.items[0].departureTime, '05:02');
    assert.equal(directJson.items[0].type, 'direct');
    assert.equal(directJson.items[0].fare.amount, 1.2);
    assert.equal(directJson.hasPrevious, false);
    assert.equal(directJson.previousOffset, 0);

    const erriadh = await fetch(`${base}/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Erriadh&datetime=2025-09-02T05:00:00&passengers=1&offset=0&limit=5`);
    const erriadhJson = await erriadh.json() as { items: Array<{ type: string; fare: { amount: number } }> };
    assert.equal(erriadh.status, 200);
    assert.equal(erriadhJson.items[0].type, 'direct');
    assert.equal(erriadhJson.items[0].fare.amount, 1.1);

    const transferOne = await fetch(`${base}/journeys/search?originStationId=Ezzahra&destinationStationId=Mellassine&datetime=2025-09-02T18:00:00&passengers=1&offset=0&limit=5`);
    const transferOneJson = await transferOne.json() as { items: Array<{ type: string; transferStationId?: string; transferWaitMinutes?: number; fare: { amount: number }; segments: Array<{ lineCode: string }> }> };
    assert.equal(transferOne.status, 200);
    const transferItem = transferOneJson.items.find((item) => item.type === 'transfer');
    assert.ok(transferItem);
    assert.equal(transferItem.transferStationId, 'tunis ville');
    assert.ok((transferItem.transferWaitMinutes ?? 0) >= 5);
    assert.equal(transferItem.segments[0].lineCode, 'A');
    assert.equal(transferItem.segments[1].lineCode, 'D');
    assert.equal(transferItem.fare.amount, 1.5);

    const transferTwo = await fetch(`${base}/journeys/search?originStationId=Ezzahra&destinationStationId=Mellassine&datetime=2025-09-02T18:00:00&passengers=2&offset=0&limit=5`);
    const transferTwoJson = await transferTwo.json() as { items: Array<{ type: string; fare: { amount: number } }> };
    const transferTwoItem = transferTwoJson.items.find((item) => item.type === 'transfer');
    assert.ok(transferTwoItem);
    assert.equal(transferTwoItem.fare.amount, 3);

    const secondPage = await fetch(`${base}/journeys/search?originStationId=Tunis%20Ville&destinationStationId=Hammam%20Lif&datetime=2025-09-02T05:00:00&passengers=1&offset=5&limit=5`);
    const secondJson = await secondPage.json() as { offset: number; previousOffset: number; hasPrevious: boolean; hasNext: boolean; nextOffset: number | null };
    assert.equal(secondPage.status, 200);
    assert.equal(secondJson.offset, 5);
    assert.equal(secondJson.hasPrevious, true);
    assert.equal(secondJson.previousOffset, 0);
    assert.equal(typeof secondJson.hasNext, 'boolean');
    assert.ok(secondJson.nextOffset === null || typeof secondJson.nextOffset === 'number');
  });
});

test('production mode must not silently use memory store', () => {
  const prevEnv = config.nodeEnv;
  const prevDriver = config.storageDriver;

  try {
    config.nodeEnv = 'production';
    config.storageDriver = 'memory';
    resetImportStoreForTests();
    assert.throws(() => getImportStore(), /STORAGE_DRIVER must be set to supabase/);
  } finally {
    config.nodeEnv = prevEnv;
    config.storageDriver = prevDriver;
    resetImportStoreForTests();
  }
});

test('schedule import accepts line_code-only header format', async () => {
  await withServer(async (base) => {
    const sched = await post(base, '/admin/imports/schedules', { csv: scheduleCsvLineCodeOnly }, 'dev-token');
    assert.equal(sched.status, 201);
    const schedJson = await sched.json() as { status: string; issues: unknown[] };
    assert.equal(schedJson.status, 'ready');
    assert.equal(schedJson.issues.length, 0);
  });
});
