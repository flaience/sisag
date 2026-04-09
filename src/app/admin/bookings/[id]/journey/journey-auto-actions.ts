import type { JourneyPriority } from "./types";

export function shouldAutoRunAction(params: {
  priority: JourneyPriority;
  hasNextBestAction: boolean;
  hasRecentMessage: boolean;
}) {
  const { priority, hasNextBestAction, hasRecentMessage } = params;

  if (!hasNextBestAction) return false;

  // só automatiza casos seguros
  if (priority.key === "confirmation" && !hasRecentMessage) {
    return true;
  }

  return false;
}
