import { describe, expect, it } from "vitest";
import { ServiceCatalogSchema } from "./ServiceCatalog.schema";

describe("service catalog schema", () => {
  it("keeps existing services scheduled by exact time", () => {
    expect(ServiceCatalogSchema.parse({ name: "Consulta", durationMinutes: 30, pricingMode: "free" }).attendanceMode).toBe("scheduled_time");
  });

  it("accepts arrival-order services without changing pricing", () => {
    const service = ServiceCatalogSchema.parse({ name: "Exame ocupacional", durationMinutes: 30, attendanceMode: "arrival_order", pricingMode: "on_request" });
    expect(service.attendanceMode).toBe("arrival_order");
    expect(service.price).toBeNull();
  });

  it("normalizes pricing modes", () => {
    expect(ServiceCatalogSchema.parse({ name: "Consulta", durationMinutes: 30, pricingMode: "free" }).price).toBe("0.00");
    expect(ServiceCatalogSchema.parse({ name: "Avaliação", durationMinutes: 40, pricingMode: "on_request" }).price).toBeNull();
    expect(ServiceCatalogSchema.parse({ name: "Consulta", durationMinutes: 30, pricingMode: "fixed", price: 120 }).price).toBe("120.00");
  });

  it("requires a fixed price", () => {
    expect(ServiceCatalogSchema.safeParse({ name: "Consulta", durationMinutes: 30, pricingMode: "fixed", price: 0 }).success).toBe(false);
  });
});
