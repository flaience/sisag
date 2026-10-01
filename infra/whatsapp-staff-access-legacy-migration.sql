begin;

with legacy_raw as (
  select
    wa.company_id,
    wa.id as whatsapp_account_id,
    sender.value as sender,
    trim(sender.value->>'phoneE164') as phone_e164,
    trim(sender.value->>'role') as role,
    nullif(trim(sender.value->>'professionalId'), '') as professional_id_text
  from public.whatsapp_accounts wa
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(wa.provider_config->'staffAgenda'->'authorizedSenders') = 'array'
        then wa.provider_config->'staffAgenda'->'authorizedSenders'
      else '[]'::jsonb
    end
  ) sender(value)
  where wa.status = 'active'
    and wa.provider_config->'staffAgenda'->>'enabled' = 'true'
),
classified as (
  select
    l.*,
    case
      when l.phone_e164 is null or l.phone_e164 !~ '^\+[1-9][0-9]{7,14}$' then 'invalid_phone'
      when l.role not in ('manager','professional') then 'invalid_role'
      when l.role = 'manager' and l.professional_id_text is not null then 'manager_has_professional'
      when l.role = 'professional' and (l.professional_id_text is null or l.professional_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') then 'invalid_professional_id'
      when l.role = 'professional' and not exists (
        select 1 from public.professionals p
        where p.id = l.professional_id_text::uuid
          and p.company_id = l.company_id
          and lower(coalesce(p.status,'')) = 'active'
      ) then 'professional_not_active'
      when exists (
        select 1 from public.whatsapp_staff_accesses a
        where a.whatsapp_account_id = l.whatsapp_account_id
          and a.phone_e164 = l.phone_e164
          and a.active = true
      ) then 'already_persisted_active'
      when exists (
        select 1 from public.whatsapp_staff_accesses a
        where a.whatsapp_account_id = l.whatsapp_account_id
          and a.phone_e164 = l.phone_e164
          and a.active = false
      ) then 'already_persisted_inactive'
      when count(*) over (partition by l.whatsapp_account_id,l.phone_e164) > 1 then 'duplicate_legacy'
      else 'ready_to_migrate'
    end as migration_status
  from legacy_raw l
),
ready as (
  select distinct on (whatsapp_account_id,phone_e164)
    company_id,
    whatsapp_account_id,
    phone_e164,
    role,
    case when role = 'professional' then professional_id_text::uuid else null end as professional_id
  from classified
  where migration_status = 'ready_to_migrate'
  order by whatsapp_account_id,phone_e164
),
inserted as (
  insert into public.whatsapp_staff_accesses (
    company_id, whatsapp_account_id, phone_e164, role, professional_id, active, created_by, updated_by
  )
  select company_id, whatsapp_account_id, phone_e164, role, professional_id, true, null, null
  from ready
  on conflict (whatsapp_account_id, phone_e164) do nothing
  returning *
),
audited as (
  insert into public.whatsapp_staff_access_audit (company_id, access_id, action, actor_id, snapshot)
  select company_id, id, 'created', null, to_jsonb(inserted)
  from inserted
  returning id
)
select
  (select count(*)::integer from classified where migration_status = 'ready_to_migrate') as eligible_before_conflict_check,
  (select count(*)::integer from inserted) as inserted_accesses,
  (select count(*)::integer from audited) as inserted_audits,
  (select count(*)::integer from classified where migration_status <> 'ready_to_migrate') as skipped_records;

commit;
