import type { EventEnvelope } from "@wishlive/shared";
import type { EventBus } from "./types";

export class MemoryEventBus implements EventBus {
  readonly events: Array<{ stream: string; event: EventEnvelope }> = [];

  async publish(stream: string, event: EventEnvelope): Promise<void> {
    this.events.push({ stream, event });
  }

  byType(type: string) {
    return this.events.filter((entry) => entry.event.type === type);
  }
}
