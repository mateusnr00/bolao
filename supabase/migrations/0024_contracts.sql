-- 0024 — contrato do bolão (assinatura virtual).
--
-- Cada participante lê as regras e assina na tela (dedo/mouse/touchpad). A
-- assinatura é guardada como dataURL (base64 png). 1 assinatura por usuário,
-- IMUTÁVEL: sem policy de update/delete pelo cliente — pra "liberar" uma nova
-- assinatura, o admin apaga a linha via service role.

create table contract_signatures (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  pool_id          uuid references pools(id) on delete set null,
  full_name        text not null,
  signature        text not null,              -- dataURL base64 (image/png)
  contract_text    text not null,              -- texto aceito (snapshot)
  contract_version text not null default 'v1',
  signed_at        timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (user_id)                             -- 1 contrato por pessoa
);
create index idx_contract_signatures_pool on contract_signatures(pool_id);

alter table contract_signatures enable row level security;

-- leitura: a própria assinatura, ou qualquer assinatura do bolão de que
-- participo (pra galera ver quem já assinou).
create policy "contract read own or pool"
  on contract_signatures for select
  using (
    user_id = auth.uid()
    or (pool_id is not null and is_pool_member(pool_id))
  );

-- inserir: só a própria, e o unique(user_id) garante uma só vez.
create policy "contract insert own"
  on contract_signatures for insert
  with check (user_id = auth.uid());

-- sem update/delete pelo cliente: contrato é imutável (admin libera via
-- service role apagando a linha).
