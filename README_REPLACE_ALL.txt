Replace your GitHub repo contents with this full package.

Included:
- branded ShadowFox homepage with working auth section
- working core routes and buttons
- working admin dashboard adapted to your real schema
- cleaned repo structure

After upload:
1. Make sure Vercel has NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY
2. If needed, run supabase/schema.sql in Supabase SQL editor
3. If role column is missing, run supabase/migrations/20260320_add_profiles_role_and_admin_tools.sql
4. Redeploy
