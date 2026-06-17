-- 0001 — tipos enumerados
create type match_status as enum ('scheduled', 'live', 'finished', 'postponed', 'cancelled');
create type match_stage  as enum ('group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final');
