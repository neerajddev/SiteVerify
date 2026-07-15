# SiteVerify — Supabase setup schedule

Run these steps **in order** in your Supabase project:  
https://supabase.com/dashboard/project/eqcejkkqdegxqqcwlmga

---

## Step 1 — Database tables (users + projects)

**Where:** SQL Editor → New query → Paste → Run

**File:** `prisma/schema.sql`

Creates:
- `profiles` (homeowner / inspector / admin roles)
- `projects` (site data — URLs only, not file bytes)
- Row-level security policies

---

## Step 2 — Fix phone signup (if OTP signup fails)

**Where:** SQL Editor → Run

**File:** `prisma/fix-signup-rls.sql`

Only needed if you see: *"new row violates row-level security policy for table profiles"*

---

## Step 3 — File storage bucket

**Where:** SQL Editor → Run

**File:** `prisma/storage-setup.sql`

Creates:
- Bucket: `site-uploads` (public, 8 MB per file)
- Upload policy for logged-in users
- Read policy for anyone with the file link

**Verify:** Storage → Buckets → you should see `site-uploads`

---

## Step 4 — Enable authentication

| Portal | Setting |
|--------|---------|
| Homeowner + Inspector | Authentication → Providers → **Phone** → ON |
| Admin | Authentication → Providers → **Email** → ON |

### Admin email login (no verification email)

Admins use **email + password** only (see `admin.html`). Turn off confirm-email so they can log in immediately:

1. Authentication → Providers → **Email** → ON  
2. **Confirm email** → **OFF** (admins must not wait for a verify link)  
3. Save

Only admins use email auth in this app; homeowners/inspectors use phone OTP, so this is safe.

**Optional (free testing, no SMS cost):**  
Authentication → Phone → Test phone numbers  
- `+919876543210` → OTP `123456` (homeowner)  
- `+919876543211` → OTP `123456` (inspector)

**Real SMS to any Indian number (testers):** use 2Factor.in — see `prisma/TWOFACTOR_SMS_SETUP.md`.

---

## Step 5 — Create admin account

1. Authentication → Users → **Add user**
2. Email: `admin@siteverify.in`
3. Password: `Demo@12345`
4. **Auto Confirm User** → **ON** (skip email verification for this account)
5. Save

Then run in SQL Editor (`prisma/demo-setup.sql` step 4):

```sql
UPDATE profiles SET role = 'admin', full_name = 'Site Admin'
WHERE email = 'admin@siteverify.in';
```

If login says “Email not confirmed”, either re-enable Auto Confirm when creating the user, or in Users → open the user → confirm them manually (and keep Confirm email OFF for future admins).

---

## Step 6 — App environment variables

In your project `.env` (already set):

```
VITE_SUPABASE_URL=https://eqcejkkqdegxqqcwlmga.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_STORAGE_BUCKET=site-uploads
VITE_DEMO_MODE=true
```

| Variable | Purpose |
|----------|---------|
| `VITE_DEMO_MODE=true` | Localhost "Enter demo" skips OTP |
| Real OTP login | Files upload to **Supabase Storage** |
| Demo bypass on localhost | Files stay in browser (for quick testing) |

For production hosting, set `VITE_DEMO_MODE=false`.

---

## Step 7 — Test file uploads

### A) Cloud storage test (real Supabase login)

1. Deploy or use a non-localhost URL, **or** sign in with real phone OTP (not "Enter demo")
2. Homeowner → Add New Site → upload a PDF drawing
3. Check: Storage → `site-uploads` → `blueprints/` folder should have the file
4. Project in database should store a **URL**, not a huge base64 string

### B) Localhost demo test (no storage)

1. Open `http://localhost:3000/homeowner.html`
2. Click **Enter demo**
3. Upload works in browser memory only (fine for UI testing)

---

## What gets stored where

| Data | Stored in |
|------|-----------|
| User accounts | Supabase Auth + `profiles` table |
| Project status, checklist, progress | `projects` table (`data` JSON column) |
| Drawing files, photos, evidence | **Supabase Storage** bucket `site-uploads` |
| File reference in project | URL string in `projects.data` (small) |

---

## Free tier usage tips

- Supabase free: ~**500 MB database** + ~**1 GB storage**
- Keeping files in Storage (not inside JSON) lets you test much longer
- Cloudinary can be added later for image compression — URLs in DB stay the same pattern

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Storage bucket not found" | Run `prisma/storage-setup.sql` |
| "Please sign in to upload" | Use real OTP login, not demo bypass |
| Upload works locally but not online | Set `VITE_DEMO_MODE=false` on hosting |
| RLS error on signup | Run `prisma/fix-signup-rls.sql` |
| Admin can't see projects | Run admin `UPDATE profiles` SQL from Step 5 |

---

## SQL files summary

| File | When to run |
|------|-------------|
| `schema.sql` | Once — first setup |
| `fix-signup-rls.sql` | If signup fails |
| `storage-setup.sql` | Once — before file uploads to cloud |
| `demo-setup.sql` | Optional — demo admin + reference notes |
