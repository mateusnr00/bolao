-- 0009 — bucket público de avatares (upload de foto de perfil)
--
-- Cada usuário guarda a própria foto em avatars/<user_id>/<arquivo>. O bucket
-- é público (a foto aparece pra todo mundo no ranking/palpites), mas só o dono
-- pode enviar/trocar/remover os arquivos da própria pasta.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- leitura pública (bucket público; reforça o select pra listagem)
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

-- dono envia na própria pasta (primeiro segmento do path = user id)
drop policy if exists "avatars owner insert" on storage.objects;
create policy "avatars owner insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update to authenticated using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
