-- 0030 — trava de placar manual (score_locked).
--
-- Placares são sincronizados automaticamente da API ao vivo. Quando o
-- resultado da API está errado (ex.: não contou a prorrogação), a correção
-- manual era sobrescrita pelo próximo sync. Esta coluna marca o placar como
-- "travado": o sync (applyLiveUpdates) passa a ignorar jogos com score_locked.

alter table matches
  add column if not exists score_locked boolean not null default false;

-- Bélgica x Senegal terminou 3 x 2 contando a prorrogação. Gravamos o placar
-- final e travamos pra API não sobrescrever de novo. O update dispara
-- trg_recalc_predictions, recalculando os pontos dos palpites com o placar
-- correto. Orientado pelo PAR de seleções (a Bélgica leva 3, o Senegal 2),
-- independente de quem está como mandante no nosso registro.
update matches m
   set home_score   = case when th.code = 'BEL' then 3 else 2 end,
       away_score   = case when ta.code = 'SEN' then 2 else 3 end,
       status       = 'finished',
       finished_at  = coalesce(m.finished_at, now()),
       score_locked = true,
       updated_at   = now()
  from teams th, teams ta
 where m.home_team_id = th.id
   and m.away_team_id = ta.id
   and ((th.code = 'BEL' and ta.code = 'SEN')
     or (th.code = 'SEN' and ta.code = 'BEL'));
