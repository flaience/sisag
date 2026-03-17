ALTER TABLE appointments
ADD COLUMN duration_minutes integer NOT NULL DEFAULT 30,
ADD COLUMN service_name_snapshot text;