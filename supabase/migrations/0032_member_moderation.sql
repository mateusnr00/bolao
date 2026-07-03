-- 0032 — moderação de membros pelo dono do bolão
--
-- Dá ao dono dois controles por membro, guardados em pool_members (por bolão):
--   • blocked — não consegue mais registrar/editar palpite naquele bolão
--   • hidden  — some das listas de disputa (ranking, palpites da galera, hall
--               da vergonha e a contagem). CONTINUA no contrato e na cobrança.
--
-- Nada é apagado: o membro continua no bolão, com login e histórico. É só uma
-- camada de moderação. As duas flags são independentes.

alter table pool_members
  add column if not exists blocked boolean not null default false,
  add column if not exists hidden  boolean not null default false;

-- ── esconde ocultos do ranking geral ────────────────────────────────────────
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
where not pm.hidden
group by pm.pool_id, pm.user_id, p.display_name, p.username, p.avatar_url;

alter view pool_rankings set (security_invoker = on);

-- ── esconde ocultos dos rankings por fase ───────────────────────────────────
create or replace view pool_stage_rankings as
select
  pm.pool_id,
  pm.user_id,
  p.display_name,
  p.username,
  p.avatar_url,
  s.stage,
  coalesce(sum(pr.points) filter (where m.id is not null), 0)::int as total_points,
  count(pr.id) filter (where m.id is not null)::int as predictions_made,
  count(pr.id) filter (
    where m.id is not null
      and pr.points >= (select exact_score_points from scoring_rules where pool_id = pm.pool_id)
  )::int as exact_scores
from pool_members pm
join profiles p on p.id = pm.user_id
cross join (
  values
    ('round_of_32'::match_stage),
    ('round_of_16'),
    ('quarter_final'),
    ('semi_final'),
    ('third_place'),
    ('final')
) as s(stage)
left join predictions pr on pr.user_id = pm.user_id and pr.pool_id = pm.pool_id
left join matches m on m.id = pr.match_id and m.stage = s.stage
where not pm.hidden
group by pm.pool_id, pm.user_id, p.display_name, p.username, p.avatar_url, s.stage;

alter view pool_stage_rankings set (security_invoker = on);

-- ── esconde ocultos dos "palpites da galera" ────────────────────────────────
-- mesma função do 0008, com um filtro a mais: pula quem o dono ocultou naquele
-- bolão (o membro nem aparece na lista de quem palpitou).
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
      -- oculto naquele bolão não entra na lista
      and not exists (
        select 1 from public.pool_members pmh
        where pmh.pool_id = p.pool_id
          and pmh.user_id = p.user_id
          and pmh.hidden
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

-- ── barra palpite de quem foi bloqueado ─────────────────────────────────────
-- recria as policies de insert/update de predictions adicionando a trava de
-- membro bloqueado (além das regras de apito que já existiam).
drop policy if exists "predictions insert before kickoff" on predictions;
create policy "predictions insert before kickoff" on predictions for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from matches m
    where m.id = match_id and m.kickoff_at > now() and m.status = 'scheduled'
  )
  and public.is_pool_member(predictions.pool_id)
  and not exists (
    select 1 from pool_members pm
    where pm.pool_id = predictions.pool_id and pm.user_id = auth.uid() and pm.blocked
  )
);

drop policy if exists "predictions update before kickoff" on predictions;
create policy "predictions update before kickoff" on predictions for update using (
  auth.uid() = user_id
  and exists (
    select 1 from matches m
    where m.id = match_id and m.kickoff_at > now() and m.status = 'scheduled'
  )
  and not exists (
    select 1 from pool_members pm
    where pm.pool_id = predictions.pool_id and pm.user_id = auth.uid() and pm.blocked
  )
);

-- ── seed: mantém os já escondidos ocultos ───────────────────────────────────
-- (antes ficavam escondidos por uma lista fixa no código; agora é pelo banco)
update pool_members pm
set hidden = true
from profiles p
where p.id = pm.user_id
  and (
    lower(p.username) in ('willdabet', 'gordogranudo')
    or pm.user_id = '89a60311-854c-4762-ade8-c22f7bc48175'
  );
