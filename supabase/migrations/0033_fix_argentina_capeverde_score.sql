-- 0033 — corrige o placar de Argentina x Cabo Verde para 3 x 2.
--
-- O placar sincronizado ficou 1 x 1, mas a partida terminou 3 x 2 (a Argentina
-- fez 3, o Cabo Verde 2). Gravamos o resultado certo e travamos (score_locked)
-- pra API não sobrescrever de novo.
--
-- Como o trigger enforce_score_lock (0031) preserva o placar de um jogo JÁ
-- travado, destravamos primeiro (passo 1) e só então gravamos + travamos
-- (passo 2). Assim funciona esteja o jogo travado ou não. O update do passo 2
-- dispara trg_recalc_predictions, recalculando os pontos de todos os palpites.
--
-- Orientado pelo PAR de seleções (código FIFA), sem depender de quem está como
-- mandante: a Argentina leva 3, o Cabo Verde leva 2.

-- 1) destrava (caso já estivesse travado num placar errado)
update matches m
   set score_locked = false,
       updated_at   = now()
  from teams th, teams ta
 where m.home_team_id = th.id
   and m.away_team_id = ta.id
   and ((th.code = 'ARG' and ta.code = 'CPV')
     or (th.code = 'CPV' and ta.code = 'ARG'));

-- 2) grava 3 x 2 (Argentina 3, Cabo Verde 2), encerra e trava
update matches m
   set home_score   = case when th.code = 'ARG' then 3 else 2 end,
       away_score   = case when ta.code = 'CPV' then 2 else 3 end,
       status       = 'finished',
       finished_at  = coalesce(m.finished_at, now()),
       score_locked = true,
       updated_at   = now()
  from teams th, teams ta
 where m.home_team_id = th.id
   and m.away_team_id = ta.id
   and ((th.code = 'ARG' and ta.code = 'CPV')
     or (th.code = 'CPV' and ta.code = 'ARG'));
