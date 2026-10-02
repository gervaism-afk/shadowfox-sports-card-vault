# ShadowFox Sports Card Vault

Next.js 15 application for Hockey and Baseball card collections, backed by Supabase Auth, Postgres, and Storage. Use Node.js 22 or newer.

## Run locally

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local` and supply the Supabase project URL, public anon key, and server-only service-role key. Never put the service-role key in a `NEXT_PUBLIC_` variable or commit `.env.local`.
3. For a new Supabase project, run `supabase/schema.sql` in the project's SQL Editor. This includes the content table and hardened permissions.
4. For an existing installation of the supplied schema, apply `supabase/migrations/20261002012728_harden_profiles.sql`, then `supabase/migrations/20261002014343_improve_card_storage.sql`. Ensure the previous content-table migration has been applied. Review existing signup triggers before applying this migration to a database with custom signup logic.
5. Run `npm run dev` and open `http://localhost:3000`.

The homepage renders without credentials; authentication and collection operations require a configured Supabase project. Sign in with **email and password**. Usernames remain profile display names. Signup creates a profile through a server-side database trigger; client metadata cannot grant admin access.

To designate the first administrator, update that user's `profiles.role` to `admin` through the trusted SQL Editor. Review existing admin profiles when applying the security fix; the migration deliberately preserves existing roles. Keep user creation and role assignment out of public client writes.

For email confirmation and password reset, configure Supabase's Site URL and allowed redirect URLs to include your development and deployed origins, including `/reset-password`.

## Verify

- `npm test`: local PostgreSQL security tests using PGlite and content validation tests.
- `npm run typecheck`: TypeScript validation.
- `npm run build`: production build.
- `npm audit`: dependency vulnerability check.
- `npm run test:browser`: Chromium tests covering real OCR, saving, duplicate quantity, and large-collection exports against an intercepted test backend. Set `CHROME_PATH` to your installed Chromium/Chrome executable (the default is `/usr/bin/chromium`).

PGlite checks SQL permissions and trigger behavior against local fixtures. It does not verify the live Supabase project or its custom configuration.

## Deploy

Deploy this repository to Vercel with Node.js 22+ and the three environment variables from `.env.example`. Use `npm run build` as the build command so local OCR assets are prepared. Apply the migrations listed above to the correct Supabase project before releasing the update. The migration is a prepared source change; it has not been applied to production from this workspace.

## Scanning and pricing

Card text recognition runs locally in the browser with Tesseract.js. The worker, WebAssembly cores, and English model are copied from pinned dependencies by `predev` and `prebuild`. No paid OCR account or external OCR CDN is needed, and photos are uploaded to Supabase only when saving a card. JPEG, PNG, and WebP photos up to 12 MB are accepted and resized for recognition. Readability depends on lighting, card typography, and photo quality; always review the fields.

A new front photo resets the card, including notes, price, and back image. Add the back image after scanning the front. Save checks duplicates using current edited fields. Duplicate additions use an ownership-protected atomic SQL function, which requires the new storage migration.

The **Estimate from sold prices** panel calculates a median from CAD prices you enter, with a sample count and range. eBay links help find comparables. This is not a live sold-listing feed and does not fetch prices automatically. The estimate is saved only when you save the card.

## Images and large collections

Collection loading, exports, duplicate detection, and admin totals page through the full result set instead of relying on Supabase's row cap. Quantity additions happen inside a single SQL UPDATE.

Image replacements and card deletions queue unused image URLs transactionally. The app removes queued files through the Storage API, checks for surviving references, and retries failed cleanup on future collection loads or saves. Admin deletion also processes the owner's queue. Each cleanup pass handles up to 100 jobs; existing historical orphan files are not bulk-deleted. Failed new uploads are cleaned up when safely possible; ambiguous network errors leave files intact if the card save cannot be ruled out.

The existing image bucket remains public. Private-image delivery and a connected provider for live sold-price data are future work. No live database or Vercel deployment has been changed from this workspace. See `REVIEW.md` for the original audit and `FIXES.md` for repair history.

## AI card identification

The scan page first calls the authenticated `/api/identify` endpoint. Set the server-only `OPENAI_API_KEY` in Vercel using the existing key. `OPENAI_VISION_MODEL` is optional and defaults to `gpt-4.1-mini`. Images are sent to OpenAI for identification, with API response storage disabled. Identification fills supported card fields, including set and parallel, and displays evidence and uncertainties. These are suggested identities, not externally verified catalogue matches. All fields remain editable. Add the back photo and click **Identify Again** to use both photos; this replaces detected identity fields and clears the previous valuation. Notes and quantity are preserved. If AI is unavailable, front scans fall back to local OCR and explain that fallback.

Automatic completed-sale retrieval is still pending confirmation of the existing price provider and its credentials. No asking prices or AI-generated numbers are presented as sold prices. The existing manual sold-price calculator remains available. Current SerpApi eBay documentation states Sold and Complete filters are deprecated, so it cannot be assumed to supply completed-sale comparables.

OpenRouter vision is also supported: set server-only `OPENROUTER_API_KEY` and optionally `OPENROUTER_VISION_MODEL` (default `openai/gpt-4.1-mini`). OpenRouter takes precedence when both provider keys are set. Unknown or refused outputs are not applied. Never commit provider keys.

## 130point sold-price workflow

On Scan Cards or a saved card, open **Estimate from sold prices**. Copy the generated card search text (including grading), open 130point, and run the search there. Paste the copied results into the app, choose the currency for amounts with no currency code, then review the extracted amounts. Nothing is selected automatically: include only actual completed sales for the same card, parallel, and condition, excluding asking prices, shipping, fees, and lots.

Select **Calculate Selected Prices** to preview a median and range in CAD. USD amounts use a recent Bank of Canada daily exchange rate, shown with its date; this is not a historical conversion for each sale. If the rate is unavailable, the app does not invent a conversion. Select **Apply Selected Estimate**, edit Estimated Value CAD if needed, then save the card. Changing card identity clears pasted-price review so another card's estimate is not carried over. The existing one-price-per-line CAD calculator remains available.

This is a user-assisted lookup and paste workflow. The app does not scrape 130point or automatically retrieve its sales, and pasted amounts are not independently verified. No new subscriptions or database migrations are required.
