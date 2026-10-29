// Use a disposable migrated database: CENTRAL_AREA_TEST_DATABASE_URL=... npx tsx apps/api/src/centralAreas/integration.test.ts
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { io as connect, type Socket } from 'socket.io-client';
import { SocketEvent, type AreaPresenceDTO, type UserRole } from '@taxi/shared';
import argon2 from 'argon2';

if (!process.env.CENTRAL_AREA_TEST_DATABASE_URL) throw new Error('Set CENTRAL_AREA_TEST_DATABASE_URL to a disposable migrated database');
process.env.DATABASE_URL = process.env.CENTRAL_AREA_TEST_DATABASE_URL;
process.env.JWT_ACCESS_SECRET = 'area-test-access';
process.env.JWT_REFRESH_SECRET = 'area-test-refresh';
process.env.WEB_ORIGIN = 'http://localhost:3109';
process.env.NODE_ENV = 'test';
const { createApp } = await import('../http/app.js');
const { createIo } = await import('../realtime/io.js');
const { prisma } = await import('../prisma.js');
const { signAccessToken } = await import('../auth/tokens.js');
const { refreshAreaPresence } = await import('./presence.js');
const serve = process.argv.includes('--serve');
const server = createServer(createApp());
const io = createIo(server);
await new Promise<void>(resolve => server.listen(serve ? 4109 : 0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
const ids = { a: randomUUID(), b: randomUUID(), owner: randomUUID(), dispatcher: randomUUID(), driver: randomUUID(), peer: randomUUID(), outsider: randomUUID() };
const sockets: Socket[] = [];
const polygon = [{ lat: 10, lng: -84 }, { lat: 10, lng: -83.99 }, { lat: 10.01, lng: -83.99 }, { lat: 10.01, lng: -84 }];
const auth = (sub: string, role: UserRole, centralId: string | null) => signAccessToken({ sub, role, centralId });
const ownerToken = auth(ids.owner, 'SUPER_ADMIN', null);
const driverToken = auth(ids.driver, 'DRIVER', ids.a);
const peerToken = auth(ids.peer, 'DRIVER', ids.a);
const dispatcherToken = auth(ids.dispatcher, 'CENTRAL_ADMIN', ids.a);
const outsiderToken = auth(ids.outsider, 'DRIVER', ids.b);
async function request(path: string, token: string | null, method = 'GET', body?: unknown) {
  return fetch(`${url}/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function socket(token: string) {
  const client = connect(url, { auth: { token }, transports: ['websocket'], autoConnect: false });
  sockets.push(client);
  await new Promise<void>((resolve, reject) => {
    client.once('connect', resolve); client.once('connect_error', reject); client.connect();
  });
  return client;
}
function waitPresence(client: Socket, predicate: (snapshot: AreaPresenceDTO) => boolean) {
  return new Promise<AreaPresenceDTO>((resolve, reject) => {
    const timer = setTimeout(() => { client.off(SocketEvent.AREA_PRESENCE, receive); reject(new Error('Timed out waiting for zone presence')); }, 6000);
    function receive(value: AreaPresenceDTO) {
      if (predicate(value)) { clearTimeout(timer); client.off(SocketEvent.AREA_PRESENCE, receive); resolve(value); }
    }
    client.on(SocketEvent.AREA_PRESENCE, receive);
  });
}
async function eventually(check: () => Promise<boolean>) {
  for (let i = 0; i < 100; i++) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 20)); }
  throw new Error('Database state did not converge');
}

try {
  await prisma.central.createMany({ data: [ids.a, ids.b].map((id, i) => ({ id, name: `Area test ${i + 1}`, city: 'Test', address: 'Test', phone: '00000' })) });
  const passwordHash = await argon2.hash('AreaTest123!');
  for (const [key, role, centralId] of [
    ['owner', 'SUPER_ADMIN', null], ['dispatcher', 'CENTRAL_ADMIN', ids.a], ['driver', 'DRIVER', ids.a],
    ['peer', 'DRIVER', ids.a], ['outsider', 'DRIVER', ids.b],
  ] as const) {
    await prisma.user.create({ data: { id: ids[key], role, centralId, username: serve ? `area-${key}` : `area-${key}-${ids[key]}`, fullName: `Area ${key}`, passwordHash,
      ...(role === 'DRIVER' ? { driverProfile: { create: { documentId: 'test', taxiNumber: key === 'driver' ? '01' : key === 'peer' ? '02' : '03', plate: 'TEST', vehicleModel: 'Test', vehicleColor: 'Test', vehicleYear: 2026 } } } : {}),
    } });
  }
  assert.equal((await request('/central-areas', null)).status, 401);
  const payload = { centralId: ids.a, name: 'Central Centro', color: '#f5b301', polygon };
  for (const token of [driverToken, dispatcherToken, outsiderToken]) {
    assert.equal((await request('/central-areas', token, 'POST', payload)).status, 403);
  }
  assert.equal((await request('/central-areas', ownerToken, 'POST', { ...payload, centralId: randomUUID() })).status, 404);
  assert.equal((await request('/central-areas', ownerToken, 'POST', { ...payload, polygon: [polygon[0], polygon[2], polygon[1], polygon[3]] })).status, 400);
  const created = await request('/central-areas', ownerToken, 'POST', payload);
  assert.equal(created.status, 201);
  const { area } = await created.json() as { area: { id: string } };
  const second = await request('/central-areas', ownerToken, 'POST', { ...payload, name: 'Central Hospital' });
  assert.equal(second.status, 201);
  const { area: overlap } = await second.json() as { area: { id: string } };
  await request('/central-areas', ownerToken, 'POST', { ...payload, centralId: ids.b, name: 'Privada B' });
  assert.equal((await request(`/central-areas?centralId=${ids.b}`, driverToken)).status, 403);
  assert.equal((await request(`/central-areas/${area.id}`, driverToken, 'PATCH', { name: 'Bad' })).status, 403);
  assert.equal((await request(`/central-areas/${area.id}`, dispatcherToken, 'DELETE')).status, 403);
  assert.equal((await request('/live/drivers', driverToken)).status, 403);
  const noCompany = auth(randomUUID(), 'DRIVER', null);
  assert.equal((await request('/central-areas', noCompany)).status, 403);
  const own = await (await request('/central-areas', driverToken)).json() as AreaPresenceDTO;
  assert.equal(own.areas.length, 2);
  assert(own.areas.every(item => item.centralId === ids.a));
  assert.equal((await (await request('/central-areas', ownerToken)).json() as AreaPresenceDTO).areas.length, 3);

  const listener = await socket(peerToken);
  const other = await socket(outsiderToken);
  let rawGpsLeaks = 0;
  listener.on(SocketEvent.GPS_UPDATE, () => rawGpsLeaks++);
  const otherEvents: AreaPresenceDTO[] = [];
  other.on(SocketEvent.AREA_PRESENCE, value => otherEvents.push(value));
  const driver = await socket(driverToken);
  const profile = await prisma.driverProfile.findUniqueOrThrow({ where: { userId: ids.driver } });
  await eventually(async () => (await prisma.driverProfile.findUniqueOrThrow({ where: { id: profile.id } })).currentStatus !== 'OFFLINE');
  const inside = { lat: 10.005, lng: -83.995 };
  const waiting = waitPresence(listener, value => value.taxis.some(taxi => taxi.driverId === profile.id && taxi.areaIds.length === 2));
  driver.emit(SocketEvent.GPS_UPDATE, { ...inside, recordedAt: new Date().toISOString() });
  const present = await waiting;
  assert.equal(present.taxis[0].centralId, ids.a);
  assert.deepEqual(Object.keys(present.taxis[0]).sort(), ['areaIds', 'centralId', 'driverId', 'fullName', 'lat', 'lng', 'recordedAt', 'status', 'taxiNumber'].sort());
  assert.equal(rawGpsLeaks, 0);
  await prisma.driverProfile.update({ where: { id: profile.id }, data: { currentStatus: 'BUSY' } });
  assert.equal((await (await request('/central-areas', dispatcherToken)).json() as AreaPresenceDTO).taxis[0].status, 'BUSY');

  const leaving = waitPresence(listener, value => !value.taxis.some(taxi => taxi.driverId === profile.id));
  driver.emit(SocketEvent.GPS_UPDATE, { lat: 11, lng: -84, recordedAt: new Date().toISOString() });
  await leaving;
  const returning = waitPresence(listener, value => value.taxis.some(taxi => taxi.driverId === profile.id));
  driver.emit(SocketEvent.GPS_UPDATE, { ...inside, recordedAt: new Date().toISOString() });
  await returning;
  const stopping = waitPresence(listener, value => value.taxis.length === 0);
  driver.emit(SocketEvent.GPS_STOP);
  await stopping;
  assert.equal((await prisma.driverProfile.findUniqueOrThrow({ where: { id: profile.id } })).gpsSharing, false);
  const resuming = waitPresence(listener, value => value.taxis.some(taxi => taxi.driverId === profile.id));
  driver.emit(SocketEvent.GPS_UPDATE, { ...inside, recordedAt: new Date().toISOString() });
  await resuming;

  const stale = new Date(Date.now() - 61000);
  await prisma.gpsPosition.updateMany({ where: { driverId: profile.id }, data: { recordedAt: stale } });
  const expiry = waitPresence(listener, value => value.taxis.length === 0);
  await refreshAreaPresence(io); await expiry;
  // A stale/future/out-of-order fix cannot renew presence.
  driver.emit(SocketEvent.GPS_UPDATE, { ...inside, recordedAt: stale.toISOString() });
  driver.emit(SocketEvent.GPS_UPDATE, { ...inside, recordedAt: new Date(Date.now() + 600000).toISOString() });
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal((await (await request('/central-areas', driverToken)).json() as AreaPresenceDTO).taxis.length, 0);
  const again = waitPresence(listener, value => value.taxis.some(taxi => taxi.driverId === profile.id));
  driver.emit(SocketEvent.GPS_UPDATE, { ...inside, recordedAt: new Date().toISOString() }); await again;
  const duplicate = await socket(driverToken);
  await eventually(async () => io.sockets.adapter.rooms.get(`user:${ids.driver}`)?.size === 2);
  driver.disconnect();
  await new Promise(resolve => setTimeout(resolve, 80));
  assert.notEqual((await prisma.driverProfile.findUniqueOrThrow({ where: { id: profile.id } })).currentStatus, 'OFFLINE');
  const disconnecting = waitPresence(listener, value => value.taxis.length === 0);
  duplicate.disconnect(); await disconnecting;
  assert.equal((await prisma.driverProfile.findUniqueOrThrow({ where: { id: profile.id } })).currentStatus, 'OFFLINE');
  const reconnecting = await socket(driverToken);
  const restored = waitPresence(listener, value => value.taxis.length === 1);
  reconnecting.emit(SocketEvent.GPS_UPDATE, { ...inside, recordedAt: new Date().toISOString() }); await restored;

  const rename = waitPresence(listener, value => value.areas.some(item => item.name === 'Centro editado'));
  assert.equal((await request(`/central-areas/${area.id}`, ownerToken, 'PATCH', { name: 'Centro editado', color: '#22c55e' })).status, 200);
  await rename;
  const changedContour = waitPresence(listener, value => value.taxis.some(taxi => taxi.areaIds.length === 1));
  assert.equal((await request(`/central-areas/${area.id}`, ownerToken, 'PATCH', { polygon: polygon.map(point => ({ lat: point.lat + 1, lng: point.lng })) })).status, 200);
  await changedContour;
  const deleted = waitPresence(listener, value => value.taxis.length === 0 && !value.areas.some(item => item.id === overlap.id));
  assert.equal((await request(`/central-areas/${overlap.id}`, ownerToken, 'DELETE')).status, 200);
  await deleted;
  assert(otherEvents.length > 0);
  assert(otherEvents.every(value => value.areas.every(item => item.centralId === ids.b) && value.taxis.every(taxi => taxi.centralId === ids.b)));
  assert(await prisma.activityLog.count({ where: { actorId: ids.owner, action: 'central_area.create' } }) >= 3);
  assert(await prisma.activityLog.count({ where: { actorId: ids.owner, action: 'central_area.update' } }) >= 2);
  assert(await prisma.activityLog.count({ where: { actorId: ids.owner, action: 'central_area.delete' } }) >= 1);
  const history = await (await request('/activity?action=central_area.', dispatcherToken)).json() as { logs: { metadata: { centralId: string } }[] };
  assert(history.logs.length >= 4);
  assert(history.logs.every(log => log.metadata.centralId === ids.a));
  console.log('Central areas: real PostgreSQL CRUD, role/tenant isolation, private socket presence, entry/exit, stop, expiry, overlapping areas, reconnect, multiple tabs and live edits OK');
  if (serve) {
    await request(`/central-areas/${area.id}`, ownerToken, 'PATCH', { polygon, name: 'Central Centro' });
    console.log('Local UI fixture ready at http://127.0.0.1:4109 — users area-owner / area-dispatcher / area-driver with password AreaTest123!');
    await new Promise<void>(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); });
  }
} finally {
  for (const client of sockets) client.disconnect();
  await new Promise(resolve => setTimeout(resolve, 150));
  await new Promise<void>(resolve => io.close(() => resolve()));
  await prisma.user.deleteMany({ where: { id: { in: [ids.owner, ids.dispatcher, ids.driver, ids.peer, ids.outsider] } } });
  await prisma.central.deleteMany({ where: { id: { in: [ids.a, ids.b] } } });
  await prisma.$disconnect();
  server.close();
}
