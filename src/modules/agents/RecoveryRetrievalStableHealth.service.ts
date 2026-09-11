import { RecoveryRetrievalStableObservabilityService } from "./RecoveryRetrievalStableObservability.service";
import { evaluateRecoveryRetrievalStableHealth } from "./RecoveryRetrievalStableHealthGate";
export class RecoveryRetrievalStableHealthService {
  static async get(input: { companyId: string; days?: number; now?: Date }) {
    const observation = await RecoveryRetrievalStableObservabilityService.get(input);
    const health = evaluateRecoveryRetrievalStableHealth({
      current: observation.current.plans, previous: observation.previous.plans,
      complete: observation.completeness.complete,
    });
    return { period: observation.period, previousPeriod: observation.previousPeriod, health, readOnly: true as const, automaticAction: false as const };
  }
}
