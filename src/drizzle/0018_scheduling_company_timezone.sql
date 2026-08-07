ALTER TABLE "scheduling_config" ADD COLUMN "timezone" varchar(64) DEFAULT 'America/Sao_Paulo' NOT NULL;--> statement-breakpoint
WITH "ranked_scheduling_config" AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "company_id"
      ORDER BY
        "updated_at" DESC NULLS LAST,
        "created_at" DESC NULLS LAST,
        "id" DESC
    ) AS "position"
  FROM "scheduling_config"
)
DELETE FROM "scheduling_config"
USING "ranked_scheduling_config"
WHERE "scheduling_config"."id" = "ranked_scheduling_config"."id"
  AND "ranked_scheduling_config"."position" > 1;--> statement-breakpoint
CREATE UNIQUE INDEX "scheduling_config_company_unique" ON "scheduling_config" USING btree ("company_id");
