-- 0029 — corrige o placar de Bélgica x Senegal para 3 x 2.
--
-- O jogo terminou 3 x 2 contando a prorrogação, mas o placar sincronizado
-- ficou registrado como 2 x 2 (fim do tempo normal). Aqui gravamos o
-- resultado final incluindo a prorrogação e marcamos como encerrado.
--
-- O update dispara trg_recalc_predictions, que recalcula os pontos de todos
-- os palpites desse jogo com o placar corrigido.
--
-- Identificamos o jogo pelo PAR de seleções (código FIFA), sem depender da
-- ordem casa/fora: o placar é orientado conforme o registro (a Bélgica leva
-- 3 e o Senegal leva 2, esteja quem estiver como mandante).

update matches m
   set home_score  = case when th.code = 'BEL' then 3 else 2 end,
       away_score  = case when ta.code = 'SEN' then 2 else 3 end,
       status      = 'finished',
       finished_at = coalesce(m.finished_at, now()),
       updated_at  = now()
  from teams th, teams ta
 where m.home_team_id = th.id
   and m.away_team_id = ta.id
   and ((th.code = 'BEL' and ta.code = 'SEN')
     or (th.code = 'SEN' and ta.code = 'BEL'));
