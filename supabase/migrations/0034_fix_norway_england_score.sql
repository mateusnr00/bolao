-- 0034 — corrige o placar de Noruega x Inglaterra para 1 x 2.
--
-- A partida terminou 2 x 1 para a Inglaterra (a Inglaterra fez 2, a Noruega
-- fez 1). Gravamos o resultado certo e travamos (score_locked) pra API não
-- sobrescrever de novo.
--
-- Como o trigger enforce_score_lock (0031) preserva o placar de um jogo JÁ
-- travado, destravamos primeiro (passo 1) e só então gravamos + travamos
-- (passo 2). Assim funciona esteja o jogo travado ou não. O update do passo 2
-- dispara trg_recalc_predictions, recalculando os pontos de todos os palpites.
--
-- Orientado pelo PAR de seleções (código FIFA), sem depender de quem está como
-- mandante: a Inglaterra leva 2, a Noruega leva 1.

-- 1) destrava (caso já estivesse travado num placar errado)
update matches m
   set score_locked = false,
       updated_at   = now()
  from teams th, teams ta
 where m.home_team_id = th.id
   and m.away_team_id = ta.id
   and ((th.code = 'NOR' and ta.code = 'ENG')
     or (th.code = 'ENG' and ta.code = 'NOR'));

-- 2) grava 1 x 2 (Noruega 1, Inglaterra 2), encerra e trava
update matches m
   set home_score   = case when th.code = 'NOR' then 1 else 2 end,
       away_score   = case when ta.code = 'ENG' then 2 else 1 end,
       status       = 'finished',
       finished_at  = coalesce(m.finished_at, now()),
       score_locked = true,
       updated_at   = now()
  from teams th, teams ta
 where m.home_team_id = th.id
   and m.away_team_id = ta.id
   and ((th.code = 'NOR' and ta.code = 'ENG')
     or (th.code = 'ENG' and ta.code = 'NOR'));
