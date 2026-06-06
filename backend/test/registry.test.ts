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
    expect(createSeedAgentCards().every((card) => card.supported_interfaces.length > 0)).toBe(true);
    expect(createSeedAgentCards().every((card) => card.capabilities?.a2a_discovery)).toBe(true);
    expect(createSeedAgentCards().every((card) => card.skill_details.length > 0)).toBe(true);
    expect(createSeedAgentCards().every((card) => card.listenStreams.length > 0)).toBe(true);
    expect(createSeedAgentCards().every((card) => card.emitEvents.length > 0)).toBe(true);
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

  it("discovers musician and venue agents through manager-backed A2A discovery", async () => {
    const eventBus = new MemoryEventBus();
    const registry = new RegistryService(eventBus);
    await registry.ensureSeeded();

    const musicianDiscovery = await registry.discover({
      requesterAgentId: "agent:business:005",
      type: "musician",
      skill: "check_availability",
      genre: "rock",
      city: "shanghai",
      date: "2026-07-17",
      limit: 15
    });
    const venueDiscovery = await registry.discover({
      requesterAgentId: "agent:business:005",
      type: "venue",
      skill: "check_capacity",
      city: "shanghai",
      capacity: 200,
      date: "2026-07-17",
      limit: 10
    });

    expect(registry.search({ type: "musician", managerAgentId: "agent:manager:001" })).toHaveLength(15);
    expect(registry.search({ type: "venue", managerAgentId: "agent:manager:002" })).toHaveLength(10);
    expect(registry.search({ type: "musician" })).toHaveLength(15);
    expect(registry.search({ type: "venue" })).toHaveLength(10);
    expect(musicianDiscovery.managerAgentId).toBe("agent:manager:001");
    expect(venueDiscovery.managerAgentId).toBe("agent:manager:002");
    expect(musicianDiscovery.agents).toHaveLength(3);
    expect(venueDiscovery.agents.length).toBeGreaterThanOrEqual(3);
    expect(eventBus.byType("a2a.discovery.started").length).toBeGreaterThanOrEqual(2);
    expect(eventBus.byType("manager.search.performed").length).toBeGreaterThanOrEqual(2);
    expect(eventBus.byType("a2a.discovery.result").length).toBeGreaterThanOrEqual(2);
  });

  it("marks stale agents offline after heartbeat timeout", async () => {
    const registry = new RegistryService(new MemoryEventBus());
    await registry.ensureSeeded();

    const expired = await registry.expireOffline(Date.now() + 61_000);

    expect(expired).toHaveLength(57);
    expect(registry.onlineCount().count).toBe(0);
  });
});
