import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { companies } from "@/drizzle/schema";

describe("company brand identity persistence", () => {
  const config = getTableConfig(companies);
  it("keeps brand fields optional during gradual adoption", () => {
    expect(config.columns.find((column) => column.name === "trade_name")?.notNull).toBe(false);
    expect(config.columns.find((column) => column.name === "logo_path")?.notNull).toBe(false);
  });
  it("limits the persisted branding payload", () => {
    expect(config.columns.find((column) => column.name === "trade_name")?.getSQLType()).toBe("varchar(160)");
    expect(config.columns.find((column) => column.name === "logo_path")?.getSQLType()).toBe("varchar(500)");
  });
});
