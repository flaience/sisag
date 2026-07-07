//src/platform/capabilities/registry.ts
import { schedulingCapabilityContract } from "./scheduling";

export const platformCapabilityRegistry = {
  scheduling: schedulingCapabilityContract,
} as const;

export type PlatformCapabilityName = keyof typeof platformCapabilityRegistry;

export function getPlatformCapability(name: PlatformCapabilityName) {
  return platformCapabilityRegistry[name];
}

export function listPlatformCapabilities() {
  return Object.values(platformCapabilityRegistry);
}
