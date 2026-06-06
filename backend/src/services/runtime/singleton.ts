import { RedisEventBus } from "../events";
import { getRegistryService } from "../registry";
import { AgentRuntimeService } from "./agent-runtime-service";

declare global {
  var __wishliveAgentRuntimeService: AgentRuntimeService | undefined;
}

export function getAgentRuntimeService() {
  globalThis.__wishliveAgentRuntimeService ??= new AgentRuntimeService(
    getRegistryService(),
    new RedisEventBus()
  );
  return globalThis.__wishliveAgentRuntimeService;
}
