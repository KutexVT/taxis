// Theme persistence, system preference, blocked storage and reduced-motion checks.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
const root = process.env.REDESIGN_TEST_URL || 'http://localhost:3110';
try {
  const context = await browser.newContext({ colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/api/**', route => route.fulfill({ status: 401, json: { error: 'Synthetic unauthenticated session' } }));
  const page = await context.newPage();
  await page.goto(root + '/login');
  await page.getByRole('button', { name: 'Activar modo claro' }).waitFor();
  async function checkContrast() {
    const ratios = await page.evaluate(() => {
      const css = getComputedStyle(document.documentElement);
      const rgb = key => css.getPropertyValue(key).trim().split(/\s+/).map(Number);
      const luminance = values => values.map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
      const surface = rgb('--surface-raised');
      return ['--body', '--muted', '--status-green', '--status-blue', '--status-red', '--status-amber'].map(key => {
        const foreground = rgb(key);
        const background = key.startsWith('--status') ? surface.map((n, i) => n * .9 + foreground[i] * .1) : surface;
        const a = luminance(foreground), b = luminance(background);
        return { key, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
      });
    });
    for (const { key, ratio } of ratios) assert(ratio >= 4.5, `${key} contrast ${ratio}`);
  }
  await checkContrast();
  assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(18, 18, 18)');
  assert.equal(await page.locator('meta[name=theme-color]').getAttribute('content'), '#121212');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.getByRole('button', { name: 'Activar modo oscuro' }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('taxi-theme')), 'dark');
  const other = await context.newPage();
  await other.goto(root + '/login');
  await other.getByRole('button', { name: 'Activar modo claro' }).waitFor();
  await page.getByRole('button', { name: 'Activar modo claro' }).click();
  await checkContrast();
  await other.getByRole('button', { name: 'Activar modo oscuro' }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: 'Activar modo oscuro' }).waitFor();
  await page.emulateMedia({ colorScheme: 'dark' });
  assert.equal(await page.locator('html').evaluate(el => el.classList.contains('dark')), false);
  const button = page.getByRole('button', { name: 'Activar modo oscuro' });
  await button.hover();
  await page.mouse.down();
  assert.equal(await button.evaluate(el => getComputedStyle(el).transform), 'none');
  await page.mouse.up();
  await context.close();

  const blocked = await browser.newContext({ colorScheme: 'dark', serviceWorkers: 'block' });
  await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }));
  await blocked.route('**/api/**', route => route.fulfill({ status: 401, json: {} }));
  const privatePage = await blocked.newPage();
  const errors = [];
  privatePage.on('pageerror', error => errors.push(error.message));
  await privatePage.goto(root + '/login');
  await privatePage.getByRole('button', { name: 'Activar modo claro' }).click();
  await privatePage.getByRole('button', { name: 'Activar modo oscuro' }).waitFor();
  assert.deepEqual(errors, []);
  await blocked.close();
  console.log('Theme: system default, manual override, reload, cross-tab sync, blocked storage and reduced-motion OK');
} finally { await browser.close(); }
