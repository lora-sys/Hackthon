import { AgentCardSchema } from "@wishlive/shared";

export const serviceName = "wishlive-backend";

export function createHealthPayload() {
  return {
    service: serviceName,
    status: "ok",
    stack: ["registry", "event", "workflow", "settlement", "concierge"]
  } as const;
}

export function validateAgentCard(input: unknown) {
  return AgentCardSchema.parse(input);
}
