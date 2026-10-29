// Start integration.test.ts --serve and the web at localhost:3109 first.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node apps/web/tests/central-areas.mjs
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const artifacts = process.env.AREA_SCREENSHOTS || '/tmp/taxis-area-screenshots';
await mkdir(artifacts, { recursive: true });
const owner = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const driver = await browser.newContext({ viewport: { width: 390, height: 844 }, geolocation: { latitude: 10.005, longitude: -83.995 }, permissions: ['geolocation'] });
const errors = [];
const responses = [];
for (const context of [owner, driver]) context.on('response', response => {
  const path = new URL(response.url()).pathname;
  if (path.startsWith('/api/')) responses.push({ path, status: response.status() });
});
for (const context of [owner, driver]) context.on('page', page => page.on('pageerror', error => errors.push(error.stack || error.message)));
const page = await owner.newPage();
const mobile = await driver.newPage();
page.setDefaultTimeout(15000);
mobile.setDefaultTimeout(15000);
async function login(tab, username) {
  await tab.goto('http://localhost:3109/login');
  await tab.getByLabel('Usuario', { exact: true }).fill(username);
  await tab.getByLabel('Contrasena', { exact: true }).fill('AreaTest123!');
  await tab.getByRole('button', { name: 'Iniciar sesion' }).click();
  await tab.getByRole('link', { name: 'Mapa', exact: true }).waitFor();
}
async function capture(tab, filename) {
  await tab.waitForFunction(() => {
    const tiles = [...document.querySelectorAll('.leaflet-tile')];
    return tiles.length > 0 && tiles.every(tile => tile.complete && tile.naturalWidth > 0);
  }, undefined, { timeout: 15000 });
  await tab.waitForTimeout(300);
  await tab.screenshot({ path: `${artifacts}/${filename}.png`, fullPage: true });
}
try {
  // A slow initial refresh must not clear a login that has already succeeded.
  let initialRefreshFinished = false;
  await page.route('**/api/auth/refresh', async route => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Sin sesión activa' }) });
    initialRefreshFinished = true;
  }, { times: 1 });
  await login(page, 'area-owner');
  while (!initialRefreshFinished) await page.waitForTimeout(50);
  assert(await page.getByRole('link', { name: 'Mapa', exact: true }).isVisible());
  await page.getByRole('link', { name: 'Mapa', exact: true }).click();
  await page.getByRole('button', { name: 'Crear zona de central' }).waitFor();
  await page.getByRole('searchbox').fill('Central Centro');
  await page.getByRole('button', { name: 'Central Centro · Central', exact: true }).click();
  await page.getByRole('button', { name: 'Crear zona de central' }).click();
  const map = page.locator('.leaflet-container');
  const box = await map.boundingBox();
  assert(box);
  const points = [[0.26, 0.28], [0.70, 0.28], [0.70, 0.54], [0.26, 0.54]];
  for (const [x, y] of points) await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
  await page.getByRole('button', { name: 'Deshacer punto' }).click();
  await page.mouse.click(box.x + box.width * 0.26, box.y + box.height * 0.54);
  await page.getByRole('button', { name: 'Terminar contorno' }).click();
  await page.getByLabel('Empresa', { exact: true }).selectOption({ label: 'Area test 1' });
  await page.getByLabel('Nombre de la zona').fill('Zona prueba visual');
  await page.getByRole('button', { name: 'Color de zona #3b82f6', exact: true }).click();
  await capture(page, 'desktop-editor');
  await page.getByRole('button', { name: 'Guardar zona', exact: true }).click();
  await page.getByRole('button', { name: 'Crear zona de central' }).waitFor();
  await page.locator('.leaflet-tooltip').filter({ hasText: 'Zona prueba visual' }).waitFor();
  await page.reload();
  await page.locator('.leaflet-tooltip').filter({ hasText: 'Zona prueba visual' }).waitFor();
  await capture(page, 'desktop');

  await login(mobile, 'area-driver');
  await mobile.getByRole('button', { name: 'Compartir GPS', exact: true }).click();
  await mobile.getByRole('heading', { name: 'Compartiendo ubicación', exact: true }).waitFor();
  await mobile.getByRole('link', { name: 'Mapa', exact: true }).click();
  await mobile.locator('.leaflet-tooltip').filter({ hasText: 'Central Centro' }).waitFor();
  await mobile.getByText(/^En central: Central Centro/).waitFor();
  assert.equal(await mobile.getByRole('button', { name: 'Crear zona de central' }).count(), 0);
  assert.equal(await mobile.getByRole('button', { name: '+ Añadir pin' }).count(), 0);
  assert(!await mobile.getByText('Privada B', { exact: false }).count());
  assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await mobile.locator('.taxi-marker').click();
  assert.equal(await mobile.locator('.leaflet-popup-content').getByText(/km\/h/).count(), 0);
  await mobile.locator('.leaflet-popup-close-button').click();
  await capture(mobile, 'mobile');
  await mobile.reload();
  await mobile.getByText(/^En central: Central Centro/).waitFor();
  await mobile.getByRole('link', { name: 'Inicio', exact: true }).click();
  await mobile.getByRole('heading', { name: 'Compartiendo ubicación', exact: true }).waitFor();
  // Wait through a real GPS heartbeat while navigating between routes.
  await mobile.waitForTimeout(16000);
  await mobile.getByRole('link', { name: 'Mapa', exact: true }).click();
  await mobile.getByText(/^En central: Central Centro/).waitFor();
  await mobile.getByRole('link', { name: 'Inicio', exact: true }).click();
  await mobile.getByRole('button', { name: 'Detener GPS', exact: true }).click();
  await mobile.getByRole('link', { name: 'Mapa', exact: true }).click();
  await mobile.getByText('No hay taxis presentes en las centrales.', { exact: true }).waitFor();
  await capture(mobile, 'mobile-stopped');
  await page.locator('summary').filter({ hasText: 'Zona prueba visual' }).click();
  await page.getByRole('button', { name: 'Editar Zona prueba visual', exact: true }).click();
  await page.getByLabel('Nombre de la zona').fill('Zona visual editada');
  await page.getByRole('button', { name: 'Guardar zona', exact: true }).click();
  await page.locator('.leaflet-tooltip').filter({ hasText: 'Zona visual editada' }).waitFor();
  if (!await page.getByRole('button', { name: 'Editar Zona visual editada', exact: true }).isVisible()) await page.locator('summary').filter({ hasText: 'Zona visual editada' }).click();
  await page.getByRole('button', { name: 'Editar Zona visual editada', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Eliminar zona', exact: true }).click();
  await page.locator('.leaflet-tooltip').filter({ hasText: 'Zona visual editada' }).waitFor({ state: 'detached' });
  // The owner can also complete the entire drawing flow at a phone width.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Crear zona de central' }).click();
  const mobileBox = await map.boundingBox();
  for (const [x, y] of [[0.25, 0.25], [0.75, 0.25], [0.5, 0.40]]) await page.mouse.click(mobileBox.x + mobileBox.width * x, mobileBox.y + mobileBox.height * y);
  await page.getByRole('button', { name: 'Terminar contorno' }).click();
  await page.getByLabel('Nombre de la zona').fill('Zona móvil');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await capture(page, 'mobile-editor');
  await page.getByRole('button', { name: 'Guardar zona', exact: true }).click();
  await page.locator('.leaflet-tooltip').filter({ hasText: 'Zona móvil' }).waitFor();
  assert.deepEqual(errors, []);
  console.log(`Central areas UI: desktop/mobile drawing, undo, save, search, reload, private driver map, GPS navigation/heartbeat and stop OK. Screenshots: ${artifacts}`);
} catch (error) {
  console.error({ url: page.url(), mobileUrl: mobile.url(), text: (await page.locator('body').innerText()).slice(-3000), errors, responses: responses.slice(-30) });
  await page.screenshot({ path: `${artifacts}/failure.png`, fullPage: true });
  throw error;
} finally { await browser.close(); }
