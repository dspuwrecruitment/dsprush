# DSP Rush

Internal recruitment tool for DSP UW rush. Brothers browse candidates and leave
sentiment comments from their phones; the SVP view manages candidates,
submitters, and reviews all comments from a laptop.

Live at [dsprush.com](https://dsprush.com). Admin view at
[dsprush.com/#/admin](https://dsprush.com/#/admin).

## Stack

- React + TypeScript + Vite, Tailwind CSS
- Supabase (Postgres) for candidates, submitters, and comments
- Deployed to GitHub Pages via GitHub Actions on every push to `main`

## Local development

```bash
npm install
cp .env.example .env   # fill in Supabase URL/key and the two passwords
npm run dev
```

## Access

The app and the SVP admin view are each gated by a simple shared password
(not a real login — anyone with the password and a browser can get in). The
passwords are set via `VITE_APP_PASSWORD` and `VITE_ADMIN_PASSWORD`, stored as
GitHub Actions secrets and baked into the build. Since the repo is public,
these are a low-security speed bump only, not real access control — don't
put anything in this app you wouldn't want visible to someone determined to
read the deployed JS bundle.

To change a password:

```bash
gh secret set VITE_APP_PASSWORD --body "newpassword" --repo dspuwrecruitment/dsprush
gh secret set VITE_ADMIN_PASSWORD --body "newpassword" --repo dspuwrecruitment/dsprush
```

Then re-run the deploy workflow (push a commit, or `gh workflow run deploy.yml`).

## Importing candidates

Google Forms responses land in a Google Sheet with email, first/last name,
and an uploaded photo (which appears as a Google Drive link). The form does
**not** currently collect major or grad year/quarter — add those questions to
the form, or fill them in later per-candidate from the SVP Candidates tab.

To import:

1. In the response Google Sheet: File → Download → Comma Separated Values.
2. Open the SVP view → Candidates → Import CSV, paste the file contents.
3. Map each CSV column to the right field (auto-guessed from headers, but
   double check the Photo Link mapping).

Photos are referenced by their Google Drive link directly (not copied into
storage) — the shared Drive folder must be set to "Anyone with the link can
view" or images won't load for other users.

## Database schema

See `supabase/migrations/0001_init.sql`. Applied directly via the Supabase
Management API — there's no linked local Supabase project.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the
Vite app with the secrets above and publishes to GitHub Pages under the
custom domain in `public/CNAME`.
