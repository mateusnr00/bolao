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
