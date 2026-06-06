import { RedisEventBus } from "../events";
import { RegistryService } from "./registry-service";

declare global {
  // Preserve the in-memory registry across Next.js route module reloads in dev.
  var __wishliveRegistryService: RegistryService | undefined;
}

export function getRegistryService() {
  globalThis.__wishliveRegistryService ??= new RegistryService(new RedisEventBus());
  return globalThis.__wishliveRegistryService;
}
