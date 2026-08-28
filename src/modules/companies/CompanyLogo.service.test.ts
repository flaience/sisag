import { describe, expect, it, vi } from "vitest";
import { CompanyLogoError, MAX_COMPANY_LOGO_BYTES, getCompanyLogo, removeCompanyLogo, uploadCompanyLogo, validateCompanyLogo } from "./CompanyLogo.service";
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
describe("company logo service", () => {
  it("validates the actual file signature and limit", () => {
    expect(validateCompanyLogo({ bytes: png, contentType: "image/png" })).toEqual({ extension: "png", contentType: "image/png" });
    expect(() => validateCompanyLogo({ bytes: png, contentType: "image/jpeg" })).toThrow(CompanyLogoError);
    expect(() => validateCompanyLogo({ bytes: new Uint8Array(MAX_COMPANY_LOGO_BYTES + 1), contentType: "image/png" })).toThrow(CompanyLogoError);
  });
  it("generates ownership from authenticated company and replaces the previous logo", async () => {
    const upload = vi.fn().mockResolvedValue(undefined); const remove = vi.fn().mockResolvedValue(undefined); const replacePath = vi.fn().mockResolvedValue(true);
    await expect(uploadCompanyLogo("company-a", { bytes: png, contentType: "image/png" }, { upload, remove, replacePath, findPath: vi.fn().mockResolvedValue("company-a/old.png"), uuid: () => "new" })).resolves.toEqual({ logoPath: "company-a/logo-new.png" });
    expect(upload).toHaveBeenCalledWith("company-a/logo-new.png", png, "image/png");
    expect(remove).toHaveBeenCalledWith("company-a/old.png");
  });
  it("rolls back the uploaded object when database persistence fails", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    await expect(uploadCompanyLogo("company-a", { bytes: png, contentType: "image/png" }, { upload: vi.fn(), remove, replacePath: vi.fn().mockResolvedValue(false), findPath: vi.fn().mockResolvedValue(null), uuid: () => "new" })).rejects.toMatchObject({ code: "company_not_found" });
    expect(remove).toHaveBeenCalledWith("company-a/logo-new.png");
  });
  it("signs reads and clears persisted paths before removing objects", async () => {
    await expect(getCompanyLogo("company-a", { findPath: vi.fn().mockResolvedValue("company-a/logo.png"), sign: vi.fn().mockResolvedValue("signed-url") })).resolves.toEqual({ logoPath: "company-a/logo.png", logoUrl: "signed-url" });
    const replacePath = vi.fn().mockResolvedValue(true); const remove = vi.fn().mockResolvedValue(undefined);
    await expect(removeCompanyLogo("company-a", { findPath: vi.fn().mockResolvedValue("company-a/logo.png"), replacePath, remove })).resolves.toEqual({ removed: true });
    expect(replacePath).toHaveBeenCalledWith("company-a", null); expect(remove).toHaveBeenCalledWith("company-a/logo.png");
  });
});
