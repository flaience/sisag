import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { z } from "zod";
import { agentKnowledgeAudit, agentKnowledgeDocuments } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import type { N8nAgentKnowledgeCreateSchema } from "./N8nAgentKnowledgeManagement.schema";
type Create = z.infer<typeof N8nAgentKnowledgeCreateSchema>;
export const agentKnowledgeHash = (content: string) => createHash("sha256").update(content.trim(), "utf8").digest("hex");

export class N8nAgentKnowledgeManagementService {
  static async list(companyId: string) {
    return getDb().select().from(agentKnowledgeDocuments).where(and(eq(agentKnowledgeDocuments.companyId, companyId), eq(agentKnowledgeDocuments.scope, "whatsapp"))).orderBy(desc(agentKnowledgeDocuments.updatedAt)).limit(200);
  }
  static async create(input: { companyId: string; actorId: string; data: Create }) {
    const db = getDb();
    return db.transaction(async (tx) => {
      const previous = await tx.select({ version: agentKnowledgeDocuments.version }).from(agentKnowledgeDocuments).where(and(eq(agentKnowledgeDocuments.companyId, input.companyId), eq(agentKnowledgeDocuments.scope, "whatsapp"), eq(agentKnowledgeDocuments.sourceType, input.data.sourceType), eq(agentKnowledgeDocuments.sourceRef, input.data.sourceRef))).orderBy(desc(agentKnowledgeDocuments.version)).limit(1);
      const content = input.data.content.trim();
      const created = await tx.insert(agentKnowledgeDocuments).values({ companyId: input.companyId, scope: "whatsapp", sourceType: input.data.sourceType, sourceRef: input.data.sourceRef, title: input.data.title.trim(), content, contentHash: agentKnowledgeHash(content), version: (previous[0]?.version ?? 0) + 1, status: "draft", validFrom: input.data.validFrom ?? new Date(), validUntil: input.data.validUntil ?? null, createdBy: input.actorId }).returning();
      const item = created[0]!;
      await tx.insert(agentKnowledgeAudit).values({ companyId: input.companyId, documentId: item.id, action: "created", actorId: input.actorId, payload: { scope: "whatsapp", version: item.version, contentHash: item.contentHash } });
      return item;
    });
  }
  static async transition(input: { companyId: string; documentId: string; actorId: string; action: "approve" | "retire" }) {
    const db = getDb(), now = new Date(), from = input.action === "approve" ? "draft" : "approved", to = input.action === "approve" ? "approved" : "retired";
    return db.transaction(async (tx) => {
      const updated = await tx.update(agentKnowledgeDocuments).set(input.action === "approve" ? { status: to, approvedBy: input.actorId, approvedAt: now, updatedAt: now } : { status: to, retiredBy: input.actorId, retiredAt: now, updatedAt: now }).where(and(eq(agentKnowledgeDocuments.companyId, input.companyId), eq(agentKnowledgeDocuments.scope, "whatsapp"), eq(agentKnowledgeDocuments.id, input.documentId), eq(agentKnowledgeDocuments.status, from))).returning();
      const item = updated[0];
      if (!item) return null;
      await tx.insert(agentKnowledgeAudit).values({ companyId: input.companyId, documentId: input.documentId, action: input.action === "approve" ? "approved" : "retired", actorId: input.actorId, payload: { scope: "whatsapp", version: item.version, contentHash: item.contentHash } });
      return item;
    });
  }
}
