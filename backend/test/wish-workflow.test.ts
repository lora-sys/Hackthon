import { describe, expect, it } from "vitest";
import { MemoryEventBus, RegistryService, WishWorkflowService, scoreCandidate } from "../src";
import type { Demand } from "@wishlive/shared";

describe("wish demand matching workflow", () => {
  it("creates one demand and top 3 matching result after 10 wishes", async () => {
    const eventBus = new MemoryEventBus();
    const registry = new RegistryService(eventBus);
    const service = new WishWorkflowService(registry, eventBus);

    for (let index = 1; index <= 10; index += 1) {
      await service.submitWish({
        userId: `user:${index}`,
        artistName: "Neon Harbor",
        genre: "rock",
        city: "shanghai",
        date: "2026-07-18",
        depositAmount: 20
      });
    }

    const demands = service.listDemands();
    expect(demands).toHaveLength(1);
    expect(demands[0]?.wishCount).toBe(10);
    expect(demands[0]?.status).toBe("MATCHED");
    expect(demands[0]?.matching?.musicians).toHaveLength(3);
    expect(demands[0]?.matching?.venues).toHaveLength(3);
    expect(eventBus.byType("wish.created")).toHaveLength(10);
    expect(eventBus.byType("wish.aggregated")).toHaveLength(10);
    expect(eventBus.byType("demand.threshold_reached")).toHaveLength(1);
    expect(eventBus.byType("demand.created")).toHaveLength(1);
    expect(eventBus.byType("matching.started")).toHaveLength(1);
    expect(eventBus.byType("matching.completed")).toHaveLength(1);
  });

  it("keeps matching formula at zero drift", async () => {
    const registry = new RegistryService(new MemoryEventBus());
    await registry.ensureSeeded();
    const musician = registry.get("agent:musician:001");
    const demand = {
      demandId: "demand:test",
      artistName: "Neon Harbor",
      genre: "rock",
      city: "shanghai",
      preferredDate: "2026-07-17",
      wishCount: 10,
      threshold: 10,
      status: "MATCHING",
      wishIds: [],
      matching: null,
      createdAt: Date.now()
    } satisfies Demand;

    const score = scoreCandidate(musician, demand, "musician");
    expect(score.factors).toEqual({
      genre: 40,
      location: 30,
      availability: 20,
      reputation: 7
    });
    expect(score.score).toBe(97);
  });
});
