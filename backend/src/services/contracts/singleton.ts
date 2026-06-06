import { RedisEventBus } from "../events";
import { ContractService } from "./contract-service";

declare global {
  var __wishliveContractService: ContractService | undefined;
}

export function getContractService() {
  globalThis.__wishliveContractService ??= new ContractService(new RedisEventBus());
  return globalThis.__wishliveContractService;
}
