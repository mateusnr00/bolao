-- 0027 — Ranking paralelo do MATA-MATA (16-avos → final).
--
-- Competição paralela e independente, começando nos 16 avos. NÃO altera nada
-- do ranking geral: é só uma view que soma os pontos (a MESMA pontuação já
-- gravada em predictions.points) apenas dos jogos de mata-mata. Todo mundo
-- começa em 0; conforme os jogos do mata-mata terminam, os pontos entram aqui
-- além de continuarem no ranking geral.

create or replace view pool_knockout_rankings as
select
  pm.pool_id,
  pm.user_id,
  p.display_name,
  p.username,
  p.avatar_url,
  coalesce(
    sum(pr.points) filter (
      where m.stage in (
        'round_of_32','round_of_16','quarter_final','semi_final','third_place','final'
      )
    ), 0
  )::int as total_points,
  count(pr.id) filter (
    where m.stage in (
      'round_of_32','round_of_16','quarter_final','semi_final','third_place','final'
    )
  )::int as predictions_made,
  count(pr.id) filter (
    where m.stage in (
      'round_of_32','round_of_16','quarter_final','semi_final','third_place','final'
    )
    and pr.points >= (select exact_score_points from scoring_rules where pool_id = pm.pool_id)
  )::int as exact_scores
from pool_members pm
join profiles p on p.id = pm.user_id
left join predictions pr on pr.user_id = pm.user_id and pr.pool_id = pm.pool_id
left join matches m on m.id = pr.match_id
group by pm.pool_id, pm.user_id, p.display_name, p.username, p.avatar_url;

-- mesma razão da pool_rankings: respeitar a RLS das tabelas-base.
alter view pool_knockout_rankings set (security_invoker = on);
