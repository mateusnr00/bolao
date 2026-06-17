-- 0005 — Row Level Security

alter table profiles       enable row level security;
alter table teams          enable row level security;
alter table matches        enable row level security;
alter table pools          enable row level security;
alter table pool_members   enable row level security;
alter table scoring_rules  enable row level security;
alter table predictions    enable row level security;

-- teams e matches: público pra leitura
create policy "teams readable" on teams for select using (true);
create policy "matches readable" on matches for select using (true);

-- profiles
create policy "profiles readable" on profiles for select using (true);
create policy "users update own profile" on profiles for update using (auth.uid() = id);

-- pools
create policy "pools visible to members" on pools for select using (
  owner_id = auth.uid()
  or public.is_pool_member(id)
);
create policy "authed create pool" on pools for insert with check (auth.uid() = owner_id);
create policy "owner updates pool" on pools for update using (auth.uid() = owner_id);

-- pool_members (usa is_pool_member p/ evitar recursão na própria policy)
create policy "pool members readable to pool members" on pool_members for select using (
  public.is_pool_member(pool_id)
);
create policy "users join pools" on pool_members for insert with check (auth.uid() = user_id);
create policy "users leave pools" on pool_members for delete using (auth.uid() = user_id);

-- scoring_rules
create policy "scoring rules visible to members" on scoring_rules for select using (
  public.is_pool_member(pool_id)
);
create policy "owner updates scoring rules" on scoring_rules for update using (
  pool_id in (select id from pools where owner_id = auth.uid())
);

-- predictions: o pulo do gato — só vê palpite alheio depois do kickoff
create policy "predictions read" on predictions for select using (
  public.is_pool_member(pool_id)
  and (
    user_id = auth.uid()
    or exists (select 1 from matches m where m.id = predictions.match_id and m.kickoff_at <= now())
  )
);
create policy "predictions insert before kickoff" on predictions for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from matches m
    where m.id = match_id and m.kickoff_at > now() and m.status = 'scheduled'
  )
  and public.is_pool_member(predictions.pool_id)
);
create policy "predictions update before kickoff" on predictions for update using (
  auth.uid() = user_id
  and exists (
    select 1 from matches m
    where m.id = match_id and m.kickoff_at > now() and m.status = 'scheduled'
  )
);
