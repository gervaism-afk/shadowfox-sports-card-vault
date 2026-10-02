import { test, expect } from '@playwright/test';
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'collector@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} };
const token = [Buffer.from('{"alg":"HS256"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600, role: 'authenticated' })).toString('base64url'), 'fixture'].join('.');
const session = { access_token: token, refresh_token: 'fixture-refresh', expires_at: Math.floor(Date.now()/1000)+3600, expires_in: 3600, token_type: 'bearer', user };

test('password visibility and remember me choose tab storage or persistent storage', async ({ page, browser }) => {
  await page.route('http://127.0.0.1:54321/**', route => {
    const path = new URL(route.request().url()).pathname;
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ headers, body: '' });
    return route.fulfill({ headers, json: path === '/auth/v1/token' ? session : path === '/auth/v1/user' ? user : [] });
  });
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password');
  await page.getByRole('checkbox', { name: 'Remember me on this device' }).uncheck();
  await page.locator('form').getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page).toHaveURL(/\/collection$/);
  expect(await page.evaluate(() => localStorage.getItem('sb-127-auth-token'))).toBeNull();
  expect(await page.evaluate(() => sessionStorage.getItem('sb-127-auth-token'))).toBeTruthy();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('fixture-password');
  await page.getByRole('checkbox', { name: 'Remember me on this device' }).check();
  await page.locator('form').getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page).toHaveURL(/\/collection$/);
  expect(await page.evaluate(() => localStorage.getItem('sb-127-auth-token'))).toBeTruthy();
  expect(await page.evaluate(() => sessionStorage.getItem('sb-127-auth-token'))).toBeNull();
  const saved = await page.context().storageState();
  const context = await browser.newContext({ storageState: saved });
  const reopened = await context.newPage();
  await reopened.route('http://127.0.0.1:54321/**', route => route.fulfill({ json: [] }));
  await reopened.goto('http://127.0.0.1:3001/login');
  await expect(reopened).toHaveURL(/\/collection$/);
  await context.close();
});

test('account settings persist only the name, verify current password, and expose real logo', async ({ page }) => {
  let username = 'Collector';
  const writes: any[] = [];
  await page.addInitScript(s => localStorage.setItem('sb-127-auth-token', JSON.stringify(s)), session);
  await page.route('http://127.0.0.1:54321/**', async route => {
    const req = route.request(); const path = new URL(req.url()).pathname;
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    if (req.method() === 'OPTIONS') return route.fulfill({ headers, body: '' });
    if (path === '/rest/v1/profiles') {
      if (req.method() === 'PATCH') { const body = req.postDataJSON(); writes.push(body); username = body.username; }
      return route.fulfill({ headers, json: { username, role: 'user' } });
    }
    if (path === '/auth/v1/token') {
      const body = req.postDataJSON();
      if (body.password !== 'old-password') return route.fulfill({ status: 400, headers, json: { message: 'Invalid credentials' } });
      return route.fulfill({ headers, json: session });
    }
    if (path === '/auth/v1/user') { if (req.method() === 'PUT') writes.push(req.postDataJSON()); return route.fulfill({ headers, json: user }); }
    return route.fulfill({ headers, json: [] });
  });
  await page.goto('/account');
  await expect(page.getByLabel('Display name')).toHaveValue('Collector');
  await expect(page.locator('.brandRealLogo')).toHaveAttribute('src', '/shadowfox-logo.jpg');
  await page.getByLabel('Display name').fill('My new name');
  await page.getByRole('button', { name: 'Save name' }).click();
  await expect(page.getByRole('status')).toHaveText('Name saved.');
  expect(writes[0]).toEqual({ username: 'My new name' });
  await page.reload();
  await expect(page.getByLabel('Display name')).toHaveValue('My new name');
  await page.getByLabel('Current password', { exact: true }).fill('wrong-password');
  await page.getByLabel('New password', { exact: true }).fill('new-password');
  await page.getByLabel('Confirm new password', { exact: true }).fill('new-password');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('status')).toContainText('current password is incorrect');
  expect(writes).toHaveLength(1);
  await page.getByLabel('Current password', { exact: true }).fill('old-password');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('status')).toHaveText('Password updated.');
  expect(writes[1]).toMatchObject({ password: 'new-password' });
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
