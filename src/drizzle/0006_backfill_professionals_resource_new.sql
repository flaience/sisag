-- Custom SQL migration file, put your code below! ---- garante pgcrypto para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- garante resource_type 'professional' por company
INSERT INTO resource_types (id, company_id, name, created_at)
SELECT gen_random_uuid(), p.company_id, 'professional', now()
FROM professionals p
WHERE p.company_id IS NOT NULL
GROUP BY p.company_id
ON CONFLICT (company_id, name) DO NOTHING;

-- cria resources para professionals ainda sem resource_id
WITH prof AS (
  SELECT p.id AS professional_id, p.company_id, p.name
  FROM professionals p
  WHERE p.company_id IS NOT NULL
    AND p.resource_id IS NULL
),
ptype AS (
  SELECT rt.id AS type_id, rt.company_id
  FROM resource_types rt
  WHERE rt.name = 'professional'
),
ins AS (
  INSERT INTO resources (id, company_id, type_id, name, status, metadata, created_at, updated_at)
  SELECT
    gen_random_uuid(),
    prof.company_id,
    ptype.type_id,
    prof.name,
    'active',
    jsonb_build_object('legacyProfessionalId', prof.professional_id),
    now(),
    now()
  FROM prof
  JOIN ptype ON ptype.company_id = prof.company_id
  RETURNING id, company_id, metadata
)
UPDATE professionals p
SET resource_id = r.id
FROM resources r
WHERE p.resource_id IS NULL
  AND p.company_id = r.company_id
  AND (r.metadata->>'legacyProfessionalId')::uuid = p.id;