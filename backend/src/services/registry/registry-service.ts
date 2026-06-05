import {
  AgentCardSchema,
  type AgentCard,
  type AgentRecord,
  type AgentType,
  RegistryListRequestSchema,
  RegistrySearchRequestSchema,
  type RegistryListRequest,
  type RegistrySearchRequest
} from "@wishlive/shared";
import type { EventBus } from "../events";
import { createEventEnvelope, MemoryEventBus } from "../events";
import { createSeedAgentCards } from "./seeds";

const LIFECYCLE_STREAM = "agent.lifecycle";
const HEARTBEAT_TIMEOUT_MS = 60_000;

export class RegistryService {
  private readonly records = new Map<string, AgentRecord>();
  private seeded = false;

  constructor(private readonly eventBus: EventBus = new MemoryEventBus()) {}

  async register(input: unknown) {
    const card = AgentCardSchema.parse(input);
    const now = Date.now();
    const existing = this.records.get(card.agent_id);
    const record: AgentRecord = {
      card,
      status: "REGISTERED",
      registeredAt: existing?.registeredAt ?? now,
      lastHeartbeatAt: existing?.lastHeartbeatAt ?? null
    };

    this.records.set(card.agent_id, record);
    await this.publishLifecycle("agent.registered", card.agent_id, {
      agentId: card.agent_id,
      type: card.type
    });

    return { agentId: card.agent_id, status: record.status };
  }

  async heartbeat(agentId: string) {
    const record = this.getRecord(agentId);
    const now = Date.now();
    record.status = "ONLINE";
    record.lastHeartbeatAt = now;

    await this.publishLifecycle("agent.heartbeat", agentId, {
      agentId,
      status: record.status
    });

    return { status: record.status, timestamp: now };
  }

  get(agentId: string): AgentCard {
    return this.getRecord(agentId).card;
  }

  list(input: RegistryListRequest = {}): AgentCard[] {
    const query = RegistryListRequestSchema.parse(input);
    return [...this.records.values()]
      .filter((record) => !query.status || record.status === query.status)
      .filter((record) => !query.type || record.card.type === query.type)
      .map((record) => record.card);
  }

  search(input: RegistrySearchRequest = {}): AgentCard[] {
    const query = RegistrySearchRequestSchema.parse(input);
    return this.list({ type: query.type })
      .filter((card) => matchesTagOrMetadata(card, "genre", query.genre))
      .filter((card) => matchesTagOrMetadata(card, "city", query.city))
      .filter((card) => matchesCapacity(card, query.capacity));
  }

  onlineCount() {
    const byType = {
      audience: 0,
      musician: 0,
      venue: 0,
      manager: 0,
      business: 0,
      infrastructure: 0
    } satisfies Record<AgentType, number>;

    for (const record of this.records.values()) {
      if (record.status === "ONLINE" || record.status === "BUSY") {
        byType[record.card.type] += 1;
      }
    }

    return {
      count: Object.values(byType).reduce((sum, count) => sum + count, 0),
      byType
    };
  }

  async expireOffline(now = Date.now()) {
    const expired: string[] = [];

    for (const record of this.records.values()) {
      if (
        record.lastHeartbeatAt &&
        now - record.lastHeartbeatAt > HEARTBEAT_TIMEOUT_MS &&
        record.status !== "OFFLINE"
      ) {
        record.status = "OFFLINE";
        expired.push(record.card.agent_id);
        await this.publishLifecycle("agent.offline", record.card.agent_id, {
          agentId: record.card.agent_id,
          lastHeartbeatAt: record.lastHeartbeatAt
        });
      }
    }

    return expired;
  }

  async ensureSeeded() {
    if (this.seeded) {
      return this.onlineCount();
    }

    for (const card of createSeedAgentCards()) {
      await this.register(card);
      await this.heartbeat(card.agent_id);
    }

    this.seeded = true;
    return this.onlineCount();
  }

  get statusSnapshot() {
    return [...this.records.values()].map((record) => ({
      agentId: record.card.agent_id,
      type: record.card.type,
      status: record.status,
      lastHeartbeatAt: record.lastHeartbeatAt
    }));
  }

  private getRecord(agentId: string) {
    const record = this.records.get(agentId);
    if (!record) {
      throw new RegistryError(404, `Agent not found: ${agentId}`);
    }
    return record;
  }

  private async publishLifecycle(type: string, source: string, data: Record<string, unknown>) {
    await this.eventBus.publish(
      LIFECYCLE_STREAM,
      createEventEnvelope({
        type,
        source,
        data
      })
    );
  }
}

export class RegistryError extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "RegistryError";
  }
}

function matchesTagOrMetadata(card: AgentCard, key: "genre" | "city", value?: string) {
  if (!value) {
    return true;
  }

  return card.tags.includes(`${key}:${value}`) || card.metadata[key] === value;
}

function matchesCapacity(card: AgentCard, capacity?: number) {
  if (!capacity) {
    return true;
  }

  const metadataCapacity = card.metadata.capacity;
  if (typeof metadataCapacity === "number") {
    return metadataCapacity >= capacity;
  }

  return card.tags.some((tag) => {
    if (!tag.startsWith("capacity:")) {
      return false;
    }
    return Number(tag.replace("capacity:", "")) >= capacity;
  });
}
