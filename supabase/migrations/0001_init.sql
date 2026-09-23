create extension if not exists pgcrypto;

create table candidates (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  major text,
  grad_year int,
  grad_quarter text check (grad_quarter in ('Fall','Winter','Spring','Summer')),
  photo_url text,
  created_at timestamptz not null default now()
);

create table submitters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  submitter_id uuid not null references submitters(id) on delete restrict,
  sentiment text not null check (sentiment in ('very_negative','slightly_negative','neutral','slightly_positive','very_positive')),
  comment_text text not null default '',
  created_at timestamptz not null default now()
);

create index comments_candidate_id_idx on comments(candidate_id);
create index comments_submitter_id_idx on comments(submitter_id);
create index candidates_name_idx on candidates (lower(first_name || ' ' || last_name));

alter table candidates enable row level security;
alter table submitters enable row level security;
alter table comments enable row level security;

-- App has its own low-security password gate at the UI layer, not Supabase auth.
-- All clients share the anon key, so policies allow the anon role full read/write.
create policy "anon full access candidates" on candidates for all to anon using (true) with check (true);
create policy "anon full access submitters" on submitters for all to anon using (true) with check (true);
create policy "anon full access comments" on comments for all to anon using (true) with check (true);
