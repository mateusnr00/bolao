-- ===== supabase/migrations/0001_enums.sql =====
-- 0001 — tipos enumerados
create type match_status as enum ('scheduled', 'live', 'finished', 'postponed', 'cancelled');
create type match_stage  as enum ('group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final');

-- ===== supabase/migrations/0002_tables.sql =====
-- 0002 — tabelas

-- profiles (estende auth.users)
create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  username     text unique not null,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- seleções
create table teams (
  id          uuid primary key default gen_random_uuid(),
  external_id text unique,                -- id vindo da api
  name        text not null,              -- "Brasil"
  code        text not null unique,       -- "BRA"
  flag_url    text,
  group_name  text,                       -- "A", "B"...
  created_at  timestamptz not null default now()
);

-- jogos
create table matches (
  id           uuid primary key default gen_random_uuid(),
  external_id  text unique not null,
  home_team_id uuid not null references teams(id),
  away_team_id uuid not null references teams(id),
  kickoff_at   timestamptz not null,
  stage        match_stage not null,
  group_name   text,
  venue        text,
  home_score   integer,
  away_score   integer,
  status       match_status not null default 'scheduled',
  finished_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_matches_kickoff on matches(kickoff_at);
create index idx_matches_status  on matches(status);

-- bolões (pools)
create table pools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  owner_id    uuid not null references profiles(id),
  invite_code text unique not null default lower(substring(md5(random()::text), 1, 8)),
  created_at  timestamptz not null default now()
);

-- membros do bolão
create table pool_members (
  pool_id   uuid not null references pools(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (pool_id, user_id)
);
create index idx_pool_members_user on pool_members(user_id);

-- regras de pontuação por bolão
create table scoring_rules (
  pool_id                  uuid primary key references pools(id) on delete cascade,
  exact_score_points       integer not null default 10,
  winner_with_diff_points  integer not null default 7,
  winner_only_points       integer not null default 5,
  draw_wrong_score_points  integer not null default 3,
  group_multiplier         numeric(3,2) not null default 1.0,
  knockout_multiplier      numeric(3,2) not null default 1.5,
  quarter_multiplier       numeric(3,2) not null default 2.0,
  semi_multiplier          numeric(3,2) not null default 2.5,
  final_multiplier         numeric(3,2) not null default 3.0
);

-- palpites
create table predictions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  match_id   uuid not null references matches(id) on delete cascade,
  pool_id    uuid not null references pools(id) on delete cascade,
  home_score integer not null check (home_score >= 0 and home_score <= 30),
  away_score integer not null check (away_score >= 0 and away_score <= 30),
  points     integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id, pool_id)
);
create index idx_predictions_pool_user on predictions(pool_id, user_id);
create index idx_predictions_match     on predictions(match_id);

-- ===== supabase/migrations/0003_functions.sql =====
-- 0003 — functions e triggers

-- cálculo de pontos (espelhado em src/lib/scoring.ts)
create or replace function calculate_prediction_points(
  pred_home int, pred_away int,
  actual_home int, actual_away int,
  match_stage_val match_stage,
  rules scoring_rules
) returns integer as $$
declare
  base_points  int := 0;
  multiplier   numeric := 1.0;
  pred_winner  int;
  actual_winner int;
begin
  pred_winner   := sign(pred_home - pred_away);
  actual_winner := sign(actual_home - actual_away);

  if pred_home = actual_home and pred_away = actual_away then
    base_points := rules.exact_score_points;
  elsif pred_winner = actual_winner and pred_winner != 0
        and (pred_home - pred_away) = (actual_home - actual_away) then
    base_points := rules.winner_with_diff_points;
  elsif pred_winner = actual_winner and pred_winner != 0 then
    base_points := rules.winner_only_points;
  elsif pred_winner = 0 and actual_winner = 0 then
    base_points := rules.draw_wrong_score_points;
  else
    base_points := 0;
  end if;

  multiplier := case match_stage_val
    when 'group'         then rules.group_multiplier
    when 'round_of_32'   then rules.knockout_multiplier
    when 'round_of_16'   then rules.knockout_multiplier
    when 'quarter_final' then rules.quarter_multiplier
    when 'semi_final'    then rules.semi_multiplier
    when 'third_place'   then rules.quarter_multiplier
    when 'final'         then rules.final_multiplier
    else 1.0
  end;

  return floor(base_points * multiplier)::int;
