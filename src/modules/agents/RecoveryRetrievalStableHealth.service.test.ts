import { describe, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({get:vi.fn()}));
vi.mock("./RecoveryRetrievalStableObservability.service",()=>({RecoveryRetrievalStableObservabilityService:mock}));
import { RecoveryRetrievalStableHealthService as Service } from "./RecoveryRetrievalStableHealth.service";
describe("health composition",()=>{
 it("propagates tenant, period and truncation into gate",async()=>{
  const period={days:30,from:"2026-08-11",to:"2026-09-10"};
  mock.get.mockResolvedValue({period,previousPeriod:period,completeness:{complete:false},current:{plans:[{planId:"p",candidateId:"c",executions:100,successRate:100,fallbackRate:0,p95DurationMs:100,averageTokens:20,coverage:{modes:100,durations:100,tokens:100}}]},previous:{plans:[]}});
  const input={companyId:"tenant-A",days:30};
  expect(await Service.get(input)).toMatchObject({period,health:{complete:false,plans:[{status:"insufficient_data"}]},readOnly:true,automaticAction:false});
  expect(mock.get).toHaveBeenCalledWith(input);
 });
});
