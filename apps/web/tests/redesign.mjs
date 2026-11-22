// Local synthetic API fixtures. Start the web on :3110; no production data is changed.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node apps/web/tests/redesign.mjs
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.env.REDESIGN_TEST_URL || 'http://localhost:3110';
const artifacts = process.env.REDESIGN_SCREENSHOTS || '.impeccable/review';
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const company = '11111111-1111-4111-8111-111111111111';
const taxi = { driverId: 'driver-1', centralId: company, taxiNumber: '24', fullName: 'Carlos Rodríguez', status: 'AVAILABLE', online: true, position: { lat: 10.0921, lng: -84.7308, recordedAt: new Date().toISOString() } };
const central = { id: company, name: 'Central de prueba', city: 'San Ramón', phone: '24450000', address: 'Frente al parque', status: 'ACTIVE', adminsCount: 2, driversCount: 18 };
const service = { id: 'service-1', centralId: company, clientName: 'María Fernández', clientPhone: '88888888', originAddress: 'Entrada principal del hospital', originLat: 10.0921, originLng: -84.7308, destAddress: 'Parque central de San Ramón', notes: 'Esperar en la entrada principal', status: 'ASSIGNED', createdAt: new Date().toISOString(), driver: taxi };
const metrics = { drivers: { total: 18, online: 12, available: 8, inService: 4, offline: 6, sos: 0 }, services: { active: 5, pending: 1, completedToday: 26 }, sosOpen: 0, admins: 2, bannedUsers: 0, centrals: { total: 3, active: 3, inactive: 0 } };
const paths = { SUPER_ADMIN: ['/admin', '/admin/mapa', '/admin/centrales', '/admin/usuarios', '/admin/incidencias', '/admin/chat', '/admin/auditoria'], CENTRAL_ADMIN: ['/central', '/central/mapa', '/central/despacho', '/central/taxistas', '/central/incidencias', '/central/chat', '/central/historial'], DRIVER: ['/driver', '/driver/mapa', '/driver/chat'] };
const screenshots = new Set(['/admin', '/admin/centrales', '/admin/usuarios', '/admin/mapa', '/central', '/central/despacho', '/central/historial', '/central/incidencias', '/driver', '/driver/chat']);
const errors = [];
const checked = [];