end;
$$ language plpgsql immutable;

-- recalcula palpites quando o jogo termina (fonte da verdade dos pontos)
create or replace function recalc_predictions_for_match() returns trigger as $$
declare
  pred  record;
  rules scoring_rules%rowtype;
begin
  if new.status = 'finished'
     and new.home_score is not null
     and new.away_score is not null
     and (old.status is distinct from new.status
          or old.home_score is distinct from new.home_score
          or old.away_score is distinct from new.away_score) then
    for pred in select * from predictions where match_id = new.id loop
      select * into rules from scoring_rules where pool_id = pred.pool_id;
      update predictions
         set points = calculate_prediction_points(
               pred.home_score, pred.away_score,
               new.home_score, new.away_score,
               new.stage, rules),
             updated_at = now()
       where id = pred.id;
    end loop;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_recalc_predictions
after update on matches
for each row execute function recalc_predictions_for_match();

-- cria profile ao cadastrar usuário.
-- search_path = '' (com nomes schema-qualified) é obrigatório: a função roda
-- no contexto do GoTrue, cujo search_path não inclui 'public' — sem isso o
-- insert falha com "relation profiles does not exist" → "Database error saving new user".
create or replace function handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username',
             'user_' || substring(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- defaults ao criar pool: scoring_rules + adiciona owner como membro.
-- security definer pra contornar a RLS (scoring_rules não tem policy de INSERT;
-- esses defaults são gerenciados pelo sistema, não pelo usuário).
create or replace function create_default_scoring_rules() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.scoring_rules (pool_id) values (new.id);
  insert into public.pool_members (pool_id, user_id) values (new.id, new.owner_id);
  return new;
end;
$$;

create trigger trg_pool_defaults
after insert on pools
for each row execute function create_default_scoring_rules();

-- helper p/ RLS: checa membership SEM acionar a policy de pool_members.
-- Por que: a policy de SELECT de pool_members precisa consultar a própria
-- pool_members, o que causaria "infinite recursion detected in policy".
-- security definer roda como owner e ignora RLS na subconsulta, quebrando o ciclo.
create or replace function public.is_pool_member(p_pool_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.pool_members
    where pool_id = p_pool_id and user_id = auth.uid()
  );
$$;

-- ===== supabase/migrations/0004_views.sql =====
-- 0004 — view de ranking

create or replace view pool_rankings as
select
  pm.pool_id,
  pm.user_id,
  p.display_name,
  p.username,
  p.avatar_url,
  coalesce(sum(pr.points), 0)::int as total_points,
  count(pr.id)::int                as predictions_made,
  count(pr.id) filter (
    where pr.points >= (select exact_score_points from scoring_rules where pool_id = pm.pool_id)
  )::int                           as exact_scores
from pool_members pm
join profiles p on p.id = pm.user_id
left join predictions pr on pr.user_id = pm.user_id and pr.pool_id = pm.pool_id
left join matches m       on m.id = pr.match_id and m.status = 'finished'
group by pm.pool_id, pm.user_id, p.display_name, p.username, p.avatar_url;

-- Por que security_invoker: por padrão views em Postgres ignoram a RLS das
-- tabelas-base (rodam como o criador), o que vazaria o ranking de TODOS os
-- bolões pra qualquer um. Com invoker on, a RLS de pool_members/predictions
-- se aplica e cada usuário só vê os bolões de que participa.
alter view pool_rankings set (security_invoker = on);

-- ===== supabase/migrations/0005_rls.sql =====
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

-- ===== supabase/migrations/0006_fix_security_definer_search_path.sql =====
-- 0006 — corrige search_path/RLS das functions de trigger.
-- handle_new_user falhava com "Database error saving new user" porque rodava
-- com search_path sem 'public'. create_default_scoring_rules falharia ao criar
-- pool por causa da RLS em scoring_rules. Ambas agora são security definer com
-- search_path = '' e nomes schema-qualified.

create or replace function handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username',
             'user_' || substring(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.email)
  );
  return new;
end;
$$;

create or replace function create_default_scoring_rules() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.scoring_rules (pool_id) values (new.id);
  insert into public.pool_members (pool_id, user_id) values (new.id, new.owner_id);
  return new;
end;
$$;


