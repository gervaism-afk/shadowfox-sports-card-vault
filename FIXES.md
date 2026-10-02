# First repair pass — 2026-10-02

## Changes

- Prepared profile security migration: revoke client insertion and authorization-field writes, allow reads of only one's own profile, permit username updates only, and remove public email-directory access.
- Added private signup trigger and missing-profile backfill; role metadata is ignored and confirmed email changes are synchronized without overwriting roles.
- Switched login to email and removed public username-to-email lookup and signup availability queries. Password reset now uses the email entered in the reset form.
- Restored missing card/filter defaults and editable-page content defaults.
- Restored Next.js type declarations and fixed the unclosed responsive CSS block.
- Rebuilt manual entry with images, save validation, and duplicate quantity/separate-save options.
- Replaced misplaced content files with dynamic public read and protected admin GET/PATCH APIs; content values and internal links are validated.
- Reused one browser Supabase client and allowed the public app to render without configured credentials.
- Corrected admin username, player, year, and value fields to match the API and database. Admin requests retrieve the current session token rather than retaining an expired token.
- Removed the public service-role diagnostic endpoint.
- Upgraded Next.js 14.2.35 to 15.5.27 and React 18.2.0 to 18.3.1. Applied the asynchronous-params codemod and updated route types. Pinned Supabase and added a lockfile. Overrode transitive PostCSS to 8.5.23 to clear its security advisories.
- Added setup instructions, environment template, ignore rules, and executable tests.

## Verified

Production build, TypeScript checks, local PostgreSQL security checks, and content validation tests pass. `npm audit` reports zero known vulnerabilities. HTTP checks verify public content routes, unknown-page handling, unauthorized admin reads/writes, and removal of the diagnostic endpoint. Browser checks verify homepage rendering without errors, signup-tab switching, a 390-pixel mobile viewport without horizontal overflow, and unauthenticated redirection from manual entry.

## Limits and remaining findings

No live database or deployment changes were made. Production authentication, card saving, and content editing need a check after supplying credentials and applying the migration. Existing administrator assignments must be reviewed separately because the migration preserves them.

OCR/pricing endpoints, pagination, atomic increments, and storage cleanup/private images are not included in this pass. The original review remains as an audit snapshot and does not represent the status of each repaired issue.


# Second repair pass — 2026-10-02

- Replaced the missing OCR API with lazy-loaded browser OCR and locally served worker/model assets. Added image validation, resizing, progress, unmount cancellation, and control locking while reading or saving.
- Rebuilt the scan flow so each new front photo starts a fresh card, detects duplicates from reviewed fields, and uses atomic quantity additions. Included parallel guesses and fixed parser matching for long brand/set/parallel terms, uppercase names, and grading labels.
- Replaced absent automatic-pricing requests with a CAD sold-comparison median estimator on scan and card detail. Estimates use prices supplied by the user and are saved explicitly.
- Implemented complete pagination for collection data and admin lists/aggregates, including projects with a row cap lower than the requested page size. Added pagination parameter checks and stable ordering.
- Added a migration for atomic quantity increments and a durable, owner-isolated image cleanup queue. Replacement and deletion enqueue work in the same transaction; the Storage API removes unused files. Live references and failed requests preserve images and jobs for retry. New uploads use unique paths, and failed-save compensation checks references before removal.
- Corrected card-detail save behavior to retain returned storage URLs, lock saves, and remove duplicate image controls. Added accessible field labels.
- Added OCR/parser, pricing, pagination, cleanup, and database regression tests, plus browser tests using real local OCR and an intercepted Supabase fixture backend. No production authentication bypass or test data was added to app code.

Verification: PostgreSQL security/trigger tests, 14 TypeScript tests, and four browser flows passed. Browser cases cover actual local OCR on generated photos, pricing application and saving, repeated scans, duplicate quantity via RPC, export of 1,105 cards with a simulated 100-row cap, and invalid upload errors. Production build and TypeScript checks pass; dependency audit reports zero known vulnerabilities. These tests do not replace checking the real Supabase deployment after applying both migrations.

# AI identification pass — 2026-10-02

Added an authenticated server-only OpenAI vision endpoint and editable AI identification for front and back photos. Unknown fields are not invented; uncertainties and visible evidence are shown. Re-identification clears stale identity and valuation fields while retaining notes and quantity. Front scans retain local OCR fallback with a visible explanation. Secret keys are never sent to the browser. The endpoint verifies the Supabase user and limits image payloads and upstream timeouts.

Vercel's connector returned UNAUTHORIZED/requires reauthentication. No saved environment variables could be inspected, and no live AI requests were made. Automatic sold-price integration remains incomplete until the existing provider is identified and its API access confirmed. No deployment or live database changes were made.
