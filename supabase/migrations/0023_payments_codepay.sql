-- 0023 — pagamentos via CodePay (PIX cash-in).
--
-- App monolítico: credenciais nas env vars (não no banco). Aqui só guardamos
-- os registros de pagamento + o log de webhooks (auditoria/idempotência).

create table payments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  pool_id     uuid references pools(id) on delete set null,
  amount      numeric(12,2) not null,
  status      text not null default 'PENDING',   -- PENDING | APPROVED | REJECTED
  external_id text unique,                        -- paymentId da CodePay
  mov_id      text,
  pix_code    text,                               -- copia e cola
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_payments_user on payments(user_id, created_at desc);

alter table payments enable row level security;
-- cada um vê/cria/atualiza só os próprios pagamentos
create policy "own payments read"   on payments for select using (user_id = auth.uid());
create policy "own payments insert" on payments for insert with check (user_id = auth.uid());
create policy "own payments update" on payments for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- (o webhook usa service role e ignora a RLS pra confirmar o pagamento)

-- log de todos os webhooks recebidos (auditoria + debug)
create table payment_webhook_events (
  id               uuid primary key default gen_random_uuid(),
  provider         text not null default 'CODEPAY',
  external_id      text not null,
  payload          jsonb not null,
  processed_at     timestamptz,
  processing_error text,
  created_at       timestamptz not null default now()
);
create index idx_payment_webhook_events on payment_webhook_events(provider, external_id);

alter table payment_webhook_events enable row level security;
-- ninguém via cliente; só service role (sem policy = sem acesso anon/authenticated)
