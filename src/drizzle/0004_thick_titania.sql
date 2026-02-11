ALTER TABLE "clients" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "phone_e164" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "clients_company_phone_unique" ON "clients" USING btree ("company_id","phone_e164");