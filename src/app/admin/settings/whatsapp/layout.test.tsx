import fs from "node:fs";
import { describe,expect,it } from "vitest";
const source=fs.readFileSync("src/app/admin/settings/whatsapp/layout.tsx","utf8");
describe("WhatsApp settings session authentication",()=>{
 it("uses the current Supabase server session",()=>{expect(source).toContain("getSupabaseServerClient");expect(source).toContain("supabase.auth.getSession()");expect(source).toContain("session?.access_token")});
 it("does not depend on the obsolete standalone access-token cookie",()=>{expect(source).not.toContain('cookies } from "next/headers"');expect(source).not.toContain('cookieStore.get("sb-access-token")')});
 it("allows the same administrative roles as the management API",()=>expect(source).toContain('allowedRoles: ["owner", "admin"]'));
});
