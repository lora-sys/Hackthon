import { describe, expect, it } from "vitest";
import { MemoryEventBus, RegistryService, createSeedAgentCards } from "../src";

describe("registry service", () => {
  it("seeds 57 online agents and emits lifecycle events", async () => {
    const eventBus = new MemoryEventBus();
    const registry = new RegistryService(eventBus);

    const count = await registry.ensureSeeded();

    expect(createSeedAgentCards()).toHaveLength(57);
    expect(count.count).toBe(57);
    expect(count.byType.audience).toBe(10);
    expect(count.byType.musician).toBe(15);
    expect(count.byType.venue).toBe(10);
    expect(eventBus.byType("agent.registered")).toHaveLength(57);
    expect(eventBus.byType("agent.heartbeat")).toHaveLength(57);
  });

  it("searches by type, genre, city, and capacity", async () => {
    const registry = new RegistryService(new MemoryEventBus());
    await registry.ensureSeeded();

    const musicians = registry.search({
      type: "musician",
      genre: "rock",
      city: "shanghai"
    });
    const venues = registry.search({
      type: "venue",
      city: "shanghai",
      capacity: 200
    });

    expect(musicians.length).toBeGreaterThan(0);
    expect(musicians.every((card) => card.type === "musician")).toBe(true);
    expect(venues.length).toBeGreaterThan(0);
    expect(venues.every((card) => card.type === "venue")).toBe(true);
  });

  it("marks stale agents offline after heartbeat timeout", async () => {
    const registry = new RegistryService(new MemoryEventBus());
    await registry.ensureSeeded();

    const expired = await registry.expireOffline(Date.now() + 61_000);

    expect(expired).toHaveLength(57);
    expect(registry.onlineCount().count).toBe(0);
  });
});
