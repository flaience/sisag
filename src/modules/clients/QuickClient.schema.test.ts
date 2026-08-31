import { describe, expect, it } from "vitest";
import { QuickClientInputSchema } from "./QuickClient.schema";
describe("quick client input", () => { it("normalizes the minimum safe identity", () => { expect(QuickClientInputSchema.parse({ name: "  Ana Lima  ", whatsapp: "(11) 99999-9999", email: "" })).toEqual({ name: "Ana Lima", whatsapp: "+5511999999999", email: null }); }); it("rejects an unusable contact", () => { expect(QuickClientInputSchema.safeParse({ name: "Ana", whatsapp: "123" }).success).toBe(false); }); });
