import { describe, expect, it } from "vitest";
import { evaluateRecoveryRetrievalStableHealth as evaluate } from "./RecoveryRetrievalStableHealthGate";
import { summarizeRecoveryRetrievalStable as summarize } from "./RecoveryRetrievalStableMetrics";
const metric=(overrides={})=>({planId:"p",candidateId:"c",executions:100,successRate:97,fallbackRate:3,p95DurationMs:800,averageTokens:900,coverage:{modes:100,durations:100,tokens:100},...overrides});
const run=(current=[metric()],previous=[metric()],complete=true)=>evaluate({current,previous,complete});
describe("stable health v2 evidence",()=>{
 it("returns healthy at policy thresholds",()=>expect(run()).toMatchObject({policyVersion:"recovery_retrieval_stable_health_v2",automaticAction:false,requiresHumanReview:true,plans:[{status:"healthy"}]}));
 it("does not conclude healthy without telemetry (A1)",()=>{
  const plans=summarize(Array.from({length:50},()=>({mode:"ai",release:{id:"p",candidateId:"c",stable:true}}))).plans;
  const plan=run(plans,[]).plans[0]!;
  expect(plan.status).toBe("insufficient_data");
  expect(plan.checks.find(c=>c.code==="p95_duration_ms")).toMatchObject({actual:null,passed:null,evaluated:false});
 });
 it("blocks a truncated window (A2)",()=>expect(run([metric()],[metric()],false)).toMatchObject({complete:false,plans:[{status:"insufficient_data",reasons:["incomplete_window"]}]}));
 it.each([1,49])("does not classify regression using %s baseline rows (A3)",n=>{
  const previous=metric({executions:n,successRate:100,fallbackRate:0,coverage:{modes:n,durations:n,tokens:n}});
  const result=run([metric()],[previous]).plans[0]!;
  expect(result.status).toBe("healthy");
  expect(result.baseline).toMatchObject({available:false,reason:"insufficient_sample",minimumExecutions:50});
  expect(result.checks.find(c=>c.code==="success_rate_drop")?.evaluated).toBe(false);
 });
 it("evaluates a baseline of 50 and reports regression",()=>{
  const previous=metric({executions:50,successRate:100,fallbackRate:0,coverage:{modes:50,durations:50,tokens:50}});
  expect(run([metric()],[previous]).plans[0]?.status).toBe("critical");
 });
 it("still flags absolute failures without a usable baseline",()=>expect(run([metric({successRate:90,fallbackRate:10})],[]).plans[0]?.status).toBe("critical"));
 it("keeps candidates isolated (A4)",()=>expect(run([metric()],[metric({candidateId:"other",successRate:100,fallbackRate:0})]).plans[0]).toMatchObject({status:"healthy",baseline:{available:false,reason:"missing"}}));
 it("rejects unknown mode coverage",()=>expect(run([metric({coverage:{modes:99,durations:100,tokens:100}})],[]).plans[0]?.status).toBe("insufficient_data"));
 it("keeps the minimum current sample",()=>expect(run([metric({executions:49})],[]).plans[0]?.status).toBe("insufficient_data"));
 it("marks measured over-budget latency degraded",()=>expect(run([metric({p95DurationMs:2500})],[]).plans[0]?.status).toBe("degraded"));
});
