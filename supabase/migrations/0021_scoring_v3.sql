-- 0021 — pontuação v3 (a partir de Holanda × Suécia).
--
-- Regra nova:
--   1) só pontua se acertar o RESULTADO (mandante / visitante / empate); senão 0
--   2) erro ponderado: erro do PERDEDOR pesa o dobro do erro do VENCEDOR
--        erro = |Δvencedor|*1 + |Δperdedor|*2   (empate: |ΔA| + |ΔB|)
--   3) erro 0→30 · 1→22 · 2→18 · 3→15 · 4→12 · >=5→8
--
-- Vale só pra jogos com kickoff >= o de Holanda × Suécia. Jogos anteriores
-- mantêm a regra antiga (v2) — NÃO são recalculados.

create or replace function calculate_prediction_points_v3(
  pred_home int, pred_away int,
  actual_home int, actual_away int
) returns integer as $$
declare
  erro int;
  winner_pred int; winner_act int;
  loser_pred int; loser_act int;
begin
  -- 1) tem que acertar o resultado
  if sign(pred_home - pred_away) <> sign(actual_home - actual_away) then
    return 0;
  end if;

  -- 2) erro
  if actual_home = actual_away then
    erro := abs(pred_home - actual_home) + abs(pred_away - actual_away);
  else
    if actual_home > actual_away then
      winner_pred := pred_home; winner_act := actual_home;
      loser_pred  := pred_away; loser_act  := actual_away;
    else
      winner_pred := pred_away; winner_act := actual_away;
      loser_pred  := pred_home; loser_act  := actual_home;
    end if;
    erro := abs(winner_pred - winner_act) + 2 * abs(loser_pred - loser_act);
  end if;

  -- 3) tabela
  return case
    when erro = 0 then 30
    when erro = 1 then 22
    when erro = 2 then 18
    when erro = 3 then 15
    when erro = 4 then 12
    else 8
  end;
end;
$$ language plpgsql immutable;

-- recalc passa a escolher v3 (corte em diante) ou v2 (antes do corte).
create or replace function recalc_predictions_for_match() returns trigger as $$
declare
  pred   record;
  rules  scoring_rules%rowtype;
  cutoff timestamptz;
  use_new boolean;
begin
  if new.status = 'finished'
     and new.home_score is not null
     and new.away_score is not null
     and (old.status is distinct from new.status
          or old.home_score is distinct from new.home_score
          or old.away_score is distinct from new.away_score) then

    -- corte: kickoff do jogo Holanda × Suécia (inclusive)
    select m.kickoff_at into cutoff
      from matches m
      join teams h on h.id = m.home_team_id
      join teams a on a.id = m.away_team_id
     where (h.code = 'NED' and a.code = 'SWE')
        or (h.code = 'SWE' and a.code = 'NED')
     limit 1;

    use_new := cutoff is not null and new.kickoff_at >= cutoff;

    for pred in select * from predictions where match_id = new.id loop
      select * into rules from scoring_rules where pool_id = pred.pool_id;
      update predictions
         set points = case
               when use_new then calculate_prediction_points_v3(
                      pred.home_score, pred.away_score,
                      new.home_score, new.away_score)
               else calculate_prediction_points(
                      pred.home_score, pred.away_score,
                      new.home_score, new.away_score,
                      new.stage, rules)
             end,
             updated_at = now()
       where id = pred.id;
    end loop;
  end if;
  return new;
end;
$$ language plpgsql;
