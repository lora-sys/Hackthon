import { RedisEventBus } from "../events";
import { getRegistryService } from "../registry";
import { WishWorkflowService } from "./wish-workflow-service";

declare global {
  var __wishliveWishWorkflowService: WishWorkflowService | undefined;
}

export function getWishWorkflowService() {
  globalThis.__wishliveWishWorkflowService ??= new WishWorkflowService(
    getRegistryService(),
    new RedisEventBus()
  );
  return globalThis.__wishliveWishWorkflowService;
}
