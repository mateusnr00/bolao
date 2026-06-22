-- 0022 — notificações: dispensar em vez de apagar (mata o "volta sozinha").
--
-- Bug: ao APAGAR a notificação, o cron re-toca jogos antigos e o gatilho
-- recria (o on-conflict só evita duplicar enquanto a linha existe). Solução:
-- marcar dismissed_at e manter a linha — aí o on-conflict bloqueia a recriação
-- pra sempre, e o sininho esconde as dispensadas.

alter table notifications add column if not exists dismissed_at timestamptz;
