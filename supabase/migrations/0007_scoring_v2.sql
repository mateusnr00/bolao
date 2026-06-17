-- 0007 — pontuação v2 (6 níveis, só o maior vale por jogo)
--
-- níveis (pontos fixos, sem multiplicador de fase):
--   placar exato ......................... 25
--   vencedor + placar do vencedor ........ 18  (novo)
--   vencedor + diferença de gols ......... 15
--   empate (placar errado) ............... 15
--   vencedor + placar do perdedor ........ 12  (novo)
--   só o vencedor ........................ 10

-- 1) novas colunas
alter table scoring_rules
  add column if not exists winner_with_winner_goals_points integer not null default 18,
  add column if not exists winner_with_loser_goals_points  integer not null default 12;

-- 2) novos defaults dos níveis existentes
alter table scoring_rules alter column exact_score_points      set default 25;
alter table scoring_rules alter column winner_with_diff_points set default 15;
alter table scoring_rules alter column winner_only_points      set default 10;
alter table scoring_rules alter column draw_wrong_score_points set default 15;

-- 3) sem bônus de fase: multiplicadores = 1.0
alter table scoring_rules alter column group_multiplier    set default 1.0;
alter table scoring_rules alter column knockout_multiplier set default 1.0;
alter table scoring_rules alter column quarter_multiplier  set default 1.0;
alter table scoring_rules alter column semi_multiplier     set default 1.0;
alter table scoring_rules alter column final_multiplier    set default 1.0;

-- 4) aplica os novos valores aos bolões já existentes
update scoring_rules set
  exact_score_points              = 25,
  winner_with_winner_goals_points = 18,
  winner_with_diff_points         = 15,
  draw_wrong_score_points         = 15,
  winner_with_loser_goals_points  = 12,
  winner_only_points              = 10,
  group_multiplier    = 1.0,
  knockout_multiplier = 1.0,
  quarter_multiplier  = 1.0,
  semi_multiplier     = 1.0,
  final_multiplier    = 1.0;

-- 5) nova função de cálculo (só um tipo de acerto vale por jogo)
create or replace function calculate_prediction_points(
  pred_home int, pred_away int,
  actual_home int, actual_away int,
  match_stage_val match_stage,
  rules scoring_rules
) returns integer as $$
declare
  base_points   int := 0;
  multiplier    numeric := 1.0;
  pred_winner   int;
  actual_winner int;
begin
  pred_winner   := sign(pred_home - pred_away);
  actual_winner := sign(actual_home - actual_away);

  if pred_home = actual_home and pred_away = actual_away then
    -- placar exato
    base_points := rules.exact_score_points;
  elsif pred_winner = 0 and actual_winner = 0 then
    -- empate, placar errado
    base_points := rules.draw_wrong_score_points;
  elsif pred_winner = actual_winner and pred_winner <> 0 then
    -- acertou o vencedor: refina do mais específico ao mais genérico
    if greatest(pred_home, pred_away) = greatest(actual_home, actual_away) then
      base_points := rules.winner_with_winner_goals_points;   -- placar do vencedor
    elsif (pred_home - pred_away) = (actual_home - actual_away) then
      base_points := rules.winner_with_diff_points;           -- diferença de gols
    elsif least(pred_home, pred_away) = least(actual_home, actual_away) then
      base_points := rules.winner_with_loser_goals_points;    -- placar do perdedor
    else
      base_points := rules.winner_only_points;                -- só o vencedor
    end if;
  else
    base_points := 0;
  end if;

  multiplier := case match_stage_val
    when 'group'         then rules.group_multiplier
    when 'round_of_32'   then rules.knockout_multiplier
    when 'round_of_16'   then rules.knockout_multiplier
    when 'quarter_final' then rules.quarter_multiplier
    when 'semi_final'    then rules.semi_multiplier
    when 'third_place'   then rules.quarter_multiplier
    when 'final'         then rules.final_multiplier
    else 1.0
  end;

  return floor(base_points * multiplier)::int;
end;
$$ language plpgsql immutable;

-- 6) recalcula os palpites de jogos já encerrados com a nova regra
update predictions p
   set points = calculate_prediction_points(
         p.home_score, p.away_score,
         m.home_score, m.away_score,
         m.stage, r),
       updated_at = now()
  from matches m, scoring_rules r
 where p.match_id = m.id
   and r.pool_id  = p.pool_id
   and m.status   = 'finished'
   and m.home_score is not null
   and m.away_score is not null;
