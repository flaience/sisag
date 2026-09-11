import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
const db=vi.hoisted(()=>({getDb:vi.fn()}));
vi.mock("@/lib/db",()=>({getDb:db.getDb}));
import { RecoveryRetrievalStableObservabilityService as Service, STABLE_OBSERVATION_LIMIT } from "./RecoveryRetrievalStableObservability.service";
const now=new Date("2026-09-10T00:00:00Z");
const boundary=new Date("2026-08-11T00:00:00Z");
const row=(createdAt=now, stable=true)=>({createdAt,agentExecution:{retrievalShadow:{mode:"ai",durationMs:100,totalTokens:20,release:{id:"p",candidateId:"c",stable}}}});
function setup(rows:ReturnType<typeof row>[]){
 const chain={select:vi.fn(),from:vi.fn(),where:vi.fn(),orderBy:vi.fn(),limit:vi.fn(async(n:number)=>rows.slice(0,n))};
 chain.select.mockReturnValue(chain);chain.from.mockReturnValue(chain);chain.where.mockReturnValue(chain);chain.orderBy.mockReturnValue(chain);
 db.getDb.mockReturnValue(chain);return chain;
}
beforeEach(()=>vi.clearAllMocks());
describe("stable observation query behavior",()=>{
 it("uses authenticated tenant and exact time bounds",async()=>{
  const chain=setup([]);await Service.get({companyId:"tenant-A",now});
  const query=new PgDialect().sqlToQuery(chain.where.mock.calls[0]![0]);
  expect(query.sql).toContain('"company_id" =');
  expect(query.params).toEqual(["tenant-A",new Date("2026-07-12T00:00:00Z").toISOString(),now.toISOString()]);
 });
 it("changes the filter for a second tenant",async()=>{
  const chain=setup([]);await Service.get({companyId:"tenant-B",now});
  expect(new PgDialect().sqlToQuery(chain.where.mock.calls[0]![0]).params[0]).toBe("tenant-B");
 });
 it("assigns the shared boundary to current only",async()=>{
  setup([row(boundary),row(new Date(boundary.getTime()-1))]);
  const data=await Service.get({companyId:"a",now});
  expect(data.current.executions).toBe(1);expect(data.previous.executions).toBe(1);
 });
 it("marks exactly the limit complete",async()=>{
  setup(Array.from({length:STABLE_OBSERVATION_LIMIT},()=>row()));
  expect((await Service.get({companyId:"a",now})).completeness.complete).toBe(true);
 });
 it("detects truncation before excluding non-stable rows and suppresses deltas",async()=>{
  const rows=Array.from({length:STABLE_OBSERVATION_LIMIT+1},(_,i)=>row(i<5000?now:new Date(boundary.getTime()-1),i%2===0));
  const chain=setup(rows);const data=await Service.get({companyId:"a",now});
  expect(chain.limit).toHaveBeenCalledWith(STABLE_OBSERVATION_LIMIT+1);
  expect(data.completeness).toEqual({complete:false,limit:10000,sampledRows:10000});
  expect(data.current.executions).toBe(2500);expect(data.previous.executions).toBe(2500);
  expect(Object.values(data.comparison)).toEqual([null,null,null,null,null]);
  const order=chain.orderBy.mock.calls[0]!.map((x)=>new PgDialect().sqlToQuery(x).sql).join(",");
  expect(order).toContain('"created_at" desc');expect(order).toContain('"id" desc');
 });
 it.each([[NaN,30],[Infinity,30],[-2,1],[200,90]])("bounds days %s",async(raw,days)=>{
  setup([]);expect((await Service.get({companyId:"a",days:raw,now})).period.days).toBe(days);
 });
});
