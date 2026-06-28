-- 0028 — Rankings POR FASE do mata-mata (substitui o mata-mata combinado).
--
-- Uma linha por (bolão, membro, fase), com os pontos só daquela fase. Todo
-- mundo aparece em todas as fases (0 se não pontuou). NÃO altera o ranking
-- geral nem recalcula nada — é só uma leitura paralela de predictions.points.

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
group by pm.pool_id, pm.user_id, p.display_name, p.username, p.avatar_url, s.stage;

alter view pool_stage_rankings set (security_invoker = on);
