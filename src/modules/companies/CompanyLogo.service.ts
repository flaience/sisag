import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { companies } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const COMPANY_BRANDING_BUCKET = "company-branding";
export const MAX_COMPANY_LOGO_BYTES = 2 * 1024 * 1024;
const allowed = ["image/png", "image/jpeg", "image/webp"] as const;
type AllowedMime = (typeof allowed)[number];

export class CompanyLogoError extends Error {
  constructor(public code: "invalid_logo" | "company_not_found" | "storage_error") { super(code); }
}

type LogoInput = { bytes: Uint8Array; contentType: string };
type Dependencies = {
  upload?: (path: string, bytes: Uint8Array, contentType: AllowedMime) => Promise<void>;
  remove?: (path: string) => Promise<void>;
  findPath?: (companyId: string) => Promise<string | null>;
  replacePath?: (companyId: string, path: string | null) => Promise<boolean>;
  sign?: (path: string) => Promise<string>;
  uuid?: () => string;
};

function matches(bytes: Uint8Array, values: number[], offset = 0) {
  return values.every((value, index) => bytes[offset + index] === value);
}

export function validateCompanyLogo(input: LogoInput): { extension: "png" | "jpg" | "webp"; contentType: AllowedMime } {
  if (input.bytes.byteLength === 0 || input.bytes.byteLength > MAX_COMPANY_LOGO_BYTES || !allowed.includes(input.contentType as AllowedMime)) throw new CompanyLogoError("invalid_logo");
  if (input.contentType === "image/png" && matches(input.bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { extension: "png", contentType: "image/png" };
  if (input.contentType === "image/jpeg" && matches(input.bytes, [0xff, 0xd8, 0xff])) return { extension: "jpg", contentType: "image/jpeg" };
  if (input.contentType === "image/webp" && matches(input.bytes, [0x52, 0x49, 0x46, 0x46]) && matches(input.bytes, [0x57, 0x45, 0x42, 0x50], 8)) return { extension: "webp", contentType: "image/webp" };
  throw new CompanyLogoError("invalid_logo");
}

async function uploadToStorage(path: string, bytes: Uint8Array, contentType: AllowedMime) {
  const { error } = await supabaseAdmin().storage.from(COMPANY_BRANDING_BUCKET).upload(path, bytes, { contentType, upsert: false, cacheControl: "3600" });
  if (error) throw new CompanyLogoError("storage_error");
}
async function removeFromStorage(path: string) {
  const { error } = await supabaseAdmin().storage.from(COMPANY_BRANDING_BUCKET).remove([path]);
  if (error) throw new CompanyLogoError("storage_error");
}
async function findPathInDatabase(companyId: string) {
  const rows = await getDb().select({ logoPath: companies.logoPath }).from(companies).where(eq(companies.id, companyId)).limit(1);
  return rows[0]?.logoPath ?? null;
}
async function replacePathInDatabase(companyId: string, logoPath: string | null) {
  const rows = await getDb().update(companies).set({ logoPath, updatedAt: new Date() }).where(eq(companies.id, companyId)).returning({ id: companies.id });
  return rows.length === 1;
}
async function signInStorage(path: string) {
  const { data, error } = await supabaseAdmin().storage.from(COMPANY_BRANDING_BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw new CompanyLogoError("storage_error");
  return data.signedUrl;
}

export async function uploadCompanyLogo(companyId: string, input: LogoInput, dependencies: Dependencies = {}) {
  if (!companyId.trim()) throw new CompanyLogoError("company_not_found");
  const validated = validateCompanyLogo(input);
  const path = `${companyId}/logo-${(dependencies.uuid ?? randomUUID)()}.${validated.extension}`;
  const upload = dependencies.upload ?? uploadToStorage;
  const remove = dependencies.remove ?? removeFromStorage;
  const findPath = dependencies.findPath ?? findPathInDatabase;
  const replacePath = dependencies.replacePath ?? replacePathInDatabase;
  const previousPath = await findPath(companyId);
  await upload(path, input.bytes, validated.contentType);
  try {
    if (!(await replacePath(companyId, path))) throw new CompanyLogoError("company_not_found");
  } catch (error) {
    await remove(path).catch(() => undefined);
    throw error;
  }
  if (previousPath && previousPath !== path) await remove(previousPath).catch(() => undefined);
  return { logoPath: path };
}

export async function getCompanyLogo(companyId: string, dependencies: Dependencies = {}) {
  if (!companyId.trim()) throw new CompanyLogoError("company_not_found");
  const path = await (dependencies.findPath ?? findPathInDatabase)(companyId);
  if (!path) return { logoPath: null, logoUrl: null };
  const logoUrl = await (dependencies.sign ?? signInStorage)(path);
  return { logoPath: path, logoUrl };
}

export async function removeCompanyLogo(companyId: string, dependencies: Dependencies = {}) {
  if (!companyId.trim()) throw new CompanyLogoError("company_not_found");
  const findPath = dependencies.findPath ?? findPathInDatabase;
  const replacePath = dependencies.replacePath ?? replacePathInDatabase;
  const path = await findPath(companyId);
  if (!path) return { removed: false };
  if (!(await replacePath(companyId, null))) throw new CompanyLogoError("company_not_found");
  await (dependencies.remove ?? removeFromStorage)(path).catch(() => undefined);
  return { removed: true };
}
