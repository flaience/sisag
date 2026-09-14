import React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({access:vi.fn(),session:vi.fn()}));
vi.mock("@/lib/auth/requireAdminAccess",()=>({requireAdminAccess:mocks.access}));
vi.mock("@/lib/supabase-server",()=>({getSupabaseServerClient:async()=>({auth:{getSession:mocks.session}})}));
vi.mock("@/contexts/AuthContext",()=>({AuthProvider:"auth-provider"}));
vi.mock("@/components/admin/AdminShell",()=>({AdminShell:"admin-shell"}));
import AdminLayout from "./layout";
beforeEach(()=>{vi.stubGlobal("React",React);mocks.session.mockResolvedValue({data:{session:{access_token:"local-test-token"}}});mocks.access.mockResolvedValue({userId:"user-a",name:"Test A",role:"owner"});});
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks();});
describe("administrative auth provider wiring",()=>{
 it("wraps shell and page in the provider after server authorization",async()=>{
  const child=<div>People page</div>;
  const tree=await AdminLayout({children:child});
  expect(mocks.access).toHaveBeenCalledWith("local-test-token");
  expect(tree.type).toBe("auth-provider");
  expect(tree.props.children.type).toBe("admin-shell");
  expect(tree.props.children.props.children).toBe(child);
  expect(tree.props.children.props.user).toEqual({id:"user-a",name:"Test A",role:"owner"});
 });
 it("does not render the protected tree when authorization rejects",async()=>{
  mocks.access.mockRejectedValueOnce(new Error("access-denied"));
  await expect(AdminLayout({children:null})).rejects.toThrow("access-denied");
 });
 it("still invokes the guard when there is no session",async()=>{
  mocks.session.mockResolvedValueOnce({data:{session:null}});
  mocks.access.mockRejectedValueOnce(new Error("login-required"));
  await expect(AdminLayout({children:null})).rejects.toThrow("login-required");
  expect(mocks.access).toHaveBeenCalledWith("");
 });
});
