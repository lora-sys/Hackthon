export * from "./services/events";
export * from "./services/registry";

export const serviceName = "wishlive-backend";

export function createHealthPayload() {
  return {
    service: serviceName,
    status: "ok",
    stack: ["registry", "event", "workflow", "settlement", "concierge"]
  } as const;
}
