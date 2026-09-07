import { and, desc, eq } from "drizzle-orm";
import { recoveryAgentRetrievalChangeProposals, recoveryAgentRetrievalExperimentEvaluations, recoveryAgentRetrievalReleaseCandidates } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import type { RecoveryRetrievalReleaseCandidateInput } from "./RecoveryRetrievalReleaseCandidate.schema";

export class RecoveryRetrievalReleaseCandidateService {
  static async list(input:{companyId:string}){return{items:await getDb().select().from(recoveryAgentRetrievalReleaseCandidates).where(eq(recoveryAgentRetrievalReleaseCandidates.companyId,input.companyId)).orderBy(desc(recoveryAgentRetrievalReleaseCandidates.createdAt)).limit(100)}}
  static async create(input:{companyId:string;actorId:string;release:RecoveryRetrievalReleaseCandidateInput}){
    const db=getDb();
    const evaluations=await db.select({id:recoveryAgentRetrievalExperimentEvaluations.id,experimentId:recoveryAgentRetrievalExperimentEvaluations.experimentId,proposalId:recoveryAgentRetrievalExperimentEvaluations.proposalId,evidence:recoveryAgentRetrievalExperimentEvaluations.evidence}).from(recoveryAgentRetrievalExperimentEvaluations).where(and(eq(recoveryAgentRetrievalExperimentEvaluations.companyId,input.companyId),eq(recoveryAgentRetrievalExperimentEvaluations.id,input.release.evaluationId),eq(recoveryAgentRetrievalExperimentEvaluations.decision,"adopt"))).limit(1),evaluation=evaluations[0];
    if(!evaluation)return{ok:false as const,error:"adopted_evaluation_not_found"as const};
    const proposals=await db.select({id:recoveryAgentRetrievalChangeProposals.id,scope:recoveryAgentRetrievalChangeProposals.scope,candidateVersion:recoveryAgentRetrievalChangeProposals.candidateVersion,candidate:recoveryAgentRetrievalChangeProposals.candidate}).from(recoveryAgentRetrievalChangeProposals).where(and(eq(recoveryAgentRetrievalChangeProposals.companyId,input.companyId),eq(recoveryAgentRetrievalChangeProposals.id,evaluation.proposalId),eq(recoveryAgentRetrievalChangeProposals.status,"approved"))).limit(1),proposal=proposals[0];
    if(!proposal)return{ok:false as const,error:"approved_proposal_not_found"as const};
    try{const saved=await db.insert(recoveryAgentRetrievalReleaseCandidates).values({companyId:input.companyId,evaluationId:evaluation.id,experimentId:evaluation.experimentId,proposalId:proposal.id,scope:proposal.scope,status:"draft",candidateVersion:proposal.candidateVersion,candidate:proposal.candidate,evidence:evaluation.evidence,reason:input.release.reason,createdBy:input.actorId}).returning({id:recoveryAgentRetrievalReleaseCandidates.id});return{ok:true as const,id:saved[0]!.id}}
    catch(error){if((error as{code?:string}).code==="23505")return{ok:false as const,error:"release_candidate_exists"as const};throw error}
  }
}
