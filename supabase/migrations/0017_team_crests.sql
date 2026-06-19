-- 0017 — emblema oficial da federação (brasão), no lugar da bandeira redonda.
--
-- crest_url tem prioridade sobre flag_url na exibição (ver queries/matches.ts).
-- Onde ainda não houver crest, o app cai pra bandeira (flag_url) — nada quebra.
-- Vá preenchendo os emblemas por seleção com UPDATEs como os de baixo.

alter table teams add column if not exists crest_url text;

update teams set crest_url =
  'https://upload.wikimedia.org/wikipedia/commons/9/99/Brazilian_Football_Confederation_logo.svg'
  where code = 'BRA';

update teams set crest_url =
  'https://upload.wikimedia.org/wikipedia/commons/e/e7/Federation_Haitienne_de_Football.png'
  where code = 'HAI';