-- ===== supabase/migrations/0007_scoring_v2.sql =====
-- 0007 — pontuação v2 (6 níveis, só o maior vale por jogo)
--
-- níveis (pontos fixos, sem multiplicador de fase):
--   placar exato ......................... 25
--   vencedor + placar do vencedor ........ 18  (novo)
--   vencedor + diferença de gols ......... 15
--   empate (placar errado) ............... 15
--   vencedor + placar do perdedor ........ 12  (novo)
--   só o vencedor ........................ 10

-- 1) novas colunas
alter table scoring_rules
  add column if not exists winner_with_winner_goals_points integer not null default 18,
  add column if not exists winner_with_loser_goals_points  integer not null default 12;

-- 2) novos defaults dos níveis existentes
alter table scoring_rules alter column exact_score_points      set default 25;
alter table scoring_rules alter column winner_with_diff_points set default 15;
alter table scoring_rules alter column winner_only_points      set default 10;
alter table scoring_rules alter column draw_wrong_score_points set default 15;

-- 3) sem bônus de fase: multiplicadores = 1.0
alter table scoring_rules alter column group_multiplier    set default 1.0;
alter table scoring_rules alter column knockout_multiplier set default 1.0;
alter table scoring_rules alter column quarter_multiplier  set default 1.0;
alter table scoring_rules alter column semi_multiplier     set default 1.0;
alter table scoring_rules alter column final_multiplier    set default 1.0;

-- 4) aplica os novos valores aos bolões já existentes
update scoring_rules set
  exact_score_points              = 25,
  winner_with_winner_goals_points = 18,
  winner_with_diff_points         = 15,
  draw_wrong_score_points         = 15,
  winner_with_loser_goals_points  = 12,
  winner_only_points              = 10,
  group_multiplier    = 1.0,
  knockout_multiplier = 1.0,
  quarter_multiplier  = 1.0,
  semi_multiplier     = 1.0,
  final_multiplier    = 1.0;

-- 5) nova função de cálculo (só um tipo de acerto vale por jogo)
create or replace function calculate_prediction_points(
  pred_home int, pred_away int,
  actual_home int, actual_away int,
  match_stage_val match_stage,
  rules scoring_rules
) returns integer as $$
declare
  base_points   int := 0;
  multiplier    numeric := 1.0;
  pred_winner   int;
  actual_winner int;
begin
  pred_winner   := sign(pred_home - pred_away);
  actual_winner := sign(actual_home - actual_away);

  if pred_home = actual_home and pred_away = actual_away then
    -- placar exato
    base_points := rules.exact_score_points;
  elsif pred_winner = 0 and actual_winner = 0 then
    -- empate, placar errado
    base_points := rules.draw_wrong_score_points;
  elsif pred_winner = actual_winner and pred_winner <> 0 then
    -- acertou o vencedor: refina do mais específico ao mais genérico
    if greatest(pred_home, pred_away) = greatest(actual_home, actual_away) then
      base_points := rules.winner_with_winner_goals_points;   -- placar do vencedor
    elsif (pred_home - pred_away) = (actual_home - actual_away) then
      base_points := rules.winner_with_diff_points;           -- diferença de gols
    elsif least(pred_home, pred_away) = least(actual_home, actual_away) then
      base_points := rules.winner_with_loser_goals_points;    -- placar do perdedor
    else
      base_points := rules.winner_only_points;                -- só o vencedor
    end if;
  else
    base_points := 0;
  end if;

  multiplier := case match_stage_val
    when 'group'         then rules.group_multiplier
    when 'round_of_32'   then rules.knockout_multiplier
    when 'round_of_16'   then rules.knockout_multiplier
    when 'quarter_final' then rules.quarter_multiplier
    when 'semi_final'    then rules.semi_multiplier
    when 'third_place'   then rules.quarter_multiplier
    when 'final'         then rules.final_multiplier
    else 1.0
  end;

  return floor(base_points * multiplier)::int;
end;
$$ language plpgsql immutable;

-- 6) recalcula os palpites de jogos já encerrados com a nova regra
update predictions p
   set points = calculate_prediction_points(
         p.home_score, p.away_score,
         m.home_score, m.away_score,
         m.stage, r),
       updated_at = now()
  from matches m, scoring_rules r
 where p.match_id = m.id
   and r.pool_id  = p.pool_id
   and m.status   = 'finished'
   and m.home_score is not null
   and m.away_score is not null;
