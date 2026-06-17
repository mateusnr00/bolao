-- 0010 — notificações in-app (sininho)
--
-- Primeiro tipo: "pior palpite da partida". Quando um jogo encerra, quem fez a
-- MENOR pontuação do bolão naquele jogo recebe uma notificação (só essa pessoa).
-- Em empate no pior, todos os empatados recebem. Exige pelo menos 2 palpiteiros
-- e que exista um pior de fato (nem todo mundo empatado na mesma pontuação).

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  match_id   uuid references matches(id) on delete cascade,
  pool_id    uuid references pools(id) on delete cascade,
  read_at    timestamptz,
  created_at timestamptz not null default now(),
  -- no máximo uma notificação por pessoa/jogo/tipo
  unique (user_id, match_id, type)
);
create index idx_notifications_user on notifications(user_id, created_at desc);

alter table notifications enable row level security;

-- cada um só vê e marca como lida as próprias notificações
create policy "own notifications read" on notifications
  for select using (user_id = auth.uid());
create policy "own notifications update" on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- gera as notificações de "pior da partida" quando o jogo encerra.
-- security definer: a inserção é feita pelo sistema (ignora a RLS de insert).
create or replace function notify_worst_on_finish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  home_code text;
  away_code text;
begin
  if new.status = 'finished'
     and new.home_score is not null
     and new.away_score is not null then

    select th.code, ta.code into home_code, away_code
      from teams th, teams ta
     where th.id = new.home_team_id
       and ta.id = new.away_team_id;

    insert into notifications (user_id, type, title, body, match_id, pool_id)
    select p.user_id,
           'worst_match',
           'Você foi o pior palpite da partida 🫏',
           format(
             '%s %s×%s %s — sua pontuação foi a menor do bolão neste jogo.',
             home_code, new.home_score, new.away_score, away_code
           ),
           new.id,
           p.pool_id
      from predictions p
      join (
        select pool_id, min(points) as min_pts
          from predictions
         where match_id = new.id
         group by pool_id
        having count(*) >= 2
           and min(points) < max(points)   -- precisa existir um pior de fato
      ) worst on worst.pool_id = p.pool_id
     where p.match_id = new.id
       and p.points = worst.min_pts
    on conflict (user_id, match_id, type) do nothing;
  end if;

  return new;
end;
$$;

-- nome com sufixo pra rodar DEPOIS de trg_recalc_predictions (ordem alfabética),
-- garantindo que predictions.points já está recalculado quando lemos aqui.
create trigger trg_recalc_predictions_then_notify
after update on matches
for each row execute function notify_worst_on_finish();
