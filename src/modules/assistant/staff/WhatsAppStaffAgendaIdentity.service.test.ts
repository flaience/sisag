import { describe,expect,it,vi } from "vitest";
import { resolveWhatsAppStaffAgendaIdentity } from "./WhatsAppStaffAgendaIdentity.service";
const companyId="9af03377-1d22-40be-9460-dbe07b2709d5",phoneE164="+5511999999999",professionalId="6c87792c-8dd2-446f-9731-e2d30306266d";
const deps=(persisted:any)=>({loadPersistedAccess:vi.fn().mockResolvedValue(persisted)});
describe("WhatsApp staff agenda identity",()=>{
 it("authorizes a persisted active manager",async()=>{const dependencies=deps({found:true,ok:true,identity:{role:"manager",companyId,phoneE164}});await expect(resolveWhatsAppStaffAgendaIdentity({companyId,phone:phoneE164},dependencies)).resolves.toEqual({ok:true,identity:{role:"manager",companyId,phoneE164}});expect(dependencies.loadPersistedAccess).toHaveBeenCalledExactlyOnceWith({companyId,phone:phoneE164})});
 it("authorizes a persisted active professional",async()=>{await expect(resolveWhatsAppStaffAgendaIdentity({companyId,phone:phoneE164},deps({found:true,ok:true,identity:{role:"professional",companyId,phoneE164,professionalId}}))).resolves.toEqual({ok:true,identity:{role:"professional",companyId,phoneE164,professionalId}})});
 it("fails closed when no persisted mapping exists",async()=>{await expect(resolveWhatsAppStaffAgendaIdentity({companyId,phone:phoneE164},deps({found:false}))).resolves.toEqual({ok:false,reason:"unauthorized"})});
 it("fails closed for an inactive or invalid persisted mapping",async()=>{await expect(resolveWhatsAppStaffAgendaIdentity({companyId,phone:phoneE164},deps({found:true,ok:false,reason:"invalid"}))).resolves.toEqual({ok:false,reason:"unauthorized"})});
 it("preserves the ambiguous result without guessing",async()=>{await expect(resolveWhatsAppStaffAgendaIdentity({companyId,phone:phoneE164},deps({found:true,ok:false,reason:"ambiguous"}))).resolves.toEqual({ok:false,reason:"ambiguous"})});
});
