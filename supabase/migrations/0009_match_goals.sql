-- 0009 — gols dos jogos (autores), pra exibir em jogos encerrados e montar a
-- artilharia. Lançados manualmente (a fonte ao vivo manda nomes incorretos).

create table match_goals (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references matches(id) on delete cascade,
  team_id    uuid not null references teams(id),
  scorer     text not null,
  minute     text,                      -- "42", "45+5", "90" ... flexível
  created_at timestamptz not null default now()
);
create index idx_match_goals_match  on match_goals(match_id);
create index idx_match_goals_scorer on match_goals(scorer);

alter table match_goals enable row level security;

-- leitura pública (artilharia e jogos são públicos)
create policy "match_goals readable" on match_goals for select using (true);

-- só donos de bolão gerenciam (escrita feita por server action; policy reforça)
create policy "pool owners insert goals" on match_goals for insert with check (
  exists (select 1 from pools where owner_id = auth.uid())
);
create policy "pool owners delete goals" on match_goals for delete using (
  exists (select 1 from pools where owner_id = auth.uid())
);

-- artilharia: gols por jogador (+ time), do maior pro menor
create or replace function top_scorers(p_limit int default 10)
returns table (scorer text, team_id uuid, goals bigint)
language sql stable as $$
  select scorer, team_id, count(*) as goals
  from match_goals
  group by scorer, team_id
  order by goals desc, scorer asc
  limit p_limit
$$;
