import { RedisEventBus } from "../events";
import { getContractService } from "../contracts";
import { SettlementService } from "./settlement-service";

declare global {
  var __wishliveSettlementService: SettlementService | undefined;
}

export function getSettlementService() {
  globalThis.__wishliveSettlementService ??= new SettlementService(new RedisEventBus(), getContractService());
  return globalThis.__wishliveSettlementService;
}
