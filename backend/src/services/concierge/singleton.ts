import { RedisEventBus } from "../events";
import { getNegotiationService } from "../negotiation";
import { getRegistryService } from "../registry";
import { ConciergeService } from "./concierge-service";

declare global {
  var __wishliveConciergeService: ConciergeService | undefined;
}

export function getConciergeService() {
  globalThis.__wishliveConciergeService ??= new ConciergeService(
    getRegistryService(),
    getNegotiationService(),
    new RedisEventBus()
  );
  return globalThis.__wishliveConciergeService;
}
