-- Custom SQL migration file, put your code below! --
-- Normaliza status antigos (se existirem)
update outbox set status = 'sent'   where status in ('processed','done');
update outbox set status = 'failed' where status = 'dead';

-- Drop constraint antiga se existir
alter table outbox
  drop constraint if exists outbox_status_chk;

-- CHECK com o vocabulário atual do seu sistema
alter table outbox
  add constraint outbox_status_chk
  check (status in ('pending','processing','sent','failed'));

-- Índice por expressão para retry eficiente
create index if not exists outbox_next_dispatch_idx
on outbox (status, (coalesce(next_retry_at, created_at)));
