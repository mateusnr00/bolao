-- 0026 — time placeholder "A definir" (TBD) pro mata-mata.
--
-- Permite montar os jogos de mata-mata já com o lado conhecido (ex.: Brasil x
-- A definir) antes do adversário sair. O seeder do openfootball preenche o
-- lado real e usa este placeholder no outro; quando o adversário é definido,
-- o upsert (por external_id) troca o TBD pelo time real automaticamente.

insert into teams (name, code, group_name, flag_url)
select 'A definir', 'TBD', null, null
where not exists (select 1 from teams where code = 'TBD');
