import { createClient } from "redis";
import type { EventEnvelope } from "@wishlive/shared";
import type { EventBus } from "./types";

type RedisClient = ReturnType<typeof createClient>;

export class RedisEventBus implements EventBus {
  private client: RedisClient | undefined;

  constructor(private readonly url = process.env.REDIS_URL ?? "redis://localhost:6379") {}

  async publish(stream: string, event: EventEnvelope): Promise<void> {
    const client = await this.getClient();
    await client.xAdd(stream, "*", {
      id: event.id,
      type: event.type,
      source: event.source,
      timestamp: String(event.timestamp),
      data: JSON.stringify(event.data),
      metadata: JSON.stringify(event.metadata)
    });
  }

  async close(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
    this.client = undefined;
  }

  private async getClient(): Promise<RedisClient> {
    if (!this.client) {
      this.client = createClient({ url: this.url });
      this.client.on("error", (error) => {
        console.error("Redis event bus error", error);
      });
    }

    if (!this.client.isOpen) {
      await this.client.connect();
    }

    return this.client;
  }
}
