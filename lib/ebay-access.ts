// Server-side only: credentials and access tokens must never be returned to clients.
export type EbayAccessCheck = { ok: boolean; status: number; code?: string };
function failure(status: number, value: any): EbayAccessCheck {
  const code = value?.error || value?.errors?.[0]?.errorId;
  return { ok: false, status, ...(typeof code === 'number' || (typeof code === 'string' && /^[a-z_]{1,50}$/.test(code)) ? { code: String(code) } : {}) };
}
export async function checkEbayAccess(clientId: string, clientSecret: string, request: typeof fetch = fetch) {
  async function token(scope: string) {
    const response = await request('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', scope }), signal: AbortSignal.timeout(12000)
    });
    const body = await response.json();
    return { check: response.ok && typeof body.access_token === 'string' ? { ok: true, status: response.status } : failure(response.status, body), accessToken: response.ok ? body.access_token as string : undefined };
  }
  const base = await token('https://api.ebay.com/oauth/api_scope');
  if (!base.check.ok || !base.accessToken) return { oauth: base.check, browse: null, sold: null };
  const active = await request('https://api.ebay.com/buy/browse/v1/item_summary/search?q=upper%20deck%20hockey%20card&limit=1', {
    headers: { Authorization: `Bearer ${base.accessToken}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_CA' }, signal: AbortSignal.timeout(12000)
  });
  const browse = active.ok ? { ok: true, status: active.status } : failure(active.status, await active.json());
  const insights = await token('https://api.ebay.com/oauth/api_scope/buy.marketplace.insights');
  if (!insights.check.ok || !insights.accessToken) return { oauth: base.check, browse, sold: insights.check };
  const completed = await request('https://api.ebay.com/buy/marketplace_insights/v1_beta/item_sales/search?q=upper%20deck%20hockey%20card&limit=1', {
    headers: { Authorization: `Bearer ${insights.accessToken}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' }, signal: AbortSignal.timeout(12000)
  });
  return { oauth: base.check, browse, sold: completed.ok ? { ok: true, status: completed.status } : failure(completed.status, await completed.json()) };
}
