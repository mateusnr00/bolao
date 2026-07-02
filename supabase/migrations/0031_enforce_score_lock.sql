-- 0031 — trava de placar no NÍVEL DO BANCO.
--
-- A coluna score_locked (0030) só é respeitada pelo código do sync. Enquanto o
-- deploy novo não sobe, o cron antigo continua sobrescrevendo o placar. Este
-- trigger garante a trava no próprio Postgres: qualquer UPDATE num jogo travado
-- mantém o placar/status originais, independente de quem tentou mudar (cron,
-- API, código antigo).
--
-- Para corrigir um placar travado depois, destrave primeiro
-- (update matches set score_locked = false where ...), altere e trave de novo.

create or replace function enforce_score_lock() returns trigger as $$
begin
  -- só age quando o jogo JÁ estava travado antes deste update.
  if old.score_locked then
    -- preserva o resultado travado, ignorando o que o sync tentar gravar.
    new.home_score  := old.home_score;
    new.away_score  := old.away_score;
    new.status      := old.status;
    new.finished_at := old.finished_at;
    -- mantém travado a menos que o update esteja explicitamente destravando.
    if new.score_locked is distinct from false then
      new.score_locked := true;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

-- BEFORE UPDATE: roda antes do recalc (que é AFTER), então o recalc só dispara
-- se o placar realmente mudou.
drop trigger if exists trg_enforce_score_lock on matches;
create trigger trg_enforce_score_lock
  before update on matches
  for each row
  execute function enforce_score_lock();
