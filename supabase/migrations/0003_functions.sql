-- 0003 — functions e triggers

-- cálculo de pontos (espelhado em src/lib/scoring.ts)
create or replace function calculate_prediction_points(
  pred_home int, pred_away int,
  actual_home int, actual_away int,
  match_stage_val match_stage,
  rules scoring_rules
) returns integer as $$
declare
  base_points  int := 0;
  multiplier   numeric := 1.0;
  pred_winner  int;
  actual_winner int;
begin
  pred_winner   := sign(pred_home - pred_away);
  actual_winner := sign(actual_home - actual_away);

  if pred_home = actual_home and pred_away = actual_away then
    base_points := rules.exact_score_points;
  elsif pred_winner = actual_winner and pred_winner != 0
        and (pred_home - pred_away) = (actual_home - actual_away) then
    base_points := rules.winner_with_diff_points;
  elsif pred_winner = actual_winner and pred_winner != 0 then
    base_points := rules.winner_only_points;
  elsif pred_winner = 0 and actual_winner = 0 then
    base_points := rules.draw_wrong_score_points;
  else
    base_points := 0;
  end if;

  multiplier := case match_stage_val
    when 'group'         then rules.group_multiplier
    when 'round_of_32'   then rules.knockout_multiplier
    when 'round_of_16'   then rules.knockout_multiplier
    when 'quarter_final' then rules.quarter_multiplier
    when 'semi_final'    then rules.semi_multiplier
    when 'third_place'   then rules.quarter_multiplier
    when 'final'         then rules.final_multiplier
    else 1.0
  end;

  return floor(base_points * multiplier)::int;
end;
$$ language plpgsql immutable;

-- recalcula palpites quando o jogo termina (fonte da verdade dos pontos)
create or replace function recalc_predictions_for_match() returns trigger as $$
declare
  pred  record;
  rules scoring_rules%rowtype;
begin
  if new.status = 'finished'
     and new.home_score is not null
     and new.away_score is not null
     and (old.status is distinct from new.status
          or old.home_score is distinct from new.home_score
          or old.away_score is distinct from new.away_score) then
    for pred in select * from predictions where match_id = new.id loop
      select * into rules from scoring_rules where pool_id = pred.pool_id;
      update predictions
         set points = calculate_prediction_points(
               pred.home_score, pred.away_score,
               new.home_score, new.away_score,
               new.stage, rules),
             updated_at = now()
       where id = pred.id;
    end loop;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_recalc_predictions
after update on matches
for each row execute function recalc_predictions_for_match();

-- cria profile ao cadastrar usuário.
-- search_path = '' (com nomes schema-qualified) é obrigatório: a função roda
-- no contexto do GoTrue, cujo search_path não inclui 'public' — sem isso o
-- insert falha com "relation profiles does not exist" → "Database error saving new user".
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

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- defaults ao criar pool: scoring_rules + adiciona owner como membro.
-- security definer pra contornar a RLS (scoring_rules não tem policy de INSERT;
-- esses defaults são gerenciados pelo sistema, não pelo usuário).
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

create trigger trg_pool_defaults
after insert on pools
for each row execute function create_default_scoring_rules();

-- helper p/ RLS: checa membership SEM acionar a policy de pool_members.
-- Por que: a policy de SELECT de pool_members precisa consultar a própria
-- pool_members, o que causaria "infinite recursion detected in policy".
-- security definer roda como owner e ignora RLS na subconsulta, quebrando o ciclo.
create or replace function public.is_pool_member(p_pool_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.pool_members
    where pool_id = p_pool_id and user_id = auth.uid()
  );
$$;
