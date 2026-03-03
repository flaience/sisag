-- Custom SQL migration file, put your code below! --

ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS resource_id uuid;

ALTER TABLE professionals
ADD CONSTRAINT professionals_resource_id_fk
FOREIGN KEY (resource_id) REFERENCES resources(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS professionals_resource_id_idx
ON professionals(resource_id);