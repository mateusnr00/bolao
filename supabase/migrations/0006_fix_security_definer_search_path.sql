-- 0006 — corrige search_path/RLS das functions de trigger.
-- handle_new_user falhava com "Database error saving new user" porque rodava
-- com search_path sem 'public'. create_default_scoring_rules falharia ao criar
-- pool por causa da RLS em scoring_rules. Ambas agora são security definer com
-- search_path = '' e nomes schema-qualified.

create or replace function handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username',
             'user_' || substring(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.email)
  );
  return new;
end;
$$;

create or replace function create_default_scoring_rules() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.scoring_rules (pool_id) values (new.id);
  insert into public.pool_members (pool_id, user_id) values (new.id, new.owner_id);
  return new;
end;
$$;
