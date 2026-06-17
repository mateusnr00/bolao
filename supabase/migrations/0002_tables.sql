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
