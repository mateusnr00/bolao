-- 0008 — "palpites da galera": função que lista os palpites de um jogo
--
-- regra de cola: o placar dos outros só aparece DEPOIS do apito
-- (matches.kickoff_at <= now()). antes disso a função ainda revela QUEM já
-- palpitou (nome), mas com placar/pontos em null. o seu próprio palpite é
-- sempre visível.
--
-- security definer pra poder listar "quem palpitou" antes do apito sem abrir
-- mão da RLS de leitura (que continua bloqueando SELECT direto na tabela).
-- o escopo é restrito aos bolões em que o usuário logado é membro.

create or replace function public.match_predictions(p_match_id uuid)
returns table (
  user_id      uuid,
  display_name text,
  username     text,
  avatar_url   text,
  home_score   int,
  away_score   int,
  points       int,
  has_started  boolean,
  is_me        boolean
)
language sql
security definer
set search_path = ''
as $$
  with started as (
    select coalesce(bool_or(m.kickoff_at <= now()), false) as v
    from public.matches m
    where m.id = p_match_id
  ),
  -- uma linha por pessoa (o mesmo palpite é replicado em vários bolões)
  dedup as (
    select distinct on (p.user_id)
      p.user_id,
      pr.display_name,
      pr.username,
      pr.avatar_url,
      p.home_score,
      p.away_score,
      p.points
    from public.predictions p
    join public.profiles pr on pr.id = p.user_id
    where p.match_id = p_match_id
      and p.pool_id in (
        select pm.pool_id
        from public.pool_members pm
        where pm.user_id = auth.uid()
      )
    order by p.user_id, p.points desc
  )
  select
    d.user_id,
    d.display_name,
    d.username,
    d.avatar_url,
    case when s.v or d.user_id = auth.uid() then d.home_score end as home_score,
    case when s.v or d.user_id = auth.uid() then d.away_score end as away_score,
    case when s.v or d.user_id = auth.uid() then d.points     end as points,
    s.v as has_started,
    (d.user_id = auth.uid()) as is_me
  from dedup d
  cross join started s
  order by
    case when s.v then d.points end desc nulls last,
    (d.user_id = auth.uid()) desc,
    coalesce(d.display_name, d.username);
$$;

grant execute on function public.match_predictions(uuid) to authenticated;
