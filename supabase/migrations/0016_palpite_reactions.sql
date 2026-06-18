-- 0016 — reações nos palpites (zoeira social, só depois do apito)
--
-- Cada pessoa pode reagir ao palpite dos OUTROS num jogo, com emojis (😂🤡🐟🐐).
-- Uma reação por emoji por palpite (toggle). A trava de "depois do apito" é
-- reforçada na server action; aqui a RLS garante que você só cria/remove a SUA.

create table palpite_reactions (
  id             uuid primary key default gen_random_uuid(),
  match_id       uuid not null references matches(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  reactor_id     uuid not null references auth.users(id) on delete cascade,
  emoji          text not null,
  created_at     timestamptz not null default now(),
  unique (match_id, target_user_id, reactor_id, emoji)
);
create index idx_palpite_reactions_match on palpite_reactions(match_id);

alter table palpite_reactions enable row level security;

-- qualquer usuário logado vê as reações (camada social do app)
create policy "reactions readable" on palpite_reactions
  for select using (auth.uid() is not null);

-- só cria reação própria, e não no próprio palpite
create policy "reactions insert own" on palpite_reactions
  for insert with check (reactor_id = auth.uid() and reactor_id <> target_user_id);

-- só remove as próprias (toggle off)
create policy "reactions delete own" on palpite_reactions
  for delete using (reactor_id = auth.uid());
