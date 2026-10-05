begin;

create table if not exists public.agent_knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  scope varchar(32) not null default 'whatsapp',
  source_type varchar(40) not null, source_ref varchar(160) not null,
  title varchar(200) not null, content text not null check (char_length(content) between 1 and 8000),
  content_hash varchar(64) not null check (char_length(content_hash) = 64), version integer not null default 1 check (version > 0),
  status varchar(16) not null default 'draft' check (status in ('draft','approved','retired')),
  valid_from timestamptz not null default now(), valid_until timestamptz,
  created_by uuid, approved_by uuid, approved_at timestamptz, retired_by uuid, retired_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(company_id, scope, source_type, source_ref, version)
);
create index if not exists agent_knowledge_company_scope_status_idx on public.agent_knowledge_documents(company_id, scope, status, valid_from);
alter table public.agent_knowledge_documents enable row level security;

create table if not exists public.agent_knowledge_audit (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  document_id uuid not null references public.agent_knowledge_documents(id) on delete cascade,
  action varchar(16) not null check (action in ('created','approved','retired')), actor_id uuid not null,
  payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists agent_knowledge_audit_company_document_idx on public.agent_knowledge_audit(company_id, document_id, created_at);
alter table public.agent_knowledge_audit enable row level security;

commit;
