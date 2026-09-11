import { describe, expect, it } from "vitest";
import { summarizeRecoveryRetrievalStable as summarize } from "./RecoveryRetrievalStableMetrics";
const release = {id:"p",candidateId:"c",stable:true};
describe("stable evidence aggregation", () => {
  it.each([undefined, null, NaN, Infinity, -1, "42"])("preserves missing or invalid telemetry %s", value => {
    expect(summarize([{mode:"ai",durationMs:value,totalTokens:value,release}])).toMatchObject({
      executions:1,averageTokens:null,p95DurationMs:null,averageDurationMs:null,totalTokens:null,
      coverage:{modes:1,durations:0,tokens:0},
    });
  });
  it("preserves measured zero", () => expect(summarize([{mode:"ai",durationMs:0,totalTokens:0,release}])).toMatchObject({
    averageTokens:0,p95DurationMs:0,totalTokens:0,coverage:{durations:1,tokens:1},
  }));
  it("uses only valid measurements in averages", () => expect(summarize([
    {mode:"ai",durationMs:100,totalTokens:20,release},{mode:"fallback",durationMs:300,release},
  ])).toMatchObject({executions:2,successRate:50,fallbackRate:50,averageTokens:20,averageDurationMs:200,p95DurationMs:300,coverage:{tokens:1}}));
  it("isolates candidates on the same plan", () => {
    const result=summarize([{mode:"ai",release},{mode:"fallback",release:{...release,candidateId:"other"}}]);
    expect(result.plans.map(p=>[p.planId,p.candidateId,p.executions,p.successRate])).toEqual([["p","c",1,100],["p","other",1,0]]);
  });
  it("excludes canaries and missing identities", () => expect(summarize([{release:{...release,stable:false}},{release:{id:"p",stable:true}}]).executions).toBe(0));
  it("groups errors and counts unknown modes as missing coverage", () => expect(summarize([{mode:"invalid",errorCode:"timeout",release}])).toMatchObject({coverage:{modes:0},errors:[{errorCode:"timeout",count:1}]}));
});
