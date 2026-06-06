export * from "./services/events";
export * from "./services/concierge";
export * from "./services/contracts";
export * from "./services/negotiation";
export * from "./services/observability";
export * from "./services/registry";
export * from "./services/runtime";
export * from "./services/settlement";
export * from "./services/wishes";

export const serviceName = "wishlive-backend";

export function createHealthPayload() {
  return {
    service: serviceName,
    status: "ok",
    stack: ["registry", "event", "workflow", "settlement", "concierge"]
  } as const;
}
