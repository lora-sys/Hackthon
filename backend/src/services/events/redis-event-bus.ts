import { createClient } from "redis";
import { EventEnvelopeSchema, type EventEnvelope } from "@wishlive/shared";
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

  async readRecent(streams: string[], countPerStream = 20): Promise<Array<{ stream: string; event: EventEnvelope }>> {
    const client = await this.getClient();
    const entries = await Promise.all(
      streams.map(async (stream) => {
        const raw = await client.sendCommand(["XREVRANGE", stream, "+", "-", "COUNT", String(countPerStream)]);
        return parseStreamEntries(stream, raw);
      })
    );

    return entries
      .flat()
      .sort((left, right) => right.event.timestamp - left.event.timestamp);
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

function parseStreamEntries(stream: string, raw: unknown): Array<{ stream: string; event: EventEnvelope }> {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.flatMap((entry) => {
    if (!Array.isArray(entry) || entry.length < 2 || !Array.isArray(entry[1])) {
      return [];
    }

    const fields = toFieldRecord(entry[1]);
    const data = parseJsonRecord(fields.data);
    const metadata = parseJsonRecord(fields.metadata);
    const parsed = EventEnvelopeSchema.safeParse({
      id: fields.id ?? String(entry[0]),
      type: fields.type,
      source: fields.source,
      timestamp: Number(fields.timestamp),
      data,
      metadata
    });

    return parsed.success ? [{ stream, event: parsed.data }] : [];
  });
}

function toFieldRecord(fields: unknown[]) {
  const record: Record<string, string> = {};
  for (let index = 0; index < fields.length; index += 2) {
    const key = fields[index];
    const value = fields[index + 1];
    if (typeof key === "string" && typeof value === "string") {
      record[key] = value;
    }
  }
  return record;
}

function parseJsonRecord(value: string | undefined) {
  if (!value) {
    return {};
  }

  const parsed = JSON.parse(value) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}
