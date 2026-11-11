import type { N8nAgentShadowMirrorInput } from "./N8nAgentShadowMirror.service";

export type N8nAgentChannelSource = "whatsapp_text" | "whatsapp_audio" | "homologation";

export type N8nAgentChannelIngressInput = N8nAgentShadowMirrorInput & {
  source: N8nAgentChannelSource;
};

export type N8nAgentChannelIngressMessage = {
  source: N8nAgentChannelSource;
  mirrorInput: N8nAgentShadowMirrorInput;
};

export function createN8nAgentChannelIngressMessage(input: N8nAgentChannelIngressInput): N8nAgentChannelIngressMessage {
  const { source, ...mirrorInput } = input;
  return { source, mirrorInput };
}
