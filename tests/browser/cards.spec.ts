import { test, expect, type Page } from '@playwright/test';
import {inflateSync} from 'node:zlib';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const userId = '11111111-1111-4111-8111-111111111111';
const user = { id: userId, email: 'collector@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} };
function row(patch: Record<string, unknown> = {}) {
  return { id: randomUUID(), user_id: userId, sport: 'Hockey', player: 'Test Player', year: '2023', brand: 'Upper Deck', set_name: '', subset: '', card_number: '', team: '', rookie: false, autograph: false, relic_patch: false, serial_number: '', parallel: '', grading_company: '', grade: '', quantity: 1, estimated_value_cad: 0, notes: '', front_image_url: '', back_image_url: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...patch };
}
async function fixture(page: Page, initial: ReturnType<typeof row>[] = []) {
  await page.route('**/api/identify', route => route.fulfill({ status: 503, json: { error: 'AI identification is not configured.' } }));
  await page.route('**/api/catalog?**', route => { const sport=new URL(route.request().url()).searchParams.get('sport');return route.fulfill({json:{sport,teams:sport==='Hockey'?['Montréal Canadiens']:['Toronto Blue Jays'],players:[{name:sport==='Hockey'?'Nick Suzuki':'Vladimir Guerrero Jr.',team:''}],sets:[...(sport==='Hockey'?[{year:'2025-26',brand:'Upper Deck',set:'Series 1',url:'https://upperdeck.com/checklist/2025-26-ud-series-1-checklist/'},{year:'2025-26',brand:'Upper Deck',set:'Series 2',url:'https://example.test/series-2'}]:[{year:'2026',brand:'Topps',set:'Base',url:'https://baseballcardpedia.com/index.php/2026_Topps'}]),{year:sport==='Hockey'?'2026-27':'2026',brand:sport==='Hockey'?'Upper Deck':'Topps',set:sport==='Hockey'?'Tim Hortons':'Chrome',url:'https://example.test/checklist'}],sources:[]}}); });
  const rows = [...initial];
  const checklists:any[]=[];const binders: any[] = []; const memberships: any[] = []; const wants: any[] = []; const transactions: any[] = [];
  const calls: string[] = [];
  const token = [Buffer.from('{"alg":"HS256"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url'), 'test-only-signature'].join('.');
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('sb-127-auth-token', JSON.stringify({ access_token: token, refresh_token: 'fixture-refresh-token', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user }));
  }, { token, user });
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 200, headers, body: '{}' });
    calls.push(`${request.method()} ${url.pathname}`);
    if (url.pathname === '/auth/v1/user') return route.fulfill({ headers, json: user });
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers, body: '' });
    if (url.pathname === '/rest/v1/profiles') return route.fulfill({ headers, json: { role: 'user' } });
    if (url.pathname === '/rest/v1/card_image_cleanup') return route.fulfill({ headers, json: [] });
    if (url.pathname.startsWith('/storage/v1/object/')) return route.fulfill({ headers, json: { Key: url.pathname } });
    if (url.pathname === '/rest/v1/rpc/increment_card_quantity') {
      const { card_id, amount } = request.postDataJSON();
      const card = rows.find((card) => card.id === card_id)!;
      card.quantity += amount;
      return route.fulfill({ headers, json: card });
    }
    if (['/rest/v1/binders','/rest/v1/binder_cards','/rest/v1/want_list','/rest/v1/card_transactions','/rest/v1/set_checklists'].includes(url.pathname)) {
      const store = url.pathname.endsWith('/set_checklists') ? checklists : url.pathname.endsWith('/binders') ? binders : url.pathname.endsWith('/binder_cards') ? memberships : url.pathname.endsWith('/card_transactions') ? transactions : wants;
      if (request.method() === 'GET') { const offset=Number(url.searchParams.get('offset')||0); const limit=Math.min(Number(url.searchParams.get('limit')||100),100);return route.fulfill({ headers, json: store.slice(offset,offset+limit) }); }
      if (request.method() === 'POST') {
        const body = request.postDataJSON();
        if(Array.isArray(body)){const added=[];for(const value of body){const duplicate=store.some(item=>value.binder_id?item.binder_id===value.binder_id&&item.card_id===value.card_id:item.id===value.id);if(!duplicate){const entry={created_at:new Date().toISOString(),...value};store.push(entry);added.push(entry);}}return route.fulfill({headers,json:added});}
        const entry = { id: randomUUID(), created_at: new Date().toISOString(), ...body };
        if (!store.some(item => entry.binder_id && item.binder_id === entry.binder_id && item.card_id === entry.card_id)) store.push(entry);
        return route.fulfill({ headers, json: entry });
      }
      const matches = (item: any) => ['id','binder_id','card_id'].every(key => !url.searchParams.has(key) || item[key] === url.searchParams.get(key)!.slice(3));
      if (request.method() === 'PATCH') { const entry=store.find(matches);Object.assign(entry,request.postDataJSON());return route.fulfill({headers,json:entry}); }
      if (request.method() === 'DELETE') {
        const deleted=store.filter(matches); for(let i=store.length-1;i>=0;i--)if(matches(store[i]))store.splice(i,1);
        if(store===binders)for(let i=memberships.length-1;i>=0;i--)if(deleted.some(b=>b.id===memberships[i].binder_id))memberships.splice(i,1);
        return route.fulfill({status:204,headers,body:''});
      }
    }
    if (url.pathname === '/rest/v1/rpc/acquire_wanted_card') {
      const body=request.postDataJSON(); const index=wants.findIndex(w=>w.id===body.want_id);const card=wants[index].card_data;
      let acquired=rows.find(r=>r.id===body.existing_card_id);
      if(acquired)acquired.quantity+=card.quantity;
      else {acquired=row({player:card.player,year:card.year,brand:card.brand,set_name:card.set,subset:card.subset,card_number:card.cardNumber,parallel:card.parallel,team:card.team,rookie:card.rookie,autograph:card.autograph,relic_patch:card.relicPatch,serial_number:card.serialNumber,grading_company:card.gradingCompany,grade:card.grade,quantity:card.quantity,notes:card.notes});rows.push(acquired);}
      wants.splice(index,1);return route.fulfill({headers,json:acquired.id});
    }
    if (url.pathname === '/rest/v1/cards') {
      if (request.method() === 'POST') {
        const saved = request.postDataJSON();
        const index = rows.findIndex((card) => card.id === saved.id);
        if (index < 0) rows.unshift(saved); else rows[index] = saved;
        return route.fulfill({ headers, json: saved });
      }
      const offset = Number(url.searchParams.get('offset') || 0);
      const limit = Math.min(Number(url.searchParams.get('limit') || 100), 100);
      const id = url.searchParams.get('id');
      const matching = id?.startsWith('eq.') ? rows.filter(card => card.id === id.slice(3)) : rows;
      return route.fulfill({ headers, json: matching.slice(offset, offset + limit) });
    }
    return route.fulfill({ status: 500, headers, json: { message: `Unexpected fixture request ${url.pathname}` } });
  });
  return { rows, calls, binders, memberships, wants, transactions,checklists };
}
async function cardImage(page: Page, player = 'CONNOR MCDAVID', year = '2023', brand = 'Upper Deck', number = '201') {
  const url = await page.evaluate(({ player, year, brand, number }) => {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 800;
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'white'; context.fillRect(0, 0, 1200, 800);
    context.fillStyle = 'black'; context.font = 'bold 60px Arial';
    context.fillText(player, 60, 150); context.fillText(`${year} ${brand}`, 60, 300); context.fillText(`Young Guns #${number}`, 60, 450);
    return canvas.toDataURL('image/png');
  }, { player, year, brand, number });
  return { name: 'card.png', mimeType: 'image/png', buffer: Buffer.from(url.split(',')[1], 'base64') };
}

