//src/modules/assistant/whatsapp-core/sessions/ConversationSession.service.ts
import { ConversationSessionRepository } from "./ConversationSession.repository";
import type { ConversationContext } from "./types";

export class ConversationSessionService {
  async getOpen(companyId: string, clientId: string) {
    return ConversationSessionRepository.findOpen(companyId, clientId);
  }

  async openOrUpdate(
    companyId: string,
    clientId: string,
    context: ConversationContext,
  ) {
    return ConversationSessionRepository.openOrUpdate(
      companyId,
      clientId,
      context,
    );
  }

  async close(sessionId: string) {
    return ConversationSessionRepository.close(sessionId);
  }
}
