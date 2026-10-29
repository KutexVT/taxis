// Run the web on localhost:3110 first. API responses below are local synthetic fixtures.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node apps/web/tests/dispatch-pins.mjs
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const root = process.env.DISPATCH_TEST_URL || 'http://localhost:3110';
const artifacts = '/tmp/taxis-dispatch-pins';
await mkdir(artifacts, { recursive: true });
const company = '11111111-1111-4111-8111-111111111111';
const pins = [
  { id: 'global-pin', centralId: null, name: 'Hospital de prueba', color: '#ef4444', shape: 'hospital', lat: 10.0921, lng: -84.7308 },
  { id: 'company-pin', centralId: company, name: 'Parada de prueba', color: '#22c55e', shape: 'house', lat: 10.0915, lng: -84.7291 },
];
const user = { id: '22222222-2222-4222-8222-222222222222', username: 'locutor-prueba', fullName: 'Locutor de prueba', role: 'CENTRAL_ADMIN', status: 'ACTIVE', centralId: company };
try {
  for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    const writes = [];
    page.on('pageerror', error => errors.push(error.message));
    let service;
    await page.route('**/api/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      let body = {};
      let status = 200;
      if (path === '/api/auth/refresh') body = { user, accessToken: 'local-fixture-token' };
      else if (path === '/api/notifications') body = { notifications: [] };
      else if (path === '/api/services' && request.method() === 'GET') body = { services: [] };
      else if (path === '/api/services' && request.method() === 'POST') { service = request.postDataJSON(); body = { service: { id: 'fixture-service' } }; }
      else if (path === '/api/map-pins') {
        if (request.method() !== 'GET') writes.push(request.method());
        body = { pins };
      } else if (path === '/api/geocode') { status = 503; body = { error: 'Geocoder unavailable for this test' }; }
      else { status = 404; body = { error: 'No fixture for this request' }; }
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(`${root}/central/despacho`);
    await page.locator('.leaflet-tooltip').filter({ hasText: 'Hospital de prueba' }).waitFor();
    await page.locator('.leaflet-tooltip').filter({ hasText: 'Parada de prueba' }).waitFor();
    assert.equal(await page.getByRole('button', { name: '+ Añadir pin', exact: true }).count(), 0);
    await page.getByRole('searchbox').fill('Hospital');
    await page.getByRole('button', { name: 'Hospital de prueba · Pin', exact: true }).click();
    await page.getByText('10.09210, -84.73080', { exact: true }).waitFor();
    // Map selection uses the same coordinates without opening any editing UI.
    await page.locator('.leaflet-marker-icon[title="Parada de prueba"]').click();
    await page.getByText('10.09150, -84.72910', { exact: true }).waitFor();
    assert.equal(await page.getByPlaceholder('Nombre del pin').count(), 0);
    await page.getByRole('searchbox').fill('Parada');
    await page.getByRole('button', { name: 'Parada de prueba · Pin', exact: true }).waitFor();
    await page.waitForResponse(response => response.url().includes('/api/geocode'));
    assert(await page.getByRole('button', { name: 'Parada de prueba · Pin', exact: true }).isVisible());
    await page.getByRole('button', { name: 'Parada de prueba · Pin', exact: true }).click();
    await page.getByRole('button', { name: 'Agrandar mapa', exact: true }).click();
    await page.getByRole('button', { name: 'Reducir mapa', exact: true }).waitFor();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${artifacts}/${name}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Reducir mapa', exact: true }).click();
    await page.waitForFunction(() => {
      const map = document.querySelector('.leaflet-container')?.getBoundingClientRect();
      const pin = document.querySelector('.leaflet-marker-icon[title="Parada de prueba"]')?.getBoundingClientRect();
      return map && pin && pin.left >= map.left && pin.right <= map.right && pin.top >= map.top && pin.bottom <= map.bottom;
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${artifacts}/${name}-dispatch.png`, fullPage: true });
    await page.getByLabel(/^Cliente/).fill('Cliente de prueba');
    await page.getByLabel(/^Telefono/).fill('88888888');
    await page.getByLabel(/^Direccion de origen/).fill('Parada de prueba');
    await page.getByRole('button', { name: 'Crear servicio', exact: true }).click();
    await page.waitForTimeout(150);
    assert.equal(service?.originLat, pins[1].lat);
    assert.equal(service?.originLng, pins[1].lng);
    assert.deepEqual(writes, []);
    assert.deepEqual(errors, []);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await context.close();
  }
  console.log('Dispatch pins: desktop/mobile map labels, scoped pin fixtures, search with geocoder offline, pin selection, expanded map and service origin OK');
} finally { await browser.close(); }
