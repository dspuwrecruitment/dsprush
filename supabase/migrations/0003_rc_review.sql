create table rc_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  removed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table candidates
  add column number int unique,
  add column summary jsonb not null default '[]',
  add column answers jsonb not null default '[]',
  add column video_url text,
  add column score_rank int,
  add column rank_order int,
  add column moved_down boolean not null default false;

update candidates c set number = r.n
from (select id, row_number() over (order by created_at, id) as n from candidates) r
where c.id = r.id and c.number is null;

create table review_assignments (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  rc_member_id uuid not null references rc_members(id),
  score smallint check (score between 1 and 5),
  scored_at timestamptz,
  created_at timestamptz not null default now(),
  unique (candidate_id, rc_member_id)
);
create index on review_assignments (rc_member_id);
create index on review_assignments (candidate_id);

create table ranking_state (
  id int primary key default 1 check (id = 1),
  cut_size int not null default 0,
  locked_at timestamptz
);
insert into ranking_state (id) values (1);

alter table rc_members enable row level security;
alter table review_assignments enable row level security;
alter table ranking_state enable row level security;
create policy "anon full access rc_members" on rc_members for all to anon using (true) with check (true);
create policy "anon full access review_assignments" on review_assignments for all to anon using (true) with check (true);
create policy "anon full access ranking_state" on ranking_state for all to anon using (true) with check (true);

create function lock_ranking(p_limit int default 60) returns void language sql as $$
  with avg_scores as (
    select c.id, c.number, avg(ra.score) as avg_score
    from candidates c
    left join review_assignments ra on ra.candidate_id = c.id and ra.score is not null
    group by c.id, c.number
  ), ranked as (
    select id, row_number() over (order by avg_score desc nulls last, number) as r from avg_scores
  ), upd as (
    update candidates c set score_rank = r.r, rank_order = r.r, moved_down = false
    from ranked r where r.id = c.id returning 1
  )
  update ranking_state set cut_size = least(p_limit, (select count(*) from upd)), locked_at = now() where id = 1;
$$;

create function move_candidate(p_candidate uuid, p_new_pos int, p_above boolean) returns void language plpgsql as $$
declare old_pos int; total int; cut int; was_above boolean; new_cut int;
begin
  select rank_order into old_pos from candidates where id = p_candidate;
  if old_pos is null then raise exception 'ranking is not locked'; end if;
  select cut_size into cut from ranking_state where id = 1;
  select count(*) into total from candidates where rank_order is not null;
  p_new_pos := greatest(1, least(p_new_pos, total));
  was_above := old_pos <= cut;
  new_cut := cut + case when was_above and not p_above then -1
                        when not was_above and p_above then 1 else 0 end;
  if (p_above and p_new_pos > new_cut) or (not p_above and p_new_pos <= new_cut) then
    raise exception 'position does not match the chosen side of the line';
  end if;
  if p_new_pos > old_pos then
    update candidates set rank_order = rank_order - 1 where rank_order > old_pos and rank_order <= p_new_pos;
  elsif p_new_pos < old_pos then
    update candidates set rank_order = rank_order + 1 where rank_order >= p_new_pos and rank_order < old_pos;
  end if;
  update candidates set rank_order = p_new_pos,
    moved_down = case when was_above and not p_above then true
                      when p_above then false else moved_down end
  where id = p_candidate;
  update ranking_state set cut_size = new_cut where id = 1;
end $$;

create function close_rank_gap() returns trigger language plpgsql as $$
declare removed_above int;
begin
  select count(*) into removed_above
  from old_rows o, ranking_state s where o.rank_order is not null and o.rank_order <= s.cut_size;
  update ranking_state set cut_size = greatest(cut_size - removed_above, 0) where id = 1;
  update candidates c set rank_order = r.new_pos
  from (select id, row_number() over (order by rank_order) as new_pos
        from candidates where rank_order is not null) r
  where c.id = r.id and c.rank_order is distinct from r.new_pos;
  return null;
end $$;
create trigger candidates_close_rank_gap after delete on candidates
  referencing old table as old_rows for each statement execute function close_rank_gap();
