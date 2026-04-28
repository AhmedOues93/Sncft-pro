import assert from 'node:assert/strict';
import test from 'node:test';

process.env.ADMIN_AUTH_REQUIRED = 'true';
process.env.SNCFT_DEV_ADMIN_ROLE = 'superadmin';
process.env.NODE_ENV = 'test';

const { app } = await import('../src/app.js');
const { resetImportStoreForTests } = await import('../src/store/index.js');
const { authService } = await import('../src/services/auth.js');

const scheduleCsv = `line,line_name,season,valid_from,valid_to,direction,train_number,service_code,station_order,station,arrival_time,departure_time
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,100,DAILY,1,Tunis Ville,05:02,05:02
A,Ligne A,HIVER,2025-09-01,2025-12-31,aller,100,DAILY,2,Hammam Lif,05:30,05:30
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

test('public endpoints stay public and invalid datetime rejected', async () => {
  await withServer(async (base) => {
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal((await fetch(`${base}/stations/search?q=tun&limit=10`)).status, 200);
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
        originStationId: 'ezzouhour 2',
        destinationStationId: 'mellassine',
        departureTime: '18:10',
        arrivalTime: '18:57',
        trainNumbers: ['701', '702'],
        journeyPayload: { foo: 'bar' },
        travelDate: '2025-09-02',
      }),
    });
    assert.equal(saved.status, 201);
  });
});

test('existing import + publish + search behavior remains', async () => {
  await withServer(async (base) => {
    const sched = await post(base, '/admin/imports/schedules', { csv: scheduleCsv }, 'dev-token');
    const schedJson = await sched.json() as { id: string };
    const fare = await post(base, '/admin/imports/fares', { csv: faresCsv }, 'dev-token');
    const fareJson = await fare.json() as { id: string };

    await post(base, `/admin/imports/${schedJson.id}/publish`, {}, 'dev-token');
    await post(base, `/admin/imports/${fareJson.id}/publish`, {}, 'dev-token');

    const journeys = await fetch(`${base}/journeys/search?originStationId=Ezzouhour%202&destinationStationId=Mellassine&datetime=2025-09-02T18:00:00&passengers=2&offset=0&limit=50`);
    const journeysJson = await journeys.json() as { limit: number; items: Array<{ type: string }>; total: number };

    assert.equal(journeys.status, 200);
    assert.equal(journeysJson.limit, 5);
    assert.equal(journeysJson.items.some((item) => item.type === 'transfer'), true);
    assert.equal(typeof journeysJson.total, 'number');
  });
});