async function setup(role, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', permissions: ['microphone'], serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => errors.push(error.message));
  const user = { id: 'user-1', username: 'cuenta-prueba', fullName: role === 'DRIVER' ? 'Carlos Rodríguez' : 'Ana Rodríguez', role, status: 'ACTIVE', centralId: role === 'SUPER_ADMIN' ? null : company };
  const writes = [];
  const media = new Map();
  let currentService = { ...service };
  let authenticated = true;
  await page.route('**/api/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    let body = {};
    let status = 200;
    if (req.method() !== 'GET') writes.push({ path, body: req.postDataJSON() });
    if (path === '/api/auth/refresh') { status = authenticated ? 200 : 401; body = { user, accessToken: 'synthetic-local-token' }; }
    else if (path === '/api/auth/login') { authenticated = true; body = { user, accessToken: 'synthetic-local-token' }; }
    else if (path === '/api/auth/logout') authenticated = false;
    else if (path === '/api/notifications') body = { notifications: [{ id: 'notice-1', type: 'service.assigned', payload: { clientName: 'María Fernández' }, createdAt: new Date().toISOString(), readAt: null }] };
    else if (path === '/api/notifications/read-all') body = {};
    else if (path.startsWith('/api/stats/')) body = metrics;
    else if (path === '/api/centrals') body = { centrals: [central] };
    else if (path === '/api/users') body = { users: [{ ...user, id: 'driver-1', role: 'DRIVER', fullName: taxi.fullName, username: 'carlos24', centralId: company, driverProfile: { taxiNumber: '24', plate: 'TX-1234', vehicleModel: 'Toyota Corolla', vehicleColor: 'Rojo', vehicleYear: 2022, currentStatus: 'AVAILABLE' } }] };
    else if (path === '/api/services' && req.method() === 'GET') body = { services: currentService.status === 'FINISHED' ? [] : [currentService] };
    else if (path === '/api/services/nearby') body = { drivers: [{ ...taxi, distanceKm: 1.2, etaMin: 4 }] };
    else if (path.startsWith('/api/services/')) {
      currentService = { ...currentService, status: path.endsWith('/accept') ? 'ACCEPTED' : req.postDataJSON()?.status ?? currentService.status };
      body = { service: currentService };
    }
    else if (path === '/api/map-pins') body = { pins: [{ id: 'pin-1', centralId: null, name: 'Hospital de prueba', shape: 'hospital', color: '#ef4444', lat: 10.0921, lng: -84.7308 }] };
    else if (path === '/api/central-areas') body = { asOf: new Date().toISOString(), areas: [{ id: 'area-1', centralId: company, name: 'Central Centro', color: '#3b82f6', polygon: [{ lat: 10.09, lng: -84.735 }, { lat: 10.095, lng: -84.735 }, { lat: 10.095, lng: -84.725 }, { lat: 10.09, lng: -84.725 }] }], taxis: [{ ...taxi, lat: taxi.position.lat, lng: taxi.position.lng, recordedAt: new Date().toISOString(), areaIds: ['area-1'] }] };
    else if (path === '/api/live/drivers') body = { drivers: [taxi] };
    else if (path === '/api/chat/contacts') body = { contacts: [{ id: 'contact-1', fullName: 'Central de prueba', role: 'CENTRAL_ADMIN', unread: 1 }] };
    else if (path === '/api/chat/messages' && req.method() === 'GET') body = { messages: [{ id: 'msg-1', senderId: 'contact-1', recipientId: user.id, body: 'Buenos días. El cliente espera en la entrada principal.', mine: false, createdAt: new Date().toISOString() }] };
    else if (path.startsWith('/api/chat/media/')) body = media.get(path.split('/').at(-1));
    else if (path === '/api/chat/messages' || path === '/api/chat/media') {
      const payload = req.postDataJSON();
      const id = 'msg-' + writes.length;
      if (path === '/api/chat/media') media.set(id, { type: payload.type, data: payload.data });
      body = { message: { id, ...payload, attachmentName: payload.name, attachmentType: payload.type, senderId: user.id, mine: true, createdAt: new Date().toISOString() } };
    }
    else if (path === '/api/sos') body = { incidents: [{ id: 'sos-1', ...taxi, lat: 10.0921, lng: -84.7308, status: 'OPEN', createdAt: new Date().toISOString() }] };
    else if (path === '/api/activity') body = { total: 1, actors: [user], logs: [{ id: 'log-1', action: 'service.status.en_route', actor: user, entityType: 'service', entityId: 'service-1', createdAt: new Date().toISOString(), ip: '127.0.0.1', userAgent: 'Navegador de prueba', metadata: { clientName: service.clientName, originAddress: service.originAddress, taxiNumber: '24', status: 'EN_ROUTE' } }] };
    else if (path === '/api/geocode') body = { places: [] };
    else { status = 404; body = { error: 'Missing local fixture: ' + path }; }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return { context, page, writes };
}

async function capture(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${artifacts}/${name}.png`, fullPage: true, animations: 'disabled' });
}

try {
  for (const [size, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 1000 }]]) {
    for (const role of Object.keys(paths)) {
      const { context, page, writes } = await setup(role, viewport);
      for (const path of paths[role]) {
        await page.goto(root + path);
        await page.locator('#contenido').waitFor();
        if (path.endsWith('/mapa') || path.endsWith('/despacho')) {
          await page.locator('.leaflet-tooltip').first().waitFor();
          await page.waitForFunction(() => [...document.querySelectorAll('.leaflet-tile')].some(tile => tile.complete && tile.naturalWidth > 0));
        }
        if (path.endsWith('/chat')) {
          await page.getByRole('button', { name: /Central de prueba/ }).click();
          await page.getByRole('textbox', { name: 'Mensaje', exact: true }).fill('Estoy en camino');
          await page.getByRole('button', { name: 'Enviar mensaje' }).click();
          await page.getByText('Estoy en camino', { exact: true }).waitFor();
          await page.getByRole('button', { name: 'Grabar audio' }).click();
          await page.getByRole('status').filter({ hasText: 'Grabando' }).waitFor();
          await page.waitForTimeout(1100);
          await page.getByRole('button', { name: 'Detener', exact: true }).click();
          await page.locator('audio').waitFor();
          await page.getByRole('button', { name: 'Enviar mensaje' }).click();
          await page.getByRole('button', { name: 'Quitar adjunto' }).waitFor({ state: 'hidden' });
          await page.getByRole('log').locator('audio').waitFor();
          assert(writes.some(w => w.path === '/api/chat/media' && w.body.type.startsWith('audio/')));
          await page.locator('input[type=file]').first().setInputFiles({ name: 'prueba.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') });
          await page.getByRole('button', { name: 'Enviar mensaje' }).click();
          await page.waitForTimeout(200);
          assert(writes.some(w => w.path === '/api/chat/media' && w.body.name === 'prueba.pdf'));
          await page.getByRole('link', { name: 'prueba.pdf · Descargar' }).waitFor();
        }
        if (path.endsWith('/historial') || path.endsWith('/auditoria')) {
          await page.locator('summary').filter({ hasText: 'Filtrar por usuario' }).click();
          await Promise.all([
            page.waitForRequest(req => req.url().includes('/api/activity?') && req.url().includes('actorId=user-1')),
            page.getByRole('combobox', { name: /^Usuario/ }).selectOption('user-1'),
          ]);
          await page.getByRole('button', { name: 'Limpiar filtros' }).click();
          await page.locator('summary').filter({ hasText: 'Filtrar por usuario' }).click();
        }
        await page.waitForTimeout(300);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${size} overflow ${path}`);
        assert(await page.evaluate(() => !document.querySelector('meta[name=viewport]')?.content.includes('maximum-scale=1')));
        if (screenshots.has(path)) await capture(page, `${size}-${path.slice(1).replaceAll('/', '-')}`);
        checked.push(`${size} ${path}`);
      }
      if (role === 'DRIVER') {
        await page.goto(root + '/driver');
        await page.getByRole('button', { name: 'Aceptar', exact: true }).click();
        await page.getByRole('button', { name: 'Voy en camino' }).click();
        await page.getByRole('button', { name: 'Cliente recogido' }).click();
        await page.getByRole('button', { name: 'Finalizar servicio' }).click();
        await page.getByText('No tienes viajes activos', { exact: true }).waitFor();
        assert.equal(await page.getByRole('link', { name: 'Activar SOS y llamar al 911' }).getAttribute('href'), 'tel:911');
        assert.equal(writes.filter(w => w.path === '/api/sos').length, 0);
      }
      await page.getByRole('button', { name: 'Notificaciones', exact: true }).click();
      await page.getByRole('dialog', { name: 'Notificaciones' }).waitFor();
      await page.keyboard.press('Escape');
      assert(await page.getByRole('button', { name: 'Notificaciones', exact: true }).evaluate(el => el === document.activeElement));
      if (size === 'mobile') {
        await page.getByRole('button', { name: role === 'DRIVER' ? 'Cuenta' : 'Más', exact: true }).click();
        const dialog = page.getByRole('dialog');
        await dialog.waitFor();
        if (role !== 'DRIVER') assert(await dialog.getByRole('link', { name: 'Alertas SOS' }).isVisible());
        await capture(page, `${size}-${role}-menu`);
        await dialog.getByRole('button', { name: 'Cerrar sesión' }).click();
      } else await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
      await page.waitForURL('**/login');
      await page.getByLabel('Usuario', { exact: true }).fill('cuenta-prueba');
      await page.getByPlaceholder('Escribe tu contraseña').fill('Synthetic123!');
      await page.getByRole('button', { name: 'Mostrar', exact: true }).click();
      assert.equal(await page.getByPlaceholder('Escribe tu contraseña').getAttribute('type'), 'text');
      await page.getByRole('button', { name: 'Ocultar', exact: true }).click();
      if (role === 'DRIVER') await capture(page, `${size}-login`);
      await page.getByRole('button', { name: 'Entrar', exact: true }).click();
      await page.waitForURL(root + paths[role][0]);
      await context.close();
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checked, errors, flows: ['role navigation', 'login/logout', 'password visibility', 'dialog Escape/focus', 'driver travel progression', 'chat text/audio/PDF', 'SOS tel link (not dialed)', 'mobile overflow and zoom'] }, null, 2));
} finally { await browser.close(); }
