# ShadowFox code review

Reviewed 2026-10-02. Scope: uploaded ZIP, not the deployed Vercel app or live Supabase database. Application source was not changed.

## Priority findings

1. **Critical: users can promote themselves to admin if the supplied schema is deployed.** `supabase/schema.sql:15-19` allows users to insert and update their own profile without protecting `role`, which is added later in the same script. A user can set their own role to `admin` through the Data API. `lib/auth/require-admin-api.ts` trusts that role; the resulting admin APIs can read other users' cards and change or delete them. Restrict profile write columns and keep role changes behind trusted admin operations, including on INSERT.

2. **High: the uploaded project cannot build as supplied.** Imports reference absent `lib/defaults.ts` and `lib/content/defaults.ts` throughout the app. `app/api/admin/content` also contains both `page.tsx` and `route.ts`, which compete for the same route. Restore missing modules and remove or relocate the misplaced page. `next-env.d.ts` contains a copy of storage implementation rather than Next.js type references, creating additional TypeScript errors. `README.md` also contains TypeScript types instead of setup instructions.

3. **High: user email addresses are publicly readable under the supplied schema.** `supabase/schema.sql:12` uses an unrestricted SELECT policy on profiles, including email. Username login queries this table from the browser (`components/LoginPanel.tsx:8`). Anyone with the public API key can query the directory if standard Supabase table grants are present. Use email login or a protected username-login flow, and restrict profile reads.

4. **High: scanning and automatic pricing have no backend.** `app/scan/page.tsx:32,47` calls `/api/ocr` and `/api/pricing`; neither route exists. Card detail also calls the missing pricing route. Upload OCR encounters a 404 response and cannot populate fields. Restore the backend integrations and explicitly handle unsuccessful responses.

5. **High: Add Manually displays analytics instead of a card form.** `app/manual/page.tsx` is byte-for-byte identical to `app/analytics/page.tsx`. Both the navigation and scan fallback send users to this unusable manual-entry flow.

6. **High: content editor routes do not match its requests.** `app/admin/content/page.tsx:71,97` requests GET and PATCH `/api/admin/content/<page>`, but only the static `/api/admin/content` route exists. That handler expects a nonexistent dynamic `page` parameter and implements no PATCH. Public collection and analytics content routes are also missing. Restore correctly named dynamic routes with admin authorization for edits.

7. **Medium: signup never creates the required profile in the supplied code.** `components/LoginPanel.tsx:57` creates an auth user and stores username metadata, but does not insert a profile. The schema includes no signup trigger. A clean installation therefore leaves new users without profiles, breaking username login and admin role lookup. An existing live database might have a trigger outside this ZIP; verify before changing it.

8. **Medium: large collections can be silently truncated.** `lib/storage.ts:118,142` and `app/api/admin/users/route.ts` fetch rows without pagination, including rows used for totals and duplicate detection. If collections exceed the configured Supabase API row limit (commonly 1,000), exports, totals, and duplicate detection become incomplete. Paginate lists and calculate totals in the database.

9. **Medium: quantity increments can lose updates.** `lib/storage.ts:148-151` reads quantity then saves a replacement. Simultaneous additions from two devices can overwrite one another. Use an atomic database increment with ownership checks.

10. **Medium: replacing or deleting cards leaves images behind.** `lib/storage.ts:105` uploads timestamped image paths; replacement does not delete prior objects, and `deleteCard` only deletes the database row. Storage grows indefinitely. The bucket is public (`supabase/schema.sql:63-65`), so image URLs remain readable without login, even after card deletion. Decide whether public images fit the vault's privacy promise and implement safe cleanup.

11. **Low: admin diagnostic endpoint has no authorization.** `/api/admin/test` uses the service-role client without an admin check and returns total profile count or internal errors. Remove it or require admin authorization.

## Verification and limits

- Checked local import targets: nine imports reference missing modules.
- Compared manual and analytics pages: identical bytes.
- Inspected API route inventory against frontend requests and traced profile policies into admin authorization.
- Attempted dependency installation; a direct registry connectivity check failed because the configured proxy could not connect. Stopped installation. No build, dependency vulnerability audit, browser run, or live database test was possible.
- No Supabase credentials or environment configuration are included in the ZIP. Live database grants, policies, signup triggers, and storage settings remain unverified.

Recommended order: close role escalation and public email access, restore a buildable source tree, repair manual entry and scan/pricing endpoints, then validate complete user flows against a development database.
