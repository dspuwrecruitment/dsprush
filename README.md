# DSP Rush

Internal recruitment tool for DSP UW rush. Brothers browse candidates and leave
sentiment comments from their phones; the SVP view manages candidates,
submitters, and reviews all comments from a laptop.

Live at [dsprush.com](https://dsprush.com). The landing page asks for a view: Active, RC (Recruitment
Committee), or SVP. Each view has its own password. `dsprush.com/#/admin` still opens the SVP view directly.

## Stack

- React + TypeScript + Vite, Tailwind CSS
- Supabase (Postgres) for candidates, submitters, and comments
- Deployed to GitHub Pages via GitHub Actions on every push to `main`

## Local development

```bash
npm install
cp .env.example .env   # fill in Supabase URL/key and the three passwords
npm run dev
```

## Access

Each view (Active, RC, SVP) is gated by its own shared password, not a real login. The passwords are set via
`VITE_APP_PASSWORD`, `VITE_RC_PASSWORD`, and `VITE_ADMIN_PASSWORD`, stored as GitHub Actions secrets and baked
into the build. Since the repo is public, these are a low-security speed bump only, not real access control.
The database itself is open to anyone holding the anon key.

To change a password:

```bash
gh secret set VITE_APP_PASSWORD --body "newpassword" --repo dspuwrecruitment/dsprush
gh secret set VITE_RC_PASSWORD --body "newpassword" --repo dspuwrecruitment/dsprush
gh secret set VITE_ADMIN_PASSWORD --body "newpassword" --repo dspuwrecruitment/dsprush
```

Then re-run the deploy workflow (push a commit, or `gh workflow run deploy.yml`).

## Recruitment Committee review

1. SVP view, RC Members tab: add the committee (at least 3 members are required before importing).
2. SVP view, Candidates tab: import the CSV. Each candidate gets an anonymous number and is assigned to 3
   different reviewers, balanced by load. Columns not mapped to a fixed field are marked Summary (shown in the
   RC row), Long answer (one modal screen each), or Ignore. A Video Link column becomes the last modal screen.
3. RC view: reviewers pick their name, score 1 to 5 from the row or inside the full-screen modal, and can
   switch reviewers with the dropdown (a filter, not auth).
4. SVP view, Leaderboard tab: live ranking by average score. "Lock ranking" freezes the order and sets a cut
   line at 60. Move candidates with the three-dot menu or drag and drop. The counter shows how many are above
   the line and turns red past 60.

Removing a candidate deletes their reviews. Removing an RC member deletes only their unscored assignments;
scores they already submitted stay. Neither removal reassigns anything, so check the Leaderboard detail for
missing reviews afterward.

## Importing candidates

Google Forms responses land in a Google Sheet. Export it as CSV (File, Download, Comma Separated Values) and
drag it into the SVP import modal. Map the name (separate first/last or one full-name column), then email,
photo, video, major, grad year, and grad quarter as needed. Blank major or grad fields stay blank.

Photos and videos are referenced by their Google Drive link (not copied into storage). The shared Drive
folder must be set to "Anyone with the link can view" or they won't open for other users.

## Database schema

See `supabase/migrations/`. Applied directly via the Supabase Management API (there is no linked local
Supabase project). `0003_rc_review.sql` adds RC members, review assignments, the ranking state, and the
ranking functions.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the
Vite app with the secrets above and publishes to GitHub Pages under the
custom domain in `public/CNAME`.
