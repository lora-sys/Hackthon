import { RedisEventBus } from "../events";
import { getRegistryService } from "../registry";
import { getSettlementService } from "../settlement";
import { NegotiationService } from "./negotiation-service";

declare global {
  var __wishliveNegotiationService: NegotiationService | undefined;
}

export function getNegotiationService() {
  globalThis.__wishliveNegotiationService ??= new NegotiationService(
    getRegistryService(),
    getSettlementService(),
    new RedisEventBus()
  );
  return globalThis.__wishliveNegotiationService;
}
