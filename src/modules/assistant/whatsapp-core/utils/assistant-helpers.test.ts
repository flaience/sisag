import { describe, it, expect } from "vitest";
import { normalizeYesNo, parseChoiceIndex } from "./assistant-helpers";

describe("assistant-helpers", () => {
  it("normalizeYesNo: sim/nao", () => {
    expect(normalizeYesNo("sim")).toBe("YES");
    expect(normalizeYesNo("S")).toBe("YES");
    expect(normalizeYesNo("não")).toBe("NO");
    expect(normalizeYesNo("nao")).toBe("NO");
    expect(normalizeYesNo("talvez")).toBe("OTHER");
  });

  it("parseChoiceIndex: 1-3", () => {
    expect(parseChoiceIndex("1")).toBe(0);
    expect(parseChoiceIndex("2")).toBe(1);
    expect(parseChoiceIndex("3")).toBe(2);
    expect(parseChoiceIndex("4")).toBeNull();
    expect(parseChoiceIndex("a")).toBeNull();
  });
});
