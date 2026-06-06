import { RedisEventBus } from "../events";
import { SettlementService } from "./settlement-service";

declare global {
  var __wishliveSettlementService: SettlementService | undefined;
}

export function getSettlementService() {
  globalThis.__wishliveSettlementService ??= new SettlementService(new RedisEventBus());
  return globalThis.__wishliveSettlementService;
}
