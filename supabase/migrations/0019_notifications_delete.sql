-- 0019 — permitir o usuário APAGAR as próprias notificações (limpar/dispensar).
-- Antes só havia select/update; sem delete, "limpar" não funcionaria via RLS.

drop policy if exists "own notifications delete" on notifications;
create policy "own notifications delete" on notifications
  for delete using (user_id = auth.uid());
