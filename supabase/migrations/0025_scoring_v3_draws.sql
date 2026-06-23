-- 0025 — ajuste do empate na pontuação v3.
--
-- Antes, empate usava erro dobrado (|ΔA|+|ΔB|) na mesma tabela do erro:
--   1×1 p/ 0×0 caía em erro 2 → 18, 2×2 → erro 4 → 12, etc.
-- Agora o EMPATE certo escala pela DISTÂNCIA do placar (d = |palpite − real|):
--   0 → 30 | 1 (1×1 p/ 0×0) → 20 | 2 (2×2) → 15 | 3 (3×3) → 10 | >=4 → 8
--
-- Jogos COM vencedor seguem iguais (erro ponderado: perdedor pesa mais).
-- Forward-only: vale pros jogos que finalizarem a partir daqui (o trigger usa
-- esta função). Não recalcula jogos já encerrados.

create or replace function calculate_prediction_points_v3(
  pred_home int, pred_away int,
  actual_home int, actual_away int
) returns integer as $$
declare
  erro int;
  dist int;
  winner_pred int; winner_act int;
  loser_pred int; loser_act int;
begin
  -- 1) tem que acertar o resultado
  if sign(pred_home - pred_away) <> sign(actual_home - actual_away) then
    return 0;
  end if;

  -- 2) EMPATE: escala pela distância do placar (palpite de empate é N×N)
  if actual_home = actual_away then
    dist := abs(pred_home - actual_home);
    return case
      when dist = 0 then 30
      when dist = 1 then 20
      when dist = 2 then 15
      when dist = 3 then 10
      else 8
    end;
  end if;

  -- 3) COM VENCEDOR: vencedor peso 1; perdedor peso 2 (a menos) ou 3 (inventou)
  if actual_home > actual_away then
    winner_pred := pred_home; winner_act := actual_home;
    loser_pred  := pred_away; loser_act  := actual_away;
  else
    winner_pred := pred_away; winner_act := actual_away;
    loser_pred  := pred_home; loser_act  := actual_home;
  end if;
  erro := abs(winner_pred - winner_act)
        + case when loser_pred > loser_act
               then (loser_pred - loser_act) * 3   -- inventou gol pro perdedor
               else (loser_act - loser_pred) * 2   -- chutou gols a menos
          end;

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