test('real local OCR, sold-price estimate, save, and collection navigation', async ({ page }) => {
  const backend = await fixture(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const externalOcr: string[] = [];
  page.on('request', (request) => { if (/jsdelivr|tessdata|projectnaptha/.test(request.url())) externalOcr.push(request.url()); });
  await page.goto('/scan');
  await page.getByLabel('Upload front image').setInputFiles(await cardImage(page));
  await page.getByRole('button', { name: 'Identify Card', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save Card', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Player', { exact: true })).toHaveValue('Connor Mcdavid', { timeout: 60000 });
  await expect(page.getByLabel('Year', { exact: true })).toHaveValue('2023');
  await expect(page.getByLabel('Brand', { exact: true })).toHaveValue('Upper Deck');
  await expect(page.getByLabel('Card Number', { exact: true })).toHaveValue('201');
  await page.getByText('Estimate from sold prices', { exact: true }).click();
  await page.getByText('Or enter confirmed CAD prices', { exact: true }).click();
  await page.getByLabel('Sold prices in CAD').fill('20\n30\n25');
  await page.getByRole('button', { name: 'Apply Estimate' }).click();
  await expect(page.getByLabel('Estimated Value CAD')).toHaveValue('25');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/shadowfox-scan-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: '/tmp/shadowfox-scan-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Save Card', exact: true }).click();
  await expect(page).toHaveURL(/\/collection$/);
  expect(backend.rows).toHaveLength(1);
  expect(backend.rows[0].estimated_value_cad).toBe(25);
  expect(backend.rows[0].front_image_url).toContain('/storage/v1/object/public/card-images/');
  expect(externalOcr).toEqual([]);
  expect(errors).toEqual([]);
});

