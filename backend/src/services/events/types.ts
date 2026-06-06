import type { EventEnvelope } from "@wishlive/shared";

export interface EventBus {
  publish(stream: string, event: EventEnvelope): Promise<void>;
}

export function createEventEnvelope(input: {
  type: string;
  source: string;
  data: Record<string, unknown>;
  traceId?: string;
  spanId?: string;
  now?: number;
}): EventEnvelope {
  return {
    id: crypto.randomUUID(),
    type: input.type,
    source: input.source,
    timestamp: input.now ?? Date.now(),
    data: input.data,
    metadata: {
      traceId: input.traceId ?? crypto.randomUUID(),
      spanId: input.spanId ?? crypto.randomUUID()
    }
  };
}
