import { validateSchedulingCapability } from "./scheduling";

export type PlatformCapabilityValidationResult = {
  capability: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type PlatformCapabilityRegistryValidationResult = {
  valid: boolean;
  capabilities: PlatformCapabilityValidationResult[];
};

export function validatePlatformCapabilityRegistry(): PlatformCapabilityRegistryValidationResult {
  const capabilities: PlatformCapabilityValidationResult[] = [
    {
      capability: "scheduling",
      ...validateSchedulingCapability(),
    },
  ];

  return {
    valid: capabilities.every((capability) => capability.valid),
    capabilities,
  };
}