test('a second scan clears previous values; duplicate quantity uses atomic RPC', async ({ page }) => {
  const backend = await fixture(page, [row({ player: 'John Smith', year: '2024', brand: 'Topps', card_number: '100', subset: 'Young Guns', sport: 'Hockey', rookie: true })]);
  await page.goto('/scan');
  await page.getByLabel('Upload front image').setInputFiles(await cardImage(page));
  await page.getByRole('button', { name: 'Identify Card', exact: true }).click();
  await expect(page.getByLabel('Player', { exact: true })).toHaveValue('Connor Mcdavid', { timeout: 60000 });
  await expect(page.getByRole('button', { name: 'Save Card', exact: true })).toBeEnabled();
  await page.getByLabel('Notes', { exact: true }).fill('Old scan notes');
  await page.getByLabel('Estimated Value CAD').fill('999');
  await page.getByLabel('Upload front image').setInputFiles(await cardImage(page, 'JOHN SMITH', '2024', 'Topps', '100'));
  await page.getByRole('button', { name: 'Identify Card', exact: true }).click();
  await expect(page.getByLabel('Player', { exact: true })).toHaveValue('John Smith', { timeout: 60000 });
  await expect(page.getByLabel('Notes', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Estimated Value CAD')).toHaveValue('0');
  await page.getByRole('button', { name: 'Save Card', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add to Existing Quantity' })).toBeVisible();
  await page.getByRole('button', { name: 'Add to Existing Quantity' }).click();
  await expect(page).toHaveURL(/\/collection$/);
  expect(backend.rows[0].quantity).toBe(2);
  expect(backend.calls).toContain('POST /rest/v1/rpc/increment_card_quantity');
  expect(backend.calls).not.toContain('POST /rest/v1/cards');
});

test('collection totals and JSON export include rows beyond the API cap', async ({ page }) => {
  const backend = await fixture(page, Array.from({ length: 1105 }, (_, index) => row({ player: `Player ${index}`, estimated_value_cad: 1 })));
  await page.goto('/collection');
  await expect(page.locator('.kpiValue').first()).toHaveText('1105');
  const downloaded = page.waitForEvent('download');
  await page.getByText('Print & export', { exact: true }).click();
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const file = await downloaded;
  const exported = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(exported).toHaveLength(1105);
  expect(backend.calls.filter((call) => call === 'GET /rest/v1/cards').length).toBeGreaterThan(11);
});

test('invalid image reports a useful error and leaves manual entry usable', async ({ page }) => {
  await fixture(page);
  await page.goto('/scan');
  await page.getByLabel('Upload front image').setInputFiles({ name: 'file.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
  await expect(page.getByText('Choose a JPEG, PNG, or WebP image.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save Card', exact: true })).toBeEnabled();
});


test('AI fills editable details, combines front and back, and saves corrections', async ({ page }) => {
  const backend = await fixture(page);
  const requests: any[] = [];
  await page.route('**/api/identify', async route => {
    requests.push(route.request().postDataJSON());
    expect(route.request().headers().authorization).toContain('Bearer ');
    await route.fulfill({ json: { fields: { sport: 'Hockey', player: 'Connor McDavid', year: '2023-24', brand: 'Upper Deck', set: 'Series One', subset: 'Young Guns', cardNumber: '201', parallel: requests.length > 1 ? 'Clear Cut' : null }, warnings: ['Confirm the parallel using the back photo.'], evidence: 'Visible Young Guns #201' } });
  });
  await page.goto('/scan');
  await page.getByLabel('Upload front image').setInputFiles(await cardImage(page));
  await page.getByRole('button', { name: 'Identify Card', exact: true }).click();
  await expect(page.getByLabel('Player', { exact: true })).toHaveValue('Connor McDavid');
  await expect(page.getByLabel('Set', { exact: true })).toHaveValue('Series One');
  await expect(page.getByText('Confirm the parallel using the back photo.')).toBeVisible();
  await page.getByLabel('Upload back image').setInputFiles(await cardImage(page));
  await page.getByRole('button', { name: 'Identify Card' }).click();
  await expect(page.getByLabel('Parallel', { exact: true })).toHaveValue('Clear Cut');
  expect(requests[1].frontImage).toMatch(/^data:image/);
  expect(requests[1].backImage).toMatch(/^data:image/);
  await page.getByLabel('Year', { exact: true }).fill('2022-23');
  await page.getByRole('button', { name: 'Save Card', exact: true }).click();
  await expect(page).toHaveURL(/\/collection$/);
  expect(backend.rows[0].year).toBe('2022-23');
  expect(backend.rows[0].set_name).toBe('Series One');
});


test('130point pasted prices require review, convert USD to CAD, and persist an edited estimate', async ({ page }) => {
  const backend = await fixture(page);
  await page.route('**/api/identify', route => route.fulfill({ json: { fields: { sport: 'Hockey', player: 'Connor McDavid', year: '2015-16', brand: 'Upper Deck', set: 'Series One', subset: 'Young Guns', cardNumber: '201', gradingCompany: 'PSA', grade: '9' }, warnings: [], evidence: 'Synthetic test' } }));
  await page.route('**/api/pricing/exchange-rate', route => route.fulfill({ json: { rate: 1.4, date: new Date().toISOString().slice(0, 10), source: 'Bank of Canada' } }));
  await page.goto('/scan');
  await page.getByLabel('Upload front image').setInputFiles(await cardImage(page));
  await page.getByRole('button', { name: 'Identify Card', exact: true }).click();
  await expect(page.getByLabel('Player', { exact: true })).toHaveValue('Connor McDavid');
  await page.getByText('Estimate from sold prices', { exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open 130point' })).toHaveAttribute('href', 'https://130point.com/sales/');
  await expect(page.getByLabel('Card search text')).toHaveValue(/PSA 9$/);
  await page.getByLabel('Paste sold results').fill('Matching card\nSold price: US $20.00\nShipping: US $5.00\nSold price: CAD $42.00\nAsking price: US $500.00');
  await page.getByRole('button', { name: 'Review Pasted Prices' }).click();
  await expect(page.getByRole('checkbox', { name: 'Include USD 20.00', exact: true })).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Calculate Selected Prices' })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Include USD 20.00', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Include CAD 42.00', exact: true }).check();
  await page.getByRole('button', { name: 'Calculate Selected Prices' }).click();
  await expect(page.getByText('Suggested value:', { exact: false })).toContainText('$35.00 CAD');
  await expect(page.getByText(/Bank of Canada rate dated/)).toBeVisible();
  await page.getByRole('button', { name: 'Apply Selected Estimate' }).click();
  await expect(page.getByLabel('Estimated Value CAD')).toHaveValue('35');
  await page.getByLabel('Estimated Value CAD').fill('34');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/shadowfox-sold-review-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Save Card', exact: true }).click();
  await expect(page).toHaveURL(/\/collection$/);
  expect(backend.rows[0].estimated_value_cad).toBe(34);
});

test('gallery filters and card display preserve edits, cancel, and saved values on phones', async ({ page }) => {
  const front = `http://127.0.0.1:54321/storage/v1/object/public/card-images/${userId}/front/gallery.png`;
  const image = await cardImage(page);
  const hockey = row({ player: 'Gallery Hockey', front_image_url: front, grading_company: 'PSA', grade: '9', rookie: true, estimated_value_cad: 40 });
  const backend = await fixture(page, [hockey, row({ player: 'Gallery Baseball', sport: 'Baseball' }), row({ player: 'Another Hockey' })]);
  await page.route(front, route => route.fulfill({ contentType: 'image/png', body: image.buffer }));
  await page.goto('/collection');
  await expect(page.locator('.vaultCollectionCard')).toHaveCount(3);
  await expect(page.locator('.vaultCardWell img')).toHaveCSS('object-fit', 'contain');
  await expect(page.locator('main h1')).toHaveCount(1);
  await page.getByRole('button', { name: 'Baseball', exact: true }).click();
  await expect(page.locator('.vaultCollectionCard')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'View Gallery Baseball', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByText('Filters', { exact: true }).click();
  await page.getByLabel('Grading', { exact: true }).selectOption('yes');
  await expect(page.locator('.vaultCollectionCard')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search your collection' }).fill('Gallery Hockey');
  await expect(page.locator('.vaultCollectionCard')).toHaveCount(1);
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.locator('table tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Gallery', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.locator('.vaultAdvancedFilters summary').click();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width <= 900) await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
    else await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    if (width === 1280) await page.screenshot({ path: '/tmp/shadowfox-redesign-collection-desktop.png', fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.locator('.vaultCardGrid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/shadowfox-redesign-collection-mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'View Gallery Hockey', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Gallery Hockey', level: 1 })).toBeVisible();
  await expect(page.locator('.detailImageStage img')).toHaveCSS('object-fit', 'contain');
  await expect(page.getByLabel('Player', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByText('No back image added', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit card', exact: true }).click();
  await page.getByLabel('Replace front image').focus();
  await expect(page.getByLabel('Replace front image')).toBeFocused();
  await page.getByLabel('Replace front image').setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid image') });
  await expect(page.getByText('Choose a JPEG, PNG, or WebP image.', { exact: true })).toBeVisible();
  await page.getByLabel('Player', { exact: true }).fill('Unsaved draft');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Gallery Hockey', level: 1 })).toBeVisible();
  expect(backend.calls).not.toContain('POST /rest/v1/cards');
  await page.getByRole('button', { name: 'Edit card', exact: true }).click();
  await page.getByLabel('Notes', { exact: true }).fill('Verified edit after the redesign');
  await page.getByLabel('Estimated Value CAD').fill('45');
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect(page.getByText('Saved.', { exact: true })).toBeVisible();
  expect(backend.rows.find(card => card.id === hockey.id)?.estimated_value_cad).toBe(45);
  expect(backend.rows.find(card => card.id === hockey.id)?.notes).toBe('Verified edit after the redesign');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Insights', exact: true }).click();
  await expect(page).toHaveURL(/\/analytics$/);
  await expect(page.locator('main h1')).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Insights', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('signed-out navigation and keyboard sign-in stay usable', async ({ page }) => {
  let submitted = false;
  await page.route('http://127.0.0.1:54321/**', route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: '' });
    submitted = true;
    return route.fulfill({ status: 400, headers: { 'access-control-allow-origin': '*' }, json: { error: 'invalid_grant', error_description: 'Invalid login credentials' } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Account menu' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
  await page.getByLabel('Email', { exact: true }).fill('collector@example.test');
  await page.getByLabel('Password', { exact: true }).fill('fixture-password');
  await page.getByLabel('Password', { exact: true }).press('Enter');
  await expect(page.getByRole('status')).toContainText('Invalid login credentials');
  expect(submitted).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/shadowfox-redesign-login-mobile.png', fullPage: true });
});

test('account navigation shows Admin only for the verified role and logs out', async ({ page }) => {
  await fixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Account menu' })).toHaveAttribute('aria-expanded', 'false');
  await page.route('**/rest/v1/profiles?**', route => route.fulfill({ json: { role: 'admin' }, headers: { 'access-control-allow-origin': '*' } }));
  await page.reload();
  await page.getByRole('button', { name: 'Account menu' }).click();
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Log Out', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Account menu' })).toHaveCount(0);
});

test('photos wait for one combined identification and stopped scans cannot overwrite manual edits', async ({ page }) => {
  await fixture(page);
  let calls = 0;
  let release: (() => void) | undefined;
  await page.route('**/api/identify', async route => {
    calls++;
    const body = route.request().postDataJSON();
    expect(body.frontImage).toMatch(/^data:image/);
    expect(body.backImage).toMatch(/^data:image/);
    await new Promise<void>(resolve => { release = resolve; });
    await route.fulfill({ json: { fields: { player: 'Stale result' }, warnings: [], evidence: '' } }).catch(() => {});
  });
  await page.goto('/scan');
  await page.getByLabel('Upload front image').setInputFiles(await cardImage(page));
  await expect(page.getByText('Front photo ready.', { exact: false })).toBeVisible();
  await page.getByLabel('Upload back image').setInputFiles(await cardImage(page));
  await expect(page.getByText('Back photo ready.', { exact: false })).toBeVisible();
  expect(calls).toBe(0);
  const requested = page.waitForRequest('**/api/identify');
  await page.getByRole('button', { name: 'Identify Card', exact: true }).click();
  await requested;
  await page.getByRole('button', { name: 'Stop identification' }).click();
  await expect(page.getByLabel('Player', { exact: true })).toBeEnabled();
  await page.getByLabel('Player', { exact: true }).fill('Manual correction');
  release?.();
  await expect(page.getByLabel('Player', { exact: true })).toHaveValue('Manual correction');
  await expect(page.getByRole('img', { name: 'Front preview' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Back preview' })).toBeVisible();
  expect(calls).toBe(1);
});

test('collection PDF downloads all paginated cards or the chosen filtered subset', async ({ page }) => {
  const records = Array.from({ length: 1105 }, (_, i) => row({ player: `PDF Player ${i}`, year: '2021-22', brand: 'Upper Deck', set_name: 'MVP', card_number: String(i + 1), quantity: 2 }));
  await fixture(page, records);
  await page.goto('/collection');
  await expect(page.locator('.kpiValue').first()).toHaveText('2210');
  await page.getByText('Print & export', { exact: true }).click();
  await page.getByRole('button', { name: 'Print / PDF', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const file = await downloaded;
  const pdf = (await readFile((await file.path())!)).toString('latin1');
  expect(pdf.startsWith('%PDF')).toBe(true);
  expect((pdf.match(/\/FT \/Btn/g) || []).length).toBe(1105);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('searchbox', { name: 'Search your collection' }).fill('PDF Player 1104');
  await page.getByRole('button', { name: 'Print / PDF', exact: true }).click();
  await page.getByLabel('Cards to include').selectOption('filtered');
  await page.getByLabel('Paper size').selectOption('a4');
  const subsetDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const subset = (await readFile((await (await subsetDownload).path())!)).toString('latin1');
  expect((subset.match(/\/FT \/Btn/g) || []).length).toBe(1);
});

test('binders add, rename, print, and remove cards without deleting inventory', async ({ page }) => {
  const backend=await fixture(page,[row({player:'Nick Suzuki',year:'2021-22',brand:'Upper Deck',set_name:'MVP',card_number:'87'})]);
  await page.goto('/binders');
  await page.getByLabel('New binder name').fill('Canadiens');
  await page.getByRole('button',{name:'Create binder',exact:true}).click();
  await expect(page.getByLabel('Choose binder')).toContainText('Canadiens');
  await page.getByText('Add or remove cards',{exact:true}).click();
  await page.getByRole('checkbox',{name:'Include Nick Suzuki 2021-22 #87'}).check();
  await expect(page.getByRole('link',{name:'View Nick Suzuki',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Rename binder',exact:true}).click();
  await page.getByLabel('Binder name',{exact:true}).fill('My hockey favorites');
  await page.getByRole('button',{name:'Save binder name',exact:true}).click();
  await expect(page.getByLabel('Choose binder')).toContainText('My hockey favorites');
  const downloaded=page.waitForEvent('download');
  await page.getByRole('button',{name:'Print / PDF',exact:true}).click();
  await page.getByRole('button',{name:'Download PDF',exact:true}).click();
  expect((await downloaded).suggestedFilename()).toBe('shadowfox-binder-checklist.pdf');
  for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Delete binder',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Start your first binder.',exact:true})).toBeVisible();
  expect(backend.rows).toHaveLength(1);expect(backend.memberships).toHaveLength(0);
});

test('wanted cards edit and print separately, then acquire once or merge owned quantity', async ({ page }) => {
  const backend=await fixture(page);
  await page.goto('/want-list');
  await page.getByRole('button',{name:'Add wanted card',exact:true}).click();
  await page.getByLabel('Player',{exact:true}).fill('Nick Suzuki');
  await page.getByLabel('Year',{exact:true}).fill('2021-22');
  await page.getByLabel('Brand',{exact:true}).fill('Upper Deck');
  await page.getByLabel('Set',{exact:true}).fill('MVP');
  await page.getByLabel('Card Number',{exact:true}).fill('87');
  await page.getByLabel('Desired quantity',{exact:true}).fill('2');
  await page.getByRole('button',{name:'Save wanted card',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Nick Suzuki',exact:true})).toBeVisible();
  expect(backend.rows).toHaveLength(0);expect(backend.wants).toHaveLength(1);
  await page.getByRole('button',{name:'Edit wanted card',exact:true}).click();
  await page.getByLabel('Parallel',{exact:true}).fill('Silver Script');
  await page.getByRole('button',{name:'Save wanted card',exact:true}).click();
  await expect(page.getByText(/#87.*Silver Script/)).toBeVisible();
  const downloaded=page.waitForEvent('download');
  await page.getByRole('button',{name:'Print / PDF',exact:true}).click();
  await expect(page.getByRole('checkbox',{name:'Include saved CAD estimates'})).toHaveCount(0);
  await page.getByRole('button',{name:'Download PDF',exact:true}).click();
  expect((await downloaded).suggestedFilename()).toBe('shadowfox-want-list.pdf');
  await page.getByRole('button',{name:'Move to collection',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Moved to your collection.');
  expect(backend.wants).toHaveLength(0);expect(backend.rows).toHaveLength(1);expect(backend.rows[0].quantity).toBe(2);
  await page.getByRole('button',{name:'Add wanted card',exact:true}).click();
  for(const [label,value] of [['Player','Nick Suzuki'],['Year','2021-22'],['Brand','Upper Deck'],['Set','MVP'],['Card Number','87'],['Parallel','Silver Script']])await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByRole('button',{name:'Save wanted card',exact:true}).click();
  await page.getByRole('button',{name:'Move to collection',exact:true}).click();
  await page.getByRole('button',{name:'Add to existing quantity',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Quantity added');
  expect(backend.rows).toHaveLength(1);expect(backend.rows[0].quantity).toBe(3);expect(backend.wants).toHaveLength(0);
  for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});


test('purchase and sale ledger distinguishes unknown costs, edits profit, exports and preserves inventory', async ({page}) => {
  const backend=await fixture(page,[row({player:'Financial test card',quantity:2})]);
  await page.goto('/transactions');
  await page.getByRole('button',{name:'Record transaction',exact:true}).click();
  await page.getByLabel('Type',{exact:true}).selectOption('sale');
  await page.getByLabel('Link to a collection card (optional)',{exact:true}).selectOption(backend.rows[0].id);
  await page.getByLabel('Total sale price (CAD)',{exact:true}).fill('25');
  await page.getByLabel('Selling fees & shipping paid (CAD)',{exact:true}).fill('5.25');
  await page.getByRole('button',{name:'Save transaction',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Transaction saved');
  await expect(page.locator('.transactionStats')).toContainText('1 awaiting costs');
  expect(backend.rows[0].quantity).toBe(2);
  expect(backend.transactions[0].cost_cents).toBeNull();
  await page.getByRole('button',{name:'Edit transaction',exact:true}).click();
  await page.getByLabel('Cost of all cards sold (CAD)',{exact:true}).fill('10');
  await page.getByRole('button',{name:'Save transaction',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Transaction saved');
  await expect(page.locator('.transactionStats')).toContainText('$9.75');
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export CSV',exact:true}).click();
  expect((await download).suggestedFilename()).toBe('shadowfox-purchases-sales.csv');
  await page.reload();
  await expect(page.locator('.transactionStats')).toContainText('$9.75');
  for(const width of [320,390,768,1280]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Delete transaction',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Transaction deleted');
  expect(backend.transactions).toHaveLength(0);expect(backend.rows[0].quantity).toBe(2);
});

test('collection backup previews matching cards, restores missing variants and skips a repeated import', async ({page}) => {
  const owned=row({player:'Nick Suzuki',year:'2021-22',brand:'Upper Deck',set_name:'MVP',card_number:'87',parallel:'Silver Script',quantity:5,notes:'Keep my current details'});
  const backend=await fixture(page,[owned]);
  const source={id:randomUUID(),sport:'Hockey',player:'Nick Suzuki',year:'2021-22',brand:'Upper Deck',set:'MVP',cardNumber:'87',parallel:'Silver Script',quantity:99,estimatedValueCad:3,notes:'Old backup notes'};
  const file={name:'collection-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'shadowfox-collection-backup',version:1,exportedAt:'2026-10-02T00:00:00Z',cards:[source,{...source,id:randomUUID(),parallel:'Gold Script',quantity:2,user_id:'not-the-current-user'}]}))};
  await page.goto('/backup');
  await expect(page.getByLabel('Collection backup file',{exact:true})).toBeEnabled();await page.getByLabel('Collection backup file',{exact:true}).setInputFiles(file);
  await expect(page.getByRole('heading',{name:'Review your backup',exact:true})).toBeVisible();
  await expect(page.locator('.backupCounts')).toContainText('1 to add');
  expect(backend.rows).toHaveLength(1);
  await page.getByRole('button',{name:'Restore 1 missing entry',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Restore complete');
  expect(backend.rows).toHaveLength(2);expect(backend.rows.find(r=>r.id===owned.id)?.quantity).toBe(5);
  expect(backend.rows.find(r=>r.parallel==='Gold Script')?.quantity).toBe(2);
  expect(backend.rows.find(r=>r.parallel==='Gold Script')?.user_id).toBe(userId);
  await expect(page.getByLabel('Collection backup file',{exact:true})).toBeEnabled();await page.getByLabel('Collection backup file',{exact:true}).setInputFiles(file);
  await expect(page.locator('.backupCounts')).toContainText('0 to add');
  await expect(page.getByRole('button',{name:'All entries already in your collection',exact:true})).toBeDisabled();
  await page.getByLabel('Include card photos',{exact:true}).uncheck();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download collection backup',exact:true}).click();
  expect((await download).suggestedFilename()).toMatch(/^shadowfox-collection-backup-/);
  for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});

test('damaged embedded photos and invalid JSON cannot enable restore or write cards',async({page})=>{
  const backend=await fixture(page);await page.goto('/backup');
  const invalid={sport:'Hockey',player:'Damaged photo',quantity:1,frontImage:'data:image/png;base64,AAAA'};
  await expect(page.getByLabel('Collection backup file',{exact:true})).toBeEnabled();await page.getByLabel('Collection backup file',{exact:true}).setInputFiles({name:'damaged.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([invalid]))});
  await expect(page.locator('.workflowNotice[role=alert]')).toContainText('damaged or unreadable');
  await expect(page.getByRole('heading',{name:'Review your backup',exact:true})).toHaveCount(0);expect(backend.rows).toHaveLength(0);
  await expect(page.getByLabel('Collection backup file',{exact:true})).toBeEnabled();await page.getByLabel('Collection backup file',{exact:true}).setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('not json')});
  await expect(page.locator('.workflowNotice[role=alert]')).toContainText('not valid JSON');expect(backend.rows).toHaveLength(0);
});

test('interrupted restore retains saved cards and safely resumes without changing their quantities',async({page})=>{
  const backend=await fixture(page);let fail=true;
  await page.route('**/rest/v1/cards*',async route=>{
    if(route.request().method()==='POST'&&route.request().postDataJSON().player==='Second restored card'&&fail)return route.fulfill({status:503,json:{message:'Temporary connection failure'},headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});
    return route.fallback();
  });
  const file={name:'resume.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([
    {id:randomUUID(),sport:'Hockey',player:'First restored card',quantity:2},
    {id:randomUUID(),sport:'Hockey',player:'Second restored card',quantity:3}
  ]))};
  await page.goto('/backup');await expect(page.getByLabel('Collection backup file',{exact:true})).toBeEnabled();await page.getByLabel('Collection backup file',{exact:true}).setInputFiles(file);
  await page.getByRole('button',{name:'Restore 2 missing entries',exact:true}).click();
  await expect(page.locator('.workflowNotice[role=alert]')).toContainText('1 entries were added');
  expect(backend.rows).toHaveLength(1);const savedId=backend.rows[0].id;
  fail=false;await expect(page.getByLabel('Collection backup file',{exact:true})).toBeEnabled();await page.getByLabel('Collection backup file',{exact:true}).setInputFiles(file);
  await page.getByRole('button',{name:'Restore 1 missing entry',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Restore complete');
  expect(backend.rows).toHaveLength(2);expect(backend.rows.find(r=>r.id===savedId)?.quantity).toBe(2);
});


test('combined filters constrain CSV, JSON and printable PDF, with explicit all-collection override',async({page})=>{
  await fixture(page,[row({player:'Nick Suzuki',team:'Montréal Canadiens',brand:'Upper Deck',year:'2021-22',set_name:'MVP',parallel:'Silver',quantity:2}),row({player:'Nick Suzuki',team:'Montréal Canadiens',brand:'Upper Deck',year:'2021-22',set_name:'MVP',parallel:'Gold'}),row({player:'Other Player',team:'Toronto Maple Leafs',brand:'Topps',year:'2026',set_name:'Chrome'})]);
  await page.goto('/collection');await page.getByText('Filters',{exact:true}).click();
  for(const [label,value] of [['Player','Nick Suzuki'],['Team','Montréal Canadiens'],['Brand','Upper Deck'],['Year','2021-22'],['Set','MVP'],['Variation / parallel','Silver']])await page.getByLabel(label,{exact:true}).selectOption(value);
  await page.getByText('Print & export',{exact:true}).click();
  await expect(page.getByLabel('Export scope')).toHaveValue('filtered');
  let pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();let file=await pending;let data=JSON.parse(await readFile((await file.path())!,'utf8'));expect(data).toHaveLength(1);expect(data[0].parallel).toBe('Silver');
  pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export CSV',exact:true}).click();file=await pending;let csv=await readFile((await file.path())!,'utf8');expect(csv).toContain('Silver');expect(csv).not.toContain('Gold');expect(csv).not.toContain('Other Player');
  await page.getByRole('button',{name:'Print / PDF',exact:true}).click();await expect(page.getByLabel('Cards to include')).toHaveValue('filtered');pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download PDF',exact:true}).click();file=await pending;let pdf=(await readFile((await file.path())!)).toString('latin1');expect((pdf.match(/\/FT \/Btn/g)||[])).toHaveLength(1);
  await page.getByLabel('Export scope').selectOption('all');pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();file=await pending;expect(JSON.parse(await readFile((await file.path())!,'utf8'))).toHaveLength(3);
  for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});

test('manual card suggestions cover both sports, keyboard choices and custom corrections',async({page})=>{
  await fixture(page);await page.goto('/manual');
  await page.getByLabel('Player',{exact:true}).fill('Nick');await page.getByRole('option',{name:'Nick Suzuki',exact:true}).click();
  await page.getByLabel('Brand',{exact:true}).fill('Upper Deck');await page.getByLabel('Year',{exact:true}).fill('2026');await page.getByLabel('Set',{exact:true}).fill('Series 2');await page.getByRole('option',{name:/^Series 2/}).click();await expect(page.getByLabel('Year',{exact:true})).toHaveValue('2025-26');await page.getByLabel('Subset',{exact:true}).fill('Young');await page.getByRole('option',{name:'Young Guns Common term · verify on your card',exact:true}).click();await page.getByLabel('Parallel',{exact:true}).fill('High');await page.getByRole('option',{name:/^High Gloss/}).click();await expect(page.getByLabel('Parallel',{exact:true})).toHaveValue('High Gloss');await page.getByLabel('Year',{exact:true}).fill('2026-27');await page.getByLabel('Set',{exact:true}).fill('Tim');await page.getByRole('option',{name:'Tim Hortons',exact:false}).click();await expect(page.getByLabel('Set',{exact:true})).toHaveValue('Tim Hortons');
  await page.getByLabel('Team',{exact:true}).fill('Mont');await page.getByLabel('Team',{exact:true}).press('ArrowDown');await page.getByLabel('Team',{exact:true}).press('Enter');await expect(page.getByLabel('Team',{exact:true})).toHaveValue('Montréal Canadiens');
  await page.getByLabel('Sport',{exact:true}).selectOption('Baseball');await page.getByLabel('Year',{exact:true}).fill('2026');await page.getByLabel('Brand',{exact:true}).fill('Topps');await page.getByLabel('Player',{exact:true}).fill('Vladimir');await page.getByRole('option',{name:'Vladimir Guerrero Jr.',exact:true}).click();await page.getByLabel('Set',{exact:true}).fill('Chr');await page.getByRole('option',{name:'Chrome',exact:false}).click();
  await page.getByLabel('Set',{exact:true}).fill('My unlisted set');await page.getByLabel('Parallel',{exact:true}).fill('Custom variation');await page.getByLabel('Notes',{exact:true}).click();await expect(page.getByLabel('Set',{exact:true})).toHaveValue('My unlisted set');
  await page.setViewportSize({width:320,height:850});await page.getByRole('button',{name:'Show brand suggestions'}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});


test('set checklists persist, exclude variants, print missing cards and update when acquired without changing other cards',async({page})=>{
 page.setDefaultTimeout(10000);const records=[row({player:'Owned one',year:'2025-26',set_name:'Series 1',card_number:'1',quantity:2}),row({player:'Owned two',year:'2025-26',set_name:'Series 1',card_number:'2'}),row({player:'Different parallel',year:'2025-26',set_name:'Series 1',card_number:'3',parallel:'High Gloss'}),row({player:'Outside checklist',year:'2025-26',set_name:'Series 1',card_number:'99'})];const backend=await fixture(page,records);
 await page.goto('/sets');await page.getByText('Advanced: custom checklist',{exact:true}).click();await page.getByRole('button',{name:'Create checklist',exact:true}).click();await page.getByLabel('Use a set from your collection',{exact:true}).selectOption({label:'Hockey · 2025-26 · Upper Deck · Series 1'});await page.getByLabel('Checklist name',{exact:true}).fill('Test base set');await page.getByLabel('Last card number',{exact:true}).fill('3');await page.getByRole('button',{name:'Save checklist',exact:true}).click();await expect(page.getByText('67% complete',{exact:true})).toBeVisible();expect(backend.checklists).toHaveLength(1);await expect(page.getByText('2 of 3 card numbers owned',{exact:true})).toBeVisible();await expect(page.getByText(/1 matching collection entries/)).toBeVisible();
 await page.getByLabel('Show',{exact:true}).selectOption('duplicates');await expect(page.locator('.setChecklistRows li')).toHaveCount(1);await expect(page.locator('.setChecklistRows')).toContainText('#1');await expect(page.locator('.setChecklistRows')).toContainText('Qty 2');await page.getByLabel('Show',{exact:true}).selectOption('missing');await expect(page.locator('.setChecklistRows li')).toHaveCount(1);await expect(page.locator('.setChecklistRows')).toContainText('#3');
 await page.getByRole('button',{name:'Edit checklist',exact:true}).click();await page.getByLabel('Or paste specific card numbers',{exact:true}).fill('1 | Owned one\n2 | Owned two\n3 | Missing Player | Missing Team');await page.getByRole('button',{name:'Save checklist',exact:true}).click();await expect(page.getByRole('button',{name:'Save checklist',exact:true})).not.toBeVisible();await page.reload();await expect(page.getByText('67% complete',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Print / PDF',exact:true}).click();let pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download PDF',exact:true}).click();const pdf=(await readFile((await(await pending).path())!)).toString('latin1');expect((pdf.match(/\/FT \/Btn/g)||[])).toHaveLength(1);const stream=/stream\n([\s\S]*?)\nendstream/.exec(pdf)!;const content=inflateSync(Buffer.from(stream[1],'latin1')).toString('latin1');expect(content.includes('Missing Player')).toBe(true);expect(content.includes('Owned one')).toBe(false);
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.goto('/manual');for(const[label,value]of [['Player','Missing Player'],['Year','2025-26'],['Brand','Upper Deck'],['Set','Series 1'],['Card Number','3']])await page.getByLabel(label,{exact:true}).fill(value);await page.getByRole('button',{name:'Save Card',exact:true}).click();await page.waitForURL('**/collection');await page.goto('/sets');await expect(page.getByText('100% complete',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Print / PDF',exact:true})).toBeDisabled();expect(backend.rows).toHaveLength(5);page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Delete checklist',exact:true}).click();await expect(page.getByRole('heading',{name:'Start tracking a set.',exact:true})).toBeVisible();expect(backend.rows).toHaveLength(5);expect(backend.checklists).toHaveLength(0);
});


test('published checklist loads automatically, checks every collection page, separates parallels and adds a missing card once',async({page})=>{
 page.setDefaultTimeout(15000);const url='https://upperdeck.com/checklist/2025-26-ud-series-1-checklist/';
 const entries=[{number:'1',player:'Mason McTavish',team:'Anaheim Ducks',subset:'',parallel:'',autograph:false,relicPatch:false},{number:'2',player:'Leo Carlsson',team:'Anaheim Ducks',subset:'',parallel:'',autograph:false,relicPatch:false},{number:'201',player:'Artyom Levshunov',team:'Chicago Blackhawks',subset:'Young Guns',parallel:'',rookie:true,autograph:false,relicPatch:false}];
 const records=[row({player:'Mason McTavish',year:'2025-26',set_name:'Series 1',card_number:'1',quantity:2}),...Array.from({length:1100},()=>row()),row({player:'Leo Carlsson',year:'2025-26',set_name:'Series 1',card_number:'2',parallel:'High Gloss'}),row({player:'Artyom Levshunov',year:'2025-26',set_name:'Series 1',card_number:'201'})];
 const backend=await fixture(page,records);await page.route('**/api/catalog/checklist?**',route=>route.fulfill({json:{sport:'Hockey',year:'2025-26',brand:'Upper Deck',set:'Series 1',url,source:'Upper Deck published checklist',checkedAt:new Date().toISOString(),groups:[{id:'base-complete',label:'Complete base set',subset:'',parallel:'',entries},{id:'young-guns',label:'Base Set - Young Guns',subset:'Young Guns',parallel:'',entries:[entries[2]]}].map(g=>({...g,count:g.entries.length,entries:g.id===(new URL(route.request().url()).searchParams.get('section')||'base-complete')?g.entries:[]}))}}));
 await page.goto('/sets');await page.getByLabel('Checklist year').selectOption('2025-26');await page.getByLabel('Set to track').selectOption(url);await expect(page.getByText('67% complete',{exact:true})).toBeVisible();await expect(page.getByRole('checkbox',{name:'Owned card 1',exact:true})).toBeChecked();await expect(page.getByRole('checkbox',{name:'Owned card 201',exact:true})).toBeChecked();await expect(page.getByRole('checkbox',{name:'Mark owned card 2',exact:true})).not.toBeChecked();expect(backend.checklists[0].source_url).toBe(url);
 await page.getByRole('button',{name:'Print / PDF',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download PDF',exact:true}).click();const pdf=(await readFile((await(await pending).path())!)).toString('latin1');expect((pdf.match(/\/FT \/Btn/g)||[])).toHaveLength(1);
 await page.getByRole('button',{name:'Add owned card 2',exact:true}).click();await expect(page.getByText('100% complete',{exact:true})).toBeVisible();await expect(page.getByRole('checkbox',{name:'Owned card 2',exact:true})).toBeChecked();await expect(page.getByRole('checkbox',{name:'Owned card 2',exact:true})).toBeDisabled();expect(backend.rows).toHaveLength(records.length+1);expect(backend.rows.filter(r=>r.card_number==='2'&&r.parallel==='')).toHaveLength(1);
 await page.getByLabel('Checklist section').selectOption('young-guns');await expect(page.getByRole('checkbox',{name:'Owned card 201',exact:true})).toBeChecked();await expect.poll(()=>backend.checklists.length).toBe(2);await expect(page.getByText('Published checklist loaded. Owned cards are matched across your entire collection.',{exact:true})).toBeVisible();await page.reload();await expect(page.getByText('100% complete',{exact:true})).toBeVisible();
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});

test('published MLB checklist adds a card with sourced fields, and an unavailable checklist never creates invented entries',async({page})=>{
 page.setDefaultTimeout(15000);const backend=await fixture(page);await page.route('**/api/catalog/checklist?**',route=>route.fulfill({json:{sport:'Baseball',year:'2026',brand:'Topps',set:'Base',url:'https://baseballcardpedia.com/index.php/2026_Topps',source:'BaseballCardPedia published checklist',checkedAt:new Date().toISOString(),groups:[{id:'base-complete',label:'Complete base set',subset:'',parallel:'',entries:[{number:'1',player:'Aaron Judge',team:'',subset:'',parallel:''},{number:'2',player:'Daulton Varsho',team:'',subset:'',parallel:''}]}]}}));
 await page.goto('/sets');await page.getByLabel('Checklist sport').selectOption('Baseball');await page.getByLabel('Set to track').selectOption('https://baseballcardpedia.com/index.php/2026_Topps');await expect(page.getByText('0% complete',{exact:true})).toBeVisible();await page.getByRole('checkbox',{name:'Mark owned card 1',exact:true}).click();await expect(page.getByText('50% complete',{exact:true})).toBeVisible();expect(backend.rows[0]).toMatchObject({player:'Aaron Judge',sport:'Baseball',year:'2026',brand:'Topps',set_name:'Base',card_number:'1',quantity:1});
 await page.route('**/api/catalog/checklist?**',route=>route.fulfill({status:502,json:{error:'Published checklist unavailable.'}}));await page.getByLabel('Set to track').selectOption('https://example.test/checklist');await expect(page.getByText('Published checklist unavailable.',{exact:true})).toBeVisible();expect(backend.checklists).toHaveLength(1);expect(backend.rows).toHaveLength(1);
});

test('refresh checklist recognizes a card added elsewhere without making another copy',async({page})=>{
 const backend=await fixture(page,[row({year:'2025-26',set_name:'Series 1',card_number:'1'})]);
 backend.checklists.push({id:crypto.randomUUID(),user_id:userId,title:'Refresh verification',sport:'Hockey',year:'2025-26',brand:'Upper Deck',set_name:'Series 1',subset:'',parallel:'',entries:[{number:'1',player:'Owned one',team:''},{number:'2',player:'Added elsewhere',team:''}],source_url:null,source_name:null,source_checked_at:null});
 await page.goto('/sets');await expect(page.getByRole('button',{name:'Add owned card 2',exact:true})).toBeVisible();
 backend.rows.push(row({year:'2025-26',set_name:'Series 1',card_number:'2'}));
 await page.getByRole('button',{name:'Refresh collection',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Owned card 2',exact:true})).toBeChecked();await expect(page.getByText('100% complete',{exact:true})).toBeVisible();expect(backend.rows).toHaveLength(2);await expect(page.getByRole('button',{name:'Add owned card 2',exact:true})).toHaveCount(0);
});


test('complete backup restores linked binders, wanted cards, checklists and finance once while preserving owned quantities',async({page})=>{
 const existing=row({player:'Nick Suzuki',year:'2021-22',brand:'Upper Deck',set_name:'MVP',card_number:'87',quantity:9});const backend=await fixture(page,[existing]);
 const source=randomUUID(),variant=randomUUID(),binder=randomUUID();
 const card={id:source,sport:'Hockey',player:'Nick Suzuki',year:'2021-22',brand:'Upper Deck',set:'MVP',subset:'',cardNumber:'87',team:'',rookie:false,autograph:false,relicPatch:false,serialNumber:'',parallel:'',gradingCompany:'',grade:'',quantity:2,estimatedValueCad:3,notes:'',frontImage:'',backImage:''};
 const backup={format:'shadowfox-collection-backup',version:2,cards:[card,{...card,id:variant,parallel:'Silver Script'}],sections:{binders:[{id:binder,name:'Restored binder'}],memberships:[{binder_id:binder,card_id:source},{binder_id:binder,card_id:variant}],checklists:[{id:randomUUID(),title:'MVP base',sport:'Hockey',year:'2021-22',brand:'Upper Deck',set_name:'MVP',subset:'',parallel:'',entries:[{number:'87',player:'Nick Suzuki',team:''}]}],wants:[{id:randomUUID(),card_data:{sport:'Hockey',player:'Connor McDavid',quantity:1,notes:'wanted'}}],transactions:[{id:randomUUID(),card_id:source,card_label:'Nick Suzuki',kind:'purchase',occurred_on:'2026-10-01',quantity:2,amount_cents:600,fees_cents:0,cost_cents:null,notes:'receipt'}]}};
 await page.goto('/backup');await expect(page.getByLabel('Collection backup file')).toBeEnabled();await page.getByLabel('Collection backup file').setInputFiles({name:'complete.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await expect(page.getByRole('button',{name:'Restore complete backup'})).toBeEnabled();await page.getByRole('button',{name:'Restore complete backup'}).click();await expect(page.getByRole('status')).toContainText('Restore complete.');
 expect(backend.rows).toHaveLength(2);expect(backend.rows.find(c=>c.id===existing.id)!.quantity).toBe(9);expect(backend.binders).toHaveLength(1);expect(backend.memberships).toHaveLength(2);expect(backend.memberships.some(m=>m.card_id===existing.id)).toBeTruthy();expect(backend.wants).toHaveLength(1);expect(backend.checklists).toHaveLength(1);expect(backend.transactions[0].card_id).toBe(existing.id);
 await page.getByRole('button',{name:'Restore complete backup'}).click();await expect(page.getByRole('status')).toContainText('0 collection records added');expect(backend.rows).toHaveLength(2);expect(backend.transactions).toHaveLength(1);expect(backend.wants).toHaveLength(1);
 await page.getByLabel('Include card photos').uncheck();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download collection backup'}).click();const download=await pending;const exported=JSON.parse(await readFile((await download.path())!,'utf8'));expect(exported.version).toBe(2);expect(exported.sections.memberships).toHaveLength(2);expect(exported.sections.checklists).toHaveLength(1);expect(exported.sections.transactions).toHaveLength(1);
});


test('saved pricing retains supporting sales and clears them after a manual value edit', async ({page}) => {
 const card=row({player:'Pricing Review',estimated_value_cad:20}); const backend=await fixture(page,[card]);
 await page.goto(`/card/${card.id}`);
 await page.getByRole('button',{name:'Edit card',exact:true}).click();
 await page.getByText('Estimate from sold prices',{exact:true}).click();
 await page.getByText('Or enter confirmed CAD prices',{exact:true}).click();
 await page.getByLabel('Sold prices in CAD').fill('30\n40');
 await page.getByRole('button',{name:'Apply Estimate',exact:true}).click();
 await page.getByRole('button',{name:'Save Changes',exact:true}).click();
 await expect(page.locator('.priceEvidence')).toContainText('2');
 expect(backend.rows[0].price_evidence.sales).toHaveLength(2);
 expect(backend.rows[0].price_evidence.estimateCad).toBe(35);
 await page.reload();
 await expect(page.locator('.priceEvidence')).toContainText('User-reviewed sold prices');
 await page.getByRole('button',{name:'Edit card',exact:true}).click();
 await page.getByLabel('Estimated Value CAD').fill('38');
 await page.getByRole('button',{name:'Save Changes',exact:true}).click();
 expect(backend.rows[0].price_evidence.method).toBe('manual');
 expect(backend.rows[0].price_evidence.sales).toHaveLength(0);
});
